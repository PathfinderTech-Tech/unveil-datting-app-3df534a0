import { useRef, useState } from "react";
import type { Bonus, GameResult } from "@/lib/chemistry-ledger";
import { DESERT_ISLAND } from "@/lib/synapse-store";
import { GameHeader, SkipButton } from "./_shared";

const STEPS = [
  { key: "items",     title: "Pick 3 items",   src: DESERT_ISLAND.items,     max: 3 },
  { key: "luxuries",  title: "Pick 1 luxury",  src: DESERT_ISLAND.luxuries,  max: 1 },
  { key: "people",    title: "Pick 1 person",  src: DESERT_ISLAND.people,    max: 1 },
] as const;

export function DesertIslandGame({ onComplete, onSkip }: {
  onComplete: (r: Omit<GameResult, "id">) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);
  const [picks, setPicks] = useState<string[][]>([[], [], []]);
  const startRef = useRef(performance.now());

  const cur = STEPS[step];
  const selected = picks[step];

  const toggle = (item: string) => {
    setPicks((p) =>
      p.map((arr, i) => {
        if (i !== step) return arr;
        if (arr.includes(item)) return arr.filter((x) => x !== item);
        if (arr.length >= cur.max) return arr;
        return [...arr, item];
      }),
    );
  };

  const next = () => {
    if (selected.length !== cur.max) return;
    if (step + 1 >= STEPS.length) {
      const elapsed = (performance.now() - startRef.current) / 1000;
      const bonuses: Bonus[] = [];
      if (elapsed <= 90) bonuses.push({ label: "Decisive", points: 5 });
      onComplete({ skipped: false, base: 25, bonuses });
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="space-y-5">
      <GameHeader step={step + 1} total={STEPS.length} title="Desert Island" />
      <p className="text-center text-sm text-foreground">{cur.title}</p>
      <p className="text-center text-[11px] uppercase tracking-wider text-muted-foreground">
        {selected.length} / {cur.max} chosen — be decisive
      </p>
      <div className="grid grid-cols-2 gap-2">
        {cur.src.map((item) => {
          const on = selected.includes(item);
          return (
            <button
              key={item}
              onClick={() => toggle(item)}
              className="rounded-2xl border px-3 py-3 text-left text-sm"
              style={{
                background: on ? "color-mix(in oklch, var(--primary) 14%, transparent)" : "var(--surface-2)",
                borderColor: on ? "color-mix(in oklch, var(--primary) 45%, transparent)" : "var(--border)",
                color: on ? "var(--primary)" : "var(--foreground)",
              }}
            >
              {item}
            </button>
          );
        })}
      </div>
      <button
        onClick={next}
        disabled={selected.length !== cur.max}
        className="w-full rounded-full bg-gradient-hero px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-40"
      >
        {step + 1 >= STEPS.length ? "Finish" : "Continue"}
      </button>
      <SkipButton onSkip={onSkip} />
    </div>
  );
}
