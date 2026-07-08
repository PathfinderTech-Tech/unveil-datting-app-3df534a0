import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { ArrowLeft, Lightbulb, Shuffle, Heart, Sparkles, Timer as TimerIcon, Trophy } from "lucide-react";
import { UnveilNav } from "@/components/UnveilNav";

export const Route = createFileRoute("/love-tiles")({
  head: () => ({
    meta: [
      { title: "UNVEIL Love Tiles — Match the symbols of love" },
      { name: "description", content: "A romantic mahjong-style matching game. Pair the symbols of love to earn chemistry points toward your Passport." },
    ],
  }),
  component: LoveTilesRoute,
});

const SYMBOLS = ["❤️","🌹","💍","🗝️","🔒","💌","🕯️","🕊️","🌺","🌙","✨","💐"];
const ROUND_SECONDS = 180;

type Tile = { id: number; symbol: string; matched: boolean };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(): Tile[] {
  const doubled = [...SYMBOLS, ...SYMBOLS];
  return shuffle(doubled).map((symbol, id) => ({ id, symbol, matched: false }));
}

function LoveTilesRoute() {
  const [level, setLevel] = useState(1);
  const [tiles, setTiles] = useState<Tile[]>(() => buildDeck());
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [lovePoints, setLovePoints] = useState(0);
  const [hints, setHints] = useState(3);
  const [shuffles, setShuffles] = useState(3);
  const [boost, setBoost] = useState(false);
  const [hintPair, setHintPair] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [paused, setPaused] = useState(false);

  const totalPairs = SYMBOLS.length;
  const matchedPairs = useMemo(() => tiles.filter(t => t.matched).length / 2, [tiles]);
  const complete = matchedPairs === totalPairs;

  // Timer
  useEffect(() => {
    if (complete || paused || timeLeft <= 0) return;
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, complete, paused]);

  // Match resolution
  useEffect(() => {
    if (selected.length !== 2) return;
    const [a, b] = selected;
    const ta = tiles.find(t => t.id === a)!;
    const tb = tiles.find(t => t.id === b)!;
    if (ta.symbol === tb.symbol) {
      const gain = boost ? 20 : 10;
      const t = setTimeout(() => {
        setTiles(prev => prev.map(x => x.id === a || x.id === b ? { ...x, matched: true } : x));
        setLovePoints(p => p + gain);
        setSelected([]);
        setBoost(false);
      }, 350);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setSelected([]), 750);
      return () => clearTimeout(t);
    }
  }, [selected, tiles, boost]);

  const flip = (id: number) => {
    if (paused || complete) return;
    const tile = tiles.find(t => t.id === id);
    if (!tile || tile.matched) return;
    if (selected.includes(id) || selected.length === 2) return;
    setSelected(s => {
      const next = [...s, id];
      if (next.length === 2) setMoves(m => m + 1);
      return next;
    });
  };

  const useHint = useCallback(() => {
    if (hints <= 0) return;
    const remaining = tiles.filter(t => !t.matched);
    const bySymbol: Record<string, number[]> = {};
    remaining.forEach(t => { (bySymbol[t.symbol] ||= []).push(t.id); });
    const pair = Object.values(bySymbol).find(ids => ids.length >= 2);
    if (!pair) return;
    setHints(h => h - 1);
    setHintPair([pair[0], pair[1]]);
    setTimeout(() => setHintPair([]), 1200);
  }, [hints, tiles]);

  const useShuffle = () => {
    if (shuffles <= 0) return;
    setShuffles(s => s - 1);
    setTiles(prev => {
      const matched = prev.filter(t => t.matched);
      const unmatched = shuffle(prev.filter(t => !t.matched).map(t => t.symbol));
      const rebuilt = prev.map(t => t.matched ? t : { ...t, symbol: unmatched.shift()! });
      return rebuilt;
    });
    setSelected([]);
  };

  const useBoost = () => setBoost(b => !b);

  const nextLevel = () => {
    setLevel(l => l + 1);
    setTiles(buildDeck());
    setSelected([]);
    setMoves(0);
    setHintPair([]);
    setTimeLeft(ROUND_SECONDS);
    setBoost(false);
  };

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const progressPct = (matchedPairs / totalPairs) * 100;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,rgba(236,72,153,0.18),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.18),transparent_35%),radial-gradient(circle_at_50%_100%,rgba(234,179,8,0.10),transparent_45%),linear-gradient(180deg,#0b0714,#050208)] pb-24 lg:pb-0">
      <UnveilNav />

      {/* Floating petals */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="absolute animate-[fall_14s_linear_infinite] text-pink-400/40"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `-${(i * 13) % 40}px`,
              fontSize: `${10 + (i % 4) * 4}px`,
              animationDelay: `${(i * 1.1) % 12}s`,
              animationDuration: `${10 + (i % 6)}s`,
            }}
          >
            🌸
          </span>
        ))}
      </div>

      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
      `}</style>

      <div className="relative mx-auto max-w-3xl px-4 py-5 sm:px-6">
        <Link
          to="/games"
          className="inline-flex items-center gap-2 rounded-full border border-pink-400/30 bg-black/40 px-4 py-2 text-xs text-pink-100 backdrop-blur transition hover:border-pink-300/60 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <header className="mt-5 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-pink-200/70">
            UNVEIL · NEW CHALLENGE
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight sm:text-5xl">
            <span className="bg-gradient-to-r from-amber-200 via-pink-300 to-fuchsia-400 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(236,72,153,0.35)]">
              UNVEIL LOVE TILES
            </span>
          </h1>
          <p className="mt-2 text-sm text-pink-100/70">
            Piece by piece, love comes into focus.
          </p>
        </header>

        {/* Stats */}
        <section className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard icon={<Heart className="h-4 w-4 text-pink-400" />} label="Love Points" value={`${lovePoints}`} />
          <StatCard icon={<TimerIcon className="h-4 w-4 text-purple-300" />} label="Time Left" value={`${mm}:${ss}`} />
          <StatCard icon={<Sparkles className="h-4 w-4 text-amber-300" />} label={`Level ${level}`} value={`${matchedPairs}/${totalPairs}`} />
        </section>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-amber-300 via-pink-400 to-fuchsia-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Tile board */}
        <section className="mt-5 rounded-3xl border border-pink-400/20 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-3 shadow-[0_0_60px_-15px_rgba(236,72,153,0.35)] backdrop-blur">
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {tiles.map(tile => {
              const isSelected = selected.includes(tile.id);
              const isHinted = hintPair.includes(tile.id);
              const revealed = isSelected || tile.matched || isHinted;
              return (
                <button
                  key={tile.id}
                  onClick={() => flip(tile.id)}
                  aria-label={revealed ? `Tile ${tile.symbol}` : "Hidden tile"}
                  className={`relative aspect-square rounded-lg text-2xl transition-all duration-300 sm:rounded-xl sm:text-3xl
                    ${tile.matched
                      ? "border border-emerald-300/30 bg-emerald-400/5 opacity-40"
                      : revealed
                        ? "border-2 border-pink-300 bg-gradient-to-br from-rose-200/95 to-amber-100/90 text-rose-900 shadow-[0_0_25px_rgba(244,114,182,0.7)]"
                        : "border border-amber-200/20 bg-gradient-to-br from-amber-100/10 to-amber-50/5 hover:border-pink-300/60 hover:shadow-[0_0_18px_rgba(236,72,153,0.35)]"
                    }
                    ${isHinted && !tile.matched ? "ring-2 ring-amber-300 animate-pulse" : ""}
                  `}
                >
                  <span className={`grid h-full w-full place-items-center ${revealed ? "" : "opacity-0"}`}>
                    {tile.symbol}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Actions */}
        <section className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          <ActionButton
            icon={<Lightbulb className="h-4 w-4" />}
            label="Hint"
            count={hints}
            onClick={useHint}
            disabled={hints <= 0 || complete}
            color="from-amber-300/20 to-amber-500/10 border-amber-300/40 text-amber-100"
          />
          <ActionButton
            icon={<Heart className="h-4 w-4 fill-current" />}
            label={boost ? "Boost ON" : "Love Boost"}
            sublabel="×2"
            onClick={useBoost}
            disabled={complete}
            color={boost
              ? "from-pink-500 to-fuchsia-500 border-pink-200 text-white shadow-[0_0_25px_rgba(236,72,153,0.6)]"
              : "from-pink-500/20 to-fuchsia-500/10 border-pink-300/40 text-pink-100"}
          />
          <ActionButton
            icon={<Shuffle className="h-4 w-4" />}
            label="Shuffle"
            count={shuffles}
            onClick={useShuffle}
            disabled={shuffles <= 0 || complete}
            color="from-purple-400/20 to-indigo-500/10 border-purple-300/40 text-purple-100"
          />
        </section>

        {/* Bottom instruction card */}
        <section className="mt-5 rounded-2xl border border-pink-400/20 bg-black/40 p-4 text-center backdrop-blur">
          <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-pink-200/70">How to play</div>
          <p className="mt-1.5 text-sm text-pink-50/80">
            Tap two identical tiles to clear them. Match every pair before the timer runs out to unlock the next level of chemistry.
          </p>
        </section>

        {/* Completion */}
        {complete && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-pink-300/40 bg-gradient-to-b from-[#1a0a1e] to-[#0b0714] p-6 text-center shadow-[0_0_60px_rgba(236,72,153,0.5)]">
              <Trophy className="mx-auto h-8 w-8 text-amber-300" />
              <h2 className="mt-3 font-display text-3xl">Level {level} unveiled</h2>
              <p className="mt-2 text-sm text-pink-100/80">
                +{lovePoints} Love Points · {moves} moves
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={nextLevel}
                  className="rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 py-3 text-sm font-medium text-white shadow-[0_0_25px_rgba(236,72,153,0.5)]"
                >
                  Continue to Level {level + 1}
                </button>
                <Link
                  to="/games"
                  className="rounded-full border border-pink-300/30 py-3 text-sm text-pink-100 hover:bg-white/5"
                >
                  Back to Play first
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Time out */}
        {timeLeft <= 0 && !complete && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-pink-300/40 bg-gradient-to-b from-[#1a0a1e] to-[#0b0714] p-6 text-center">
              <h2 className="font-display text-3xl">Time's up</h2>
              <p className="mt-2 text-sm text-pink-100/80">You matched {matchedPairs} of {totalPairs} pairs.</p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={() => { setTiles(buildDeck()); setSelected([]); setMoves(0); setTimeLeft(ROUND_SECONDS); setLovePoints(0); }}
                  className="rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 py-3 text-sm font-medium text-white"
                >
                  Try again
                </button>
                <Link to="/games" className="rounded-full border border-pink-300/30 py-3 text-sm text-pink-100 hover:bg-white/5">
                  Back to Play first
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-pink-400/20 bg-black/40 px-3 py-2 text-left backdrop-blur">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="font-mono text-[9px] uppercase tracking-wider text-pink-100/60">{label}</span>
      </div>
      <div className="mt-0.5 font-display text-xl text-white">{value}</div>
    </div>
  );
}

function ActionButton({
  icon, label, sublabel, count, onClick, disabled, color,
}: {
  icon: React.ReactNode; label: string; sublabel?: string; count?: number;
  onClick: () => void; disabled?: boolean; color: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl border bg-gradient-to-b px-3 py-3 text-xs font-medium backdrop-blur transition disabled:opacity-40 disabled:cursor-not-allowed ${color}`}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span>{label}</span>
      </div>
      {sublabel && <span className="font-mono text-[10px] opacity-80">{sublabel}</span>}
      {typeof count === "number" && (
        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-black/70 text-[10px] font-bold text-white">
          {count}
        </span>
      )}
    </button>
  );
}
