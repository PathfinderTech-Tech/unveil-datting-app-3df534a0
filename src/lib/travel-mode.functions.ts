import { createServerFn } from "@tanstack/react-start";
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
