import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { supabase } from "@/integrations/supabase/client";
import {
  computeComposite, deriveArchetype, saveProfile,
  type CharacterDNA, type Profession,
} from "@/lib/synapse-store";
import { Waves, Timer } from "lucide-react";

export const Route = createFileRoute("/game")({
  head: () => ({ meta: [{ title: "The Resonance — UNVEIL" }, { name: "description", content: "A short, playful session that reveals your cognitive rhythm and emotional pacing." }] }),
  component: GamePage,
});

type Round = "intro" | "rhythm" | "memory" | "pattern" | "intuition" | "scoring";

function GamePage() {
  const navigate = useNavigate();
  const [round, setRound] = useState<Round>("intro");
  const [scores, setScores] = useState({ rhythm: 0, memory: 0, pattern: 0, intuition: 0 });

  const total = useMemo(() => {
    const sum = scores.rhythm + scores.memory + scores.pattern + scores.intuition;
    return Math.min(99, Math.round(sum / 4));
  }, [scores]);

  const finishRound = (key: keyof typeof scores, val: number) => {
    setScores((s) => ({ ...s, [key]: val }));
    const order: Round[] = ["rhythm", "memory", "pattern", "intuition", "scoring"];
    const idx = order.indexOf(round as Round);
    setRound(order[idx + 1]);
  };

  useEffect(() => {
    if (round !== "scoring") return;
    const draftRaw = sessionStorage.getItem("unveil-draft");
    if (!draftRaw) return;
    const draft = JSON.parse(draftRaw) as {
      name: string; age: number; city: string; profession: Profession; professionLabel: string;
      faceHarmony: number; character: CharacterDNA;
    };
    const archetype = deriveArchetype(draft.character, total);
    const base = { ...draft, mindScore: total, archetype, avatar: `me-${Math.floor(Math.random() * 360)}` };
    const composite = computeComposite(base);
    saveProfile({ ...base, composite });

    // Persist to UNVEIL Cloud if signed in (best-effort, non-blocking)
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("game_results").insert({
          user_id: user.id,
          logic_score: scores.rhythm,
          memory_score: scores.memory,
          pattern_score: scores.pattern,
          emotional_score: scores.intuition,
          total_score: total,
          archetype,
        });
        await supabase.from("profiles").update({
          first_name: draft.name,
          age: draft.age,
          city: draft.city,
          archetype,
          compatibility_score: composite,
          curiosity_level: draft.character.curiosity,
          emotional_rhythm: draft.character as unknown as Record<string, number>,
          game_complete: true,
        }).eq("id", user.id);
      } catch (e) { console.warn("[unveil] db save skipped", e); }
    })();

    const t = setTimeout(() => navigate({ to: "/results" }), 2200);
    return () => clearTimeout(t);
  }, [round, total, navigate, scores]);

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-3xl px-6 py-12">
        {round === "intro" && <Intro onStart={() => setRound("rhythm")} />}
        {round === "rhythm" && <RhythmRound onDone={(v) => finishRound("rhythm", v)} />}
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
        <Waves className="h-10 w-10 text-primary-foreground" />
      </div>
      <h1 className="font-display text-5xl font-bold">The Resonance</h1>
      <p className="mx-auto max-w-md text-muted-foreground">
        A short, playful session — not a test. We're mapping your cognitive rhythm, curiosity,
        and emotional pacing. There are no right answers and nothing to win.
      </p>
      <div className="mx-auto grid max-w-md grid-cols-2 gap-3 text-left">
        {[
          { n: "01", t: "Rhythm" }, { n: "02", t: "Memory" }, { n: "03", t: "Pattern" }, { n: "04", t: "Intuition" },
        ].map((x) => (
          <div key={x.n} className="rounded-xl border border-border bg-card p-4">
            <div className="font-mono text-xs text-muted-foreground">{x.n}</div>
            <div className="font-display font-bold">{x.t}</div>
          </div>
        ))}
      </div>
      <button onClick={onStart} className="rounded-full bg-gradient-hero px-8 py-4 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105">
        Begin softly
      </button>
    </div>
  );
}

function RoundShell({ title, n, children, time, sub }: { title: string; n: string; children: React.ReactNode; time: number; sub?: string }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Round {n}</div>
          <h2 className="font-display text-3xl font-bold">{title}</h2>
          {sub && <div className="mt-1 text-sm text-muted-foreground">{sub}</div>}
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

// ---- RHYTHM ROUND: complete the flow (was Logic) ----
function RhythmRound({ onDone }: { onDone: (v: number) => void }) {
  const [answered, setAnswered] = useState<number | null>(null);
  const time = useCountdown(15, () => !answered && onDone(60));
  const choices = [24, 30, 32, 18];
  const correct = 32;
  const handle = (v: number) => {
    setAnswered(v);
    const elapsed = 15 - time;
    const accuracy = v === correct ? 1 : 0.55;
    const score = Math.round(accuracy * (88 - elapsed * 1.5) + 25);
    setTimeout(() => onDone(Math.max(40, Math.min(99, score))), 600);
  };
  return (
    <RoundShell title="Feel the flow" n="01" time={time} sub="Which number continues this rhythm naturally?">
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
                    ? isCorrect ? "border-neon bg-neon/20" : "border-accent bg-accent/10"
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

// ---- MEMORY ROUND ----
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
    const score = Math.max(40, Math.min(99, 35 + correct * 12 - wrong * 5));
    setTimeout(() => onDone(score), 600);
  };

  const togglePick = (i: number) => {
    if (phase !== "input") return;
    const n = new Set(picks);
    n.has(i) ? n.delete(i) : n.add(i);
    setPicks(n);
  };

  return (
    <RoundShell
      title={phase === "show" ? "Hold the constellation" : "Where were the lights?"}
      n="02" time={time}
      sub={phase === "show" ? "Just notice. Don't try to memorize." : "Tap what you remember."}
    >
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
          Done
        </button>
      )}
    </RoundShell>
  );
}

// ---- PATTERN ROUND ----
function PatternRound({ onDone }: { onDone: (v: number) => void }) {
  const [answered, setAnswered] = useState<number | null>(null);
  const time = useCountdown(15, () => !answered && onDone(55));
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
    const score = i === correct ? Math.max(55, 95 - elapsed * 2) : 50;
    setTimeout(() => onDone(score), 600);
  };
  return (
    <RoundShell title="Which one hums differently?" n="03" time={time} sub="Trust the part of you that already knows.">
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
                isPicked ? "border-accent" :
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

// ---- INTUITION ROUND ----
function IntuitionRound({ onDone }: { onDone: (v: number) => void }) {
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<string[]>([]);
  const prompts = [
    { q: "First instinct.", a: "Mountain", b: "Ocean" },
    { q: "Tonight.", a: "Read in bed", b: "Wander out" },
    { q: "Conflict.", a: "Talk it through", b: "Sleep on it" },
    { q: "Risk.", a: "Calculate", b: "Leap" },
  ];
  const time = useCountdown(15, () => onDone(60 + picks.length * 6));
  const pick = (choice: string) => {
    const next = [...picks, choice];
    setPicks(next);
    if (step >= prompts.length - 1) onDone(70 + next.length * 4);
    else setStep(step + 1);
  };
  const p = prompts[step];
  return (
    <RoundShell title={p.q} n="04" time={time} sub="Whichever your body reaches for first.">
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
      <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Composing your signature</div>
      <div className="mx-auto flex h-48 w-48 animate-pulse-glow items-center justify-center rounded-full bg-gradient-hero">
        <span className="font-display text-6xl font-bold text-primary-foreground">{total}</span>
      </div>
      <p className="text-muted-foreground">Mapping your rhythm to the UNVEIL ecosystem…</p>
    </div>
  );
}
