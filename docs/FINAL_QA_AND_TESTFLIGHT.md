# UNVEIL — Final QA Report & TestFlight Submission Checklist

_Generated 2026-06-22_

Authentication is **frozen** — SMS, WhatsApp, Apple, Google, and Email all confirmed working. This document is the final pre-TestFlight QA pass plus the submission checklist for App Store Connect.

---

## 1. Final Automated QA — Results

### ✅ Code hygiene
- **Debug code**: 0 stray `console.log` in client code. Only 3 server-side `console.log` calls remain — all in webhook handlers for observability (`payments/webhook.ts`, `lovable/email/auth/webhook.ts`). **Keep** — these are intentional and only run server-side.
- **TODO / FIXME / HACK**: none.
- **`debugger` statements**: none.
- **Hardcoded test credentials in client bundle**: none.

### ✅ Security (Phase 1)
- RLS enabled on every public table with policies + GRANTs.
- Service-role key is server-only (`*.server.ts` files); never bundled.
- No `VITE_*` secrets exposed beyond the publishable Supabase key and Stripe publishable key.
- All `/api/public/*` routes verify signatures (Stripe webhook, email webhook).
- 53 Supabase linter warnings remain — all are `SECURITY DEFINER` function exposure on intentionally locked tables (`puzzles`, `puzzle_content`, `has_role`). These are by design; no launch blocker.

### ✅ Build & routing
- Production build green (auto-verified by harness).
- Every route with a loader has `errorComponent` + `notFoundComponent` (last gap closed at `src/routes/p.$userId.tsx`).
- All legal routes live (`/privacy`, `/terms`, `/refund`, `/safety`, `/community-guidelines`, `/cookies`, `/support`).

### ✅ Auth surfaces (frozen — not modified)
- Apple, Google, Email, SMS OTP (Twilio Verify), WhatsApp OTP all rendering on `/login` and `/signup`.
- Twilio fallback path (`src/lib/twilio-otp.functions.ts`) confirmed working.
- Password reset, session persistence, logout all wired through `useAuth` + `supabase.auth`.

### ✅ Payments
- Stripe live mode fully provisioned (`getGoLiveStatus`: all 5 steps complete).
- iOS routes purchases through **RevenueCat → StoreKit** (`src/lib/purchases.ts`); external payment links suppressed on iOS via `externalPaymentLinksAllowed()`.
- `RestorePurchasesButton` visible in `/settings`, `/premium`, `/manage-subscription`.

### ✅ Safety & compliance
- One-tap account deletion in `/settings` → `deleteAccount` server fn → 24h re-registration cooldown enforced by `is_email_in_cooldown` trigger.
- Report + Block flows present (`ReportUserDialog`, `blockUser()`).
- Admin trust panel live at `/admin`.

### No launch-blocking issues found.

---

## 2. Production Build — iOS / TestFlight

Run from the project root on macOS with Xcode 15+:

```bash
# 1. Clean web build
bun install
bun run build

# 2. Sync into the existing /ios Xcode project
npx cap sync ios

# 3. Open Xcode
npx cap open ios
```

In Xcode:
1. Select the `App` target → **Signing & Capabilities** → confirm Team = PathfinderTech, Inc.
2. Confirm capabilities: **In-App Purchase**, **Sign in with Apple**, **Push Notifications**.
3. Bump **Version** and **Build** numbers in the target's General tab.
4. **Product → Archive**.
5. **Window → Organizer** → select the new archive → **Validate App** → fix any signing/asset warnings.
6. **Distribute App → App Store Connect → Upload**.
7. Wait ~15–30 min for processing in App Store Connect.

---

## 3. App Store Connect — Final Submission Checklist

### App record
- [ ] Bundle ID `best.unveil.app` registered
- [ ] Primary category **Social Networking**, secondary **Lifestyle**
- [ ] Age rating **17+** (dating app)
- [ ] Export compliance: `ITSAppUsesNonExemptEncryption=NO` in Info.plist
- [ ] Privacy URL: `https://unveil.best/privacy`
- [ ] Terms (EULA) URL: `https://unveil.best/terms`
- [ ] Support URL: `https://unveil.best/support`
- [ ] Marketing URL: `https://unveil.best`

### Required assets
- [ ] App icon 1024×1024 PNG (no alpha, no rounded corners)
- [ ] Screenshots — 6.7" iPhone (mandatory)
- [ ] Screenshots — 5.5" iPhone (mandatory legacy)
- [ ] Promotional text (≤170 chars)
- [ ] Description (≤4000 chars)
- [ ] Keywords (≤100 chars)
- [ ] What's New (≤4000 chars)

### App Privacy ("nutrition labels")
- [ ] Contact Info → Email (linked, App Functionality)
- [ ] Identifiers → User ID (linked, App Functionality)
- [ ] User Content → Photos / Videos / Audio (linked, App Functionality)
- [ ] Location → Coarse (linked, App Functionality + Analytics)
- [ ] Sensitive Info → Sexual Orientation, Gender (linked, App Functionality)
- [ ] Usage Data → Product Interaction (linked, Analytics)
- [ ] Diagnostics → Crash Data (linked, App Functionality)
- [ ] Purchases → Purchase History (linked, App Functionality)
- [ ] Data **not** used for third-party ads
- [ ] Data **not** sold

### In-App Purchases — must all be **Ready to Submit**
- [ ] `premium_monthly` — auto-renew
- [ ] `premium_quarterly` — auto-renew
- [ ] `premium_annual` — auto-renew
- [ ] `pass_24h` — consumable
- [ ] `pass_2w` — consumable
- [ ] `verification_badge` — non-consumable
- [ ] Subscription Group `unveil_premium` contains the 3 premium tiers
- [ ] Each subscription has localized Privacy Policy URL + EULA URL

### Sign in with Apple (§4.8 — required because Google is offered)
- [ ] Capability enabled in Xcode
- [ ] Apple provider enabled in Lovable Cloud Auth
- [ ] Visible on `/login` and `/signup`

### Account & safety (§5.1.1(v))
- [ ] One-tap account deletion in Settings ✅
- [ ] In-app reporting on profiles + messages ✅
- [ ] In-app blocking ✅
- [ ] Community Guidelines linked from Settings ✅

---

## 4. App Review Notes (paste verbatim)

```
Demo accounts:
  Email:    unveilbest@gmail.com    Password: GetUnveil@1369
  Admin:    support@unveil.best     Password: GetUnveil@1369

The two accounts are pre-matched so reviewers can immediately test:
  1. Messages → open the active chat with Girard Yves Arthur
  2. Send a message → Veil Reveal unlocks after first exchange
  3. Insights → Today / Readiness / Blueprint / Connection
  4. Passport → public profile preview
  5. Settings → Restore Purchases AND Delete Account (both one-tap)

Selfie verification requires a real device camera; reviewer may skip
or test on hardware.

In-App Purchase products under bundle ID best.unveil.app:
  premium_monthly, premium_quarterly, premium_annual,
  pass_24h, pass_2w, verification_badge
All billed through Apple IAP on iOS via RevenueCat.

Sign in with Apple is enabled (required per §4.8 since Google Sign-In
is also offered). Account deletion is one tap in Settings, with a
24-hour re-registration cooldown.

Phone OTP uses Twilio Verify (SMS + WhatsApp). Test number:
+1 (415) 555-0142 — code: 123456 (reviewer-only stub disabled in prod).

Support: support@unveil.best
```

---

## 5. On-Device TestFlight Smoke Test (post-upload)

Run once on a physical iPhone via TestFlight before submitting for review:

- [ ] Sign in with Apple → lands on `/discover`
- [ ] Sign in with email/password
- [ ] Phone OTP (SMS) end-to-end
- [ ] Profile creation + photo upload
- [ ] Selfie verification capture
- [ ] Send a message in a match
- [ ] Sandbox purchase: `premium_monthly` → `unveil_premium` entitlement appears
- [ ] Sandbox purchase: `pass_24h` consumable
- [ ] Restore Purchases → toast with restored count
- [ ] APNs test push from `/admin` → notification received
- [ ] Block + report a user
- [ ] Delete account → re-signin within 24h is blocked

---

## 6. Submit

Once Sections 3–5 are checked:

**App Store Connect → App → Prepare for Submission → Submit for Review.**

Expected review window: 24–72 hours.

Post-submission monitoring:
- App Store Connect → App Review (for reviewer messages)
- RevenueCat dashboard (live IAP events)
- `/admin` Trust panel (first-user verification queue)
- Xcode Organizer (crash reports)
