import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { UnveilNav } from "@/components/UnveilNav";
import { VeilBackdrop } from "@/components/VeilBackdrop";
import { RestorePurchasesButton } from "@/components/RestorePurchasesButton";
import { Check, Sparkles, Heart, Shield, Zap, Clock } from "lucide-react";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "Membership — UNVEIL" },
      {
        name: "description",
        content:
          "UNVEIL Premium gives you unlimited messages, instant contact sharing, and deeper insights. Free plan available.",
      },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { returnTo?: string } => ({
    returnTo: typeof s.returnTo === "string" && s.returnTo.startsWith("/") ? s.returnTo : undefined,
  }),
  component: Membership,
});

const FREE_FEATURES = [
  "15 messages & voice notes per day",
  "Full profile creation",
  "Matching & discovery",
  "Compatibility insights",
  "Contact sharing on Day 7",
  "Safety reminders",
];

const PREMIUM_FEATURES = [
  "Unlimited messages & voice notes",
  "Instant contact sharing — no Day 7 wait",
  "Premium badge",
  "Priority discovery placement",
  "Premium compatibility insights",
  "Premium profile features",
];

type PlanKey = "premium" | "premium_quarterly" | "premium_annual";
const PLANS: { key: PlanKey; label: string; price: string; cadence: string; sub?: string; featured?: boolean }[] = [
  { key: "premium",           label: "Monthly",   price: "$15.99",  cadence: "/ month",    sub: "Billed monthly" },
  { key: "premium_quarterly", label: "3 Months",  price: "$39.99",  cadence: "/ 3 months", sub: "Save 17%", featured: true },
  { key: "premium_annual",    label: "Annual",    price: "$149.99", cadence: "/ year",     sub: "Save 22%, Best value" },
];

function Membership() {
  const navigate = useNavigate();
  const { returnTo } = Route.useSearch();
  const rt = returnTo && returnTo.startsWith("/") ? returnTo : undefined;
  const goPremium = (key: PlanKey) =>
    navigate({ to: "/checkout", search: { product: key, ...(rt ? { returnTo: rt } : {}) } as any });

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-6xl px-5 py-14 md:py-20">
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-luxury text-muted-foreground">Membership</p>
          <h1 className="mt-4 font-display text-4xl font-light leading-tight md:text-6xl">
            Choose how you want to <span className="text-gradient-aura italic">discover</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-foreground/80 md:text-lg">
            Unlock unlimited daily messages, instant contact sharing, and a deeper experience. Free plan available.
          </p>
        </div>

        {/* 1. Two-Week Pass */}
        <div className="mt-12">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col justify-between rounded-3xl border-2 border-primary/60 bg-primary/10 p-6 shadow-glow md:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/25 text-primary">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-luxury text-foreground/70">Most popular pass</div>
                  <h3 className="mt-1 font-display text-2xl font-medium text-foreground">2-Week Unlimited Pass</h3>
                  <p className="mt-1.5 max-w-md text-sm text-foreground/80">
                    Unlimited messaging for a full 14 days. Perfect for diving deep without a subscription.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <div>
                  <div className="font-display text-3xl font-semibold text-foreground">$9.99</div>
                  <div className="text-[11px] font-medium uppercase tracking-luxury text-foreground/70">One-time purchase</div>
                </div>
                <Link
                  to="/checkout"
                  search={{ product: "message_pass_2w", ...(rt ? { returnTo: rt } : {}) } as any}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-hero px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow"
                >
                  Get 2-Week Pass
                </Link>
              </div>
            </div>

            {/* 2. 24h Pass */}
            <div className="flex flex-col justify-between rounded-3xl border border-accent/50 bg-accent/10 p-6 md:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/25 text-accent">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display text-2xl font-medium text-foreground">24-Hour Unlimited Pass</h3>
                  <p className="mt-1.5 max-w-md text-sm text-foreground/80">
                    Unlimited messaging for the next 24 hours. Try the full experience risk-free.
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <div>
                  <div className="font-display text-3xl font-semibold text-foreground">$1.99</div>
                  <div className="text-[11px] font-medium uppercase tracking-luxury text-foreground/70">One-time purchase</div>
                </div>
                <Link
                  to="/checkout"
                  search={{ product: "message_pass" } as any}
                  className="inline-flex items-center justify-center rounded-full border-2 border-accent bg-accent/20 px-6 py-3 text-sm font-semibold text-accent hover:bg-accent/30"
                >
                  Get 24-Hour Pass
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Premium feature summary */}
        <div className="mt-12 relative flex flex-col overflow-hidden rounded-3xl border-2 border-primary bg-card p-7 shadow-glow md:p-9">
          <VeilBackdrop variant="corner" opacity={0.09} />
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-aura text-primary-foreground">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="font-display text-3xl font-medium text-foreground">UNVEIL Premium</div>
          <p className="mt-2 max-w-2xl text-base text-foreground/85">
            For users who want unlimited daily messages, immediate contact sharing, and a deeper experience.
          </p>
          <ul className="mt-6 grid gap-2.5 text-[15px] md:grid-cols-2">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" />
                <span className="font-medium text-foreground/95">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 3-5. Premium subscription tiers */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.key}
              className={`relative flex flex-col rounded-3xl border-2 ${p.featured ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-card"} p-6`}
            >
              {p.featured && (
                <div className="absolute -top-3 left-6 rounded-full bg-gradient-hero px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-luxury text-primary-foreground shadow-glow">
                  Most chosen
                </div>
              )}
              <div className="font-mono text-[11px] font-semibold uppercase tracking-luxury text-foreground/80">{p.label}</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-4xl font-semibold text-foreground">{p.price}</span>
                <span className="text-sm font-medium text-foreground/75">{p.cadence}</span>
              </div>
              {p.sub && <div className="mt-1 text-sm font-medium text-foreground/75">{p.sub}</div>}
              <button
                onClick={() => goPremium(p.key)}
                className={`mt-6 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold ${p.featured ? "bg-gradient-hero text-primary-foreground shadow-glow" : "border-2 border-border bg-surface text-foreground hover:bg-surface-2"}`}
              >
                Choose {p.label}
              </button>
            </div>
          ))}
        </div>

        {/* 6. Free plan — at the bottom */}
        <div className="mt-12">
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-luxury text-muted-foreground">Or start free</p>
            <h2 className="mt-3 font-display text-2xl font-light">Free Plan</h2>
          </div>
          <div className="mt-6 rounded-3xl border border-border bg-card p-7 md:p-9">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-accent">
                  <Heart className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-display text-2xl font-medium text-foreground">Free</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-display text-3xl font-semibold text-foreground">$0</span>
                    <span className="text-sm font-medium text-foreground/75">/ forever</span>
                  </div>
                </div>
              </div>
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-full border-2 border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground hover:bg-surface-2"
              >
                Continue Free
              </Link>
            </div>
            <ul className="mt-5 grid gap-2 md:grid-cols-2">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                  <span className="font-medium text-foreground/90">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-luxury text-foreground/80">
              <Shield className="h-3.5 w-3.5 text-accent" /> No traps
            </div>
            <p className="mt-2 text-sm font-medium text-foreground/90">
              Cancel your membership anytime — no forced commitments, no confusing plans.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-luxury text-foreground/80">
              <Shield className="h-3.5 w-3.5 text-accent" /> Refunds
            </div>
            <p className="mt-2 text-sm font-medium text-foreground/90">
              Membership purchases are non-refundable except where required by law.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs italic text-foreground/75">
          Cancel anytime from your account. Tax calculated at checkout.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-center">
          <Link
            to="/manage-subscription"
            className="text-sm font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
          >
            Manage subscription
          </Link>
          <RestorePurchasesButton />
        </div>
      </section>
    </div>
  );
}
