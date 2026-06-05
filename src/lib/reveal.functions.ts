import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const REVEAL_STAGES = [
  { day: 1, title: "Values", subtitle: "What grounds you both" },
  { day: 2, title: "Lifestyle", subtitle: "How you live day-to-day" },
  { day: 3, title: "Communication style", subtitle: "How you express and listen" },
  { day: 4, title: "Relationship goals", subtitle: "What you're building toward" },
  { day: 5, title: "Personality & habits", subtitle: "The texture of who you are" },
  { day: 6, title: "Future vision", subtitle: "Where your paths could meet" },
  { day: 7, title: "Contact reveal decision", subtitle: "Unlock direct contact sharing" },
] as const;

async function assertMatchParticipant(
  supabase: any,
  userId: string,
  matchId: string,
) {
  const { data: m, error } = await supabase
    .from("matches")
    .select("user_id, matched_user_id, mutual_interest")
    .eq("id", matchId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!m) throw new Error("Match not found");
  const isParticipant = m.user_id === userId || m.matched_user_id === userId;
  if (!isParticipant) throw new Error("Forbidden");
  if (!m.mutual_interest) throw new Error("Match is not mutual");
}

export const getRevealProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { matchId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.matchId)) throw new Error("Invalid matchId");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertMatchParticipant(supabase, userId, data.matchId);
    const { data: rows } = await supabase
      .from("reveal_progress")
      .select("day, unlocked_at, user_id")
      .eq("match_id", data.matchId);
    const mine = (rows ?? []).filter((r: any) => r.user_id === userId);
    const currentDay = mine.reduce((m: number, r: any) => Math.max(m, r.day), 0);
    // Return only own rows + aggregate peer stage (no peer timestamps).
    const peerStage = (rows ?? [])
      .filter((r: any) => r.user_id !== userId)
      .reduce((m: number, r: any) => Math.max(m, r.day), 0);
    return { currentDay, peerStage, stages: REVEAL_STAGES, history: mine };
  });

export const advanceReveal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { matchId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.matchId)) throw new Error("Invalid matchId");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertMatchParticipant(supabase, userId, data.matchId);
    const { data: rows } = await supabase
      .from("reveal_progress")
      .select("day, unlocked_at")
      .eq("match_id", data.matchId)
      .eq("user_id", userId)
      .order("day", { ascending: false })
      .limit(1);
    const last = rows?.[0];
    if (last) {
      const since = Date.now() - new Date(last.unlocked_at).getTime();
      if (since < 20 * 60 * 60 * 1000) {
        return { ok: false, reason: "Next reveal unlocks 20 hours after the previous one." };
      }
      if (last.day >= 7) return { ok: false, reason: "All stages already revealed." };
    }
    const nextDay = (last?.day ?? 0) + 1;
    const { error } = await supabase
      .from("reveal_progress")
      .insert({ match_id: data.matchId, user_id: userId, day: nextDay });
    if (error) throw new Error(error.message);
    return { ok: true, day: nextDay };
  });

