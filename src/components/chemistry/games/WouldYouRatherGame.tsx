import { useEffect, useRef, useState } from "react";
import type { Bonus, GameResult } from "@/lib/chemistry-ledger";
import { WOULD_YOU_RATHER } from "@/lib/synapse-store";

export function WouldYouRatherGame({ onComplete, onSkip }: {
  onComplete: (r: Omit<GameResult, "id">) => void;
  onSkip: () => void;
}) {
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<("a" | "b")[]>([]);
  const lastAtRef = useRef<number>(performance.now());
  const fastStreakRef = useRef(0);
  const speedAwardedRef = useRef(false);

  const pick = (choice: "a" | "b") => {
    const now = performance.now();
    const dt = now - lastAtRef.current;
    lastAtRef.current = now;
    if (dt <= 1500) fastStreakRef.current += 1;
    else fastStreakRef.current = 1;
    const next = [...picks, choice];
    setPicks(next);
    if (next.length >= WOULD_YOU_RATHER.length) {
      const bonuses: Bonus[] = [];
      if (!speedAwardedRef.current && fastStreakRef.current >= 3) {
        bonuses.push({ label: "Speed Streak", points: 5 });
      }
      bonuses.push({ label: "Full Game", points: 5 });
      onComplete({ skipped: false, base: 15, bonuses });
      return;
    }
    if (!speedAwardedRef.current && fastStreakRef.current >= 3) {
      speedAwardedRef.current = true;
    }
    setI(i + 1);
  };

  const q = WOULD_YOU_RATHER[i];

  return (
    <div className="space-y-5">
      <Header step={i + 1} total={WOULD_YOU_RATHER.length} title="Would You Rather" />
      <p className="text-center text-[11px] uppercase tracking-wider" style={{ color: "#7A7876" }}>
        Trust your gut. Quick answers earn a streak bonus.
      </p>
      <div className="grid gap-3">
        {(["a", "b"] as const).map((k) => (
          <button
            key={k}
            onClick={() => pick(k)}
            className="rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5"
            style={{ background: "#1E1E21", borderColor: "#2A2A2E", color: "#F0EDE8" }}
          >
            {q[k]}
          </button>
        ))}
      </div>
      <SkipButton onSkip={onSkip} />
    </div>
  );
}

import { GAMES } from "@/lib/chemistry-ledger";

function Header({ step, total, title }: { step: number; total: number; title: string }) {
  return (
    <div className="text-center">
      <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "#7A7876" }}>
        {title} · {step} / {total}
      </div>
    </div>
  );
}

export function SkipButton({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="pt-2 text-center">
      <button
        onClick={onSkip}
        className="rounded-full border px-4 py-1.5 text-xs"
        style={{ color: "#7A7876", borderColor: "#2A2A2E" }}
      >
        Skip this game
      </button>
    </div>
  );
}

// Keep GAMES referenced so the bundler doesn't drop the import.
void GAMES;
