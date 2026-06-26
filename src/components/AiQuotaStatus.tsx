import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Infinity as InfinityIcon, Clock } from "lucide-react";
import { getAiInsightsQuota, type AiQuotaResponse } from "@/lib/ai-quota.functions";

function formatReset(iso: string | null): string {
  if (!iso) return "";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "now";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Compact, always-visible status of the user's AI Insights daily allowance.
 * Shows current plan tier, remaining vs limit, and the next reset time.
 */
export function AiQuotaStatus({ feature = "ai_compatibility_insights", className = "" }: { feature?: string; className?: string }) {
  const fetchQuota = useServerFn(getAiInsightsQuota);
  const [quota, setQuota] = useState<AiQuotaResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchQuota({ data: { feature } })
      .then((q) => { if (alive) { setQuota(q); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [feature, fetchQuota]);

  if (loading || !quota) {
    return (
      <div className={`h-[34px] animate-pulse rounded-2xl bg-[oklch(0.18_0.05_298/0.5)] ${className}`} />
    );
  }

  const tierLabel = tierToLabel(quota.tier);
  const unlimited = quota.dailyLimit === -1;
  const pct = unlimited || quota.dailyLimit === 0
    ? 100
    : Math.max(4, Math.min(100, Math.round((quota.remaining / quota.dailyLimit) * 100)));

  return (
    <div
      className={`rounded-2xl border border-[oklch(0.56_0.22_286/0.22)] bg-[oklch(0.13_0.05_298/0.45)] px-3 py-2 backdrop-blur-xl ${className}`}
      data-testid="ai-quota-status"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[oklch(0.56_0.22_286/0.3)] bg-[oklch(0.18_0.07_298/0.7)] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-foreground/80">
            <Sparkles className="h-3 w-3 text-[oklch(0.80_0.14_68)]" /> {tierLabel}
          </span>
          <span className="truncate text-[12px] text-foreground/85">
            {unlimited ? (
              <span className="inline-flex items-center gap-1"><InfinityIcon className="h-3.5 w-3.5" /> Unlimited AI Insights today</span>
            ) : quota.dailyLimit === 0 ? (
              <>0 AI Insights on Free — upgrade to unlock</>
            ) : (
              <>
                <span className="font-semibold text-foreground">{quota.remaining}</span>
                <span className="text-foreground/60"> of {quota.dailyLimit} AI Insights left today</span>
              </>
            )}
          </span>
        </div>
        {quota.resetsAt && !unlimited && (
          <span className="inline-flex shrink-0 items-center gap-1 text-[10.5px] text-foreground/55">
            <Clock className="h-3 w-3" /> resets in {formatReset(quota.resetsAt)}
          </span>
        )}
      </div>
      {!unlimited && quota.dailyLimit > 0 && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[oklch(0.18_0.05_298/0.7)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[oklch(0.58_0.18_286)] to-[oklch(0.80_0.14_68)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function tierToLabel(tier: string): string {
  switch (tier) {
    case "admin": return "Admin";
    case "premium_annual": return "Premium · Annual";
    case "premium_quarterly": return "Premium · Quarterly";
    case "premium_monthly": return "Premium · Monthly";
    case "two_week_pass": return "2-Week Pass";
    case "free": return "Free Plan";
    default: return tier;
  }
}
