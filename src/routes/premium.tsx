import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { UnveilNav } from "@/components/UnveilNav";
import { VeilBackdrop } from "@/components/VeilBackdrop";
import { Check, Sparkles, Heart, Shield, Zap } from "lucide-react";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "Membership — UNVEIL" },
      {
        name: "description",
        content:
          "UNVEIL is free to use. Premium gives you unlimited messaging and deeper insights for $15.99 / month.",
      },
    ],
  }),
  component: Membership,
});

const FREE_FEATURES = [
  "15 messages per day",
  "Create your profile",
  "Complete onboarding",
  "Answer Spark Questions",
  "Play discovery puzzles",
  "Receive compatible matches",
  "Join Couple Challenges",
  "Use Date Passport",
  "Report and block users",
  "Safety reminders",
];

const PREMIUM_FEATURES = [
  "Unlimited daily messages",
  "Deeper compatibility insights",
  "Advanced chemistry meter",
  "More Spark Questions",
  "Extra Couple Challenge packs",
  "Personalized connection reports",
  "Priority match discovery",
  "Save favorite profiles",
  "Date preparation insights",
  "Premium profile badge",
];

function Membership() {
  const navigate = useNavigate();

  const goPremium = () => navigate({ to: "/checkout", search: { product: "premium" } as any });

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        {/* Hero */}
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-luxury text-muted-foreground">Membership</p>
          <h1 className="mt-4 font-display text-4xl font-light leading-tight md:text-6xl">
            Choose how you want to <span className="text-gradient-aura italic">discover</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            UNVEIL is free to use. Premium gives you unlimited messaging and deeper insights.
          </p>
        </div>

        {/* Plans */}
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {/* FREE */}
          <PlanCard
            icon={<Heart className="h-5 w-5" />}
            iconBg="bg-surface-2 text-accent"
            title="Free"
            price="$0"
            cadence="/ forever"
            blurb="Everything you need to meet, connect, and start meaningful conversations."
            features={FREE_FEATURES}
            cta={
              <Link
                to="/signup"
                className="mt-8 inline-flex items-center justify-center rounded-full border border-border bg-surface px-5 py-3 text-sm font-medium hover:bg-surface-2"
              >
                Continue Free
              </Link>
            }
          />

          {/* PREMIUM — single monthly tier */}
          <div className="relative flex flex-col overflow-hidden rounded-3xl border border-primary bg-card p-7 shadow-glow md:p-9">
            <VeilBackdrop variant="corner" opacity={0.09} />
            <div className="absolute -top-3 left-7 rounded-full bg-gradient-hero px-3 py-1 font-mono text-[10px] uppercase tracking-luxury text-primary-foreground shadow-glow">
              Most chosen
            </div>
            <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-aura text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="font-display text-2xl font-light">UNVEIL Premium</div>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              For users who want unlimited messaging and a deeper, more personalized discovery experience.
            </p>

            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-display text-5xl">$15.99</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Cancel anytime. Tax calculated at checkout.</p>

            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                  <span className="text-foreground/85">{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={goPremium}
              className="mt-7 inline-flex items-center justify-center rounded-full bg-gradient-hero px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
            >
              Upgrade to Premium · $15.99/mo
            </button>

            <p className="mt-4 text-xs italic text-foreground/70">
              Premium helps you discover more. It does not determine whether you can connect.
            </p>
          </div>
        </div>

        {/* 24h UNLIMITED PASS */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-accent/40 bg-accent/5 p-6 md:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-xl font-light">24-Hour Unlimited Pass</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Unlock unlimited messaging for the next 24 hours. Perfect for a single great day of conversation without a subscription.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-display text-2xl">$1.99</div>
              <div className="text-[10px] uppercase tracking-luxury text-muted-foreground">24 hours</div>
            </div>
            <Link
              to="/checkout"
              search={{ product: "message_pass" } as any}
              className="inline-flex items-center justify-center rounded-full border border-accent bg-accent/15 px-5 py-2.5 text-sm font-medium text-accent hover:bg-accent/20"
            >
              Get Pass
            </Link>
          </div>
        </div>

        {/* Notices */}
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-accent" /> No traps
            </div>
            <p className="mt-2 text-sm text-foreground/85">
              Cancel your membership anytime — no forced commitments, no confusing plans.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-accent" /> Refunds
            </div>
            <p className="mt-2 text-sm text-foreground/85">
              Membership purchases are non-refundable except where required by law.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-center">
          <Link
            to="/manage-subscription"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Manage subscription
          </Link>
        </div>

        <p className="mt-8 text-center text-sm italic text-muted-foreground">
          Love should never feel trapped behind a paywall.
        </p>
      </section>
    </div>
  );
}

function PlanCard({
  icon,
  iconBg,
  title,
  price,
  cadence,
  blurb,
  features,
  cta,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  cta: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-col rounded-3xl border border-border bg-card p-7 md:p-9">
      <div className={`mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>{icon}</div>
      <div className="font-display text-2xl font-light">{title}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-5xl">{price}</span>
        <span className="text-sm text-muted-foreground">{cadence}</span>
      </div>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">{blurb}</p>
      <ul className="mt-6 flex-1 space-y-2.5 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
            <span className="text-foreground/85">{f}</span>
          </li>
        ))}
      </ul>
      {cta}
    </div>
  );
}
