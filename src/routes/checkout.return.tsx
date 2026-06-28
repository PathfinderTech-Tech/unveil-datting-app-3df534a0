import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UnveilNav } from "@/components/UnveilNav";
import { Check } from "lucide-react";
import PremiumSuccessOverlay from "@/components/PremiumSuccessOverlay";

type ProductKey = "premium" | "premium_quarterly" | "premium_annual" | "message_pass" | "message_pass_2w";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({ meta: [{ title: "Payment Complete — UNVEIL" }] }),
  validateSearch: (s: Record<string, unknown>): { session_id?: string; product?: ProductKey; returnTo?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
    product: (["premium","premium_quarterly","premium_annual","message_pass","message_pass_2w"].includes(s.product as string))
      ? (s.product as ProductKey) : undefined,
    returnTo: typeof s.returnTo === "string" && s.returnTo.startsWith("/") ? s.returnTo : undefined,
  }),
  component: CheckoutReturn,
});

const SUCCESS_BANNER: Record<ProductKey, string> = {
  message_pass: "Your 24-Hour Pass is now active.",
  message_pass_2w: "Your 2-Week Pass is now active.",
  premium: "Your Premium membership is now active.",
  premium_quarterly: "Your Premium membership is now active.",
  premium_annual: "Your Premium membership is now active.",
};

function destinationLabel(dest: string): string {
  if (dest.startsWith("/chat")) return "Returning you to your conversation…";
  if (dest.startsWith("/match")) return "Returning you to the match…";
  if (dest.startsWith("/messages")) return "Returning you to your messages…";
  if (dest.startsWith("/profile")) return "Returning you to your profile…";
  if (dest.startsWith("/passport")) return "Returning you to your passport…";
  if (dest.startsWith("/premium") || dest.startsWith("/manage-subscription"))
    return "Returning you to membership…";
  return "Returning you to where you left off…";
}

function CheckoutReturn() {
  const { session_id, product, returnTo } = Route.useSearch() as { session_id?: string; product?: ProductKey; returnTo?: string };
  const navigate = useNavigate();
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayDone, setOverlayDone] = useState(false);

  // Recover returnTo from localStorage if Stripe dropped the search param.
  let effectiveReturnTo: string | undefined = returnTo;
  if (!effectiveReturnTo) {
    try {
      const saved = localStorage.getItem("unveil:checkoutReturn");
      if (saved && saved.startsWith("/")) effectiveReturnTo = saved;
    } catch { /* ignore */ }
  }

  // Fallback: messages for pass purchases, membership otherwise.
  const fallback =
    product === "message_pass" || product === "message_pass_2w"
      ? "/messages"
      : "/premium";
  const dest = effectiveReturnTo ?? fallback;

  // Show premium success overlay on valid purchases.
  useEffect(() => {
    if (session_id && product) {
      setShowOverlay(true);
      toast.success(SUCCESS_BANNER[product]);
    }
    try { localStorage.removeItem("unveil:checkoutReturn"); } catch { /* ignore */ }
  }, [session_id, product]);

  // Hard fallback: regardless of overlay state, redirect after 2.2s.
  // The overlay's onComplete may not fire reliably in throttled tabs or
  // when the user backgrounds the WebView during checkout.
  useEffect(() => {
    if (!session_id) return;
    const hard = setTimeout(() => {
      try { window.location.replace(dest); } catch { window.location.href = dest; }
    }, 2200);
    return () => clearTimeout(hard);
  }, [session_id, dest]);

  // Redirect after overlay completes (faster path when it does fire).
  useEffect(() => {
    if (!overlayDone) return;
    try { window.location.replace(dest); } catch { window.location.href = dest; }
  }, [overlayDone, dest, navigate]);

  const message = session_id
    ? (product ? SUCCESS_BANNER[product] : "Your purchase is confirmed.")
    : "Welcome to UNVEIL.";

  return (
    <div className="min-h-screen">
      {showOverlay && product && !overlayDone && (
        <PremiumSuccessOverlay
          product={product}
          duration={2000}
          onComplete={() => setOverlayDone(true)}
        />
      )}
      <UnveilNav />
      <section className="mx-auto max-w-2xl px-5 py-20 text-center">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground shadow-glow">
          <Check className="h-7 w-7" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-light">Thank you for your payment</h1>
        <p className="mx-auto mt-3 max-w-md text-base text-foreground/85">{message}</p>
        <p className="mt-6 text-xs text-muted-foreground">{destinationLabel(dest)}</p>
        <button
          onClick={() => window.location.replace(dest)}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-hero px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow"
        >
          Continue now
        </button>
      </section>
    </div>
  );
}
