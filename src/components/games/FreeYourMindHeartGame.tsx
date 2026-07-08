import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Brain,
  Diamond,
  Flame,
  Heart,
  Key as KeyIcon,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { UnveilNav } from "@/components/UnveilNav";

// ─────────────────────────────────────────────────────────────────────────────
// Types

type Dir = "up" | "down" | "left" | "right";
type Side = "mind" | "heart";
type CellType = "empty" | "wall" | "mind-exit" | "heart-exit";

interface ArrowDef {
  id: string;
  row: number;
  col: number;
  dir: Dir;
  side: Side;
}

interface LevelConfig {
  id: number;
  name: string;
  rows: number;
  cols: number;
  walls: Array<[number, number]>;
  exits: Array<{ row: number; col: number; side: Side }>;
  arrows: ArrowDef[];
  moveTarget: number;
  timeTarget: number;
  hintOrder: string[];
  tutorial?: string;
}

type ArrowStatus = "idle" | "moving" | "freed" | "lost";
interface ArrowState extends ArrowDef {
  status: ArrowStatus;
  curRow: number;
  curCol: number;
}

interface RunState {
  arrows: ArrowState[];
  moves: number;
}

interface Totals {
  lovePoints: number;
  xp: number;
  diamonds: number;
  keys: number;
  streak: number;
  lastPlayed: string | null;
}

interface Best {
  moves: number;
  time: number;
  stars: number;
}

interface Progress {
  unlocked: number;
  best: Record<number, Best>;
  totals: Totals;
}

// ─────────────────────────────────────────────────────────────────────────────
// Level configs — engine-driven; add more without code changes.

const DELTA: Record<Dir, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

const LEVELS: LevelConfig[] = [
  {
    id: 1,
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
    moveTarget: 2,
    timeTarget: 20,
    hintOrder: ["m1", "h1"],
    tutorial: "Tap an arrow to release it. Free both the Mind and the Heart.",
  },
  {
    id: 2,
    name: "Cross Currents",
    rows: 5,
    cols: 6,
    walls: [
      [2, 1],
      [2, 4],
    ],
    exits: [
      { row: 0, col: 0, side: "mind" },
      { row: 4, col: 5, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 4, col: 0, dir: "up", side: "mind" },
      { id: "h1", row: 0, col: 5, dir: "down", side: "heart" },
    ],
    moveTarget: 2,
    timeTarget: 25,
    hintOrder: ["m1", "h1"],
  },
  {
    id: 3,
    name: "Blocked Paths",
    rows: 6,
    cols: 6,
    walls: [
      [1, 2],
      [3, 3],
      [4, 1],
    ],
    exits: [
      { row: 0, col: 4, side: "mind" },
      { row: 5, col: 1, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 4, col: 4, dir: "up", side: "mind" },
      { id: "h1", row: 2, col: 1, dir: "down", side: "heart" },
      { id: "m2", row: 3, col: 4, dir: "up", side: "mind" },
    ],
    moveTarget: 3,
    timeTarget: 35,
    hintOrder: ["m1", "m2", "h1"],
  },
  {
    id: 4,
    name: "Twin Flames",
    rows: 6,
    cols: 7,
    walls: [
      [2, 2],
      [2, 4],
      [4, 3],
    ],
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
    moveTarget: 4,
    timeTarget: 40,
    hintOrder: ["m1", "h1", "m2", "h2"],
  },
  {
    id: 5,
    name: "Order of Release",
    rows: 7,
    cols: 7,
    walls: [
      [1, 3],
      [3, 1],
      [3, 5],
      [5, 3],
    ],
    exits: [
      { row: 0, col: 0, side: "mind" },
      { row: 0, col: 6, side: "mind" },
      { row: 6, col: 0, side: "heart" },
      { row: 6, col: 6, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 3, col: 0, dir: "up", side: "mind" },
      { id: "m2", row: 3, col: 6, dir: "up", side: "mind" },
      { id: "h1", row: 3, col: 2, dir: "down", side: "heart" },
      { id: "h2", row: 3, col: 4, dir: "down", side: "heart" },
      { id: "m3", row: 5, col: 5, dir: "left", side: "mind" },
    ],
    moveTarget: 5,
    timeTarget: 55,
    hintOrder: ["m3", "h1", "h2", "m1", "m2"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Persistence

const STORAGE_KEY = "unveil.fymh.v1";

function loadProgress(): Progress {
  if (typeof window === "undefined") return defaultProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Progress;
    return { ...defaultProgress(), ...parsed, best: parsed.best ?? {}, totals: { ...defaultProgress().totals, ...parsed.totals } };
  } catch {
    return defaultProgress();
  }
}

function defaultProgress(): Progress {
  return {
    unlocked: 1,
    best: {},
    totals: { lovePoints: 0, xp: 0, diamonds: 0, keys: 0, streak: 0, lastPlayed: null },
  };
}

function saveProgress(p: Progress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* quota — ignore */
  }
}

function bumpStreak(prev: Totals): Totals {
  const today = new Date().toISOString().slice(0, 10);
  if (prev.lastPlayed === today) return prev;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const streak = prev.lastPlayed === yesterday ? prev.streak + 1 : 1;
  return { ...prev, lastPlayed: today, streak };
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine helpers

function buildCellMap(level: LevelConfig): Record<string, CellType> {
  const map: Record<string, CellType> = {};
  for (const [r, c] of level.walls) map[`${r}-${c}`] = "wall";
  for (const e of level.exits) map[`${e.row}-${e.col}`] = e.side === "mind" ? "mind-exit" : "heart-exit";
  return map;
}

function initialRun(level: LevelConfig): RunState {
  return {
    moves: 0,
    arrows: level.arrows.map((a) => ({ ...a, status: "idle", curRow: a.row, curCol: a.col })),
  };
}

function starsFor(moves: number, time: number, level: LevelConfig): number {
  if (moves <= level.moveTarget && time <= level.timeTarget) return 3;
  if (moves <= level.moveTarget + 1 && time <= level.timeTarget + 15) return 2;
  return 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component

export function FreeYourMindHeartGame() {
  const [progress, setProgress] = useState<Progress>(defaultProgress);
  const [levelIndex, setLevelIndex] = useState(0);
  const [run, setRun] = useState<RunState>(() => initialRun(LEVELS[0]));
  const [history, setHistory] = useState<RunState[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [hintId, setHintId] = useState<string | null>(null);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [rewardFlash, setRewardFlash] = useState<null | { lp: number; xp: number; dia: number; keys: number; stars: number }>(null);
  const movingRef = useRef(false);

  const level = LEVELS[levelIndex];
  const cellMap = useMemo(() => buildCellMap(level), [level]);

  // Load persisted progress once on mount
  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  // Reset run when level changes
  useEffect(() => {
    setRun(initialRun(level));
    setHistory([]);
    setSeconds(0);
    setStatus("playing");
    setHintId(null);
    setRewardFlash(null);
    movingRef.current = false;
  }, [level]);

  // Timer
  useEffect(() => {
    if (paused || status !== "playing") return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [paused, status]);

  // Occupancy lookup
  const occupancy = useMemo(() => {
    const occ: Record<string, ArrowState> = {};
    for (const a of run.arrows) {
      if (a.status === "idle" || a.status === "moving" || a.status === "lost") {
        occ[`${a.curRow}-${a.curCol}`] = a;
      }
    }
    return occ;
  }, [run.arrows]);

  // Detect win condition
  useEffect(() => {
    if (status !== "playing") return;
    if (run.arrows.length === 0) return;
    const allFreed = run.arrows.every((a) => a.status === "freed");
    const anyLost = run.arrows.some((a) => a.status === "lost");
    if (allFreed) {
      handleWin();
    } else if (anyLost && !run.arrows.some((a) => a.status === "moving")) {
      setStatus("lost");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.arrows, status]);

  function releaseArrow(id: string) {
    if (status !== "playing" || paused || movingRef.current) return;
    const arrow = run.arrows.find((a) => a.id === id);
    if (!arrow || arrow.status !== "idle") return;

    // snapshot for undo
    setHistory((h) => [...h, run]);
    setHintId(null);
    movingRef.current = true;

    // Simulate flight synchronously, but animate visually via interval updates
    let cur = { r: arrow.curRow, c: arrow.curCol };
    let localArrows = run.arrows.map((a) => (a.id === id ? { ...a, status: "moving" as ArrowStatus } : a));
    setRun({ moves: run.moves + 1, arrows: localArrows });

    const [dr, dc] = DELTA[arrow.dir];
    const step = () => {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      // Off-board → lost
      if (nr < 0 || nc < 0 || nr >= level.rows || nc >= level.cols) {
        finalize("lost", cur.r, cur.c);
        return;
      }
      const key = `${nr}-${nc}`;
      const cellType = cellMap[key] ?? "empty";
      // Wall → lost
      if (cellType === "wall") {
        finalize("lost", cur.r, cur.c);
        return;
      }
      // Exit — matches side?
      if (cellType === "mind-exit" || cellType === "heart-exit") {
        const side: Side = cellType === "mind-exit" ? "mind" : "heart";
        if (side === arrow.side) {
          finalize("freed", nr, nc);
          return;
        }
        finalize("lost", cur.r, cur.c);
        return;
      }
      // Collision with any occupying arrow (except self)
      const blocker = localArrows.find(
        (a) => a.id !== id && (a.status === "idle" || a.status === "lost") && a.curRow === nr && a.curCol === nc,
      );
      if (blocker) {
        finalize("lost", cur.r, cur.c);
        return;
      }
      // Advance
      cur = { r: nr, c: nc };
      localArrows = localArrows.map((a) => (a.id === id ? { ...a, curRow: nr, curCol: nc } : a));
      setRun((prev) => ({ ...prev, arrows: localArrows }));
      window.setTimeout(step, 140);
    };

    const finalize = (final: ArrowStatus, r: number, c: number) => {
      localArrows = localArrows.map((a) =>
        a.id === id ? { ...a, status: final, curRow: r, curCol: c } : a,
      );
      setRun((prev) => ({ ...prev, arrows: localArrows }));
      movingRef.current = false;
    };

    window.setTimeout(step, 140);
  }

  function undo() {
    if (movingRef.current) return;
    const last = history[history.length - 1];
    if (!last) return;
    setRun(last);
    setHistory((h) => h.slice(0, -1));
    setStatus("playing");
    setHintId(null);
  }

  function restart() {
    if (movingRef.current) return;
    setRun(initialRun(level));
    setHistory([]);
    setSeconds(0);
    setStatus("playing");
    setHintId(null);
  }

  function showHint() {
    if (movingRef.current) return;
    const next = level.hintOrder.find((id) => run.arrows.find((a) => a.id === id)?.status === "idle");
    if (next) setHintId(next);
  }

  function handleWin() {
    const stars = starsFor(run.moves, seconds, level);
    const baseLP = 40 + level.id * 15;
    const bonusLP = stars === 3 ? 40 : stars === 2 ? 20 : 0;
    const xp = 20 + level.id * 10 + stars * 10;
    const dia = stars === 3 ? 3 : stars === 2 ? 1 : 0;
    const keys = level.id % 3 === 0 ? 1 : 0;
    const lp = baseLP + bonusLP;

    setStatus("won");
    setRewardFlash({ lp, xp, dia, keys, stars });

    setProgress((prev) => {
      const bumpedTotals = bumpStreak(prev.totals);
      const prevBest = prev.best[level.id];
      const nextBest: Best =
        !prevBest || stars > prevBest.stars || (stars === prevBest.stars && run.moves < prevBest.moves)
          ? { moves: run.moves, time: seconds, stars }
          : prevBest;
      const next: Progress = {
        unlocked: Math.max(prev.unlocked, Math.min(level.id + 1, LEVELS.length)),
        best: { ...prev.best, [level.id]: nextBest },
        totals: {
          ...bumpedTotals,
          lovePoints: bumpedTotals.lovePoints + lp,
          xp: bumpedTotals.xp + xp,
          diamonds: bumpedTotals.diamonds + dia,
          keys: bumpedTotals.keys + keys,
        },
      };
      saveProgress(next);
      return next;
    });
  }

  const nextLevel = useCallback(() => {
    if (levelIndex + 1 >= LEVELS.length) return;
    setLevelIndex((i) => i + 1);
  }, [levelIndex]);

  const best = progress.best[level.id];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,rgba(129,140,248,0.22),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(244,114,182,0.22),transparent_35%),radial-gradient(circle_at_50%_100%,rgba(217,180,74,0.15),transparent_45%),linear-gradient(180deg,#0a0620,#050214)] pb-24 text-foreground lg:pb-0">
      <UnveilNav />

      <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            to="/challenges"
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 backdrop-blur transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">UNVEIL · Signature</div>
            <h1 className="bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-pink-300 bg-clip-text font-display text-2xl font-bold text-transparent sm:text-3xl">
              Free Your Mind &amp; Heart
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:text-white"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Rewards HUD */}
        <div className="mb-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          <Chip icon={<Heart className="h-3.5 w-3.5 text-pink-300" />} label="Love" value={progress.totals.lovePoints} />
          <Chip icon={<Sparkles className="h-3.5 w-3.5 text-amber-300" />} label="XP" value={progress.totals.xp} />
          <Chip icon={<Diamond className="h-3.5 w-3.5 text-cyan-300" />} label="Gems" value={progress.totals.diamonds} />
          <Chip icon={<KeyIcon className="h-3.5 w-3.5 text-yellow-300" />} label="Keys" value={progress.totals.keys} />
          <Chip
            icon={<Flame className="h-3.5 w-3.5 text-orange-300" />}
            label="Streak"
            value={progress.totals.streak}
            className="col-span-4 sm:col-span-1"
          />
        </div>

        {/* Level info */}
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <InfoStat label="Level" value={`${level.id}/${LEVELS.length}`} />
          <InfoStat label="Moves" value={`${run.moves}/${level.moveTarget}`} />
          <InfoStat label="Time" value={`${seconds}s`} accent={seconds > level.timeTarget ? "warn" : undefined} />
          <InfoStat label="Best" value={best ? `${"★".repeat(best.stars)} · ${best.moves}m` : "—"} />
        </div>

        {level.tutorial && status === "playing" && run.moves === 0 && (
          <div className="mb-3 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-xs text-indigo-100">
            {level.tutorial}
          </div>
        )}

        {/* Board */}
        <Board
          level={level}
          cellMap={cellMap}
          arrows={run.arrows}
          occupancy={occupancy}
          hintId={hintId}
          paused={paused}
          onTap={releaseArrow}
        />

        {/* Bottom controls */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          <ControlBtn onClick={undo} disabled={!history.length || movingRef.current} icon={<Undo2 className="h-4 w-4" />} label="Undo" />
          <ControlBtn onClick={restart} icon={<RotateCcw className="h-4 w-4" />} label="Restart" />
          <ControlBtn onClick={showHint} icon={<Lightbulb className="h-4 w-4" />} label="Hint" />
          <ControlBtn
            onClick={() => setPaused((p) => !p)}
            icon={paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            label={paused ? "Resume" : "Pause"}
          />
        </div>

        {/* Level select */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">Chapters</div>
            <div className="inline-flex items-center gap-1 text-[10px] text-white/50">
              <Trophy className="h-3 w-3" /> {Object.values(progress.best).reduce((a, b) => a + b.stars, 0)}/
              {LEVELS.length * 3} stars
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {LEVELS.map((l, i) => {
              const locked = l.id > progress.unlocked;
              const stars = progress.best[l.id]?.stars ?? 0;
              const active = i === levelIndex;
              return (
                <button
                  key={l.id}
                  type="button"
                  disabled={locked}
                  onClick={() => setLevelIndex(i)}
                  className={`flex flex-col items-center rounded-2xl border p-2 text-xs transition ${
                    active
                      ? "border-fuchsia-400/60 bg-fuchsia-500/10 shadow-[0_0_20px_rgba(217,70,239,0.35)]"
                      : locked
                        ? "cursor-not-allowed border-white/5 bg-white/[0.03] text-white/30"
                        : "border-white/10 bg-white/[0.04] text-white/70 hover:border-white/30"
                  }`}
                >
                  <span className="font-display text-base">{l.id}</span>
                  <span className="mt-0.5 text-[9px] text-white/50">
                    {locked ? "Locked" : "★".repeat(stars) + "☆".repeat(3 - stars)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Overlays */}
      {status === "lost" && (
        <Overlay>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">Path collapsed</div>
          <h2 className="mb-2 font-display text-3xl">Try a different order.</h2>
          <p className="mb-5 max-w-sm text-sm text-white/70">
            An arrow lost its way. Undo the last move or restart and reconsider which side to release first.
          </p>
          <div className="flex gap-2">
            <button onClick={undo} disabled={!history.length} className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 disabled:opacity-40">
              Undo
            </button>
            <button onClick={restart} className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-2 text-sm font-medium text-white shadow-lg">
              Restart Level
            </button>
          </div>
        </Overlay>
      )}

      {status === "won" && rewardFlash && (
        <Overlay>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-amber-200/80">Level {level.id} Complete</div>
          <h2 className="mb-1 font-display text-3xl">Both are free.</h2>
          <div className="mb-4 flex items-center justify-center gap-1 text-amber-300">
            {Array.from({ length: 3 }).map((_, i) => (
              <Star key={i} className={`h-6 w-6 ${i < rewardFlash.stars ? "fill-amber-300" : "opacity-30"}`} />
            ))}
          </div>
          <div className="mb-5 grid grid-cols-4 gap-2 text-xs">
            <RewardPill icon={<Heart className="h-3.5 w-3.5 text-pink-300" />} label="Love" value={`+${rewardFlash.lp}`} />
            <RewardPill icon={<Sparkles className="h-3.5 w-3.5 text-amber-300" />} label="XP" value={`+${rewardFlash.xp}`} />
            <RewardPill icon={<Diamond className="h-3.5 w-3.5 text-cyan-300" />} label="Gems" value={`+${rewardFlash.dia}`} />
            <RewardPill icon={<KeyIcon className="h-3.5 w-3.5 text-yellow-300" />} label="Keys" value={`+${rewardFlash.keys}`} />
          </div>
          <div className="flex gap-2">
            <button onClick={restart} className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80">
              Replay
            </button>
            {levelIndex + 1 < LEVELS.length ? (
              <button
                onClick={nextLevel}
                className="rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-pink-500 px-5 py-2 text-sm font-medium text-white shadow-lg"
              >
                Next Chapter
              </button>
            ) : (
              <Link to="/challenges" className="rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-pink-500 px-5 py-2 text-sm font-medium text-white shadow-lg">
                Finish
              </Link>
            )}
          </div>
        </Overlay>
      )}

      {paused && status === "playing" && (
        <Overlay>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">Paused</div>
          <h2 className="mb-5 font-display text-3xl">Take a breath.</h2>
          <button onClick={() => setPaused(false)} className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-2 text-sm font-medium text-white">
            Resume
          </button>
        </Overlay>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Board

function Board({
  level,
  cellMap,
  arrows,
  occupancy,
  hintId,
  paused,
  onTap,
}: {
  level: LevelConfig;
  cellMap: Record<string, CellType>;
  arrows: ArrowState[];
  occupancy: Record<string, ArrowState>;
  hintId: string | null;
  paused: boolean;
  onTap: (id: string) => void;
}) {
  return (
    <div className="relative mx-auto overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-3 shadow-[0_20px_60px_-30px_rgba(129,140,248,0.5)] backdrop-blur">
      {/* Ambient particles */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute left-8 top-8 h-24 w-24 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute bottom-6 right-10 h-28 w-28 rounded-full bg-pink-500/20 blur-3xl" />
      </div>

      <div
        className="relative mx-auto grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${level.cols}, minmax(0,1fr))`,
          maxWidth: `${level.cols * 60}px`,
        }}
      >
        {Array.from({ length: level.rows }).map((_, r) =>
          Array.from({ length: level.cols }).map((_, c) => {
            const key = `${r}-${c}`;
            const type = cellMap[key] ?? "empty";
            const occ = occupancy[key];
            return (
              <Cell
                key={key}
                type={type}
                arrow={occ}
                hint={occ?.id === hintId}
                disabled={paused}
                onTap={onTap}
              />
            );
          }),
        )}

        {/* Freed / lost arrows shown as ghosts near their exit */}
        {arrows
          .filter((a) => a.status === "freed" || a.status === "lost")
          .map((a) => (
            <span
              key={`ghost-${a.id}`}
              className={`pointer-events-none absolute -z-0 h-1 w-1 ${
                a.status === "freed" ? "" : ""
              }`}
              aria-hidden
            />
          ))}
      </div>
    </div>
  );
}

function Cell({
  type,
  arrow,
  hint,
  disabled,
  onTap,
}: {
  type: CellType;
  arrow?: ArrowState;
  hint?: boolean;
  disabled?: boolean;
  onTap: (id: string) => void;
}) {
  const base = "relative aspect-square rounded-lg border transition-all duration-200";
  let cellClass = "border-white/5 bg-white/[0.02]";
  if (type === "wall") cellClass = "border-white/10 bg-black/40";
  if (type === "mind-exit")
    cellClass =
      "border-cyan-400/50 bg-cyan-500/10 shadow-[inset_0_0_12px_rgba(103,232,249,0.35)]";
  if (type === "heart-exit")
    cellClass =
      "border-pink-400/50 bg-pink-500/10 shadow-[inset_0_0_12px_rgba(244,114,182,0.35)]";

  return (
    <div className={`${base} ${cellClass}`}>
      {type === "mind-exit" && (
        <Brain className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-cyan-300/70" />
      )}
      {type === "heart-exit" && (
        <Heart className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-pink-300/70" />
      )}
      {arrow && arrow.status !== "freed" && (
        <button
          type="button"
          disabled={disabled || arrow.status !== "idle"}
          onClick={() => onTap(arrow.id)}
          className={`absolute inset-0 flex items-center justify-center rounded-lg text-xl transition-transform duration-150 ${
            arrow.side === "mind"
              ? "bg-gradient-to-br from-indigo-400/80 to-cyan-400/70 text-white shadow-[0_0_18px_rgba(103,232,249,0.55)]"
              : "bg-gradient-to-br from-fuchsia-400/80 to-pink-400/70 text-white shadow-[0_0_18px_rgba(244,114,182,0.55)]"
          } ${arrow.status === "moving" ? "scale-110 animate-pulse" : ""} ${
            arrow.status === "lost" ? "opacity-40 grayscale" : ""
          } ${hint ? "ring-2 ring-amber-300 ring-offset-1 ring-offset-transparent" : ""}`}
          aria-label={`Release ${arrow.side} arrow ${arrow.dir}`}
        >
          {arrow.dir === "up" && "↑"}
          {arrow.dir === "down" && "↓"}
          {arrow.dir === "left" && "←"}
          {arrow.dir === "right" && "→"}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small UI bits

function Chip({
  icon,
  label,
  value,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 backdrop-blur ${className}`}>
      <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.15em] text-white/50">
        {icon} {label}
      </div>
      <div className="mt-0.5 font-display text-sm text-white">{value}</div>
    </div>
  );
}

function InfoStat({ label, value, accent }: { label: string; value: string; accent?: "warn" }) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 backdrop-blur ${
        accent === "warn" ? "border-amber-400/40" : ""
      }`}
    >
      <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/50">{label}</div>
      <div className="font-display text-sm text-white">{value}</div>
    </div>
  );
}

function ControlBtn({
  onClick,
  disabled,
  icon,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex flex-col items-center gap-0.5 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-white/80 backdrop-blur transition hover:border-white/30 hover:text-white disabled:opacity-40"
    >
      {icon}
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
    </button>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-900/60 to-purple-900/40 p-6 text-center shadow-[0_30px_80px_-20px_rgba(129,140,248,0.5)]">
        {children}
      </div>
    </div>
  );
}

function RewardPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-2">
      <div className="flex items-center justify-center gap-1 text-white">{icon}<span className="font-display text-sm">{value}</span></div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-white/50">{label}</div>
    </div>
  );
}
