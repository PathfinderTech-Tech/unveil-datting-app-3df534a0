import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { ArrowLeft, Eye, Check, X } from "lucide-react";

export const Route = createFileRoute("/play/predict")({
  head: () => ({ meta: [{ title: "Predict Your Match — UNVEIL" }] }),
  component: Predict,
});

const PROMPTS: { q: string; options: string[]; truth: number }[] = [
  { q: "Beach or mountains?", options: ["Beach", "Mountains"], truth: 1 },
  { q: "Introvert or extrovert?", options: ["Introvert", "Extrovert"], truth: 0 },
  { q: "Dream vacation?", options: ["Tokyo", "Paris", "Patagonia", "Bali"], truth: 2 },
  { q: "Morning or night person?", options: ["Morning", "Night"], truth: 1 },
  { q: "Plans the trip or goes with the flow?", options: ["Plans every detail", "Pure flow"], truth: 0 },
];

function Predict() {
  const [i, setI] = useState(0);
  const [guess, setGuess] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const p = PROMPTS[i];

  function pick(idx: number) {
    setGuess(idx);
    if (idx === p.truth) setScore((s) => s + 1);
  }
  function next() {
    if (i + 1 >= PROMPTS.length) { setDone(true); return; }
    setI(i + 1); setGuess(null);
  }

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link to="/play" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> All games
        </Link>

        <h1 className="mt-4 font-display text-4xl font-bold">Predict Your Match</h1>
        <p className="mt-2 text-sm text-muted-foreground">Guess how they answered. Reveal shows if you read them right.</p>

        {!done ? (
          <div className="mt-8 rounded-3xl border border-border bg-card p-8">
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Round {i + 1} of {PROMPTS.length}</div>
            <div className="mt-3 font-display text-2xl">{p.q}</div>
            <div className="mt-6 grid gap-2 md:grid-cols-2">
              {p.options.map((o, idx) => {
                const showResult = guess !== null;
                const isTruth = idx === p.truth;
                const isMyGuess = idx === guess;
                let cls = "border-border bg-surface hover:border-foreground/30";
                if (showResult && isTruth) cls = "border-neon bg-neon/10";
                else if (showResult && isMyGuess) cls = "border-destructive bg-destructive/10";
                return (
                  <button key={o} onClick={() => guess === null && pick(idx)}
                    disabled={guess !== null}
                    className={`rounded-2xl border p-3 text-left text-sm transition-all ${cls}`}>
                    {showResult && isTruth && <Check className="mr-2 inline h-4 w-4 text-neon" />}
                    {showResult && isMyGuess && !isTruth && <X className="mr-2 inline h-4 w-4 text-destructive" />}
                    {o}
                  </button>
                );
              })}
            </div>

            {guess !== null && (
              <button onClick={next} className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-glow">
                {i + 1 >= PROMPTS.length ? "See result" : "Next round"} <Eye className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border-2 border-primary bg-gradient-hero p-8 text-primary-foreground shadow-glow">
            <div className="font-mono text-xs uppercase tracking-wider opacity-80">You read them right</div>
            <div className="mt-3 font-display text-7xl font-bold leading-none">{score}/{PROMPTS.length}</div>
            <p className="mt-3 text-sm opacity-90">
              {score >= 4 ? "You see them clearly." : score >= 2 ? "Solid intuition — keep going." : "Plenty to learn — that's the fun part."}
            </p>
            <Link to="/play" className="mt-6 inline-flex items-center gap-2 rounded-full bg-background/20 px-5 py-2 text-sm">
              Back to games
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
