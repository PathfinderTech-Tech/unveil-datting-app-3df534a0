/**
 * APNs push test — admin-only.
 *
 * Sends a "UNVEIL test" notification to every iOS device token registered
 * for the calling admin user. Uses APNs HTTP/2 with an ES256 JWT signed
 * via WebCrypto so it runs inside the Cloudflare Worker SSR runtime
 * without any Node-only crypto libs.
 *
 * Required Lovable Cloud secrets (set before calling):
 *   APNS_KEY_P8        – contents of the .p8 private key file
 *   APNS_KEY_ID        – 10-char Key ID from Apple Developer
 *   APNS_TEAM_ID       – 10-char Team ID
 *   APNS_BUNDLE_ID     – e.g. best.unveil.app
 *   APNS_ENV           – "production" or "sandbox" (defaults to production)
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function b64url(input: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof input === "string") bytes = new TextEncoder().encode(input);
  else if (input instanceof Uint8Array) bytes = input;
  else bytes = new Uint8Array(input);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const raw = atob(body);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

async function signAppleJwt(p8: string, keyId: string, teamId: string): Promise<string> {
  const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) }),
  );
  const signingInput = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(p8),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${b64url(sig)}`;
}

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Admin gate
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const p8 = process.env.APNS_KEY_P8;
    const keyId = process.env.APNS_KEY_ID;
    const teamId = process.env.APNS_TEAM_ID;
    const bundleId = process.env.APNS_BUNDLE_ID;
    const env = (process.env.APNS_ENV ?? "production").toLowerCase();

    if (!p8 || !keyId || !teamId || !bundleId) {
      return {
        ok: false,
        configured: false,
        sent: 0,
        failed: 0,
        message:
          "APNs not configured. Set APNS_KEY_P8, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID in Lovable Cloud secrets.",
        results: [] as Array<{ token: string; status: number; body: string }>,
      };
    }

    const { data: tokens, error: tokErr } = await context.supabase
      .from("device_tokens")
      .select("token, platform")
      .eq("user_id", context.userId)
      .eq("platform", "ios");
    if (tokErr) throw new Error(tokErr.message);
    if (!tokens || tokens.length === 0) {
      return {
        ok: false,
        configured: true,
        sent: 0,
        failed: 0,
        message: "No iOS device tokens registered for your account. Open the iOS app, sign in, and grant push permission first.",
        results: [],
      };
    }

    const jwt = await signAppleJwt(p8, keyId, teamId);
    const host =
      env === "sandbox" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
    const payload = JSON.stringify({
      aps: {
        alert: { title: "UNVEIL", body: "Push test from Admin — APNs is live ✨" },
        sound: "default",
        badge: 1,
      },
      kind: "admin_test",
    });

    const results: Array<{ token: string; status: number; body: string }> = [];
    let sent = 0;
    let failed = 0;
    for (const row of tokens) {
      const tok = row.token as string;
      const res = await fetch(`${host}/3/device/${tok}`, {
        method: "POST",
        headers: {
          authorization: `bearer ${jwt}`,
          "apns-topic": bundleId,
          "apns-push-type": "alert",
          "apns-priority": "10",
          "content-type": "application/json",
        },
        body: payload,
      });
      const body = res.status === 200 ? "" : await res.text();
      results.push({ token: tok.slice(0, 8) + "…", status: res.status, body });
      if (res.status === 200) sent++;
      else failed++;
    }

    return {
      ok: failed === 0,
      configured: true,
      sent,
      failed,
      env,
      message:
        failed === 0
          ? `Sent ${sent} push notification(s) to your device(s).`
          : `${sent} delivered, ${failed} failed. Check results below.`,
      results,
    };
  });
