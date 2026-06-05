import { Link } from "@tanstack/react-router";
import { TierOrb } from "./TierOrb";
import { PointsBadge } from "./PointsBadge";
import {
  GAMES,
  SESSION_MAX,
  TIER_META,
  computeTier,
  sumGame,
  sumSession,
  type GameResult,
} from "@/lib/chemistry-ledger";

export function ChemistryResults({
  results,
  onPlayAgain,
}: {
  results: GameResult[];
  onPlayAgain: () => void;
}) {
  const { total, bonusTotal } = sumSession(results);
  const tier = computeTier(results, total);
  const pct = Math.round((total / SESSION_MAX) * 100);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-md px-5 py-10 space-y-6">
        {/* Section 1 — Tier reveal */}
        <div
          className="flex flex-col items-center text-center"
          style={{ animation: "chem-pop 0.5s cubic-bezier(0.2,0.8,0.2,1.2)" }}
        >
          <TierOrb tier={tier} size="lg" />
          <h1 className="mt-5 font-display text-3xl font-extrabold text-gradient-hero">
            {tier === "Incomplete" ? "Incomplete Session" : tier}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {TIER_META[tier].desc}
          </p>
        </div>

        {/* Section 2 — Score card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Chemistry Score
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className="font-display font-black"
              style={{ fontSize: 48, lineHeight: 1 }}
            >
              {total}
            </span>
            <span className="text-base text-muted-foreground">/ {SESSION_MAX}</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-gradient-hero"
              style={{
                width: `${pct}%`,
                transition: "width 800ms ease-out",
              }}
            />
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            {pct}% compatibility signal strength
          </div>
          {bonusTotal > 0 && (
            <div className="mt-1 text-[11px] text-primary">
              Includes +{bonusTotal} streak bonuses
            </div>
          )}
        </div>

        {/* Section 3 — Game breakdown */}
        <div className="space-y-3">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Session Breakdown
          </div>
          <div className="space-y-2">
            {GAMES.map((g) => {
              const r = results.find((x) => x.id === g.id);
              const skipped = !r || r.skipped;
              const pts = r ? sumGame(r) : 0;
              const hasBonus = !!(r && !r.skipped && r.bonuses.length > 0);
              return (
                <div
                  key={g.id}
                  className="rounded-2xl border border-border bg-card px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{g.emoji}</span>
                      <span className="text-sm text-foreground">{g.name}</span>
                    </div>
                    {skipped ? (
                      <PointsBadge variant="skip" />
                    ) : (
                      <PointsBadge variant="earned" points={pts} hasBonus={hasBonus} />
                    )}
                  </div>
                  {hasBonus && r && (
                    <div className="mt-2 space-y-0.5">
                      {r.bonuses.map((b, i) => (
                        <div key={i} className="text-[11px] text-primary">
                          ✦ +{b.points} pts — {b.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 4 — Passport callout */}
        <div className="rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-primary">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            Chemistry score added to your Passport
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Signals shape how UNVEIL matches you with depth-aligned partners.
          </div>
        </div>

        {/* Section 5 — Actions */}
        <div className="space-y-2">
          <button
            onClick={onPlayAgain}
            className="w-full rounded-full bg-gradient-hero px-4 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-95"
          >
            Play Again
          </button>
          <Link
            to="/passport"
            className="block w-full rounded-full border border-border px-4 py-3 text-center text-sm text-muted-foreground hover:border-primary/40 hover:text-primary"
          >
            Back to Passport
          </Link>
        </div>
      </div>
    </div>
  );
}
