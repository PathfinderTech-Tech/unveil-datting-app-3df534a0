import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEvent =
  | "signup"
  | "waitlist_join"
  | "profile_completed"
  | "verification_completed"
  | "match_created"
  | "premium_subscribed";

export async function track(event: AnalyticsEvent, properties: Record<string, unknown> = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("analytics_events").insert({
      user_id: user?.id ?? null,
      event,
      properties: properties as never,
    });
  } catch {
    /* swallow */
  }
}
