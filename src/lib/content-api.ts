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
  const { data, error } = await supabase
    .from("puzzle_content")
    .select("id, puzzle_type, prompt, options, answer, difficulty, meta")
    .eq("puzzle_type", type)
    .limit(limit);
  if (error || !data) return [];
  return data.map((r) => ({
    id: r.id,
    type: r.puzzle_type as PuzzleType,
    prompt: r.prompt,
    options: Array.isArray(r.options) ? (r.options as string[]) : [],
    answer: r.answer,
    difficulty: r.difficulty ?? 1,
    meta: (r.meta as Record<string, unknown>) ?? {},
  }));
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
