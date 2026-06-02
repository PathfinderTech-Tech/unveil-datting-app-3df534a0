import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { CreditCard, Sparkles, RefreshCw, X, Calendar } from "lucide-react";

export const Route = createFileRoute("/manage-subscription")({
  head: () => ({ meta: [{ title: "Manage Subscription — UNVEIL" }] }),
  component: Manage,
});

type Plan = "1" | "3" | "6" | "12";
const PRICES: Record<Plan, string> = {
  "1": "$19.99",
  "3": "$49.99",
  "6": "$89.99",
  "12": "$149.99",
};

function Manage() {
  // Demo state — would come from backend in production.
  const [tier, setTier] = useState<"free" | "premium">("premium");
  const [verified] = useState(true);
  const [renewPlan, setRenewPlan] = useState<Plan>("3");

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-4xl px-5 py-14 md:py-20">
        <div>
          <p className="font-mono text-xs uppercase tracking-luxury text-muted-foreground">Account</p>
          <h1 className="mt-3 font-display text-4xl font-light md:text-5xl">Manage subscription</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            No traps. Renew on your terms, downgrade to free at any time, or get verified.
          </p>
        </div>

        {/* Current status */}
        <div className="mt-8 rounded-3xl border border-primary bg-card p-7 shadow-glow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-aura text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </span>
                <h2 className="font-display text-2xl">
                  {tier === "premium" ? "UNVEIL Premium" : "Free Plan"}
                </h2>
                {verified && <VerifiedBadge size="sm" />}
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {tier === "premium" ? "Renews March 14, 2026" : "Free forever"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> Visa ···· 4242
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {tier === "premium" && (
                <button
                  onClick={() => setTier("free")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs hover:bg-surface-2"
                >
                  <X className="h-3.5 w-3.5" /> Cancel renewal
                </button>
              )}
              <Link
                to="/premium"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-hero px-4 py-2 text-xs font-medium text-primary-foreground shadow-glow"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Change plan
              </Link>
            </div>
          </div>
        </div>

        {/* Renew */}
        <div className="mt-6 rounded-3xl border border-border bg-card p-7">
          <h3 className="font-display text-xl">Renew or extend</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            When your membership ends, pick any term — or continue with free.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["1", "3", "6", "12"] as Plan[]).map((p) => {
              const active = renewPlan === p;
              return (
                <button
                  key={p}
                  onClick={() => setRenewPlan(p)}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    active
                      ? "border-primary bg-gradient-hero text-primary-foreground shadow-glow"
                      : "border-border bg-surface hover:bg-surface-2"
                  }`}
                >
                  <div className="text-[11px] opacity-80">{p} {p === "1" ? "Month" : "Months"}</div>
                  <div className="mt-1 font-display text-xl">{PRICES[p]}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/checkout"
              search={{ product: "premium", plan: renewPlan } as any}
              className="rounded-full bg-gradient-hero px-5 py-2.5 text-xs font-medium text-primary-foreground shadow-glow"
            >
              Renew {renewPlan} {renewPlan === "1" ? "month" : "months"}
            </Link>
            <button
              onClick={() => setTier("free")}
              className="rounded-full border border-border bg-surface px-5 py-2.5 text-xs hover:bg-surface-2"
            >
              Continue on Free
            </button>
          </div>
        </div>

        {/* Verified */}
        <div className="mt-6 rounded-3xl border border-border bg-card p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-xl">Verified Profile</h3>
                {verified && <VerifiedBadge size="sm" />}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {verified
                  ? "Your blue badge is active across the platform."
                  : "Get a blue badge across profiles, chat, search, and matches."}
              </p>
            </div>
            {!verified && (
              <Link
                to="/verify"
                className="rounded-full bg-gradient-hero px-5 py-2.5 text-xs font-medium text-primary-foreground shadow-glow"
              >
                Get verified · $9.99
              </Link>
            )}
          </div>
        </div>

        <p className="mt-10 text-center text-sm italic text-muted-foreground">
          Love should never feel trapped behind a paywall.
        </p>
      </section>
    </div>
  );
}
