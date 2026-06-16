import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UnveilNav } from "@/components/UnveilNav";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Gift, Crown, Trophy, Heart, Sparkles, Flame, Lock } from "lucide-react";
import { useEntitlements } from "@/hooks/use-entitlements";
import { listGiftCatalog, getGiftQuota, type GiftCatalogItem, type GiftQuota } from "@/lib/gifts.functions";

export const Route = createFileRoute("/gifts")({
  head: () => ({
    meta: [
      { title: "Gifts — UNVEIL" },
      { name: "description", content: "Send meaningful gifts and build a deeper connection." },
    ],
  }),
  component: GiftsPage,
});

function GiftsPage() {
  const { entitlements } = useEntitlements();
  const listFn = useServerFn(listGiftCatalog);
  const quotaFn = useServerFn(getGiftQuota);
  const [items, setItems] = useState<GiftCatalogItem[]>([]);
  const [quota, setQuota] = useState<GiftQuota | null>(null);

  useEffect(() => {
    Promise.all([listFn({ data: {} }), quotaFn()])
      .then(([cat, q]) => {
        setItems(cat.items);
        setQuota(q);
      })
      .catch((e) => console.error("[gifts page] load", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPremium = entitlements.premium;

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <UnveilNav />

      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-10">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-gradient-hero opacity-20 blur-3xl" />
          <div className="relative grid items-center gap-6 sm:grid-cols-[1.4fr,1fr]">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-mono uppercase tracking-luxury text-muted-foreground">
                <Sparkles className="h-3 w-3 text-accent" /> Gifts • Premium Feature
              </div>
              <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
                Make meaningful{" "}
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  connections even deeper
                </span>
              </h1>
              <p className="mt-3 text-sm text-muted-foreground sm:text-base">
                Send thoughtful gifts that express your interest, unlock deeper conversations, and stand out in a sea of swipes.
              </p>
              <Link
                to="/messages"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow"
              >
                <Gift className="h-4 w-4" /> Send a Gift in Chat
              </Link>
            </div>
            <div className="flex justify-center">
              <div className="flex h-40 w-40 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/30 to-accent/30 text-7xl shadow-glow">
                🎁
              </div>
            </div>
          </div>
        </section>

        {/* Value props */}
        <section className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            { icon: Heart, title: "Stand Out", body: "Gifts help you get noticed and remembered." },
            { icon: Sparkles, title: "Start Conversations", body: "Break the ice with a thoughtful gesture." },
            { icon: Lock, title: "Unlock Connections", body: "Some gifts unlock exclusive content." },
            { icon: Trophy, title: "Earn Attention", body: "Show genuine interest and build real chemistry." },
          ].map((v) => (
            <div key={v.title} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
                <v.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="font-semibold">{v.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{v.body}</div>
            </div>
          ))}
        </section>

        {/* Featured gifts */}
        <section className="mt-6 rounded-3xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-xs uppercase tracking-luxury text-muted-foreground">Featured Gifts</h2>
            <span className="text-xs text-muted-foreground">Send from any conversation</span>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {items.slice(0, 6).map((g) => (
              <div
                key={g.slug}
                className="relative flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface/40 p-3 text-center"
              >
                <div className="text-3xl">{g.emoji}</div>
                <div className="text-[11px] font-medium">{g.name}</div>
                <div className="text-[10px] text-muted-foreground">💎 {g.gemCost}</div>
                {g.locked && <Lock className="absolute right-1.5 top-1.5 h-3 w-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </section>

        {/* Journey + Streak */}
        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-mono uppercase tracking-luxury text-muted-foreground">
              <Trophy className="h-3 w-3 text-accent" /> Gift Journey
            </div>
            <h3 className="font-display text-lg font-semibold">Build a deeper connection as your journey grows.</h3>
            <div className="mt-4 flex items-center justify-between gap-2">
              {[
                { label: "First Gift", icon: Gift },
                { label: "Meaningful", icon: Heart },
                { label: "Deep Connection", icon: Trophy },
              ].map((s, i) => (
                <div key={s.label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20">
                    <s.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-[11px] text-muted-foreground">{s.label}</div>
                  {i < 2 && <div className="text-[10px] text-muted-foreground">→</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-mono uppercase tracking-luxury text-muted-foreground">
              <Flame className="h-3 w-3 text-accent" /> Gift Streak
            </div>
            <h3 className="font-display text-lg font-semibold">Keep the momentum going with consistent gestures.</h3>
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-surface/40 p-3">
              <Flame className="h-8 w-8 text-orange-400" />
              <div>
                <div className="font-display text-2xl font-bold">{quota ? quota.used : 0}</div>
                <div className="text-[11px] text-muted-foreground">
                  {quota?.unlimited ? "Unlimited (Premium)" : `of ${quota?.limit ?? 3} this week`}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Premium CTA */}
        {!isPremium && (
          <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-accent/10 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-hero">
                <Crown className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="font-semibold">Unlimited Gifting with Premium</div>
                <div className="text-xs text-muted-foreground">
                  Send more gifts, unlock premium gifts, and enjoy exclusive rewards.
                </div>
              </div>
            </div>
            <Link
              to="/premium"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-hero px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow"
            >
              <Crown className="h-4 w-4" /> Upgrade to Premium
            </Link>
          </section>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
