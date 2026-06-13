# 16. Final Launch Audit — UNVEIL

_Documentation-only audit. No code changes._
_Generated: 2026-06-05_

---

## 1. Stripe Implementation Audit

### 1.1 Products & price IDs

UNVEIL uses **human-readable lookup keys** (resolved via `stripe.prices.list({ lookup_keys })` in `createCheckoutSession`). These are stable across sandbox and live.

| Product | Kind | Price lookup key | Amount | Entitlement after purchase |
|---|---|---|---|---|
| **Verified Badge** | one-time | `verification_badge` | $9.99 | `profiles.badge_paid = true` → unlocks verification submission; on admin approval sets `profiles.verified = true` (15 msg/day + verified-only pool) |
| **24-hour Message Pass** | one-time | `message_pass_24h` | $1.99 | `profiles.message_pass_until = now() + 24h` → `user_has_unlimited_messaging()` returns true → unlimited messages for 24h |
| **Premium (monthly)** | recurring | `premium_monthly` | $15.99 / mo | `subscriptions.status = active`, `profiles.subscription_tier = 'premium'`, `profiles.premium_until = current_period_end` |
| **Premium (yearly)** | recurring | `premium_yearly` | $149.99 / yr | same as monthly, longer period |
| **2-Week Pass** | one-time | `message_pass_2w` | $9.99 | `profiles.message_pass_until = now() + 14d` → unlimited messaging + voice notes for 14d |

> Action item: confirm the four `lookup_key` values above exist in **both** Stripe sandbox **and** live via `payments--batch_create_product`. If a product is missing in live, checkout returns `Price not found` after go-live.

### 1.2 Webhook status

- **Endpoint:** `POST /api/public/payments/webhook?env={sandbox|live}` (`src/routes/api/public/payments/webhook.ts`)
- **Signature:** verified via `verifyWebhook()` using `PAYMENTS_SANDBOX_WEBHOOK_SECRET` / `PAYMENTS_LIVE_WEBHOOK_SECRET` (HMAC-SHA256, 5-min timestamp tolerance).
- **Events handled:**
  - `customer.subscription.created|updated|deleted` → upserts `subscriptions` + mirrors `premium_until` / `subscription_tier` onto `profiles`.
  - `checkout.session.completed` → branches on `metadata.kind`:
    - `verification_badge` → `verification_payments` row + `profiles.badge_paid = true`.
    - `premium_one_time` → extends `profiles.premium_until` by `metadata.durationDays`.
    - `message_pass_24h` → extends `profiles.message_pass_until` by `metadata.durationHours`.
  - All events also recorded in `transactions` table.
- **Idempotency:** `subscriptions` upserts on `stripe_subscription_id`; `verification_payments` upserts on `stripe_session_id`.

### 1.3 Success / failure URLs

Embedded Checkout uses `return_url`, not success/cancel URLs.

| Flow | `return_url` |
|---|---|
| All checkouts | `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}` |
| Failure | Stripe shows in-iframe error; user can retry without leaving page. |
| Customer Portal | `${origin}/manage-subscription` |

`/checkout/return` polls the `subscriptions` / `profiles` row for confirmation (webhook is source of truth).

### 1.4 Go-live status

Check via `payments--get_go_live_status`. Required env vars present:
- `STRIPE_SANDBOX_API_KEY` ✅
- `STRIPE_LIVE_API_KEY` — verify in Cloud → Secrets
- `PAYMENTS_SANDBOX_WEBHOOK_SECRET` ✅
- `PAYMENTS_LIVE_WEBHOOK_SECRET` — verify
- `.env.production` ships `VITE_PAYMENTS_CLIENT_TOKEN=pk_live_…` ✅

### 1.5 Entitlement summary

| Purchase | DB write | Gating function |
|---|---|---|
| Verified Badge | `profiles.badge_paid = true` | `VerificationGate` allows submission |
| Daily Pass | `profiles.message_pass_until` | `user_has_unlimited_messaging()` → `get_message_quota.unlimited` |
| Premium | `profiles.premium_until` + `subscription_tier='premium'` + `subscriptions` row | `useSubscription()`, `user_has_unlimited_messaging()`, `can_share_contacts()` |

---

## 2. Email Infrastructure Audit

### 2.1 Current state

| Item | Status |
|---|---|
| Provider | **None configured.** Supabase default sender (`noreply@mail.app.supabase.io`) is used for auth emails only. |
| Custom domain | Not provisioned. `unveil.best` is a custom app domain, not an email domain. |
| Transactional templates | **Not implemented.** No `src/lib/email-templates/` directory exists. |
| SPF | ❌ Not present for `unveil.best` |
| DKIM | ❌ Not present |
| DMARC | ❌ Not present |
| Auth email hook | Default Supabase templates only |

### 2.2 Required DNS records for `unveil.best`

Once Lovable Emails is enabled with the sender subdomain `notify.unveil.best`, the platform will write DKIM/SPF/MX/DMARC records into the delegated zone automatically. You only need to add **2 NS records** at your registrar (Cloudflare/Namecheap/etc):

```
notify.unveil.best.    NS    ns3.lovable.cloud.
notify.unveil.best.    NS    ns4.lovable.cloud.
```

For root-domain alignment (DMARC), also add at the **root**:

```
unveil.best.    TXT    "v=spf1 include:_spf.lovable.cloud ~all"
_dmarc.unveil.best.    TXT    "v=DMARC1; p=quarantine; rua=mailto:dmarc@unveil.best; adkim=r; aspf=r"
```

(SPF root record is optional if you only send from `notify.unveil.best`; DMARC at root is recommended.)

### 2.3 Required transactional templates (to build)

| Template name | Trigger | Variables |
|---|---|---|
| `welcome` | `auth.users` insert | `firstName`, `appUrl` |
| `verification-approved` | admin sets `profiles.verified = true` | `firstName` |
| `daily-pass-purchased` | webhook `message_pass_24h` paid | `firstName`, `expiresAt` |
| `premium-activated` | webhook `customer.subscription.created` | `firstName`, `plan`, `renewsAt` |
| `new-match` | new row in `matches` (both consented) | `firstName`, `matchName`, `matchUrl` |
| `new-message` | new `messages` row (throttle 1/hour) | `firstName`, `senderName`, `chatUrl` |
| `contact-sharing-unlocked` | both users called `consent_share_contact` | `firstName`, `matchName`, `contactUrl` |

> Build path (when ready): `email_domain--setup_email_infra` → `email_domain--scaffold_transactional_email` → create 7 `.tsx` templates in `src/lib/email-templates/` → register in `registry.ts` → wire triggers (DB triggers post to `/lovable/email/transactional/send` via server fns or Supabase webhooks).

---

## 3. Messaging System Audit

Source of truth: `public.get_message_quota()` + `public.user_has_unlimited_messaging()` + DB trigger `enforce_message_quota`.

| Tier | Detection | Daily limit | Test |
|---|---|---|---|
| Free | `verified=false` AND no `premium_until`/`message_pass_until` in future | 5 | ✅ Enforced by `_limit := CASE WHEN verified THEN 15 ELSE 5 END` + trigger |
| Verified | `profiles.verified = true` | 15 | ✅ Same path |
| Daily Pass | `profiles.message_pass_until > now()` | Unlimited (24h) | ✅ `_unlimited := user_has_unlimited_messaging()` → trigger bypass |
| Premium | `profiles.premium_until > now()` OR active subscription | Unlimited | ✅ Same path |

**Pass/fail:** ✅ **PASS** — quota logic is correct in DB; client (`src/routes/chat.tsx`) no longer blocks unverified users at composer (fix landed in earlier turn). Trigger `enforce_message_quota` is the enforcement point and respects all four tiers.

**Caveats:**
- Free/Verified counters reset 24h after `daily_message_reset_at`, not at calendar midnight. Document in T&C.
- Pass-buyers' messages do not increment `daily_message_count` (trigger short-circuits when unlimited). Correct.

---

## 4. Final Launch Checklist

### 4.1 🔴 Critical blockers (must fix before public beta)

1. **Stripe live products** — confirm `verification_badge`, `message_pass_24h`, `premium_monthly`, `premium_yearly` exist in live mode with the four lookup keys above.
2. **Stripe live webhook secret** — `PAYMENTS_LIVE_WEBHOOK_SECRET` populated and webhook URL pointed at `/api/public/payments/webhook?env=live`.
3. **Email infrastructure not configured** — auth emails currently sent from `supabase.io`; no transactional emails at all. Run `setup_email_infra` + `scaffold_transactional_email` + add NS records.
4. **DNS for `notify.unveil.best`** — add 2 NS records, wait for verification.
5. **Legal pages** — confirm `/privacy`, `/terms`, `/refund`, `/cookies`, `/community-guidelines` are populated with reviewed copy (routes exist; content review needed).
6. **Live Stripe smoke test** — one real $1.99 Daily Pass + portal cancel.

### 4.2 🟡 Medium priority

7. Transactional templates (7 listed above).
8. Push notification per-event wiring (`use-push-notifications.ts` is present but not triggered on new match / new message).
9. Admin dashboard metrics (`/admin`) — verify revenue / DAU / verification queue counters.
10. Rate limiting on `/api/public/*` (Stripe webhook is signature-verified; other public routes need a check).
11. Audit log for admin actions (verification approve/reject, refunds).

### 4.3 🟢 Nice-to-have

12. Native iOS/Android via Capacitor (`capacitor.config.ts` present; not built).
13. i18n QA for ar/zh/ja (Latin locales done).
14. App Store / Play Store metadata (`ios/AppStore.md` is a stub).
15. Sentry / error capture wiring beyond `src/lib/error-capture.ts`.

### 4.4 Readiness scores

| Surface | Score |
|---|---|
| Web public beta | **85%** (blockers 1–6) |
| Production-grade web | **75%** (blockers + items 7–11) |
| App Store / Play Store | **15%** (Capacitor scaffolded only) |

**Recommended public beta date:** **2026-06-10** assuming blockers 1–6 closed within 48h.

---

## 5. Admin Testing Checklist — Launch Week

For each test, record: tester, env (sandbox/live), result, screenshot.

### Day -3 (Sandbox dress rehearsal)
- [ ] Sign up new account → receive welcome email (will fail until §2 done).
- [ ] Submit verification with test card `4242 4242 4242 4242` ($9.99) → admin approves → `verified=true`.
- [ ] Send 5 messages as free user → 6th blocked with paywall modal.
- [ ] Buy Daily Pass with `4242…` → send 20 messages immediately, no block.
- [ ] Buy Premium monthly → `subscription_tier='premium'`, unlimited messages, contact share eligible.
- [ ] Open Customer Portal → cancel → row updates with `cancel_at_period_end=true`.
- [ ] Trigger 7-day journey → both users opt-in via `ContactRevealPanel` → contact details exchanged.
- [ ] Verify mobile viewport (375×667) on `/discover`, `/matches`, `/chat`, `/premium`.

### Day -2 (Live smoke test)
- [ ] One real Daily Pass purchase ($1.99) on production domain.
- [ ] Confirm webhook delivered (Stripe dashboard → Events → 200).
- [ ] Confirm `profiles.message_pass_until` advanced ~24h.
- [ ] Refund via Stripe dashboard → confirm `transactions.status='refunded'`.

### Day -1 (Email & content)
- [ ] DNS NS records verified (`dig NS notify.unveil.best`).
- [ ] Send each of the 7 transactional templates to internal address; check inbox + spam.
- [ ] Read `/privacy`, `/terms`, `/refund`, `/community-guidelines` end to end.
- [ ] Verify age-gate on signup (DOB ≥ 18).

### Day 0 (Launch)
- [ ] Toggle `publish_settings.visibility = public`.
- [ ] Monitor Stripe events tab and `/admin` dashboard hourly.
- [ ] Tail edge logs for 401/500.
- [ ] Be on call for refunds + verification queue for 24h.

### Day +1 to +7
- [ ] Daily: verification queue cleared within 12h SLA.
- [ ] Daily: failed-payment dunning emails reviewed.
- [ ] Weekly: cohort retention from `analytics_events`.
