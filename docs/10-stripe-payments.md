# 10. Stripe Payment System

## Products

| Product | Type | Unlocks |
|---|---|---|
| **UNVEIL Premium** | Recurring (monthly + yearly prices) | Unlimited messages, early contact sharing, insights+, priority discovery |
| **24-hour Message Pass** | One-time | Sets `profiles.message_pass_until = now() + 24h` |
| **Verified Badge boost** | One-time (legacy) | Sets `profiles.badge_paid = true` |

## Code layout

- `src/lib/stripe.ts` — public helpers (client-safe).
- `src/lib/stripe.server.ts` — server-only Stripe SDK init using `process.env.STRIPE_SECRET_KEY`.
- `src/lib/payments.functions.ts` — server fns: `createCheckoutSession`, `createCustomerPortalSession`, `getGoLiveStatus`.
- `src/components/StripeEmbeddedCheckout.tsx` — mounts Embedded Checkout.
- `src/routes/checkout.tsx`, `checkout.return.tsx`, `premium.tsx`, `manage-subscription.tsx`, `refund.tsx`.
- `src/routes/api/public/stripe-webhook.ts` — webhook endpoint (signature-verified).

## Checkout flow

1. User clicks "Get Premium" → `/premium`.
2. `createCheckoutSession` (protected server fn):
   - Reads `STRIPE_SECRET_KEY` inside `.handler()`.
   - Finds or creates a Stripe Customer for `auth.user.email`, persists `subscriptions.stripe_customer_id`.
   - Creates an Embedded Checkout Session with the chosen `price_id` and `return_url=/checkout/return?session_id={CHECKOUT_SESSION_ID}`.
3. `StripeEmbeddedCheckout` mounts the client secret.
4. On completion Stripe redirects to `/checkout/return`, which calls the webhook-fed `subscriptions` row to confirm activation; if the webhook is slow it polls briefly.

## Customer Portal

`/manage-subscription` calls `createCustomerPortalSession` and redirects to Stripe's hosted portal for cancel / change plan / update payment method / view invoices.

## Webhook (`/api/public/stripe-webhook`)

Verifies signature with `STRIPE_WEBHOOK_SECRET` then handles:

| Event | Action |
|---|---|
| `checkout.session.completed` | Upsert `subscriptions` row, set `profiles.subscription_tier='premium'`, set `premium_until = current_period_end`. For one-time pass: set `profiles.message_pass_until`. |
| `customer.subscription.updated` | Re-sync `premium_until`, `status`, `price_id`. |
| `customer.subscription.deleted` | Set `subscription_tier='free'` once `premium_until` passes; leave `premium_until` so we know last paid period. |
| `invoice.paid` | Extend `premium_until`. |
| `invoice.payment_failed` | Log to `failure_logs` (`category='stripe'`) + email user. |

All writes use the admin client (`supabaseAdmin`) — RLS bypassed because the signature has already authenticated the caller as Stripe.

## Go-live status

`getGoLiveStatus` returns a checklist (live keys present, webhook secret present, products exist, prices active) used by the admin dashboard to confirm production readiness.
