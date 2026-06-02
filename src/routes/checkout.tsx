import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { Apple, CreditCard, Lock, Check, Smartphone } from "lucide-react";

type Search = { product?: "premium" | "verified"; plan?: "1" | "3" | "6" | "12" };

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — UNVEIL" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    product: (s.product as Search["product"]) ?? "premium",
    plan: (s.plan as Search["plan"]) ?? "3",
  }),
  component: Checkout,
});

const PRICES = {
  "1": { label: "1 Month", price: "$19.99" },
  "3": { label: "3 Months", price: "$49.99" },
  "6": { label: "6 Months", price: "$89.99" },
  "12": { label: "12 Months", price: "$149.99" },
} as const;

function Checkout() {
  const { product, plan } = useSearch({ from: "/checkout" }) as Search;
  const [method, setMethod] = useState<"card" | "apple" | "google">("card");
  const [done, setDone] = useState(false);

  const isPremium = product === "premium";
  const planKey = (plan ?? "3") as keyof typeof PRICES;
  const line = isPremium
    ? { name: `UNVEIL Premium · ${PRICES[planKey].label}`, price: PRICES[planKey].price }
    : { name: "Verified Profile (one-time)", price: "$9.99" };

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-5xl px-5 py-14 md:py-20">
        <div className="mb-8 text-center">
          <p className="font-mono text-xs uppercase tracking-luxury text-muted-foreground">Checkout</p>
          <h1 className="mt-3 font-display text-4xl font-light md:text-5xl">Complete your purchase</h1>
        </div>

        {done ? (
          <div className="rounded-3xl border border-primary bg-card p-10 text-center shadow-glow">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground">
              <Check className="h-6 w-6" />
            </div>
            <h2 className="mt-5 font-display text-3xl">You're all set</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              {isPremium
                ? "Welcome to UNVEIL Premium. Your deeper insights are now active."
                : "Verification submitted. We'll review and activate your badge within 24 hours."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/matches"
                className="rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow"
              >
                Continue
              </Link>
              <Link
                to="/manage-subscription"
                className="rounded-full border border-border bg-surface px-6 py-3 text-sm hover:bg-surface-2"
              >
                Manage subscription
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            {/* Payment */}
            <div className="rounded-3xl border border-border bg-card p-7">
              <h2 className="font-display text-2xl font-light">Payment method</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Stripe-ready checkout. Pay securely with card or wallet.
              </p>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <Method active={method === "card"} onClick={() => setMethod("card")} icon={<CreditCard className="h-4 w-4" />}>
                  Card
                </Method>
                <Method active={method === "apple"} onClick={() => setMethod("apple")} icon={<Apple className="h-4 w-4" />}>
                  Apple Pay
                </Method>
                <Method active={method === "google"} onClick={() => setMethod("google")} icon={<Smartphone className="h-4 w-4" />}>
                  Google Pay
                </Method>
              </div>

              {method === "card" ? (
                <div className="mt-6 space-y-3">
                  <Field label="Cardholder name" placeholder="Full name" />
                  <Field label="Card number" placeholder="1234 1234 1234 1234" />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Expiry" placeholder="MM / YY" />
                    <Field label="CVC" placeholder="123" />
                  </div>
                  <Field label="ZIP / Postal" placeholder="10001" />
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted-foreground">
                  {method === "apple" ? "Apple Pay" : "Google Pay"} button will appear here when configured.
                </div>
              )}

              <button
                onClick={() => setDone(true)}
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-hero px-5 py-3.5 text-sm font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.01]"
              >
                <Lock className="h-4 w-4" /> Pay {line.price}
              </button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                Payments are non-refundable except where required by law.
              </p>
            </div>

            {/* Summary */}
            <div className="rounded-3xl border border-border bg-card p-7">
              <h2 className="font-display text-2xl font-light">Order summary</h2>
              <div className="mt-5 flex items-start justify-between rounded-2xl bg-surface p-4">
                <div>
                  <div className="text-sm font-medium">{line.name}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {isPremium ? "Auto-renew off · cancel anytime" : "One-time charge"}
                  </div>
                </div>
                <div className="font-display text-xl">{line.price}</div>
              </div>
              <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                <Row label="Subtotal" value={line.price} />
                <Row label="Tax" value="—" sub />
                <Row label="Total" value={line.price} bold />
              </div>
              <p className="mt-5 text-[11px] text-muted-foreground">
                No fake urgency. No countdown. You can continue using UNVEIL for free at any time.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Method({ active, onClick, icon, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-xs font-medium transition-all ${
        active ? "border-primary bg-gradient-hero text-primary-foreground shadow-glow" : "border-border bg-surface hover:bg-surface-2"
      }`}
    >
      {icon} {children}
    </button>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-luxury text-muted-foreground">{label}</span>
      <input
        placeholder={placeholder}
        className="mt-1 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function Row({ label, value, bold, sub }: { label: string; value: string; bold?: boolean; sub?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-semibold" : sub ? "text-xs text-muted-foreground" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
