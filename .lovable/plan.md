# TestFlight Readiness Plan

Scope is large — I'll deliver in 6 sequential stages, each independently testable. Frontend-only where possible; backend changes use existing tables where they exist.

## Stage 1 — Legal & Policy Pages (no deps, fastest win)

**New routes** (public, no auth):
- `src/routes/privacy.tsx` — Privacy Policy
- `src/routes/terms.tsx` — Terms of Service
- `src/routes/guidelines.tsx` — Community Guidelines

Production-ready drafts tailored to Unveil / PathfinderTech, Inc. / support@unveil.best, covering:
- **Privacy**: profile data, photos, voice notes, selfie + identity verification, location/travel/trust data, messaging, subscriptions, GDPR, CCPA, retention, deletion, user rights
- **Terms**: 18+ requirement, prohibited conduct (fake accounts, harassment, scams, impersonation), subscription terms, refunds, suspension/termination, IP, liability cap
- **Guidelines**: respect, no harassment/hate/scams/solicitation/underage/nudity/violence; reporting + enforcement

**Links added to**: login, signup, settings, membership, footer.

## Stage 2 — Report & Block User

Use existing `reports` and `blocks` tables (already in schema).

- `src/components/ReportUserDialog.tsx` — categories: Fake profile, Harassment, Scam, Inappropriate content, Underage user, Other (+ free-text)
- `src/components/BlockUserButton.tsx` — immediate block via `blocks` insert
- Wire into `src/routes/profile.$id.tsx` (or equivalent profile view) and `src/routes/messages/$id.tsx` (chat header overflow menu)
- After block: remove conversation visibility, prevent new messages (RLS already enforces; add client-side guard + toast)
- After report: confirmation toast, optional auto-block prompt

## Stage 3 — Account Deletion (in-app, Apple-compliant)

Existing `account_deletions` and `account_deletion_attempts` tables present.

- `src/routes/settings/delete-account.tsx` — multi-step: warning → reason (optional) → password reconfirm → final confirm
- Server fn `requestAccountDeletion` (`src/lib/account-deletion.functions.ts`): inserts `account_deletions` row with 30-day grace, signs user out
- Wire button into `src/routes/settings.tsx` under a "Danger Zone" section
- Apple compliance copy: "Your account and all associated data will be permanently deleted within 30 days. This action cannot be undone."

## Stage 4 — Apple Reviewer Mode

- Hardcoded reviewer email constant `APPLE_REVIEWER_EMAIL = "apple-review@unveil.best"` in `src/lib/reviewer-mode.ts`
- `useIsReviewer()` hook reads current session email
- Bypass behaviors when reviewer:
  - Auto-grant premium entitlements (client-side flag, server-side check via email allowlist in a small RPC `is_reviewer_account`)
  - Skip selfie/photo gating (still SHOW the flow, just don't block)
  - Always populate at least 3 fake matches in discovery if none exist
- `<ReviewerBadge />` rendered in topbar when reviewer is logged in
- Migration: seed reviewer user via auth admin (manual step in App Store Connect Review Notes; I'll add the seeding script comment)

## Stage 5 — Capacitor Wrapper + RevenueCat IAP

This is the largest piece. Web Stripe flow stays untouched.

### Capacitor setup
```bash
bun add @capacitor/core @capacitor/cli @capacitor/ios
bun add @revenuecat/purchases-capacitor
```
- `capacitor.config.ts` with bundleId `best.unveil.app`, appName `Unveil`, webDir `dist`
- iOS build target docs in `IOS_BUILD.md`

### Unified entitlement layer
- `src/lib/platform.ts` — `isNative()`, `isIOS()`
- `src/lib/purchases.ts` — unified API: `getOfferings()`, `purchase(productId)`, `restorePurchases()`, `getEntitlements()`
  - On iOS: routes to RevenueCat SDK
  - On web: routes to existing Stripe flow
- `src/hooks/useEntitlements.ts` — returns `{ unlimited_messaging, premium_access, active_pass }`

### Products (configured in App Store Connect + RevenueCat dashboard — instructions in `IOS_BUILD.md`)
| Product ID | Type | RC Entitlement |
|---|---|---|
| `pass_24h` | Consumable | `active_pass` (24h) |
| `pass_2w` | Non-renewing subscription | `active_pass` (14d) |
| `premium_monthly` | Auto-renewing subscription | `premium_access` + `unlimited_messaging` |
| `premium_quarterly` | Auto-renewing subscription | `premium_access` + `unlimited_messaging` |
| `premium_annual` | Auto-renewing subscription | `premium_access` + `unlimited_messaging` |

### UI changes
- `src/routes/membership.tsx` — platform-aware pricing cards; "Restore Purchases" button
- `src/routes/settings.tsx` — "Restore Purchases" link (iOS only)
- `src/routes/subscription.tsx` (new) — manage subscription, show current entitlement, "Manage in App Store" link (iOS) / "Manage billing" (web)

### Secrets
- `REVENUECAT_IOS_PUBLIC_API_KEY` — added via secrets flow when user is ready
- Webhook endpoint `src/routes/api/public/revenuecat/webhook.ts` to sync RC events to `subscriptions` table (uses RC webhook auth header)

## Stage 6 — TestFlight Build Checklist

`TESTFLIGHT_CHECKLIST.md` covering:
- App Store Connect: bundle ID, version, build number, age rating (17+), category (Lifestyle / Social Networking), encryption export compliance
- Required screenshots (6.7", 6.5", 5.5" iPhone)
- Privacy nutrition labels mapped to actual data collection
- App Privacy Policy URL: `https://unveil.best/privacy`
- Sign in with Apple required (already supported in Lovable Cloud)
- Reviewer credentials in App Store Connect Review Notes
- IAP product status: "Ready to Submit"
- Capacitor build commands: `bun run build && npx cap sync ios && npx cap open ios`
- Xcode steps: signing team, push capability, ATS exception list (none needed)

## Execution order

I'll execute Stages 1 → 4 in this conversation (frontend + small migrations only, no native build deps). Stages 5 and 6 will come after — Stage 5 will pause to request the RevenueCat API key.

## Out of scope (explicitly frozen)
- New product features, matching algorithm changes, new AI flows
- No changes to existing Stripe web checkout
- No changes to messaging/auth/RLS beyond report/block enforcement that already exists
