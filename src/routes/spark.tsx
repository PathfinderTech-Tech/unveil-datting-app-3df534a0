import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { Sparkles, RefreshCcw, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { saveSparkAnswer, loadSparkAnswers, useUserId, awardBadge } from "@/lib/games-api";
import { useRequireOnboarding } from "@/hooks/use-require-onboarding";
import { toast } from "sonner";


export const Route = createFileRoute("/spark")({
  head: () => ({
    meta: [
      { title: "Spark Questions — UNVEIL" },
      { name: "description", content: "Personality, humor, and creativity questions that reveal who you really are." },
    ],
  }),
  component: SparkPage,
});

type Category = "personality" | "creativity" | "relationships" | "fun";

const QUESTIONS: { category: Category; text: string }[] = [
  { category: "personality", text: "What is something that is both sweet and sour?" },
  { category: "personality", text: "What smells like home to you?" },
  { category: "personality", text: "What makes someone unforgettable?" },
  { category: "personality", text: "What is something most people take too seriously?" },
  { category: "personality", text: "What's a small thing that instantly improves your day?" },
  { category: "creativity", text: "If your life were a movie, what would the title be?" },
  { category: "creativity", text: "If happiness had a color, what color would it be?" },
  { category: "creativity", text: "What animal best represents your personality?" },
  { category: "creativity", text: "Describe yourself using only one sentence — but make it weird." },
  { category: "relationships", text: "What makes you feel appreciated?" },
  { category: "relationships", text: "What does trust mean to you?" },
  { category: "relationships", text: "What is your perfect Sunday?" },
  { category: "relationships", text: "When do you feel most yourself with someone?" },
  { category: "fun", text: "Pineapple on pizza?" },
  { category: "fun", text: "If a penguin knocked on your door, what would you do?" },
  { category: "fun", text: "What's the funniest thing you've ever spent money on?" },
  { category: "fun", text: "What's the most unhinged song on your playlist?" },
];

const CAT_LABEL: Record<Category, { label: string; hue: string }> = {
  personality:   { label: "Personality",   hue: "from-fuchsia-500/30 to-purple-500/10" },
  creativity:    { label: "Creativity",    hue: "from-cyan-500/30 to-blue-500/10" },
  relationships: { label: "Relationships", hue: "from-rose-500/30 to-amber-500/10" },
  fun:           { label: "Fun",           hue: "from-emerald-500/30 to-teal-500/10" },
};

function SparkPage() {
  const { checking } = useRequireOnboarding();
  const uid = useUserId();
  const [filter, setFilter] = useState<Category | "all">("all");

  const pool = useMemo(
    () => QUESTIONS.filter((q) => filter === "all" || q.category === filter),
    [filter]
  );
  const [idx, setIdx] = useState(0);
  const q = pool[idx % pool.length];
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);
  const [answered, setAnswered] = useState<{ q: string; a: string; cat: Category }[]>([]);
  const [done, setDone] = useState(false);

  // Hydrate previously saved answers from the database.
  useEffect(() => {
    if (!uid) return;
    loadSparkAnswers().then((rows) =>
      setAnswered(
        rows.map((r) => ({ q: r.question, a: r.answer, cat: r.category as Category })),
      ),
    );
  }, [uid]);

  // Track which questions in current pool are answered (by question text).
  const answeredSet = useMemo(() => new Set(answered.map((a) => a.q)), [answered]);
  const remainingCount = pool.filter((p) => !answeredSet.has(p.text)).length;
  const allAnswered = remainingCount === 0 && pool.length > 0;

  // Auto-advance to next unanswered question when filter/pool changes.
  useEffect(() => {
    if (!pool.length) return;
    const firstUnanswered = pool.findIndex((p) => !answeredSet.has(p.text));
    if (firstUnanswered >= 0) setIdx(firstUnanswered);
  }, [filter, pool.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToNextUnanswered = (fromIdx: number) => {
    for (let step = 1; step <= pool.length; step++) {
      const i = (fromIdx + step) % pool.length;
      if (!answeredSet.has(pool[i].text)) {
        setIdx(i);
        setAnswer("");
        return true;
      }
    }
    return false;
  };

  const next = () => {
    const found = goToNextUnanswered(idx);
    if (!found) setDone(true);
  };
  const prev = () => { setIdx((i) => (i - 1 + pool.length) % pool.length); setAnswer(""); };

  // Auto-save: debounced save while typing.
  useEffect(() => {
    if (!answer.trim()) return;
    if (answeredSet.has(q.text)) return; // already saved
    const trimmed = answer.trim();
    const handle = setTimeout(async () => {
      const entry = { q: q.text, a: trimmed, cat: q.category };
      if (uid) {
        setSaving(true);
        const { error } = await saveSparkAnswer({
          question: entry.q, answer: entry.a, category: entry.cat,
        });
        setSaving(false);
        if (error) {
          toast.error("Couldn't save answer", { description: error });
          return;
        }
        setAnswered((a) => [entry, ...a].slice(0, 50));
        if (answered.length + 1 >= 5) await awardBadge("storyteller");
      } else {
        setAnswered((a) => [entry, ...a].slice(0, 50));
      }
    }, 900);
    return () => clearTimeout(handle);
  }, [answer, q.text, q.category, uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAndNext = async () => {
    if (!answer.trim()) { next(); return; }
    if (!answeredSet.has(q.text)) {
      const entry = { q: q.text, a: answer.trim(), cat: q.category };
      if (uid) {
        setSaving(true);
        const { error } = await saveSparkAnswer({
          question: entry.q, answer: entry.a, category: entry.cat,
        });
        setSaving(false);
        if (error) { toast.error("Couldn't save answer", { description: error }); return; }
      }
      setAnswered((a) => [entry, ...a].slice(0, 50));
    }
    const found = goToNextUnanswered(idx);
    if (!found) setDone(true);
  };

  if (checking) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <div className="mx-auto max-w-md p-12 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <UnveilNav />

      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Spark Questions</div>
          <h1 className="mt-2 font-display text-5xl font-light md:text-6xl">
            Answer to be <span className="text-gradient-hero italic">unforgettable.</span>
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Short, curious questions that reveal personality, humor, and values. Your answers save automatically as you type.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {(["all", "personality", "creativity", "relationships", "fun"] as const).map((c) => {
            const active = filter === c;
            return (
              <button key={c} onClick={() => { setFilter(c); setIdx(0); setDone(false); }}
                className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${
                  active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-surface text-muted-foreground hover:text-foreground"
                }`}>
                {c === "all" ? "All" : CAT_LABEL[c].label}
              </button>
            );
          })}
        </div>

        {done || allAnswered ? (
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 opacity-50" />
            <div className="relative">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3 w-3" /> All done
              </div>
              <div className="font-display text-3xl font-light leading-snug md:text-4xl">
                You've answered every spark question.
              </div>
              <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
                Happy with your answers? You can review them below or head to the next challenges. Want to tweak something? Just pick a question and your edits save automatically.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <button onClick={() => { setDone(false); setIdx(0); }}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground">
                  <RefreshCcw className="h-3 w-3" /> Review & edit
                </button>
                <Link to="/challenges"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow">
                  I'm happy — go to Challenges <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className={`relative overflow-hidden rounded-3xl border border-border bg-card p-8`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${CAT_LABEL[q.category].hue} opacity-40`} />
            <div className="relative">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3 w-3" /> {CAT_LABEL[q.category].label}
              </div>
              <div className="font-display text-3xl font-light leading-snug md:text-4xl">{q.text}</div>
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer… it saves automatically."
                rows={3}
                className="mt-6 w-full resize-none rounded-2xl border border-border bg-background/60 p-4 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary" />
              <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {saving ? "Saving…" : answeredSet.has(q.text) ? "Saved ✓" : answer.trim() ? "Saves as you type" : "Auto-saves"}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button onClick={prev}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-3 w-3" /> Previous
                </button>
                <button onClick={saveAndNext}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow">
                  <Send className="h-4 w-4" /> Next question
                </button>
                <button onClick={next}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground">
                  <RefreshCcw className="h-3 w-3" /> Skip
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>Question {(idx % pool.length) + 1} of {pool.length}</span>
                <span>{pool.length - remainingCount}/{pool.length} answered</span>
              </div>
            </div>
          </div>
        )}


        {answered.length > 0 && (
          <div className="mt-10">
            <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Your spark feed</div>
            <div className="space-y-3">
              {answered.map((it, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-4">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{CAT_LABEL[it.cat].label}</div>
                  <div className="mt-1 font-display text-lg">{it.q}</div>
                  <div className="mt-1 text-sm text-foreground/85">{it.a}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
          <Link to="/puzzles" className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-3 w-3" /> Back: Puzzles
          </Link>
          <Link to="/challenges" className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow">
            Next: Challenges <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

    </div>
  );
}

