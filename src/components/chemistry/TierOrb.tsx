import type { Tier } from "@/lib/chemistry-ledger";
import { TIER_META } from "@/lib/chemistry-ledger";

const TIER_RING: Record<Tier, string> = {
  Magnetic:   "conic-gradient(from 0deg, #8B5CF6, #A78BFA, #C4B5FD, #8B5CF6)",
  Resonant:   "conic-gradient(from 0deg, #C9A96E, #E2C896, #C9A96E, #7A5C2E, #C9A96E)",
  Emerging:   "conic-gradient(from 0deg, rgb(52,211,153), rgb(16,185,129), rgb(52,211,153))",
  Curious:    "conic-gradient(from 0deg, #7A7876, #5A5856, #7A7876)",
  Incomplete: "#2A2A2E",
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
        boxShadow: spin ? `0 0 40px ${TIER_META[tier].color}40` : undefined,
      }}
      aria-label={`${tier} tier`}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: inner,
          height: inner,
          background: "#0D0D0F",
          animation: spin ? "chem-orb-counter-spin 4s linear infinite" : undefined,
        }}
      >
        <span style={{ fontSize: emojiSize, lineHeight: 1 }}>{TIER_META[tier].emoji}</span>
      </div>
    </div>
  );
}
