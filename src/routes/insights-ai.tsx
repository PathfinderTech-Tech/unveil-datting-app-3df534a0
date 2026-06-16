import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Heart, Users, Crown, RefreshCw, ArrowLeft, Trophy, ChevronRight, Lock, Calendar, Activity, Shield, MessageCircle, Gem } from "lucide-react";
import { UnveilNav } from "@/components/UnveilNav";
import { useEntitlements } from "@/hooks/use-entitlements";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { getCompatibilityInsight, getTopAiMatches, aiErrorMessage, type CompatibilityInsight } from "@/lib/ai-compatibility.functions";
import robotMascot from "@/assets/ai-insights-robot.png";

import { InsightsHubTabs } from "@/components/InsightsHubTabs";

export const Route = createFileRoute("/insights-ai")({
  head: () => ({
    meta: [
      { title: "AI Insights — UNVEIL" },
      { name: "description", content: "Premium AI compatibility analysis, relationship journey progress, and date ideas across your matches." },
    ],
  }),
  component: InsightsAiPage,
});

type MatchRow = { peerId: string; name: string; insight?: CompatibilityInsight; loading?: boolean; error?: string };

function InsightsAiPage() {
  const { user } = useAuth();
  const { entitlements, loading: entLoading } = useEntitlements();
  const fetchInsight = useServerFn(getCompatibilityInsight);
  const fetchTop = useServerFn(getTopAiMatches);

  const [rows, setRows] = useState<MatchRow[]>([]);
  const [top, setTop] = useState<{ bestOverall: CompatibilityInsight | null; bestRomantic: CompatibilityInsight | null; bestFriendship: CompatibilityInsight | null } | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  // Load mutual matches list
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("matches")
        .select("user_id,matched_user_id,created_at")
        .or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`)
        .eq("mutual_interest", true)
        .order("created_at", { ascending: false })
        .limit(20);
      const peerIds = (data ?? []).map((m: any) => m.user_id === user.id ? m.matched_user_id : m.user_id);
      if (peerIds.length === 0) { if (alive) { setRows([]); setLoadingList(false); } return; }
      const { data: profs } = await (supabase as any).rpc("get_public_match_profiles", { _targets: peerIds });
      if (!alive) return;
      const profMap = new Map<string, any>((profs ?? []).map((p: any) => [p.id, p]));
      setRows(peerIds.map((id) => ({ peerId: id, name: profMap.get(id)?.first_name ?? "Match" })));
      setLoadingList(false);
    })();
    return () => { alive = false; };
  }, [user]);

  // Load cached top picks
  useEffect(() => {
    if (!entitlements.premium) return;
    fetchTop({ data: {} } as any).then((r) => {
      if ("ok" in r) setTop({ bestOverall: r.bestOverall, bestRomantic: r.bestRomantic, bestFriendship: r.bestFriendship });
    }).catch(() => { /* noop */ });
  }, [entitlements.premium, fetchTop]);

  async function generateFor(peerId: string, force = false) {
    setRows((rs) => rs.map((r) => r.peerId === peerId ? { ...r, loading: true, error: undefined } : r));
    try {
      const res = await fetchInsight({ data: { peerId, force } });
      setRows((rs) => rs.map((r) => {
        if (r.peerId !== peerId) return r;
        if ("error" in res) return { ...r, loading: false, error: aiErrorMessage(res.error) };
        return { ...r, loading: false, insight: res.insight };
      }));
      // Refresh top picks
      const t = await fetchTop({ data: {} } as any);
      if ("ok" in t) setTop({ bestOverall: t.bestOverall, bestRomantic: t.bestRomantic, bestFriendship: t.bestFriendship });
    } catch (e) {
      console.error("[insights-ai] generateFor failed", e);
      setRows((rs) => rs.map((r) => r.peerId === peerId ? { ...r, loading: false, error: aiErrorMessage("AI_SERVICE_UNAVAILABLE") } : r));
    }
  }

  if (entLoading) {
    return <div className="min-h-screen bg-background"><UnveilNav /><div className="p-12 text-center text-muted-foreground">…</div></div>;
  }

  if (!entitlements.premium) {
    return (
      <div className="min-h-screen bg-background">
        <UnveilNav />
        <div className="mx-auto max-w-3xl px-6 py-12">
          <Link to="/matches" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to matches
          </Link>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8">
            <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gradient-hero opacity-25 blur-3xl" />
            <div className="relative">
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">AI Insights · Premium</div>
              <h1 className="mt-2 font-display text-4xl font-bold">AI Compatibility Insights</h1>
              <p className="mt-2 text-sm italic text-accent">Your Relationship Intelligence Hub</p>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Understand which connections may have the strongest potential for romance, friendship, and long-term compatibility.
              </p>
              <p className="mt-5 text-sm font-medium text-foreground">Unlock:</p>
              <ul className="mt-2 space-y-1 text-sm text-foreground/90">
                <li>• Best Romantic Match</li>
                <li>• Best Friendship Match</li>
                <li>• Best Overall Match</li>
                <li>• AI Date Suggestions</li>
                <li>• Relationship Journey Insights</li>
                <li>• Premium AI Analysis</li>
              </ul>
              <p className="mt-5 text-sm text-muted-foreground">
                Upgrade to Premium to unlock AI Compatibility Insights.
              </p>
              <Link
                to="/premium"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow"
              >
                <Crown className="h-4 w-4" /> Upgrade to Premium
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <UnveilNav />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">AI Insights · Premium</div>
          <h1 className="mt-1 font-display text-4xl font-bold">AI Insights</h1>
          <p className="mt-1 text-sm italic text-accent">Your Relationship Intelligence Hub</p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Real-name compatibility analysis across your mutual matches — plus your daily readiness, blueprint, and 7-day connection journey. Insights auto-refresh every 24 hours.
          </p>
        </div>

        {/* TOP PICKS */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <TopPick label="Best Overall" icon={<Sparkles className="h-4 w-4" />} insight={top?.bestOverall ?? null} metric="overallCompatibility" />
          <TopPick label="Best Romantic" icon={<Heart className="h-4 w-4" />} insight={top?.bestRomantic ?? null} metric="romanticPotential" />
          <TopPick label="Best Friendship" icon={<Users className="h-4 w-4" />} insight={top?.bestFriendship ?? null} metric="friendshipPotential" />
        </div>

        {/* MATCH LIST */}
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-3 font-display text-lg font-bold">Your mutual matches</h2>
          {loadingList ? (
            <div className="text-sm text-muted-foreground">Loading matches…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No mutual matches yet.</div>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.peerId} className="rounded-2xl border border-border bg-surface/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link to="/match/$userId" params={{ userId: r.peerId }} className="font-display text-base font-semibold hover:underline">
                        {r.name}
                      </Link>
                      {r.insight && (
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          <Chip>{r.insight.compatibilityLabel}</Chip>
                          <Chip>Overall {r.insight.overallCompatibility}%</Chip>
                          <Chip>Romance {r.insight.romanticPotential}%</Chip>
                          <Chip>Friendship {r.insight.friendshipPotential}%</Chip>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => generateFor(r.peerId, !!r.insight)}
                      disabled={r.loading}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs hover:bg-surface disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${r.loading ? "animate-spin" : ""}`} />
                      {r.insight ? "Refresh" : "Analyze"}
                    </button>
                  </div>
                  {r.error && <div className="mt-2 text-xs text-destructive">{r.error}</div>}
                  {r.insight && (
                    <>
                      <p className="mt-3 text-sm text-foreground/90">"{r.insight.aiSummary}"</p>
                      {r.insight.dateIdeas.length > 0 && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          {r.insight.dateIdeas.map((d, i) => (
                            <div key={i} className="rounded-xl border border-border bg-background/40 p-2.5">
                              <div className="text-sm font-semibold">{d.title}</div>
                              <div className="mt-0.5 text-xs text-muted-foreground">{d.reason}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MERGED RELATIONSHIP INTELLIGENCE — Today / Readiness / Blueprint / Connection */}
        {user && (
          <div className="mt-10">
            <h2 className="mb-4 font-display text-lg font-bold">Relationship intelligence</h2>
            <InsightsHubTabs userId={user.id} />
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border bg-background/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{children}</span>;
}

function TopPick({ label, icon, insight, metric }: { label: string; icon: React.ReactNode; insight: CompatibilityInsight | null; metric: keyof CompatibilityInsight }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      {insight ? (
        <>
          <div className="mt-2 font-display text-2xl font-bold">{insight.matchName}</div>
          <div className="mt-1 font-display text-4xl font-bold text-gradient-hero">{insight[metric] as number}%</div>
          <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{insight.aiSummary}</p>
        </>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Analyze a few matches below to see your top pick.</p>
      )}
    </div>
  );
}
