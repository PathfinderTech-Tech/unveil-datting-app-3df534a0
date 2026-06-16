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

type MatchRow = { peerId: string; name: string; insight?: CompatibilityInsight; loading?: boolean; error?: string; errorCode?: string };

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
    setRows((rs) => rs.map((r) => r.peerId === peerId ? { ...r, loading: true, error: undefined, errorCode: undefined } : r));
    try {
      const res = await fetchInsight({ data: { peerId, force } });
      setRows((rs) => rs.map((r) => {
        if (r.peerId !== peerId) return r;
        if ("error" in res) return { ...r, loading: false, error: aiErrorMessage(res.error), errorCode: res.error };
        return { ...r, loading: false, insight: res.insight };
      }));
      // Refresh top picks
      const t = await fetchTop({ data: {} } as any);
      if ("ok" in t) setTop({ bestOverall: t.bestOverall, bestRomantic: t.bestRomantic, bestFriendship: t.bestFriendship });
    } catch (e) {
      console.error("[insights-ai] generateFor failed", e);
      setRows((rs) => rs.map((r) => r.peerId === peerId ? { ...r, loading: false, error: aiErrorMessage("AI_SERVICE_UNAVAILABLE"), errorCode: "AI_SERVICE_UNAVAILABLE" } : r));
    }
  }


  if (entLoading) {
    return <div className="min-h-screen bg-background"><UnveilNav /><div className="p-12 text-center text-muted-foreground">…</div></div>;
  }

  if (!entitlements.premium) {
    return (
      <div className="min-h-screen bg-background">
        <UnveilNav />
        <div className="mx-auto max-w-5xl px-6 py-10">
          <Link to="/matches" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to matches
          </Link>

          <HeroBlock />

          {/* Locked top picks preview */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <LockedPick label="Best Overall Match" sub="Your top connection with the highest overall compatibility." icon={<Trophy className="h-5 w-5" />} />
            <LockedPick label="Best Romantic Match" sub="Your strongest potential for romantic connection." icon={<Heart className="h-5 w-5" />} />
            <LockedPick label="Best Friendship Match" sub="Your strongest potential for a meaningful friendship." icon={<Users className="h-5 w-5" />} />
          </div>

          {/* What's included */}
          <div className="mt-6 rounded-3xl border border-border bg-card p-6">
            <div className="text-center font-mono text-xs uppercase tracking-luxury text-accent">What's Included</div>
            <ul className="mx-auto mt-5 grid max-w-xl gap-3 sm:grid-cols-2">
              <IncludedRow icon={<Trophy className="h-4 w-4 text-accent" />} label="Best Overall Match" />
              <IncludedRow icon={<Heart className="h-4 w-4 text-accent" />} label="Best Romantic Match" />
              <IncludedRow icon={<Users className="h-4 w-4 text-accent" />} label="Best Friendship Match" />
              <IncludedRow icon={<Calendar className="h-4 w-4 text-accent" />} label="AI Date Suggestions" />
              <IncludedRow icon={<Activity className="h-4 w-4 text-accent" />} label="Relationship Journey" />
              <IncludedRow icon={<Shield className="h-4 w-4 text-accent" />} label="Attachment Style Analysis" />
              <IncludedRow icon={<MessageCircle className="h-4 w-4 text-accent" />} label="Communication Style Analysis" />
              <IncludedRow icon={<Gem className="h-4 w-4 text-accent" />} label="Shared Values Analysis" />
            </ul>
            <div className="mt-6 flex justify-center">
              <Link
                to="/premium"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow"
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
        <HeroBlock premium />

        {/* TOP PICKS */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <TopPick label="Best Overall Match" sub="Your top connection with the highest overall compatibility." icon={<Trophy className="h-5 w-5" />} insight={top?.bestOverall ?? null} metric="overallCompatibility" />
          <TopPick label="Best Romantic Match" sub="Your strongest potential for romantic connection." icon={<Heart className="h-5 w-5" />} insight={top?.bestRomantic ?? null} metric="romanticPotential" />
          <TopPick label="Best Friendship Match" sub="Your strongest potential for a meaningful friendship." icon={<Users className="h-5 w-5" />} insight={top?.bestFriendship ?? null} metric="friendshipPotential" />
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

function TopPick({ label, sub, icon, insight, metric }: { label: string; sub: string; icon: React.ReactNode; insight: CompatibilityInsight | null; metric: keyof CompatibilityInsight }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-5 transition-colors hover:border-primary/40">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-accent shadow-glow">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-base font-semibold">{label}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      {insight ? (
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="font-display text-xl font-bold">{insight.matchName}</div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{insight.aiSummary}</p>
          </div>
          <div className="font-display text-3xl font-bold text-gradient-hero">{insight[metric] as number}%</div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Analyze a few matches below to see your top pick.</p>
      )}
    </div>
  );
}

function HeroBlock({ premium = false }: { premium?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-10">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gradient-hero opacity-30 blur-3xl" />
      <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto]">
        <div>
          <div className="font-mono text-xs uppercase tracking-luxury text-accent">AI Insights · Premium</div>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl">
            Your Relationship<br />
            <span className="text-gradient-hero">Intelligence Hub</span>
            <Sparkles className="ml-2 inline h-6 w-6 text-accent" />
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Advanced AI compatibility insights to help you discover deeper connections that truly matter.
          </p>
          {!premium && (
            <Link
              to="/premium"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow"
            >
              <Crown className="h-4 w-4" /> Upgrade to Premium
            </Link>
          )}
        </div>
        <div className="relative mx-auto h-44 w-44 sm:h-56 sm:w-56">
          <div className="absolute inset-4 rounded-full bg-gradient-hero opacity-40 blur-2xl" />
          <img src={robotMascot} alt="AI Insights mascot" width={512} height={512} className="relative h-full w-full object-contain drop-shadow-[0_0_30px_rgba(168,85,247,0.55)]" />
        </div>
      </div>
    </div>
  );
}

function LockedPick({ label, sub, icon }: { label: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-accent">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-base font-semibold">{label}</div>
          <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
        </div>
        <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-surface-2 blur-[2px]" />
        <div className="h-8 w-8 -ml-3 rounded-full bg-surface-2 blur-[2px]" />
        <div className="h-8 w-8 -ml-3 rounded-full bg-surface-2 blur-[2px]" />
      </div>
    </div>
  );
}

function IncludedRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-surface/40 px-3 py-2.5 text-sm">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">{icon}</span>
      <span>{label}</span>
    </li>
  );
}

