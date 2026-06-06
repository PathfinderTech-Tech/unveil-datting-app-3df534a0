import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { isStripeConfigured } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { Lock, ArrowLeft } from "lucide-react";

type Search = {
  product?: "premium" | "verified" | "message_pass";
  plan?: "1" | "3" | "6" | "12";
  returnTo?: string;
};

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — UNVEIL" }] }),
  validateSearch: (s: Record<string, unknown>): Search => {
    const product = (s.product as Search["product"]) ?? "premium";
    // For one-off products we don't need a plan; default subscription plan = monthly ($19.99).
    const plan = (s.plan as Search["plan"]) ?? "1";
    const rt = typeof s.returnTo === "string" && s.returnTo.startsWith("/") ? s.returnTo : undefined;
    return { product, plan, returnTo: rt };
  },
  component: Checkout,
});

const PRICE_LABEL: Record<string, string> = {
  premium_monthly: "UNVEIL Premium · 1 Month — $19.99 / mo",
  premium_quarterly: "UNVEIL Premium · 3 Months — $49.99",
  premium_semiannual: "UNVEIL Premium · 6 Months — $89.99",
  premium_yearly: "UNVEIL Premium · 12 Months — $149.99 / yr",
  verified_badge_onetime: "UNVEIL Verified Badge — $9.99 (one-time)",
  message_pass_24h: "UNVEIL Daily Message Pass — $1.99 (24 hours)",
};

function priceIdFor(product: string, plan: string): string {
  if (product === "verified") return "verified_badge_onetime";
  if (product === "message_pass") return "message_pass_24h";
  if (plan === "1") return "premium_monthly";
  if (plan === "3") return "premium_quarterly";
  if (plan === "6") return "premium_semiannual";
  if (plan === "12") return "premium_yearly";
  return "premium_quarterly";
}

function Checkout() {
  const { product, plan, returnTo } = useSearch({ from: "/checkout" }) as Search;
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [email, setEmail] = useState<string | undefined>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate({ to: "/login", search: { redirect: "/checkout" } as any });
        return;
      }
      setUserId(data.user.id);
      setEmail(data.user.email ?? undefined);
      setReady(true);
    });
  }, [navigate]);

  const priceId = priceIdFor(product ?? "premium", plan ?? "1");
  const productKey = product ?? "premium";
  const returnQp = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : "";
  const configured = isStripeConfigured();

  return (
    <div className="min-h-screen">
      <PaymentTestModeBanner />
      <UnveilNav />
      <section className="mx-auto max-w-3xl px-5 py-10 md:py-14">
        <Link to="/premium" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to plans
        </Link>
        <div className="mt-6 text-center">
          <p className="font-mono text-xs uppercase tracking-luxury text-muted-foreground">Secure Checkout</p>
          <h1 className="mt-3 font-display text-3xl font-light md:text-4xl">{PRICE_LABEL[priceId]}</h1>
          <p className="mx-auto mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Payments processed securely by Stripe
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-border bg-card p-2 md:p-4">
          {!configured ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Payments are not yet configured for this environment.
            </div>
          ) : !ready ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Preparing checkout…</div>
          ) : (
            <StripeEmbeddedCheckout
              priceId={priceId}
              customerEmail={email}
              userId={userId}
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`}
            />
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Payments are non-refundable except where required by law.
        </p>
      </section>
    </div>
  );
}
