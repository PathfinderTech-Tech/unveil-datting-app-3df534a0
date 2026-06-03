import { supabase } from "@/integrations/supabase/client";

/**
 * Lightweight client-side analytics helper. Inserts into the
 * `analytics_events` table — RLS scopes inserts to the current user.
 * Fails silently so analytics never breaks the UI.
 */
export async function trackEvent(event: string, properties: Record<string, unknown> = {}) {
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id ?? null;
    await supabase.from("analytics_events").insert({
      event,
      user_id: userId,
      properties,
    });
  } catch {
    /* ignore */
  }
}

export const ANALYTICS = {
  appOpen: "app_open",
  dailyAnswerSubmitted: "daily_answer_submitted",
  quizCompleted: "quiz_completed",
  challengeCompleted: "challenge_completed",
  revealUnlocked: "reveal_unlocked",
  matchConverted: "match_converted",
  icebreakerGenerated: "icebreaker_generated",
} as const;
