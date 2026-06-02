import { supabase } from "@/integrations/supabase/client";

export type PuzzleType = "philosophy" | "love_quote" | "proverb" | "quote_who" | "guess_country";

export type PuzzleItem = {
  id: string;
  type: PuzzleType;
  prompt: string;
  options: string[];
  answer: string;
  difficulty: number;
  meta: Record<string, unknown>;
};

export const PUZZLE_TYPE_META: Record<PuzzleType, { title: string; tagline: string; emoji: string }> = {
  philosophy:    { title: "Who Said It",       tagline: "Famous philosophy quotes.", emoji: "🧠" },
  quote_who:     { title: "Who Said This Quote", tagline: "Match the speaker.",      emoji: "💬" },
  love_quote:    { title: "Missing Word",       tagline: "Complete the love line.",  emoji: "💞" },
  proverb:       { title: "Old Wisdom",         tagline: "Finish the proverb.",      emoji: "🪶" },
  guess_country: { title: "Guess The Country",  tagline: "Clue → country.",          emoji: "🌍" },
};

export async function loadPuzzlesByType(type: PuzzleType, limit = 5): Promise<PuzzleItem[]> {
  // Pull a larger pool then shuffle client-side so each round feels fresh.
  const { data, error } = await supabase
    .from("puzzle_content")
    .select("id, puzzle_type, prompt, options, answer, difficulty, meta")
    .eq("puzzle_type", type)
    .limit(50);
  if (error || !data) return [];
  const mapped: PuzzleItem[] = data.map((r) => ({
    id: r.id,
    type: r.puzzle_type as PuzzleType,
    prompt: r.prompt,
    options: Array.isArray(r.options) ? (r.options as string[]) : [],
    answer: r.answer,
    difficulty: r.difficulty ?? 1,
    meta: (r.meta as Record<string, unknown>) ?? {},
  }));
  return mapped.sort(() => Math.random() - 0.5).slice(0, limit);
}

export async function loadPuzzleTypeCounts(): Promise<Record<PuzzleType, number>> {
  const out = { philosophy: 0, love_quote: 0, proverb: 0, quote_who: 0, guess_country: 0 } as Record<PuzzleType, number>;
  const { data } = await supabase.from("puzzle_content").select("puzzle_type");
  (data ?? []).forEach((r) => {
    const k = r.puzzle_type as PuzzleType;
    if (k in out) out[k] = (out[k] ?? 0) + 1;
  });
  return out;
}

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
export type PuzzleRow = {
  id: string; category: string; puzzle: string; answer: string;
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

export async function loadDailyPuzzles(limit = 5, category?: string): Promise<PuzzleRow[]> {
  let q = supabase.from("puzzles").select("*").eq("active", true).limit(200);
  if (category) q = q.eq("category", category);
  const { data } = await q;
  return shuffleSeeded((data ?? []) as PuzzleRow[], dailySeed() + 1).slice(0, limit);
}

export async function markCompleted(contentType: "challenge" | "puzzle", contentId: string, answer?: string) {
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
export const PUZZLE_CATEGORIES = [
  "who_said_this","finish_the_quote","missing_word","guess_the_country",
  "what_do_you_see_first","connect_the_dots","love_and_philosophy",
  "travel_dreams","name_around_the_world",
] as const;
