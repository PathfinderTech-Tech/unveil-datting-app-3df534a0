import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { ArrowLeft, Trophy, Flame } from "lucide-react";

export const Route = createFileRoute("/play/quiz")({
  head: () => ({ meta: [{ title: "Couple Quiz Battle — UNVEIL" }] }),
  component: Quiz,
});

const Q: { q: string; options: string[]; partner: number }[] = [
  { q: "Best date energy?", options: ["Cozy night in", "Adventure outing", "Long dinner", "Hidden gem walk"], partner: 2 },
  { q: "Most you?", options: ["Curious", "Loyal", "Playful", "Ambitious"], partner: 0 },
  { q: "Conflict mode?", options: ["Talk now", "Sleep on it", "Write it out", "Walk it off"], partner: 0 },
  { q: "Dream weekend?", options: ["Beach", "Mountain hike", "City food crawl", "Festival"], partner: 1 },
  { q: "Love feels like…", options: ["Quiet trust", "Big laughter", "Wild plans", "Soft touch"], partner: 0 },
];

function Quiz() {
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [matched, setMatched] = useState(0);
  const [timer, setTimer] = useState(8);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done || picked !== null) return;
    if (timer <= 0) { lockIn(-1); return; }
    const t = setTimeout(() => setTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, picked, done]);

  function lockIn(idx: number) {
    setPicked(idx);
    const correct = idx === Q[i].partner;
    if (correct) {
      const points = 10 + timer * 2;
      setScore((s) => s + points);
      setMatched((m) => m + 1);
      setStreak((s) => { const n = s + 1; setMaxStreak((m) => Math.max(m, n)); return n; });
    } else {
      setStreak(0);
    }
    setTimeout(() => {
      if (i + 1 >= Q.length) { setDone(true); return; }
      setI(i + 1); setPicked(null); setTimer(8);
    }, 1200);
  }

  if (done) {
    return (
      <div className="min-h-screen">
        <UnveilNav />
        <div className="mx-auto max-w-2xl px-6 py-12">
          <Link to="/play" className="text-xs text-muted-foreground hover:text-foreground">← Back to games</Link>
          <div className="mt-6 rounded-3xl border-2 border-primary bg-gradient-hero p-8 text-primary-foreground shadow-glow">
            <Trophy className="h-6 w-6" />
            <div className="mt-3 font-display text-6xl font-bold">{score} pts</div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <Stat label="Compatibility streak" value={`x${maxStreak}`} />
              <Stat label="Shared interests" value={`${matched}/${Q.length}`} />
              <Stat label="Curiosity score" value={`${Math.round((score / (Q.length * 26)) * 100)}%`} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link to="/play" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> All games
        </Link>

        <div className="mt-4 flex items-center justify-between">
          <h1 className="font-display text-4xl font-bold">Quiz Battle</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1 font-mono"><Flame className="h-3.5 w-3.5 text-accent" /> x{streak}</span>
            <span className="font-mono">{score} pts</span>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-border bg-card p-8">
          <div className="flex justify-between font-mono text-xs uppercase tracking-wider text-muted-foreground">
            <span>Round {i + 1}/{Q.length}</span>
            <span>{timer}s</span>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-border">
            <div className="h-full bg-gradient-hero transition-all" style={{ width: `${(timer / 8) * 100}%` }} />
          </div>
          <div className="mt-6 font-display text-2xl">{Q[i].q}</div>
          <div className="mt-6 grid gap-2 md:grid-cols-2">
            {Q[i].options.map((o, idx) => {
              const correct = picked !== null && idx === Q[i].partner;
              const wrong = picked === idx && idx !== Q[i].partner;
              let cls = "border-border bg-surface hover:border-foreground/30";
              if (correct) cls = "border-neon bg-neon/10";
              else if (wrong) cls = "border-destructive bg-destructive/10";
              return (
                <button key={o} onClick={() => picked === null && lockIn(idx)} disabled={picked !== null}
                  className={`rounded-2xl border p-3 text-left text-sm transition-all ${cls}`}>
                  {o}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background/20 p-3">
      <div className="font-mono text-[10px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 font-display text-xl font-bold">{value}</div>
    </div>
  );
}
