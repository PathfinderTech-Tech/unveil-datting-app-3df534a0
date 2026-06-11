import { createStripeClient } from "../src/lib/stripe.server";
const stripe = createStripeClient("live");
// Detach old lookup_key first so we can reassign
await stripe.prices.update("price_1Te9HEHf3gYicX76NebsYdzf", { lookup_key: "premium_quarterly_legacy_4999" } as any).catch(e=>console.log("legacy update:", e.message));
const created = await stripe.prices.create({
  product: "prod_UdQ7puaj1mqoYZ",
  unit_amount: 3999,
  currency: "usd",
  lookup_key: "premium_quarterly",
  transfer_lookup_key: true,
  nickname: "UNVEIL Premium 3 Months",
} as any);
console.log("CREATED:", created.id, created.unit_amount, "lookup=", created.lookup_key);
