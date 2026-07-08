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
  Zap,
} from "lucide-react";
import { UnveilNav } from "@/components/UnveilNav";

// ─────────────────────────────────────────────────────────────────────────────
// Types

type Dir = "up" | "down" | "left" | "right";
type Side = "mind" | "heart";

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
  openBy: Side; // opened when a side's arrow triggers its matching switch
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
  hintOrder: string[];
  tutorial?: string;
}

type ArrowStatus = "idle" | "moving" | "freed" | "lost";

interface ArrowState extends ArrowDef {
  status: ArrowStatus;
  curRow: number;
  curCol: number;
  trail: Array<{ row: number; col: number; t: number }>;
}

interface RunState {
  arrows: ArrowState[];
  moves: number;
  openGates: string[];
  failReason?: string;
  collisionAt?: { row: number; col: number };
  blockerId?: string;
}

type PathOutcome = "exit" | "wrong-exit" | "wall" | "edge" | "arrow" | "gate";
interface PathPreview {
  cells: Array<{ r: number; c: number }>;
  outcome: PathOutcome;
  blockerId?: string;
  blockCell?: { r: number; c: number };
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
// Levels — progressive mechanics: 1–5 basic, 6–8 shared paths, 9–12 switches/teleports.

const DELTA: Record<Dir, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

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
    moveTarget: 2,
    timeTarget: 20,
    hintOrder: ["m1", "h1"],
    tutorial: "Tap an arrow to release its energy. Free both Mind and Heart.",
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
    moveTarget: 2,
    timeTarget: 25,
    hintOrder: ["m1", "h1"],
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
    moveTarget: 3,
    timeTarget: 35,
    hintOrder: ["m1", "m2", "h1"],
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
    moveTarget: 4,
    timeTarget: 40,
    hintOrder: ["m1", "h1", "m2", "h2"],
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
    moveTarget: 5,
    timeTarget: 55,
    hintOrder: ["m3", "h1", "h2", "m1", "m2"],
  },
  // ── Chapter 2: Shared Pathways ──────────────────────────────────────
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
    moveTarget: 2,
    timeTarget: 25,
    hintOrder: ["m1", "h1"],
    tutorial: "Sometimes the Mind must clear the way first.",
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
    moveTarget: 4,
    timeTarget: 45,
    hintOrder: ["h1", "h2", "m1", "m2"],
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
    moveTarget: 4,
    timeTarget: 50,
    hintOrder: ["m1", "h1", "m2", "h2"],
  },
  // ── Chapter 3: Switches & Portals ───────────────────────────────────
  {
    id: 9,
    chapter: "Resonance",
    name: "Heart Unlocks Mind",
    rows: 6,
    cols: 7,
    walls: [
      [2, 0],
      [2, 1],
      [2, 2],
      [2, 4],
      [2, 5],
      [2, 6],
    ],
    exits: [
      { row: 0, col: 3, side: "mind" },
      { row: 5, col: 0, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 4, col: 3, dir: "up", side: "mind" },
      { id: "h1", row: 5, col: 6, dir: "left", side: "heart" },
    ],
    gates: [{ id: "g1", row: 2, col: 3, openBy: "heart" }],
    switches: [{ row: 5, col: 3, side: "heart", openGates: ["g1"] }],
    moveTarget: 2,
    timeTarget: 30,
    hintOrder: ["h1", "m1"],
    tutorial: "Heart's path crosses a switch that opens the Mind's gate.",
  },
  {
    id: 10,
    chapter: "Resonance",
    name: "Twin Portals",
    rows: 7,
    cols: 7,
    walls: [
      [3, 0],
      [3, 1],
      [3, 5],
      [3, 6],
    ],
    exits: [
      { row: 0, col: 0, side: "mind" },
      { row: 6, col: 6, side: "heart" },
    ],
    arrows: [
      { id: "m1", row: 5, col: 3, dir: "left", side: "mind" },
      { id: "h1", row: 1, col: 3, dir: "right", side: "heart" },
    ],
    teleports: [{ a: [5, 0], b: [0, 5] }, { a: [1, 6], b: [6, 1] }],
    moveTarget: 2,
    timeTarget: 25,
    hintOrder: ["m1", "h1"],
    tutorial: "Portals link distant tiles. Step in — arrive elsewhere.",
  },
  {
    id: 11,
    chapter: "Resonance",
    name: "Sequence of Two",
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
    gates: [
      { id: "g1", row: 3, col: 7, openBy: "heart" },
      { id: "g2", row: 3, col: 0, openBy: "mind" },
    ],
    switches: [
      { row: 1, col: 4, side: "heart", openGates: ["g1"] },
      { row: 5, col: 3, side: "mind", openGates: ["g2"] },
    ],
    moveTarget: 3,
    timeTarget: 45,
    hintOrder: ["h1", "m1", "m2"],
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
    teleports: [{ a: [4, 0], b: [4, 7] }],
    moveTarget: 4,
    timeTarget: 55,
    hintOrder: ["m1", "h1", "m2", "h2"],
    tutorial: "Balance the crossing. Both must reach freedom together.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Persistence

const STORAGE_KEY = "unveil.fymh.v2";

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

function haptic(ms = 15) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(ms); } catch { /* ignore */ }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine

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

function initialRun(level: LevelConfig): RunState {
  return {
    moves: 0,
    openGates: [],
    arrows: level.arrows.map((a) => ({
      ...a,
      status: "idle",
      curRow: a.row,
      curCol: a.col,
      trail: [],
    })),
  };
}

function starsFor(moves: number, time: number, level: LevelConfig): number {
  if (moves <= level.moveTarget && time <= level.timeTarget) return 3;
  if (moves <= level.moveTarget + 1 && time <= level.timeTarget + 15) return 2;
  return 1;
}

// Simulates the arrow travel without mutating state — used for preview + hints.
function computePath(
  arrow: ArrowState,
  run: RunState,
  level: LevelConfig,
  cellMap: Record<string, CellType>,
): PathPreview {
  const cells: Array<{ r: number; c: number }> = [];
  const dir = arrow.dir;
  const [dr, dc] = DELTA[dir];
  let r = arrow.curRow;
  let c = arrow.curCol;
  const openGates = [...run.openGates];
  const teleMap = new Map<string, [number, number]>();
  for (const t of level.teleports ?? []) {
    teleMap.set(`${t.a[0]}-${t.a[1]}`, t.b);
    teleMap.set(`${t.b[0]}-${t.b[1]}`, t.a);
  }
  for (let i = 0; i < 200; i++) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= level.rows || nc >= level.cols) {
      return { cells, outcome: "edge", blockCell: { r, c } };
    }
    const key = `${nr}-${nc}`;
    const type = cellMap[key] ?? "empty";
    const gate = (level.gates ?? []).find((g) => g.row === nr && g.col === nc);
    if (gate && !openGates.includes(gate.id)) {
      return { cells, outcome: "gate", blockCell: { r: nr, c: nc } };
    }
    if (type === "wall") return { cells, outcome: "wall", blockCell: { r: nr, c: nc } };
    if (type === "mind-exit" || type === "heart-exit") {
      const exitSide: Side = type === "mind-exit" ? "mind" : "heart";
      cells.push({ r: nr, c: nc });
      if (exitSide === arrow.side) return { cells, outcome: "exit" };
      return { cells, outcome: "wrong-exit", blockCell: { r: nr, c: nc } };
    }
    const blocker = run.arrows.find(
      (a) =>
        a.id !== arrow.id &&
        (a.status === "idle" || a.status === "lost") &&
        a.curRow === nr &&
        a.curCol === nc,
    );
    if (blocker) {
      return { cells, outcome: "arrow", blockerId: blocker.id, blockCell: { r: nr, c: nc } };
    }
    cells.push({ r: nr, c: nc });
    if (type === "switch-mind" || type === "switch-heart") {
      const s = (level.switches ?? []).find((s) => s.row === nr && s.col === nc);
      const need: Side = type === "switch-mind" ? "mind" : "heart";
      if (s && arrow.side === need) {
        for (const gid of s.openGates) if (!openGates.includes(gid)) openGates.push(gid);
      }
    }
    const tgt = teleMap.get(`${nr}-${nc}`);
    if (tgt) {
      r = tgt[0];
      c = tgt[1];
      continue;
    }
    r = nr;
    c = nc;
  }
  return { cells, outcome: "edge" };
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
  const [victoryTick, setVictoryTick] = useState(0);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const movingRef = useRef(false);

  const level = LEVELS[levelIndex];
  const cellMap = useMemo(() => buildCellMap(level), [level]);

  useEffect(() => setProgress(loadProgress()), []);

  useEffect(() => {
    setRun(initialRun(level));
    setHistory([]);
    setSeconds(0);
    setStatus("playing");
    setHintId(null);
    setRewardFlash(null);
    setPreviewId(null);
    setTutorialStep(0);
    movingRef.current = false;
  }, [level]);

  useEffect(() => {
    if (paused || status !== "playing") return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [paused, status]);

  // Occupancy: idle arrows block their cell; lost arrows block; freed do not.
  const occupancy = useMemo(() => {
    const occ: Record<string, ArrowState> = {};
    for (const a of run.arrows) {
      if (a.status === "idle" || a.status === "moving" || a.status === "lost") {
        occ[`${a.curRow}-${a.curCol}`] = a;
      }
    }
    return occ;
  }, [run.arrows]);

  useEffect(() => {
    if (status !== "playing") return;
    const allFreed = run.arrows.every((a) => a.status === "freed");
    const anyLost = run.arrows.some((a) => a.status === "lost");
    if (allFreed && run.arrows.length > 0) handleWin();
    else if (anyLost && !run.arrows.some((a) => a.status === "moving")) setStatus("lost");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.arrows, status]);

  // Live preview of the currently hovered / focused idle arrow's route.
  const preview = useMemo<PathPreview | null>(() => {
    if (!previewId) return null;
    const a = run.arrows.find((x) => x.id === previewId);
    if (!a || a.status !== "idle") return null;
    return computePath(a, run, level, cellMap);
  }, [previewId, run, level, cellMap]);

  // Level 1 tutorial: always highlight the next expected arrow.
  const tutorialHintId =
    level.id === 1 && status === "playing"
      ? level.hintOrder.find((id) => run.arrows.find((a) => a.id === id)?.status === "idle") ?? null
      : null;
  const effectiveHintId = hintId ?? tutorialHintId;

  function releaseArrow(id: string) {
    if (status !== "playing" || paused || movingRef.current) return;
    const arrow = run.arrows.find((a) => a.id === id);
    if (!arrow || arrow.status !== "idle") return;

    haptic(12);
    setHistory((h) => [...h, run]);
    setHintId(null);
    setPreviewId(null);
    movingRef.current = true;

    let cur = { r: arrow.curRow, c: arrow.curCol };
    let dir = arrow.dir;
    let openGates = [...run.openGates];
    let localArrows = run.arrows.map((a) =>
      a.id === id ? { ...a, status: "moving" as ArrowStatus, trail: [] } : a,
    );
    setRun({
      ...run,
      moves: run.moves + 1,
      arrows: localArrows,
      failReason: undefined,
      collisionAt: undefined,
      blockerId: undefined,
    });

    const teleportMap = new Map<string, [number, number]>();
    for (const t of level.teleports ?? []) {
      teleportMap.set(`${t.a[0]}-${t.a[1]}`, t.b);
      teleportMap.set(`${t.b[0]}-${t.b[1]}`, t.a);
    }
    const switchAt = (r: number, c: number) =>
      (level.switches ?? []).find((s) => s.row === r && s.col === c);
    const gateAt = (r: number, c: number) =>
      (level.gates ?? []).find((g) => g.row === r && g.col === c);

    const fail = (reason: string, blockR: number, blockC: number, blockerId?: string) => {
      haptic(40);
      localArrows = localArrows.map((a) =>
        a.id === id ? { ...a, status: "lost" as ArrowStatus, curRow: cur.r, curCol: cur.c } : a,
      );
      setRun((prev) => ({
        ...prev,
        arrows: localArrows,
        openGates,
        failReason: reason,
        collisionAt: { row: blockR, col: blockC },
        blockerId,
      }));
      movingRef.current = false;
    };

    const succeed = (r: number, c: number) => {
      haptic(25);
      localArrows = localArrows.map((a) =>
        a.id === id ? { ...a, status: "freed" as ArrowStatus, curRow: r, curCol: c } : a,
      );
      setRun((prev) => ({ ...prev, arrows: localArrows, openGates }));
      movingRef.current = false;
    };

    const step = () => {
      const [dr, dc] = DELTA[dir];
      const nr = cur.r + dr;
      const nc = cur.c + dc;

      if (nr < 0 || nc < 0 || nr >= level.rows || nc >= level.cols) {
        fail(`${arrow.side === "mind" ? "Mind" : "Heart"} flew off the edge with no exit.`, cur.r, cur.c);
        return;
      }
      const key = `${nr}-${nc}`;
      const cellType = cellMap[key] ?? "empty";

      // Closed gate = wall
      const gate = gateAt(nr, nc);
      if (gate && !openGates.includes(gate.id)) {
        fail(`A ${gate.openBy === "mind" ? "Mind" : "Heart"} switch must open this gate first.`, nr, nc);
        return;
      }
      if (cellType === "wall") {
        fail(`${arrow.side === "mind" ? "Mind" : "Heart"} hit an obstacle. Clear the path before releasing.`, nr, nc);
        return;
      }
      if (cellType === "mind-exit" || cellType === "heart-exit") {
        const exitSide: Side = cellType === "mind-exit" ? "mind" : "heart";
        if (exitSide === arrow.side) {
          // arrive at exit
          localArrows = localArrows.map((a) =>
            a.id === id
              ? { ...a, curRow: nr, curCol: nc, trail: [...a.trail, { row: nr, col: nc, t: Date.now() }] }
              : a,
          );
          setRun((prev) => ({ ...prev, arrows: localArrows, openGates }));
          window.setTimeout(() => succeed(nr, nc), 120);
          return;
        }
        fail(
          arrow.side === "mind"
            ? "Mind reached a Heart exit. Wrong door."
            : "Heart reached a Mind exit. Wrong door.",
          nr,
          nc,
        );
        return;
      }
      // Collision with any occupying arrow (idle/lost)
      const blocker = localArrows.find(
        (a) => a.id !== id && (a.status === "idle" || a.status === "lost") && a.curRow === nr && a.curCol === nc,
      );
      if (blocker) {
        const meLabel = arrow.side === "mind" ? "Mind" : "Heart";
        const themLabel = blocker.side === "mind" ? "Mind" : "Heart";
        fail(
          blocker.side === arrow.side
            ? `Blocked: another ${meLabel} arrow is in the way. Release it first — see the pulsing highlight.`
            : `${meLabel} is blocked by a ${themLabel} arrow. Free the highlighted ${themLabel} first, then try again.`,
          nr,
          nc,
          blocker.id,
        );
        return;
      }

      // Advance
      cur = { r: nr, c: nc };
      localArrows = localArrows.map((a) =>
        a.id === id
          ? {
              ...a,
              curRow: nr,
              curCol: nc,
              trail: [...a.trail, { row: nr, col: nc, t: Date.now() }].slice(-6),
            }
          : a,
      );

      // Switch trigger
      if (cellType === "switch-mind" || cellType === "switch-heart") {
        const s = switchAt(nr, nc);
        const need: Side = cellType === "switch-mind" ? "mind" : "heart";
        if (s && arrow.side === need) {
          for (const gid of s.openGates) if (!openGates.includes(gid)) openGates.push(gid);
        }
      }

      // Teleport
      const tgt = teleportMap.get(`${nr}-${nc}`);
      setRun((prev) => ({ ...prev, arrows: localArrows, openGates }));
      if (tgt) {
        window.setTimeout(() => {
          cur = { r: tgt[0], c: tgt[1] };
          localArrows = localArrows.map((a) =>
            a.id === id
              ? {
                  ...a,
                  curRow: tgt[0],
                  curCol: tgt[1],
                  trail: [...a.trail, { row: tgt[0], col: tgt[1], t: Date.now() }].slice(-6),
                }
              : a,
          );
          setRun((prev) => ({ ...prev, arrows: localArrows, openGates }));
          window.setTimeout(step, 140);
        }, 120);
        return;
      }
      window.setTimeout(step, 140);
    };

    window.setTimeout(step, 140);

    // silence unused-var lint
    void dir;
  }

  function undo() {
    if (movingRef.current) return;
    const last = history[history.length - 1];
    if (!last) return;
    setRun(last);
    setHistory((h) => h.slice(0, -1));
    setStatus("playing");
    setHintId(null);
    haptic(10);
  }

  function restart() {
    if (movingRef.current) return;
    setRun(initialRun(level));
    setHistory([]);
    setSeconds(0);
    setStatus("playing");
    setHintId(null);
    haptic(10);
  }

  function showHint() {
    if (movingRef.current) return;
    const next = level.hintOrder.find((id) => run.arrows.find((a) => a.id === id)?.status === "idle");
    if (next) {
      setHintId(next);
      haptic(8);
    }
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
    setVictoryTick((v) => v + 1);
    setRewardFlash({ lp, xp, dia, keys, stars });
    haptic(60);

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

        {level.id === 1 && status === "playing" ? (
          <Level1Coach
            freedCount={run.arrows.filter((a) => a.status === "freed").length}
            hasMoved={run.moves > 0}
          />
        ) : (
          level.tutorial && status === "playing" && run.moves === 0 && (
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
          openGates={run.openGates}
          occupancy={occupancy}
          hintId={effectiveHintId}
          paused={paused}
          collisionAt={run.collisionAt}
          blockerId={run.blockerId}
          preview={preview}
          onTap={releaseArrow}
          onPreview={setPreviewId}
        />

        {/* Live status line explaining last outcome / next action */}
        <StatusLine
          run={run}
          preview={preview}
          previewArrow={previewId ? run.arrows.find((a) => a.id === previewId) ?? null : null}
          status={status}
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
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-rose-200/80">Path blocked</div>
          <h2 className="mb-2 font-display text-3xl">Here's what happened.</h2>
          <p className="mb-5 max-w-sm text-sm text-white/80">{run.failReason ?? "An arrow lost its way. Undo and reconsider which side to release first."}</p>
          <div className="flex justify-center gap-2">
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
  openGates,
  occupancy,
  hintId,
  paused,
  collisionAt,
  blockerId,
  preview,
  onTap,
  onPreview,
}: {
  level: LevelConfig;
  cellMap: Record<string, CellType>;
  arrows: ArrowState[];
  openGates: string[];
  occupancy: Record<string, ArrowState>;
  hintId: string | null;
  paused: boolean;
  collisionAt?: { row: number; col: number };
  blockerId?: string;
  preview: PathPreview | null;
  onTap: (id: string) => void;
  onPreview: (id: string | null) => void;
}) {
  const gateMap = useMemo(() => {
    const m: Record<string, GateDef> = {};
    for (const g of level.gates ?? []) m[`${g.row}-${g.col}`] = g;
    return m;
  }, [level]);

  // Build trail overlay
  const trails = useMemo(() => {
    const t: Array<{ row: number; col: number; side: Side; freshness: number; key: string }> = [];
    const now = Date.now();
    for (const a of arrows) {
      a.trail.forEach((p, i) => {
        t.push({
          row: p.row,
          col: p.col,
          side: a.side,
          freshness: Math.max(0, 1 - (now - p.t) / 900),
          key: `${a.id}-${i}-${p.row}-${p.col}`,
        });
      });
    }
    return t;
  }, [arrows]);

  return (
    <div className="relative mx-auto overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.01] p-4 shadow-[0_25px_80px_-25px_rgba(129,140,248,0.55)] backdrop-blur-xl">
      {/* Inner ambient glow */}
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
              // @ts-ignore -- css var
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
            const occ = occupancy[key];
            const gate = gateMap[key];
            const gateOpen = gate ? openGates.includes(gate.id) : false;
            const collided = collisionAt && collisionAt.row === r && collisionAt.col === c;
            const trailHere = trails.filter((t) => t.row === r && t.col === c);
            const previewIdx = preview?.cells.findIndex((p) => p.r === r && p.c === c) ?? -1;
            const previewSide: Side | undefined = preview
              ? arrows.find((a) => a.id === (preview.cells.length ? undefined : undefined))?.side
              : undefined;
            const previewArrow = preview ? arrows.find((a) => a.status === "idle" && preview.cells.some((p) => p.r === a.curRow && p.c === a.curCol) === false && preview.cells.length > 0) : null;
            // simpler: derive side from occ arrow being previewed via previewId isn't here; pass previewOwnerSide below
            const isPreviewBlock =
              preview?.blockCell && preview.blockCell.r === r && preview.blockCell.c === c;
            const isBlocker = !!(blockerId && occ && occ.id === blockerId);

            return (
              <Cell
                key={key}
                type={type}
                arrow={occ}
                hint={occ?.id === hintId}
                disabled={paused}
                gate={gate}
                gateOpen={gateOpen}
                collided={!!collided}
                trails={trailHere}
                previewIndex={previewIdx}
                previewLength={preview?.cells.length ?? 0}
                previewSide={preview ? (arrows.find((a) => a.id === previewOwnerId(arrows, preview)) ?? arrows[0])?.side : undefined}
                previewBlock={!!isPreviewBlock}
                previewBad={!!preview && preview.outcome !== "exit"}
                isBlocker={isBlocker}
                onTap={onTap}
                onPreview={onPreview}
              />
            );
          }),
        )}
      </div>

      {/* Board hint text */}
      <div className="pointer-events-none mt-3 text-center font-mono text-[9px] uppercase tracking-[0.25em] text-white/40">
        Hover or focus an arrow to preview its path · tap to release
      </div>
    </div>
  );
}

function Cell({
  type,
  arrow,
  hint,
  disabled,
  gate,
  gateOpen,
  collided,
  trails,
  onTap,
}: {
  type: CellType;
  arrow?: ArrowState;
  hint?: boolean;
  disabled?: boolean;
  gate?: GateDef;
  gateOpen?: boolean;
  collided?: boolean;
  trails: Array<{ side: Side; freshness: number; key: string }>;
  onTap: (id: string) => void;
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

  if (gate) {
    cellClass = gateOpen
      ? "border-emerald-400/40 bg-emerald-500/5"
      : "border-white/15 bg-black/50 shadow-inner";
  }

  return (
    <div className={`${base} ${cellClass} ${collided ? "animate-[shake_0.35s_ease-in-out] ring-2 ring-rose-400/70" : ""}`}>
      {/* Trails */}
      {trails.map((t) => (
        <span
          key={t.key}
          className={`pointer-events-none absolute inset-1 rounded-lg blur-[2px] ${
            t.side === "mind" ? "bg-cyan-400/40" : "bg-pink-400/40"
          }`}
          style={{ opacity: 0.15 + t.freshness * 0.65 }}
        />
      ))}

      {/* Icons for special cells */}
      {type === "mind-exit" && (
        <Brain className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-cyan-300/80 animate-pulse" />
      )}
      {type === "heart-exit" && (
        <Heart className="pointer-events-none absolute inset-0 m-auto h-4 w-4 text-pink-300/80 animate-pulse" />
      )}
      {(type === "switch-mind" || type === "switch-heart") && (
        <div
          className={`pointer-events-none absolute inset-0 m-auto flex h-3 w-3 items-center justify-center rounded-full ${
            type === "switch-mind" ? "bg-cyan-300/60 shadow-[0_0_10px_rgba(103,232,249,0.7)]" : "bg-pink-300/60 shadow-[0_0_10px_rgba(244,114,182,0.7)]"
          }`}
        />
      )}
      {(type === "teleport-a" || type === "teleport-b") && (
        <div className="pointer-events-none absolute inset-0 m-auto h-4 w-4 rounded-full border border-amber-300/60 bg-amber-300/20 animate-[spin_4s_linear_infinite] shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
      )}
      {gate && !gateOpen && (
        <div className="pointer-events-none absolute inset-1 rounded-md border border-white/20 bg-[repeating-linear-gradient(45deg,transparent_0_4px,rgba(255,255,255,0.06)_4px_8px)]" />
      )}
      {gate && gateOpen && (
        <div className="pointer-events-none absolute inset-0 m-auto h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
      )}

      {/* Arrow */}
      {arrow && arrow.status !== "freed" && (
        <button
          type="button"
          disabled={disabled || arrow.status !== "idle"}
          onClick={() => onTap(arrow.id)}
          className={`absolute inset-0 flex items-center justify-center rounded-xl text-xl font-bold transition-all duration-150 ${
            arrow.side === "mind"
              ? "bg-gradient-to-br from-indigo-400 to-cyan-400 text-white shadow-[0_0_22px_rgba(103,232,249,0.65),inset_0_1px_0_rgba(255,255,255,0.4)]"
              : "bg-gradient-to-br from-fuchsia-400 to-pink-400 text-white shadow-[0_0_22px_rgba(244,114,182,0.65),inset_0_1px_0_rgba(255,255,255,0.4)]"
          } ${arrow.status === "moving" ? "scale-110 animate-[glowPulse_0.6s_ease-in-out_infinite]" : "hover:scale-105 active:scale-95"} ${
            arrow.status === "lost" ? "opacity-30 grayscale animate-[shake_0.35s_ease-in-out]" : ""
          } ${hint ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-transparent animate-[glowPulse_1s_ease-in-out_infinite]" : ""}`}
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
      @keyframes shake {
        0%,100% { transform: translateX(0); }
        20% { transform: translateX(-3px); }
        40% { transform: translateX(3px); }
        60% { transform: translateX(-2px); }
        80% { transform: translateX(2px); }
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
        0% { transform: scale(0); opacity: 0; }
        50% { opacity: 0.8; }
        100% { transform: scale(2.5); opacity: 0; }
      }
    `}</style>
  );
}
