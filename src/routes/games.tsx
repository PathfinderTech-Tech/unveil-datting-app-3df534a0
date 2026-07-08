import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import {
  WOULD_YOU_RATHER, RED_FLAGS, GREEN_FLAGS, TWO_TRUTHS_PROMPTS, DESERT_ISLAND,
} from "@/lib/synapse-store";
import { Sparkles, Flag, HeartHandshake, Palmtree, Brain, Trophy, ArrowRight, Heart, Compass, Globe } from "lucide-react";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "Games — UNVEIL" },
      { name: "description", content: "Playful mini-games that reveal chemistry before you meet." },
    ],
  }),
  component: GamesGallery,
});

type GameId = "wyr" | "flags" | "ttl" | "island" | "memory";
const GAMES: { id: GameId; title: string; tagline: string; icon: any; hue: string }[] = [
  { id: "memory", title: "Solo Memory Match", tagline: "Earn chemistry points.", icon: Brain, hue: "from-violet-500/30 to-indigo-500/10" },
  { id: "wyr", title: "Would You Rather", tagline: "Rapid-fire taste check.", icon: Sparkles, hue: "from-fuchsia-500/30 to-purple-500/10" },
  { id: "flags", title: "Red Flag / Green Flag", tagline: "Spot the vibe in five seconds.", icon: Flag, hue: "from-rose-500/30 to-amber-500/10" },
  { id: "ttl", title: "Two Truths & a Lie", tagline: "Classic. Always works.", icon: HeartHandshake, hue: "from-cyan-500/30 to-blue-500/10" },
  { id: "island", title: "Desert Island", tagline: "5 items. 1 luxury. 1 person.", icon: Palmtree, hue: "from-emerald-500/30 to-teal-500/10" },
];

const FEATURED_GAMES: {
  to: string; title: string; tagline: string; icon: any; hue: string; badge?: string;
}[] = [
  {
    to: "/love-tiles",
    title: "UNVEIL Love Tiles",
    tagline: "Piece by piece, love comes into focus.",
    icon: Heart,
    hue: "from-pink-500/40 to-fuchsia-500/10",
    badge: "NEW",
  },
  {
    to: "/challenges/free-your-mind-heart",
    title: "Free Your Mind & Heart",
    tagline: "Guide the mind and the heart to freedom.",
    icon: Compass,
    hue: "from-indigo-500/40 to-purple-500/10",
    badge: "LIVE",
  },
];

function GamesGallery() {
  const [active, setActive] = useState<GameId | null>(null);
  const [chemistry, setChemistry] = useState<Record<GameId, number>>({
    wyr: 0, flags: 0, ttl: 0, island: 0, memory: 0,
  });
  const award = (id: GameId, pts: number) =>
    setChemistry((c) => ({ ...c, [id]: Math.max(c[id], pts) }));
  const total = Object.values(chemistry).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8 flex items-end justify-between gap-6">
          <div>
            
            <h1 className="mt-2 font-display text-5xl font-light md:text-6xl">
              Play <span className="text-gradient-hero italic">first.</span>
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Five lightweight games that surface chemistry — not IQ. Each round earns chemistry points toward your Passport.
            </p>
          </div>
          <div className="hidden rounded-3xl border border-border bg-card px-5 py-3 text-right md:block">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Chemistry</div>
            <div className="flex items-center gap-2 font-display text-3xl font-bold">
              <Trophy className="h-5 w-5 text-accent" /> {total}
            </div>
          </div>
        </div>

        {active === null ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURED_GAMES.map((g) => {
              const Icon = g.icon;
              return (
                <Link
                  key={g.to}
                  to={g.to}
                  className="group relative overflow-hidden rounded-3xl border border-pink-300/40 bg-card p-6 text-left transition-all hover:-translate-y-0.5 hover:border-pink-300/70 hover:shadow-glow"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${g.hue} opacity-70`} />
                  <div className="relative">
                    <div className="mb-5 flex items-center justify-between">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-aura text-primary-foreground">
                        <Icon className="h-5 w-5" />
                      </div>
                      {g.badge && (
                        <span className="rounded-full bg-gradient-hero px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-primary-foreground">
                          {g.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-2xl font-light">{g.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{g.tagline}</p>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-primary">Play now</span>
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
            {GAMES.map((g) => {

              const Icon = g.icon;
              const earned = chemistry[g.id];
              return (
                <button key={g.id} onClick={() => setActive(g.id)}
                  className={`group relative overflow-hidden rounded-3xl border border-border bg-card p-6 text-left transition-all hover:border-primary/50 hover:shadow-glow`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${g.hue} opacity-50`} />
                  <div className="relative">
                    <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-aura text-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-2xl font-light">{g.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{g.tagline}</p>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {earned > 0 ? `${earned} pts earned` : "Unplayed"}
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
              ← Back to games
            </button>
            {active === "wyr" && <WYRGame onScore={(pts) => award("wyr", pts)} />}
            {active === "flags" && <FlagsGame onScore={(pts) => award("flags", pts)} />}
            {active === "ttl" && <TTLGame onScore={(pts) => award("ttl", pts)} />}
            {active === "island" && <IslandGame onScore={(pts) => award("island", pts)} />}
            {active === "memory" && <MemoryGame onScore={(pts) => award("memory", pts)} />}
          </div>
        )}
      </div>
    </div>
  );
}

function GameShell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
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

function Result({ pts, msg }: { pts: number; msg: string }) {
  return (
    <div className="mt-5 rounded-2xl border border-neon/40 bg-neon/5 p-5 text-center animate-fade-in">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Chemistry earned</div>
      <div className="mt-1 font-display text-4xl font-bold text-foreground">+{pts}</div>
      <div className="mt-2 text-sm text-muted-foreground">{msg}</div>
    </div>
  );
}

/* ---------- 1. Would You Rather Battle ---------- */
function WYRGame({ onScore }: { onScore: (n: number) => void }) {
  const items = WOULD_YOU_RATHER;
  const [i, setI] = useState(0);
  const [you, setYou] = useState<("a" | "b")[]>([]);
  const them = useMemo(() => items.map(() => (Math.random() > 0.5 ? "a" : "b") as "a" | "b"), [items]);

  const done = you.length >= items.length;
  const agree = done ? you.filter((v, idx) => v === them[idx]).length : 0;
  const pts = agree * 8;
  useEffect(() => { if (done) onScore(pts); }, [done]); // eslint-disable-line

  if (done) {
    return (
      <GameShell title="Would You Rather — Battle" sub="How aligned were you?">
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={idx} className={`rounded-2xl border p-3 text-sm ${you[idx] === them[idx] ? "border-neon/40 bg-neon/5" : "border-border bg-surface"}`}>
              <div className="text-xs text-muted-foreground">{you[idx] === them[idx] ? "🟢 Same answer" : "🟡 Different"}</div>
              <div className="mt-1">You: <em>{you[idx] === "a" ? it.a : it.b}</em></div>
              <div>Them: <em>{them[idx] === "a" ? it.a : it.b}</em></div>
            </div>
          ))}
        </div>
        <Result pts={pts} msg={`You agreed on ${agree} of ${items.length}.`} />
      </GameShell>
    );
  }

  const p = items[i];
  return (
    <GameShell title="Would You Rather — Battle" sub={`Round ${i + 1} of ${items.length} · trust your gut`}>
      <div className="grid gap-4 md:grid-cols-2">
        {(["a", "b"] as const).map((opt) => (
          <button key={opt} onClick={() => { setYou([...you, opt]); setI(i + 1); }}
            className="rounded-3xl border border-border bg-surface p-6 text-left font-display text-lg transition-all hover:border-primary hover:bg-primary/10 hover:shadow-glow">
            {opt === "a" ? p.a : p.b}
          </button>
        ))}
      </div>
    </GameShell>
  );
}

/* ---------- 2. Red Flag / Green Flag ---------- */
function FlagsGame({ onScore }: { onScore: (n: number) => void }) {
  const deck = useMemo(() => {
    const d = [
      ...RED_FLAGS.map((t) => ({ t, kind: "red" as const })),
      ...GREEN_FLAGS.map((t) => ({ t, kind: "green" as const })),
    ];
    return d.sort(() => Math.random() - 0.5);
  }, []);
  const [i, setI] = useState(0);
  const [correct, setCorrect] = useState(0);
  const done = i >= deck.length;
  const pts = correct * 6;
  useEffect(() => { if (done) onScore(pts); }, [done]); // eslint-disable-line

  if (done) {
    return (
      <GameShell title="Red Flag / Green Flag" sub="Instinct check.">
        <div className="text-center font-display text-3xl">{correct} / {deck.length} read correctly</div>
        <Result pts={pts} msg="Your flag radar is calibrated." />
      </GameShell>
    );
  }
  const c = deck[i];
  const guess = (g: "red" | "green") => {
    if (g === c.kind) setCorrect(correct + 1);
    setI(i + 1);
  };
  return (
    <GameShell title="Red Flag / Green Flag" sub={`${i + 1} / ${deck.length} · go with your gut`}>
      <div className="space-y-5 text-center">
        <div className="rounded-3xl border border-border bg-surface p-8 font-display text-xl">"{c.t}"</div>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => guess("red")} className="rounded-2xl border border-accent/40 bg-accent/10 py-4 font-display hover:bg-accent/20">🚩 Red flag</button>
          <button onClick={() => guess("green")} className="rounded-2xl border border-neon/40 bg-neon/10 py-4 font-display hover:bg-neon/20">🌱 Green flag</button>
        </div>
      </div>
    </GameShell>
  );
}

/* ---------- 3. Two Truths & a Lie ---------- */
function TTLGame({ onScore }: { onScore: (n: number) => void }) {
  const [statements, setStatements] = useState(["", "", ""]);
  const [lie, setLie] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const ready = statements.every((s) => s.trim().length > 2) && lie !== null;
  const prompts = useMemo(() => [...TWO_TRUTHS_PROMPTS].sort(() => Math.random() - 0.5).slice(0, 6), []);

  if (submitted) {
    const pts = 30;
    return (
      <GameShell title="Two Truths & a Lie" sub="Sent to your match.">
        <div className="space-y-2">
          {statements.map((s, i) => (
            <div key={i} className={`rounded-2xl border p-3 text-sm ${lie === i ? "border-accent bg-accent/10" : "border-border bg-surface"}`}>
              {s} {lie === i && <span className="ml-2 text-[10px] font-mono uppercase text-accent">the lie</span>}
            </div>
          ))}
        </div>
        <Result pts={pts} msg="They'll guess which one's the lie. Chemistry locked in." />
      </GameShell>
    );
  }

  return (
    <GameShell title="Two Truths & a Lie" sub="Write three things about you. Mark which one is the lie.">
      <div className="mb-4 rounded-2xl border border-dashed border-border bg-surface/40 p-3">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Stuck? Tap a prompt:</div>
        <div className="flex flex-wrap gap-1.5">
          {prompts.map((p) => (
            <button key={p} onClick={() => {
              const empty = statements.findIndex((s) => !s.trim());
              const idx = empty === -1 ? 0 : empty;
              setStatements(statements.map((v, j) => (j === idx ? p : v)));
            }}
              className="rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-foreground">{p}</button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {statements.map((s, i) => (
          <div key={i} className={`rounded-2xl border p-3 ${lie === i ? "border-accent bg-accent/10" : "border-border bg-surface"}`}>
            <input value={s} onChange={(e) => setStatements(statements.map((v, j) => (j === i ? e.target.value : v)))}
              placeholder={`Statement ${i + 1} — e.g. ${prompts[i] ?? ""}`}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/50" />
            <button onClick={() => setLie(i)}
              className={`mt-1 text-[10px] font-mono uppercase tracking-wider ${lie === i ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}>
              {lie === i ? "★ this is the lie" : "mark as the lie"}
            </button>
          </div>
        ))}
        <button disabled={!ready} onClick={() => setSubmitted(true)}
          className="mt-2 w-full rounded-full bg-gradient-hero py-3 font-medium text-primary-foreground shadow-glow disabled:opacity-40">
          Send to match
        </button>
      </div>
    </GameShell>
  );
}

/* ---------- 4. Desert Island Challenge ---------- */
function IslandGame({ onScore }: { onScore: (n: number) => void }) {
  const [items, setItems] = useState<string[]>([]);
  const [luxury, setLuxury] = useState<string | null>(null);
  const [person, setPerson] = useState<string | null>(null);
  const done = items.length === 5 && luxury && person;
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => { if (submitted) onScore(35); }, [submitted]); // eslint-disable-line

  const toggle = (it: string) => {
    if (items.includes(it)) setItems(items.filter((x) => x !== it));
    else if (items.length < 5) setItems([...items, it]);
  };

  if (submitted) {
    return (
      <GameShell title="Desert Island" sub="Your survival kit, locked in.">
        <div className="space-y-3 text-sm">
          <div><span className="text-muted-foreground">Items: </span>{items.join(", ")}</div>
          <div><span className="text-muted-foreground">Luxury: </span>{luxury}</div>
          <div><span className="text-muted-foreground">Person: </span>{person}</div>
        </div>
        <Result pts={35} msg="We'll compare with your matches and surface the closest survival twin." />
      </GameShell>
    );
  }

  return (
    <GameShell title="Desert Island" sub="Pick 5 items, 1 luxury, 1 person to bring.">
      <div className="space-y-6">
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">5 items · {items.length}/5</div>
          <div className="flex flex-wrap gap-2">
            {DESERT_ISLAND.items.map((it) => {
              const on = items.includes(it);
              return (
                <button key={it} onClick={() => toggle(it)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? "border-primary bg-primary/10 text-foreground" : "border-border bg-surface text-muted-foreground hover:text-foreground"}`}>
                  {it}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">1 luxury</div>
          <div className="flex flex-wrap gap-2">
            {DESERT_ISLAND.luxuries.map((l) => (
              <button key={l} onClick={() => setLuxury(l)}
                className={`rounded-full border px-3 py-1.5 text-xs ${luxury === l ? "border-accent bg-accent/10 text-foreground" : "border-border bg-surface text-muted-foreground hover:text-foreground"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">1 person</div>
          <div className="flex flex-wrap gap-2">
            {DESERT_ISLAND.people.map((p) => (
              <button key={p} onClick={() => setPerson(p)}
                className={`rounded-full border px-3 py-1.5 text-xs ${person === p ? "border-neon/60 bg-neon/10 text-foreground" : "border-border bg-surface text-muted-foreground hover:text-foreground"}`}>{p}</button>
            ))}
          </div>
        </div>
        <button disabled={!done} onClick={() => setSubmitted(true)}
          className="w-full rounded-full bg-gradient-hero py-3 font-medium text-primary-foreground shadow-glow disabled:opacity-40">
          Lock in kit
        </button>
      </div>
    </GameShell>
  );
}

/* ---------- 5. Memory Match ---------- */
const EMOJIS = ["🌊", "🔥", "🌙", "✨", "🎧", "🍷", "🦋", "🗝️"];
function MemoryGame({ onScore }: { onScore: (n: number) => void }) {
  const deck = useMemo(() => {
    const pairs = [...EMOJIS, ...EMOJIS].sort(() => Math.random() - 0.5);
    return pairs.map((e, i) => ({ id: i, emoji: e }));
  }, []);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(0);
  const done = matched.size === deck.length;
  const pts = done ? Math.max(20, 80 - moves * 2) : 0;
  useEffect(() => { if (done) onScore(pts); }, [done]); // eslint-disable-line

  const flip = (i: number) => {
    if (flipped.length === 2 || flipped.includes(i) || matched.has(i)) return;
    const next = [...flipped, i];
    setFlipped(next);
    if (next.length === 2) {
      setMoves(moves + 1);
      const [a, b] = next;
      if (deck[a].emoji === deck[b].emoji) {
        setTimeout(() => { setMatched(new Set([...matched, a, b])); setFlipped([]); }, 400);
      } else {
        setTimeout(() => setFlipped([]), 700);
      }
    }
  };

  return (
    <GameShell title="Memory Match" sub={`Pair the symbols. Moves: ${moves}`}>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-4">
        {deck.map((c, i) => {
          const show = flipped.includes(i) || matched.has(i);
          return (
            <button key={c.id} onClick={() => flip(i)}
              className={`aspect-square rounded-2xl border text-3xl transition-all ${
                show ? "border-primary bg-primary/10 shadow-glow" : "border-border bg-surface hover:border-foreground/30"
              } ${matched.has(i) ? "opacity-60" : ""}`}>
              {show ? c.emoji : ""}
            </button>
          );
        })}
      </div>
      {done && <Result pts={pts} msg={`Cleared in ${moves} moves — chemistry banked.`} />}
    </GameShell>
  );
}
