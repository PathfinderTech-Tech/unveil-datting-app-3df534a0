# 11. Subscription Logic

## Source of truth

`profiles.subscription_tier` (`free` | `premium`) and `profiles.premium_until` (timestamptz).

A user is treated as **premium** when:
```
subscription_tier = 'premium' AND (premium_until IS NULL OR premium_until > now())
```

`profiles.message_pass_until` is a separate, additive flag for one-time 24-hour passes.

## Helper

`user_has_unlimited_messaging(uid)`:
```sql
SELECT (subscription_tier = 'premium' AND (premium_until IS NULL OR premium_until > now()))
    OR (message_pass_until IS NOT NULL AND message_pass_until > now())
FROM profiles WHERE id = uid;
```

## Premium unlocks

| Feature | Gating |
|---|---|
| Unlimited messaging | `user_has_unlimited_messaging` |
| Early contact sharing (skip 7-day wait) | `can_share_contacts` checks `subscription_tier='premium'` on either side |
| Insights+ | `InsightsPlusPaywall` → `subscription_tier='premium'` |
| Priority discovery placement | `matching-api.ts` adds a small score multiplier for premium candidates |
| No daily limit on swipes / hidden match reveal | Read from `subscription_tier` client-side, re-enforced server-side |

## Client hook

`use-subscription.ts` exposes:
```ts
{ tier: 'free' | 'premium',
  isPremium: boolean,
  premiumUntil: Date | null,
  messagePassUntil: Date | null,
  loading }
```
It subscribes to realtime updates on the user's `profiles` row so the UI flips immediately after webhook processing without a manual refresh.

## Lifecycle

- **Activate**: webhook `checkout.session.completed` → set tier + `premium_until = current_period_end`.
- **Renew**: webhook `invoice.paid` → extend `premium_until`.
- **Cancel** (user, end of period): subscription remains active until `premium_until`; downgrade happens lazily — `user_has_unlimited_messaging` returns false the moment `premium_until` passes.
- **Hard cancel** (`customer.subscription.deleted`): same lazy downgrade.
- **Payment failure**: subscription enters `past_due` in Stripe; we keep premium until grace period ends.

## Refunds

`/refund` route documents policy. Refunds are issued via Stripe Dashboard; the `customer.subscription.updated` / `charge.refunded` webhook syncs status back.
