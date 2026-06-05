import { useEffect, useRef, useState } from "react";
import { useChemistry } from "@/lib/chemistry-ledger";

export function ChemistryBadge() {
  const data = useChemistry();
  const score = data?.cumulativeScore ?? 0;
  const [display, setDisplay] = useState(score);
  const [shimmer, setShimmer] = useState(false);
  const prevRef = useRef(score);

  useEffect(() => {
    const from = prevRef.current;
    const to = score;
    if (to === from) return;
    setShimmer(true);
    const start = performance.now();
    const dur = 600;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setDisplay(Math.round(from + (to - from) * p));
      if (p < 1) raf = requestAnimationFrame(step);
      else { prevRef.current = to; setTimeout(() => setShimmer(false), 400); }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  if (score <= 0) return null;

  return (
    <span
      className="pointer-events-none absolute"
      style={{ bottom: "-10px", left: "16px", zIndex: 2 }}
    >
      <span
        className="relative inline-flex items-center gap-1.5 overflow-hidden rounded-full"
        style={{
          background: "color-mix(in oklch, var(--primary) 14%, transparent)",
          border: "1px solid color-mix(in oklch, var(--primary) 35%, transparent)",
          padding: "4px 10px 4px 8px",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--primary)",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--primary)",
            animation: "chem-pulse 2s ease-out infinite",
          }}
        />
        <span>⚗ {display} Chemistry</span>
        {shimmer && (
          <span
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in oklch, var(--logo-gold) 22%, transparent), transparent)",
              animation: "chem-shimmer 0.4s ease-out forwards",
            }}
          />
        )}
      </span>
    </span>
  );
}
