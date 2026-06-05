// Client-side helpers to persist game activity per signed-in user.
// Uses the browser Supabase client; RLS scopes everything to auth.uid().
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export async function getUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export function useUserId() {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    getUserId().then(setUid);
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUid(s?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return uid;
}

/* ---------- Spark ---------- */
export async function saveSparkAnswer(input: {
  question: string;
  answer: string;
  category: string;
}) {
  const uid = await getUserId();
  if (!uid) return { error: "not-signed-in" as const };
  // Upsert by (user_id, question): remove any previous answer for this
  // question first so editing the same question doesn't pile up rows.
  await supabase
    .from("spark_answers")
    .delete()
    .eq("user_id", uid)
    .eq("question", input.question);
  const { error } = await supabase.from("spark_answers").insert({
    user_id: uid,
    ...input,
  });
  return { error: error?.message ?? null };
}

export async function deleteSparkAnswer(question: string) {
  const uid = await getUserId();
  if (!uid) return { error: "not-signed-in" as const };
  const { error } = await supabase
    .from("spark_answers")
    .delete()
    .eq("user_id", uid)
    .eq("question", question);
  return { error: error?.message ?? null };
}

export async function loadSparkAnswers() {
  const uid = await getUserId();
  if (!uid) return [];
  const { data } = await supabase
    .from("spark_answers")
    .select("question, answer, category, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

/* ---------- Puzzles ---------- */
export async function savePuzzleScore(puzzleId: string, score: number) {
  const uid = await getUserId();
  if (!uid) return { error: "not-signed-in" as const };
  // Upsert keeps best score by checking existing.
  const { data: existing } = await supabase
    .from("puzzle_scores")
    .select("score")
    .eq("user_id", uid)
    .eq("puzzle_id", puzzleId)
    .maybeSingle();
  if (existing && existing.score >= score) return { error: null };
  const { error } = await supabase.from("puzzle_scores").upsert(
    { user_id: uid, puzzle_id: puzzleId, score, updated_at: new Date().toISOString() },
    { onConflict: "user_id,puzzle_id" },
  );
  return { error: error?.message ?? null };
}

export async function loadPuzzleScores(): Promise<Record<string, number>> {
  const uid = await getUserId();
  if (!uid) return {};
  const { data } = await supabase
    .from("puzzle_scores")
    .select("puzzle_id, score")
    .eq("user_id", uid);
  const out: Record<string, number> = {};
  (data ?? []).forEach((r) => (out[r.puzzle_id] = r.score));
  return out;
}

/* ---------- Challenges ---------- */
export async function saveChallengeResult(input: {
  picks: ("a" | "b" | null)[];
  reward: string | null;
  payment: string | null;
  both_agree: boolean;
  partner_id?: string | null;
}) {
  const uid = await getUserId();
  if (!uid) return { error: "not-signed-in" as const };
  const { error } = await supabase.from("challenge_results").insert({
    user_id: uid,
    partner_id: input.partner_id ?? null,
    picks: input.picks,
    reward: input.reward,
    payment: input.payment,
    both_agree: input.both_agree,
  });
  return { error: error?.message ?? null };
}

/* ---------- Badges ---------- */
export async function awardBadge(badgeId: string) {
  const uid = await getUserId();
  if (!uid) return { error: "not-signed-in" as const };
  const { error } = await supabase
    .from("user_badges")
    .insert({ user_id: uid, badge_id: badgeId })
    .select()
    .maybeSingle();
  // 23505 = unique violation (already earned). That's fine.
  if (error && !error.message.includes("duplicate")) return { error: error.message };
  return { error: null };
}

export async function loadBadges(): Promise<string[]> {
  const uid = await getUserId();
  if (!uid) return [];
  const { data } = await supabase.from("user_badges").select("badge_id").eq("user_id", uid);
  return (data ?? []).map((r) => r.badge_id);
}
