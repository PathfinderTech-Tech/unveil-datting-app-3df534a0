import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { UnveilNav } from "@/components/UnveilNav";
import { Check } from "lucide-react";

type ProductKey = "premium" | "premium_quarterly" | "premium_annual" | "message_pass";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({ meta: [{ title: "Payment Complete — UNVEIL" }] }),
  validateSearch: (s: Record<string, unknown>): { session_id?: string; product?: ProductKey; returnTo?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
    product: (["premium","premium_quarterly","premium_annual","message_pass"].includes(s.product as string))
      ? (s.product as ProductKey) : undefined,
    returnTo: typeof s.returnTo === "string" && s.returnTo.startsWith("/") ? s.returnTo : undefined,
  }),
  component: CheckoutReturn,
});

const SUCCESS_BANNER: Record<ProductKey, string> = {
  message_pass: "Daily Pass active — unlimited messaging for 24 hours.",
  premium: "Premium membership activated.",
  premium_quarterly: "Premium membership activated.",
  premium_annual: "Premium membership activated.",
};

function CheckoutReturn() {
  const { session_id, product, returnTo } = Route.useSearch() as { session_id?: string; product?: ProductKey; returnTo?: string };
  const navigate = useNavigate();

  // Recover returnTo from localStorage if Stripe dropped the search param.
  let effectiveReturnTo: string | undefined = returnTo;
  if (!effectiveReturnTo) {
    try {
      const saved = localStorage.getItem("unveil:checkoutReturn");
      if (saved && saved.startsWith("/")) effectiveReturnTo = saved;
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (session_id && product) toast.success(SUCCESS_BANNER[product]);
    // Always clear the saved checkout-return state once we land here.
    try { localStorage.removeItem("unveil:checkoutReturn"); } catch { /* ignore */ }
    // Return the user to wherever they came from (e.g. /chat?c=ID) — even if
    // Stripe dropped session_id from the URL. Fall back to /messages so we
    // never strand them on checkout / home / blank pages.
    const dest = effectiveReturnTo ?? "/messages";
    const t = setTimeout(() => { window.location.replace(dest); }, 800);
    return () => clearTimeout(t);
  }, [session_id, product, effectiveReturnTo, navigate]);

  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-2xl px-5 py-20 text-center">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground shadow-glow">
          <Check className="h-7 w-7" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-light">You're all set</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          {session_id ? (product ? SUCCESS_BANNER[product] : "Your purchase is confirmed.") : "Welcome to UNVEIL."}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          {effectiveReturnTo?.startsWith("/chat") ? "Returning you to your conversation…" : "Returning you to messages…"}
        </p>
      </section>
    </div>
  );
}
