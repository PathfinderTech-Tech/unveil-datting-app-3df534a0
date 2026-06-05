# 15. Launch Checklist

_Audit only. No code changes. Check each item before flipping the corresponding launch gate._

## Legal pages

| Page | Route | Status |
|---|---|---|
| Privacy policy | `/privacy` | ✅ Deployed. Review for GDPR/CCPA data-subject rights wording + DPO contact. |
| Terms & conditions | `/terms` | ✅ Deployed. Confirm: governing law, arbitration clause, age gate, paid-tier terms. |
| Cookies | `/cookies` | ✅ Deployed. Confirm cookie banner consent is wired before non-essential cookies load. |
| Community guidelines | `/community-guidelines` | ✅ Deployed. |
| Safety | `/safety` | ✅ Deployed. |
| Refund policy | `/refund` | ✅ Deployed. Aligns with Stripe dispute policy. |
| Support / Contact | `/support`, `/contact` | ✅ Deployed. Confirm `support@unveil.best` inbox is monitored. |

**Open items**: cookie consent banner (if not yet displayed in EU), DPA template for B2B inquiries, imprint page for DE users.

## Age verification

- Onboarding asks DOB → `profiles.age` computed; users <18 cannot complete onboarding.
- **Gap**: there is no document-based age verification. Acceptable for web launch; **required for App Store / Play if positioned as a dating app**.

## Stripe production

- [ ] Step 1 — Claim sandbox to a live Stripe account.
- [ ] Step 2 — Complete Stripe activation wizard (business, bank, 2FA).
- [ ] Step 3 — Install Lovable app on live account (or copy from sandbox).
- [ ] Step 4 — Lovable auto-provisions live keys.
- [ ] Step 5 — Readiness check passes (products, prices, webhooks).
- [ ] Verify webhook signing secret `PAYMENTS_LIVE_WEBHOOK_SECRET` matches Stripe live endpoint.
- [ ] Smoke test: premium subscribe, 24h pass, cancel, refund flows.

## Email delivery

- [x] Queue + worker route deployed (`/lovable/email/queue/process`).
- [x] Auth emails (confirmation, reset) via Supabase Auth.
- [ ] Verify custom domain DNS (SPF/DKIM/DMARC) for `unveil.best`.
- [ ] Transactional templates audited: welcome, verification success, new match, new message, unread digest, payment receipt, account-deletion confirmation.
- [ ] Unsubscribe link works (`email_unsubscribe_tokens`).
- [ ] Suppressed list (`suppressed_emails`) honored before send.

## Push notifications

- [x] `device_tokens` table + `use-push-notifications` registration.
- [ ] Web push VAPID keys configured.
- [ ] Sender wired for: new match, new message, slow-reveal stage advance.
- [ ] iOS APNs cert + Android FCM key (for Capacitor builds only).

## App Store (iOS) requirements

- [ ] Signed `.ipa` from Capacitor build.
- [ ] App Store Connect record, screenshots (6.7", 6.5", 5.5", iPad if supported).
- [ ] Age rating 17+ (dating).
- [ ] Privacy nutrition label (data collected: contact info, location, photos, usage).
- [ ] App Tracking Transparency prompt if any tracking.
- [ ] Account deletion in-app (✅ implemented via `/settings` → delete account).
- [ ] IAP for any digital goods sold in-app (Stripe is not allowed for iOS in-app subscriptions — must use Apple IAP or restrict purchases to web).
- [ ] Demo account credentials for App Review.
- [ ] Support URL + privacy URL on listing.

## Google Play requirements

- [ ] Signed AAB from Capacitor build.
- [ ] Play Console listing, screenshots, feature graphic.
- [ ] Content rating questionnaire (dating → Mature 17+).
- [ ] Data safety form (data collected/shared/encrypted).
- [ ] Account deletion link surfaced on Play listing + in-app.
- [ ] Play Billing for digital goods (Stripe allowed only for physical goods or external web flow).
- [ ] Target API level current (per Play deadline).
- [ ] Dating apps declaration form completed.

## Security review

- [ ] Run `security--run_security_scan`; triage all High/Critical findings.
- [ ] Confirm RLS on every public table (verified at audit time).
- [ ] Confirm service-role key not bundled to client (verified).
- [ ] Confirm Stripe webhook signature verification (verified).
- [ ] Rotate any test secrets that may have leaked to logs.
- [ ] Penetration smoke test: try to message without mutual match, share contact before 7d, exceed quota, escalate role, read another user's chat.
- [ ] HIBP leaked-password protection on (verified).

## Beta testing checklist

- [ ] Recruit 30–100 beta testers via `waitlist` (status=`approved`).
- [ ] Verify beta gate works (`profiles.beta_member`, admin grants via `/admin/beta`).
- [ ] Bug capture: confirm `failure_logs` are flowing + admin can view via `/admin`.
- [ ] Daily QA on: signup → onboarding → discover → like → match → message → reveal → contact-share.
- [ ] Collect NPS / qualitative feedback (table `feedback`).
- [ ] Watch quota errors, contact-sharing trigger errors, payment failures.

## Public launch checklist

- [ ] Custom domain SSL active (`unveil.best`, `www.unveil.best`).
- [ ] Lovable site published with latest build (Publish → Update).
- [ ] `robots.txt` + `sitemap.xml` reviewed (present in `public/`).
- [ ] OG/Twitter cards verified for `/`, `/discover`, `/p/:userId` (passport).
- [ ] Analytics events firing (`analytics_events`).
- [ ] Stripe live readiness ✅.
- [ ] Email delivery ✅ (with custom domain).
- [ ] Push sender ✅.
- [ ] Security scan triaged.
- [ ] Status page or incident contact published.
- [ ] Rollback plan documented (Lovable version history is the primary rollback).
- [ ] Backup verified for `profiles`, `matches`, `messages`, `transactions`, `subscriptions`.
- [ ] Customer-support inbox monitored (`support@unveil.best`).
- [ ] Launch announcement assets ready (landing copy, social posts, press kit).

---

_Auditor's note: items marked ✅ are confirmed deployed at the time of this audit. Items marked `[ ]` are pending owner confirmation — they may already be done outside the codebase (DNS, store consoles, Stripe dashboard)._
