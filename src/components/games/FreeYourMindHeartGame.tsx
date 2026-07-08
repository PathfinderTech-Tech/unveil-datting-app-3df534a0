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
type LockColor = "blue" | "rose" | "gold";

interface ArrowDef {
  id: string;
  row: number;
  col: number;
  dir: Dir;
  side: Side;
}

interface GateTile {
  row: number;
  col: number;
  color: LockColor;
}
interface SwitchTile {
  row: number;
  col: number;
  color: LockColor;
}
interface KeyTile {
  row: number;
  col: number;
  color: LockColor;
}
interface BreakableTile {
  row: number;
  col: number;
}
interface PortalTile {
  id: string;
  row: number;
  col: number;
  pairId: string;
}
interface OneWayTile {
  row: number;
  col: number;
  dir: Dir;
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
  gates?: GateTile[];
  switches?: SwitchTile[];
  keys?: KeyTile[];
  breakables?: BreakableTile[];
  portals?: PortalTile[];
  oneWays?: OneWayTile[];
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
  // 1 — First Breath. Just release both.
  {
    id: 1,
    chapter: "Awakening",
    name: "First Breath",
    rows: 5,
    cols: 5,
    walls: [],
    exits: [
      { row: 0, col: 1, side: "mind" },
      { row: 4, col: 3, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 2, col: 1, dir: "up", side: "mind" },
      { id: "h1", row: 2, col: 3, dir: "down", side: "heart" },
    ],
    tutorial:
      "Tap an arrow to release it. It flies in its arrow direction until it reaches a matching door. Free both to win.",
  },

  // 2 — Order matters. Heart blocks Mind. Release Heart first.
  {
    id: 2,
    chapter: "Awakening",
    name: "Who Goes First?",
    rows: 5,
    cols: 5,
    walls: [],
    exits: [
      { row: 0, col: 2, side: "mind" },
      { row: 2, col: 0, side: "heart" },
    ],
    arrows: [
      { id: "h1", row: 2, col: 2, dir: "left", side: "heart" },
      { id: "m1", row: 4, col: 2, dir: "up", side: "mind" },
    ],
    tutorial:
      "If one arrow blocks another, release the blocker first. The blocker will be highlighted in red when it stops you.",
  },

  // 3 — Switch opens gate. Heart steps on switch → Mind's gate opens.
  {
    id: 3,
    chapter: "Awakening",
    name: "The Blue Switch",
    rows: 5,
    cols: 5,
    walls: [],
    exits: [
      { row: 0, col: 2, side: "mind" },
      { row: 2, col: 4, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 4, col: 2, dir: "up", side: "mind" },
      { id: "h1", row: 2, col: 0, dir: "right", side: "heart" },
    ],
    gates: [{ row: 1, col: 2, color: "blue" }],
    switches: [{ row: 2, col: 2, color: "blue" }],
    tutorial:
      "A blue gate blocks Mind. Heart can cross the blue switch to open it. Release Heart first.",
  },

  // 4 — Reinforce switch/gate with rose color and crossing paths.
  {
    id: 4,
    chapter: "Entangled",
    name: "Open the Gate",
    rows: 5,
    cols: 5,
    walls: [],
    exits: [
      { row: 0, col: 1, side: "mind" },
      { row: 4, col: 3, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 4, col: 1, dir: "up", side: "mind" },
      { id: "h1", row: 0, col: 3, dir: "down", side: "heart" },
    ],
    gates: [{ row: 1, col: 1, color: "rose" }],
    switches: [{ row: 2, col: 3, color: "rose" }],
    tutorial:
      "Each gate matches a switch of the same color. Send the right friend to the switch first.",
  },

  // 5 — Breakable wall. Heart crosses it, breaks it, Mind then passes.
  {
    id: 5,
    chapter: "Entangled",
    name: "The Cracked Wall",
    rows: 5,
    cols: 5,
    walls: [],
    exits: [
      { row: 0, col: 2, side: "mind" },
      { row: 2, col: 0, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 4, col: 2, dir: "up", side: "mind" },
      { id: "h1", row: 2, col: 4, dir: "left", side: "heart" },
    ],
    breakables: [{ row: 2, col: 2 }],
    tutorial:
      "A cracked wall blocks the way. The first arrow that reaches it breaks through and clears it for the next.",
  },

  // 6 — Portal. Mind teleports across.
  {
    id: 6,
    chapter: "Entangled",
    name: "Through the Portal",
    rows: 5,
    cols: 5,
    walls: [],
    exits: [
      { row: 0, col: 4, side: "mind" },
      { row: 4, col: 2, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 4, col: 0, dir: "up", side: "mind" },
      { id: "h1", row: 0, col: 2, dir: "down", side: "heart" },
    ],
    portals: [
      { id: "p1", row: 2, col: 0, pairId: "p2" },
      { id: "p2", row: 2, col: 4, pairId: "p1" },
    ],
    tutorial:
      "Portals teleport an arrow to their twin, then it keeps flying in the same direction.",
  },

  // 7 — Key. Heart picks up key that unlocks Mind's gate.
  {
    id: 7,
    chapter: "Resonance",
    name: "The Golden Key",
    rows: 5,
    cols: 5,
    walls: [],
    exits: [
      { row: 0, col: 2, side: "mind" },
      { row: 2, col: 4, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 4, col: 2, dir: "up", side: "mind" },
      { id: "h1", row: 2, col: 0, dir: "right", side: "heart" },
    ],
    gates: [{ row: 1, col: 2, color: "gold" }],
    keys: [{ row: 2, col: 2, color: "gold" }],
    tutorial:
      "Keys unlock every gate of their color. Pick up the gold key first, then the gold gate stays open.",
  },

  // 8 — One-way tile. Only arrows moving in the arrow's direction may pass.
  {
    id: 8,
    chapter: "Resonance",
    name: "One Way Up",
    rows: 5,
    cols: 5,
    walls: [
      [1, 0],
      [1, 4],
    ],
    exits: [
      { row: 0, col: 2, side: "mind" },
      { row: 2, col: 4, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 4, col: 2, dir: "up", side: "mind" },
      { id: "h1", row: 2, col: 0, dir: "right", side: "heart" },
    ],
    oneWays: [{ row: 2, col: 2, dir: "up" }],
    tutorial:
      "One-way tiles only let arrows through in the arrow's direction. Mind goes up through it. Heart moves right and passes around it.",
  },

  // 9 — Combine: switch + order + gate.
  {
    id: 9,
    chapter: "Resonance",
    name: "Two Doors",
    rows: 6,
    cols: 6,
    walls: [],
    exits: [
      { row: 0, col: 1, side: "mind" },
      { row: 0, col: 4, side: "mind" },
      { row: 5, col: 2, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 5, col: 1, dir: "up", side: "mind" },
      { id: "m2", row: 5, col: 4, dir: "up", side: "mind" },
      { id: "h1", row: 2, col: 0, dir: "right", side: "heart" },
    ],
    gates: [
      { row: 1, col: 1, color: "blue" },
      { row: 1, col: 4, color: "blue" },
    ],
    switches: [{ row: 2, col: 2, color: "blue" }],
    tutorial:
      "One switch can open several gates of its color. Free the switch-runner first.",
  },

  // 10 — Grand finale: breakable + key + gate combined.
  {
    id: 10,
    chapter: "Union",
    name: "Free Both",
    rows: 6,
    cols: 6,
    walls: [],
    exits: [
      { row: 0, col: 2, side: "mind" },
      { row: 2, col: 5, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 5, col: 2, dir: "up", side: "mind" },
      { id: "h1", row: 2, col: 0, dir: "right", side: "heart" },
    ],
    gates: [{ row: 1, col: 2, color: "gold" }],
    keys: [{ row: 2, col: 2, color: "gold" }],
    breakables: [{ row: 3, col: 2 }],
    tutorial:
      "Everything at once: Heart grabs the key and opens the gate. Mind breaks the cracked wall and rises to freedom.",
  },
];

const SHIP_LEVELS: LevelConfig[] = LEVELS.map((l, i) => ({ ...l, id: i + 1 }));



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
  totals,
}: {
  muted: boolean;
  onToggleMute: () => void;
  totals: Totals;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <Link
        to="/challenges"
        className="group inline-flex items-center gap-2 rounded-full border border-fuchsia-400/30 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white/80 backdrop-blur-xl transition hover:border-fuchsia-400/60 hover:bg-white/[0.08]"
        aria-label="Back"
      >
        <span
          className="relative flex h-7 w-7 items-center justify-center rounded-full"
          style={{
            background:
              "conic-gradient(from 180deg,#a78bfa,#ec4899,#f472b6,#a78bfa)",
          }}
        >
          <span className="absolute inset-[2px] rounded-full bg-[#0a0616]" />
          <Sparkles className="relative h-3.5 w-3.5 text-fuchsia-300" />
        </span>
        <span className="font-display text-sm tracking-[0.28em] text-white">
          UNVEIL
        </span>
      </Link>

      <div className="flex items-center gap-2">
        <Chip
          icon={<Heart className="h-3.5 w-3.5 fill-pink-400 text-pink-300" />}
          value={totals.lovePoints.toLocaleString()}
          ring="from-pink-500/70 to-fuchsia-500/70"
        />
        <Chip
          icon={<Gem className="h-3.5 w-3.5 text-amber-300" />}
          value={totals.xp.toLocaleString()}
          ring="from-amber-400/70 to-orange-500/70"
        />
        <button
          onClick={onToggleMute}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 backdrop-blur hover:bg-white/[0.1]"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </button>
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 backdrop-blur hover:bg-white/[0.1]"
          aria-label="Menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Chip({
  icon,
  value,
  ring,
}: {
  icon: React.ReactNode;
  value: string;
  ring: string;
}) {
  return (
    <div className="relative">
      <div
        className={`absolute -inset-[1px] rounded-full bg-gradient-to-r ${ring} opacity-70 blur-[2px]`}
      />
      <div className="relative flex items-center gap-1.5 rounded-full bg-[#0a0616]/90 px-2.5 py-1 backdrop-blur">
        {icon}
        <span className="font-mono text-[11px] font-semibold text-white">
          {value}
        </span>
        <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/80">
          +
        </span>
      </div>
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
  const [openGates, setOpenGates] = useState<Set<string>>(new Set());
  const [brokenWalls, setBrokenWalls] = useState<Set<string>>(new Set());
  const [collectedKeys, setCollectedKeys] = useState<Set<string>>(new Set());
  const [usedPortals, setUsedPortals] = useState<Set<string>>(new Set());
  const [triggeredSwitches, setTriggeredSwitches] = useState<Set<string>>(
    new Set(),
  );

  interface Snapshot {
    arrowId: string;
    openGates: Set<string>;
    brokenWalls: Set<string>;
    collectedKeys: Set<string>;
    usedPortals: Set<string>;
    triggeredSwitches: Set<string>;
  }
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState<string | null>(level.tutorial ?? null);
  const [blockerId, setBlockerId] = useState<string | null>(null);
  const [blockerCell, setBlockerCell] = useState<string | null>(null);
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
    if (!blockerId && !blockerCell) return;
    const t = setTimeout(() => {
      setBlockerId(null);
      setBlockerCell(null);
    }, 1800);
    return () => clearTimeout(t);
  }, [blockerId, blockerCell]);

  // Message auto-clear (except tutorial on level 1)
  useEffect(() => {
    if (!message || message === level.tutorial) return;
    const t = setTimeout(() => setMessage(null), 3400);
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

  const wallSet = useMemo(
    () => new Set(level.walls.map(([r, c]) => `${r},${c}`)),
    [level.walls],
  );

  const releaseArrow = (id: string) => {
    if (paused) return;
    const arrow = arrows.find((a) => a.id === id);
    if (!arrow || arrow.freed || arrow.animating) return;

    const result = traceArrow(arrow, arrows, level, {
      wallSet,
      openGates,
      brokenWalls,
      collectedKeys,
      usedPortals,
      triggeredSwitches,
    });

    if (!result.escaped) {
      setMessage(result.reason ?? "This arrow has nowhere to go.");
      if (result.blockerId) setBlockerId(result.blockerId);
      if (result.blockerCell) setBlockerCell(result.blockerCell);
      playTone(180, 0.18, "sawtooth");
      return;
    }

    // Snapshot BEFORE mutating so Undo can restore.
    const snapshot: Snapshot = {
      arrowId: arrow.id,
      openGates: new Set(openGates),
      brokenWalls: new Set(brokenWalls),
      collectedKeys: new Set(collectedKeys),
      usedPortals: new Set(usedPortals),
      triggeredSwitches: new Set(triggeredSwitches),
    };

    // Animate
    playTone(arrow.side === "mind" ? 660 : 520, 0.15, "triangle");
    setArrows((prev) =>
      prev.map((a) =>
        a.id === arrow.id
          ? { ...a, animating: true, progress: 0, trajectory: result.trajectory }
          : a,
      ),
    );
    setMoves((m) => m + 1);
    setHistory((h) => [...h, snapshot]);

    // Apply world-state mutations from the trace.
    if (result.opens.length)
      setOpenGates((s) => new Set([...s, ...result.opens]));
    if (result.breaks.length)
      setBrokenWalls((s) => new Set([...s, ...result.breaks]));
    if (result.collects.length)
      setCollectedKeys((s) => new Set([...s, ...result.collects]));
    if (result.portals.length)
      setUsedPortals((s) => new Set([...s, ...result.portals]));
    if (result.switches.length)
      setTriggeredSwitches((s) => new Set([...s, ...result.switches]));

    const stepMs = 90;
    const totalSteps = result.trajectory.length - 1;
    let step = 0;
    const iv = setInterval(() => {
      step += 1;
      const p = totalSteps > 0 ? step / totalSteps : 1;
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
    setOpenGates(last.openGates);
    setBrokenWalls(last.brokenWalls);
    setCollectedKeys(last.collectedKeys);
    setUsedPortals(last.usedPortals);
    setTriggeredSwitches(last.triggeredSwitches);
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
    setOpenGates(new Set());
    setBrokenWalls(new Set());
    setCollectedKeys(new Set());
    setUsedPortals(new Set());
    setTriggeredSwitches(new Set());
    setHistory([]);
    setMoves(0);
    setElapsed(0);
    setBlockerId(null);
    setBlockerCell(null);
    setMessage(level.tutorial ?? "Level reset.");
  };

  const hint = () => {
    const state = {
      wallSet,
      openGates,
      brokenWalls,
      collectedKeys,
      usedPortals,
      triggeredSwitches,
    };
    const solvable = arrows.find(
      (a) => !a.freed && traceArrow(a, arrows, level, state).escaped,
    );
    if (solvable) {
      setBlockerId(solvable.id);
      setMessage(
        `Try releasing the ${cap(solvable.side)} arrow ${DIR_LABEL[solvable.dir]}.`,
      );
    } else {
      setMessage("No arrow can move right now. Try Undo or Restart.");
    }
    setShowHint(true);
    setTimeout(() => setShowHint(false), 2000);
  };



  const best = undefined; // best comes from parent progress; kept optional
  const freezes = 1;
  const hintsLeft = 3;
  const undosLeft = Math.max(0, 2 - history.length);

  return (
    <div className="space-y-4">
      {/* ── Title block: brain / heart flanking headline ─────────────── */}
      <TitleBlock onExit={onExit} />

      {/* ── HUD row: Moves, Level, Timer, Stars, Reward ──────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <StatCard
          icon={<Heart className="h-4 w-4 fill-pink-400 text-pink-300" />}
          label="Moves"
          value={`${moves}/${Math.max(36, level.arrows.length * 12)}`}
          tone="pink"
        />
        <StatCard
          icon={<Zap className="h-4 w-4 text-amber-300" />}
          label={`Level ${level.id}`}
          value={level.chapter}
          tone="amber"
        />
        <StatCard
          icon={<Timer className="h-4 w-4 text-cyan-300" />}
          label={formatTime(elapsed)}
          value={best ? `Best: ${formatTime(best)}` : "Best: —"}
          tone="cyan"
        />
        <StatCard
          icon={<Star className="h-4 w-4 fill-amber-300 text-amber-300" />}
          label={`${starsPreview(moves, level.arrows.length, elapsed)} Stars`}
          value={<StarRow count={starsPreview(moves, level.arrows.length, elapsed)} />}
          tone="amber"
        />
        <StatCard
          icon={<Gift className="h-4 w-4 text-fuchsia-300" />}
          label="Daily Reward"
          value="Claim in 12h"
          tone="fuchsia"
        />
      </div>

      {/* ── Board + side rails ───────────────────────────────────────── */}
      <div className="relative flex gap-3">
        {/* Left tool rail */}
        <div className="hidden flex-col gap-2 sm:flex">
          <ToolPill
            icon={<Lightbulb className="h-5 w-5 text-amber-300" />}
            label="Hint"
            badge={hintsLeft}
            onClick={hint}
          />
          <ToolPill
            icon={<Undo2 className="h-5 w-5 text-fuchsia-300" />}
            label="Undo"
            badge={undosLeft}
            onClick={undo}
            disabled={history.length === 0}
          />
          <ToolPill
            icon={<Snowflake className="h-5 w-5 text-cyan-300" />}
            label="Freeze"
            badge={freezes}
            onClick={() => setPaused((p) => !p)}
          />
        </div>

        <div className="relative flex-1">
          <PremiumFrame>
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
          </PremiumFrame>
        </div>

        {/* Right rewards column */}
        <div className="hidden w-24 flex-col gap-2 sm:flex">
          <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/25 bg-white/[0.04] p-3 text-center backdrop-blur-xl">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/60">
              Path
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/60">
              Rewards
            </div>
            <div className="mt-3 space-y-2">
              <RewardRow
                icon={<Heart className="h-4 w-4 fill-pink-400 text-pink-300" />}
                value="50"
              />
              <RewardRow
                icon={<Key className="h-4 w-4 text-amber-300" />}
                value="+1"
              />
              <RewardRow
                icon={<Star className="h-4 w-4 fill-fuchsia-400 text-fuchsia-300" />}
                value="+20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile tool rail */}
      <div className="flex items-center justify-center gap-2 sm:hidden">
        <ToolPill
          icon={<Lightbulb className="h-4 w-4 text-amber-300" />}
          label="Hint"
          badge={hintsLeft}
          onClick={hint}
          compact
        />
        <ToolPill
          icon={<Undo2 className="h-4 w-4 text-fuchsia-300" />}
          label="Undo"
          badge={undosLeft}
          onClick={undo}
          disabled={history.length === 0}
          compact
        />
        <ToolPill
          icon={<Snowflake className="h-4 w-4 text-cyan-300" />}
          label="Freeze"
          badge={freezes}
          onClick={() => setPaused((p) => !p)}
          compact
        />
        <ToolPill
          icon={<RotateCcw className="h-4 w-4 text-white/80" />}
          label="Reset"
          onClick={restart}
          compact
        />
      </div>

      {message && (
        <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/30 bg-white/[0.04] p-3 pl-11 text-sm text-white/90 backdrop-blur-xl">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-lg"
            aria-hidden
          >
            🌿
          </span>
          {message}
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-300"
            aria-hidden
          >
            <Heart className="h-4 w-4 fill-pink-400 text-pink-300" />
          </span>
        </div>
      )}

      {/* Subtitle + Skip Level button */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-center text-xs text-white/70 sm:text-left">
          Clear the confusion, release what holds you back, and open the doors
          to <span className="text-pink-300">love</span> and{" "}
          <span className="text-cyan-300">clarity</span>.
        </p>
        <button
          onClick={restart}
          className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          style={{
            background:
              "linear-gradient(90deg,#a78bfa,#ec4899,#f59e0b,#ec4899,#a78bfa)",
            backgroundSize: "200% 100%",
            animation: "fymhFlow 6s linear infinite",
            boxShadow: "0 0 24px -6px rgba(236,72,153,0.7)",
          }}
        >
          Reset Level{" "}
          <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-xs">
            <Gem className="h-3 w-3 text-amber-200" /> 50
          </span>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Premium play-screen chrome

function TitleBlock({ onExit }: { onExit: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-5 text-center backdrop-blur-xl">
      <button
        onClick={onExit}
        className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-1 text-[10px] text-white/70 hover:bg-white/[0.12]"
        aria-label="Back to levels"
      >
        <ArrowLeft className="h-3 w-3" /> Levels
      </button>
      <div
        className="pointer-events-none absolute -left-2 top-6 h-24 w-24 opacity-90"
        style={{ animation: "fymhIdle 3s ease-in-out infinite" }}
      >
        <Brain
          className="h-full w-full text-cyan-300"
          style={{
            filter:
              "drop-shadow(0 0 14px rgba(103,232,249,0.9)) drop-shadow(0 0 30px rgba(59,130,246,0.6))",
          }}
        />
      </div>
      <div
        className="pointer-events-none absolute -right-2 top-6 h-24 w-24 opacity-90"
        style={{ animation: "fymhIdle 3.4s ease-in-out infinite" }}
      >
        <Heart
          className="h-full w-full fill-pink-400 text-pink-400"
          style={{
            filter:
              "drop-shadow(0 0 14px rgba(244,114,182,0.9)) drop-shadow(0 0 30px rgba(217,70,239,0.6))",
          }}
        />
      </div>
      <div className="relative">
        <div className="font-mono text-[10px] uppercase tracking-[0.5em] text-white/60">
          UNVEIL · NEW CHALLENGE
        </div>
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">
          <span className="block text-white">FREE YOUR</span>
          <span className="inline-block bg-gradient-to-r from-cyan-300 via-white to-pink-300 bg-clip-text text-transparent">
            MIND &amp; HEART
          </span>
        </h1>
        <p className="mt-2 text-xs text-white/70 sm:text-sm">
          Piece by piece, love comes into view. Guide the arrows to set both{" "}
          <span className="font-semibold text-amber-200">FREE</span>.
        </p>
      </div>
    </div>
  );
}

function PremiumFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* animated gradient border */}
      <div
        className="absolute -inset-[1.5px] rounded-[26px] opacity-90"
        style={{
          background:
            "conic-gradient(from 0deg,#a78bfa,#ec4899,#f59e0b,#22d3ee,#a78bfa)",
          filter: "blur(10px)",
          animation: "fymhFlow 12s linear infinite",
        }}
      />
      <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-b from-[#120a24]/95 to-[#0b0518]/95 p-3 shadow-[0_30px_80px_-30px_rgba(167,139,250,0.6)] backdrop-blur-xl sm:p-4">
        {/* dot star field inside board */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        {children}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone: "pink" | "cyan" | "amber" | "fuchsia";
}) {
  const ring = {
    pink: "shadow-[0_0_18px_-4px_rgba(244,114,182,0.5)] border-pink-400/25",
    cyan: "shadow-[0_0_18px_-4px_rgba(103,232,249,0.5)] border-cyan-400/25",
    amber: "shadow-[0_0_18px_-4px_rgba(251,191,36,0.5)] border-amber-400/25",
    fuchsia:
      "shadow-[0_0_18px_-4px_rgba(217,70,239,0.5)] border-fuchsia-400/25",
  }[tone];
  return (
    <div
      className={`flex items-center gap-2 rounded-2xl border bg-white/[0.03] px-3 py-2 backdrop-blur-xl ${ring}`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
        {icon}
      </div>
      <div className="min-w-0 leading-tight">
        <div className="truncate font-mono text-[10px] uppercase tracking-wider text-white/60">
          {label}
        </div>
        <div className="truncate text-sm font-semibold text-white">{value}</div>
      </div>
    </div>
  );
}

function StarRow({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          className={`h-3 w-3 ${
            n <= count
              ? "fill-amber-300 text-amber-300"
              : "text-white/25"
          }`}
        />
      ))}
    </span>
  );
}

function ToolPill({
  icon,
  label,
  badge,
  onClick,
  disabled,
  compact,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl transition hover:border-fuchsia-400/50 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40 ${
        compact ? "h-14 w-16 gap-0.5 px-2" : "h-16 w-16 gap-1 p-2"
      }`}
    >
      {typeof badge === "number" && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-1 font-mono text-[10px] font-bold text-white shadow">
          {badge}
        </span>
      )}
      {icon}
      <span className="text-[10px] font-medium text-white/80">{label}</span>
    </button>
  );
}

function RewardRow({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-2 py-1">
      {icon}
      <span className="font-mono text-xs font-bold text-white">{value}</span>
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function starsPreview(moves: number, arrowCount: number, seconds: number) {
  return starsFor(moves, arrowCount, seconds);
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

// (Legacy TopBar / ToolButton removed — replaced by TitleBlock + StatCards + ToolPill.)

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
      {/* Neon pathway backdrop under all cells */}
      <div
        className="pointer-events-none absolute -inset-2 rounded-2xl opacity-60"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, rgba(103,232,249,0.15), transparent 55%), radial-gradient(circle at 80% 70%, rgba(244,114,182,0.18), transparent 55%)",
        }}
      />

      {/* Grid cells */}
      {Array.from({ length: level.rows }).map((_, r) =>
        Array.from({ length: level.cols }).map((_, c) => {
          const isWall = wallSet.has(`${r},${c}`);
          const exit = level.exits.find((e) => e.row === r && e.col === c);
          return (
            <div
              key={`${r}-${c}`}
              className={`absolute rounded-xl ${
                isWall
                  ? "border border-fuchsia-500/20 bg-[#160a2c]/90"
                  : "border border-white/[0.06] bg-white/[0.015]"
              }`}
              style={{
                ...cellStyle(r, c),
                boxShadow: isWall
                  ? "inset 0 0 12px rgba(217,70,239,0.25)"
                  : "inset 0 0 6px rgba(167,139,250,0.08)",
              }}
            >
              {isWall && (
                <div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background:
                      "repeating-linear-gradient(45deg, rgba(217,70,239,0.15) 0 4px, transparent 4px 9px)",
                  }}
                />
              )}
              {exit && <DoorExit side={exit.side} />}
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
        const isMind = a.side === "mind";
        const Icon = isMind ? Brain : Heart;
        const glow = isBlocker
          ? "0 0 30px 4px rgba(248,113,113,0.85)"
          : isHint
            ? "0 0 30px 4px rgba(251,191,36,0.85)"
            : isMind
              ? "0 0 24px 2px rgba(34,211,238,0.7), 0 0 60px rgba(59,130,246,0.35)"
              : "0 0 24px 2px rgba(244,114,182,0.7), 0 0 60px rgba(217,70,239,0.35)";
        const border = isBlocker
          ? "rgba(248,113,113,0.9)"
          : isHint
            ? "rgba(251,191,36,0.9)"
            : isMind
              ? "rgba(103,232,249,0.75)"
              : "rgba(244,114,182,0.8)";
        const bg = isMind
          ? "linear-gradient(140deg, rgba(103,232,249,0.35), rgba(59,130,246,0.5))"
          : "linear-gradient(140deg, rgba(244,114,182,0.4), rgba(217,70,239,0.55))";

        return (
          <button
            key={a.id}
            onClick={() => onArrowTap(a.id)}
            disabled={a.freed || a.animating}
            className="absolute flex items-center justify-center rounded-2xl transition-all"
            style={{
              left: c * (CELL + GAP),
              top: r * (CELL + GAP),
              width: CELL,
              height: CELL,
              opacity,
              background: bg,
              border: `1.5px solid ${border}`,
              boxShadow: glow,
              animation:
                !a.animating && !a.freed
                  ? "fymhIdle 2.6s ease-in-out infinite"
                  : undefined,
              backdropFilter: "blur(6px)",
            }}
            aria-label={`${cap(a.side)} arrow pointing ${a.dir}`}
          >
            {/* inner ring */}
            <span
              className="absolute inset-1 rounded-xl"
              style={{
                background:
                  "linear-gradient(180deg,rgba(255,255,255,0.14),transparent 55%)",
              }}
            />
            {/* icon (small, top-left) */}
            <Icon
              className="absolute left-1 top-1 h-3 w-3 opacity-90"
              style={{ color: isMind ? "#a5f3fc" : "#fbcfe8" }}
            />
            {/* Directional arrow indicator */}
            <span
              className="relative text-2xl font-black leading-none"
              style={{
                color: isMind
                  ? "rgba(207,250,254,0.98)"
                  : "rgba(253,232,244,0.98)",
                textShadow: `0 0 10px ${isMind ? "rgba(34,211,238,0.9)" : "rgba(244,114,182,0.9)"}, 0 1px 2px rgba(0,0,0,0.6)`,
                transform: `rotate(${dirRotation(a.dir)}deg)`,
                display: "inline-block",
              }}
            >
              ▲
            </span>
            {/* trailing sparkle when animating */}
            {a.animating && (
              <span
                className="absolute inset-0 rounded-2xl"
                style={{
                  boxShadow: `0 0 40px 8px ${isMind ? "rgba(34,211,238,0.6)" : "rgba(244,114,182,0.6)"}`,
                  animation: "fymhPulse 0.6s ease-in-out infinite",
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function DoorExit({ side }: { side: Side }) {
  const isMind = side === "mind";
  const glow = isMind
    ? "rgba(34,211,238,0.9)"
    : "rgba(244,114,182,0.9)";
  const grad = isMind
    ? "linear-gradient(180deg,#0ea5e9,#1e3a8a 70%,#0b1e3a)"
    : "linear-gradient(180deg,#ec4899,#831843 70%,#3b0a24)";
  const Icon = isMind ? Brain : Heart;
  return (
    <div className="absolute inset-1 overflow-hidden rounded-xl">
      {/* arch */}
      <div
        className="absolute inset-x-1 top-1 bottom-0 rounded-t-full"
        style={{
          background: grad,
          boxShadow: `inset 0 0 14px ${glow}, 0 0 18px ${glow}`,
        }}
      />
      {/* inner light */}
      <div
        className="absolute left-1/2 top-1/2 h-3/4 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-t-full"
        style={{
          background: `radial-gradient(circle at 50% 70%, ${glow}, transparent 70%)`,
          animation: "fymhPulse 2.4s ease-in-out infinite",
        }}
      />
      {/* icon */}
      <Icon
        className={`absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 ${isMind ? "text-cyan-100" : "text-pink-100 fill-pink-200"}`}
        style={{ filter: `drop-shadow(0 0 6px ${glow})` }}
      />
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
