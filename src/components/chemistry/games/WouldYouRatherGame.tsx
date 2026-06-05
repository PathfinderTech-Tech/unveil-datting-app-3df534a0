import { useRef, useState } from "react";
import type { Bonus, GameResult } from "@/lib/chemistry-ledger";
import { WOULD_YOU_RATHER } from "@/lib/synapse-store";
import { GameHeader, SkipButton } from "./_shared";

export function WouldYouRatherGame({ onComplete, onSkip }: {
  onComplete: (r: Omit<GameResult, "id">) => void;
  onSkip: () => void;
}) {
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<("a" | "b")[]>([]);
  const lastAtRef = useRef<number>(performance.now());
  const fastStreakRef = useRef(0);
  const earnedSpeedRef = useRef(false);

  const pick = (choice: "a" | "b") => {
    const now = performance.now();
    const dt = now - lastAtRef.current;
    lastAtRef.current = now;
    fastStreakRef.current = dt <= 1500 ? fastStreakRef.current + 1 : 1;
    if (fastStreakRef.current >= 3) earnedSpeedRef.current = true;
    const next = [...picks, choice];
    setPicks(next);
    if (next.length >= WOULD_YOU_RATHER.length) {
      const bonuses: Bonus[] = [{ label: "Full Game", points: 5 }];
      if (earnedSpeedRef.current) bonuses.push({ label: "Speed Streak", points: 5 });
      onComplete({ skipped: false, base: 15, bonuses });
    } else {
      setI(i + 1);
    }
  };

  const q = WOULD_YOU_RATHER[i];
  return (
    <div className="space-y-5">
      <GameHeader step={i + 1} total={WOULD_YOU_RATHER.length} title="Would You Rather" />
      <p className="text-center text-[11px] uppercase tracking-wider text-muted-foreground">
        Trust your gut. Quick answers earn a streak bonus.
      </p>
      <div className="grid gap-3">
        {(["a", "b"] as const).map((k) => (
          <button
            key={k}
            onClick={() => pick(k)}
            className="rounded-2xl border border-border bg-surface-2 p-5 text-left text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40"
          >
            {q[k]}
          </button>
        ))}
      </div>
      <SkipButton onSkip={onSkip} />
    </div>
  );
}
