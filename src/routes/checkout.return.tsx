import { createFileRoute, Link } from "@tanstack/react-router";
import { UnveilNav } from "@/components/UnveilNav";
import { Check } from "lucide-react";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({ meta: [{ title: "Payment Complete — UNVEIL" }] }),
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  return (
    <div className="min-h-screen">
      <UnveilNav />
      <section className="mx-auto max-w-2xl px-5 py-20 text-center">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-hero text-primary-foreground shadow-glow">
          <Check className="h-7 w-7" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-light">You're all set</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          {session_id
            ? "Your purchase is confirmed. Premium benefits and your Verified badge (if purchased) are now active."
            : "Welcome to UNVEIL."}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/matches" className="rounded-full bg-gradient-hero px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow">
            Discover matches
          </Link>
          <Link to="/manage-subscription" className="rounded-full border border-border bg-surface px-6 py-3 text-sm hover:bg-surface-2">
            Manage subscription
          </Link>
        </div>
      </section>
    </div>
  );
}
