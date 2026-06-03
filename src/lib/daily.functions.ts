import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getTodayQuestion = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    // Already answered today?
    const { data: existing } = await supabase
      .from("daily_answers")
      .select("id, question_id, answer, day_key")
      .eq("user_id", userId)
      .eq("day_key", today)
      .maybeSingle();

    // Pull a stable pseudo-random question for this user/day
    const { data: pool } = await supabase
      .from("daily_questions")
      .select("id, category, prompt, options")
      .eq("active", true);

    const list = pool ?? [];
    if (!list.length) return { question: null, answered: existing ?? null };

    // Deterministic pick by hash of (userId + date)
    const seed = `${userId}-${today}`;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const idx = h % list.length;
    const pick = list[idx];

    return { question: pick, answered: existing ?? null };
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
      { onConflict: "user_id,day_key" }
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
