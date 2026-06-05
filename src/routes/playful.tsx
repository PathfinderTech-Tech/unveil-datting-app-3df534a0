import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  GAMES,
  recordSession,
  sumSession,
  computeTier,
  type GameId,
  type GameResult,
  type Bonus,
} from "@/lib/chemistry-ledger";
import { BonusFlash } from "@/components/chemistry/BonusFlash";
import { ChemistryResults } from "@/components/chemistry/ChemistryResults";
import { WouldYouRatherGame } from "@/components/chemistry/games/WouldYouRatherGame";
import { RedGreenGame } from "@/components/chemistry/games/RedGreenGame";
import { TwoTruthsGame } from "@/components/chemistry/games/TwoTruthsGame";
import { DesertIslandGame } from "@/components/chemistry/games/DesertIslandGame";
import { MemoryMatchGame } from "@/components/chemistry/games/MemoryMatchGame";

export const Route = createFileRoute("/playful")({
  head: () => ({ meta: [
    { title: "Playful Prototypes — UNVEIL" },
    { name: "description", content: "Five short games. One chemistry score for your Passport." },
  ] }),
  component: PlayfulSession,
});

const COMPONENTS: Record<GameId, React.ComponentType<{
  onComplete: (r: Omit<GameResult, "id">) => void;
  onSkip: () => void;
}>> = {
  "would-you-rather": WouldYouRatherGame,
  "red-green":        RedGreenGame,
  "two-truths":       TwoTruthsGame,
  "desert-island":    DesertIslandGame,
  "memory-match":     MemoryMatchGame,
};

function PlayfulSession() {
  const [idx, setIdx] = useState<number>(-1); // -1 = intro
  const [results, setResults] = useState<GameResult[]>([]);
  const [done, setDone] = useState(false);
  const [flashes, setFlashes] = useState<{ id: number; label: string }[]>([]);
  const [displayTotal, setDisplayTotal] = useState(0);
  const flashIdRef = useRef(0);

  const { total } = sumSession(results);

  // Animate counter
  useEffect(() => {
    if (total === displayTotal) return;
    const from = displayTotal;
    const to = total;
    const start = performance.now();
    const dur = 400;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setDisplayTotal(Math.round(from + (to - from) * p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [total, displayTotal]);

  const pushFlash = (b: Bonus) => {
    const id = ++flashIdRef.current;
    setFlashes((f) => [...f, { id, label: `+${b.points} pts — ${b.label}` }]);
  };

  const handleComplete = (game: GameId, r: Omit<GameResult, "id">) => {
    const full: GameResult = { id: game, ...r };
    if (!r.skipped) r.bonuses.forEach(pushFlash);
    const next = [...results, full];
    setResults(next);
    advance(next);
  };

  const handleSkip = (game: GameId) => {
    const full: GameResult = { id: game, skipped: true, base: 0, bonuses: [] };
    const next = [...results, full];
    setResults(next);
    advance(next);
  };

  const advance = (next: GameResult[]) => {
    if (next.length >= GAMES.length) {
      const { total: t } = sumSession(next);
      const tier = computeTier(next, t);
      recordSession(t, tier);
      setDone(true);
    } else {
      setIdx(next.length);
    }
  };

  const resetSession = () => {
    setResults([]);
    setDone(false);
    setDisplayTotal(0);
    setIdx(-1);
  };

  if (done) return <ChemistryResults results={results} onPlayAgain={resetSession} />;

  if (idx === -1) {
    return (
      <Shell totalDisplay={displayTotal} flashes={flashes} onFlashDone={(id) =>
        setFlashes((f) => f.filter((x) => x.id !== id))
      } gameIndex={0}>
        <div className="space-y-5 text-center">
          <h1 className="font-display text-3xl font-extrabold" style={{ color: "#F0EDE8" }}>
            Playful Prototypes
          </h1>
          <p className="text-sm" style={{ color: "#7A7876" }}>
            Five short games. Each adds to a single chemistry score that lives on your Passport.
            Up to <span style={{ color: "#E2C896" }}>160 pts</span> per session.
          </p>
          <ul className="space-y-1 text-sm" style={{ color: "#F0EDE8" }}>
            {GAMES.map((g) => (
              <li key={g.id}>
                <span className="mr-2">{g.emoji}</span>{g.name} · <span style={{ color: "#7A7876" }}>+{g.base} pts base</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setIdx(0)}
            className="w-full rounded-full px-4 py-3 text-sm font-semibold"
            style={{ background: "linear-gradient(135deg, #8B5CF6, #A78BFA)", color: "#0D0D0F" }}
          >
            Begin session
          </button>
          <Link to="/passport" className="block text-[11px]" style={{ color: "#7A7876" }}>
            Back to Passport
          </Link>
        </div>
      </Shell>
    );
  }

  const current = GAMES[idx];
  const Component = COMPONENTS[current.id];

  return (
    <Shell
      totalDisplay={displayTotal}
      flashes={flashes}
      onFlashDone={(id) => setFlashes((f) => f.filter((x) => x.id !== id))}
      gameIndex={idx + 1}
    >
      <Component
        key={current.id}
        onComplete={(r) => handleComplete(current.id, r)}
        onSkip={() => handleSkip(current.id)}
      />
    </Shell>
  );
}

function Shell({
  children,
  totalDisplay,
  flashes,
  onFlashDone,
  gameIndex,
}: {
  children: React.ReactNode;
  totalDisplay: number;
  flashes: { id: number; label: string }[];
  onFlashDone: (id: number) => void;
  gameIndex: number;
}) {
  return (
    <div className="min-h-screen" style={{ background: "#0D0D0F", color: "#F0EDE8" }}>
      <header className="sticky top-0 z-10 backdrop-blur-md"
        style={{ background: "rgba(13,13,15,0.85)", borderBottom: "1px solid #2A2A2E" }}
      >
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <div className="text-[11px] uppercase tracking-wider" style={{ color: "#7A7876" }}>
            {gameIndex > 0 ? `Game ${gameIndex} / ${GAMES.length}` : "Session"}
          </div>
          <div className="relative">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
              style={{
                background: "rgba(201,169,110,0.12)",
                borderColor: "rgba(201,169,110,0.30)",
                color: "#E2C896",
              }}
            >
              ⚗ {totalDisplay} pts
            </span>
            {flashes.map((f) => (
              <BonusFlash key={f.id} label={f.label} onDone={() => onFlashDone(f.id)} />
            ))}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-md px-5 py-8">{children}</main>
    </div>
  );
}
