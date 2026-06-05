import { Link } from "@tanstack/react-router";
import { useChemistry, relativeDate, TIER_META, SESSION_MAX } from "@/lib/chemistry-ledger";
import { TierOrb } from "./TierOrb";

export function ChemistryHistory() {
  const data = useChemistry();
  if (!data || data.sessionCount === 0) return null;

  const max = data.sessionCount * SESSION_MAX;
  const pct = Math.min(100, (data.cumulativeScore / max) * 100);
  const tierMeta = TIER_META[data.lastSessionTier];

  return (
    <section
      className="rounded-2xl border p-5"
      style={{ background: "#161618", borderColor: "#2A2A2E" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-bold" style={{ color: "#F0EDE8" }}>
          Chemistry History
        </h3>
        <Link
          to="/playful"
          className="text-xs hover:underline"
          style={{ color: "#7A7876" }}
        >
          Play Again →
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <TierOrb tier={data.lastSessionTier} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm" style={{ color: "#F0EDE8" }}>
              Last session:{" "}
              <span style={{ color: tierMeta.color, fontWeight: 600 }}>
                {data.lastSessionTier}
              </span>
            </span>
            <span className="font-mono text-xs" style={{ color: "#7A7876" }}>
              {data.lastSessionScore} / {SESSION_MAX}
            </span>
          </div>
          <div className="mt-0.5 text-[11px]" style={{ color: "#7A7876" }}>
            {relativeDate(data.lastSessionDate)}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1 text-[11px] uppercase tracking-wider" style={{ color: "#7A7876" }}>
          Cumulative chemistry score
        </div>
        <div className="h-1 overflow-hidden rounded-full" style={{ background: "rgba(139,92,246,0.25)" }}>
          <div
            className="h-full rounded-full transition-[width] duration-700"
            style={{ width: `${pct}%`, background: "#8B5CF6" }}
          />
        </div>
        <div className="mt-2 text-xs" style={{ color: "#7A7876" }}>
          <span style={{ color: "#F0EDE8", fontWeight: 600 }}>{data.cumulativeScore}</span> pts across{" "}
          {data.sessionCount} session{data.sessionCount === 1 ? "" : "s"}
        </div>
      </div>
    </section>
  );
}
