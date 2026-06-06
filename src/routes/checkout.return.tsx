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

  useEffect(() => {
    if (!session_id) return;
    if (product) toast.success(SUCCESS_BANNER[product]);
    if (returnTo) {
      const t = setTimeout(() => { window.location.replace(returnTo); }, 800);
      return () => clearTimeout(t);
    }
  }, [session_id, product, returnTo, navigate]);

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
        {returnTo ? (
          <p className="mt-4 text-xs text-muted-foreground">Returning you to your conversation…</p>
        ) : (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/matches" className="rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow">
              Discover matches
            </Link>
            <Link to="/chat" className="rounded-full border border-border bg-surface px-6 py-3 text-sm hover:bg-surface-2">
              Open messages
            </Link>
            <Link to="/manage-subscription" className="rounded-full border border-border bg-surface px-6 py-3 text-sm hover:bg-surface-2">
              Manage subscription
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
