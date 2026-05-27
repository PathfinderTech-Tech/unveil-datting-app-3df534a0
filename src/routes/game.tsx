import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SynapseNav } from "@/components/SynapseNav";
import { computeComposite, saveProfile, type CharacterDNA, type Profession } from "@/lib/synapse-store";
import { Brain, Timer } from "lucide-react";

export const Route = createFileRoute("/game")({
  head: () => ({ meta: [{ title: "Mind Game — SYNAPSE" }, { name: "description", content: "60-second cognitive assessment." }] }),
  component: GamePage,
});

type Round = "intro" | "logic" | "memory" | "pattern" | "intuition" | "scoring";

function GamePage() {
  const navigate = useNavigate();
  const [round, setRound] = useState<Round>("intro");
  const [scores, setScores] = useState({ logic: 0, memory: 0, pattern: 0, intuition: 0 });

  const total = useMemo(() => {
    const sum = scores.logic + scores.memory + scores.pattern + scores.intuition;
    return Math.min(99, Math.round(sum / 4));
  }, [scores]);

  const finishRound = (key: keyof typeof scores, val: number) => {
    setScores((s) => ({ ...s, [key]: val }));
    const order: Round[] = ["logic", "memory", "pattern", "intuition", "scoring"];
    const idx = order.indexOf(round as Round);
    setRound(order[idx + 1]);
  };

  useEffect(() => {
    if (round !== "scoring") return;
    // assemble profile and save
    const draftRaw = sessionStorage.getItem("synapse-draft");
    if (!draftRaw) return;
    const draft = JSON.parse(draftRaw) as {
      name: string; age: number; city: string; profession: Profession; professionLabel: string;
      faceHarmony: number; character: CharacterDNA;
    };
    const base = { ...draft, mindScore: total, avatar: `me-${Math.floor(Math.random() * 360)}` };
    const composite = computeComposite(base);
    saveProfile({ ...base, composite });
    const t = setTimeout(() => navigate({ to: "/results" }), 2200);
    return () => clearTimeout(t);
  }, [round, total, navigate]);

  return (
    <div className="min-h-screen">
      <SynapseNav />
      <div className="mx-auto max-w-3xl px-6 py-12">
        {round === "intro" && <Intro onStart={() => setRound("logic")} />}
        {round === "logic" && <LogicRound onDone={(v) => finishRound("logic", v)} />}
        {round === "memory" && <MemoryRound onDone={(v) => finishRound("memory", v)} />}
        {round === "pattern" && <PatternRound onDone={(v) => finishRound("pattern", v)} />}
        {round === "intuition" && <IntuitionRound onDone={(v) => finishRound("intuition", v)} />}
        {round === "scoring" && <Scoring total={total} />}
      </div>
    </div>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-8 text-center">
      <div className="mx-auto flex h-20 w-20 animate-pulse-glow items-center justify-center rounded-2xl bg-gradient-hero">
        <Brain className="h-10 w-10 text-primary-foreground" />
      </div>
      <h1 className="font-display text-5xl font-bold">The Mind Game</h1>
      <p className="mx-auto max-w-md text-muted-foreground">
        Four rounds. ~15 seconds each. There are no right answers — only your true cognitive fingerprint.
      </p>
      <div className="mx-auto grid max-w-md grid-cols-2 gap-3 text-left">
        {[
          { n: "01", t: "Logic" }, { n: "02", t: "Memory" }, { n: "03", t: "Pattern" }, { n: "04", t: "Intuition" },
        ].map((x) => (
          <div key={x.n} className="rounded-xl border border-border bg-card p-4">
            <div className="font-mono text-xs text-muted-foreground">{x.n}</div>
            <div className="font-display font-bold">{x.t}</div>
          </div>
        ))}
      </div>
      <button onClick={onStart} className="rounded-full bg-gradient-hero px-8 py-4 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105">
        Begin
      </button>
    </div>
  );
}

function RoundShell({ title, n, children, time }: { title: string; n: string; children: React.ReactNode; time: number }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Round {n}</div>
          <h2 className="font-display text-3xl font-bold">{title}</h2>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 font-mono text-sm">
          <Timer className="h-4 w-4 text-accent" />
          {time}s
        </div>
      </div>
      <div className="rounded-3xl border border-border bg-card p-8">{children}</div>
    </div>
  );
}

function useCountdown(start: number, onZero: () => void) {
  const [t, setT] = useState(start);
  useEffect(() => {
    if (t <= 0) { onZero(); return; }
    const id = setTimeout(() => setT(t - 1), 1000);
    return () => clearTimeout(id);
  }, [t, onZero]);
  return t;
}

// ---- LOGIC ROUND: sequence completion ----
function LogicRound({ onDone }: { onDone: (v: number) => void }) {
  // sequence: 2, 4, 8, 16, ? -> 32 ; alternatives: 24, 30, 32, 18
  const [answered, setAnswered] = useState<number | null>(null);
  const time = useCountdown(15, () => !answered && onDone(40));
  const choices = [24, 30, 32, 18];
  const correct = 32;
  const handle = (v: number) => {
    setAnswered(v);
    const elapsed = 15 - time;
    const accuracy = v === correct ? 1 : 0;
    const score = Math.round(accuracy * (90 - elapsed * 2) + 20);
    setTimeout(() => onDone(Math.max(20, Math.min(99, score))), 600);
  };
  return (
    <RoundShell title="Complete the sequence" n="01" time={time}>
      <div className="mb-8 flex items-center justify-center gap-4 font-mono text-4xl">
        {[2, 4, 8, 16].map((n) => (
          <span key={n} className="rounded-xl bg-surface-2 px-5 py-3">{n}</span>
        ))}
        <span className="rounded-xl border-2 border-dashed border-primary px-5 py-3 text-primary">?</span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {choices.map((c) => {
          const isPicked = answered === c;
          const isCorrect = c === correct;
          return (
            <button
              key={c}
              disabled={answered !== null}
              onClick={() => handle(c)}
              className={`rounded-xl border p-4 font-display text-xl font-bold transition-all ${
                answered === null
                  ? "border-border bg-surface hover:border-primary"
                  : isPicked
                    ? isCorrect ? "border-neon bg-neon/20" : "border-destructive bg-destructive/20"
                    : isCorrect ? "border-neon/50 bg-neon/10" : "border-border bg-surface opacity-50"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
    </RoundShell>
  );
}

// ---- MEMORY ROUND: remember the dots ----
function MemoryRound({ onDone }: { onDone: (v: number) => void }) {
  const [phase, setPhase] = useState<"show" | "input" | "done">("show");
  const target = useMemo(() => {
    const set = new Set<number>();
    while (set.size < 5) set.add(Math.floor(Math.random() * 16));
    return set;
  }, []);
  const [picks, setPicks] = useState<Set<number>>(new Set());
  const time = useCountdown(phase === "show" ? 4 : 15, () => {
    if (phase === "show") setPhase("input");
    else if (phase === "input") submit();
  });

  const submit = () => {
    if (phase !== "input") return;
    setPhase("done");
    const correct = [...picks].filter((p) => target.has(p)).length;
    const wrong = [...picks].filter((p) => !target.has(p)).length;
    const score = Math.max(20, Math.min(99, 20 + correct * 14 - wrong * 8));
    setTimeout(() => onDone(score), 600);
  };

  const togglePick = (i: number) => {
    if (phase !== "input") return;
    const n = new Set(picks);
    n.has(i) ? n.delete(i) : n.add(i);
    setPicks(n);
  };

  return (
    <RoundShell title={phase === "show" ? "Memorize the dots" : "Tap what you saw"} n="02" time={time}>
      <div className="mx-auto grid w-fit grid-cols-4 gap-3">
        {Array.from({ length: 16 }).map((_, i) => {
          const lit = phase === "show" && target.has(i);
          const picked = picks.has(i);
          return (
            <button
              key={i}
              onClick={() => togglePick(i)}
              className={`h-16 w-16 rounded-xl border transition-all ${
                lit ? "border-neon bg-neon shadow-glow-cyan"
                  : picked ? "border-primary bg-primary/40"
                  : "border-border bg-surface-2 hover:border-foreground/30"
              }`}
            />
          );
        })}
      </div>
      {phase === "input" && (
        <button onClick={submit} className="mx-auto mt-6 block rounded-full bg-foreground px-6 py-2 text-sm font-medium text-background">
          Submit
        </button>
      )}
    </RoundShell>
  );
}

// ---- PATTERN ROUND: odd one out ----
function PatternRound({ onDone }: { onDone: (v: number) => void }) {
  const [answered, setAnswered] = useState<number | null>(null);
  const time = useCountdown(15, () => !answered && onDone(40));
  // Three same-color rotated, one different
  const correct = 2;
  const tiles = [
    { rot: 0, color: "var(--cyan)" },
    { rot: 90, color: "var(--cyan)" },
    { rot: 45, color: "var(--magenta)" },
    { rot: 180, color: "var(--cyan)" },
  ];
  const handle = (i: number) => {
    setAnswered(i);
    const elapsed = 15 - time;
    const score = i === correct ? Math.max(40, 95 - elapsed * 2) : 35;
    setTimeout(() => onDone(score), 600);
  };
  return (
    <RoundShell title="Spot the odd one" n="03" time={time}>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tiles.map((t, i) => {
          const isPicked = answered === i;
          const isCorrect = i === correct;
          return (
            <button
              key={i}
              disabled={answered !== null}
              onClick={() => handle(i)}
              className={`flex aspect-square items-center justify-center rounded-2xl border transition-all ${
                answered === null ? "border-border bg-surface hover:border-primary" :
                isPicked && isCorrect ? "border-neon" :
                isPicked ? "border-destructive" :
                isCorrect ? "border-neon/50" : "border-border opacity-50"
              }`}
            >
              <div
                className="h-16 w-16 rounded-lg"
                style={{ background: t.color, transform: `rotate(${t.rot}deg)`, clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" }}
              />
            </button>
          );
        })}
      </div>
    </RoundShell>
  );
}

// ---- INTUITION ROUND: snap decision ----
function IntuitionRound({ onDone }: { onDone: (v: number) => void }) {
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const prompts = [
    { q: "First instinct.", a: "Mountain", b: "Ocean" },
    { q: "Tonight.", a: "Read in bed", b: "Wander out" },
    { q: "Conflict.", a: "Talk it through", b: "Sleep on it" },
    { q: "Risk.", a: "Calculate", b: "Leap" },
  ];
  const time = useCountdown(15, () => onDone(50 + picks.length * 8));
  const pick = (choice: string) => {
    const next = [...picks, choice];
    setPicks(next);
    if (step >= prompts.length - 1) onDone(60 + next.length * 8);
    else setStep(step + 1);
  };
  const p = prompts[step];
  return (
    <RoundShell title={p.q} n="04" time={time}>
      <div className="grid gap-4 md:grid-cols-2">
        {[p.a, p.b].map((choice) => (
          <button
            key={choice}
            onClick={() => pick(choice)}
            className="aspect-square rounded-3xl border border-border bg-surface font-display text-3xl font-bold transition-all hover:border-primary hover:bg-primary/10 hover:shadow-glow"
          >
            {choice}
          </button>
        ))}
      </div>
      <div className="mt-4 text-center font-mono text-xs text-muted-foreground">
        {step + 1} / {prompts.length}
      </div>
    </RoundShell>
  );
}

function Scoring({ total }: { total: number }) {
  return (
    <div className="space-y-8 text-center">
      <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Computing your Mind Score</div>
      <div className="mx-auto flex h-48 w-48 animate-pulse-glow items-center justify-center rounded-full bg-gradient-hero">
        <span className="font-display text-6xl font-bold text-primary-foreground">{total}</span>
      </div>
      <p className="text-muted-foreground">Calibrating against the SYNAPSE pool…</p>
    </div>
  );
}
