import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { ArrowLeft, Clock, Lightbulb, Shuffle, Heart, Sparkles, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/challenges/complete-picture")({
  head: () => ({
    meta: [
      { title: "UNVEIL Love Tiles — UNVEIL" },
      { name: "description", content: "Piece by piece, love comes into focus. A romantic Mahjong-style tile match game." },
    ],
  }),
  component: LoveTiles,
});

// Symbol set — romantic mahjong theme
const SYMBOLS = [
  { key: "heart",   glyph: "❤️", label: "Heart" },
  { key: "rose",    glyph: "🌹", label: "Rose" },
  { key: "ring",    glyph: "💍", label: "Ring" },
  { key: "key",     glyph: "🗝️", label: "Key" },
  { key: "lock",    glyph: "🔒", label: "Lock" },
  { key: "letter",  glyph: "💌", label: "Love Letter" },
  { key: "candle",  glyph: "🕯️", label: "Candle" },
  { key: "dove",    glyph: "🕊️", label: "Dove" },
  { key: "tulip",   glyph: "🌷", label: "Tulip" },
  { key: "moon",    glyph: "🌙", label: "Moon" },
  { key: "sparkle", glyph: "✨", label: "Sparkle" },
  { key: "kiss",    glyph: "💋", label: "Kiss" },
] as const;

type Tile = {
  id: string;        // unique per tile
  symbol: string;    // symbol key
  glyph: string;
  cleared: boolean;
};

const LEVEL_CONFIG = [
  { level: 1, pairs: 8,  seconds: 90 },
  { level: 2, pairs: 10, seconds: 90 },
  { level: 3, pairs: 12, seconds: 100 },
];

function makeBoard(pairs: number): Tile[] {
  const chosen = [...SYMBOLS].sort(() => Math.random() - 0.5).slice(0, pairs);
  const tiles: Tile[] = [];
  chosen.forEach((s, i) => {
    tiles.push({ id: `${s.key}-a-${i}`, symbol: s.key, glyph: s.glyph, cleared: false });
    tiles.push({ id: `${s.key}-b-${i}`, symbol: s.key, glyph: s.glyph, cleared: false });
  });
  return tiles.sort(() => Math.random() - 0.5);
}

function LoveTiles() {
  const [levelIdx, setLevelIdx] = useState(0);
  const cfg = LEVEL_CONFIG[levelIdx];
  const [tiles, setTiles] = useState<Tile[]>(() => makeBoard(cfg.pairs));
  const [selected, setSelected] = useState<string[]>([]);
  const [matched, setMatched] = useState(0);
  const [seconds, setSeconds] = useState(cfg.seconds);
  const [hints, setHints] = useState(2);
  const [shuffles, setShuffles] = useState(2);
  const [boost, setBoost] = useState(false);
  const [hintPair, setHintPair] = useState<string[]>([]);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const lockRef = useRef(false);

  const total = cfg.pairs;

  const resetLevel = useCallback((idx: number) => {
    const c = LEVEL_CONFIG[idx];
    setTiles(makeBoard(c.pairs));
    setSelected([]);
    setMatched(0);
    setSeconds(c.seconds);
    setHintPair([]);
    setStatus("playing");
    lockRef.current = false;
  }, []);

  // Timer
  useEffect(() => {
    if (status !== "playing") return;
    if (seconds <= 0) { setStatus("lost"); return; }
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds, status]);

  // Match check
  useEffect(() => {
    if (selected.length !== 2) return;
    lockRef.current = true;
    const [a, b] = selected;
    const ta = tiles.find((t) => t.id === a);
    const tb = tiles.find((t) => t.id === b);
    if (ta && tb && ta.symbol === tb.symbol) {
      setTimeout(() => {
        setTiles((prev) => prev.map((t) => (t.id === a || t.id === b ? { ...t, cleared: true } : t)));
        setMatched((m) => {
          const next = m + 1;
          if (next >= total) setStatus("won");
          return next;
        });
        setSelected([]);
        lockRef.current = false;
      }, 320);
    } else {
      setTimeout(() => {
        setSelected([]);
        lockRef.current = false;
      }, 720);
    }
  }, [selected, tiles, total]);

  const onTap = (id: string) => {
    if (status !== "playing" || lockRef.current) return;
    const t = tiles.find((x) => x.id === id);
    if (!t || t.cleared || selected.includes(id)) return;
    setHintPair([]);
    setSelected((s) => (s.length < 2 ? [...s, id] : s));
  };

  const useHint = () => {
    if (hints <= 0 || status !== "playing") return;
    const remaining = tiles.filter((t) => !t.cleared);
    const bySym = new Map<string, string[]>();
    remaining.forEach((t) => {
      const arr = bySym.get(t.symbol) ?? [];
      arr.push(t.id);
      bySym.set(t.symbol, arr);
    });
    const pair = [...bySym.values()].find((ids) => ids.length >= 2);
    if (pair) {
      setHintPair([pair[0], pair[1]]);
      setHints((h) => h - 1);
      setTimeout(() => setHintPair([]), 1600);
    } else {
      toast("No pairs left to hint");
    }
  };

  const useShuffle = () => {
    if (shuffles <= 0 || status !== "playing") return;
    setTiles((prev) => {
      const cleared = prev.filter((t) => t.cleared);
      const live = prev.filter((t) => !t.cleared).sort(() => Math.random() - 0.5);
      return [...live, ...cleared];
    });
    setSelected([]);
    setShuffles((s) => s - 1);
    toast("Board reshuffled");
  };

  const useBoost = () => {
    if (boost) return;
    setBoost(true);
    setSeconds((s) => s + 15);
    toast("💖 Love Boost x2 — +15s");
  };

  const nextLevel = () => {
    if (levelIdx + 1 < LEVEL_CONFIG.length) {
      const n = levelIdx + 1;
      setLevelIdx(n);
      setHints(2); setShuffles(2); setBoost(false);
      resetLevel(n);
    } else {
      toast("You've completed all levels 💕");
    }
  };

  const progress = `${matched}/${total}`;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(ellipse_at_top,rgba(80,20,80,0.35),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(180,40,90,0.25),transparent_65%)]">
      <UnveilNav />

      {/* Floating petals */}
      <Petals />

      <div className="relative mx-auto max-w-md px-4 pb-28 pt-4">
        {/* Top row */}
        <div className="flex items-center justify-between">
          <Link
            to="/challenges"
            className="inline-flex items-center gap-2 rounded-full border border-pink-400/40 bg-black/40 px-3 py-1.5 text-xs text-pink-100 backdrop-blur hover:border-pink-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-pink-200/80">
            UNVEIL · New Challenge
          </div>
          <div className="w-[52px]" />
        </div>

        {/* Title */}
        <div className="mt-4 text-center">
          <h1
            className="font-display text-3xl font-bold tracking-wide"
            style={{
              background: "linear-gradient(180deg,#ffd1e8 0%,#ff6fae 45%,#c447a8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 14px rgba(255,90,170,0.45))",
            }}
          >
            UNVEIL LOVE TILES
          </h1>
          <p className="mt-1 text-xs text-pink-100/70">Piece by piece, love comes into focus.</p>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 items-center gap-2">
          <div className="flex items-center justify-center gap-2 rounded-full border border-pink-400/40 bg-black/40 px-3 py-2 text-pink-200 shadow-[0_0_18px_-6px_rgba(255,90,170,0.7)]">
            <Heart className="h-3.5 w-3.5 fill-pink-400 text-pink-400" />
            <span className="font-mono text-xs">{progress}</span>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-full border border-purple-400/50 bg-black/40 px-3 py-2 text-purple-100 shadow-[0_0_18px_-6px_rgba(180,120,255,0.7)]">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">{mm}:{ss}</span>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-full border border-amber-300/50 bg-black/40 px-3 py-2 text-amber-100 shadow-[0_0_18px_-6px_rgba(255,200,80,0.6)]">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">Level {cfg.level}</span>
          </div>
        </div>

        {/* Board */}
        <div
          className="mt-5 rounded-3xl border border-pink-400/25 bg-gradient-to-b from-black/50 to-purple-950/40 p-3 shadow-[0_0_50px_-15px_rgba(255,90,170,0.55)] backdrop-blur"
        >
          <div className="grid grid-cols-4 gap-2">
            {tiles.map((t) => {
              const isSelected = selected.includes(t.id);
              const isHint = hintPair.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => onTap(t.id)}
                  disabled={t.cleared}
                  className={[
                    "relative aspect-[3/4] rounded-xl border text-3xl transition-all duration-200",
                    "flex items-center justify-center",
                    t.cleared
                      ? "opacity-0 pointer-events-none scale-90"
                      : "bg-gradient-to-b from-[#fff2e0] to-[#f7d9c2] border-amber-200/70 shadow-[0_2px_0_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.7)]",
                    isSelected && !t.cleared
                      ? "ring-2 ring-pink-400 shadow-[0_0_22px_rgba(255,90,170,0.9)] -translate-y-0.5"
                      : "",
                    isHint && !t.cleared ? "ring-2 ring-amber-300 shadow-[0_0_22px_rgba(255,200,80,0.9)]" : "",
                  ].join(" ")}
                  aria-label={`Tile ${t.symbol}`}
                >
                  <span className="drop-shadow-sm">{t.glyph}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="mt-5 grid grid-cols-3 items-end gap-3">
          <button
            onClick={useHint}
            disabled={hints <= 0}
            className="relative flex flex-col items-center gap-1 rounded-2xl border border-purple-400/40 bg-black/40 px-3 py-3 text-purple-100 disabled:opacity-40"
          >
            <Lightbulb className="h-5 w-5" />
            <span className="text-xs">Hint</span>
            <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-purple-500 text-[10px] text-white">{hints}</span>
          </button>

          <button
            onClick={useBoost}
            className="relative flex flex-col items-center gap-1 rounded-2xl border border-pink-400/50 bg-gradient-to-b from-pink-500/20 to-transparent px-3 py-3 text-pink-100 shadow-[0_0_28px_-8px_rgba(255,90,170,0.85)]"
          >
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-b from-pink-400 to-rose-600 text-white shadow-[0_0_16px_rgba(255,90,170,0.9)]">
              <span className="text-xs font-bold">x2</span>
            </div>
            <span className="text-[11px] tracking-wide text-pink-100/90">Love Boost</span>
          </button>

          <button
            onClick={useShuffle}
            disabled={shuffles <= 0}
            className="relative flex flex-col items-center gap-1 rounded-2xl border border-purple-400/40 bg-black/40 px-3 py-3 text-purple-100 disabled:opacity-40"
          >
            <Shuffle className="h-5 w-5" />
            <span className="text-xs">Shuffle</span>
            <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-purple-500 text-[10px] text-white">{shuffles}</span>
          </button>
        </div>

        {/* Instruction */}
        <div className="mt-5 rounded-2xl border border-pink-400/30 bg-black/40 px-4 py-3 text-center text-xs text-pink-100/90 backdrop-blur">
          <span className="mr-2">❤</span>
          Match pairs to clear the board and reveal the hidden picture
          <span className="ml-2">❤</span>
        </div>

        {/* Win / lose overlay */}
        {status !== "playing" && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-pink-400/50 bg-gradient-to-b from-purple-950 to-black p-6 text-center shadow-[0_0_60px_-10px_rgba(255,90,170,0.7)]">
              <div className="text-5xl">{status === "won" ? "💖" : "🕯️"}</div>
              <h2 className="mt-3 font-display text-2xl text-pink-100">
                {status === "won" ? "Love Revealed" : "Time's up"}
              </h2>
              <p className="mt-1 text-sm text-pink-100/70">
                {status === "won"
                  ? `Level ${cfg.level} cleared with ${mm}:${ss} left.`
                  : "The picture faded. Try again to bring it back."}
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => resetLevel(levelIdx)}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-pink-400/50 bg-black/40 py-2.5 text-sm text-pink-100"
                >
                  <RotateCcw className="h-4 w-4" /> Replay
                </button>
                {status === "won" && levelIdx + 1 < LEVEL_CONFIG.length && (
                  <button
                    onClick={nextLevel}
                    className="flex-1 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 py-2.5 text-sm font-medium text-white shadow-[0_0_24px_rgba(255,90,170,0.7)]"
                  >
                    Next Level
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Petals() {
  const petals = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 10 + Math.random() * 10,
        size: 10 + Math.random() * 14,
        rotate: Math.random() * 360,
      })),
    [],
  );
  return (
    <>
      <style>{`
        @keyframes petalFall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          10% { opacity: 0.9; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {petals.map((p) => (
          <span
            key={p.id}
            className="absolute top-0 select-none"
            style={{
              left: `${p.left}%`,
              fontSize: `${p.size}px`,
              animation: `petalFall ${p.duration}s linear ${p.delay}s infinite`,
              transform: `rotate(${p.rotate}deg)`,
              filter: "drop-shadow(0 0 6px rgba(255,90,170,0.6))",
            }}
          >
            🌸
          </span>
        ))}
      </div>
    </>
  );
}
