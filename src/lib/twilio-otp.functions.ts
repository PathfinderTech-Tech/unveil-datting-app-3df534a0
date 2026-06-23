import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Twilio Verify-backed phone OTP fallback.
 *
 * Lovable Cloud doesn't expose Supabase Auth's Twilio SMS provider config, so
 * we drive the OTP flow ourselves through Twilio Verify and then mint a real
 * Supabase session via the admin API + magiclink token_hash exchange.
 *
 * Flow:
 *  1) sendPhoneOtp({ phone, channel }) → Twilio Verify creates a verification
 *     and delivers a code via SMS or WhatsApp.
 *  2) verifyPhoneOtp({ phone, code }) → Twilio Verify checks the code; on
 *     "approved" we ensure a Supabase user exists for this phone (synthetic
 *     email derived from the E.164 number), generate a magiclink token_hash,
 *     and return it to the client. The client calls
 *     supabase.auth.verifyOtp({ token_hash, type: "magiclink" }) to obtain a
 *     persisted session — same shape Apple/Google sessions land in.
 */

const e164Re = /^\+\d{6,15}$/;

function syntheticEmailFor(phone: string) {
  // Stable, deterministic, never sent to. Domain is non-routable.
  return `phone_${phone.replace(/\+/g, "")}@phone.unveil.local`;
}

function twilioBasicAuth() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid || !token || !verifySid) {
    throw new Error("Twilio credentials are not configured");
  }
  return {
    sid,
    token,
    verifySid,
    auth: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
  };
}

export const sendPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        phone: z.string().regex(e164Re, "Phone must be E.164"),
        channel: z.enum(["sms", "whatsapp"]).default("sms"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { auth, verifySid } = twilioBasicAuth();
    const url = `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`;
    const body = new URLSearchParams({ To: data.phone, Channel: data.channel });
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const json: any = await res.json().catch(() => ({}));
    console.log("[twilio-otp] sendPhoneOtp", {
      phone: data.phone,
      channel: data.channel,
      httpStatus: res.status,
      verificationSid: json?.sid,
      verifyServiceSid: verifySid,
      verifyStatus: json?.status,
      errorCode: res.ok ? undefined : json?.code,
      errorMessage: res.ok ? undefined : json?.message,
      payload: json,
    });
    if (!res.ok) {
      const msg = json?.message || `Twilio Verify error (${res.status})`;
      const code = json?.code;
      // Surface a structured error so the client can auto-fallback WhatsApp→SMS.
      return { ok: false as const, error: msg, code, status: res.status };
    }
    return {
      ok: true as const,
      channel: data.channel,
      status: json?.status as string | undefined,
    };
  });

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        phone: z.string().regex(e164Re),
        code: z.string().regex(/^\d{4,8}$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { auth, verifySid } = twilioBasicAuth();

    // 1) Check the OTP with Twilio Verify.
    const checkUrl = `https://verify.twilio.com/v2/Services/${verifySid}/VerificationCheck`;
    const checkRes = await fetch(checkUrl, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: data.phone, Code: data.code }),
    });
    const checkJson: any = await checkRes.json().catch(() => ({}));
    if (!checkRes.ok) {
      return {
        ok: false as const,
        error: checkJson?.message || "Could not verify code",
      };
    }
    if (checkJson?.status !== "approved") {
      return { ok: false as const, error: "Invalid or expired code" };
    }

    // 2) Ensure a Supabase auth user exists for this phone.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = syntheticEmailFor(data.phone);

    // Try to find an existing user. Supabase JS admin doesn't expose a direct
    // getByEmail, so use the REST endpoint that supports a filter.
    const SUPABASE_URL = process.env.SUPABASE_URL!;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    let userId: string | undefined;

    const findRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
      },
    );
    if (findRes.ok) {
      const j: any = await findRes.json().catch(() => ({}));
      const users = Array.isArray(j?.users) ? j.users : [];
      userId = users.find((u: any) => u.email === email)?.id;
    }

    if (!userId) {
      const { data: created, error: createErr } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          phone: data.phone,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: {
            phone_login: true,
            phone_number: data.phone,
          },
        });
      if (createErr || !created?.user) {
        // If the user race-condition created in between, retry the lookup.
        const retry = await fetch(
          `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
          {
            headers: {
              apikey: SERVICE_KEY,
              Authorization: `Bearer ${SERVICE_KEY}`,
            },
          },
        );
        const rj: any = await retry.json().catch(() => ({}));
        userId = (Array.isArray(rj?.users) ? rj.users : []).find(
          (u: any) => u.email === email,
        )?.id;
        if (!userId) {
          return {
            ok: false as const,
            error: createErr?.message || "Could not create account",
          };
        }
      } else {
        userId = created.user.id;
      }
    }

    // 3) Mint a magiclink token_hash the client can exchange for a session.
    const { data: linkData, error: linkErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
    if (linkErr || !linkData?.properties?.hashed_token) {
      return {
        ok: false as const,
        error: linkErr?.message || "Could not create session token",
      };
    }

    return {
      ok: true as const,
      email,
      tokenHash: linkData.properties.hashed_token,
      userId,
    };
  });
