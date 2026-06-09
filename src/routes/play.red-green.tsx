import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { RED_FLAGS, GREEN_FLAGS } from "@/lib/synapse-store";
import { ArrowLeft, Flag, Check, X } from "lucide-react";

export const Route = createFileRoute("/play/red-green")({
  head: () => ({ meta: [{ title: "Red Flag / Green Flag — UNVEIL" }] }),
  component: RedGreen,
});

const DECK = [
  ...RED_FLAGS.slice(0, 5).map((text) => ({ text, kind: "red" as const })),
  ...GREEN_FLAGS.slice(0, 5).map((text) => ({ text, kind: "green" as const })),
];

function RedGreen() {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<"red" | "green" | null>(null);
  const [done, setDone] = useState(false);
  const card = DECK[i];

  function choose(kind: "red" | "green") {
    if (picked) return;
    setPicked(kind);
    if (kind === card.kind) setScore((s) => s + 1);
  }

  function next() {
    if (i + 1 >= DECK.length) {
      setDone(true);
      return;
    }
    setI((n) => n + 1);
    setPicked(null);
  }

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link to="/play" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> All games
        </Link>

        <h1 className="mt-4 font-display text-4xl font-bold">Red Flag / Green Flag</h1>
        <p className="mt-2 text-sm text-muted-foreground">Trust your read. Sort each behavior before the reveal.</p>

        {done ? (
          <div className="mt-8 rounded-3xl border-2 border-primary bg-gradient-hero p-8 text-primary-foreground shadow-glow">
            <Flag className="h-6 w-6" />
            <div className="mt-3 font-display text-7xl font-bold leading-none">{score}/{DECK.length}</div>
            <p className="mt-3 text-sm opacity-90">
              {score >= 8 ? "Your flag radar is sharp." : score >= 5 ? "Good instincts — keep calibrating." : "A few surprises are part of the game."}
            </p>
            <Link to="/play" className="mt-6 inline-flex items-center gap-2 rounded-full bg-background/20 px-5 py-2 text-sm">
              Back to games
            </Link>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-border bg-card p-8">
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Round {i + 1} of {DECK.length}</div>
            <div className="mt-5 rounded-2xl border border-border bg-surface p-6 text-center font-display text-xl">“{card.text}”</div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {(["red", "green"] as const).map((kind) => {
                const active = picked === kind;
                const correct = picked && card.kind === kind;
                const wrong = active && card.kind !== kind;
                return (
                  <button
                    key={kind}
                    onClick={() => choose(kind)}
                    disabled={picked !== null}
                    className={`rounded-2xl border p-4 text-center text-sm font-medium transition-all ${
                      correct ? "border-neon bg-neon/10" : wrong ? "border-destructive bg-destructive/10" : "border-border bg-surface hover:border-primary"
                    }`}
                  >
                    {correct && <Check className="mr-2 inline h-4 w-4 text-neon" />}
                    {wrong && <X className="mr-2 inline h-4 w-4 text-destructive" />}
                    {kind === "red" ? "🚩 Red Flag" : "🌱 Green Flag"}
                  </button>
                );
              })}
            </div>
            {picked && (
              <button onClick={next} className="mt-6 w-full rounded-full bg-gradient-hero py-3 text-sm font-semibold text-primary-foreground shadow-glow">
                {i + 1 >= DECK.length ? "See result" : "Next round"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}