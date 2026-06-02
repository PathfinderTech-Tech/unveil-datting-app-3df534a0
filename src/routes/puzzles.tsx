import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { ArrowRight, Brain, Eye, Sparkles, Trophy, Wand2, Puzzle, Hash, Layers } from "lucide-react";
import { savePuzzleScore, loadPuzzleScores, useUserId, awardBadge } from "@/lib/games-api";

export const Route = createFileRoute("/puzzles")({
  head: () => ({
    meta: [
      { title: "Discovery Puzzles — UNVEIL" },
      { name: "description", content: "Playful puzzles that reveal your thinking style — never an IQ score." },
    ],
  }),
  component: Puzzles,
});

const THINKING_STYLES = [
  "Curious Thinker", "Quick Observer", "Pattern Spotter", "Creative Explorer",
  "Deep Solver", "Storyteller", "Adventurer", "Connector",
] as const;

type PuzzleId = "dots" | "spot" | "memory" | "pattern" | "missing" | "logic";
const PUZZLES: { id: PuzzleId; title: string; tagline: string; icon: any; hue: string }[] = [
  { id: "dots",    title: "Connect The Dots",  tagline: "Tap 1 → 9 in sequence.", icon: Hash,    hue: "from-fuchsia-500/30 to-purple-500/10" },
  { id: "spot",    title: "Spot The Difference", tagline: "Find what changed.",   icon: Eye,     hue: "from-rose-500/30 to-amber-500/10" },
  { id: "memory",  title: "Memory Flash",      tagline: "Recall what flashed.",   icon: Brain,   hue: "from-cyan-500/30 to-blue-500/10" },
  { id: "pattern", title: "Pattern Match",     tagline: "What comes next?",       icon: Layers,  hue: "from-emerald-500/30 to-teal-500/10" },
  { id: "missing", title: "Missing Shape",     tagline: "Which one belongs?",     icon: Puzzle,  hue: "from-violet-500/30 to-indigo-500/10" },
  { id: "logic",   title: "Simple Logic",      tagline: "One clue, one answer.",  icon: Wand2,   hue: "from-amber-500/30 to-rose-500/10" },
];

function Puzzles() {
  const uid = useUserId();
  const [active, setActive] = useState<PuzzleId | null>(null);
  const [scores, setScores] = useState<Record<PuzzleId, number>>({
    dots: 0, spot: 0, memory: 0, pattern: 0, missing: 0, logic: 0,
  });

  // Hydrate saved best scores from DB
  useEffect(() => {
    if (!uid) return;
    loadPuzzleScores().then((rows) => {
      setScores((s) => ({ ...s, ...(rows as Record<PuzzleId, number>) }));
    });
  }, [uid]);

  const award = (id: PuzzleId, pts: number) => {
    setScores((s) => {
      const best = Math.max(s[id], pts);
      const next = { ...s, [id]: best };
      // Persist best score
      if (uid) {
        savePuzzleScore(id, best);
        // Award badge once 3+ puzzles played
        const played = Object.values(next).filter((v) => v > 0).length;
        if (played >= 3) awardBadge("deep-thinker");
      }
      const idx = PUZZLES.findIndex((p) => p.id === id);
      setTimeout(() => {
        const upcoming = PUZZLES.slice(idx + 1).find((p) => next[p.id] === 0);
        setActive(upcoming ? upcoming.id : null);
      }, 1400);
      return next;
    });
  };

  const total = Object.values(scores).reduce((a, b) => a + b, 0);

  // Map style from highest-scoring puzzles — playful, not an IQ.
  const style = useMemo(() => {
    if (total === 0) return null;
    const top = (Object.entries(scores) as [PuzzleId, number][]).sort((a, b) => b[1] - a[1])[0][0];
    const map: Record<PuzzleId, typeof THINKING_STYLES[number]> = {
      dots: "Quick Observer", spot: "Pattern Spotter", memory: "Deep Solver",
      pattern: "Pattern Spotter", missing: "Creative Explorer", logic: "Curious Thinker",
    };
    return map[top];
  }, [scores, total]);

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Discovery Puzzles</div>
            <h1 className="mt-2 font-display text-5xl font-light md:text-6xl">
              Play to reveal your <span className="text-gradient-hero italic">thinking style.</span>
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              No IQ score. Just a playful look at how your mind likes to move.
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-card px-5 py-3 text-right">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Thinking style</div>
            <div className="flex items-center gap-2 font-display text-2xl">
              <Trophy className="h-5 w-5 text-accent" /> {style ?? "—"}
            </div>
          </div>
        </div>

        {active === null ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PUZZLES.map((p) => {
              const Icon = p.icon;
              return (
                <button key={p.id} onClick={() => setActive(p.id)}
                  className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 text-left transition-all hover:border-primary/50 hover:shadow-glow">
                  <div className={`absolute inset-0 bg-gradient-to-br ${p.hue} opacity-50`} />
                  <div className="relative">
                    <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-aura text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-2xl font-light">{p.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {scores[p.id] > 0 ? `Best ${scores[p.id]}` : "Unplayed"}
                      </span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div>
            <button onClick={() => setActive(null)}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-2 text-xs hover:bg-surface">
              ← Back to puzzles
            </button>
            {active === "dots"    && <DotsPuzzle onScore={(p) => award("dots", p)} />}
            {active === "spot"    && <SpotPuzzle onScore={(p) => award("spot", p)} />}
            {active === "memory"  && <MemoryFlash onScore={(p) => award("memory", p)} />}
            {active === "pattern" && <PatternPuzzle onScore={(p) => award("pattern", p)} />}
            {active === "missing" && <MissingShape onScore={(p) => award("missing", p)} />}
            {active === "logic"   && <LogicPuzzle onScore={(p) => award("logic", p)} />}
          </div>
        )}
      </div>
    </div>
  );
}

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-3xl font-light">{title}</h2>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </div>
      <div className="rounded-3xl border border-border bg-card p-7">{children}</div>
    </div>
  );
}

function Done({ pts, msg }: { pts: number; msg: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-neon/40 bg-neon/5 p-5 text-center">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Thinking points</div>
      <div className="mt-1 font-display text-4xl font-bold">+{pts}</div>
      <div className="mt-2 text-sm text-muted-foreground">{msg}</div>
    </div>
  );
}

/* 1. Connect the Dots — tap 1..9 in sequence */
function DotsPuzzle({ onScore }: { onScore: (n: number) => void }) {
  const positions = useMemo(() => {
    const order = [1,2,3,4,5,6,7,8,9];
    return order.map((n) => ({ n, x: 10 + Math.random() * 80, y: 10 + Math.random() * 80 }));
  }, []);
  const [next, setNext] = useState(1);
  const [done, setDone] = useState(false);
  useEffect(() => { if (done) onScore(40); }, [done]); // eslint-disable-line

  return (
    <Shell title="Connect The Dots" sub={`Tap ${next} next.`}>
      <div className="relative h-80 w-full overflow-hidden rounded-2xl border border-border bg-surface">
        {positions.map((p) => {
          const reached = p.n < next;
          return (
            <button key={p.n}
              disabled={p.n !== next}
              onClick={() => {
                if (p.n === next) {
                  if (next === 9) setDone(true);
                  setNext((v) => v + 1);
                }
              }}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border font-display text-sm transition-all
                ${reached ? "h-8 w-8 border-neon/60 bg-neon/20 text-foreground" :
                 p.n === next ? "h-10 w-10 border-primary bg-primary/20 text-foreground shadow-glow animate-pulse" :
                 "h-8 w-8 border-border bg-card text-muted-foreground"}`}>
              {p.n}
            </button>
          );
        })}
      </div>
      {done && <Done pts={40} msg="Quick eye, quick hand." />}
    </Shell>
  );
}

/* 2. Spot the Difference — grid of dots, one is different */
function SpotPuzzle({ onScore }: { onScore: (n: number) => void }) {
  const round = useMemo(() => {
    const odd = Math.floor(Math.random() * 16);
    return { odd };
  }, []);
  const [picked, setPicked] = useState<number | null>(null);
  const correct = picked === round.odd;
  useEffect(() => { if (picked !== null && correct) onScore(30); }, [picked]); // eslint-disable-line

  return (
    <Shell title="Spot The Difference" sub="One tile is a different shade. Find it.">
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 16 }).map((_, i) => {
          const isOdd = i === round.odd;
          return (
            <button key={i} onClick={() => setPicked(i)}
              className={`aspect-square rounded-2xl border transition-all
                ${picked === i ? (isOdd ? "border-neon/60" : "border-accent") : "border-border"}`}
              style={{
                background: isOdd ? "oklch(0.55 0.18 295)" : "oklch(0.55 0.22 295)",
              }}
            />
          );
        })}
      </div>
      {picked !== null && (
        correct
          ? <Done pts={30} msg="Sharp eye." />
          : <div className="mt-5 rounded-2xl border border-accent/40 bg-accent/5 p-4 text-center text-sm">
              Not quite — keep looking.
              <button onClick={() => setPicked(null)} className="ml-2 underline">try again</button>
            </div>
      )}
    </Shell>
  );
}

/* 3. Memory Flash — show a sequence, repeat it */
function MemoryFlash({ onScore }: { onScore: (n: number) => void }) {
  const items = ["🌊","🔥","🌙","✨","🎧","🍷"];
  const seq = useMemo(() => Array.from({ length: 5 }, () => items[Math.floor(Math.random() * items.length)]), []);
  const [phase, setPhase] = useState<"show" | "input" | "done">("show");
  const [step, setStep] = useState(0);
  const [you, setYou] = useState<string[]>([]);
  useEffect(() => {
    if (phase !== "show") return;
    if (step >= seq.length) { setTimeout(() => setPhase("input"), 500); return; }
    const t = setTimeout(() => setStep(step + 1), 700);
    return () => clearTimeout(t);
  }, [step, phase, seq.length]);
  const correct = phase === "done" && you.every((v, i) => v === seq[i]);
  useEffect(() => { if (phase === "done" && correct) onScore(45); }, [phase]); // eslint-disable-line

  return (
    <Shell title="Memory Flash" sub={phase === "show" ? "Watch carefully." : phase === "input" ? "Tap the sequence." : "Round over."}>
      {phase === "show" && (
        <div className="flex h-48 items-center justify-center text-7xl">{seq[step] ?? "✨"}</div>
      )}
      {phase === "input" && (
        <div className="space-y-4">
          <div className="flex justify-center gap-2 text-3xl">
            {seq.map((_, i) => <div key={i} className={`flex h-12 w-12 items-center justify-center rounded-xl border ${you[i] ? "border-primary bg-primary/10" : "border-border bg-surface"}`}>{you[i] ?? ""}</div>)}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {items.map((e) => (
              <button key={e} onClick={() => {
                const n = [...you, e];
                setYou(n);
                if (n.length === seq.length) setPhase("done");
              }} className="rounded-2xl border border-border bg-surface px-4 py-3 text-2xl hover:border-primary">{e}</button>
            ))}
          </div>
        </div>
      )}
      {phase === "done" && (correct
        ? <Done pts={45} msg="That's a strong working memory." />
        : <div className="mt-5 rounded-2xl border border-accent/40 bg-accent/5 p-4 text-center text-sm">Close! Sequence was {seq.join(" ")}.</div>
      )}
    </Shell>
  );
}

/* 4. Pattern Match — pick the next shape */
function PatternPuzzle({ onScore }: { onScore: (n: number) => void }) {
  const round = useMemo(() => {
    const shapes = ["▲","●","■","◆"];
    const seq = [shapes[0], shapes[1], shapes[0], shapes[1], shapes[0]];
    return { seq, answer: shapes[1], choices: [...shapes].sort(() => Math.random() - 0.5) };
  }, []);
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === round.answer;
  useEffect(() => { if (picked && correct) onScore(35); }, [picked]); // eslint-disable-line

  return (
    <Shell title="Pattern Match" sub="What comes next?">
      <div className="flex items-center justify-center gap-3 text-4xl">
        {round.seq.map((s, i) => <span key={i}>{s}</span>)}
        <span className="text-muted-foreground">?</span>
      </div>
      <div className="mt-6 grid grid-cols-4 gap-2">
        {round.choices.map((c) => (
          <button key={c} onClick={() => setPicked(c)}
            className={`aspect-square rounded-2xl border text-3xl transition-all
              ${picked === c ? (correct ? "border-neon/60 bg-neon/10" : "border-accent bg-accent/10") : "border-border bg-surface hover:border-primary"}`}>
            {c}
          </button>
        ))}
      </div>
      {picked && (correct
        ? <Done pts={35} msg="You see the rhythm." />
        : <div className="mt-5 rounded-2xl border border-accent/40 bg-accent/5 p-4 text-center text-sm">Not that one. <button onClick={() => setPicked(null)} className="underline">try again</button></div>
      )}
    </Shell>
  );
}

/* 5. Missing Shape — odd one in / belongs to set */
function MissingShape({ onScore }: { onScore: (n: number) => void }) {
  const round = useMemo(() => {
    const sets = [
      { row: ["🔺","🔺","🔺","?"], choices: ["🔺","🟦","⚫","🟢"], answer: "🔺" },
      { row: ["🌑","🌒","🌓","?"], choices: ["🌖","🌔","🌑","🌒"], answer: "🌔" },
      { row: ["1","4","9","?"], choices: ["12","16","18","20"], answer: "16" },
    ];
    return sets[Math.floor(Math.random() * sets.length)];
  }, []);
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === round.answer;
  useEffect(() => { if (picked && correct) onScore(40); }, [picked]); // eslint-disable-line

  return (
    <Shell title="Missing Shape" sub="Pick the one that belongs.">
      <div className="flex items-center justify-center gap-3 font-display text-3xl">
        {round.row.map((r, i) => <span key={i} className={r === "?" ? "text-muted-foreground" : ""}>{r}</span>)}
      </div>
      <div className="mt-6 grid grid-cols-4 gap-2">
        {round.choices.map((c) => (
          <button key={c} onClick={() => setPicked(c)}
            className={`aspect-square rounded-2xl border font-display text-2xl transition-all
              ${picked === c ? (correct ? "border-neon/60 bg-neon/10" : "border-accent bg-accent/10") : "border-border bg-surface hover:border-primary"}`}>
            {c}
          </button>
        ))}
      </div>
      {picked && (correct
        ? <Done pts={40} msg="Pattern complete." />
        : <div className="mt-5 rounded-2xl border border-accent/40 bg-accent/5 p-4 text-center text-sm">Try another. <button onClick={() => setPicked(null)} className="underline">reset</button></div>
      )}
    </Shell>
  );
}

/* 6. Simple Logic */
function LogicPuzzle({ onScore }: { onScore: (n: number) => void }) {
  const rounds = useMemo(() => [
    { q: "All cats are mammals. Mochi is a cat. Mochi is a…", choices: ["Mammal","Bird","Fish","Reptile"], answer: "Mammal" },
    { q: "If Monday is in two days, today is…", choices: ["Saturday","Sunday","Friday","Tuesday"], answer: "Saturday" },
    { q: "What number completes: 2, 6, 12, 20, ___?", choices: ["28","30","26","32"], answer: "30" },
  ], []);
  const r = rounds[Math.floor(Math.random() * rounds.length)];
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === r.answer;
  useEffect(() => { if (picked && correct) onScore(35); }, [picked]); // eslint-disable-line

  return (
    <Shell title="Simple Logic" sub="One clue, one answer.">
      <div className="font-display text-xl">{r.q}</div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {r.choices.map((c) => (
          <button key={c} onClick={() => setPicked(c)}
            className={`rounded-2xl border p-4 text-left font-display transition-all
              ${picked === c ? (correct ? "border-neon/60 bg-neon/10" : "border-accent bg-accent/10") : "border-border bg-surface hover:border-primary"}`}>
            {c}
          </button>
        ))}
      </div>
      {picked && (correct
        ? <Done pts={35} msg="Clean reasoning." />
        : <div className="mt-5 rounded-2xl border border-accent/40 bg-accent/5 p-4 text-center text-sm">Not quite. <button onClick={() => setPicked(null)} className="underline">try again</button></div>
      )}
    </Shell>
  );
}
