// TEMPORARY one-shot route to create the live $39.99 quarterly price.
// DELETE this file immediately after invocation. Do not publish.
import { createFileRoute } from "@tanstack/react-router";
import { createStripeClient } from "@/lib/stripe.server";

export const Route = createFileRoute("/api/public/_create-quarterly-live-price")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const stripe = createStripeClient("live");
          const price = await stripe.prices.create({
            product: "prod_UdQ7puaj1mqoYZ", // UNVEIL Premium — 3 Months (live)
            unit_amount: 3999,
            currency: "usd",
            recurring: { interval: "month", interval_count: 3 },
            nickname: "Premium — 3 Months ($39.99)",
            tax_behavior: "exclusive",
          });
          return new Response(
            JSON.stringify({
              ok: true,
              price_id: price.id,
              amount: price.unit_amount,
              interval: price.recurring?.interval,
              interval_count: price.recurring?.interval_count,
              product: price.product,
            }),
            { headers: { "content-type": "application/json" } },
          );
        } catch (err: any) {
          return new Response(
            JSON.stringify({ ok: false, error: err?.message ?? String(err) }),
            { status: 500, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
