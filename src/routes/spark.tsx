import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { Sparkles, RefreshCcw, Send } from "lucide-react";
import { saveSparkAnswer, loadSparkAnswers, useUserId, awardBadge } from "@/lib/games-api";
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

  // Hydrate previously saved answers from the database.
  useEffect(() => {
    if (!uid) return;
    loadSparkAnswers().then((rows) =>
      setAnswered(
        rows.map((r) => ({ q: r.question, a: r.answer, cat: r.category as Category })),
      ),
    );
  }, [uid]);

  const next = () => { setIdx((i) => i + 1); setAnswer(""); };
  const save = async () => {
    if (!answer.trim()) return;
    const entry = { q: q.text, a: answer.trim(), cat: q.category };
    setAnswered((a) => [entry, ...a].slice(0, 50));
    if (uid) {
      setSaving(true);
      const { error } = await saveSparkAnswer({
        question: entry.q, answer: entry.a, category: entry.cat,
      });
      setSaving(false);
      if (error) toast.error("Couldn't save answer", { description: error });
      else {
        // Earn a badge after 5 spark answers.
        if (answered.length + 1 >= 5) await awardBadge("storyteller");
      }
    } else {
      toast.info("Sign in to save your answers.");
    }
    next();
  };

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
            Short, curious questions that reveal personality, humor, and values. Matches see your answers side-by-side with theirs.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {(["all", "personality", "creativity", "relationships", "fun"] as const).map((c) => {
            const active = filter === c;
            return (
              <button key={c} onClick={() => { setFilter(c); setIdx(0); }}
                className={`rounded-full border px-4 py-1.5 text-xs transition-colors ${
                  active ? "border-primary bg-primary/10 text-foreground" : "border-border bg-surface text-muted-foreground hover:text-foreground"
                }`}>
                {c === "all" ? "All" : CAT_LABEL[c].label}
              </button>
            );
          })}
        </div>

        <div className={`relative overflow-hidden rounded-3xl border border-border bg-card p-8`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${CAT_LABEL[q.category].hue} opacity-40`} />
          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3 w-3" /> {CAT_LABEL[q.category].label}
            </div>
            <div className="font-display text-3xl font-light leading-snug md:text-4xl">{q.text}</div>
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer… honesty travels farthest."
              rows={3}
              className="mt-6 w-full resize-none rounded-2xl border border-border bg-background/60 p-4 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary" />
            <div className="mt-4 flex items-center gap-2">
              <button onClick={save} disabled={!answer.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-40">
                <Send className="h-4 w-4" /> Save answer
              </button>
              <button onClick={next}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground">
                <RefreshCcw className="h-3 w-3" /> Skip
              </button>
            </div>
          </div>
        </div>

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
      </div>
    </div>
  );
}
