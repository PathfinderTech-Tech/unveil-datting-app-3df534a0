import { supabase } from "@/integrations/supabase/client";

/* Challenges */

export type ChallengePack = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  premium: boolean;
};

export type ChallengeQuestion = {
  id: string;
  packId: string;
  prompt: string;
  options: string[];
  meta: Record<string, unknown>;
};

export async function loadChallengePacks(): Promise<ChallengePack[]> {
  const { data } = await supabase.from("challenge_packs").select("id, name, description, category, premium").order("category");
  return (data ?? []) as ChallengePack[];
}

export async function loadChallengeQuestions(packId: string, limit = 5): Promise<ChallengeQuestion[]> {
  const { data } = await supabase
    .from("challenge_questions")
    .select("id, pack_id, prompt, options, meta")
    .eq("pack_id", packId)
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id,
    packId: r.pack_id,
    prompt: r.prompt,
    options: Array.isArray(r.options) ? (r.options as string[]) : [],
    meta: (r.meta as Record<string, unknown>) ?? {},
  }));
}

/* New large-content tables (challenges + puzzles) with daily rotation. */

export type ChallengeRow = {
  id: string; category: string; question: string;
  option_a: string | null; option_b: string | null; option_c: string | null;
  explanation: string | null; difficulty: number;
};

function dailySeed() {
  const d = new Date();
  return Number(`${d.getUTCFullYear()}${d.getUTCMonth() + 1}${d.getUTCDate()}`);
}
function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function loadDailyChallenges(limit = 10, category?: string): Promise<ChallengeRow[]> {
  let q = supabase.from("challenges").select("*").eq("active", true).limit(200);
  if (category) q = q.eq("category", category);
  const { data } = await q;
  return shuffleSeeded((data ?? []) as ChallengeRow[], dailySeed()).slice(0, limit);
}

export async function markCompleted(contentType: "challenge", contentId: string, answer?: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("content_completions").insert({
    user_id: u.user.id, content_type: contentType, content_id: contentId, answer: answer ?? null,
  });
}

export const CHALLENGE_CATEGORIES = [
  "guess_my_answer","this_or_that","would_you_rather","dating_scenarios",
  "finish_the_sentence","red_flag_green_flag","future_vision","build_a_story",
] as const;
