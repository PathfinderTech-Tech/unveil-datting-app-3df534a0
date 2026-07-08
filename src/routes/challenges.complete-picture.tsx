import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { ArrowLeft, Clock, Lightbulb, Shuffle, Heart, Sparkles, RotateCcw, Flame, Gem } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/challenges/complete-picture")({
  head: () => ({
    meta: [
      { title: "UNVEIL Love Tiles — UNVEIL" },
      { name: "description", content: "Match the symbols of love. Reveal deeper connections. A premium UNVEIL romantic mahjong-style tile game." },
    ],
  }),
  component: LoveTiles,
});

/* ============================================================
   Tile symbol library — SVG-based "premium" luxury artwork
   Each renderer returns a JSX <svg /> so tiles feel handcrafted
   rather than emoji.
   ============================================================ */

type SymbolDef = {
  key: string;
  label: string;
  render: () => JSX.Element;
};

// Shared defs for gradients + glow
function Defs() {
  return (
    <defs>
      <radialGradient id="rubyG" cx="50%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#ffe0e6" />
        <stop offset="45%" stopColor="#ff3a5c" />
        <stop offset="100%" stopColor="#7a0a1c" />
      </radialGradient>
      <radialGradient id="pinkG" cx="50%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#fff0f7" />
        <stop offset="55%" stopColor="#ff7ab6" />
        <stop offset="100%" stopColor="#8b1e5c" />
      </radialGradient>
      <radialGradient id="diamondG" cx="50%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="55%" stopColor="#d8ecff" />
        <stop offset="100%" stopColor="#7ea6d8" />
      </radialGradient>
      <radialGradient id="emeraldG" cx="50%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#e6ffef" />
        <stop offset="55%" stopColor="#2cc27a" />
        <stop offset="100%" stopColor="#0b4a2d" />
      </radialGradient>
      <radialGradient id="sapphireG" cx="50%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#e6f0ff" />
        <stop offset="55%" stopColor="#3a6dff" />
        <stop offset="100%" stopColor="#0a1a5a" />
      </radialGradient>
      <radialGradient id="amethystG" cx="50%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#f4e6ff" />
        <stop offset="55%" stopColor="#a463ff" />
        <stop offset="100%" stopColor="#3a105e" />
      </radialGradient>
      <radialGradient id="topazG" cx="50%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#fff4d6" />
        <stop offset="55%" stopColor="#ffb64a" />
        <stop offset="100%" stopColor="#7a4a08" />
      </radialGradient>
      <linearGradient id="goldG" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fff4c2" />
        <stop offset="45%" stopColor="#f0c060" />
        <stop offset="100%" stopColor="#8a5a12" />
      </linearGradient>
      <linearGradient id="roseG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ff8fb1" />
        <stop offset="60%" stopColor="#c22a56" />
        <stop offset="100%" stopColor="#5a0a20" />
      </linearGradient>
      <linearGradient id="candleG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#fff2d0" />
        <stop offset="100%" stopColor="#e8c48a" />
      </linearGradient>
      <radialGradient id="flameG" cx="50%" cy="60%" r="60%">
        <stop offset="0%" stopColor="#fff2a8" />
        <stop offset="60%" stopColor="#ff9a30" />
        <stop offset="100%" stopColor="#ff2a2a" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="pearlG" cx="35%" cy="30%" r="80%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="60%" stopColor="#f0e6f0" />
        <stop offset="100%" stopColor="#b7a3c0" />
      </radialGradient>
      <linearGradient id="silverG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="50%" stopColor="#e2e6ee" />
        <stop offset="100%" stopColor="#8a92a8" />
      </linearGradient>
      <linearGradient id="wineG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ff6a8a" />
        <stop offset="100%" stopColor="#6a0a2a" />
      </linearGradient>
    </defs>
  );
}

const SvgTile = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
    <Defs />
    {children}
  </svg>
);

// --- Individual symbol renders (compact, romantic, luxury) ---
const R = {
  heart: () => (
    <SvgTile>
      <path
        d="M32 55 C 10 40 8 22 20 16 C 27 13 32 18 32 22 C 32 18 37 13 44 16 C 56 22 54 40 32 55 Z"
        fill="url(#rubyG)"
        stroke="url(#goldG)"
        strokeWidth="1.5"
      />
      <path d="M22 22 C 20 26 22 32 26 36" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </SvgTile>
  ),
  diamond: () => (
    <SvgTile>
      <polygon points="32,10 52,26 32,56 12,26" fill="url(#diamondG)" stroke="url(#goldG)" strokeWidth="1.5" />
      <polyline points="12,26 32,26 52,26" fill="none" stroke="#fff" strokeOpacity="0.6" />
      <polyline points="32,26 24,18 32,10 40,18 32,26" fill="none" stroke="#fff" strokeOpacity="0.7" />
    </SvgTile>
  ),
  ring: () => (
    <SvgTile>
      <circle cx="32" cy="40" r="14" fill="none" stroke="url(#goldG)" strokeWidth="4" />
      <polygon points="32,10 38,20 32,26 26,20" fill="url(#diamondG)" stroke="url(#goldG)" strokeWidth="1.2" />
    </SvgTile>
  ),
  rose: () => (
    <SvgTile>
      <circle cx="32" cy="28" r="16" fill="url(#roseG)" stroke="url(#goldG)" strokeWidth="1.2" />
      <path d="M32 20 C 28 24 28 32 32 36 C 36 32 36 24 32 20 Z" fill="#7a0a20" opacity="0.7" />
      <path d="M22 40 C 28 48 36 48 42 40" stroke="#2fa864" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M32 44 L 32 58" stroke="#2fa864" strokeWidth="2.5" />
    </SvgTile>
  ),
  key: () => (
    <SvgTile>
      <circle cx="20" cy="28" r="10" fill="none" stroke="url(#goldG)" strokeWidth="3" />
      <circle cx="20" cy="28" r="3.5" fill="url(#rubyG)" />
      <rect x="28" y="26" width="26" height="4" fill="url(#goldG)" />
      <rect x="48" y="30" width="4" height="6" fill="url(#goldG)" />
      <rect x="42" y="30" width="3" height="4" fill="url(#goldG)" />
    </SvgTile>
  ),
  lock: () => (
    <SvgTile>
      <path d="M22 30 V 24 A 10 10 0 0 1 42 24 V 30" fill="none" stroke="url(#goldG)" strokeWidth="3.5" />
      <rect x="16" y="30" width="32" height="24" rx="4" fill="url(#goldG)" stroke="#5a3a08" />
      <circle cx="32" cy="42" r="4" fill="#3a1e08" />
      <rect x="30" y="44" width="4" height="6" fill="#3a1e08" />
    </SvgTile>
  ),
  letter: () => (
    <SvgTile>
      <rect x="8" y="18" width="48" height="30" rx="3" fill="#fff6ea" stroke="url(#goldG)" strokeWidth="1.2" />
      <polyline points="8,18 32,36 56,18" fill="none" stroke="#c9a066" strokeWidth="1.4" />
      <circle cx="32" cy="40" r="6" fill="url(#rubyG)" stroke="url(#goldG)" strokeWidth="0.8" />
      <path d="M29 40 h6 M32 37 v6" stroke="#fff" strokeWidth="1" opacity="0.7" />
    </SvgTile>
  ),
  candle: () => (
    <SvgTile>
      <ellipse cx="32" cy="18" rx="8" ry="10" fill="url(#flameG)" />
      <path d="M32 8 C 34 14 34 20 32 22 C 30 20 30 14 32 8 Z" fill="#fff2a8" />
      <rect x="26" y="26" width="12" height="26" rx="2" fill="url(#candleG)" stroke="url(#goldG)" strokeWidth="0.8" />
      <ellipse cx="32" cy="26" rx="6" ry="2" fill="#fff" opacity="0.6" />
    </SvgTile>
  ),
  dove: () => (
    <SvgTile>
      <path d="M12 34 C 20 22 40 22 52 30 C 46 40 30 44 20 40 Z" fill="#fff" stroke="url(#silverG)" strokeWidth="1" />
      <path d="M42 28 C 48 20 56 20 58 24 C 54 30 48 32 42 30 Z" fill="#fff" opacity="0.9" />
      <circle cx="18" cy="34" r="1.6" fill="#333" />
      <path d="M14 36 L 8 40" stroke="#ffb64a" strokeWidth="1.6" />
    </SvgTile>
  ),
  moon: () => (
    <SvgTile>
      <path d="M42 12 A 20 20 0 1 0 52 40 A 16 16 0 1 1 42 12 Z" fill="url(#pearlG)" stroke="url(#goldG)" strokeWidth="1.2" />
      <circle cx="30" cy="24" r="1.4" fill="#fff" />
      <circle cx="36" cy="34" r="1.2" fill="#fff" />
    </SvgTile>
  ),
  sparkle: () => (
    <SvgTile>
      <path d="M32 8 L 36 28 L 56 32 L 36 36 L 32 56 L 28 36 L 8 32 L 28 28 Z" fill="url(#topazG)" stroke="url(#goldG)" strokeWidth="1" />
    </SvgTile>
  ),
  kiss: () => (
    <SvgTile>
      <path d="M14 32 C 20 22 32 22 32 30 C 32 22 44 22 50 32 C 44 42 36 40 32 34 C 28 40 20 42 14 32 Z" fill="url(#rubyG)" stroke="url(#goldG)" strokeWidth="1" />
      <path d="M32 30 V 40" stroke="#7a0a1c" strokeWidth="1" opacity="0.6" />
    </SvgTile>
  ),
  butterfly: () => (
    <SvgTile>
      <path d="M32 32 C 20 18 8 22 10 34 C 12 44 24 42 32 34 Z" fill="url(#amethystG)" stroke="url(#goldG)" strokeWidth="1" />
      <path d="M32 32 C 44 18 56 22 54 34 C 52 44 40 42 32 34 Z" fill="url(#pinkG)" stroke="url(#goldG)" strokeWidth="1" />
      <ellipse cx="32" cy="34" rx="2" ry="10" fill="#3a1e08" />
    </SvgTile>
  ),
  yinyang: () => (
    <SvgTile>
      <circle cx="32" cy="32" r="22" fill="#fff" stroke="url(#goldG)" strokeWidth="2" />
      <path d="M32 10 A 22 22 0 0 1 32 54 A 11 11 0 0 1 32 32 A 11 11 0 0 0 32 10 Z" fill="#111" />
      <circle cx="32" cy="21" r="3" fill="#fff" />
      <circle cx="32" cy="43" r="3" fill="#111" />
    </SvgTile>
  ),
  cupidBow: () => (
    <SvgTile>
      <path d="M14 14 C 24 32 24 32 14 50" fill="none" stroke="url(#goldG)" strokeWidth="3" />
      <line x1="14" y1="14" x2="14" y2="50" stroke="#c9a066" strokeWidth="1" />
      <line x1="18" y1="32" x2="54" y2="32" stroke="url(#goldG)" strokeWidth="2" />
      <polygon points="54,32 48,28 48,36" fill="url(#rubyG)" />
      <polygon points="18,32 22,29 22,35" fill="#c9a066" />
    </SvgTile>
  ),
  infinity: () => (
    <SvgTile>
      <path d="M18 32 C 18 22 32 22 32 32 C 32 42 46 42 46 32 C 46 22 32 22 32 32 C 32 42 18 42 18 32 Z"
        fill="none" stroke="url(#goldG)" strokeWidth="4" strokeLinejoin="round" />
    </SvgTile>
  ),
  crown: () => (
    <SvgTile>
      <path d="M10 42 L 14 20 L 24 34 L 32 16 L 40 34 L 50 20 L 54 42 Z" fill="url(#goldG)" stroke="#6a4008" />
      <rect x="10" y="42" width="44" height="8" fill="url(#goldG)" stroke="#6a4008" />
      <circle cx="32" cy="26" r="3" fill="url(#rubyG)" />
      <circle cx="18" cy="36" r="2" fill="url(#emeraldG)" />
      <circle cx="46" cy="36" r="2" fill="url(#sapphireG)" />
    </SvgTile>
  ),
  wine: () => (
    <SvgTile>
      <path d="M20 12 H 44 C 44 26 40 34 32 34 C 24 34 20 26 20 12 Z" fill="url(#wineG)" stroke="url(#silverG)" strokeWidth="1" />
      <path d="M18 12 H 46" stroke="url(#silverG)" strokeWidth="1" />
      <line x1="32" y1="34" x2="32" y2="52" stroke="url(#silverG)" strokeWidth="2" />
      <ellipse cx="32" cy="54" rx="10" ry="2" fill="url(#silverG)" />
    </SvgTile>
  ),
  ribbon: () => (
    <SvgTile>
      <path d="M20 20 C 10 14 8 32 20 34 L 32 30 Z" fill="url(#pinkG)" stroke="url(#goldG)" />
      <path d="M44 20 C 54 14 56 32 44 34 L 32 30 Z" fill="url(#pinkG)" stroke="url(#goldG)" />
      <circle cx="32" cy="30" r="5" fill="url(#rubyG)" stroke="url(#goldG)" />
      <path d="M28 34 L 22 54 M36 34 L 42 54" stroke="url(#pinkG)" strokeWidth="4" fill="none" />
    </SvgTile>
  ),
  feather: () => (
    <SvgTile>
      <path d="M14 50 C 20 20 44 8 54 12 C 50 34 34 48 20 50 Z" fill="url(#goldG)" stroke="#6a4008" />
      <path d="M18 46 L 50 14" stroke="#6a4008" strokeWidth="1" />
    </SvgTile>
  ),
  emerald: () => (
    <SvgTile>
      <polygon points="20,14 44,14 54,32 44,52 20,52 10,32" fill="url(#emeraldG)" stroke="url(#goldG)" strokeWidth="1.5" />
      <polygon points="26,20 38,20 44,32 38,44 26,44 20,32" fill="none" stroke="#fff" strokeOpacity="0.6" />
    </SvgTile>
  ),
  sapphire: () => (
    <SvgTile>
      <polygon points="32,8 54,24 46,54 18,54 10,24" fill="url(#sapphireG)" stroke="url(#goldG)" strokeWidth="1.5" />
      <polyline points="10,24 32,32 54,24 32,8" fill="none" stroke="#fff" strokeOpacity="0.6" />
      <line x1="32" y1="32" x2="32" y2="54" stroke="#fff" strokeOpacity="0.5" />
    </SvgTile>
  ),
  pearl: () => (
    <SvgTile>
      <circle cx="32" cy="34" r="20" fill="url(#pearlG)" stroke="url(#goldG)" strokeWidth="1.2" />
      <ellipse cx="26" cy="26" rx="6" ry="4" fill="#fff" opacity="0.7" />
    </SvgTile>
  ),
} satisfies Record<string, () => JSX.Element>;

const SYMBOL_LIBRARY: SymbolDef[] = [
  { key: "heart",     label: "Crystal Heart", render: R.heart },
  { key: "rose",      label: "Luxury Rose",   render: R.rose },
  { key: "ring",      label: "Engagement Ring", render: R.ring },
  { key: "key",       label: "Golden Key",    render: R.key },
  { key: "lock",      label: "Luxury Lock",   render: R.lock },
  { key: "letter",    label: "Wax-Sealed Letter", render: R.letter },
  { key: "candle",    label: "Romantic Candle", render: R.candle },
  { key: "dove",      label: "White Dove",    render: R.dove },
  { key: "moon",      label: "Moon Crystal",  render: R.moon },
  { key: "sparkle",   label: "Star Crystal",  render: R.sparkle },
  { key: "kiss",      label: "Lips",          render: R.kiss },
  { key: "butterfly", label: "Crystal Butterfly", render: R.butterfly },
  { key: "yinyang",   label: "Yin Yang",      render: R.yinyang },
  { key: "cupidBow",  label: "Cupid's Bow",   render: R.cupidBow },
  { key: "infinity",  label: "Infinity",      render: R.infinity },
  { key: "crown",     label: "Royal Crown",   render: R.crown },
  { key: "wine",      label: "Wine Glass",    render: R.wine },
  { key: "ribbon",    label: "Silk Ribbon",   render: R.ribbon },
  { key: "feather",   label: "Golden Feather", render: R.feather },
  { key: "diamond",   label: "Diamond",       render: R.diamond },
  { key: "emerald",   label: "Emerald",       render: R.emerald },
  { key: "sapphire",  label: "Sapphire",      render: R.sapphire },
  { key: "pearl",     label: "Pearl",         render: R.pearl },
];

const SYMBOL_MAP = new Map(SYMBOL_LIBRARY.map((s) => [s.key, s]));

/* ============================================================
   Data-driven tile packs — per level & seasonal collections
   ============================================================ */

type Pack = {
  name: string;
  tagline: string;
  symbols: string[]; // keys from SYMBOL_LIBRARY
};

const LEVEL_PACKS: Pack[] = [
  { name: "First Spark",    tagline: "Hearts • Roses • Candles",     symbols: ["heart","rose","candle","kiss","sparkle","ribbon","butterfly","moon"] },
  { name: "Secret Letters", tagline: "Letters • Keys • Locks",       symbols: ["letter","key","lock","dove","feather","sparkle","heart","rose","moon","candle"] },
  { name: "Precious Vows",  tagline: "Diamonds • Rubies • Pearls",   symbols: ["diamond","emerald","sapphire","pearl","heart","ring","crown","sparkle","rose","butterfly"] },
  { name: "Cupid's Aim",    tagline: "Bow • Arrow • Wings",          symbols: ["cupidBow","heart","feather","kiss","dove","rose","sparkle","moon","ribbon","letter","diamond","pearl"] },
  { name: "Deep Connection", tagline: "Yin Yang • Infinity • Twin Flame", symbols: ["yinyang","infinity","heart","sparkle","moon","crown","wine","ring","rose","diamond","cupidBow","butterfly"] },
];

const LEVEL_CONFIG = [
  { level: 1, pairs: 8,  seconds: 90 },
  { level: 2, pairs: 10, seconds: 95 },
  { level: 3, pairs: 10, seconds: 100 },
  { level: 4, pairs: 12, seconds: 110 },
  { level: 5, pairs: 12, seconds: 120 },
];

type Tile = {
  id: string;
  symbol: string;
  cleared: boolean;
};

function makeBoard(pairs: number, pack: Pack): Tile[] {
  const chosen = [...pack.symbols].sort(() => Math.random() - 0.5).slice(0, pairs);
  const tiles: Tile[] = [];
  chosen.forEach((s, i) => {
    tiles.push({ id: `${s}-a-${i}`, symbol: s, cleared: false });
    tiles.push({ id: `${s}-b-${i}`, symbol: s, cleared: false });
  });
  return tiles.sort(() => Math.random() - 0.5);
}

/* ============================================================
   Component
   ============================================================ */

function LoveTiles() {
  const [levelIdx, setLevelIdx] = useState(0);
  const cfg = LEVEL_CONFIG[levelIdx];
  const pack = LEVEL_PACKS[levelIdx % LEVEL_PACKS.length];
  const [tiles, setTiles] = useState<Tile[]>(() => makeBoard(cfg.pairs, pack));
  const [selected, setSelected] = useState<string[]>([]);
  const [matched, setMatched] = useState(0);
  const [seconds, setSeconds] = useState(cfg.seconds);
  const [hints, setHints] = useState(3);
  const [shuffles, setShuffles] = useState(3);
  const [boost, setBoost] = useState(false);
  const [hintPair, setHintPair] = useState<string[]>([]);
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [burst, setBurst] = useState<{ id: number; x: number; y: number } | null>(null);
  const [lovePoints, setLovePoints] = useState(0);
  const [streak, setStreak] = useState(1);
  const lockRef = useRef(false);
  const burstIdRef = useRef(0);

  const total = cfg.pairs;

  const resetLevel = useCallback((idx: number) => {
    const c = LEVEL_CONFIG[idx];
    const p = LEVEL_PACKS[idx % LEVEL_PACKS.length];
    setTiles(makeBoard(c.pairs, p));
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
      // Fire burst at midpoint of the two tiles (approx center of board)
      const el = document.querySelector<HTMLButtonElement>(`[data-tile-id="${a}"]`);
      const el2 = document.querySelector<HTMLButtonElement>(`[data-tile-id="${b}"]`);
      if (el && el2) {
        const r1 = el.getBoundingClientRect();
        const r2 = el2.getBoundingClientRect();
        burstIdRef.current += 1;
        setBurst({ id: burstIdRef.current, x: (r1.left + r2.left) / 2 + r1.width / 2, y: (r1.top + r2.top) / 2 + r1.height / 2 });
      }
      setTimeout(() => {
        setTiles((prev) => prev.map((t) => (t.id === a || t.id === b ? { ...t, cleared: true } : t)));
        setMatched((m) => {
          const next = m + 1;
          if (next >= total) setStatus("won");
          return next;
        });
        setLovePoints((p) => p + 25);
        setSelected([]);
        lockRef.current = false;
      }, 360);
    } else {
      setTimeout(() => {
        setSelected([]);
        lockRef.current = false;
      }, 720);
    }
  }, [selected, tiles, total]);

  // Auto-clear burst
  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => setBurst(null), 900);
    return () => clearTimeout(t);
  }, [burst]);

  // Win → streak++
  useEffect(() => {
    if (status === "won") setStreak((s) => s + 1);
  }, [status]);

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
    toast("💖 Love Boost — +15s");
  };

  const nextLevel = () => {
    if (levelIdx + 1 < LEVEL_CONFIG.length) {
      const n = levelIdx + 1;
      setLevelIdx(n);
      setHints(3); setShuffles(3); setBoost(false);
      resetLevel(n);
    } else {
      toast("You've completed every collection 💕");
    }
  };

  const progress = `${matched}/${total}`;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div
      className="min-h-screen relative overflow-hidden text-pink-100"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 20% 10%, rgba(180,60,180,0.35), transparent 60%), radial-gradient(ellipse at 80% 90%, rgba(255,80,140,0.28), transparent 65%), linear-gradient(180deg,#0a0512 0%,#140820 60%,#0a0512 100%)",
      }}
    >
      <StyleTag />
      <UnveilNav />
      <Ambience />

      <div className="relative mx-auto max-w-md px-4 pb-28 pt-4">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/challenges"
            className="inline-flex items-center gap-2 rounded-full border border-pink-400/40 bg-black/40 px-3 py-1.5 text-xs text-pink-100 backdrop-blur hover:border-pink-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-pink-200/80">
            UNVEIL · New Challenge
          </div>
          <div className="w-[52px]" />
        </div>

        {/* Title */}
        <div className="mt-4 text-center">
          <h1
            className="font-display text-4xl font-black tracking-wide leading-none"
            style={{
              background: "linear-gradient(180deg,#ffe1ee 0%,#ff7ab6 45%,#a447c8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 18px rgba(255,90,170,0.55))",
            }}
          >
            UNVEIL LOVE TILES
          </h1>
          <p className="mt-2 text-xs text-pink-100/80">Match the symbols of love. Reveal deeper connections.</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-amber-200/80">
            Level {cfg.level} · {pack.name} — {pack.tagline}
          </p>
        </div>

        {/* Floating glass HUD */}
        <div className="mt-4 grid grid-cols-4 items-center gap-2">
          <HudCard tint="pink" icon={<Heart className="h-3.5 w-3.5 fill-pink-400 text-pink-400" />} value={progress} label="Pairs" />
          <HudCard tint="purple" icon={<Clock className="h-3.5 w-3.5" />} value={`${mm}:${ss}`} label="Time" />
          <HudCard tint="amber" icon={<Gem className="h-3.5 w-3.5" />} value={String(lovePoints)} label="Love" />
          <HudCard tint="rose" icon={<Flame className="h-3.5 w-3.5" />} value={String(streak)} label="Streak" />
        </div>

        {/* Board */}
        <div className="mt-5 relative rounded-[28px] p-[2px] shadow-[0_0_60px_-15px_rgba(255,90,170,0.6)]"
          style={{ background: "linear-gradient(140deg,#ffc76a,#ff5aa2,#a447c8,#ffc76a)" }}
        >
          <div
            className="rounded-[26px] p-3 backdrop-blur-xl"
            style={{
              background:
                "radial-gradient(ellipse at top, rgba(120,40,120,0.55), rgba(20,8,32,0.85))",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 0 40px rgba(255,90,170,0.15)",
            }}
          >
            <div className="grid grid-cols-4 gap-2">
              {tiles.map((t, i) => {
                const isSelected = selected.includes(t.id);
                const isHint = hintPair.includes(t.id);
                const sym = SYMBOL_MAP.get(t.symbol);
                return (
                  <button
                    key={t.id}
                    data-tile-id={t.id}
                    onClick={() => onTap(t.id)}
                    disabled={t.cleared}
                    aria-label={`Tile ${sym?.label ?? t.symbol}`}
                    className={[
                      "group relative aspect-[3/4] rounded-xl transition-all duration-300",
                      "flex items-center justify-center",
                      t.cleared ? "opacity-0 pointer-events-none scale-75" : "float-tile",
                    ].join(" ")}
                    style={{
                      background:
                        "linear-gradient(180deg,#fff2dc 0%,#f7d9b7 55%,#c99060 100%)",
                      border: "1px solid rgba(255,220,150,0.9)",
                      boxShadow:
                        "0 6px 0 rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.8), inset 0 -6px 10px rgba(120,60,30,0.35), 0 0 0 1px rgba(0,0,0,0.15)",
                      transform: `translateY(0) rotate(${(i % 5) - 2}deg)`,
                      animationDelay: `${(i % 7) * 0.35}s`,
                    }}
                  >
                    {/* glass reflection */}
                    <span
                      className="pointer-events-none absolute inset-x-1 top-1 h-1/3 rounded-t-lg"
                      style={{
                        background:
                          "linear-gradient(180deg,rgba(255,255,255,0.75),rgba(255,255,255,0))",
                        opacity: 0.7,
                      }}
                    />
                    {/* ring / hint glow overlays */}
                    {(isSelected || isHint) && (
                      <span
                        className="pointer-events-none absolute -inset-[3px] rounded-xl"
                        style={{
                          boxShadow: isHint
                            ? "0 0 0 2px #ffd166, 0 0 24px rgba(255,200,80,0.9)"
                            : "0 0 0 2px #ff6fae, 0 0 26px rgba(255,90,170,0.95)",
                        }}
                      />
                    )}
                    <span className="relative z-10 h-[70%] w-[70%] drop-shadow-[0_2px_1px_rgba(0,0,0,0.35)]">
                      {sym?.render()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {/* board bottom candles */}
          <span className="candle-glow absolute -bottom-3 left-4 h-3 w-3 rounded-full" />
          <span className="candle-glow absolute -bottom-3 right-4 h-3 w-3 rounded-full" style={{ animationDelay: "0.6s" }} />
        </div>

        {/* Controls */}
        <div className="mt-5 grid grid-cols-3 items-end gap-3">
          <ControlBtn
            onClick={useHint}
            disabled={hints <= 0}
            badge={hints}
            tint="purple"
            icon={<Lightbulb className="h-5 w-5" />}
            label="Hint"
          />
          <button
            onClick={useBoost}
            className="relative flex flex-col items-center gap-1 rounded-2xl border border-pink-400/60 bg-gradient-to-b from-pink-500/25 to-transparent px-3 py-3 text-pink-100 shadow-[0_0_30px_-6px_rgba(255,90,170,0.9)] transition active:scale-95"
          >
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-b from-pink-400 to-rose-600 text-white shadow-[0_0_20px_rgba(255,90,170,0.95)] boost-pulse">
              <span className="text-xs font-black">x2</span>
            </div>
            <span className="text-[11px] tracking-wide text-pink-100/95">Love Boost</span>
          </button>
          <ControlBtn
            onClick={useShuffle}
            disabled={shuffles <= 0}
            badge={shuffles}
            tint="purple"
            icon={<Shuffle className="h-5 w-5" />}
            label="Shuffle"
          />
        </div>

        {/* Instruction */}
        <div className="mt-5 rounded-2xl border border-pink-400/30 bg-black/40 px-4 py-3 text-center text-xs text-pink-100/90 backdrop-blur">
          <Sparkles className="mr-1 inline h-3.5 w-3.5 text-amber-200" />
          Every match brings love into focus
          <Sparkles className="ml-1 inline h-3.5 w-3.5 text-amber-200" />
        </div>

        {/* Match burst overlay */}
        {burst && <MatchBurst key={burst.id} x={burst.x} y={burst.y} />}

        {/* Win / lose overlay */}
        {status !== "playing" && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
            <div
              className="w-full max-w-sm rounded-3xl p-[2px] shadow-[0_0_60px_-10px_rgba(255,90,170,0.7)]"
              style={{ background: "linear-gradient(140deg,#ffc76a,#ff5aa2,#a447c8)" }}
            >
              <div className="rounded-[22px] bg-gradient-to-b from-purple-950 to-black p-6 text-center">
                <div className="text-5xl">{status === "won" ? "💖" : "🕯️"}</div>
                <h2 className="mt-3 font-display text-2xl text-pink-100">
                  {status === "won" ? "Love Revealed" : "The candle dimmed"}
                </h2>
                <p className="mt-1 text-sm text-pink-100/70">
                  {status === "won"
                    ? `${pack.name} cleared with ${mm}:${ss} left · +${lovePoints} love`
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
                      Next Collection
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function HudCard({
  tint,
  icon,
  value,
  label,
}: {
  tint: "pink" | "purple" | "amber" | "rose";
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  const map = {
    pink:   { border: "border-pink-400/50",   glow: "0 0 18px -6px rgba(255,90,170,0.9)",   text: "text-pink-100" },
    purple: { border: "border-purple-400/50", glow: "0 0 18px -6px rgba(180,120,255,0.9)",  text: "text-purple-100" },
    amber:  { border: "border-amber-300/60",  glow: "0 0 18px -6px rgba(255,200,80,0.85)",  text: "text-amber-100" },
    rose:   { border: "border-rose-400/50",   glow: "0 0 18px -6px rgba(255,120,140,0.9)",  text: "text-rose-100" },
  }[tint];
  return (
    <div
      className={`flex flex-col items-center gap-0.5 rounded-2xl border bg-white/5 backdrop-blur-xl px-2 py-2 ${map.border} ${map.text}`}
      style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.15), ${map.glow}` }}
    >
      <div className="flex items-center gap-1">
        {icon}
        <span className="font-mono text-sm font-semibold">{value}</span>
      </div>
      <span className="text-[9px] uppercase tracking-[0.2em] opacity-80">{label}</span>
    </div>
  );
}

function ControlBtn({
  onClick, disabled, badge, icon, label,
}: {
  onClick: () => void; disabled?: boolean; badge: number; tint: "purple"; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="relative flex flex-col items-center gap-1 rounded-2xl border border-purple-400/45 bg-black/40 px-3 py-3 text-purple-100 shadow-[0_0_20px_-8px_rgba(180,120,255,0.9)] transition active:scale-95 disabled:opacity-40"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-b from-purple-500/80 to-purple-900/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
        {icon}
      </span>
      <span className="text-xs">{label}</span>
      <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-purple-500 text-[10px] text-white shadow">{badge}</span>
    </button>
  );
}

function MatchBurst({ x, y }: { x: number; y: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        id: i,
        angle: (i / 18) * Math.PI * 2,
        dist: 40 + Math.random() * 40,
        emoji: ["✨","💖","🌹","💛"][i % 4],
        delay: Math.random() * 0.05,
      })),
    [],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      {bits.map((b) => {
        const dx = Math.cos(b.angle) * b.dist;
        const dy = Math.sin(b.angle) * b.dist;
        return (
          <span
            key={b.id}
            className="absolute text-lg burst-bit"
            style={{
              left: x, top: y,
              // @ts-expect-error CSS var
              "--dx": `${dx}px`, "--dy": `${dy}px`,
              animationDelay: `${b.delay}s`,
              filter: "drop-shadow(0 0 8px rgba(255,180,80,0.9))",
            }}
          >
            {b.emoji}
          </span>
        );
      })}
    </div>
  );
}

function Ambience() {
  const petals = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 12 + Math.random() * 12,
        size: 10 + Math.random() * 16,
        char: ["🌸","🌹","💗","✨"][i % 4],
      })),
    [],
  );
  const flies = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 6,
      })),
    [],
  );
  return (
    <>
      {/* Aurora / moon glow */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full opacity-70"
          style={{ background: "radial-gradient(circle, rgba(255,180,220,0.35), transparent 65%)" }}
        />
        <div
          className="absolute -bottom-32 -right-16 h-96 w-96 rounded-full opacity-60"
          style={{ background: "radial-gradient(circle, rgba(180,110,255,0.35), transparent 65%)" }}
        />
      </div>
      {/* Fireflies */}
      <div className="pointer-events-none absolute inset-0">
        {flies.map((f) => (
          <span
            key={f.id}
            className="firefly absolute h-1.5 w-1.5 rounded-full bg-amber-200"
            style={{
              left: `${f.left}%`,
              top: `${f.top}%`,
              animationDelay: `${f.delay}s`,
              boxShadow: "0 0 10px 2px rgba(255,220,140,0.9)",
            }}
          />
        ))}
      </div>
      {/* Petals */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {petals.map((p) => (
          <span
            key={p.id}
            className="absolute top-0 select-none"
            style={{
              left: `${p.left}%`,
              fontSize: `${p.size}px`,
              animation: `petalFall ${p.duration}s linear ${p.delay}s infinite`,
              filter: "drop-shadow(0 0 6px rgba(255,90,170,0.55))",
            }}
          >
            {p.char}
          </span>
        ))}
      </div>
    </>
  );
}

function StyleTag() {
  return (
    <style>{`
      @keyframes petalFall {
        0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
        10% { opacity: 0.95; }
        100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
      }
      @keyframes floatTile {
        0%,100% { transform: translateY(0px); }
        50% { transform: translateY(-2px); }
      }
      .float-tile { animation: floatTile 4.5s ease-in-out infinite; }
      .float-tile:active { transform: translateY(1px) scale(0.97); transition: transform 80ms; }
      @keyframes fly {
        0%,100% { transform: translate(0,0); opacity: 0.4; }
        50% { transform: translate(12px,-14px); opacity: 1; }
      }
      .firefly { animation: fly 5s ease-in-out infinite; }
      @keyframes boostPulse {
        0%,100% { transform: scale(1); box-shadow: 0 0 18px rgba(255,90,170,0.9); }
        50% { transform: scale(1.08); box-shadow: 0 0 28px rgba(255,90,170,1); }
      }
      .boost-pulse { animation: boostPulse 2s ease-in-out infinite; }
      @keyframes burstBit {
        0% { transform: translate(-50%,-50%) scale(0.6); opacity: 0; }
        20% { opacity: 1; }
        100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.2); opacity: 0; }
      }
      .burst-bit { animation: burstBit 900ms ease-out forwards; }
      @keyframes candleGlow {
        0%,100% { box-shadow: 0 0 12px 4px rgba(255,180,90,0.85); background: #ffb46a; }
        50% { box-shadow: 0 0 22px 8px rgba(255,220,120,0.95); background: #ffd48a; }
      }
      .candle-glow { animation: candleGlow 1.8s ease-in-out infinite; }
    `}</style>
  );
}
