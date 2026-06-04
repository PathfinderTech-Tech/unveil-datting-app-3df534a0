import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, Heart, MessageCircle, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { trackEvent } from "@/lib/analytics";
import { PremiumPaywallModal } from "@/components/PremiumPaywallModal";

type InsightSection = {
  icon: typeof Sparkles;
  title: string;
  preview: string;
  detail: string;
};

const SECTIONS: InsightSection[] = [
  {
    icon: Heart,
    title: "Attachment depth",
    preview: "Secure base with bursts of anxious longing.",
    detail:
      "You bond gradually but deeply. Your secure base is supported by a slight anxious thread — you notice silences. Partners with avoidant patterns will leave you reaching; secure or earned-secure partners settle you fastest.",
  },
  {
    icon: MessageCircle,
    title: "Communication signature",
    preview: "Reflective listener, late-night clarifier.",
    detail:
      "Your replies tend to land thoughtful, but slow. You clarify best after dark or after a walk. Lead with one specific question, not three — your matches respond more openly to depth than to breadth.",
  },
  {
    icon: TrendingUp,
    title: "Growth areas",
    preview: "Three soft edges to work on this season.",
    detail:
      "Move first more often — your matches read your slowness as disinterest. Name what you want, not what you're avoiding. And finish small rituals: the second date matters more than the first message.",
  },
];

export function InsightsPlusPaywall() {
  const { isPremium, loading } = useSubscription();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!loading) trackEvent("insights_plus_viewed", { premium: isPremium });
  }, [isPremium, loading]);

  if (loading) return null;

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">Insights+</div>
          <h2 className="mt-1 font-display text-2xl font-light">Your deeper signature</h2>
        </div>
        {!isPremium && (
          <Link
            to="/premium"
            className="hidden rounded-full bg-gradient-hero px-4 py-2 text-xs font-medium text-primary-foreground shadow-glow sm:inline-flex"
          >
            Unlock Insights+
          </Link>
        )}
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <article
              key={s.title}
              className="relative overflow-hidden rounded-2xl border border-border bg-surface/40 p-5"
            >
              <Icon className="h-4 w-4 text-primary" aria-hidden />
              <div className="mt-2 text-sm font-semibold">{s.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{s.preview}</p>

              {isPremium ? (
                <p className="mt-3 text-sm leading-relaxed text-foreground/85">{s.detail}</p>
              ) : (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="relative mt-3 block w-full text-left"
                  aria-label={`Unlock ${s.title}`}
                >
                  <p className="select-none text-sm leading-relaxed text-foreground/85 blur-[6px]" aria-hidden>
                    {s.detail}
                  </p>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-primary/70" />
                  </div>
                </button>
              )}
            </article>
          );
        })}
      </div>

      {!isPremium && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
            <div>
              <div className="text-sm font-medium">Insights+ unlocks the full read.</div>
              <p className="text-xs text-muted-foreground">
                Included with UNVEIL Premium. No trap — cancel anytime.
              </p>
            </div>
          </div>
          <Link
            to="/premium"
            className="rounded-full bg-gradient-hero px-4 py-2 text-xs font-medium text-primary-foreground shadow-glow"
          >
            Unlock Insights+
          </Link>
        </div>
      )}

      <PremiumPaywallModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        feature="insights_plus"
        title="Unlock your full Insights+"
        description="Premium reveals the language behind your patterns — attachment depth, communication signature, and the soft edges to work on."
      />
    </section>
  );
}
