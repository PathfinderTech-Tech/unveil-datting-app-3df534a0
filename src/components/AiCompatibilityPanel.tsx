import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, RefreshCw, Crown, Lock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getCompatibilityInsight, aiErrorMessage, type CompatibilityInsight } from "@/lib/ai-compatibility.functions";
import { useEntitlements } from "@/hooks/use-entitlements";

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} d ago`;
}

export function AiCompatibilityPanel({ peerId }: { peerId: string }) {
  const { entitlements, loading: entLoading } = useEntitlements();
  const fetchInsight = useServerFn(getCompatibilityInsight);
  const [insight, setInsight] = useState<CompatibilityInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const isPremium = entitlements.premium;

  async function load(force = false) {
    if (!isPremium) return;
    setLoading(true);
    setError(null);
    setErrorCode(null);
    try {
      const res = await fetchInsight({ data: { peerId, force } });
      if ("error" in res) {
        setErrorCode(res.error);
        setError(aiErrorMessage(res.error));
      } else {
        setInsight(res.insight);
      }
    } catch (e) {
      console.error("[AiCompatibilityPanel] load failed", e);
      setErrorCode("AI_SERVICE_UNAVAILABLE");
      setError(aiErrorMessage("AI_SERVICE_UNAVAILABLE"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!entLoading && isPremium && !insight) load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entLoading, isPremium, peerId]);

  if (entLoading) return null;

  // Non-premium users (or premium-required errors) always see the upgrade experience
  if (!isPremium || errorCode === "PREMIUM_REQUIRED") {
    return <PremiumUpsellCard />;
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[oklch(0.56_0.22_286/0.16)] bg-[oklch(0.13_0.05_298/0.4)] p-5 backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 80% at 0% 0%, oklch(0.61 0.22 304 / 0.14), transparent 60%), radial-gradient(50% 70% at 100% 100%, oklch(0.80 0.14 68 / 0.08), transparent 60%)",
        }}
      />
      <div className="relative">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/55">
              <Sparkles className="h-3 w-3 text-[oklch(0.80_0.14_68)]" /> AI Insights
            </div>
            <h3 className="mt-1 truncate font-display text-[17px] font-semibold tracking-tight text-foreground">
              {insight ? insight.compatibilityLabel : loading ? "Analyzing…" : "AI Compatibility"}
            </h3>
          </div>
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[oklch(0.56_0.22_286/0.25)] bg-[oklch(0.18_0.07_298/0.5)] px-2.5 py-1 text-[11px] text-foreground/80 transition-colors hover:bg-[oklch(0.22_0.08_298/0.7)] disabled:opacity-50"
            title="Refresh insights"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {error && errorCode === "AI_SERVICE_UNAVAILABLE" && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-[13px]">
            {error}
          </div>
        )}

        {error && errorCode === "NOT_MUTUAL" && (
          <div className="rounded-xl border border-[oklch(0.56_0.22_286/0.18)] bg-[oklch(0.13_0.05_298/0.4)] p-3 text-[13px] text-foreground/70">
            {error}
          </div>
        )}

        {error && errorCode === "DAILY_LIMIT_REACHED" && (
          <div className="rounded-xl border border-[oklch(0.80_0.14_68/0.35)] bg-[oklch(0.80_0.14_68/0.08)] p-3 text-[13px] text-foreground/80">
            {error}
          </div>
        )}

        {!insight && loading && (
          <div className="space-y-2">
            <div className="h-3.5 w-3/4 animate-pulse rounded bg-[oklch(0.18_0.05_298/0.7)]" />
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-[oklch(0.18_0.05_298/0.7)]" />
            <div className="h-14 animate-pulse rounded bg-[oklch(0.18_0.05_298/0.7)]" />
          </div>
        )}

        {insight && (
          <>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.56_0.22_286/0.22)] bg-[oklch(0.18_0.07_298/0.5)] px-2.5 py-0.5 text-[10.5px] text-foreground/80">
              <Lock className="h-3 w-3 text-[oklch(0.80_0.14_68)]" /> Stage: {insight.relationshipStage}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Score label="Romantic" value={insight.romanticPotential} />
              <Score label="Friendship" value={insight.friendshipPotential} />
              <Score label="Communication" value={insight.communicationScore} />
              <Score label="Shared Values" value={insight.sharedInterestsScore} />
              <Score label="Growth" value={insight.longTermPotential} />
              <Score label="Overall" value={insight.overallCompatibility} />
            </div>

            <p className="mt-4 text-[13.5px] italic leading-relaxed text-foreground/85">"{insight.aiSummary}"</p>

            <div className="mt-3 rounded-2xl border border-[oklch(0.56_0.22_286/0.18)] bg-[oklch(0.13_0.05_298/0.4)] p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/55">Suggested next step</div>
              <div className="mt-1 text-[13px] text-foreground/90">{insight.suggestedNextStep}</div>
            </div>

            {insight.dateIdeas.length > 0 && (
              <div className="mt-3">
                <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/55">AI Date Ideas</div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {insight.dateIdeas.map((d, i) => (
                    <div key={i} className="rounded-2xl border border-[oklch(0.56_0.22_286/0.18)] bg-[oklch(0.13_0.05_298/0.4)] p-2.5">
                      <div className="text-[13px] font-semibold">{d.title}</div>
                      <div className="mt-1 text-[11.5px] leading-snug text-foreground/65">{d.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-[11px] text-foreground/55">
              <span>Updated {timeAgo(insight.computedAt)}</span>
              <Link to="/insights-ai" className="text-foreground/75 underline">Full insights →</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PremiumUpsellCard() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[oklch(0.56_0.22_286/0.16)] bg-[oklch(0.13_0.05_298/0.4)] p-5 backdrop-blur-xl">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.65 0.20 328 / 0.6), transparent 70%)" }}
      />
      <div className="relative">
        <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-foreground/55">
          <Sparkles className="h-3 w-3 text-[oklch(0.80_0.14_68)]" /> AI Insights
        </div>
        <h3 className="font-display text-[18px] font-semibold tracking-tight">Unveil AI Compatibility</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/70">
          Discover which connections have the strongest potential for romance, friendship, and long-term compatibility.
        </p>
        <ul className="mt-2.5 space-y-0.5 text-[12.5px] text-foreground/85">
          <li>• Best overall, romantic & friendship match</li>
          <li>• AI date suggestions</li>
          <li>• Communication & shared values analysis</li>
        </ul>
        <Link
          to="/premium"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[oklch(0.58_0.18_286)] to-[oklch(0.62_0.18_328)] px-4 py-2 text-[13px] font-medium text-white shadow-[0_6px_18px_-8px_oklch(0.58_0.18_286/0.7)]"
        >
          <Crown className="h-4 w-4" /> Upgrade to Premium
        </Link>
      </div>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[oklch(0.56_0.22_286/0.18)] bg-[oklch(0.13_0.05_298/0.4)] p-2.5 text-center">
      <div className="font-display text-[18px] font-bold tracking-tight">{value}%</div>
      <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-foreground/55">{label}</div>
    </div>
  );
}

