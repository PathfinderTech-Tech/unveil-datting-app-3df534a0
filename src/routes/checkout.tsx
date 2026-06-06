import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { isStripeConfigured } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, ArrowLeft } from "lucide-react";

type Product = "premium" | "premium_quarterly" | "premium_annual" | "message_pass";
type Search = { product?: Product; returnTo?: string };

const ALLOWED_PRODUCTS: Product[] = ["premium", "premium_quarterly", "premium_annual", "message_pass"];

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — UNVEIL" }] }),
  validateSearch: (s: Record<string, unknown>): Search => {
    const raw = s.product as string | undefined;
    const product = (ALLOWED_PRODUCTS as string[]).includes(raw ?? "")
      ? (raw as Product)
      : "premium";
    const rt = typeof s.returnTo === "string" && s.returnTo.startsWith("/") ? s.returnTo : undefined;
    return { product, returnTo: rt };
  },
  component: Checkout,
});

const PRICE_LABEL: Record<string, string> = {
  premium_monthly: "UNVEIL Premium — $15.99 / month",
  premium_quarterly: "UNVEIL Premium — $39.99 every 3 months",
  premium_annual: "UNVEIL Premium — $149.99 / year",
  message_pass_24h: "UNVEIL 24-Hour Unlimited Pass — $1.99",
};

function priceIdFor(product: Product): string {
  if (product === "message_pass") return "message_pass_24h";
  if (product === "premium_quarterly") return "premium_quarterly";
  if (product === "premium_annual") return "premium_annual";
  return "premium_monthly";
}

function Checkout() {
  const { product, returnTo } = useSearch({ from: "/checkout" }) as Search;
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [email, setEmail] = useState<string | undefined>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("product");
    if (raw && !(ALLOWED_PRODUCTS as string[]).includes(raw)) {
      toast.error("This product is no longer available.");
      navigate({ to: returnTo?.startsWith("/chat") ? "/chat" : "/messages" });
    }
  }, [navigate, returnTo]);

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

  const priceId = priceIdFor(product ?? "premium");
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
              returnUrl={`${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&product=${productKey}${returnQp}`}
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
