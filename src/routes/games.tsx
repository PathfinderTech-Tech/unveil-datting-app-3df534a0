import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import {
  CalendarDays,
  Flame,
  HelpCircle,
  Home,
  Music2,
  RefreshCw,
  Shuffle,
  Trophy,
  VolumeX,
  WifiOff,
} from "lucide-react";

export const Route = createFileRoute("/games")({
  head: () => ({
    meta: [
      { title: "UNVEIL Love Tiles — UNVEIL" },
      {
        name: "description",
        content:
          "Match romantic symbols, gemstones, and love tokens to reveal deeper connections.",
      },
    ],
  }),
  errorComponent: ({ error }) => <RouteFallback error={error} />,
  component: UnveilTileMatchPage,
});

type Difficulty = "easy" | "medium" | "hard";
type TileType =
  | "cupid"
  | "yin-yang"
  | "diamond"
  | "ruby"
  | "emerald"
  | "sapphire"
  | "amethyst"
  | "topaz"
  | "pearl"
  | "opal"
  | "aquamarine"
  | "black-diamond"
  | "pink-diamond"
  | "garnet"
  | "citrine"
  | "peridot"
  | "tanzanite"
  | "morganite"
  | "tourmaline"
  | "zircon"
  | "lapis-lazuli"
  | "moonstone"
  | "sunstone"
  | "turquoise"
  | "rose"
  | "heart"
  | "ring"
  | "key"
  | "lock"
  | "dove"
  | "candle"
  | "butterfly"
  | "love-letter"
  | "crown"
  | "infinity"
  | "twin-flame"
  | "constellation"
  ;

type TileCard = {
  id: string;
  pairId: string;
  type: TileType;
  flipped: boolean;
  matched: boolean;
};

type Achievement =
  | "first-match"
  | "daily-devotee"
  | "calm-mind"
  | "streak-5"
  | "luminous-10";

type Progress = {
  level: number;
  xp: number;
  bestScore: number;
  streak: number;
  lastDailyKey: string | null;
  achievements: Achievement[];
  musicMuted: boolean;
};

const STORAGE_KEY = "unveil-tile-match-progress-v1";

const TILE_TYPES: TileType[] = [
  "cupid",
  "yin-yang",
  "diamond",
  "ruby",
  "emerald",
  "sapphire",
  "amethyst",
  "topaz",
  "pearl",
  "opal",
  "aquamarine",
  "black-diamond",
  "pink-diamond",
  "garnet",
  "citrine",
  "peridot",
  "tanzanite",
  "morganite",
  "tourmaline",
  "zircon",
  "lapis-lazuli",
  "moonstone",
  "sunstone",
  "turquoise",
  "rose",
  "heart",
  "ring",
  "key",
  "lock",
  "dove",
  "candle",
  "butterfly",
  "love-letter",
  "crown",
  "infinity",
  "twin-flame",
  "constellation",
];

const DIFFICULTY_RULES: Record<
  Difficulty,
  { pairs: number; columns: number; label: string }
> = {
  easy: { pairs: 8, columns: 4, label: "Easy" },
  medium: { pairs: 12, columns: 4, label: "Medium" },
  hard: { pairs: 16, columns: 6, label: "Hard" },
};

function defaultProgress(): Progress {
  return {
    level: 1,
    xp: 0,
    bestScore: 0,
    streak: 0,
    lastDailyKey: null,
    achievements: [],
    musicMuted: false,
  };
}

function todayKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}`;
}

function loadProgress(): Progress {
  if (typeof window === "undefined") return defaultProgress();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    return { ...defaultProgress(), ...(JSON.parse(raw) as Partial<Progress>) };
  } catch {
    return defaultProgress();
  }
}

function persistProgress(progress: Progress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number) {
  const out = items.slice();
  const rand = seededRandom(seed);

  for (let index = out.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rand() * (index + 1));
    [out[index], out[swapIndex]] = [out[swapIndex], out[index]];
  }

  return out;
}

function buildDeck(difficulty: Difficulty, seed: number): {
  cards: TileCard[];
  columns: number;
} {
  const rule = DIFFICULTY_RULES[difficulty];
  const activeTiles = seededShuffle(TILE_TYPES, seed).slice(0, rule.pairs);
  const pairs = activeTiles.flatMap((type, index) => {
    const pairId = `${type}-${index}`;
    return [
      { id: `${pairId}-a`, pairId, type, flipped: false, matched: false },
      { id: `${pairId}-b`, pairId, type, flipped: false, matched: false },
    ] satisfies TileCard[];
  });

  return {
    cards: seededShuffle(pairs, seed + 17),
    columns: rule.columns,
  };
}

function recommendedDifficulty(level: number): Difficulty {
  if (level >= 8) return "hard";
  if (level >= 4) return "medium";
  return "easy";
}

function scoreRound(
  difficulty: Difficulty,
  moves: number,
  seconds: number,
  hintsUsed: number,
) {
  const difficultyBonus = difficulty === "hard" ? 220 : difficulty === "medium" ? 150 : 90;
  const moveBonus = Math.max(0, 320 - moves * 6);
  const timeBonus = Math.max(0, 240 - seconds * 2);
  const hintPenalty = hintsUsed * 40;
  return Math.max(25, difficultyBonus + moveBonus + timeBonus - hintPenalty);
}

function useAmbientMusic(muted: boolean) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);

  useEffect(() => {
    return () => {
      oscillatorsRef.current.forEach((oscillator) => oscillator.stop());
      oscillatorsRef.current = [];
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = muted ? 0 : 0.03;
    }
  }, [muted]);

  async function start() {
    if (typeof window === "undefined") return;

    const AudioCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtor) return;

    if (!audioContextRef.current) {
      const context = new AudioCtor();
      const gainNode = context.createGain();
      gainNode.gain.value = muted ? 0 : 0.03;
      gainNode.connect(context.destination);

      const oscillators = [174.61, 220, 261.63].map((frequency) => {
        const oscillator = context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        oscillator.connect(gainNode);
        oscillator.start();
        return oscillator;
      });

      audioContextRef.current = context;
      gainNodeRef.current = gainNode;
      oscillatorsRef.current = oscillators;
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
  }

  return { start };
}

function UnveilTileMatchPage() {
  const [progress, setProgress] = useState<Progress>(() => defaultProgress());
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [dailyMode, setDailyMode] = useState(false);
  const [cards, setCards] = useState<TileCard[]>([]);
  const [columns, setColumns] = useState(4);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [locked, setLocked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [deckSeed, setDeckSeed] = useState(1);

  const revealTimeoutRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const { start } = useAmbientMusic(progress.musicMuted);

  const activeDifficulty = dailyMode ? "medium" : difficulty;
  const boardComplete = cards.length > 0 && matchedPairs === cards.length / 2;
  const cardAspect = columns === 6 ? "aspect-[0.88]" : "aspect-square";
  const suggestedDifficulty = recommendedDifficulty(progress.level);
  const activeSeed = dailyMode ? Number(todayKey().replace(/-/g, "")) : deckSeed;

  const nextBoard = useMemo(
    () => buildDeck(activeDifficulty, activeSeed),
    [activeDifficulty, activeSeed],
  );

  useEffect(() => {
    setProgress(loadProgress());
    setOnline(window.navigator.onLine);
    setDeckSeed(Date.now() % 4294967296);
  }, []);

  useEffect(() => {
    persistProgress(progress);
  }, [progress]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    resetBoard(nextBoard.cards, nextBoard.columns);

    return () => {
      if (revealTimeoutRef.current) window.clearTimeout(revealTimeoutRef.current);
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [nextBoard.cards, nextBoard.columns]);

  useEffect(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [cards.length]);

  useEffect(() => {
    if (!boardComplete) return;

    if (timerRef.current) window.clearInterval(timerRef.current);

    const score = scoreRound(activeDifficulty, moves, seconds, hintsUsed);
    const xpGain = Math.floor(score / 2);
    const dailyKey = todayKey();
    const dailyAdvanced = dailyMode && progress.lastDailyKey !== dailyKey;
    const achievements = new Set(progress.achievements);

    achievements.add("first-match");
    if (hintsUsed === 0) achievements.add("calm-mind");

    const streak = dailyAdvanced ? progress.streak + 1 : progress.streak;
    if (dailyAdvanced) achievements.add("daily-devotee");
    if (streak >= 5) achievements.add("streak-5");

    const totalXp = progress.xp + xpGain;
    const levelGain = Math.floor(totalXp / 350);
    const level = Math.max(progress.level, 1 + levelGain + (dailyAdvanced ? 1 : 0));
    if (level >= 10) achievements.add("luminous-10");

    setProgress((current) => ({
      ...current,
      level,
      xp: totalXp,
      bestScore: Math.max(current.bestScore, score),
      streak,
      lastDailyKey: dailyAdvanced ? dailyKey : current.lastDailyKey,
      achievements: Array.from(achievements),
    }));

    setMessage(`Round complete · ${score} score · +${xpGain} XP`);
  }, [activeDifficulty, boardComplete, dailyMode, hintsUsed, moves, progress, seconds]);

  function resetBoard(nextCards?: TileCard[], nextColumns?: number) {
    if (revealTimeoutRef.current) window.clearTimeout(revealTimeoutRef.current);
    setCards((nextCards ?? nextBoard.cards).map((card) => ({ ...card, flipped: false, matched: false })));
    setColumns(nextColumns ?? nextBoard.columns);
    setMoves(0);
    setSeconds(0);
    setHintsUsed(0);
    setMatchedPairs(0);
    setLocked(false);
    setMessage(null);
  }

  function shuffleUnmatched() {
    if (locked || boardComplete) return;

    const fixed = cards.filter((card) => card.matched);
    const free = cards
      .filter((card) => !card.matched)
      .map((card) => ({ ...card, flipped: false }));

    setCards(seededShuffle([...fixed, ...free], deckSeed + moves + 1));
    setMessage("Unmatched tiles shuffled");
  }

  function showHint() {
    if (locked || boardComplete) return;

    const groups = new Map<string, TileCard[]>();
    cards
      .filter((card) => !card.matched)
      .forEach((card) => {
        const group = groups.get(card.pairId) ?? [];
        group.push(card);
        groups.set(card.pairId, group);
      });

    const pair = Array.from(groups.values()).find((group) => group.length === 2);
    if (!pair) return;

    const ids = new Set(pair.map((card) => card.id));
    setHintsUsed((value) => value + 1);
    setCards((current) =>
      current.map((card) => (ids.has(card.id) ? { ...card, flipped: true } : card)),
    );

    if (revealTimeoutRef.current) window.clearTimeout(revealTimeoutRef.current);
    revealTimeoutRef.current = window.setTimeout(() => {
      setCards((current) =>
        current.map((card) =>
          ids.has(card.id) && !card.matched ? { ...card, flipped: false } : card,
        ),
      );
    }, 900);
  }

  function onCardClick(card: TileCard) {
    if (locked || card.flipped || card.matched) return;

    const openCards = cards.filter((item) => item.flipped && !item.matched);
    if (openCards.length >= 2) return;

    const nextCardsState = cards.map((item) =>
      item.id === card.id ? { ...item, flipped: true } : item,
    );
    const nextOpenCards = nextCardsState.filter((item) => item.flipped && !item.matched);
    setCards(nextCardsState);

    if (nextOpenCards.length !== 2) return;

    setMoves((value) => value + 1);
    const [first, second] = nextOpenCards;

    if (first.pairId === second.pairId) {
      setCards((current) =>
        current.map((item) =>
          item.pairId === first.pairId ? { ...item, matched: true } : item,
        ),
      );
      setMatchedPairs((value) => value + 1);
      return;
    }

    setLocked(true);
    revealTimeoutRef.current = window.setTimeout(() => {
      setCards((current) =>
        current.map((item) => (item.matched ? item : { ...item, flipped: false })),
      );
      setLocked(false);
    }, 650);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,rgba(168,85,247,0.18),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(251,191,36,0.16),transparent_28%),radial-gradient(circle_at_50%_90%,rgba(59,130,246,0.14),transparent_34%)]">
      <UnveilNav />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Official In-App Game
            </div>
            <h1 className="mt-2 font-display text-4xl font-light sm:text-5xl">
              UNVEIL Love Tiles
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Match romantic symbols, gemstones, and love tokens to reveal deeper
              connections with premium glowing 3D tiles.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card/80 px-4 py-3 text-sm">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Progressive Level
            </div>
            <div className="mt-1 flex items-center gap-2 font-display text-2xl">
              <Flame className="h-5 w-5 text-accent" /> {progress.level}
            </div>
          </div>
        </div>

        {!online && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs text-muted-foreground">
            <WifiOff className="h-3.5 w-3.5" /> Offline mode active. Progress saves locally.
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <section className="rounded-3xl border border-border bg-card/70 p-4 shadow-glow sm:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {(["easy", "medium", "hard"] as Difficulty[]).map((entry) => (
                <button
                  key={entry}
                  type="button"
                  disabled={dailyMode}
                  onClick={() => setDifficulty(entry)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    activeDifficulty === entry
                      ? "border-primary bg-primary/20 text-foreground"
                      : "border-border text-muted-foreground"
                  } disabled:opacity-40`}
                >
                  {DIFFICULTY_RULES[entry].label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setDailyMode((value) => !value)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition ${
                  dailyMode
                    ? "border-accent bg-accent/20 text-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" /> Daily Challenge
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Stat label="Moves" value={String(moves)} />
              <Stat label="Time" value={`${seconds}s`} />
              <Stat label="Hints" value={String(hintsUsed)} />
              <Stat label="Matched" value={`${matchedPairs}/${cards.length / 2 || 0}`} />
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={showHint}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs hover:border-primary"
              >
                <HelpCircle className="h-3.5 w-3.5" /> Hint
              </button>

              <button
                type="button"
                onClick={shuffleUnmatched}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs hover:border-primary"
              >
                <Shuffle className="h-3.5 w-3.5" /> Shuffle
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!dailyMode) {
                    setDeckSeed(Date.now() % 4294967296);
                  }
                  resetBoard();
                }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs hover:border-primary"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Restart
              </button>

              <button
                type="button"
                onClick={async () => {
                  await start();
                  setProgress((current) => ({
                    ...current,
                    musicMuted: !current.musicMuted,
                  }));
                }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs hover:border-primary"
              >
                {progress.musicMuted ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Music2 className="h-3.5 w-3.5" />
                )}
                {progress.musicMuted ? "Unmute" : "Mute"}
              </button>
            </div>

            <div className={`grid gap-2 sm:gap-3 ${columns === 6 ? "grid-cols-6" : "grid-cols-4"}`}>
              {cards.map((card) => (
                <button
                  type="button"
                  key={card.id}
                  onClick={() => onCardClick(card)}
                  className={`${cardAspect} group relative rounded-2xl [perspective:1000px] ${card.matched ? "opacity-80" : ""}`}
                >
                  <div
                    className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                      card.flipped || card.matched ? "[transform:rotateY(180deg)]" : ""
                    }`}
                  >
                    <div className="absolute inset-0 rounded-2xl border border-primary/20 bg-[linear-gradient(140deg,rgba(17,8,35,0.95),rgba(38,17,62,0.95))] shadow-[0_0_20px_rgba(168,85,247,0.2)] [backface-visibility:hidden]" />
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-accent/40 bg-[linear-gradient(160deg,rgba(23,11,40,0.9),rgba(11,19,44,0.9))] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                      <TileArtwork type={card.type} />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {message && (
              <div className="mt-4 rounded-2xl border border-neon/40 bg-neon/10 p-3 text-sm text-foreground">
                {message}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <Panel>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Career Progress
              </div>
              <div className="text-sm text-muted-foreground">
                Current recommended difficulty: {DIFFICULTY_RULES[suggestedDifficulty].label}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full bg-gradient-hero"
                  style={{ width: `${Math.min(100, (progress.xp % 350) / 3.5)}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">XP: {progress.xp}</div>
              <div className="mt-3 text-xs">
                Best score: <span className="font-semibold text-foreground">{progress.bestScore}</span>
              </div>
              <div className="text-xs">
                Daily streak: <span className="font-semibold text-foreground">{progress.streak}</span>
              </div>
            </Panel>

            <Panel>
              <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <Trophy className="h-3.5 w-3.5" /> Achievements
              </div>
              <ul className="space-y-2 text-sm">
                {[
                  ["first-match", "First Match", "Complete your first board."],
                  ["daily-devotee", "Daily Devotee", "Finish the Daily Challenge."],
                  ["calm-mind", "Calm Mind", "Complete a round without hints."],
                  ["streak-5", "Rhythm Keeper", "Maintain a 5-day daily streak."],
                  ["luminous-10", "Luminous 10", "Reach level 10."],
                ].map(([id, title, description]) => {
                  const unlocked = progress.achievements.includes(id as Achievement);
                  return (
                    <li
                      key={id}
                      className={`rounded-2xl border p-2 ${
                        unlocked
                          ? "border-primary/40 bg-primary/10"
                          : "border-border bg-surface/60"
                      }`}
                    >
                      <div className="font-medium">{title}</div>
                      <div className="text-xs text-muted-foreground">{description}</div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}

function RouteFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen">
      <UnveilNav />
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-glow">
          <Trophy className="h-6 w-6 text-accent" />
        </div>
        <h1 className="font-display text-3xl">Something went wrong. Please try again.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Love Tiles failed on this screen only. The rest of UNVEIL remains available.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2.5 text-sm text-primary-foreground shadow-glow"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
          <a
            href="/discover"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm"
          >
            <Home className="h-4 w-4" /> Go Home
          </a>
          <a
            href="mailto:support@unveil.best?subject=UNVEIL%20Love%20Tiles%20Issue"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm"
          >
            Report Issue
          </a>
        </div>
        {import.meta.env.DEV && (
          <pre className="mt-6 overflow-auto rounded-2xl border border-border bg-card p-4 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}
      </div>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="rounded-3xl border border-border bg-card/80 p-4">{children}</section>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 p-3">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-foreground">{value}</div>
    </div>
  );
}

function TileArtwork({ type }: { type: TileType }) {
  const gradient =
    type === "diamond" || type === "black-diamond" || type === "pink-diamond"
      ? "from-slate-200 via-indigo-300 to-fuchsia-300"
      : type === "ruby" || type === "garnet"
        ? "from-rose-300 via-red-400 to-rose-600"
        : type === "emerald" || type === "peridot"
          ? "from-emerald-300 via-green-400 to-emerald-600"
          : type === "sapphire" || type === "aquamarine" || type === "lapis-lazuli"
            ? "from-cyan-300 via-sky-400 to-blue-600"
            : "from-fuchsia-300 via-violet-400 to-amber-300";

  const TILE_LOOKUP: Record<TileType, { symbol: string; label: string }> = {
    cupid: { symbol: "🏹", label: "Cupid" },
    "yin-yang": { symbol: "☯", label: "Yin Yang" },
    diamond: { symbol: "◆", label: "Diamond" },
    ruby: { symbol: "♦", label: "Ruby" },
    emerald: { symbol: "⬢", label: "Emerald" },
    sapphire: { symbol: "⬣", label: "Sapphire" },
    amethyst: { symbol: "✦", label: "Amethyst" },
    topaz: { symbol: "✧", label: "Topaz" },
    pearl: { symbol: "◉", label: "Pearl" },
    opal: { symbol: "◌", label: "Opal" },
    aquamarine: { symbol: "◈", label: "Aquamarine" },
    "black-diamond": { symbol: "⬥", label: "Black Diamond" },
    "pink-diamond": { symbol: "⬦", label: "Pink Diamond" },
    garnet: { symbol: "✹", label: "Garnet" },
    citrine: { symbol: "✶", label: "Citrine" },
    peridot: { symbol: "⬟", label: "Peridot" },
    tanzanite: { symbol: "✺", label: "Tanzanite" },
    morganite: { symbol: "✸", label: "Morganite" },
    tourmaline: { symbol: "✷", label: "Tourmaline" },
    zircon: { symbol: "✵", label: "Zircon" },
    "lapis-lazuli": { symbol: "✣", label: "Lapis Lazuli" },
    moonstone: { symbol: "☾", label: "Moonstone" },
    sunstone: { symbol: "☼", label: "Sunstone" },
    turquoise: { symbol: "◍", label: "Turquoise" },
    rose: { symbol: "🌹", label: "Rose" },
    heart: { symbol: "♥", label: "Heart" },
    ring: { symbol: "💍", label: "Ring" },
    key: { symbol: "🗝", label: "Key" },
    lock: { symbol: "🔒", label: "Lock" },
    dove: { symbol: "🕊", label: "Dove" },
    candle: { symbol: "🕯", label: "Candle" },
    butterfly: { symbol: "🦋", label: "Butterfly" },
    "love-letter": { symbol: "💌", label: "Love Letter" },
    crown: { symbol: "♕", label: "Crown" },
    infinity: { symbol: "∞", label: "Infinity" },
    "twin-flame": { symbol: "🔥", label: "Twin Flame" },
    constellation: { symbol: "✧", label: "Constellation" },
  };
  const tile = TILE_LOOKUP[type];

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-40`} />
      <div className="absolute inset-[6%] rounded-xl border border-white/25 bg-white/5 shadow-[inset_0_6px_16px_rgba(255,255,255,0.18)]" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-35" aria-hidden="true">
        <defs>
          <linearGradient id={`tile-${type}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="38" fill="none" stroke={`url(#tile-${type})`} strokeWidth="3" opacity="0.7" />
      </svg>
      <span className="relative text-3xl text-foreground drop-shadow-[0_0_18px_rgba(236,72,153,0.45)]">
        {tile.symbol}
      </span>
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/35 px-2 py-0.5 text-[9px] uppercase tracking-wider text-white/80">
        {tile.label}
      </span>
    </div>
  );
}
