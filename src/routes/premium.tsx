import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { Check, Sparkles, Heart, Shield } from "lucide-react";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "Membership — UNVEIL" },
      { name: "description", content: "UNVEIL is free to use. Premium gives you deeper insights and a richer connection experience." },
    ],
  }),
  component: Membership,
});

type Plan = "1" | "3" | "6" | "12";
const PRICES: Record<Plan, { price: string; label: string; perMonth?: string }> = {
  "1":  { price: "$19.99", label: "1 Month" },
  "3":  { price: "$49.99", label: "3 Months", perMonth: "$16.66/mo" },
  "6":  { price: "$89.99", label: "6 Months", perMonth: "$15.00/mo" },
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
];

function Membership() {
  const [plan, setPlan] = useState<Plan>("3");
  const selected = PRICES[plan];

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        {/* Hero */}
        <div className="text-center">
          <p className="font-mono text-xs uppercase tracking-luxury text-muted-foreground">Membership</p>
          <h1 className="mt-4 font-display text-4xl font-light leading-tight md:text-6xl">
            Choose how you want to <span className="text-gradient-aura italic">discover</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            UNVEIL is free to use. Premium gives you deeper insights, more personalization,
            and a richer connection experience.
          </p>
        </div>

        {/* Plan cards */}
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {/* FREE */}
          <div className="relative flex flex-col rounded-3xl border border-border bg-card p-7 md:p-9">
            <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-accent">
              <Heart className="h-5 w-5" />
            </div>
            <div className="font-display text-2xl font-light">Free</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-5xl">$0</span>
              <span className="text-sm text-muted-foreground">/ forever</span>
            </div>
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              Everything you need to meet, connect, and build something meaningful.
            </p>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                  <span className="text-foreground/85">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/signup"
              className="mt-8 inline-flex items-center justify-center rounded-full border border-border bg-surface px-5 py-3 text-sm font-medium hover:bg-surface-2"
            >
              Continue Free
            </Link>
          </div>

          {/* PREMIUM */}
          <div className="relative flex flex-col rounded-3xl border border-primary bg-card p-7 shadow-glow md:p-9">
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

            {/* Duration selector */}
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

            <ul className="mt-6 flex-1 space-y-2.5 text-sm">
              {PREMIUM_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                  <span className="text-foreground/85">{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => alert("Stripe checkout coming soon")}
                className="inline-flex items-center justify-center rounded-full bg-gradient-hero px-5 py-3 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
              >
                Upgrade to Premium
              </button>
              <button
                onClick={() => alert("App Store / Google Play checkout coming soon")}
                className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-5 py-3 text-sm font-medium hover:bg-surface-2"
              >
                Pay via App Store
              </button>
            </div>

            <p className="mt-4 text-xs italic text-foreground/70">
              Premium helps you discover more. It does not decide whether you can connect.
            </p>
          </div>
        </div>

        {/* Notices */}
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-accent" /> No traps
            </div>
            <p className="mt-2 text-sm text-foreground/85">
              Memberships do not trap users. When your membership ends, you can renew for 1, 3, 6,
              or 12 months — or continue with the free version.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-accent" /> Refunds
            </div>
            <p className="mt-2 text-sm text-foreground/85">
              Payments are non-refundable except where required by law.
            </p>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          You can continue using UNVEIL for free at any time.
        </p>
      </section>
    </div>
  );
}
