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
  RotateCw,
  Sparkles,
  Star,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
  Zap,
  Send,
} from "lucide-react";
import { UnveilNav } from "@/components/UnveilNav";

// ─────────────────────────────────────────────────────────────────────────────
// Types

type Dir = "up" | "down" | "left" | "right";
type Side = "mind" | "heart";
type Point = { r: number; c: number };

type CellType =
  | "empty"
  | "wall"
  | "mind-exit"
  | "heart-exit"
  | "switch-mind"
  | "switch-heart"
  | "teleport-a"
  | "teleport-b";

interface GateDef {
  id: string;
  row: number;
  col: number;
  openBy: Side;
}

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
  chapter: string;
  rows: number;
  cols: number;
  walls: Array<[number, number]>;
  exits: Array<{ row: number; col: number; side: Side }>;
  arrows: ArrowDef[];
  gates?: GateDef[];
  switches?: Array<{ row: number; col: number; side: Side; openGates: string[] }>;
  teleports?: Array<{ a: [number, number]; b: [number, number] }>;
  moveTarget: number;
  timeTarget: number;
  tutorial?: string;
}

type ArrowStatus = "idle" | "planning" | "animating" | "freed" | "lost";

interface ArrowState {
  id: string;
  side: Side;
  startRow: number;
  startCol: number;
  dir: Dir;
  plannedPath: Point[]; // includes start cell at index 0
  status: ArrowStatus;
  animIdx: number; // current index while animating
}

interface RunState {
  arrows: ArrowState[];
  moves: number;
  failReason?: string;
  collisionAt?: Point;
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
// Levels — same 12 configs as before. In the new path-planning engine, gates /
// switches / teleports render as decorative tiles and are treated as passable.
// Advanced puzzle mechanics for these will unlock in a later chapter update.

const DELTA: Record<Dir, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

const ROTATE_CW: Record<Dir, Dir> = { up: "right", right: "down", down: "left", left: "up" };
const ROTATE_CCW: Record<Dir, Dir> = { up: "left", left: "down", down: "right", right: "up" };

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
    moveTarget: 4,
    timeTarget: 40,
    tutorial: "Plan the route for each arrow, then press Release. Mind must reach a cyan exit, Heart a pink one.",
  },
  {
    id: 2,
    chapter: "Awakening",
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
    moveTarget: 8,
    timeTarget: 45,
  },
  {
    id: 3,
    chapter: "Awakening",
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
    moveTarget: 12,
    timeTarget: 60,
  },
  {
    id: 4,
    chapter: "Awakening",
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
    moveTarget: 12,
    timeTarget: 70,
  },
  {
    id: 5,
    chapter: "Awakening",
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
    moveTarget: 18,
    timeTarget: 90,
  },
  {
    id: 6,
    chapter: "Entangled",
    name: "Shared Corridor",
    rows: 6,
    cols: 6,
    walls: [
      [0, 2],
      [1, 2],
      [4, 3],
      [5, 3],
    ],
    exits: [
      { row: 0, col: 0, side: "mind" },
      { row: 5, col: 5, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 3, col: 3, dir: "left", side: "mind" },
      { id: "h1", row: 2, col: 2, dir: "right", side: "heart" },
    ],
    moveTarget: 10,
    timeTarget: 55,
    tutorial: "Two arrows share the middle. Route their paths so they don't collide at the same tile.",
  },
  {
    id: 7,
    chapter: "Entangled",
    name: "Weave",
    rows: 6,
    cols: 7,
    walls: [
      [1, 1],
      [1, 5],
      [4, 3],
    ],
    exits: [
      { row: 0, col: 3, side: "mind" },
      { row: 5, col: 3, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 3, col: 0, dir: "right", side: "mind" },
      { id: "m2", row: 3, col: 6, dir: "left", side: "mind" },
      { id: "h1", row: 5, col: 0, dir: "right", side: "heart" },
      { id: "h2", row: 5, col: 6, dir: "left", side: "heart" },
    ],
    moveTarget: 16,
    timeTarget: 80,
  },
  {
    id: 8,
    chapter: "Entangled",
    name: "Mirror Hearts",
    rows: 7,
    cols: 7,
    walls: [
      [3, 2],
      [3, 4],
    ],
    exits: [
      { row: 0, col: 1, side: "mind" },
      { row: 0, col: 5, side: "mind" },
      { row: 6, col: 1, side: "heart" },
      { row: 6, col: 5, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 5, col: 1, dir: "up", side: "mind" },
      { id: "m2", row: 5, col: 5, dir: "up", side: "mind" },
      { id: "h1", row: 1, col: 1, dir: "down", side: "heart" },
      { id: "h2", row: 1, col: 5, dir: "down", side: "heart" },
    ],
    moveTarget: 18,
    timeTarget: 90,
  },
  {
    id: 9,
    chapter: "Resonance",
    name: "Open Field",
    rows: 6,
    cols: 7,
    walls: [
      [2, 1],
      [2, 5],
    ],
    exits: [
      { row: 0, col: 3, side: "mind" },
      { row: 5, col: 0, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 4, col: 3, dir: "up", side: "mind" },
      { id: "h1", row: 5, col: 6, dir: "left", side: "heart" },
    ],
    moveTarget: 10,
    timeTarget: 60,
  },
  {
    id: 10,
    chapter: "Resonance",
    name: "Long Way Home",
    rows: 7,
    cols: 7,
    walls: [
      [3, 2],
      [3, 3],
      [3, 4],
    ],
    exits: [
      { row: 0, col: 0, side: "mind" },
      { row: 6, col: 6, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 5, col: 3, dir: "left", side: "mind" },
      { id: "h1", row: 1, col: 3, dir: "right", side: "heart" },
    ],
    moveTarget: 16,
    timeTarget: 75,
  },
  {
    id: 11,
    chapter: "Resonance",
    name: "Split Decision",
    rows: 7,
    cols: 8,
    walls: [
      [3, 2],
      [3, 3],
      [3, 4],
      [3, 5],
    ],
    exits: [
      { row: 0, col: 7, side: "mind" },
      { row: 6, col: 0, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 5, col: 7, dir: "up", side: "mind" },
      { id: "h1", row: 1, col: 0, dir: "down", side: "heart" },
      { id: "m2", row: 5, col: 0, dir: "up", side: "mind" },
    ],
    moveTarget: 20,
    timeTarget: 100,
  },
  {
    id: 12,
    chapter: "Resonance",
    name: "One Heart, One Mind",
    rows: 8,
    cols: 8,
    walls: [
      [4, 3],
      [4, 4],
      [3, 0],
      [3, 7],
    ],
    exits: [
      { row: 0, col: 3, side: "mind" },
      { row: 0, col: 4, side: "mind" },
      { row: 7, col: 3, side: "heart" },
      { row: 7, col: 4, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 6, col: 3, dir: "up", side: "mind" },
      { id: "m2", row: 6, col: 4, dir: "up", side: "mind" },
      { id: "h1", row: 1, col: 3, dir: "down", side: "heart" },
      { id: "h2", row: 1, col: 4, dir: "down", side: "heart" },
    ],
    moveTarget: 22,
    timeTarget: 110,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Persistence

const STORAGE_KEY = "unveil.fymh.v3";

function defaultProgress(): Progress {
  return {
    unlocked: 1,
    best: {},
    totals: { lovePoints: 0, xp: 0, diamonds: 0, keys: 0, streak: 0, lastPlayed: null },
  };
}

function loadProgress(): Progress {
  if (typeof window === "undefined") return defaultProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as Progress;
    return {
      ...defaultProgress(),
      ...parsed,
      best: parsed.best ?? {},
      totals: { ...defaultProgress().totals, ...parsed.totals },
    };
  } catch {
    return defaultProgress();
  }
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

function haptic(ms = 15) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* ignore */
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine helpers

function buildCellMap(level: LevelConfig): Record<string, CellType> {
  const map: Record<string, CellType> = {};
  for (const [r, c] of level.walls) map[`${r}-${c}`] = "wall";
  for (const e of level.exits) map[`${e.row}-${e.col}`] = e.side === "mind" ? "mind-exit" : "heart-exit";
  for (const s of level.switches ?? []) map[`${s.row}-${s.col}`] = s.side === "mind" ? "switch-mind" : "switch-heart";
  for (const t of level.teleports ?? []) {
    map[`${t.a[0]}-${t.a[1]}`] = "teleport-a";
    map[`${t.b[0]}-${t.b[1]}`] = "teleport-b";
  }
  return map;
}

function initialArrows(level: LevelConfig): ArrowState[] {
  return level.arrows.map((a) => ({
    id: a.id,
    side: a.side,
    startRow: a.row,
    startCol: a.col,
    dir: a.dir,
    plannedPath: [{ r: a.row, c: a.col }],
    status: "idle" as ArrowStatus,
    animIdx: 0,
  }));
}

function initialRun(level: LevelConfig): RunState {
  return { moves: 0, arrows: initialArrows(level) };
}

function starsFor(moves: number, time: number, level: LevelConfig): number {
  if (moves <= level.moveTarget && time <= level.timeTarget) return 3;
  if (moves <= level.moveTarget + 4 && time <= level.timeTarget + 20) return 2;
  return 1;
}

function keyOf(p: Point) {
  return `${p.r}-${p.c}`;
}

// Would extending an arrow's plan onto tile (nr,nc) be legal at plan time?
function canExtend(
  arrow: ArrowState,
  nr: number,
  nc: number,
  level: LevelConfig,
  cellMap: Record<string, CellType>,
  allArrows: ArrowState[],
): { ok: true } | { ok: false; reason: string } {
  if (nr < 0 || nc < 0 || nr >= level.rows || nc >= level.cols) return { ok: false, reason: "Out of bounds" };
  const tip = arrow.plannedPath[arrow.plannedPath.length - 1];
  const dr = Math.abs(nr - tip.r);
  const dc = Math.abs(nc - tip.c);
  if (dr + dc !== 1) return { ok: false, reason: "Not adjacent to the current path tip" };
  const type = cellMap[`${nr}-${nc}`] ?? "empty";
  if (type === "wall") return { ok: false, reason: "That tile is a wall" };
  // Cannot cross another arrow's start cell
  for (const other of allArrows) {
    if (other.id === arrow.id) continue;
    if (other.startRow === nr && other.startCol === nc) return { ok: false, reason: "Another arrow starts there" };
  }
  // Cannot revisit a cell already in your own path (except undo)
  if (arrow.plannedPath.some((p) => p.r === nr && p.c === nc)) {
    return { ok: false, reason: "Your path already visits that tile" };
  }
  // Cannot end early on an exit of the wrong side (allowed to pass through? No — exits are terminal, so stop there)
  if (type === "mind-exit" && arrow.side !== "mind") return { ok: false, reason: "That's a Mind exit" };
  if (type === "heart-exit" && arrow.side !== "heart") return { ok: false, reason: "That's a Heart exit" };
  return { ok: true };
}

function dirBetween(a: Point, b: Point): Dir | null {
  if (b.r === a.r - 1 && b.c === a.c) return "up";
  if (b.r === a.r + 1 && b.c === a.c) return "down";
  if (b.r === a.r && b.c === a.c - 1) return "left";
  if (b.r === a.r && b.c === a.c + 1) return "right";
  return null;
}

// Every arrow's path must end on a matching exit for a valid release.
function validateForRelease(arrows: ArrowState[], cellMap: Record<string, CellType>): { ok: true } | { ok: false; reason: string } {
  for (const a of arrows) {
    if (a.plannedPath.length < 2) return { ok: false, reason: `Plan a path for the ${a.side === "mind" ? "Mind" : "Heart"} arrow first.` };
    const tip = a.plannedPath[a.plannedPath.length - 1];
    const type = cellMap[`${tip.r}-${tip.c}`] ?? "empty";
    const needed = a.side === "mind" ? "mind-exit" : "heart-exit";
    if (type !== needed) {
      return { ok: false, reason: `${a.side === "mind" ? "Mind" : "Heart"} path must end on a matching exit.` };
    }
  }
  // Check for simultaneous collisions during animation
  const maxLen = Math.max(...arrows.map((a) => a.plannedPath.length));
  for (let t = 0; t < maxLen; t++) {
    const seen = new Map<string, ArrowState>();
    for (const a of arrows) {
      const idx = Math.min(t, a.plannedPath.length - 1);
      // once freed (finished path), don't collide anymore
      if (t >= a.plannedPath.length) continue;
      const p = a.plannedPath[idx];
      const k = keyOf(p);
      const other = seen.get(k);
      if (other) {
        return { ok: false, reason: `Paths collide at row ${p.r + 1}, col ${p.c + 1}. Reroute one of them.` };
      }
      seen.set(k, a);
    }
    // Also check swap-collision (two arrows crossing on the same edge)
    for (const a of arrows) {
      if (t + 1 >= a.plannedPath.length) continue;
      const aFrom = a.plannedPath[t];
      const aTo = a.plannedPath[t + 1];
      for (const b of arrows) {
        if (b.id === a.id) continue;
        if (t + 1 >= b.plannedPath.length) continue;
        const bFrom = b.plannedPath[t];
        const bTo = b.plannedPath[t + 1];
        if (aFrom.r === bTo.r && aFrom.c === bTo.c && aTo.r === bFrom.r && aTo.c === bFrom.c) {
          return { ok: false, reason: `Two arrows swap through each other at row ${aTo.r + 1}, col ${aTo.c + 1}.` };
        }
      }
    }
  }
  return { ok: true };
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
  const [status, setStatus] = useState<"planning" | "animating" | "won" | "lost">("planning");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rewardFlash, setRewardFlash] = useState<null | { lp: number; xp: number; dia: number; keys: number; stars: number }>(null);
  const [victoryTick, setVictoryTick] = useState(0);
  const [releaseError, setReleaseError] = useState<string | null>(null);

  const level = LEVELS[levelIndex];
  const cellMap = useMemo(() => buildCellMap(level), [level]);

  useEffect(() => setProgress(loadProgress()), []);

  // Reset when level changes
  useEffect(() => {
    setRun(initialRun(level));
    setHistory([]);
    setSeconds(0);
    setStatus("planning");
    setSelectedId(level.arrows[0]?.id ?? null);
    setRewardFlash(null);
    setReleaseError(null);
  }, [level]);

  // Timer
  useEffect(() => {
    if (paused || status !== "planning") return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [paused, status]);

  const selectedArrow = useMemo(
    () => run.arrows.find((a) => a.id === selectedId) ?? null,
    [run.arrows, selectedId],
  );

  const pushHistory = useCallback(() => setHistory((h) => [...h, run]), [run]);

  // Extend selected arrow's plan by one tile in direction `d`
  const extendSelected = useCallback(
    (d: Dir) => {
      if (status !== "planning" || paused) return;
      const arrow = run.arrows.find((a) => a.id === selectedId);
      if (!arrow) return;
      const tip = arrow.plannedPath[arrow.plannedPath.length - 1];
      const [dr, dc] = DELTA[d];
      const nr = tip.r + dr;
      const nc = tip.c + dc;
      const check = canExtend(arrow, nr, nc, level, cellMap, run.arrows);
      if (!check.ok) {
        setReleaseError(check.reason);
        haptic(6);
        return;
      }
      pushHistory();
      setReleaseError(null);
      haptic(8);
      setRun((prev) => ({
        ...prev,
        moves: prev.moves + 1,
        arrows: prev.arrows.map((a) =>
          a.id === arrow.id
            ? {
                ...a,
                dir: d,
                plannedPath: [...a.plannedPath, { r: nr, c: nc }],
              }
            : a,
        ),
      }));
    },
    [cellMap, level, paused, pushHistory, run.arrows, selectedId, status],
  );

  const undoOne = useCallback(() => {
    if (status !== "planning") return;
    const last = history[history.length - 1];
    if (!last) return;
    setRun(last);
    setHistory((h) => h.slice(0, -1));
    setReleaseError(null);
    haptic(8);
  }, [history, status]);

  const restartLevel = useCallback(() => {
    setRun(initialRun(level));
    setHistory([]);
    setSeconds(0);
    setStatus("planning");
    setSelectedId(level.arrows[0]?.id ?? null);
    setReleaseError(null);
    haptic(10);
  }, [level]);

  const rotateSelected = useCallback(
    (cw: boolean) => {
      if (status !== "planning") return;
      const arrow = run.arrows.find((a) => a.id === selectedId);
      if (!arrow) return;
      setRun((prev) => ({
        ...prev,
        arrows: prev.arrows.map((a) =>
          a.id === arrow.id ? { ...a, dir: cw ? ROTATE_CW[a.dir] : ROTATE_CCW[a.dir] } : a,
        ),
      }));
      haptic(6);
    },
    [run.arrows, selectedId, status],
  );

  const cycleSelected = useCallback(
    (delta: number) => {
      if (run.arrows.length === 0) return;
      const idx = Math.max(0, run.arrows.findIndex((a) => a.id === selectedId));
      const next = (idx + delta + run.arrows.length) % run.arrows.length;
      setSelectedId(run.arrows[next].id);
    },
    [run.arrows, selectedId],
  );

  const releaseAll = useCallback(() => {
    if (status !== "planning" || paused) return;
    const check = validateForRelease(run.arrows, cellMap);
    if (!check.ok) {
      setReleaseError(check.reason);
      haptic(30);
      return;
    }
    setReleaseError(null);
    setStatus("animating");
    haptic(20);
    // Start animation: advance every arrow's animIdx over time
    setRun((prev) => ({
      ...prev,
      arrows: prev.arrows.map((a) => ({ ...a, status: "animating" as ArrowStatus, animIdx: 0 })),
    }));
  }, [cellMap, paused, run.arrows, status]);

  // Animation loop
  useEffect(() => {
    if (status !== "animating") return;
    const timer = window.setInterval(() => {
      setRun((prev) => {
        const next = prev.arrows.map((a) => {
          if (a.status !== "animating") return a;
          const nextIdx = a.animIdx + 1;
          if (nextIdx >= a.plannedPath.length) {
            return { ...a, status: "freed" as ArrowStatus, animIdx: a.plannedPath.length - 1 };
          }
          return { ...a, animIdx: nextIdx };
        });
        return { ...prev, arrows: next };
      });
    }, 160);
    return () => window.clearInterval(timer);
  }, [status]);

  // Detect end of animation
  useEffect(() => {
    if (status !== "animating") return;
    const stillMoving = run.arrows.some((a) => a.status === "animating");
    if (!stillMoving) {
      const allFreed = run.arrows.every((a) => a.status === "freed");
      if (allFreed) {
        handleWin();
      } else {
        setStatus("lost");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.arrows, status]);

  function handleWin() {
    const stars = starsFor(run.moves, seconds, level);
    const baseLP = 40 + level.id * 15;
    const bonusLP = stars === 3 ? 40 : stars === 2 ? 20 : 0;
    const xp = 20 + level.id * 10 + stars * 10;
    const dia = stars === 3 ? 3 : stars === 2 ? 1 : 0;
    const keys = level.id % 3 === 0 ? 1 : 0;
    const lp = baseLP + bonusLP;

    setStatus("won");
    setVictoryTick((v) => v + 1);
    setRewardFlash({ lp, xp, dia, keys, stars });
    haptic(60);

    setProgress((prev) => {
      const bumped = bumpStreak(prev.totals);
      const prevBest = prev.best[level.id];
      const nextBest: Best =
        !prevBest || stars > prevBest.stars || (stars === prevBest.stars && run.moves < prevBest.moves)
          ? { moves: run.moves, time: seconds, stars }
          : prevBest;
      const next: Progress = {
        unlocked: Math.max(prev.unlocked, Math.min(level.id + 1, LEVELS.length)),
        best: { ...prev.best, [level.id]: nextBest },
        totals: {
          ...bumped,
          lovePoints: bumped.lovePoints + lp,
          xp: bumped.xp + xp,
          diamonds: bumped.diamonds + dia,
          keys: bumped.keys + keys,
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

  // Keyboard controls
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onKey(e: KeyboardEvent) {
      if (paused) return;
      if (status !== "planning") return;
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          extendSelected("up");
          break;
        case "ArrowDown":
          e.preventDefault();
          extendSelected("down");
          break;
        case "ArrowLeft":
          e.preventDefault();
          extendSelected("left");
          break;
        case "ArrowRight":
          e.preventDefault();
          extendSelected("right");
          break;
        case "Backspace":
        case "z":
        case "Z":
          e.preventDefault();
          undoOne();
          break;
        case "r":
        case "R":
          e.preventDefault();
          rotateSelected(!e.shiftKey);
          break;
        case "Enter":
          e.preventDefault();
          releaseAll();
          break;
        case "Tab":
          e.preventDefault();
          cycleSelected(e.shiftKey ? -1 : 1);
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cycleSelected, extendSelected, paused, releaseAll, rotateSelected, status, undoOne]);

  function onCellClick(r: number, c: number) {
    if (status !== "planning" || paused) return;
    // Click an arrow's start cell → select it
    const arrowHere = run.arrows.find((a) => a.startRow === r && a.startCol === c);
    if (arrowHere) {
      setSelectedId(arrowHere.id);
      setReleaseError(null);
      haptic(6);
      return;
    }
    // Click on any tile → try to extend selected arrow towards that tile if adjacent to its tip
    const arrow = run.arrows.find((a) => a.id === selectedId);
    if (!arrow) return;
    const tip = arrow.plannedPath[arrow.plannedPath.length - 1];
    const d = dirBetween(tip, { r, c });
    if (d) {
      extendSelected(d);
      return;
    }
    // Click on previous cell in own path → undo
    if (arrow.plannedPath.length >= 2) {
      const prev = arrow.plannedPath[arrow.plannedPath.length - 2];
      if (prev.r === r && prev.c === c) {
        undoOne();
        return;
      }
    }
  }

  const best = progress.best[level.id];
  const totalStars = Object.values(progress.best).reduce((a, b) => a + b.stars, 0);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_10%,rgba(129,140,248,0.22),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(244,114,182,0.22),transparent_35%),radial-gradient(circle_at_50%_100%,rgba(217,180,74,0.15),transparent_45%),linear-gradient(180deg,#0a0620,#050214)] pb-24 text-foreground lg:pb-0">
      <StyleTag />
      <AmbientAurora />
      <UnveilNav />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-5 sm:px-6">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            to="/challenges"
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 backdrop-blur transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <div className="text-center">
            <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
              UNVEIL · Signature · {level.chapter}
            </div>
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
          <InfoStat label="Chapter" value={`${level.id} · ${level.name}`} />
          <InfoStat label="Moves" value={`${run.moves}/${level.moveTarget}`} accent={run.moves > level.moveTarget ? "warn" : undefined} />
          <InfoStat label="Time" value={`${seconds}s`} accent={seconds > level.timeTarget ? "warn" : undefined} />
          <InfoStat label="Best" value={best ? `${"★".repeat(best.stars)} · ${best.moves}m · ${best.time}s` : "—"} />
        </div>

        {level.id === 1 ? (
          <Level1Coach arrows={run.arrows} />
        ) : (
          level.tutorial && (
            <div className="mb-3 flex items-start gap-2 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-xs text-indigo-100 backdrop-blur">
              <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-300" />
              <span>{level.tutorial}</span>
            </div>
          )
        )}

        {/* Board */}
        <Board
          level={level}
          cellMap={cellMap}
          arrows={run.arrows}
          selectedId={selectedId}
          onCellClick={onCellClick}
          animating={status === "animating"}
        />

        {/* Status / error line */}
        {releaseError && status === "planning" && (
          <div className="mt-3 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-xs text-rose-100 backdrop-blur">
            {releaseError}
          </div>
        )}
        {status === "planning" && !releaseError && selectedArrow && (
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80 backdrop-blur">
            {planningHint(selectedArrow, cellMap)}
          </div>
        )}

        {/* Bottom controls */}
        <div className="mt-4 grid grid-cols-5 gap-2">
          <ControlBtn onClick={undoOne} disabled={!history.length || status !== "planning"} icon={<Undo2 className="h-4 w-4" />} label="Undo" />
          <ControlBtn onClick={restartLevel} icon={<RotateCcw className="h-4 w-4" />} label="Restart" />
          <ControlBtn
            onClick={() => rotateSelected(true)}
            disabled={status !== "planning" || !selectedArrow}
            icon={<RotateCw className="h-4 w-4" />}
            label="Rotate"
          />
          <ControlBtn
            onClick={() => setPaused((p) => !p)}
            icon={paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            label={paused ? "Resume" : "Pause"}
          />
          <button
            type="button"
            onClick={releaseAll}
            disabled={status !== "planning"}
            className="inline-flex flex-col items-center gap-0.5 rounded-2xl border border-fuchsia-400/50 bg-gradient-to-r from-indigo-500/40 via-fuchsia-500/40 to-pink-500/40 px-3 py-2 text-white shadow-[0_0_20px_rgba(217,70,239,0.35)] transition hover:brightness-110 active:scale-95 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-wide">Release</span>
          </button>
        </div>

        {/* Keyboard help */}
        <div className="mt-3 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-white/40">
          Click a tile · Arrow keys · Tab to switch · Backspace to undo · Enter to release
        </div>

        {/* Level select */}
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/50">Chapters</div>
            <div className="inline-flex items-center gap-1 text-[10px] text-white/50">
              <Trophy className="h-3 w-3" /> {totalStars}/{LEVELS.length * 3} stars
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-12">
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
                  title={l.name}
                >
                  <span className="font-display text-base">{l.id}</span>
                  <span className="mt-0.5 text-[9px] text-white/50">
                    {locked ? "🔒" : "★".repeat(stars) + "☆".repeat(3 - stars)}
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
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-rose-200/80">Path failed</div>
          <h2 className="mb-2 font-display text-3xl">Almost — try a new route.</h2>
          <p className="mb-5 max-w-sm text-sm text-white/80">
            {run.arrows.find((a) => a.status !== "freed")
              ? `The ${(run.arrows.find((a) => a.status !== "freed") as ArrowState).side === "mind" ? "Mind" : "Heart"} didn't reach its exit. Rebuild the path with the arrow keys or by clicking tiles.`
              : "Not every arrow reached its exit."}
          </p>
          <div className="flex justify-center gap-2">
            <button onClick={undoOne} disabled={!history.length} className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 disabled:opacity-40">
              Undo
            </button>
            <button onClick={restartLevel} className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-2 text-sm font-medium text-white shadow-lg">
              Restart Level
            </button>
          </div>
        </Overlay>
      )}

      {status === "won" && rewardFlash && (
        <Overlay key={victoryTick}>
          <VictoryPortal />
          <div className="relative">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-amber-200/80">Level {level.id} Complete</div>
            <h2 className="mb-1 font-display text-3xl">Both are free.</h2>
            <div className="mb-4 flex items-center justify-center gap-1 text-amber-300">
              {Array.from({ length: 3 }).map((_, i) => (
                <Star key={i} className={`h-6 w-6 ${i < rewardFlash.stars ? "fill-amber-300 animate-[popIn_0.4s_ease-out]" : "opacity-30"}`} style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
            <div className="mb-5 grid grid-cols-4 gap-2 text-xs">
              <RewardPill icon={<Heart className="h-3.5 w-3.5 text-pink-300" />} label="Love" value={`+${rewardFlash.lp}`} />
              <RewardPill icon={<Sparkles className="h-3.5 w-3.5 text-amber-300" />} label="XP" value={`+${rewardFlash.xp}`} />
              <RewardPill icon={<Diamond className="h-3.5 w-3.5 text-cyan-300" />} label="Gems" value={`+${rewardFlash.dia}`} />
              <RewardPill icon={<KeyIcon className="h-3.5 w-3.5 text-yellow-300" />} label="Keys" value={`+${rewardFlash.keys}`} />
            </div>
            <div className="flex justify-center gap-2">
              <button onClick={restartLevel} className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80">
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
          </div>
        </Overlay>
      )}

      {paused && status === "planning" && (
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

function planningHint(a: ArrowState, cellMap: Record<string, CellType>): string {
  const label = a.side === "mind" ? "Mind" : "Heart";
  if (a.plannedPath.length === 1) {
    return `${label} selected. Use arrow keys or click an adjacent tile to start building its route.`;
  }
  const tip = a.plannedPath[a.plannedPath.length - 1];
  const type = cellMap[`${tip.r}-${tip.c}`] ?? "empty";
  const needed = a.side === "mind" ? "mind-exit" : "heart-exit";
  if (type === needed) {
    return `${label} route reaches a matching exit ✓. Plan the other arrows, then press Release.`;
  }
  return `${label} path is ${a.plannedPath.length - 1} tile${a.plannedPath.length - 1 === 1 ? "" : "s"} long. Keep routing toward a ${a.side === "mind" ? "cyan Mind" : "pink Heart"} exit.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Board

function Board({
  level,
  cellMap,
  arrows,
  selectedId,
  onCellClick,
  animating,
}: {
  level: LevelConfig;
  cellMap: Record<string, CellType>;
  arrows: ArrowState[];
  selectedId: string | null;
  onCellClick: (r: number, c: number) => void;
  animating: boolean;
}) {
  // Compute per-cell overlays: planned path cells (side + order), animated positions.
  const planCells = useMemo(() => {
    const m = new Map<string, { side: Side; idx: number; total: number; isTip: boolean; arrowId: string; selected: boolean }>();
    for (const a of arrows) {
      if (a.status === "freed" && !animating) continue;
      const total = a.plannedPath.length;
      a.plannedPath.forEach((p, idx) => {
        if (idx === 0) return; // start cell shown as arrow, not as path
        const k = `${p.r}-${p.c}`;
        const prev = m.get(k);
        if (!prev) {
          m.set(k, {
            side: a.side,
            idx,
            total,
            isTip: idx === total - 1,
            arrowId: a.id,
            selected: a.id === selectedId,
          });
        }
      });
    }
    return m;
  }, [animating, arrows, selectedId]);

  const selectedArrow = arrows.find((a) => a.id === selectedId);
  const validNext = useMemo(() => {
    const s = new Set<string>();
    if (!selectedArrow || animating) return s;
    if (selectedArrow.status === "freed") return s;
    const tip = selectedArrow.plannedPath[selectedArrow.plannedPath.length - 1];
    for (const d of Object.keys(DELTA) as Dir[]) {
      const [dr, dc] = DELTA[d];
      const nr = tip.r + dr;
      const nc = tip.c + dc;
      const check = canExtend(selectedArrow, nr, nc, level, cellMap, arrows);
      if (check.ok) s.add(`${nr}-${nc}`);
    }
    return s;
  }, [animating, arrows, cellMap, level, selectedArrow]);

  return (
    <div className="relative mx-auto overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.01] p-4 shadow-[0_25px_80px_-25px_rgba(129,140,248,0.55)] backdrop-blur-xl">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-6 top-6 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl animate-[floaty_9s_ease-in-out_infinite]" />
        <div className="absolute bottom-4 right-8 h-36 w-36 rounded-full bg-pink-500/20 blur-3xl animate-[floaty_11s_ease-in-out_infinite_reverse]" />
        <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white/40 animate-[particle_var(--d)_linear_infinite]"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              // @ts-ignore css var
              "--d": `${6 + (i % 5) * 2}s`,
              animationDelay: `${(i % 6) * 0.7}s`,
            }}
          />
        ))}
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
            const plan = planCells.get(key);
            const isValid = validNext.has(key);
            // arrows currently at this cell (start cell when planning; animIdx cell when animating)
            const arrowsHere = arrows.filter((a) => {
              if (animating || a.status === "animating") {
                const idx = Math.min(a.animIdx, a.plannedPath.length - 1);
                const p = a.plannedPath[idx];
                return p.r === r && p.c === c && a.status !== "freed";
              }
              if (a.status === "freed") return false;
              return a.startRow === r && a.startCol === c;
            });

            return (
              <Cell
                key={key}
                type={type}
                arrowsHere={arrowsHere}
                selectedId={selectedId}
                plan={plan}
                isValidNext={isValid}
                animating={animating}
                onClick={() => onCellClick(r, c)}
              />
            );
          }),
        )}
      </div>

      <div className="pointer-events-none mt-3 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-white/40">
        Plan the route · glowing tiles are valid next steps
      </div>
    </div>
  );
}

function Cell({
  type,
  arrowsHere,
  selectedId,
  plan,
  isValidNext,
  animating,
  onClick,
}: {
  type: CellType;
  arrowsHere: ArrowState[];
  selectedId: string | null;
  plan?: { side: Side; idx: number; total: number; isTip: boolean; arrowId: string; selected: boolean };
  isValidNext?: boolean;
  animating: boolean;
  onClick: () => void;
}) {
  const base = "relative aspect-square rounded-xl border transition-all duration-200";
  let cellClass = "border-white/5 bg-white/[0.02]";
  if (type === "wall") cellClass = "border-white/10 bg-black/50 shadow-inner";
  if (type === "mind-exit")
    cellClass =
      "border-cyan-400/60 bg-gradient-to-br from-cyan-500/25 to-indigo-500/15 shadow-[inset_0_0_18px_rgba(103,232,249,0.45),0_0_18px_rgba(103,232,249,0.35)]";
  if (type === "heart-exit")
    cellClass =
      "border-pink-400/60 bg-gradient-to-br from-pink-500/25 to-fuchsia-500/15 shadow-[inset_0_0_18px_rgba(244,114,182,0.45),0_0_18px_rgba(244,114,182,0.35)]";
  if (type === "switch-mind")
    cellClass = "border-cyan-400/40 bg-cyan-500/5 shadow-[inset_0_0_10px_rgba(103,232,249,0.25)]";
  if (type === "switch-heart")
    cellClass = "border-pink-400/40 bg-pink-500/5 shadow-[inset_0_0_10px_rgba(244,114,182,0.25)]";
  if (type === "teleport-a" || type === "teleport-b")
    cellClass = "border-amber-400/40 bg-amber-500/5 shadow-[inset_0_0_10px_rgba(251,191,36,0.3)]";

  const clickable = !animating && (type !== "wall");
  const validGlow = isValidNext && !animating;

  return (
    <div className={`${base} ${cellClass}`}>
      {/* Wall pattern */}
      {type === "wall" && (
        <div className="pointer-events-none absolute inset-1 rounded-md bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.08)_0_4px,transparent_4px_8px)]" />
      )}

      {/* Planned path overlay */}
      {plan && (
        <span
          className={`pointer-events-none absolute inset-1 rounded-lg ${
            plan.selected ? "animate-[glowPulse_1.3s_ease-in-out_infinite]" : ""
          }`}
          style={{
            background:
              plan.side === "heart"
                ? `radial-gradient(circle, rgba(244,114,182,0.55) 0%, rgba(244,114,182,0.15) 70%, transparent 100%)`
                : `radial-gradient(circle, rgba(103,232,249,0.55) 0%, rgba(103,232,249,0.15) 70%, transparent 100%)`,
            opacity: 0.4 + (plan.idx / Math.max(1, plan.total)) * 0.5,
            boxShadow:
              plan.side === "heart"
                ? "inset 0 0 12px rgba(244,114,182,0.5)"
                : "inset 0 0 12px rgba(103,232,249,0.5)",
          }}
        />
      )}
      {plan?.isTip && !animating && (
        <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-amber-300/70" />
      )}

      {/* Valid-next indicator */}
      {validGlow && !plan && arrowsHere.length === 0 && (
        <span className="pointer-events-none absolute inset-2 rounded-full border border-emerald-300/60 bg-emerald-300/10 animate-[glowPulse_1.4s_ease-in-out_infinite]" />
      )}

      {/* Exit icons */}
      {type === "mind-exit" && (
        <Brain className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-cyan-300/80 animate-pulse" />
      )}
      {type === "heart-exit" && (
        <Heart className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-pink-300/80 animate-pulse" />
      )}
      {(type === "switch-mind" || type === "switch-heart") && (
        <div
          className={`pointer-events-none absolute inset-0 m-auto h-3 w-3 rounded-full ${
            type === "switch-mind"
              ? "bg-cyan-300/60 shadow-[0_0_10px_rgba(103,232,249,0.7)]"
              : "bg-pink-300/60 shadow-[0_0_10px_rgba(244,114,182,0.7)]"
          }`}
        />
      )}
      {(type === "teleport-a" || type === "teleport-b") && (
        <div className="pointer-events-none absolute inset-0 m-auto h-4 w-4 rounded-full border border-amber-300/60 bg-amber-300/20 animate-[spin_4s_linear_infinite] shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
      )}

      {/* Clickable overlay */}
      {clickable && (
        <button
          type="button"
          onClick={onClick}
          className="absolute inset-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          aria-label={`Cell tile`}
        />
      )}

      {/* Arrow token */}
      {arrowsHere.map((a) => {
        const selected = a.id === selectedId && !animating;
        return (
          <div
            key={a.id}
            className={`pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl text-xl font-bold transition-all duration-150 ${
              a.side === "mind"
                ? "bg-gradient-to-br from-indigo-400 to-cyan-400 text-white shadow-[0_0_22px_rgba(103,232,249,0.65),inset_0_1px_0_rgba(255,255,255,0.4)]"
                : "bg-gradient-to-br from-fuchsia-400 to-pink-400 text-white shadow-[0_0_22px_rgba(244,114,182,0.65),inset_0_1px_0_rgba(255,255,255,0.4)]"
            } ${
              selected ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-transparent animate-[glowPulse_1s_ease-in-out_infinite]" : ""
            } ${a.status === "animating" ? "scale-110" : ""}`}
          >
            {a.dir === "up" && "↑"}
            {a.dir === "down" && "↓"}
            {a.dir === "left" && "←"}
            {a.dir === "right" && "→"}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Level 1 coach

function Level1Coach({ arrows }: { arrows: ArrowState[] }) {
  const anyPlanned = arrows.some((a) => a.plannedPath.length > 1);
  const anyReached = arrows.some((a) => a.plannedPath.length > 1 && (a.plannedPath[a.plannedPath.length - 1] as Point));
  const allEndAtExit = arrows.every((a) => a.plannedPath.length > 1); // rough proxy for "ready"

  const step =
    !anyPlanned
      ? {
          title: "Step 1 · Select an arrow",
          body: "Click the ↑ Mind arrow. Its start cell will highlight amber.",
        }
      : !allEndAtExit
        ? {
            title: "Step 2 · Build a route",
            body: "Click the glowing green tiles (or use ← ↑ ↓ →) to extend the path one tile at a time toward a matching exit.",
          }
        : {
            title: "Step 3 · Release",
            body: "Both paths look good? Press Release. Each arrow will follow the exact route you planned.",
          };

  return (
    <div className="mb-3 flex items-start gap-3 rounded-2xl border border-amber-300/40 bg-gradient-to-r from-amber-400/10 via-fuchsia-400/10 to-indigo-400/10 px-4 py-2.5 text-xs text-amber-50 backdrop-blur animate-[fadeIn_0.4s_ease-out]">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300 animate-[glowPulse_1.6s_ease-in-out_infinite]" />
      <div className="flex-1">
        <div className="font-mono text-[9px] uppercase tracking-[0.25em] text-amber-200/80">{step.title}</div>
        <div className="mt-0.5 text-[12px] leading-snug text-white/90">{step.body}</div>
        <div className="mt-1 text-[10px] text-white/50">
          Keyboard: arrows to extend · Tab to switch arrow · Backspace to undo · R to rotate · Enter to release
        </div>
      </div>
      {/* suppress unused var warning */}
      <span className="hidden">{String(anyReached)}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small UI bits

function Chip({ icon, label, value, className = "" }: { icon: React.ReactNode; label: string; value: number; className?: string }) {
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
    <div className={`rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 backdrop-blur ${accent === "warn" ? "border-amber-400/40" : ""}`}>
      <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/50">{label}</div>
      <div className="truncate font-display text-sm text-white">{value}</div>
    </div>
  );
}

function ControlBtn({ onClick, disabled, icon, label }: { onClick: () => void; disabled?: boolean; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex flex-col items-center gap-0.5 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-white/80 backdrop-blur transition hover:border-white/30 hover:text-white active:scale-95 disabled:opacity-40"
    >
      {icon}
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
    </button>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur animate-[fadeIn_0.25s_ease-out]">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-900/60 to-purple-900/40 p-6 text-center shadow-[0_30px_80px_-20px_rgba(129,140,248,0.55)] animate-[scaleIn_0.3s_cubic-bezier(0.22,1,0.36,1)]">
        {children}
      </div>
    </div>
  );
}

function RewardPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-2">
      <div className="flex items-center justify-center gap-1 text-white">
        {icon}
        <span className="font-display text-sm">{value}</span>
      </div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-white/50">{label}</div>
    </div>
  );
}

function AmbientAurora() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
      <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-indigo-600/25 blur-[100px] animate-[floaty_14s_ease-in-out_infinite]" />
      <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-pink-500/20 blur-[110px] animate-[floaty_18s_ease-in-out_infinite_reverse]" />
      <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-400/10 blur-[100px] animate-[floaty_20s_ease-in-out_infinite]" />
    </div>
  );
}

function VictoryPortal() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
      <div className="h-40 w-40 animate-[portal_1.2s_ease-out] rounded-full bg-[conic-gradient(from_0deg,rgba(103,232,249,0.6),rgba(244,114,182,0.6),rgba(217,180,74,0.5),rgba(103,232,249,0.6))] blur-2xl opacity-70" />
    </div>
  );
}

function StyleTag() {
  return (
    <style>{`
      @keyframes floaty {
        0%,100% { transform: translate(0,0) scale(1); }
        50% { transform: translate(10px,-14px) scale(1.05); }
      }
      @keyframes particle {
        0% { transform: translateY(0) translateX(0); opacity: 0; }
        20% { opacity: 0.6; }
        100% { transform: translateY(-40px) translateX(6px); opacity: 0; }
      }
      @keyframes glowPulse {
        0%,100% { filter: brightness(1) drop-shadow(0 0 6px rgba(255,255,255,0.4)); }
        50% { filter: brightness(1.25) drop-shadow(0 0 14px rgba(255,255,255,0.8)); }
      }
      @keyframes popIn {
        0% { transform: scale(0.4); opacity: 0; }
        60% { transform: scale(1.2); opacity: 1; }
        100% { transform: scale(1); }
      }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes scaleIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      @keyframes portal {
        0% { transform: scale(0.4) rotate(0deg); opacity: 0; }
        60% { transform: scale(1.15) rotate(180deg); opacity: 1; }
        100% { transform: scale(1) rotate(360deg); opacity: 0.7; }
      }
    `}</style>
  );
}
