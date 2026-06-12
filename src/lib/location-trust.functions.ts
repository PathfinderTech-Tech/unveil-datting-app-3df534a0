import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LocationTrustResult = {
  result: "match" | "partial" | "mismatch";
  risk: "low" | "medium" | "high";
  message: string;
  requiresAction: boolean;
  trustLevel: "unverified" | "verified" | "trusted" | "identity_verified";
};

/**
 * Records a location-trust signal alongside selfie verification.
 * Compares profile/current country against device, IP (Cloudflare CF-IPCountry),
 * and optional GPS-derived country. Never bans — only flags & writes history.
 */
export const recordLocationVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    selfiePath?: string | null;
    deviceCountry?: string | null;
    deviceTimezone?: string | null;
    gpsCountry?: string | null;
  }) => input)
  .handler(async ({ data, context }): Promise<LocationTrustResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;

    // Profile snapshot
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("home_country_code, current_country_code, location_mismatch_count, trust_level, verified")
      .eq("id", uid)
      .maybeSingle();

    const profileCountry = (prof?.home_country_code ?? null) as string | null;
    const currentCountry = (prof?.current_country_code ?? profileCountry) as string | null;

    // IP country from Cloudflare
    const ipCountry = (getRequestHeader("cf-ipcountry") ?? getRequestHeader("CF-IPCountry") ?? null)?.toUpperCase() || null;
    const deviceCountry = (data.deviceCountry ?? null)?.toUpperCase() || null;
    const gpsCountry = (data.gpsCountry ?? null)?.toUpperCase() || null;

    // Compare each signal against currentCountry
    const ref = currentCountry?.toUpperCase() ?? null;
    const signals = [deviceCountry, ipCountry, gpsCountry].filter((s): s is string => !!s);
    const matches = ref ? signals.filter((s) => s === ref).length : 0;
    const present = signals.length;

    let matchResult: "match" | "partial" | "mismatch" = "match";
    if (!ref || present === 0) matchResult = "partial";
    else if (matches === present) matchResult = "match";
    else if (matches >= 1) matchResult = "partial";
    else matchResult = "mismatch";

    // VPN heuristic: IP differs from device AND (GPS present and != IP)
    const vpnSuspected =
      !!ipCountry && !!deviceCountry && ipCountry !== deviceCountry &&
      (!gpsCountry || gpsCountry !== ipCountry);

    // Recent-mismatch history (last 7d)
    const { count: recentMismatches } = await supabaseAdmin
      .from("location_verifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("match_result", "mismatch")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString());

    let risk: "low" | "medium" | "high" = "low";
    if (matchResult === "match" && !vpnSuspected) risk = "low";
    else if (matchResult === "mismatch" && ((recentMismatches ?? 0) >= 2 || vpnSuspected)) risk = "high";
    else if (matchResult === "mismatch" || vpnSuspected) risk = "medium";
    else risk = "low";

    // Insert verification row
    await supabaseAdmin.from("location_verifications").insert({
      user_id: uid,
      profile_country_code: profileCountry,
      current_country_code: currentCountry,
      device_country_code: deviceCountry,
      device_timezone: data.deviceTimezone ?? null,
      ip_country_code: ipCountry,
      gps_country_code: gpsCountry,
      match_result: matchResult,
      risk_level: risk,
      vpn_suspected: vpnSuspected,
      selfie_path: data.selfiePath ?? null,
      verified_at: new Date().toISOString(),
    });

    // Update profile trust signals
    const riskScore = risk === "high" ? 80 : risk === "medium" ? 40 : 0;
    const nextMismatchCount = (prof?.location_mismatch_count ?? 0) + (matchResult === "mismatch" ? 1 : 0);
    const nextTrustLevel: "unverified" | "verified" | "trusted" | "identity_verified" =
      prof?.trust_level === "identity_verified"
        ? "identity_verified"
        : matchResult === "match" && (prof?.verified || prof?.trust_level === "verified")
        ? "trusted"
        : prof?.verified
        ? "verified"
        : "unverified";

    await supabaseAdmin
      .from("profiles")
      .update({
        verified_country_code: matchResult === "match" ? currentCountry : prof?.home_country_code ?? null,
        trust_level: nextTrustLevel,
        location_risk_score: riskScore,
        location_mismatch_count: nextMismatchCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", uid);

    const message =
      matchResult === "match"
        ? "Location verified."
        : matchResult === "partial"
        ? "We couldn't fully confirm your location. You can continue."
        : "We detected that your current location differs from the country listed on your profile. If you are traveling, you may continue and update your location preferences.";

    return {
      result: matchResult,
      risk,
      message,
      requiresAction: matchResult === "mismatch",
      trustLevel: nextTrustLevel,
    };
  });
