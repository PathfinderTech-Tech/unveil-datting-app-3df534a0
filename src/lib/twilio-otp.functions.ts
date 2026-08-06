import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
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

/** Rate limits (application-level; Twilio still has its own caps). */
const LIMITS = {
  sendPhoneCooldown: { max: 1, windowSec: 45 },
  sendPhoneWindow: { max: 5, windowSec: 15 * 60 },
  sendIpWindow: { max: 10, windowSec: 15 * 60 },
  verifyPhoneWindow: { max: 8, windowSec: 15 * 60 },
  verifyIpWindow: { max: 30, windowSec: 15 * 60 },
} as const;

function syntheticEmailFor(phone: string) {
  // Stable, deterministic, never sent to. Domain is non-routable.
  return `phone_${phone.replace(/\+/g, "")}@phone.unveil.local`;
}

function maskPhone(phone: string) {
  if (phone.length < 6) return "***";
  return `${phone.slice(0, 3)}***${phone.slice(-2)}`;
}

/** Strip E.164 / long digit runs from Twilio (or other) error strings before logging. */
function redactPhoneInText(text: string | undefined | null): string | undefined {
  if (!text) return undefined;
  return text
    .replace(/\+\d{6,15}/g, "[phone]")
    .replace(/\b\d{10,15}\b/g, "[phone]");
}

function safeLogErrorMessage(message: unknown): string | undefined {
  if (typeof message !== "string" || !message) return undefined;
  return redactPhoneInText(message);
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

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clientIpFromRequest(): string {
  try {
    const request = getRequest();
    const headers = request?.headers;
    if (!headers) return "unknown";
    const forwarded = headers.get("cf-connecting-ip")
      || headers.get("x-real-ip")
      || headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    return forwarded && forwarded.length > 0 ? forwarded : "unknown";
  } catch {
    return "unknown";
  }
}

type RateLimitResult =
  | { ok: true }
  | { ok: false; error: string; retryAfterSeconds: number };

async function enforceOtpRateLimit(
  bucket: string,
  rawKey: string,
  max: number,
  windowSec: number,
): Promise<RateLimitResult> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const keyHash = await sha256Hex(`${bucket}:${rawKey}`);
    const { data, error } = await (supabaseAdmin as any).rpc("consume_otp_rate_limit", {
      _bucket: bucket,
      _key_hash: keyHash,
      _max_count: max,
      _window_seconds: windowSec,
    });

    if (error) {
      // Migration not applied yet — fail open so login isn't hard-broken,
      // but log loudly so ops apply the migration.
      console.warn("[twilio-otp] rate-limit RPC unavailable", {
        bucket,
        message: error.message,
        code: error.code,
      });
      return { ok: true };
    }

    const row = (typeof data === "object" && data !== null ? data : {}) as {
      allowed?: boolean;
      retry_after_seconds?: number;
      used?: number;
    };

    if (row.allowed === false) {
      const retry = Math.max(1, Number(row.retry_after_seconds) || windowSec);
      return {
        ok: false,
        retryAfterSeconds: retry,
        error: `Too many attempts. Please wait ${retry} second${retry === 1 ? "" : "s"} and try again.`,
      };
    }
    return { ok: true };
  } catch (e) {
    console.warn("[twilio-otp] rate-limit check failed open", e);
    return { ok: true };
  }
}

async function gateSendOtp(phone: string, ip: string): Promise<RateLimitResult> {
  // Sequential so a rejection does not burn other buckets.
  for (const check of [
    () => enforceOtpRateLimit("otp_send_phone_cd", phone, LIMITS.sendPhoneCooldown.max, LIMITS.sendPhoneCooldown.windowSec),
    () => enforceOtpRateLimit("otp_send_phone", phone, LIMITS.sendPhoneWindow.max, LIMITS.sendPhoneWindow.windowSec),
    () => enforceOtpRateLimit("otp_send_ip", ip, LIMITS.sendIpWindow.max, LIMITS.sendIpWindow.windowSec),
  ]) {
    const result = await check();
    if (!result.ok) return result;
  }
  return { ok: true };
}

async function gateVerifyOtp(phone: string, ip: string): Promise<RateLimitResult> {
  for (const check of [
    () => enforceOtpRateLimit("otp_verify_phone", phone, LIMITS.verifyPhoneWindow.max, LIMITS.verifyPhoneWindow.windowSec),
    () => enforceOtpRateLimit("otp_verify_ip", ip, LIMITS.verifyIpWindow.max, LIMITS.verifyIpWindow.windowSec),
  ]) {
    const result = await check();
    if (!result.ok) return result;
  }
  return { ok: true };
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
    const ip = clientIpFromRequest();
    const gate = await gateSendOtp(data.phone, ip);
    if (!gate.ok) {
      console.warn("[twilio-otp] send rate-limited", {
        phone: maskPhone(data.phone),
        retryAfterSeconds: gate.retryAfterSeconds,
      });
      return {
        ok: false as const,
        error: gate.error,
        code: "rate_limited",
        status: 429,
        retryAfterSeconds: gate.retryAfterSeconds,
      };
    }

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
      phone: maskPhone(data.phone),
      channel: data.channel,
      httpStatus: res.status,
      verifyStatus: json?.status,
      errorCode: res.ok ? undefined : json?.code,
      errorMessage: res.ok ? undefined : safeLogErrorMessage(json?.message),
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
    const ip = clientIpFromRequest();
    const gate = await gateVerifyOtp(data.phone, ip);
    if (!gate.ok) {
      console.warn("[twilio-otp] verify rate-limited", {
        phone: maskPhone(data.phone),
        retryAfterSeconds: gate.retryAfterSeconds,
      });
      return {
        ok: false as const,
        error: gate.error,
        retryAfterSeconds: gate.retryAfterSeconds,
      };
    }

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
    console.log("[twilio-otp] verifyPhoneOtp", {
      phone: maskPhone(data.phone),
      channel: checkJson?.channel,
      httpStatus: checkRes.status,
      verifyStatus: checkJson?.status,
      errorCode: checkRes.ok ? undefined : checkJson?.code,
      errorMessage: checkRes.ok ? undefined : safeLogErrorMessage(checkJson?.message),
    });
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
