import { useEffect, useMemo, useState } from "react";
import type { Bonus, GameResult } from "@/lib/chemistry-ledger";
import { GameHeader, SkipButton } from "./_shared";

const ICONS = ["❤️", "✨", "🌙", "⚡", "🌿", "🔥", "🌊", "⚓"];

type Card = { id: number; icon: string; flipped: boolean; matched: boolean };

function buildDeck(): Card[] {
  const arr: Card[] = [];
  ICONS.forEach((icon, i) => {
    arr.push({ id: i * 2,     icon, flipped: false, matched: false });
    arr.push({ id: i * 2 + 1, icon, flipped: false, matched: false });
  });
  return arr.sort(() => Math.random() - 0.5);
}

export function MemoryMatchGame({ onComplete, onSkip }: {
  onComplete: (r: Omit<GameResult, "id">) => void;
  onSkip: () => void;
}) {
  const initial = useMemo(() => buildDeck(), []);
  const [deck, setDeck] = useState<Card[]>(initial);
  const [flippedIdx, setFlippedIdx] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const flip = (idx: number) => {
    if (flippedIdx.length >= 2) return;
    if (deck[idx].matched || deck[idx].flipped) return;
    const next = deck.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
    setDeck(next);
    setFlippedIdx([...flippedIdx, idx]);
  };

  useEffect(() => {
    if (flippedIdx.length !== 2) return;
    setMoves((m) => m + 1);
    const [a, b] = flippedIdx;
    if (deck[a].icon === deck[b].icon) {
      const t = setTimeout(() => {
        setDeck((d) => d.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
        setFlippedIdx([]);
      }, 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setDeck((d) => d.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)));
      setFlippedIdx([]);
    }, 700);
    return () => clearTimeout(t);
  }, [flippedIdx, deck]);

  useEffect(() => {
    if (deck.every((c) => c.matched)) {
      const bonuses: Bonus[] = [];
      if (moves <= 16) bonuses.push({ label: "Sharp Memory", points: 10 });
      else if (moves <= 22) bonuses.push({ label: "Good Memory", points: 5 });
      const r: Omit<GameResult, "id"> = { skipped: false, base: 20, bonuses };
      const t = setTimeout(() => onComplete(r), 300);
      return () => clearTimeout(t);
    }
  }, [deck, moves, onComplete]);

  return (
    <div className="space-y-5">
      <GameHeader step={1} total={1} title="Memory Match" />
      <p className="text-center text-[11px] uppercase tracking-wider text-muted-foreground">
        Moves: {moves} · Match pairs in ≤ 16 for the sharp memory bonus
      </p>
      <div className="grid grid-cols-4 gap-2">
        {deck.map((c, i) => {
          const shown = c.flipped || c.matched;
          return (
            <button
              key={c.id}
              onClick={() => flip(i)}
              className="aspect-square rounded-xl border text-2xl transition-transform"
              style={{
                background: c.matched ? "color-mix(in oklch, var(--logo-gold) 14%, transparent)" : shown ? "var(--surface-2)" : "var(--card)",
                borderColor: c.matched ? "color-mix(in oklch, var(--logo-gold) 45%, transparent)" : "var(--border)",
              }}
            >
              {shown ? c.icon : ""}
            </button>
          );
        })}
      </div>
      <SkipButton onSkip={onSkip} />
    </div>
  );
}
