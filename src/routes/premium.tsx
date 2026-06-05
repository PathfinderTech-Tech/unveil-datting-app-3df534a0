import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { VeilBackdrop } from "@/components/VeilBackdrop";
import { Check, Sparkles, Heart, ShieldCheck, Shield, Zap } from "lucide-react";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "Membership — UNVEIL" },
      {
        name: "description",
        content:
          "UNVEIL is free to use. Premium gives you deeper insights, more personalization, and a richer discovery experience.",
      },
    ],
  }),
  component: Membership,
});

type Plan = "1" | "3" | "6" | "12";
const PRICES: Record<Plan, { price: string; label: string; perMonth?: string }> = {
  "1": { price: "$19.99", label: "1 Month" },
  "3": { price: "$49.99", label: "3 Months", perMonth: "$16.66/mo" },
  "6": { price: "$89.99", label: "6 Months", perMonth: "$15.00/mo" },
  "12": { price: "$149.99", label: "12 Months", perMonth: "$12.50/mo" },
};

const FREE_FEATURES = [
  "Create your profile",
  "Complete onboarding",
  "Answer Spark Questions",
  "Play discovery puzzles",
  "Receive compatible matches",
  "Chat with matches",
  "Join Couple Challenges",
  "Use Date Passport",
  "Report and block users",
  "Safety reminders",
];

const PREMIUM_FEATURES = [
  "Deeper compatibility insights",
  "Advanced chemistry meter",
  "More Spark Questions",
  "Extra Couple Challenge packs",
  "Personalized connection reports",
  "Advanced profile customization",
  "Priority match discovery",
  "Save favorite profiles",
  "Date preparation insights",
  "Communication tips",
  "Premium profile badge",
  "Verified Profile included free",
];

const VERIFIED_BENEFITS = [
  "Blue Verified Badge",
  "Higher trust score",
  "Increased profile visibility",
  "Verification date displayed on profile",
];

function Membership() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan>("3");
  const selected = PRICES[plan];

  const goCheckout = (product: "premium" | "verified") => {
    navigate({ to: "/checkout", search: { product, plan } as any });
  };

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
            UNVEIL is free to use. Premium gives you deeper insights and a richer discovery experience.
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
            blurb="Everything you need to meet, connect, and build something meaningful."
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

          {/* PREMIUM */}
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
              For users who want deeper compatibility insight and a more personalized discovery experience.
            </p>

            <div className="mt-6">
              <div className="mb-3 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
                Choose your duration
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(PRICES) as Plan[]).map((p) => {
                  const active = plan === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPlan(p)}
                      className={`rounded-2xl border p-3 text-left transition-all ${
                        active
                          ? "border-primary bg-gradient-hero text-primary-foreground shadow-glow"
                          : "border-border bg-surface hover:bg-surface-2"
                      }`}
                    >
                      <div className="text-[11px] font-medium opacity-80">{PRICES[p].label}</div>
                      <div className="mt-1 font-display text-xl">{PRICES[p].price}</div>
                      {PRICES[p].perMonth && (
                        <div className="mt-0.5 text-[10px] opacity-70">{PRICES[p].perMonth}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex items-baseline gap-2">
              <span className="font-display text-4xl">{selected.price}</span>
              <span className="text-sm text-muted-foreground">/ {selected.label.toLowerCase()}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Tax calculated at checkout based on your billing region.</p>

            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                  <span className="text-foreground/85">{f}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => goCheckout("premium")}
              className="mt-7 inline-flex items-center justify-center rounded-full bg-gradient-hero px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
            >
              Upgrade to Premium
            </button>

            <p className="mt-4 text-xs italic text-foreground/70">
              Premium helps you discover more. It does not determine whether you can connect.
            </p>
          </div>
        </div>

        {/* DAILY MESSAGE PASS */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-accent/40 bg-accent/5 p-6 md:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-xl font-light">Daily Message Pass</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Unlock unlimited messaging for the next 24 hours. Perfect when you need a single great day of conversation without committing to a subscription.
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

        {/* VERIFIED */}
        <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-gradient-deep p-7 md:p-10">
          <div className="grid items-start gap-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-logo text-primary-foreground shadow-glow">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-3xl font-light md:text-4xl">Verified Profile</h2>
                <VerifiedBadge size="md" />
              </div>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground">
                Increase trust and reduce fake accounts with selfie verification, identity check, and photo
                comparison. Verified members earn a blue badge that appears across the platform.
              </p>
              <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
                {VERIFIED_BENEFITS.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                    <span className="text-foreground/85">{f}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
                Badge displayed on profiles · in chat · in search · on match cards
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
                One-time verification
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-display text-4xl">$9.99</span>
                <span className="text-xs text-muted-foreground">one-time fee</span>
              </div>
              <button
                onClick={() => goCheckout("verified")}
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-gradient-hero px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow"
              >
                Get Verified
              </button>
              <div className="my-5 flex items-center gap-2 text-[10px] uppercase tracking-luxury text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
              </div>
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
                <div className="text-xs text-foreground/85">
                  Included <span className="font-semibold">free</span> with UNVEIL Premium.
                </div>
                <button
                  onClick={() => goCheckout("premium")}
                  className="mt-3 text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  Upgrade to Premium →
                </button>
              </div>
              <Link
                to="/verify"
                className="mt-4 block text-center text-[11px] text-muted-foreground hover:text-foreground"
              >
                Learn how verification works
              </Link>
            </div>
          </div>
        </div>

        {/* Notices */}
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-accent" /> No traps
            </div>
            <p className="mt-2 text-sm text-foreground/85">
              When your membership ends you can renew for 1, 3, 6, or 12 months — or continue with the free
              version. No forced commitments. No confusing plans.
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
          <span className="text-muted-foreground/40">·</span>
          <Link
            to="/verify"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Verification details
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
