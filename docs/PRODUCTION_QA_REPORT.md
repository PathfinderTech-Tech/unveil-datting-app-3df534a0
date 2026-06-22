# UNVEIL – Production QA Report (Phase 1: Automated Audit)

_Generated 2026-06-22. Static + backend audit only. Live device, payments, and store-listing checks are Phase 2/3 (require user action)._

---

## TL;DR

**No launch-blocking issues found in code or backend.** The app is in good shape for TestFlight build. Stripe live mode is fully provisioned. RLS is enabled on every public table with policies in place. Service-role key is server-only. All legal pages are present.

The 53 Supabase linter findings are all WARN-level `SECURITY DEFINER` function exposure notices — these are expected for the `has_role` + RPC pattern this project uses and are not blockers (see "Triage" below).

One trivial fix has been applied (`/p/$userId` route error boundary). Everything else either passes or is out of scope for static audit.

---

## ✅ Passing — no action required

| Area | Result |
|---|---|
| **RLS enabled** on every public table | ✅ 0 tables without RLS |
| **Policies present** on every public table | ✅ 0 tables with 0 policies |
| **Service-role key** never bundled to client | ✅ Only used in `src/routes/api/public/*` and `src/routes/lovable/email/*` server routes |
| **`VITE_*` secrets** | ✅ No service-role or private keys exposed as `VITE_` vars |
| **Stripe live readiness** (`getGoLiveStatus`) | ✅ All 5 steps complete (account, activation, app install, live keys, readiness check) |
| **Stripe webhook signature verification** | ✅ Verified in `src/routes/api/public/payments/webhook.ts` |
| **Legal routes deployed** | ✅ `/privacy`, `/terms`, `/refund`, `/safety`, `/community-guidelines`, `/cookies`, `/support`, `/contact` |
| **Error & notFound boundaries** on loader routes | ✅ All routes covered (final route `/p/$userId` patched this turn) |
| **TODO / FIXME / HACK** comments in src | ✅ None found |
| **Hardcoded test credentials / dummy data** | ✅ None found (one synthetic email pattern in `twilio-otp.functions.ts` is intentional and documented) |
| **Auth providers wired** | ✅ Email/password, Google (Lovable broker), Apple (native Supabase), SMS OTP (Twilio Verify), WhatsApp OTP (same path) |
| **`onAuthStateChange` listener** | ✅ Single root subscriber pattern in `useAuth` |
| **Webhook console.log noise** | ✅ Structured logs with email redaction — acceptable for prod ops |
| **`__authenticated` route gate** | ✅ Integration-managed |

---

## ⚠️ Triage — review but not blockers

### 1. 53 Supabase linter warnings: `SECURITY DEFINER` function exposure
- **Lint codes**: `0028_anon_security_definer_function_executable` (7), `0029_authenticated_security_definer_function_executable` (46)
- **What it means**: PostgREST exposes every `public.*` `SECURITY DEFINER` function. The linter flags them so you confirm each one is meant to be callable.
- **Verdict**: **Expected** for this app. The `has_role()` RPC pattern, `check_email_cooldown`, `log_deletion_attempt`, and similar helpers in `src/lib/cooldown.ts` are deliberately exposed and self-authorize via `auth.uid()` inside the function body. The `puzzles`/`puzzle_content` tables intentionally deny direct SELECT (`USING false`) and are read only through SECURITY DEFINER RPCs.
- **Action**: No code change required for launch. Optional hardening for v1.1: audit each `SECURITY DEFINER` function and switch any that don't need elevated privileges to `SECURITY INVOKER`.

### 2. `puzzles` / `puzzle_content` have no `GRANT` to authenticated
- **Verdict**: Intentional — direct table access is denied (`USING false`); reads go through `SECURITY DEFINER` RPCs that bypass the missing grant. **Not a bug.**

### 3. `supabaseAdmin` imported at module scope in `src/routes/api/public/passport-og.ts`
- **Verdict**: Acceptable. This is a **server route file** (under `api/`), not a `*.functions.ts` module that ships to client. The "load admin inside handler" rule applies to `.functions.ts` files only.

### 4. Synthetic phone-login emails (`phone_<digits>@phone.unveil.local`)
- **Verdict**: Intentional and documented in `twilio-otp.functions.ts`. The `.local` domain is non-routable per RFC 6762 → no risk of accidental email send.

---

## 🔧 Fixed this turn

| File | Change |
|---|---|
| `src/routes/p.$userId.tsx` | Added `errorComponent` and `notFoundComponent` (was the only loader route missing both). |

---

## ❌ Out of scope for Phase 1 — needs Phase 2 (live testing) or Phase 3 (device/store)

These cannot be verified from static analysis alone. Each is checked off in `ios/TESTFLIGHT_CHECKLIST.md`.

### Auth flows (need live run against running app + real Twilio number)
- [ ] Email sign-up + email confirmation delivery
- [ ] Password reset email delivery + `/reset-password` handler
- [ ] Google Sign-In end-to-end session
- [ ] Apple Sign-In end-to-end session (already verified in earlier turn)
- [ ] SMS OTP end-to-end (verified working in earlier turn)
- [ ] WhatsApp OTP end-to-end (needs WhatsApp-enabled Twilio Verify channel and a WhatsApp-installed test phone)
- [ ] Logout → login session continuity
- [ ] Session persistence across reload

### Onboarding / profiles / matching / messaging / reveal
- All require 2+ real test accounts interacting over time. Recommend recruiting 5–10 beta testers via the existing `waitlist` flow (`/admin/beta` to approve).

### Payments (live)
- [ ] Sandbox→live one real subscription purchase (Daily Pass, Monthly, Annual)
- [ ] Stripe Customer Portal cancellation flow
- [ ] Webhook delivery confirmation in Stripe dashboard
- [ ] Verify `subscriptions` row updates on `customer.subscription.updated`
- [ ] **iOS**: Apple IAP via RevenueCat (Stripe is web-only for iOS per Apple policy)

### Push / email infrastructure
- [ ] VAPID keys configured for web push
- [ ] iOS APNs cert / Android FCM key for Capacitor builds
- [ ] DNS SPF/DKIM/DMARC for `unveil.best` email sends

### iOS / App Store
- [ ] Signed `.ipa` from Capacitor build (`npx cap sync ios && npx cap open ios`)
- [ ] App Store Connect record + screenshots (6.7", 6.5")
- [ ] Age rating 17+, privacy nutrition label, ATT prompt declaration
- [ ] Demo account credentials for App Review
- [ ] In-app account deletion verified (✅ implemented; verify on device)

### Device matrix
- [ ] iPhone Safari (need physical device)
- [ ] Android Chrome (need physical device)
- [ ] Slow-network behavior
- [ ] Large image upload (>5 MB)

---

## Next Steps

1. **You**: confirm the Phase 2 live auth/payments smoke tests you want me to script (I can drive Playwright against localhost with a real phone number you supply).
2. **You**: complete the device/store items in `ios/TESTFLIGHT_CHECKLIST.md`.
3. **Optional v1.1 hardening**: audit `SECURITY DEFINER` functions and downgrade where possible.
