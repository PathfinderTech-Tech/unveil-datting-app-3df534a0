import { useEffect, useRef, useState } from "react";
import type { Bonus, GameResult } from "@/lib/chemistry-ledger";
import { TWO_TRUTHS_PROMPTS } from "@/lib/synapse-store";
import { GameHeader, SkipButton } from "./_shared";

export function TwoTruthsGame({ onComplete, onSkip }: {
  onComplete: (r: Omit<GameResult, "id">) => void;
  onSkip: () => void;
}) {
  const [fields, setFields] = useState(["", "", ""]);
  const [lie, setLie] = useState<number | null>(null);
  const startRef = useRef(performance.now());

  const setF = (idx: number, v: string) => {
    setFields((arr) => arr.map((x, i) => (i === idx ? v : x)));
  };

  const canSubmit = fields.every((f) => f.trim().length > 0) && lie !== null;

  const submit = () => {
    if (!canSubmit) return;
    const elapsed = (performance.now() - startRef.current) / 1000;
    const bonuses: Bonus[] = [];
    if (elapsed <= 60) bonuses.push({ label: "Quick Reveal", points: 8 });
    if (fields.every((f) => f.trim().length >= 15)) bonuses.push({ label: "Depth Bonus", points: 5 });
    onComplete({ skipped: false, base: 30, bonuses });
  };

  // Suggest prompts
  const [usedPrompt, setUsedPrompt] = useState(false);
  useEffect(() => { void usedPrompt; }, [usedPrompt]);

  return (
    <div className="space-y-5">
      <GameHeader step={1} total={1} title="Two Truths & a Lie" />
      <p className="text-center text-[11px] uppercase tracking-wider" style={{ color: "#7A7876" }}>
        Three statements about you. Two true. One lie. Mark the lie.
      </p>
      {fields.map((v, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider" style={{ color: "#7A7876" }}>
              Statement {i + 1}
            </span>
            <button
              onClick={() => setLie(i)}
              className="rounded-full border px-2 py-0.5 text-[10px]"
              style={{
                borderColor: lie === i ? "rgba(239,68,68,0.5)" : "#2A2A2E",
                color: lie === i ? "rgb(239,68,68)" : "#7A7876",
                background: lie === i ? "rgba(239,68,68,0.1)" : "transparent",
              }}
            >
              {lie === i ? "✓ The lie" : "Mark as lie"}
            </button>
          </div>
          <textarea
            value={v}
            onChange={(e) => setF(i, e.target.value)}
            placeholder={TWO_TRUTHS_PROMPTS[i % TWO_TRUTHS_PROMPTS.length]}
            rows={2}
            className="w-full resize-none rounded-2xl border px-3 py-2 text-sm focus:outline-none"
            style={{ background: "#1E1E21", borderColor: "#2A2A2E", color: "#F0EDE8" }}
          />
        </div>
      ))}
      <button
        onClick={() => setUsedPrompt(true)}
        className="w-full rounded-full border px-3 py-1.5 text-[11px]"
        style={{ color: "#7A7876", borderColor: "#2A2A2E" }}
      >
        Use prompt chip (no bonus, no penalty)
      </button>
      <button
        onClick={submit}
        disabled={!canSubmit}
        className="w-full rounded-full px-4 py-3 text-sm font-semibold transition-opacity disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, #8B5CF6, #A78BFA)", color: "#0D0D0F" }}
      >
        Submit
      </button>
      <SkipButton onSkip={onSkip} />
    </div>
  );
}
