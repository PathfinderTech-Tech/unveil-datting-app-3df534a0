import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CATEGORIES = ["relationship", "values", "personality", "challenge"] as const;
type Category = (typeof CATEGORIES)[number];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export const getTodayQuestion = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await supabase
      .from("daily_answers")
      .select("id, question_id, answer, day_key")
      .eq("user_id", userId)
      .eq("day_key", today)
      .limit(1)
      .maybeSingle();
    const { data: pool } = await supabase
      .from("daily_questions")
      .select("id, category, prompt, options")
      .eq("active", true);
    const list = pool ?? [];
    if (!list.length) return { question: null, answered: existing ?? null };
    const idx = hash(`${userId}-${today}`) % list.length;
    return { question: list[idx], answered: existing ?? null };
  });

export const getTodayBundle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data: pool } = await supabase
      .from("daily_questions")
      .select("id, category, prompt, options")
      .eq("active", true);
    const list = (pool ?? []) as Array<{ id: string; category: string; prompt: string; options: string[] }>;
    const cards = CATEGORIES.map((cat) => {
      const inCat = list.filter((q) => q.category === cat);
      if (!inCat.length) return { category: cat, question: null };
      const idx = hash(`${userId}-${today}-${cat}`) % inCat.length;
      return { category: cat, question: inCat[idx] };
    });
    const ids = cards.map((c) => c.question?.id).filter(Boolean) as string[];
    const { data: answered } = ids.length
      ? await supabase
          .from("daily_answers")
          .select("question_id, answer")
          .eq("user_id", userId)
          .eq("day_key", today)
          .in("question_id", ids)
      : { data: [] as Array<{ question_id: string; answer: string }> };
    const aMap = new Map((answered ?? []).map((a) => [a.question_id, a.answer]));
    return {
      cards: cards.map((c) => ({
        ...c,
        answer: c.question ? aMap.get(c.question.id) ?? null : null,
      })),
    };
  });

export const saveDailyAnswer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { questionId: string; answer: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d.questionId)) throw new Error("Invalid questionId");
    if (!d.answer || d.answer.length > 500) throw new Error("Invalid answer");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("daily_answers").upsert(
      { user_id: userId, question_id: data.questionId, answer: data.answer, day_key: today },
      { onConflict: "user_id,day_key,question_id" }
    );
    if (error) throw new Error(error.message);
    const { data: score } = await supabase.rpc("compute_readiness_score", { _uid: userId });
    return { ok: true, score: typeof score === "number" ? score : null };
  });

export const getAnswerHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("daily_answers")
      .select("id, answer, day_key, question_id, daily_questions(prompt, category)")
      .eq("user_id", userId)
      .order("day_key", { ascending: false })
      .limit(30);
    return { history: data ?? [] };
  });
