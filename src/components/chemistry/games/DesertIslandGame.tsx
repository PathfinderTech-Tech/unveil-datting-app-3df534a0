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
      <p className="text-center text-sm" style={{ color: "#F0EDE8" }}>{cur.title}</p>
      <p className="text-center text-[11px] uppercase tracking-wider" style={{ color: "#7A7876" }}>
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
                background: on ? "rgba(139,92,246,0.12)" : "#1E1E21",
                borderColor: on ? "rgba(139,92,246,0.4)" : "#2A2A2E",
                color: on ? "#A78BFA" : "#F0EDE8",
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
        className="w-full rounded-full px-4 py-3 text-sm font-semibold disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, #8B5CF6, #A78BFA)", color: "#0D0D0F" }}
      >
        {step + 1 >= STEPS.length ? "Finish" : "Continue"}
      </button>
      <SkipButton onSkip={onSkip} />
    </div>
  );
}
