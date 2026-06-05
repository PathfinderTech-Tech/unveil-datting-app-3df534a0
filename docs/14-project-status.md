# 14. Project Status — Audit Snapshot

_Date: 2026-06-05. Read-only audit. No code changed._

## 1. GitHub repository
The repository name and organization are not visible from inside Lovable —
they live in the GitHub connection panel (Plus (+) → GitHub). What I can
confirm is that the project is wired for Lovable's two-way GitHub sync; all
edits land as `lovable-dev[bot]` commits on the connected default branch.

- **Repo name**: visible in the GitHub panel and at the top of the repo page on github.com.
- **Org / owner**: same panel — owner is whichever GitHub account/org you authorized.
- **Default branch**: `main` unless you changed it on github.com.

> If you paste the repo URL once, I'll cite it directly in future docs.

## 2. Deployment URLs

| Channel | URL |
|---|---|
| Custom domain (production) | https://unveil.best, https://www.unveil.best |
| Lovable published | https://mind-match-maze.lovable.app |
| Preview (latest build) | https://id-preview--4ea519e3-d640-46a7-8d58-fe8fd35d987d.lovable.app |
| Stable project URLs | `project--4ea519e3-d640-46a7-8d58-fe8fd35d987d.lovable.app` (prod), `…-dev.lovable.app` (preview) |

## 3. Backend (Lovable Cloud / Supabase)

- Project ref: `odisvcroittzdmulhlyh` (internal)
- Status: `ACTIVE_HEALTHY`
- Three clients in use: browser (publishable), auth-middleware (publishable + JWT), admin (service role).

## 4. Stripe integration

- Connector installed (`STRIPE_SANDBOX_API_KEY`, `STRIPE_LIVE_API_KEY` both present).
- Webhook secrets present for both envs (`PAYMENTS_SANDBOX_WEBHOOK_SECRET`, `PAYMENTS_LIVE_WEBHOOK_SECRET`).
- Webhook route deployed: `src/routes/api/public/payments/webhook.ts`.
- **Live mode go-live**: status must be re-checked via Payments tab → Go Live. Until step 5 (readiness check) passes, only sandbox checkout is reliable. Verify before public launch.

## 5. Database tables (54)

`account_deletion_attempts`, `account_deletions`, `analytics_events`, `badges_catalog`, `blocks`, `challenge_packs`, `challenge_questions`, `challenge_results`, `challenges`, `content_completions`, `conversations`, `daily_answers`, `daily_questions`, `date_plans`, `device_tokens`, `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `failure_logs`, `feedback`, `first_impression_responses`, `game_results`, `guided_date_progress`, `hidden_match_views`, `match_day3_answers`, `match_intro_prompts`, `matches`, `message_reactions`, `message_reads`, `messages`, `onboarding_answers`, `personality_blueprint`, `profiles`, `puzzle_content`, `puzzle_content_public`, `puzzle_scores`, `puzzles`, `reports`, `reveal_progress`, `saved_profiles`, `shared_contacts`, `spark_answers`, `subscriptions`, `suppressed_emails`, `thoughts`, `transactions`, `typing_indicators`, `user_badges`, `user_roles`, `values_challenge_progress`, `verification_payments`, `verification_requests`, `voice_prompts`, `waitlist`.

## 6. Edge / server endpoints

UNVEIL does **not** use Supabase Edge Functions. Server logic is split:

- **TanStack server functions** (`src/lib/*.functions.ts`): `account`, `admin-beta`, `admin-failures`, `avatar`, `blueprint`, `daily`, `hidden-matches`, `icebreakers`, `payments`, `public-passport`, `reveal`, `verification`.
- **HTTP server routes** (`src/routes/api/`): `api/public/payments/webhook` (Stripe), `lovable/email/queue/process` (email worker).

## 7. Storage buckets (3)

- `profile-photos` — private
- `verification-docs` — private
- `voice-prompts` — private

All buckets are private; signed URLs are issued server-side.

## 8. Authentication providers

- Email + password (HIBP leaked-password protection on)
- Google OAuth
- Magic link (reset only)
- Phone, Apple, anonymous: **not enabled**

## 9. Feature completion

### ✅ Completed
- Auth (email + Google), onboarding gate, account deletion + cooldown
- Profile, avatar generation
- Photo verification (live-selfie face match)
- Discovery feed with location/age/intent filters, hidden-match algorithm
- Matching algorithm + compatibility scoring + chemistry ledger
- Mutual-like → conversation creation
- Messaging (realtime, reactions, reads, typing, thoughts)
- Daily message quota (5/15/unlimited) enforced in DB
- Contact-sharing rules + DB trigger guard
- Slow-reveal stages + photo reveal consent flow
- Passport + public passport page `/p/:userId` + share channels
- Stripe Embedded Checkout (sandbox + live wired), subscriptions, message pass, webhook
- Nav badges, unread inbox, push notification registration
- Admin: failure logs, beta access, monetization stats
- i18n (10 locales)
- Legal pages (privacy, terms, cookies, refund, safety, community guidelines)

### 🟡 Partial
- **Push notifications**: client + `device_tokens` table exist; production sender + per-event triggers not fully wired.
- **Email delivery**: queue + worker route deployed; transactional template coverage incomplete (auth digests OK, engagement digests partial).
- **Stripe live mode**: webhooks deployed but live readiness check not confirmed in this audit.
- **Admin dashboard**: stats endpoints exist; UI surfaces are basic.
- **Insights+**: paywall present, deeper analytics views still thin.

### ⚪ Not started
- Native iOS/Android builds (Capacitor config exists, no signed builds shipped)
- App Store / Play Store listings
- In-app reporting workflow review queue UI
- Automated photo moderation (CSAM/age) beyond verification
- Refund self-serve UI (handled in Stripe Dashboard today)

## 10. Known bugs (open observations)
- None reproduced in this audit pass on `/`, `/signup`, `/login`. Recent prod crash on nav badges was resolved by the duplicate-channel fix in `src/hooks/use-nav-badges.ts`.
- Watch for: SSR-time calls to protected server fns from public route loaders (would 401 build) — currently clean.

## 11. Security posture
- RLS enabled on all user-facing tables; role checks via `has_role` security-definer fn.
- Quotas + contact-sharing enforced at DB layer (clients cannot bypass).
- Webhook route verifies HMAC before processing.
- HIBP password protection on.
- Service-role key isolated to `client.server.ts` — never imported by client code.
- Recommended before public launch: run `security--run_security_scan` and triage findings.

## 12. Readiness scores (qualitative)

| Dimension | Score | Notes |
|---|---|---|
| Beta readiness | **8.5 / 10** | Core loops work; minor polish + email coverage outstanding. |
| Production (web) | **7.5 / 10** | Stripe live verification + push sender + scan triage gate this. |
| App Store / Play | **2 / 10** | No signed native build, no store listings, no review collateral. |

## 13. Estimated hours to public web launch

| Workstream | Hours |
|---|---|
| Stripe go-live verification + smoke tests | 2–4 |
| Push notification sender + 3 core events | 6–10 |
| Email transactional template gaps | 4–6 |
| Security scan triage + fixes | 4–8 |
| Final QA across 8 core flows | 4–6 |
| **Total web launch** | **~20–34 hours** |

Native app launch adds **~60–100 hours** (build signing, store assets, review iterations, age-rating, ATT, IAP wiring on iOS).
