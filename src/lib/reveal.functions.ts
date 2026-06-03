import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const REVEAL_STAGES = [
  { day: 1, title: "Voice introduction", subtitle: "Hear how they sound" },
  { day: 2, title: "Personality reveal", subtitle: "Their core traits" },
  { day: 3, title: "Values reveal", subtitle: "What grounds them" },
  { day: 4, title: "Life goals reveal", subtitle: "Where they're heading" },
  { day: 5, title: "Partial photo reveal", subtitle: "A first glimpse" },
  { day: 6, title: "Video introduction", subtitle: "Their presence" },
  { day: 7, title: "Full profile reveal", subtitle: "The whole picture" },
] as const;

export const getRevealProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { matchId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.matchId)) throw new Error("Invalid matchId");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows } = await supabase
      .from("reveal_progress")
      .select("day, unlocked_at, user_id")
      .eq("match_id", data.matchId);
    const mine = (rows ?? []).filter((r: any) => r.user_id === userId);
    const currentDay = mine.reduce((m: number, r: any) => Math.max(m, r.day), 0);
    return { currentDay, stages: REVEAL_STAGES, history: rows ?? [] };
  });

export const advanceReveal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { matchId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.matchId)) throw new Error("Invalid matchId");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
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
