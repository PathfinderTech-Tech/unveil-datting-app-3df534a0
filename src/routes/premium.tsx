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
          "UNVEIL is free to use. Premium gives you 15 messages per day, instant contact sharing, and deeper insights.",
      },
    ],
  }),
  component: Membership,
});

const FREE_FEATURES = [
  "5 messages per day",
  "Full profile creation",
  "Matching & discovery",
  "Compatibility insights",
  "Contact sharing on Day 7",
  "Safety reminders",
];

const PREMIUM_FEATURES = [
  "15 messages per day",
  "Instant contact sharing — no Day 7 wait",
  "Premium badge",
  "Priority discovery placement",
  "Premium compatibility insights",
  "Premium profile features",
];

type PlanKey = "premium" | "premium_quarterly" | "premium_annual";
const PLANS: { key: PlanKey; label: string; price: string; cadence: string; sub?: string; featured?: boolean }[] = [
  { key: "premium",           label: "Monthly",   price: "$15.99",  cadence: "/ month",       sub: "Billed monthly" },
  { key: "premium_quarterly", label: "Quarterly", price: "$39.99",  cadence: "/ 3 months",    sub: "Save ~17%", featured: true },
  { key: "premium_annual",    label: "Annual",    price: "$149.99", cadence: "/ year",        sub: "Best value" },
];

function Membership() {
  const navigate = useNavigate();
  const goPremium = (key: PlanKey) =>
    navigate({ to: "/checkout", search: { product: key } as any });

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-luxury text-muted-foreground">Membership</p>
          <h1 className="mt-4 font-display text-4xl font-light leading-tight md:text-6xl">
            Choose how you want to <span className="text-gradient-aura italic">discover</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            UNVEIL is free to use. Premium unlocks more daily messages, instant contact sharing, and deeper insights.
          </p>
        </div>

        {/* Free + Premium summary */}
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
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

          <div className="relative flex flex-col overflow-hidden rounded-3xl border border-primary bg-card p-7 shadow-glow md:p-9">
            <VeilBackdrop variant="corner" opacity={0.09} />
            <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-aura text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="font-display text-2xl font-light">UNVEIL Premium</div>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              For users who want more daily messages, immediate contact sharing, and a deeper experience.
            </p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                  <span className="text-foreground/85">{f}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs italic text-foreground/70">
              Cancel anytime from your account. Tax calculated at checkout.
            </p>
          </div>
        </div>

        {/* Three premium price tiers */}
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.key}
              className={`relative flex flex-col rounded-3xl border ${p.featured ? "border-primary shadow-glow" : "border-border"} bg-card p-6`}
            >
              {p.featured && (
                <div className="absolute -top-3 left-6 rounded-full bg-gradient-hero px-3 py-1 font-mono text-[10px] uppercase tracking-luxury text-primary-foreground shadow-glow">
                  Most chosen
                </div>
              )}
              <div className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">{p.label}</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-4xl">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.cadence}</span>
              </div>
              {p.sub && <div className="mt-1 text-xs text-muted-foreground">{p.sub}</div>}
              <button
                onClick={() => goPremium(p.key)}
                className={`mt-6 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium ${p.featured ? "bg-gradient-hero text-primary-foreground shadow-glow" : "border border-border bg-surface hover:bg-surface-2"}`}
              >
                Choose {p.label}
              </button>
            </div>
          ))}
        </div>

        {/* 24h Pass */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-accent/40 bg-accent/5 p-6 md:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-xl font-light">24-Hour Unlimited Pass</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Unlimited messaging for the next 24 hours. Works for free and premium users.
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
      </section>
    </div>
  );
}

function PlanCard({
  icon, iconBg, title, price, cadence, blurb, features, cta,
}: {
  icon: React.ReactNode; iconBg: string; title: string; price: string; cadence: string; blurb: string; features: string[]; cta: React.ReactNode;
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
