import { useMemo, useRef, useState } from "react";
import type { Bonus, GameResult } from "@/lib/chemistry-ledger";
import { RED_FLAGS, GREEN_FLAGS } from "@/lib/synapse-store";
import { GameHeader, SkipButton } from "./_shared";

type Item = { text: string; truth: "red" | "green" };

export function RedGreenGame({ onComplete, onSkip }: {
  onComplete: (r: Omit<GameResult, "id">) => void;
  onSkip: () => void;
}) {
  const items: Item[] = useMemo(() => {
    const all: Item[] = [
      ...RED_FLAGS.map((t) => ({ text: t, truth: "red" as const })),
      ...GREEN_FLAGS.map((t) => ({ text: t, truth: "green" as const })),
    ];
    return all.sort(() => Math.random() - 0.5).slice(0, 10);
  }, []);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<("red" | "green")[]>([]);
  const lastRef = useRef(performance.now());
  const streakRef = useRef(0);
  const earnedInstinctRef = useRef(false);

  const pick = (choice: "red" | "green") => {
    const now = performance.now();
    const dt = now - lastRef.current;
    lastRef.current = now;
    streakRef.current = dt <= 2000 ? streakRef.current + 1 : 1;
    if (streakRef.current >= 5) earnedInstinctRef.current = true;
    const next = [...answers, choice];
    setAnswers(next);
    if (next.length >= items.length) {
      const greens = next.filter((a) => a === "green").length;
      const reds = next.length - greens;
      const bonuses: Bonus[] = [{ label: "Full Read", points: 5 }];
      if (earnedInstinctRef.current) bonuses.push({ label: "Instinct Streak", points: 5 });
      if (greens >= 8 || reds >= 8) bonuses.push({ label: "Decisive Reader", points: 3 });
      onComplete({ skipped: false, base: 25, bonuses });
    } else {
      setI(i + 1);
    }
  };

  const cur = items[i];
  return (
    <div className="space-y-5">
      <GameHeader step={i + 1} total={items.length} title="Red Flag / Green Flag" />
      <div
        className="rounded-2xl border border-border bg-surface-2 p-6 text-center text-lg text-foreground"
      >
        {cur.text}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => pick("red")}
          className="rounded-2xl border py-4 text-sm font-medium"
          style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.4)", color: "rgb(239,68,68)" }}
        >🚩 Red Flag</button>
        <button
          onClick={() => pick("green")}
          className="rounded-2xl border py-4 text-sm font-medium"
          style={{ background: "rgba(52,211,153,0.10)", borderColor: "rgba(52,211,153,0.4)", color: "rgb(52,211,153)" }}
        >🟢 Green Flag</button>
      </div>
      <SkipButton onSkip={onSkip} />
    </div>
  );
}
