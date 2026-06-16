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
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3 w-3 text-accent" /> AI Compatibility Insights
          </div>
          <h3 className="mt-1 font-display text-xl font-bold">
            {insight ? insight.compatibilityLabel : loading ? "Analyzing…" : "AI Compatibility Insights"}
          </h3>
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs hover:bg-surface disabled:opacity-50"
          title="Refresh insights"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Only show technical error messages for genuine system failures */}
      {error && errorCode === "AI_SERVICE_UNAVAILABLE" && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {error}
        </div>
      )}

      {error && errorCode === "NOT_MUTUAL" && (
        <div className="rounded-xl border border-border bg-surface/40 p-3 text-sm text-muted-foreground">
          {error}
        </div>
      )}

      {!insight && loading && (
        <div className="space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-surface-2" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-surface-2" />
          <div className="h-16 animate-pulse rounded bg-surface-2" />
        </div>
      )}

      {insight && (
        <>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs">
            <Lock className="h-3 w-3 text-accent" /> Stage: {insight.relationshipStage}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Score label="Overall" value={insight.overallCompatibility} />
            <Score label="Romantic" value={insight.romanticPotential} />
            <Score label="Friendship" value={insight.friendshipPotential} />
            <Score label="Comm." value={insight.communicationScore} />
          </div>

          <p className="mt-4 text-sm leading-relaxed text-foreground/90">"{insight.aiSummary}"</p>

          <div className="mt-4 rounded-2xl border border-border bg-surface/40 p-3">
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Suggested next step</div>
            <div className="mt-1 text-sm">{insight.suggestedNextStep}</div>
          </div>

          {insight.dateIdeas.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">AI Date Ideas</div>
              <div className="grid gap-2 sm:grid-cols-3">
                {insight.dateIdeas.map((d, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-surface/40 p-3">
                    <div className="text-sm font-semibold">{d.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{d.reason}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>Last updated: {timeAgo(insight.computedAt)}</span>
            <Link to="/insights-ai" className="underline">Open AI hub →</Link>
          </div>
        </>
      )}
    </div>
  );
}

function PremiumUpsellCard() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-hero opacity-20 blur-3xl" />
      <div className="relative">
        <div className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3 w-3 text-accent" /> AI Compatibility Insights
        </div>
        <h3 className="font-display text-xl font-bold">Unveil AI Compatibility Insights</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Discover which connections may have the strongest potential for romance, friendship, meaningful conversation, and long-term compatibility.
        </p>
        <ul className="mt-3 space-y-1 text-sm text-foreground/90">
          <li>• Best Overall Match</li>
          <li>• Best Romantic Match</li>
          <li>• Best Friendship Match</li>
          <li>• AI Date Suggestions</li>
          <li>• Relationship Journey Analysis</li>
          <li>• Communication Insights</li>
          <li>• Shared Values Analysis</li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground">
          Upgrade to Premium to unlock Unveil AI Compatibility Insights.
        </p>
        <Link
          to="/premium"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow"
        >
          <Crown className="h-4 w-4" /> Upgrade to Premium
        </Link>
      </div>
    </div>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/40 p-3 text-center">
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

