import { createStripeClient } from "../src/lib/stripe.server";
const stripe = createStripeClient("live");
const prod = "prod_UdQ7puaj1mqoYZ";
const prices = await stripe.prices.list({ product: prod, active: true, limit: 20 });
for (const p of prices.data) {
  console.log(p.id, p.unit_amount, p.currency, p.recurring?.interval, p.recurring?.interval_count, "lookup=", p.lookup_key, "nick=", p.nickname);
}
