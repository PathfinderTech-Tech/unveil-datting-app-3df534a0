import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const setTravelMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { currentCountryCode: string; currentCountryName: string; travelling: boolean }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("set_user_travel_mode", {
      _current_country_code: data.currentCountryCode,
      _current_country_name: data.currentCountryName,
      _travelling: data.travelling,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const endTravelMode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("set_user_travel_mode", {
      _current_country_code: "",
      _current_country_name: "",
      _travelling: false,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/**
 * Activates Travel Mode for 14 days, but only when a recent selfie verification
 * plus location signals (device country, GPS country, IP country) support the
 * user's claimed travel country. Mismatches add a warning; 2 warnings restrict
 * the account.
 */
export const startVerifiedTravel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    claimedCountryCode: string;
    claimedCountryName: string;
    deviceCountryCode?: string | null;
    gpsCountryCode?: string | null;
    deviceTimezone?: string | null;
  }) => input)
  .handler(async ({ data, context }) => {
    const ipCountry =
      (getRequestHeader("cf-ipcountry") ?? getRequestHeader("CF-IPCountry") ?? "")?.toUpperCase() || null;

    const { data: rpcData, error } = await context.supabase.rpc("start_verified_travel", {
      _claimed_country_code: data.claimedCountryCode,
      _claimed_country_name: data.claimedCountryName,
      _device_country_code: data.deviceCountryCode ?? null,
      _gps_country_code: data.gpsCountryCode ?? null,
      _ip_country_code: ipCountry,
      _device_timezone: data.deviceTimezone ?? null,
    });
    if (error) throw new Error(error.message);

    const r = (rpcData ?? {}) as {
      verified?: boolean;
      expires_at?: string | null;
      warning_count?: number;
      restricted?: boolean;
    };
    return {
      verified: !!r.verified,
      expiresAt: r.expires_at ?? null,
      warningCount: r.warning_count ?? 0,
      restricted: !!r.restricted,
    };
  });
