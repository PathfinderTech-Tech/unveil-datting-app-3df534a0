import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UnveilNav } from "@/components/UnveilNav";
import { useAuth } from "@/hooks/use-auth";
import { getBetaStats, type BetaStats } from "@/lib/admin-beta.functions";
import {
  Users, ShieldCheck, Crown, Heart, MessageCircle, Activity, FileCheck, DollarSign, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/admin/beta")({
  head: () => ({ meta: [{ title: "Beta Dashboard — UNVEIL" }] }),
  component: BetaDashboard,
});

function BetaDashboard() {
  const { user, loading } = useAuth();
  const fetchStats = useServerFn(getBetaStats);
  const [stats, setStats] = useState<BetaStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchStats({})
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [user, fetchStats]);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted-foreground">Sign in to continue.</p>
        <Link to="/login" className="rounded-full bg-gradient-hero px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow">Sign in</Link>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-muted-foreground">{error}</p>
        <Link to="/" className="rounded-full bg-gradient-hero px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow">Back home</Link>
      </div>
    );
  }

  const revenue = stats
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: stats.revenueCurrency.toUpperCase() })
        .format(stats.revenueCents / 100)
    : "—";

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-12">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-light md:text-4xl">Beta Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">Closed beta health & growth at a glance.</p>
          </div>
          <Link to="/admin" className="rounded-full border border-border bg-surface px-4 py-2 text-xs hover:bg-surface-2">Full admin →</Link>
        </div>

        {!stats ? (
          <div className="mt-12 flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading stats…</div>
        ) : (
          <div className="mt-8 grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Stat icon={<Users className="h-4 w-4" />} label="Total users" value={stats.totalUsers} />
            <Stat icon={<ShieldCheck className="h-4 w-4" />} label="Verified users" value={stats.verifiedUsers} />
            <Stat icon={<Crown className="h-4 w-4" />} label="Premium users" value={stats.premiumUsers} />
            <Stat icon={<Heart className="h-4 w-4" />} label="Matches created" value={stats.matchesCreated} />
            <Stat icon={<MessageCircle className="h-4 w-4" />} label="Messages sent" value={stats.messagesSent} />
            <Stat icon={<Activity className="h-4 w-4" />} label="Daily active users" value={stats.dailyActiveUsers} />
            <Stat icon={<FileCheck className="h-4 w-4" />} label="Verifications pending" value={stats.verificationPending} />
            <Stat icon={<DollarSign className="h-4 w-4" />} label="Revenue" value={revenue} />
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 font-display text-3xl font-light">{value}</div>
    </div>
  );
}
