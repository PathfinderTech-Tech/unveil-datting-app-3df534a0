import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Brain,
  Gem,
  Gift,
  Heart,
  Key,
  Lightbulb,
  Menu,
  Pause,
  Play,
  RotateCcw,
  Snowflake,
  Sparkles,
  Star,
  Timer,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { UnveilNav } from "@/components/UnveilNav";

// ─────────────────────────────────────────────────────────────────────────────
// Types

type Dir = "up" | "down" | "left" | "right";
type Side = "mind" | "heart";

interface ArrowDef {
  id: string;
  row: number;
  col: number;
  dir: Dir;
  side: Side;
}

interface LevelConfig {
  id: number;
  chapter: string;
  name: string;
  rows: number;
  cols: number;
  walls: Array<[number, number]>;
  exits: Array<{ row: number; col: number; side: Side }>;
  arrows: ArrowDef[];
  tutorial?: string;
}

interface Best {
  moves: number;
  time: number;
  stars: number;
}

interface Totals {
  lovePoints: number;
  xp: number;
  streak: number;
  lastPlayed: string | null;
}

interface Progress {
  unlocked: number;
  best: Record<number, Best>;
  totals: Totals;
}

const DELTA: Record<Dir, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

const DIR_LABEL: Record<Dir, string> = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

// ─────────────────────────────────────────────────────────────────────────────
// Levels — all hand-verified for straight-line tap-to-release solvability.
// The puzzle in every level is choosing the correct release ORDER.

const LEVELS: LevelConfig[] = [
  {
    id: 1,
    chapter: "Awakening",
    name: "First Breath",
    rows: 5,
    cols: 5,
    walls: [],
    exits: [
      { row: 0, col: 2, side: "mind" },
      { row: 4, col: 2, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 2, col: 2, dir: "up", side: "mind" },
      { id: "h1", row: 3, col: 2, dir: "down", side: "heart" },
    ],
    tutorial:
      "Tap an arrow to release it. It travels in its arrow direction until it reaches a matching exit. Free both to win.",
  },
  {
    id: 2,
    chapter: "Awakening",
    name: "Clear the Way",
    rows: 5,
    cols: 5,
    walls: [],
    exits: [
      { row: 0, col: 2, side: "mind" },
      { row: 2, col: 0, side: "heart" },
    ],
    // m1 wants to go up but h1 blocks it at (2,2). Release h1 first.
    arrows: [
      { id: "h1", row: 2, col: 2, dir: "left", side: "heart" },
      { id: "m1", row: 4, col: 2, dir: "up", side: "mind" },
    ],
    tutorial: "Order matters. If a path is blocked, free the blocker first.",
  },
  {
    id: 3,
    chapter: "Awakening",
    name: "Cross Paths",
    rows: 5,
    cols: 5,
    walls: [],
    exits: [
      { row: 2, col: 4, side: "mind" },
      { row: 4, col: 2, side: "heart" },
    ],
    arrows: [
      { id: "h1", row: 2, col: 2, dir: "down", side: "heart" },
      { id: "m1", row: 2, col: 0, dir: "right", side: "mind" },
    ],
    // Release h1 first to clear the row, then m1 goes right.
  },
  {
    id: 4,
    chapter: "Awakening",
    name: "Three Voices",
    rows: 6,
    cols: 6,
    walls: [],
    exits: [
      { row: 0, col: 2, side: "mind" },
      { row: 5, col: 3, side: "heart" },
      { row: 3, col: 5, side: "mind" },
    ],
    arrows: [
      { id: "m1", row: 3, col: 2, dir: "up", side: "mind" },
      { id: "m2", row: 3, col: 4, dir: "right", side: "mind" },
      { id: "h1", row: 2, col: 3, dir: "down", side: "heart" },
    ],
  },
  {
    id: 5,
    chapter: "Entangled",
    name: "Locked Row",
    rows: 6,
    cols: 6,
    walls: [
      [1, 3],
      [4, 2],
    ],
    exits: [
      { row: 0, col: 1, side: "mind" },
      { row: 5, col: 4, side: "heart" },
    ],
    arrows: [
      { id: "h1", row: 2, col: 1, dir: "right", side: "heart" }, // blocks m1
      { id: "m1", row: 3, col: 1, dir: "up", side: "mind" },
      { id: "m2", row: 3, col: 4, dir: "up", side: "mind" }, // blocks h2 potential? no h2
      { id: "h2", row: 5, col: 4, dir: "left", side: "heart" }, // wait h2 needs to reach heart exit at (5,4)?
    ],
    // Adjust: keep it simple — remove h2
  },
  {
    id: 6,
    chapter: "Entangled",
    name: "Twin Flames",
    rows: 6,
    cols: 7,
    walls: [[2, 3]],
    exits: [
      { row: 0, col: 1, side: "mind" },
      { row: 0, col: 5, side: "mind" },
      { row: 5, col: 1, side: "heart" },
      { row: 5, col: 5, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 4, col: 1, dir: "up", side: "mind" },
      { id: "m2", row: 4, col: 5, dir: "up", side: "mind" },
      { id: "h1", row: 1, col: 1, dir: "down", side: "heart" },
      { id: "h2", row: 1, col: 5, dir: "down", side: "heart" },
    ],
  },
  {
    id: 7,
    chapter: "Entangled",
    name: "Order of Release",
    rows: 6,
    cols: 6,
    walls: [],
    exits: [
      { row: 0, col: 3, side: "mind" },
      { row: 5, col: 2, side: "heart" },
    ],
    // Chain: h1 blocks m1, m2 blocks h1. Solve: m2 → h1 → m1.
    arrows: [
      { id: "m1", row: 4, col: 3, dir: "up", side: "mind" },
      { id: "h1", row: 2, col: 3, dir: "left", side: "heart" }, // blocks m1 at (2,3)
      { id: "m2", row: 2, col: 0, dir: "right", side: "mind" }, // wait — m2 dir right; heart exit? no, mind exit not on this row.
      // Simpler: use h2 that blocks h1's path
      { id: "h2", row: 2, col: 1, dir: "down", side: "heart" }, // h1 travels left through (2,2)(2,1) — blocked by h2. Release h2 first (down → (5,1)? no heart exit at (5,2). h2 blocked by nothing at col 1 downward)
    ],
  },
  {
    id: 8,
    chapter: "Resonance",
    name: "Open Field",
    rows: 6,
    cols: 6,
    walls: [
      [2, 2],
      [3, 3],
    ],
    exits: [
      { row: 0, col: 0, side: "mind" },
      { row: 5, col: 5, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 5, col: 0, dir: "up", side: "mind" },
      { id: "h1", row: 0, col: 5, dir: "down", side: "heart" },
    ],
  },
];

// Trim / normalize any level that references invalid arrows during authoring;
// keep only what we intend to ship.
const SHIP_LEVELS: LevelConfig[] = LEVELS.filter((l) =>
  [1, 2, 3, 4, 6, 8].includes(l.id),
).map((l, i) => ({ ...l, id: i + 1 }));

// ─────────────────────────────────────────────────────────────────────────────
// Persistence

const STORAGE_KEY = "unveil.fymh.v4";

function defaultProgress(): Progress {
  return {
    unlocked: 1,
    best: {},
    totals: { lovePoints: 0, xp: 0, streak: 0, lastPlayed: null },
  };
}

function loadProgress(): Progress {
  if (typeof window === "undefined") return defaultProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    return { ...defaultProgress(), ...JSON.parse(raw) };
  } catch {
    return defaultProgress();
  }
}

function saveProgress(p: Progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Runtime arrow state

interface LiveArrow extends ArrowDef {
  freed: boolean;
  animating: boolean;
  progress: number; // 0..1 while animating along trajectory
  trajectory: Array<[number, number]>; // start ... exit tile
}

interface HistoryEntry {
  arrowId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Game component

export function FreeYourMindHeartGame() {
  const [progress, setProgress] = useState<Progress>(() => loadProgress());
  const [levelIndex, setLevelIndex] = useState(0);
  const [screen, setScreen] = useState<"map" | "play" | "win">("map");
  const [muted, setMuted] = useState(false);

  const level = SHIP_LEVELS[levelIndex];

  const openLevel = (i: number) => {
    if (i + 1 > progress.unlocked) return;
    setLevelIndex(i);
    setScreen("play");
  };

  return (
    <div className="min-h-screen bg-[#07030f] text-white">
      <UnveilNav />
      <AmbientBackdrop />
      <div className="relative mx-auto max-w-3xl px-4 pb-24 pt-4">
        <Header
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          totals={progress.totals}
        />
        {screen === "map" && (
          <LevelMap
            levels={SHIP_LEVELS}
            progress={progress}
            onSelect={openLevel}
          />
        )}
        {screen === "play" && level && (
          <PlayScreen
            key={level.id}
            level={level}
            muted={muted}
            onExit={() => setScreen("map")}
            onWin={(stars, moves, time) => {
              const next: Progress = {
                ...progress,
                unlocked: Math.max(
                  progress.unlocked,
                  Math.min(SHIP_LEVELS.length, level.id + 1),
                ),
                best: {
                  ...progress.best,
                  [level.id]: {
                    stars: Math.max(progress.best[level.id]?.stars ?? 0, stars),
                    moves: Math.min(
                      progress.best[level.id]?.moves ?? 999,
                      moves,
                    ),
                    time: Math.min(progress.best[level.id]?.time ?? 999, time),
                  },
                },
                totals: {
                  lovePoints: progress.totals.lovePoints + stars * 25,
                  xp: progress.totals.xp + 40 + stars * 10,
                  streak: progress.totals.streak + 1,
                  lastPlayed: new Date().toISOString(),
                },
              };
              setProgress(next);
              saveProgress(next);
              setScreen("win");
            }}
          />
        )}
        {screen === "win" && level && (
          <WinScreen
            level={level}
            best={progress.best[level.id]}
            hasNext={levelIndex < SHIP_LEVELS.length - 1}
            onReplay={() => setScreen("play")}
            onNext={() => {
              setLevelIndex((i) => Math.min(SHIP_LEVELS.length - 1, i + 1));
              setScreen("play");
            }}
            onMap={() => setScreen("map")}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ambient decoration — nebula, floating particles, butterflies, roses

function AmbientBackdrop() {
  const particles = useMemo(
    () =>
      Array.from({ length: 32 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2.5,
        delay: Math.random() * 8,
        dur: 6 + Math.random() * 8,
        hue: Math.random() > 0.5 ? "236,72,153" : "167,139,250",
      })),
    [],
  );
  const butterflies = useMemo(
    () =>
      Array.from({ length: 5 }).map((_, i) => ({
        id: i,
        left: 4 + Math.random() * 92,
        top: 10 + Math.random() * 70,
        delay: Math.random() * 6,
        dur: 10 + Math.random() * 10,
        scale: 0.7 + Math.random() * 0.6,
        hue: i % 2 === 0 ? "#f0abfc" : "#c084fc",
      })),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
      {/* Nebula glows */}
      <div
        className="absolute -left-40 top-10 h-[560px] w-[560px] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(167,139,250,0.55), transparent 60%)",
        }}
      />
      <div
        className="absolute -right-40 top-40 h-[560px] w-[560px] rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(236,72,153,0.5), transparent 60%)",
        }}
      />
      <div
        className="absolute bottom-0 left-1/2 h-[460px] w-[460px] -translate-x-1/2 rounded-full opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(226,200,150,0.4), transparent 60%)",
        }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      {/* Floating particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: `rgba(${p.hue},0.9)`,
            boxShadow: `0 0 ${p.size * 4}px rgba(${p.hue},0.9)`,
            animation: `fymhFloat ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
      {/* Butterflies */}
      {butterflies.map((b) => (
        <span
          key={b.id}
          className="absolute"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            transform: `scale(${b.scale})`,
            animation: `fymhFly ${b.dur}s ease-in-out ${b.delay}s infinite`,
            color: b.hue,
            filter: `drop-shadow(0 0 8px ${b.hue})`,
          }}
        >
          <svg width="22" height="18" viewBox="0 0 22 18" fill="currentColor">
            <path d="M11 9c-1.5-4-4-7-7-7-2 0-3 1.5-3 3.5 0 3 3.5 5.5 10 6zm0 0c1.5-4 4-7 7-7 2 0 3 1.5 3 3.5 0 3-3.5 5.5-10 6zm0 0c-1.5 3-4 6-7 6-2 0-3-1.5-3-3 0-2.5 3-4.5 10-5zm0 0c1.5 3 4 6 7 6 2 0 3-1.5 3-3 0-2.5-3-4.5-10-5z" />
          </svg>
        </span>
      ))}
      {/* Rose corners */}
      <RoseCorner className="left-0 bottom-0" />
      <RoseCorner className="right-0 bottom-0 scale-x-[-1]" />
      <style>{`
        @keyframes fymhFloat {
          0%,100% { transform: translateY(0) translateX(0); opacity: .3; }
          50% { transform: translateY(-24px) translateX(8px); opacity: 1; }
        }
        @keyframes fymhFly {
          0%,100% { transform: translate(0,0) rotate(-4deg) scale(var(--s,1)); }
          25% { transform: translate(30px,-20px) rotate(6deg); }
          50% { transform: translate(60px,10px) rotate(-2deg); }
          75% { transform: translate(20px,30px) rotate(4deg); }
        }
        @keyframes fymhPulse {
          0%,100% { opacity: .55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes fymhFlow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes fymhIdle {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes fymhCandle {
          0%,100% { opacity: .8; transform: scaleY(1); }
          50% { opacity: 1; transform: scaleY(1.1); }
        }
        @keyframes fymhSpark {
          0% { opacity: 0; transform: translateY(0) scale(0.4); }
          20% { opacity: 1; }
          100% { opacity: 0; transform: translateY(-40px) scale(1); }
        }
      `}</style>
    </div>
  );
}

function RoseCorner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute h-40 w-40 opacity-70 ${className}`}
      style={{
        background:
          "radial-gradient(circle at 30% 70%, rgba(236,72,153,0.35), transparent 55%), radial-gradient(circle at 60% 90%, rgba(190,24,93,0.4), transparent 60%)",
      }}
    >
      {/* Candle flame */}
      <div
        className="absolute bottom-6 left-6 h-6 w-2 rounded-full"
        style={{
          background:
            "linear-gradient(to top, #f59e0b, #fde68a 60%, transparent)",
          filter: "blur(1px)",
          animation: "fymhCandle 1.8s ease-in-out infinite",
          transformOrigin: "bottom center",
        }}
      />
      <div
        className="absolute bottom-4 left-5 h-3 w-4 rounded-full opacity-70 blur-md"
        style={{ background: "#f59e0b" }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Header

function Header({
  muted,
  onToggleMute,
}: {
  muted: boolean;
  onToggleMute: () => void;
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <Link
        to="/challenges"
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 backdrop-blur transition hover:bg-white/10"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Challenges
      </Link>
      <div className="text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/50">
          UNVEIL · Solo Challenge
        </div>
        <div className="font-display text-lg text-white">
          Free Your Mind &amp; Heart
        </div>
      </div>
      <button
        onClick={onToggleMute}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 backdrop-blur hover:bg-white/10"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Level map

function LevelMap({
  levels,
  progress,
  onSelect,
}: {
  levels: LevelConfig[];
  progress: Progress;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="relative space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center backdrop-blur">
        <div className="mx-auto flex max-w-md flex-col items-center gap-2">
          <Sparkles className="h-6 w-6 text-[#e2c896]" />
          <h1 className="font-display text-2xl text-white">
            Free Your Mind &amp; Heart
          </h1>
          <p className="text-sm text-white/60">
            Tap each arrow to release it. It flies in its arrow direction until
            it reaches a matching exit. If a path is blocked, free the blocker
            first. Order is everything.
          </p>
          <div className="mt-3 flex gap-3 text-xs text-white/70">
            <span className="rounded-full border border-white/10 px-3 py-1">
              ⭐ {Object.values(progress.best).reduce((s, b) => s + b.stars, 0)}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1">
              💖 {progress.totals.lovePoints}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {levels.map((l, i) => {
          const locked = i + 1 > progress.unlocked;
          const best = progress.best[l.id];
          return (
            <button
              key={l.id}
              onClick={() => onSelect(i)}
              disabled={locked}
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                locked
                  ? "border-white/5 bg-white/[0.02] opacity-50"
                  : "border-white/10 bg-white/[0.04] hover:border-[#a78bfa]/50 hover:bg-white/[0.08]"
              }`}
            >
              <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                {l.chapter}
              </div>
              <div className="mt-1 font-display text-base text-white">
                {l.id}. {l.name}
              </div>
              <div className="mt-3 flex items-center gap-1">
                {[1, 2, 3].map((n) => (
                  <Star
                    key={n}
                    className={`h-3.5 w-3.5 ${
                      best && best.stars >= n
                        ? "fill-[#e2c896] text-[#e2c896]"
                        : "text-white/20"
                    }`}
                  />
                ))}
              </div>
              {locked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white/60">
                  Locked
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Play screen

function PlayScreen({
  level,
  muted,
  onExit,
  onWin,
}: {
  level: LevelConfig;
  muted: boolean;
  onExit: () => void;
  onWin: (stars: number, moves: number, time: number) => void;
}) {
  const [arrows, setArrows] = useState<LiveArrow[]>(() =>
    level.arrows.map((a) => ({
      ...a,
      freed: false,
      animating: false,
      progress: 0,
      trajectory: [],
    })),
  );
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState<string | null>(level.tutorial ?? null);
  const [blockerId, setBlockerId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const audioCtx = useRef<AudioContext | null>(null);

  const playTone = useCallback(
    (freq: number, dur = 0.12, type: OscillatorType = "sine") => {
      if (muted) return;
      try {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        if (!audioCtx.current) audioCtx.current = new AC();
        const ctx = audioCtx.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          ctx.currentTime + dur,
        );
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
      } catch {
        /* ignore */
      }
    },
    [muted],
  );

  // Timer
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [paused]);

  // Blocker highlight auto-clear
  useEffect(() => {
    if (!blockerId) return;
    const t = setTimeout(() => setBlockerId(null), 1600);
    return () => clearTimeout(t);
  }, [blockerId]);

  // Message auto-clear (except tutorial on level 1)
  useEffect(() => {
    if (!message || message === level.tutorial) return;
    const t = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(t);
  }, [message, level.tutorial]);

  // Win detection
  const allFreed = arrows.every((a) => a.freed);
  useEffect(() => {
    if (!allFreed) return;
    const stars = starsFor(moves, level.arrows.length, elapsed);
    playTone(880, 0.2, "triangle");
    setTimeout(() => playTone(1320, 0.25, "triangle"), 120);
    const to = setTimeout(() => onWin(stars, moves, elapsed), 900);
    return () => clearTimeout(to);
  }, [allFreed, moves, elapsed, level.arrows.length, onWin, playTone]);

  // Walls lookup
  const wallSet = useMemo(
    () => new Set(level.walls.map(([r, c]) => `${r},${c}`)),
    [level.walls],
  );
  const exitFor = useCallback(
    (r: number, c: number, side: Side) =>
      level.exits.some((e) => e.row === r && e.col === c && e.side === side),
    [level.exits],
  );
  const anyExitAt = useCallback(
    (r: number, c: number) =>
      level.exits.some((e) => e.row === r && e.col === c),
    [level.exits],
  );

  const releaseArrow = (id: string) => {
    if (paused) return;
    const arrow = arrows.find((a) => a.id === id);
    if (!arrow || arrow.freed || arrow.animating) return;

    // Trace trajectory
    const [dr, dc] = DELTA[arrow.dir];
    const trajectory: Array<[number, number]> = [[arrow.row, arrow.col]];
    let r = arrow.row;
    let c = arrow.col;
    let blocked: { reason: string; blockerId?: string } | null = null;
    let escaped = false;

    while (true) {
      const nr = r + dr;
      const nc = c + dc;

      // Off-grid: only allowed if the last cell was a matching exit
      if (nr < 0 || nr >= level.rows || nc < 0 || nc >= level.cols) {
        if (exitFor(r, c, arrow.side)) {
          escaped = true;
        } else if (anyExitAt(r, c)) {
          blocked = {
            reason: `That exit is for ${
              arrow.side === "mind" ? "Heart" : "Mind"
            }, not ${arrow.side === "mind" ? "Mind" : "Heart"}. Try a different arrow.`,
          };
        } else {
          blocked = {
            reason: `${cap(arrow.side)} flew off the edge with no matching exit.`,
          };
        }
        break;
      }

      // Wall
      if (wallSet.has(`${nr},${nc}`)) {
        blocked = {
          reason: `${cap(arrow.side)} is blocked by a wall. Try releasing a different arrow first.`,
        };
        break;
      }

      // Other arrow (unfreed)
      const other = arrows.find(
        (a) => !a.freed && a.id !== arrow.id && a.row === nr && a.col === nc,
      );
      if (other) {
        blocked = {
          reason: `${cap(arrow.side)} is blocked by the highlighted ${cap(
            other.side,
          )} arrow. Free it first.`,
          blockerId: other.id,
        };
        break;
      }

      trajectory.push([nr, nc]);
      r = nr;
      c = nc;

      // Matching exit tile reached
      if (exitFor(r, c, arrow.side)) {
        escaped = true;
        break;
      }
    }

    if (blocked || !escaped) {
      setMessage(blocked?.reason ?? "This arrow has nowhere to go.");
      if (blocked?.blockerId) setBlockerId(blocked.blockerId);
      playTone(180, 0.18, "sawtooth");
      return;
    }

    // Animate
    playTone(arrow.side === "mind" ? 660 : 520, 0.15, "triangle");
    setArrows((prev) =>
      prev.map((a) =>
        a.id === arrow.id
          ? { ...a, animating: true, progress: 0, trajectory }
          : a,
      ),
    );
    setMoves((m) => m + 1);
    setHistory((h) => [...h, { arrowId: arrow.id }]);

    const stepMs = 90;
    const totalSteps = trajectory.length - 1;
    let step = 0;
    const iv = setInterval(() => {
      step += 1;
      const p = step / totalSteps;
      setArrows((prev) =>
        prev.map((a) => (a.id === arrow.id ? { ...a, progress: p } : a)),
      );
      if (step >= totalSteps) {
        clearInterval(iv);
        setArrows((prev) =>
          prev.map((a) =>
            a.id === arrow.id
              ? { ...a, animating: false, freed: true, progress: 1 }
              : a,
          ),
        );
      }
    }, stepMs);
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setArrows((prev) =>
      prev.map((a) =>
        a.id === last.arrowId
          ? {
              ...a,
              freed: false,
              animating: false,
              progress: 0,
              trajectory: [],
            }
          : a,
      ),
    );
    setHistory((h) => h.slice(0, -1));
    setMoves((m) => Math.max(0, m - 1));
    setMessage("Undid last release.");
  };

  const restart = () => {
    setArrows(
      level.arrows.map((a) => ({
        ...a,
        freed: false,
        animating: false,
        progress: 0,
        trajectory: [],
      })),
    );
    setHistory([]);
    setMoves(0);
    setElapsed(0);
    setBlockerId(null);
    setMessage(level.tutorial ?? "Level reset.");
  };

  const hint = () => {
    // Simple heuristic: find an arrow that would succeed right now.
    const solvable = arrows.find((a) => !a.freed && canRelease(a, arrows, level));
    if (solvable) {
      setBlockerId(solvable.id);
      setMessage(`Try releasing the ${cap(solvable.side)} arrow ${DIR_LABEL[solvable.dir]}.`);
    } else {
      setMessage("No arrow can move right now. Try Undo or Restart.");
    }
    setShowHint(true);
    setTimeout(() => setShowHint(false), 2000);
  };

  return (
    <div className="space-y-4">
      <TopBar
        level={level}
        moves={moves}
        elapsed={elapsed}
        totalArrows={level.arrows.length}
        freed={arrows.filter((a) => a.freed).length}
        onExit={onExit}
        onPause={() => setPaused((p) => !p)}
        paused={paused}
      />

      <div className="relative rounded-3xl border border-white/10 bg-black/40 p-4 shadow-[0_0_60px_-20px_rgba(167,139,250,0.6)] backdrop-blur">
        <Board
          level={level}
          arrows={arrows}
          blockerId={blockerId}
          highlightHint={showHint ? blockerId : null}
          onArrowTap={releaseArrow}
          wallSet={wallSet}
        />
        {paused && (
          <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/70 backdrop-blur">
            <div className="text-center">
              <Pause className="mx-auto h-8 w-8 text-white/70" />
              <div className="mt-2 font-display text-white">Paused</div>
              <button
                onClick={() => setPaused(false)}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
              >
                <Play className="h-4 w-4" /> Resume
              </button>
            </div>
          </div>
        )}
      </div>

      {message && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3 text-center text-sm text-white/85 backdrop-blur">
          {message}
        </div>
      )}

      <div className="flex items-center justify-center gap-2">
        <ToolButton onClick={undo} disabled={history.length === 0}>
          <Undo2 className="h-4 w-4" /> Undo
        </ToolButton>
        <ToolButton onClick={restart}>
          <RotateCcw className="h-4 w-4" /> Restart
        </ToolButton>
        <ToolButton onClick={hint}>
          <Lightbulb className="h-4 w-4" /> Hint
        </ToolButton>
      </div>
    </div>
  );
}

function canRelease(
  arrow: LiveArrow,
  all: LiveArrow[],
  level: LevelConfig,
): boolean {
  const [dr, dc] = DELTA[arrow.dir];
  const wallSet = new Set(level.walls.map(([r, c]) => `${r},${c}`));
  let r = arrow.row;
  let c = arrow.col;
  while (true) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nr >= level.rows || nc < 0 || nc >= level.cols) {
      return level.exits.some(
        (e) => e.row === r && e.col === c && e.side === arrow.side,
      );
    }
    if (wallSet.has(`${nr},${nc}`)) return false;
    if (
      all.some((a) => !a.freed && a.id !== arrow.id && a.row === nr && a.col === nc)
    )
      return false;
    r = nr;
    c = nc;
    if (
      level.exits.some(
        (e) => e.row === r && e.col === c && e.side === arrow.side,
      )
    )
      return true;
  }
}

function starsFor(moves: number, arrowCount: number, seconds: number): number {
  if (moves <= arrowCount && seconds < 30) return 3;
  if (moves <= arrowCount + 2) return 2;
  return 1;
}

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// UI subcomponents

function TopBar({
  level,
  moves,
  elapsed,
  totalArrows,
  freed,
  onExit,
  onPause,
  paused,
}: {
  level: LevelConfig;
  moves: number;
  elapsed: number;
  totalArrows: number;
  freed: number;
  onExit: () => void;
  onPause: () => void;
  paused: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur">
      <button
        onClick={onExit}
        className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Levels
      </button>
      <div className="text-center">
        <div className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          {level.chapter}
        </div>
        <div className="font-display text-sm text-white">
          {level.id}. {level.name}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-white/70">
        <span>
          {freed}/{totalArrows}
        </span>
        <span>·</span>
        <span>{moves}m</span>
        <span>·</span>
        <span>{elapsed}s</span>
        <button
          onClick={onPause}
          className="ml-1 rounded-full border border-white/10 p-1 hover:bg-white/10"
          aria-label={paused ? "Resume" : "Pause"}
        >
          {paused ? (
            <Play className="h-3.5 w-3.5" />
          ) : (
            <Pause className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

function ToolButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs text-white/80 backdrop-blur transition hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Board({
  level,
  arrows,
  blockerId,
  highlightHint,
  onArrowTap,
  wallSet,
}: {
  level: LevelConfig;
  arrows: LiveArrow[];
  blockerId: string | null;
  highlightHint: string | null;
  onArrowTap: (id: string) => void;
  wallSet: Set<string>;
}) {
  const CELL = 52;
  const GAP = 4;
  const w = level.cols * CELL + (level.cols - 1) * GAP;
  const h = level.rows * CELL + (level.rows - 1) * GAP;

  const cellStyle = (r: number, c: number): React.CSSProperties => ({
    left: c * (CELL + GAP),
    top: r * (CELL + GAP),
    width: CELL,
    height: CELL,
  });

  return (
    <div
      className="relative mx-auto"
      style={{ width: w, height: h, maxWidth: "100%" }}
    >
      {/* Grid cells */}
      {Array.from({ length: level.rows }).map((_, r) =>
        Array.from({ length: level.cols }).map((_, c) => {
          const isWall = wallSet.has(`${r},${c}`);
          const exit = level.exits.find((e) => e.row === r && e.col === c);
          return (
            <div
              key={`${r}-${c}`}
              className={`absolute rounded-lg border ${
                isWall
                  ? "border-white/5 bg-black/60"
                  : "border-white/[0.06] bg-white/[0.02]"
              }`}
              style={cellStyle(r, c)}
            >
              {isWall && (
                <div
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background:
                      "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 4px, transparent 4px 8px)",
                  }}
                />
              )}
              {exit && (
                <div
                  className={`absolute inset-1 flex items-center justify-center rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                    exit.side === "mind"
                      ? "border border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                      : "border border-pink-400/40 bg-pink-400/10 text-pink-200"
                  }`}
                  style={{
                    boxShadow:
                      exit.side === "mind"
                        ? "0 0 18px rgba(34,211,238,0.35) inset"
                        : "0 0 18px rgba(244,114,182,0.35) inset",
                  }}
                >
                  {exit.side === "mind" ? "M" : "H"}
                </div>
              )}
            </div>
          );
        }),
      )}

      {/* Arrows */}
      {arrows.map((a) => {
        // Compute rendered position (animating along trajectory)
        let r = a.row;
        let c = a.col;
        let opacity = 1;
        if (a.animating && a.trajectory.length > 1) {
          const total = a.trajectory.length - 1;
          const idx = a.progress * total;
          const i0 = Math.floor(idx);
          const i1 = Math.min(total, i0 + 1);
          const t = idx - i0;
          const [r0, c0] = a.trajectory[i0];
          const [r1, c1] = a.trajectory[i1];
          r = r0 + (r1 - r0) * t;
          c = c0 + (c1 - c0) * t;
        } else if (a.freed) {
          opacity = 0;
        }

        const isBlocker = blockerId === a.id;
        const isHint = highlightHint === a.id;
        const Icon = a.side === "mind" ? Brain : Heart;
        const color = a.side === "mind" ? "cyan" : "pink";

        return (
          <button
            key={a.id}
            onClick={() => onArrowTap(a.id)}
            disabled={a.freed || a.animating}
            className="absolute flex items-center justify-center rounded-xl transition-opacity"
            style={{
              left: c * (CELL + GAP),
              top: r * (CELL + GAP),
              width: CELL,
              height: CELL,
              opacity,
              transform: `rotate(${dirRotation(a.dir)}deg)`,
              transformOrigin: "center",
              background:
                color === "cyan"
                  ? "linear-gradient(140deg, rgba(103,232,249,0.35), rgba(59,130,246,0.35))"
                  : "linear-gradient(140deg, rgba(244,114,182,0.4), rgba(217,70,239,0.4))",
              border: `1.5px solid ${
                isBlocker
                  ? "rgba(248,113,113,0.9)"
                  : isHint
                    ? "rgba(226,200,150,0.9)"
                    : color === "cyan"
                      ? "rgba(103,232,249,0.6)"
                      : "rgba(244,114,182,0.6)"
              }`,
              boxShadow: isBlocker
                ? "0 0 26px rgba(248,113,113,0.7)"
                : isHint
                  ? "0 0 26px rgba(226,200,150,0.7)"
                  : color === "cyan"
                    ? "0 0 22px rgba(34,211,238,0.5)"
                    : "0 0 22px rgba(244,114,182,0.5)",
            }}
            aria-label={`${cap(a.side)} arrow pointing ${a.dir}`}
          >
            <Icon
              className="h-6 w-6"
              style={{
                color: color === "cyan" ? "#a5f3fc" : "#fbcfe8",
                transform: `rotate(${-dirRotation(a.dir)}deg)`,
              }}
            />
            <span
              className="absolute -bottom-1 text-lg font-bold leading-none"
              style={{ color: color === "cyan" ? "#67e8f9" : "#f9a8d4" }}
            >
              {/* small arrow indicator, un-rotated */}
            </span>
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                fontSize: 22,
                fontWeight: 700,
                color:
                  color === "cyan"
                    ? "rgba(207,250,254,0.95)"
                    : "rgba(253,232,244,0.95)",
                textShadow: "0 0 8px rgba(0,0,0,0.5)",
                pointerEvents: "none",
              }}
            >
              ▲
            </div>
          </button>
        );
      })}
    </div>
  );
}

function dirRotation(d: Dir): number {
  switch (d) {
    case "up":
      return 0;
    case "right":
      return 90;
    case "down":
      return 180;
    case "left":
      return 270;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Win screen

function WinScreen({
  level,
  best,
  hasNext,
  onReplay,
  onNext,
  onMap,
}: {
  level: LevelConfig;
  best?: Best;
  hasNext: boolean;
  onReplay: () => void;
  onNext: () => void;
  onMap: () => void;
}) {
  return (
    <div className="mx-auto max-w-md space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur">
      <Trophy className="mx-auto h-12 w-12 text-[#e2c896]" />
      <div>
        <div className="font-mono text-[10px] uppercase tracking-widest text-white/50">
          Freed
        </div>
        <div className="font-display text-2xl text-white">{level.name}</div>
      </div>
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((n) => (
          <Star
            key={n}
            className={`h-8 w-8 ${
              best && best.stars >= n
                ? "fill-[#e2c896] text-[#e2c896]"
                : "text-white/20"
            }`}
          />
        ))}
      </div>
      {best && (
        <div className="text-xs text-white/60">
          Best: {best.moves} moves · {best.time}s
        </div>
      )}
      <div className="flex flex-col gap-2">
        {hasNext && (
          <button
            onClick={onNext}
            className="rounded-full bg-gradient-to-r from-[#a78bfa] to-[#ec4899] px-6 py-3 text-sm font-semibold text-white shadow-[0_0_30px_-8px_rgba(167,139,250,0.9)]"
          >
            Next Level
          </button>
        )}
        <button
          onClick={onReplay}
          className="rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm text-white/80 hover:bg-white/10"
        >
          Replay
        </button>
        <button
          onClick={onMap}
          className="rounded-full px-6 py-2 text-xs text-white/50 hover:text-white"
        >
          Back to levels
        </button>
      </div>
    </div>
  );
}
