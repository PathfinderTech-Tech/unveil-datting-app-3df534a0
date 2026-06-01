import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { supabase } from "@/integrations/supabase/client";
import {
  computeComposite, deriveArchetype, saveProfile,
  WOULD_YOU_RATHER, RED_FLAGS, GREEN_FLAGS, TWO_TRUTHS_PROMPTS,
  type CharacterDNA, type Profession,
} from "@/lib/synapse-store";
import { Sparkles, Heart, Flag, Brain, Trophy } from "lucide-react";

export const Route = createFileRoute("/game")({
  head: () => ({ meta: [{ title: "Resonance Lounge — UNVEIL" }, { name: "description", content: "Playful mini-games that reveal your dating energy." }] }),
  component: GamePage,
});

type Round = "intro" | "wyr" | "ttl" | "flags" | "emoji" | "scoring";

function GamePage() {
  const navigate = useNavigate();
  const [round, setRound] = useState<Round>("intro");
  const [scores, setScores] = useState({ wyr: 0, ttl: 0, flags: 0, emoji: 0 });

  const total = useMemo(() => {
    const sum = scores.wyr + scores.ttl + scores.flags + scores.emoji;
    return Math.min(99, Math.round(sum / 4));
  }, [scores]);

  const finishRound = (key: keyof typeof scores, val: number) => {
    setScores((s) => ({ ...s, [key]: val }));
    const order: Round[] = ["wyr", "ttl", "flags", "emoji", "scoring"];
    setRound(order[order.indexOf(round as Round) + 1]);
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

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("game_results").insert({
          user_id: user.id,
          logic_score: scores.wyr,
          memory_score: scores.ttl,
          pattern_score: scores.flags,
          emotional_score: scores.emoji,
          total_score: total,
          archetype,
        });
        await supabase.from("profiles").update({
          first_name: draft.name, age: draft.age, city: draft.city,
          archetype, compatibility_score: composite,
          curiosity_level: draft.character.curiosity,
          emotional_rhythm: draft.character as unknown as Record<string, number>,
          game_complete: true,
        }).eq("id", user.id);
      } catch (e) { console.warn("[unveil] db save skipped", e); }
    })();

    const t = setTimeout(() => navigate({ to: "/results" }), 1800);
    return () => clearTimeout(t);
  }, [round, total, navigate, scores]);

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-3xl px-6 py-12">
        {round === "intro" && <Intro onStart={() => setRound("wyr")} />}
        {round === "wyr" && <WouldYouRather onDone={(v) => finishRound("wyr", v)} />}
        {round === "ttl" && <TwoTruths onDone={(v) => finishRound("ttl", v)} />}
        {round === "flags" && <FlagSort onDone={(v) => finishRound("flags", v)} />}
        {round === "emoji" && <EmojiStory onDone={(v) => finishRound("emoji", v)} />}
        {round === "scoring" && <Scoring total={total} />}
      </div>
    </div>
  );
}

const ROUND_CARDS = [
  { n: "01", t: "Would You Rather", icon: Sparkles },
  { n: "02", t: "Two Truths & a Lie", icon: Heart },
  { n: "03", t: "Red Flag / Green Flag", icon: Flag },
  { n: "04", t: "Emoji Story", icon: Brain },
];

function Intro({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-8 text-center">
      <div className="mx-auto flex h-20 w-20 animate-pulse-glow items-center justify-center rounded-2xl bg-gradient-hero">
        <Trophy className="h-10 w-10 text-primary-foreground" />
      </div>
      <h1 className="font-display text-5xl font-bold">Resonance Lounge</h1>
      <p className="mx-auto max-w-md text-muted-foreground">
        Four playful rounds. No right answers, no leaderboard — just a fun way to discover how you date.
      </p>
      <div className="mx-auto grid max-w-md grid-cols-2 gap-3 text-left">
        {ROUND_CARDS.map((x) => {
          const Icon = x.icon;
          return (
            <div key={x.n} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs text-muted-foreground">{x.n}</div>
                <Icon className="h-4 w-4 text-accent" />
              </div>
              <div className="mt-1 font-display font-bold">{x.t}</div>
            </div>
          );
        })}
      </div>
      <button onClick={onStart} className="rounded-full bg-gradient-hero px-8 py-4 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-105">
        Let's play
      </button>
    </div>
  );
}

function RoundShell({ title, n, sub, children }: { title: string; n: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Round {n}</div>
        <h2 className="font-display text-3xl font-bold">{title}</h2>
        {sub && <div className="mt-1 text-sm text-muted-foreground">{sub}</div>}
      </div>
      <div className="rounded-3xl border border-border bg-card p-8">{children}</div>
    </div>
  );
}

function WouldYouRather({ onDone }: { onDone: (v: number) => void }) {
  const [step, setStep] = useState(0);
  const items = WOULD_YOU_RATHER.slice(0, 4);
  const pick = () => {
    if (step >= items.length - 1) onDone(70 + items.length * 5);
    else setStep(step + 1);
  };
  const p = items[step];
  return (
    <RoundShell title="Would you rather…" n="01" sub={`${step + 1} / ${items.length} · go with your gut`}>
      <div className="grid gap-4 md:grid-cols-2">
        {[p.a, p.b].map((c) => (
          <button key={c} onClick={pick}
            className="rounded-3xl border border-border bg-surface p-6 text-left font-display text-lg transition-all hover:border-primary hover:bg-primary/10 hover:shadow-glow">
            {c}
          </button>
        ))}
      </div>
    </RoundShell>
  );
}

function TwoTruths({ onDone }: { onDone: (v: number) => void }) {
  const [statements, setStatements] = useState(["", "", ""]);
  const [lieIdx, setLieIdx] = useState<number | null>(null);
  const ready = statements.every((s) => s.trim().length > 2) && lieIdx !== null;
  const shuffled = useMemo(() => [...TWO_TRUTHS_PROMPTS].sort(() => Math.random() - 0.5).slice(0, 6), []);
  const usePrompt = (i: number, p: string) =>
    setStatements(statements.map((v, j) => (j === i ? p : v)));
  return (
    <RoundShell title="Two truths & a lie" n="02" sub="Write three things about you — then pick which one is the lie.">
      <div className="mb-4 rounded-2xl border border-dashed border-border bg-surface/40 p-3">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Need ideas? Tap a prompt to drop it into a row.</div>
        <div className="flex flex-wrap gap-1.5">
          {shuffled.map((p) => (
            <button key={p} onClick={() => {
              const emptyIdx = statements.findIndex((s) => !s.trim());
              usePrompt(emptyIdx === -1 ? 0 : emptyIdx, p);
            }}
              className="rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground">
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {statements.map((s, i) => (
          <div key={i} className={`rounded-2xl border p-3 transition-colors ${lieIdx === i ? "border-accent bg-accent/10" : "border-border bg-surface"}`}>
            <input
              value={s}
              onChange={(e) => setStatements(statements.map((v, j) => (j === i ? e.target.value : v)))}
              placeholder={`Statement ${i + 1} — e.g. ${shuffled[i] ?? "something true (or not)"}`}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
            <button onClick={() => setLieIdx(i)}
              className={`mt-1 text-[10px] font-mono uppercase tracking-wider ${lieIdx === i ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}>
              {lieIdx === i ? "★ this is the lie" : "mark as the lie"}
            </button>
          </div>
        ))}
        <button disabled={!ready} onClick={() => onDone(75 + (lieIdx ?? 0) * 3)}
          className="mt-2 w-full rounded-full bg-gradient-hero py-3 font-medium text-primary-foreground shadow-glow disabled:opacity-40">
          Lock it in
        </button>
      </div>
    </RoundShell>
  );
}

function FlagSort({ onDone }: { onDone: (v: number) => void }) {
  const deck = useMemo(() => {
    const items = [
      ...RED_FLAGS.slice(0, 3).map((t) => ({ t, kind: "red" as const })),
      ...GREEN_FLAGS.slice(0, 3).map((t) => ({ t, kind: "green" as const })),
    ];
    return items.sort(() => Math.random() - 0.5);
  }, []);
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const next = (guess: "red" | "green") => {
    if (deck[i].kind === guess) setCorrect(correct + 1);
    if (i >= deck.length - 1) onDone(60 + correct * 6);
    else setI(i + 1);
  };
  const card = deck[i];
  return (
    <RoundShell title="Red flag or green?" n="03" sub={`${i + 1} / ${deck.length} · trust your instinct`}>
      <div className="space-y-6 text-center">
        <div className="rounded-3xl border border-border bg-surface p-8 font-display text-xl">
          "{card.t}"
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => next("red")} className="rounded-2xl border border-accent/40 bg-accent/10 py-4 font-display text-lg hover:bg-accent/20">
            🚩 Red flag
          </button>
          <button onClick={() => next("green")} className="rounded-2xl border border-neon/40 bg-neon/10 py-4 font-display text-lg hover:bg-neon/20">
            🌱 Green flag
          </button>
        </div>
      </div>
    </RoundShell>
  );
}

function EmojiStory({ onDone }: { onDone: (v: number) => void }) {
  const palette = ["✨", "🌊", "🔥", "📚", "🎧", "🌙", "🍷", "🗝️", "🛼", "🌶️", "🦋", "🎲"];
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (e: string) => {
    if (picked.includes(e)) setPicked(picked.filter((x) => x !== e));
    else if (picked.length < 5) setPicked([...picked, e]);
  };
  return (
    <RoundShell title="Tell your story in 5 emojis" n="04" sub="Who you are, this week. No words allowed.">
      <div className="mb-6 flex min-h-16 items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface text-4xl">
        {picked.length === 0 ? <span className="text-sm text-muted-foreground">Pick five below…</span> : picked.join(" ")}
      </div>
      <div className="grid grid-cols-6 gap-2">
        {palette.map((e) => (
          <button key={e} onClick={() => toggle(e)}
            className={`aspect-square rounded-xl border text-2xl transition-all ${
              picked.includes(e) ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-foreground/30"
            }`}>
            {e}
          </button>
        ))}
      </div>
      <button disabled={picked.length < 5} onClick={() => onDone(70 + picked.length * 4)}
        className="mt-6 w-full rounded-full bg-gradient-hero py-3 font-medium text-primary-foreground shadow-glow disabled:opacity-40">
        That's me
      </button>
    </RoundShell>
  );
}

function Scoring({ total }: { total: number }) {
  return (
    <div className="space-y-8 text-center">
      <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Reading your signature…</div>
      <div className="mx-auto flex h-48 w-48 animate-pulse-glow items-center justify-center rounded-full bg-gradient-hero">
        <span className="font-display text-6xl font-bold text-primary-foreground">{total}</span>
      </div>
      <p className="text-muted-foreground">Bringing you into the UNVEIL ecosystem…</p>
    </div>
  );
}
