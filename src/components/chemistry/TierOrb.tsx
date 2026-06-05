import type { Tier } from "@/lib/chemistry-ledger";
import { TIER_META } from "@/lib/chemistry-ledger";

const TIER_RING: Record<Tier, string> = {
  Magnetic:   "conic-gradient(from 0deg, var(--logo-violet), var(--logo-purple), var(--logo-magenta), var(--logo-gold), var(--logo-violet))",
  Resonant:   "conic-gradient(from 0deg, var(--logo-gold), var(--logo-amber), var(--logo-magenta), var(--logo-gold))",
  Emerging:   "conic-gradient(from 0deg, oklch(0.78 0.17 162), oklch(0.68 0.16 170), oklch(0.78 0.17 162))",
  Curious:    "conic-gradient(from 0deg, var(--muted-foreground), var(--surface-2), var(--muted-foreground))",
  Incomplete: "var(--border)",
};

export function TierOrb({ tier, size = "lg" }: { tier: Tier; size?: "lg" | "sm" }) {
  const dim = size === "lg" ? 120 : 40;
  const inner = dim - (size === "lg" ? 14 : 6);
  const emojiSize = size === "lg" ? 40 : 16;
  const spin = tier !== "Incomplete";
  return (
    <div
      className="relative flex items-center justify-center rounded-full"
      style={{
        width: dim,
        height: dim,
        background: TIER_RING[tier],
        animation: spin ? "chem-orb-spin 4s linear infinite" : undefined,
        boxShadow: spin ? "var(--shadow-logo)" : undefined,
      }}
      aria-label={`${tier} tier`}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: inner,
          height: inner,
          background: "var(--background)",
          animation: spin ? "chem-orb-counter-spin 4s linear infinite" : undefined,
        }}
      >
        <span style={{ fontSize: emojiSize, lineHeight: 1 }}>{TIER_META[tier].emoji}</span>
      </div>
    </div>
  );
}
