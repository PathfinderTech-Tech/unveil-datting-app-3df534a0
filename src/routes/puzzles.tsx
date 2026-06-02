import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { ArrowRight, ArrowLeft, Trophy, Check, X } from "lucide-react";
import { savePuzzleScore, loadPuzzleScores, useUserId, awardBadge } from "@/lib/games-api";
import { loadPuzzlesByType, PUZZLE_TYPE_META, type PuzzleItem, type PuzzleType } from "@/lib/content-api";

export const Route = createFileRoute("/puzzles")({
  head: () => ({
    meta: [
      { title: "Discovery Puzzles — UNVEIL" },
      { name: "description", content: "Playful curiosity puzzles — quotes, wisdom, geography. Never an IQ score." },
    ],
  }),
  component: Puzzles,
});

const TYPES: PuzzleType[] = ["quote_who", "philosophy", "love_quote", "proverb", "guess_country"];

function Puzzles() {
  const uid = useUserId();
  const [active, setActive] = useState<PuzzleType | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => { if (uid) loadPuzzleScores().then(setScores); }, [uid]);

  function record(type: PuzzleType, points: number) {
    setScores((s) => {
      const next = { ...s, [type]: Math.max(s[type] ?? 0, points) };
      if (uid) {
        savePuzzleScore(type, next[type]);
        const played = Object.values(next).filter((v) => v > 0).length;
        if (played >= 3) awardBadge("deep-thinker");
      }
      return next;
    });
  }

  const best = useMemo(() => {
    const entries = Object.entries(scores).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    return entries[0]?.[0] as PuzzleType | undefined;
  }, [scores]);

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Discovery Puzzles</div>
            <h1 className="mt-2 font-display text-5xl font-light md:text-6xl">
              Play to reveal your <span className="text-gradient-hero italic">curiosity.</span>
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">Quotes, wisdom, geography. No IQ score — just a playful map of your mind.</p>
          </div>
          {best && (
            <div className="rounded-3xl border border-border bg-card px-5 py-3 text-right">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Strongest in</div>
              <div className="flex items-center gap-2 font-display text-2xl">
                <Trophy className="h-5 w-5 text-accent" /> {PUZZLE_TYPE_META[best].title}
              </div>
            </div>
          )}
        </div>

        {active === null ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {TYPES.map((t) => {
              const meta = PUZZLE_TYPE_META[t];
              return (
                <button key={t} onClick={() => setActive(t)}
                  className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 text-left transition-all hover:border-primary/50 hover:shadow-glow">
                  <div className="mb-5 text-4xl">{meta.emoji}</div>
                  <h3 className="font-display text-2xl font-light">{meta.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{meta.tagline}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {scores[t] ? `Best ${scores[t]}` : "Unplayed"}
                    </span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <PuzzleRunner type={active} onBack={() => setActive(null)} onScore={(pts) => record(active, pts)} />
        )}
      </div>
    </div>
  );
}

function PuzzleRunner({ type, onBack, onScore }: { type: PuzzleType; onBack: () => void; onScore: (pts: number) => void }) {
  const [items, setItems] = useState<PuzzleItem[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    loadPuzzlesByType(type, 5).then((rows) => {
      // Shuffle option order per item
      const shuffled = rows.map((r) => ({ ...r, options: [...r.options].sort(() => Math.random() - 0.5) }));
      setItems(shuffled);
    });
  }, [type]);

  if (!items) {
    return <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <BackBtn onClick={onBack} />
        <div className="rounded-3xl border border-dashed border-border p-12 text-center text-muted-foreground">No puzzles available yet.</div>
      </div>
    );
  }

  if (done) {
    const pts = correctCount * 20;
    return (
      <div className="space-y-4">
        <BackBtn onClick={onBack} />
        <div className="rounded-3xl border-2 border-primary bg-gradient-hero p-8 text-primary-foreground shadow-glow">
          <div className="font-mono text-xs uppercase tracking-wider opacity-80">Round complete</div>
          <div className="mt-2 font-display text-5xl font-bold">{correctCount} / {items.length}</div>
          <div className="mt-2 text-sm opacity-90">+{pts} curiosity points</div>
          <button onClick={() => { setI(0); setPicked(null); setCorrectCount(0); setDone(false); }}
            className="mt-5 rounded-full bg-background/20 px-5 py-2 text-sm font-medium hover:bg-background/30">Play again</button>
        </div>
      </div>
    );
  }

  const q = items[i];
  const isCorrect = picked !== null && picked === q.answer;

  function next() {
    if (picked === q.answer) setCorrectCount((c) => c + 1);
    if (i + 1 >= items!.length) {
      const finalCorrect = (picked === q.answer ? correctCount + 1 : correctCount);
      onScore(finalCorrect * 20);
      setDone(true);
    } else {
      setI((v) => v + 1); setPicked(null);
    }
  }

  return (
    <div className="space-y-4">
      <BackBtn onClick={onBack} />
      <div className="rounded-3xl border border-border bg-card p-7">
        <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>{PUZZLE_TYPE_META[type].title}</span>
          <span>{i + 1} / {items.length}</span>
        </div>
        <h2 className="mt-2 font-display text-2xl font-light leading-snug md:text-3xl">{q.prompt}</h2>
        <div className="mt-6 grid gap-2 md:grid-cols-2">
          {q.options.map((opt) => {
            const state = picked === null ? "idle" : opt === q.answer ? "correct" : picked === opt ? "wrong" : "muted";
            return (
              <button
                key={opt}
                disabled={picked !== null}
                onClick={() => setPicked(opt)}
                className={`flex items-center justify-between rounded-2xl border p-4 text-left text-sm transition-all ${
                  state === "idle" ? "border-border bg-surface hover:border-primary" :
                  state === "correct" ? "border-neon/60 bg-neon/10" :
                  state === "wrong" ? "border-accent bg-accent/10" :
                  "border-border bg-surface opacity-50"
                }`}
              >
                <span>{opt}</span>
                {state === "correct" && <Check className="h-4 w-4 text-neon" />}
                {state === "wrong" && <X className="h-4 w-4 text-accent" />}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div className="mt-5 flex items-center justify-between">
            <div className={`text-sm ${isCorrect ? "text-neon" : "text-muted-foreground"}`}>
              {isCorrect ? "Nice — that's it." : `Answer: ${q.answer}`}
            </div>
            <button onClick={next} className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2 text-sm text-primary-foreground shadow-glow">
              {i + 1 >= items.length ? "See result" : "Next"} <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-2 text-xs hover:bg-surface">
      <ArrowLeft className="h-3 w-3" /> All puzzles
    </button>
  );
}
