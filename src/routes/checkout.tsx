import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UnveilNav } from "@/components/UnveilNav";

import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { isStripeConfigured } from "@/lib/stripe";
import { getPlatform, isNative } from "@/lib/platform";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Lock, ArrowLeft } from "lucide-react";

type Product = "premium" | "premium_monthly" | "premium_quarterly" | "premium_annual" | "premium_yearly" | "message_pass" | "message_pass_24h" | "message_pass_2w" | "pass_24h" | "pass_2w";
type Search = { product?: Product; returnTo?: string };

const ALLOWED_PRODUCTS: Product[] = ["premium", "premium_monthly", "premium_quarterly", "premium_annual", "premium_yearly", "message_pass", "message_pass_24h", "message_pass_2w", "pass_24h", "pass_2w"];

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

// Display labels intentionally OMIT the price — Stripe Checkout shows the
// authoritative amount (including any applicable tax) inside the embedded
// form, so duplicating a base price here causes confusing mismatches like
// "$1.99" in the title vs "$2.20" in checkout.
const PRICE_LABEL: Record<string, string> = {
  premium_monthly: "UNVEIL Premium — Monthly",
  premium_quarterly: "UNVEIL Premium — 3 Months",
  premium_annual: "UNVEIL Premium — Annual",
  message_pass_24h: "UNVEIL 24-Hour Unlimited Pass",
  message_pass_2w: "UNVEIL 2-Week Unlimited Pass",
};

function priceIdFor(product: Product): string {
  if (product === "message_pass" || product === "message_pass_24h" || product === "pass_24h") return "message_pass_24h";
  if (product === "message_pass_2w" || product === "pass_2w") return "message_pass_2w";
  if (product === "premium_quarterly") return "premium_quarterly";
  if (product === "premium_annual" || product === "premium_yearly") return "premium_annual";
  return "premium_monthly";
}

function returnProductFor(product: Product): string {
  if (product === "message_pass" || product === "message_pass_24h" || product === "pass_24h") return "message_pass";
  if (product === "message_pass_2w" || product === "pass_2w") return "message_pass_2w";
  if (product === "premium_quarterly") return "premium_quarterly";
  if (product === "premium_annual" || product === "premium_yearly") return "premium_annual";
  return "premium";
}

function Checkout() {
  const { product, returnTo } = useSearch({ from: "/checkout" }) as Search;
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const [email, setEmail] = useState<string | undefined>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isNative()) {
      const platform = getPlatform() === "ios" ? "Apple" : "Google Play";
      toast.error(`Use ${platform} in-app purchase from the membership screen.`);
      navigate({ to: "/premium" });
      return;
    }
    const raw = new URLSearchParams(window.location.search).get("product");
    if (raw && !(ALLOWED_PRODUCTS as string[]).includes(raw)) {
      toast.error("This product is no longer available.");
      navigate({ to: returnTo?.startsWith("/chat") ? "/chat" : "/messages" });
    }
    // Persist the return destination so we can recover it on /checkout/return
    // even if Stripe drops the search param (some redirect paths strip it).
    // If no explicit returnTo was provided, fall back to the previous page
    // (document.referrer) so users land back where they triggered checkout.
    try {
      let dest = returnTo && returnTo.startsWith("/") ? returnTo : undefined;
      if (!dest && typeof document !== "undefined" && document.referrer) {
        try {
          const ref = new URL(document.referrer);
          if (ref.origin === window.location.origin) {
            const path = ref.pathname + ref.search;
            if (
              path.startsWith("/") &&
              !path.startsWith("/checkout") &&
              !path.startsWith("/login") &&
              !path.startsWith("/signup")
            ) {
              dest = path;
            }
          }
        } catch { /* ignore */ }
      }
      if (dest) localStorage.setItem("unveil:checkoutReturn", dest);
    } catch { /* ignore quota / privacy errors */ }
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
  const productKey = returnProductFor(product ?? "premium");
  const returnQp = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : "";
  const configured = isStripeConfigured();

  return (
    <div className="min-h-screen">
      
      <UnveilNav />
      <section className="mx-auto max-w-3xl px-5 py-10 md:py-14">
        <Link to="/premium" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to plans
        </Link>
        <div className="mt-6 text-center">
          <p className="font-mono text-xs uppercase tracking-luxury text-muted-foreground">Secure Checkout</p>
          <h1 className="mt-3 font-display text-2xl font-light sm:text-3xl md:text-4xl break-words">{PRICE_LABEL[priceId]}</h1>
          <p className="mx-auto mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Final price shown below · processed securely by Stripe
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
