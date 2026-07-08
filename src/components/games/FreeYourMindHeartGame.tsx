import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Brain,
  Heart,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Undo2,
} from "lucide-react";
import { UnveilNav } from "@/components/UnveilNav";

type Direction = "up" | "right" | "down" | "left";
type BoardSide = "mind" | "heart";

type BoardConfig = {
  grid: string[];
  path: Array<[number, number]>;
};

type LevelConfig = {
  level: number;
  moveBudget: number;
  targetSeconds: number;
  mind: BoardConfig;
  heart: BoardConfig;
};

type ArrowState = {
  mind: Record<string, Direction | null>;
  heart: Record<string, Direction | null>;
};

type SolveResult = {
  ok: boolean;
  reason?: string;
};

const DIRECTION_ORDER: Array<Direction | null> = [null, "up", "right", "down", "left"];

const DELTA: Record<Direction, { row: number; col: number }> = {
  up: { row: -1, col: 0 },
  right: { row: 0, col: 1 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
};

const LEVELS: LevelConfig[] = [
  {
    level: 1,
    moveBudget: 18,
    targetSeconds: 75,
    mind: {
      grid: ["S....", "####.", "....#", ".####", "....G"],
      path: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
        [1, 4],
        [2, 4],
        [2, 3],
        [2, 2],
        [2, 1],
        [2, 0],
        [3, 0],
        [4, 0],
        [4, 1],
        [4, 2],
        [4, 3],
        [4, 4],
      ],
    },
    heart: {
      grid: ["....S", ".####", "#....", "####.", "G...."],
      path: [
        [0, 4],
        [0, 3],
        [0, 2],
        [0, 1],
        [0, 0],
        [1, 0],
        [2, 0],
        [2, 1],
        [2, 2],
        [2, 3],
        [2, 4],
        [3, 4],
        [4, 4],
        [4, 3],
        [4, 2],
        [4, 1],
        [4, 0],
      ],
    },
  },
  {
    level: 2,
    moveBudget: 20,
    targetSeconds: 90,
    mind: {
      grid: ["S#...", ".#.##", ".#...", ".###.", "....G"],
      path: [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [4, 0],
        [4, 1],
        [4, 2],
        [4, 3],
        [3, 3],
        [2, 3],
        [2, 4],
        [3, 4],
        [4, 4],
      ],
    },
    heart: {
      grid: ["..#S.", "##.#.", "...#.", ".#.##", "G...."],
      path: [
        [0, 3],
        [0, 4],
        [1, 4],
        [2, 4],
        [2, 3],
        [2, 2],
        [2, 1],
        [2, 0],
        [3, 0],
        [4, 0],
      ],
    },
  },
  {
    level: 3,
    moveBudget: 24,
    targetSeconds: 105,
    mind: {
      grid: ["S....", "###.#", "...##", "#.##.", "...#G"],
      path: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
        [1, 4],
        [1, 3],
        [2, 3],
        [2, 2],
        [2, 1],
        [2, 0],
        [3, 0],
        [4, 0],
        [4, 1],
        [4, 2],
        [3, 2],
        [3, 3],
        [3, 4],
        [4, 4],
      ],
    },
    heart: {
      grid: [".S...", ".###.", "...#.", "##.#.", "G...."],
      path: [
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
        [1, 4],
        [2, 4],
        [2, 3],
        [2, 2],
        [2, 1],
        [2, 0],
        [3, 0],
        [4, 0],
      ],
    },
  },
  {
    level: 4,
    moveBudget: 26,
    targetSeconds: 120,
    mind: {
      grid: ["S..#.", "##.#.", "...#.", ".###.", "....G"],
      path: [
        [0, 0],
        [0, 1],
        [0, 2],
        [1, 2],
        [2, 2],
        [2, 1],
        [2, 0],
        [3, 0],
        [4, 0],
        [4, 1],
        [4, 2],
        [4, 3],
        [4, 4],
      ],
    },
    heart: {
      grid: ["...S.", ".###.", ".#...", ".#.##", "G...."],
      path: [
        [0, 3],
        [0, 2],
        [0, 1],
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [4, 0],
      ],
    },
  },
  {
    level: 5,
    moveBudget: 30,
    targetSeconds: 140,
    mind: {
      grid: ["S....", ".###.", ".#...", ".#.##", "...#G"],
      path: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
        [1, 4],
        [2, 4],
        [2, 3],
        [2, 2],
        [3, 2],
        [4, 2],
        [4, 3],
        [4, 4],
      ],
    },
    heart: {
      grid: ["....S", "##.#.", "...#.", ".###.", "G...."],
      path: [
        [0, 4],
        [0, 3],
        [0, 2],
        [1, 2],
        [2, 2],
        [2, 1],
        [2, 0],
        [3, 0],
        [4, 0],
      ],
    },
  },
];

function keyAt(row: number, col: number) {
  return `${row}-${col}`;
}

function inBounds(grid: string[], row: number, col: number) {
  return row >= 0 && col >= 0 && row < grid.length && col < grid[0].length;
}

function isWall(grid: string[], row: number, col: number) {
  return grid[row]?.[col] === "#";
}

function findChar(grid: string[], char: "S" | "G") {
  for (let row = 0; row < grid.length; row += 1) {
    for (let col = 0; col < grid[row].length; col += 1) {
      if (grid[row][col] === char) return { row, col };
    }
  }
  return null;
}

function buildSolution(path: Array<[number, number]>) {
  const map: Record<string, Direction> = {};
  for (let i = 0; i < path.length - 1; i += 1) {
    const [row, col] = path[i];
    const [nextRow, nextCol] = path[i + 1];
    if (nextRow < row) map[keyAt(row, col)] = "up";
    else if (nextRow > row) map[keyAt(row, col)] = "down";
    else if (nextCol < col) map[keyAt(row, col)] = "left";
    else map[keyAt(row, col)] = "right";
  }
  return map;
}

function evaluateBoard(grid: string[], arrows: Record<string, Direction | null>): SolveResult {
  const start = findChar(grid, "S");
  const goal = findChar(grid, "G");

  if (!start || !goal) return { ok: false, reason: "Missing start or goal." };

  let row = start.row;
  let col = start.col;
  const visited = new Set<string>();

  for (let step = 0; step < 60; step += 1) {
    if (row === goal.row && col === goal.col) return { ok: true };

    const loc = keyAt(row, col);
    const dir = arrows[loc];
    if (!dir) return { ok: false, reason: "Place arrows to guide the path." };

    const stateKey = `${loc}-${dir}`;
    if (visited.has(stateKey)) return { ok: false, reason: "Path loop detected." };
    visited.add(stateKey);

    const delta = DELTA[dir];
    const nextRow = row + delta.row;
    const nextCol = col + delta.col;

    if (!inBounds(grid, nextRow, nextCol)) return { ok: false, reason: "An arrow exits the board." };
    if (isWall(grid, nextRow, nextCol)) return { ok: false, reason: "An arrow points into a wall." };

    row = nextRow;
    col = nextCol;
  }

  return { ok: false, reason: "Path did not reach the goal in time." };
}

function countPlaced(arrows: ArrowState) {
  const countSide = (side: BoardSide) =>
    Object.values(arrows[side]).filter((value) => value !== null).length;

  return countSide("mind") + countSide("heart");
}

function arrowSymbol(dir: Direction | null) {
  if (!dir) return "•";
  if (dir === "up") return "↑";
  if (dir === "right") return "→";
  if (dir === "down") return "↓";
  return "←";
}

function sideLabel(side: BoardSide) {
  return side === "mind" ? "Mind" : "Heart";
}

export function FreeYourMindHeartGame() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [arrows, setArrows] = useState<ArrowState>({ mind: {}, heart: {} });
  const [history, setHistory] = useState<ArrowState[]>([]);
  const [feedback, setFeedback] = useState<string>("Guide both paths and unlock both doors.");
  const [seconds, setSeconds] = useState(0);
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);

  const level = LEVELS[levelIndex];

  const solutions = useMemo(
    () => ({
      mind: buildSolution(level.mind.path),
      heart: buildSolution(level.heart.path),
    }),
    [level],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [levelIndex]);

  useEffect(() => {
    setArrows({ mind: {}, heart: {} });
    setHistory([]);
    setFeedback(`Level ${level.level}: clear confusion and guide both arrows to freedom.`);
    setSeconds(0);
  }, [level.level]);

  function updateArrow(side: BoardSide, row: number, col: number) {
    const cell = level[side].grid[row][col];
    if (cell === "#" || cell === "G") return;

    const id = keyAt(row, col);
    const current = arrows[side][id] ?? null;
    const next = DIRECTION_ORDER[(DIRECTION_ORDER.indexOf(current) + 1) % DIRECTION_ORDER.length];

    setHistory((prev) => [...prev, arrows]);
    setArrows((prev) => ({
      ...prev,
      [side]: {
        ...prev[side],
        [id]: next,
      },
    }));
  }

  function undo() {
    const last = history[history.length - 1];
    if (!last) return;
    setArrows(last);
    setHistory((prev) => prev.slice(0, -1));
    setFeedback("Last move reverted.");
  }

  function clearAll() {
    setHistory((prev) => [...prev, arrows]);
    setArrows({ mind: {}, heart: {} });
    setFeedback("Board cleared. Start fresh.");
  }

  function applyHint() {
    const applyFor = (side: BoardSide) => {
      const solution = solutions[side];
      const existing = arrows[side];
      const target = Object.entries(solution).find(([id, dir]) => existing[id] !== dir);
      if (!target) return null;
      return { id: target[0], dir: target[1] };
    };

    const mindHint = applyFor("mind");
    const heartHint = applyFor("heart");

    if (!mindHint && !heartHint) {
      setFeedback("Hints exhausted for this level. Paths already align with a valid route.");
      return;
    }

    setHistory((prev) => [...prev, arrows]);
    setArrows((prev) => ({
      mind:
        mindHint === null
          ? prev.mind
          : {
              ...prev.mind,
              [mindHint.id]: mindHint.dir,
            },
      heart:
        heartHint === null
          ? prev.heart
          : {
              ...prev.heart,
              [heartHint.id]: heartHint.dir,
            },
    }));

    setFeedback("Hint applied: one step revealed on each available path.");
  }

  function validateLevel() {
    const placed = countPlaced(arrows);
    if (placed > level.moveBudget) {
      setFeedback(`Move budget exceeded (${placed}/${level.moveBudget}). Trim extra arrows first.`);
      return;
    }

    const mindResult = evaluateBoard(level.mind.grid, arrows.mind);
    if (!mindResult.ok) {
      setFeedback(`Mind path blocked: ${mindResult.reason}`);
      return;
    }

    const heartResult = evaluateBoard(level.heart.grid, arrows.heart);
    if (!heartResult.ok) {
      setFeedback(`Heart path blocked: ${heartResult.reason}`);
      return;
    }

    const stars = seconds <= level.targetSeconds ? 3 : seconds <= level.targetSeconds + 20 ? 2 : 1;
    setFeedback(`Level ${level.level} complete. ${stars} star${stars > 1 ? "s" : ""} earned.`);
    setCompletedLevels((prev) => (prev.includes(level.level) ? prev : [...prev, level.level]));
  }

  function nextLevel() {
    if (levelIndex + 1 >= LEVELS.length) return;
    setLevelIndex((value) => value + 1);
  }

  const placedMoves = countPlaced(arrows);
  const allDone = completedLevels.length === LEVELS.length;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_8%,rgba(56,189,248,0.20),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(244,114,182,0.20),transparent_28%),linear-gradient(180deg,#080515,#06030f)] pb-24 lg:pb-0">
      <UnveilNav />

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            to="/game"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Solo Mind Games
          </Link>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">UNVEIL · New Challenge</div>
            <h1 className="bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-pink-300 bg-clip-text font-display text-3xl font-bold text-transparent sm:text-4xl">
              Free Your Mind & Heart
            </h1>
          </div>
        </div>

        <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
          Clear both paths and guide the arrows to set both free. Finish Levels 1 through 5 to complete this challenge.
        </p>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatChip icon={<Sparkles className="h-4 w-4" />} label="Level" value={`${level.level}/5`} />
          <StatChip icon={<Brain className="h-4 w-4" />} label="Moves" value={`${placedMoves}/${level.moveBudget}`} />
          <StatChip icon={<Heart className="h-4 w-4" />} label="Time" value={`${seconds}s`} />
          <StatChip icon={<Lightbulb className="h-4 w-4" />} label="Target" value={`${level.targetSeconds}s`} />
          <StatChip icon={<Sparkles className="h-4 w-4" />} label="Completed" value={`${completedLevels.length}/5`} />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyHint}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <Lightbulb className="h-3.5 w-3.5" /> Hint
          </button>
          <button
            type="button"
            onClick={undo}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Clear
          </button>
          <button
            type="button"
            onClick={validateLevel}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-4 py-1.5 text-xs font-medium text-primary-foreground shadow-glow"
          >
            Validate Paths
          </button>
          <button
            type="button"
            disabled={levelIndex + 1 >= LEVELS.length}
            onClick={nextLevel}
            className="rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-40"
          >
            Next Level
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-primary/30 bg-card/85 p-3 text-sm text-foreground">
          {feedback}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <MazeBoard
            side="mind"
            icon={<Brain className="h-4 w-4 text-cyan-300" />}
            title="Free Your Mind"
            board={level.mind}
            arrows={arrows.mind}
            onCellClick={updateArrow}
          />

          <MazeBoard
            side="heart"
            icon={<Heart className="h-4 w-4 text-pink-300" />}
            title="Free Your Heart"
            board={level.heart}
            arrows={arrows.heart}
            onCellClick={updateArrow}
          />
        </div>

        {allDone && (
          <div className="mt-5 rounded-3xl border border-primary/40 bg-card/90 p-5 text-center shadow-glow">
            <h2 className="font-display text-3xl text-primary">All 5 levels complete.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You cleared confusion, unlocked both paths, and finished Free Your Mind & Heart.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function MazeBoard({
  side,
  icon,
  title,
  board,
  arrows,
  onCellClick,
}: {
  side: BoardSide;
  icon: React.ReactNode;
  title: string;
  board: BoardConfig;
  arrows: Record<string, Direction | null>;
  onCellClick: (side: BoardSide, row: number, col: number) => void;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card/85 p-4 shadow-glow">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 font-display text-2xl">
          {icon} {title}
        </h3>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Tap to rotate arrows
        </div>
      </div>

      <div className="grid max-w-md grid-cols-5 gap-2">
        {board.grid.map((line, row) =>
          line.split("").map((cell, col) => {
            const id = keyAt(row, col);
            const arrow = arrows[id] ?? null;
            const isWall = cell === "#";
            const isStart = cell === "S";
            const isGoal = cell === "G";

            const startTone = side === "mind" ? "text-cyan-200" : "text-pink-200";
            const goalTone = side === "mind" ? "text-cyan-300" : "text-pink-300";

            return (
              <button
                key={id}
                type="button"
                disabled={isWall || isGoal}
                onClick={() => onCellClick(side, row, col)}
                className={`aspect-square rounded-xl border text-xl transition ${
                  isWall
                    ? "cursor-not-allowed border-border/40 bg-black/40"
                    : isGoal
                      ? `border-primary/60 bg-primary/10 ${goalTone}`
                      : isStart
                        ? `border-primary/60 bg-primary/15 ${startTone}`
                        : "border-border bg-surface hover:border-primary"
                } disabled:opacity-80`}
                aria-label={`${sideLabel(side)} ${row + 1}-${col + 1}`}
              >
                {isWall ? "" : isStart ? "S" : isGoal ? "G" : arrowSymbol(arrow)}
              </button>
            );
          }),
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-surface/60 p-3 text-xs text-muted-foreground">
        <div className="mb-2 font-mono uppercase tracking-[0.15em]">Legend</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <ArrowUp className="h-3 w-3" /> Up
          </span>
          <span className="inline-flex items-center gap-1">
            <ArrowRight className="h-3 w-3" /> Right
          </span>
          <span className="inline-flex items-center gap-1">
            <ArrowDown className="h-3 w-3" /> Down
          </span>
          <span className="inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Left
          </span>
        </div>
      </div>
    </section>
  );
}

function StatChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3">
      <div className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 font-display text-2xl text-foreground">{value}</div>
    </div>
  );
}
