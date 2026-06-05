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
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-bold text-foreground">
          Chemistry History
        </h3>
        <Link
          to="/playful"
          className="text-xs text-muted-foreground hover:text-primary hover:underline"
        >
          Play Again →
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <TierOrb tier={data.lastSessionTier} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-foreground">
              Last session:{" "}
              <span className="font-semibold text-primary">
                {data.lastSessionTier}
              </span>
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {data.lastSessionScore} / {SESSION_MAX}
            </span>
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {relativeDate(data.lastSessionDate)}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">
          Cumulative chemistry score
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-primary/20">
          <div
            className="h-full rounded-full bg-gradient-hero transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{data.cumulativeScore}</span> pts across{" "}
          {data.sessionCount} session{data.sessionCount === 1 ? "" : "s"}
        </div>
      </div>
    </section>
  );
}
