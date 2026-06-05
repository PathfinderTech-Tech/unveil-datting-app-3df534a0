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

type Category =
  | "personality"
  | "creativity"
  | "relationships"
  | "values"
  | "emotional_intelligence"
  | "humor"
  | "lifestyle"
  | "growth";

const QUESTIONS: { id: string; category: Category; text: string; placeholder: string }[] = [
  // PERSONALITY (original)
  { id: "p1", category: "personality", text: "What is something that is both sweet and sour?", placeholder: "Something that's both sweet and sour to me is..." },
  { id: "p2", category: "personality", text: "What smells like home to you?", placeholder: "Home smells like..." },
  { id: "p3", category: "personality", text: "What makes someone unforgettable?", placeholder: "Someone unforgettable is..." },
  { id: "p4", category: "personality", text: "What is something most people take too seriously?", placeholder: "People take this way too seriously..." },
  { id: "p5", category: "personality", text: "What's a small thing that instantly improves your day?", placeholder: "The small thing that always lifts my day..." },

  // CREATIVITY (original)
  { id: "c1", category: "creativity", text: "If your life were a movie, what would the title be?", placeholder: "The title would be..." },
  { id: "c2", category: "creativity", text: "If happiness had a color, what color would it be?", placeholder: "Happiness would be..." },
  { id: "c3", category: "creativity", text: "What animal best represents your personality?", placeholder: "I'm basically a..." },
  { id: "c4", category: "creativity", text: "Describe yourself using only one sentence — but make it weird.", placeholder: "I am..." },

  // RELATIONSHIPS (original)
  { id: "r1", category: "relationships", text: "What makes you feel appreciated?", placeholder: "I feel appreciated when..." },
  { id: "r2", category: "relationships", text: "What does trust mean to you?", placeholder: "Trust to me is..." },
  { id: "r3", category: "relationships", text: "What is your perfect Sunday?", placeholder: "My perfect Sunday looks like..." },
  { id: "r4", category: "relationships", text: "When do you feel most yourself with someone?", placeholder: "I feel most myself when..." },

  // FUN (merged into humor)
  { id: "f1", category: "humor", text: "Pineapple on pizza?", placeholder: "My take on pineapple pizza..." },
  { id: "f2", category: "humor", text: "If a penguin knocked on your door, what would you do?", placeholder: "First thing I'd do..." },
  { id: "f3", category: "humor", text: "What's the funniest thing you've ever spent money on?", placeholder: "I once spent money on..." },
  { id: "f4", category: "humor", text: "What's the most unhinged song on your playlist?", placeholder: "The unhinged song on my playlist is..." },

  // VALUES
  { id: "v1", category: "values", text: "What's something you're quietly proud of that most people would never guess?", placeholder: "Something most people don't know about me..." },
  { id: "v2", category: "values", text: "What's a belief you hold that most people in your life disagree with — and what made you stick with it anyway?", placeholder: "I genuinely believe... and I've stayed with it because..." },
  { id: "v3", category: "values", text: "If you could only keep three things in your life exactly as they are right now, what would they be?", placeholder: "The three things I'd never trade away..." },
  { id: "v4", category: "values", text: "What would you refuse to compromise on in a relationship, even if it cost you the person?", placeholder: "The one thing I won't bend on is..." },
  { id: "v5", category: "values", text: "What would have to be true about your life in 10 years for you to feel like you didn't waste it?", placeholder: "Ten years from now, what would make it feel like it mattered..." },
  { id: "v6", category: "values", text: "What's the most important lesson your family taught you — and do you still believe it?", placeholder: "They taught me... and honestly now I think..." },

  // EMOTIONAL INTELLIGENCE
  { id: "ei1", category: "emotional_intelligence", text: "When you're at your lowest, what actually helps — not what should help?", placeholder: "Honestly, what works for me is..." },
  { id: "ei2", category: "emotional_intelligence", text: "What's the difference between a day when you feel like yourself and one when you don't?", placeholder: "On a good day I notice I... on a hard day it looks like..." },
  { id: "ei3", category: "emotional_intelligence", text: "What's the hardest thing for you to say out loud — even to people you trust completely?", placeholder: "The thing that's hardest to admit is..." },
  { id: "ei4", category: "emotional_intelligence", text: "When someone you care about is struggling, what do you do first — fix, listen, or just show up?", placeholder: "My instinct is always to..." },
  { id: "ei5", category: "emotional_intelligence", text: "What's the emotion you're worst at expressing — and what does it look like when it leaks out anyway?", placeholder: "I'm terrible at showing... and when I do it usually looks like..." },
  { id: "ei6", category: "emotional_intelligence", text: "How long does it usually take before you feel safe enough to be completely yourself with someone?", placeholder: "It usually takes me... before I can really be me." },

  // HUMOR
  { id: "h1", category: "humor", text: "What's something you find genuinely funny that most people don't — and why do you think it lands differently for you?", placeholder: "The thing I find hilarious that nobody else does is..." },
  { id: "h2", category: "humor", text: "What's the most absurd hill you would genuinely die on?", placeholder: "I will go to the grave believing that..." },
  { id: "h3", category: "humor", text: "What are you unexpectedly good at — and does it embarrass you or make you proud?", placeholder: "I have an inexplicably strong skill at... and I feel..." },
  { id: "h4", category: "humor", text: "If your friends were casting you in a movie, what character would they say you already are — and would they be right?", placeholder: "My friends would cast me as... and honestly they're..." },
  { id: "h5", category: "humor", text: "What's the most you've ever let yourself be swept up in something without thinking it through? Did it end well?", placeholder: "So there was this one time I just said yes to..." },

  // LIFESTYLE
  { id: "l1", category: "lifestyle", text: "Do you think of yourself as someone who needs plans to feel safe, or someone who plans to avoid feeling behind? There's a difference.", placeholder: "Honestly, when I plan it's because..." },
  { id: "l2", category: "lifestyle", text: "What does your home say about you that a first date would never ask about?", placeholder: "If you walked into my place you'd immediately notice..." },
  { id: "l3", category: "lifestyle", text: "What's the thing you do that actually recharges you — that most people would find boring?", placeholder: "People think it's boring but I genuinely need..." },
  { id: "l4", category: "lifestyle", text: "What's a small daily ritual that would feel like a real loss if you had to give it up?", placeholder: "The small thing I can't live without is..." },
  { id: "l5", category: "lifestyle", text: "What's a city, place, or specific corner of the world where you felt most like yourself?", placeholder: "There's this place where I always feel..." },

  // GROWTH
  { id: "g1", category: "growth", text: "What's something you changed your mind about completely in the last few years — and what broke the old belief?", placeholder: "I used to think... until..." },
  { id: "g2", category: "growth", text: "What's the version of yourself you're still working to leave behind?", placeholder: "The part of me I'm still outgrowing is..." },
  { id: "g3", category: "growth", text: "What kind of feedback is genuinely hard for you to receive — even when you know it's true?", placeholder: "I struggle most when someone tells me..." },
  { id: "g4", category: "growth", text: "What's something you've been trying to change about yourself for a long time that still isn't working?", placeholder: "I keep trying to... and it keeps not working because..." },

  // RELATIONSHIP CLARITY (merged into relationships)
  { id: "rc1", category: "relationships", text: "What's the most honest thing you could say about what you're looking for right now?", placeholder: "Right now, honestly, I want..." },
  { id: "rc2", category: "relationships", text: "What did past partners always misunderstand about you — and are you still figuring out how to explain it?", placeholder: "People in relationships always seem to misread..." },
  { id: "rc3", category: "relationships", text: "How do you show love when you don't know the right words?", placeholder: "When I don't know what to say I usually..." },
  { id: "rc4", category: "relationships", text: "What does feeling truly seen by someone look like for you — specifically?", placeholder: "I feel most seen when someone..." },
];

const CAT_LABEL: Record<Category, { label: string; hue: string }> = {
  personality:            { label: "Personality",           hue: "from-indigo-500/30 to-violet-500/10" },
  creativity:             { label: "Creativity",            hue: "from-pink-500/30 to-fuchsia-500/10" },
  relationships:          { label: "Relationships",         hue: "from-rose-500/30 to-red-500/10" },
  fun:                    { label: "Fun",                   hue: "from-yellow-500/30 to-amber-500/10" },
  values:                 { label: "Values",                hue: "from-fuchsia-500/30 to-purple-500/10" },
  emotional_intelligence: { label: "Emotional Intelligence", hue: "from-cyan-500/30 to-blue-500/10" },
  humor:                  { label: "Humor",                 hue: "from-amber-500/30 to-orange-500/10" },
  lifestyle:              { label: "Lifestyle",             hue: "from-emerald-500/30 to-teal-500/10" },
  growth:                 { label: "Growth",                hue: "from-lime-500/30 to-green-500/10" },
  relationship_clarity:   { label: "Relationship Clarity",  hue: "from-rose-500/30 to-pink-500/10" },
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
          {(["all", "personality", "creativity", "relationships", "fun", "values", "emotional_intelligence", "humor", "lifestyle", "growth", "relationship_clarity"] as const).map((c) => {
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
                placeholder={q.placeholder}
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

