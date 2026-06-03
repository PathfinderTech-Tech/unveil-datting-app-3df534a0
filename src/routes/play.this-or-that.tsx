import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { ArrowLeft, Zap } from "lucide-react";

export const Route = createFileRoute("/play/this-or-that")({
  head: () => ({ meta: [{ title: "This or That — UNVEIL" }] }),
  component: ThisOrThat,
});

const ROUNDS: [string, string][] = [
  ["Coffee", "Tea"],
  ["City", "Countryside"],
  ["Books", "Movies"],
  ["Morning", "Night"],
  ["Sweet", "Savory"],
  ["Plan", "Improvise"],
  ["Beach", "Mountains"],
  ["Cats", "Dogs"],
  ["Cook in", "Eat out"],
  ["Concert", "Museum"],
];

function ThisOrThat() {
  const [picks, setPicks] = useState<(0 | 1 | null)[]>(Array(ROUNDS.length).fill(null));
  const [partner] = useState<(0 | 1)[]>(ROUNDS.map((_, i) => (i % 3 === 0 ? 0 : 1) as 0 | 1));
  const [done, setDone] = useState(false);

  const matches = picks.filter((p, i) => p !== null && p === partner[i]).length;
  const answered = picks.filter((p) => p !== null).length;

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link to="/play" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> All games
        </Link>

        <h1 className="mt-4 font-display text-4xl font-bold">This or That</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tap fast. Reveal how often you align.</p>

        <div className="mt-6 space-y-3">
          {ROUNDS.map(([a, b], i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              {[a, b].map((label, side) => {
                const me = picks[i] === side;
                const them = done && partner[i] === side;
                let cls = "border-border bg-card hover:border-foreground/30";
                if (me && them) cls = "border-neon bg-neon/10";
                else if (me) cls = "border-primary bg-primary/10";
                else if (them) cls = "border-accent/60 bg-accent/5";
                return (
                  <button key={label} onClick={() => !done && setPicks((p) => { const n = [...p]; n[i] = side as 0 | 1; return n; })}
                    className={`rounded-2xl border p-4 text-center text-sm transition-all ${cls}`}>
                    {label}
                    {done && me && them && <div className="mt-1 font-mono text-[10px] text-neon">match</div>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {!done ? (
          <button onClick={() => setDone(true)} disabled={answered < ROUNDS.length}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-50">
            Reveal alignment <Zap className="h-4 w-4" />
          </button>
        ) : (
          <div className="mt-8 rounded-3xl border-2 border-primary bg-gradient-hero p-6 text-center text-primary-foreground shadow-glow">
            <div className="font-mono text-xs uppercase tracking-wider opacity-80">Aligned on</div>
            <div className="mt-2 font-display text-6xl font-bold">{matches}/{ROUNDS.length}</div>
          </div>
        )}
      </div>
    </div>
  );
}
