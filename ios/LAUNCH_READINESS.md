# UNVEIL — Final Launch Readiness Checklist

_Last verified: June 16, 2026_

This file is the single source of truth that the iOS/App-Store side of UNVEIL
is ready for TestFlight + App Store submission. It tracks ONLY infrastructure
and store-compliance items — no product/feature changes.

---

## 1. APNs Push (test path live in admin)

- ✅ Capacitor `@capacitor/push-notifications` plugin installed
- ✅ `src/hooks/use-push-notifications.ts` registers and upserts the APNs token into `device_tokens` (RLS scoped to `auth.uid()`)
- ✅ **Admin → "APNs Push Test" button** (`src/routes/admin.tsx` → `PushTestCard`) calls server fn `sendTestPush` (`src/lib/push.functions.ts`) which signs an ES256 JWT with WebCrypto and POSTs to `api.push.apple.com/3/device/{token}` for every iOS token registered to the admin
- ⏳ Required Lovable Cloud secrets (set before first on-device test):
  - `APNS_KEY_P8` — full `.p8` contents (including `-----BEGIN PRIVATE KEY-----` lines)
  - `APNS_KEY_ID` — 10-char Key ID
  - `APNS_TEAM_ID` — 10-char Team ID
  - `APNS_BUNDLE_ID` — `best.unveil.app`
  - `APNS_ENV` — `production` (default) or `sandbox`

On-device validation (after TestFlight build):
1. Install TestFlight build, sign in as `support@unveil.best`.
2. Grant push permission. Confirm a row in `device_tokens` (platform=`ios`).
3. Open `/admin` → **Send test push** → expect notification within ~2s and `status: 200` in the results panel.

---

## 2. StoreKit sandbox configuration

- ✅ `ios/Unveil.storekit` — StoreKit configuration file with all 6 SKUs at production prices. Import in Xcode:
  - Open `App.xcworkspace`
  - Edit scheme → **Options** → **StoreKit Configuration** → select `Unveil.storekit`
  - This lets you test purchases on a real device or simulator without sandbox-account friction.

### SKU parity (App Store Connect ↔ RevenueCat ↔ App code)

| Product ID | Type | App Store Connect | RevenueCat | `src/lib/purchases.ts` |
|---|---|---|---|---|
| `premium_monthly` | Auto-renewing subscription | Required | Entitlement `unveil_premium` | ✅ `ProductId` union |
| `premium_quarterly` | Auto-renewing subscription | Required | Entitlement `unveil_premium` | ✅ `ProductId` union |
| `premium_annual` | Auto-renewing subscription | Required | Entitlement `unveil_premium` | ✅ `ProductId` union |
| `pass_24h` | Consumable | Required | No entitlement | ✅ `ProductId` union |
| `pass_2w` | Consumable | Required | No entitlement | ✅ `ProductId` union |
| `verification_badge` | Non-consumable | Required | No entitlement | ✅ `ProductId` union |

All product IDs are referenced verbatim in `src/lib/purchases.ts`; **do not rename without updating App Store Connect and the RevenueCat offering at the same time.**

---

## 3. Restore Purchases visibility (App Store §3.1.1 compliance)

- ✅ Visible in `/settings` (`src/routes/settings.tsx` line 114)
- ✅ Visible in `/premium` (`src/routes/premium.tsx` line 231)
- ✅ Component: `src/components/RestorePurchasesButton.tsx` calls `restorePurchases(user.id)` in `src/lib/purchases.ts`, which routes to RevenueCat on iOS and surfaces a toast with the restored entitlements.

---

## 4. Account Deletion accessibility (App Store §5.1.1(v) compliance)

- ✅ Visible in `/settings` (`src/routes/settings.tsx` lines 136–171), one tap from the main settings page, no email/support gate.
- ✅ Calls server fn `deleteAccount` (`src/lib/account.functions.ts`) which deletes auth user + profile, then enforces the 24-hour cooldown via the `account_deletions` table.
- ✅ Re-registration cooldown enforced by `is_email_in_cooldown` trigger on `auth.users`.

---

## 5. Apple reviewer notes (matches App Store Connect "App Review Information")

Reviewer demo accounts (kept active, password not rotated until after review):

| Email | Password | Notes |
|---|---|---|
| `support@unveil.best` | `GetUnveil@1369` | Admin role. Use to see `/admin` and confirm moderation tooling. |
| `unveilbest@gmail.com` | `GetUnveil@1369` | Standard member. Pre-seeded mutual match with `support@unveil.best` so the reviewer can immediately see Discover, Messages, Veil Reveal, Insights, Passport. |

Reviewer notes block (paste into App Store Connect verbatim):

```
UNVEIL is a compatibility-first dating app. Use the demo accounts above
to sign in via email/password. The two accounts are pre-matched, so you
can:
  1. Open Messages → tap "Girard Yves Arthur" to see the active chat.
  2. Send a message — Veil Reveal unlocks after the first exchange.
  3. Insights → Today / Readiness / Blueprint / Connection.
  4. Passport → public profile preview.
  5. Settings → Restore Purchases AND Delete Account (one tap).

Selfie verification requires a real iOS device camera; reviewer may skip
or test on hardware. Membership SKUs are: premium_monthly,
premium_quarterly, premium_annual, pass_24h, pass_2w, verification_badge.
All are billed through Apple In-App Purchase on iOS via RevenueCat.

Sign in with Apple is enabled (required because Google Sign-In is also
offered, per §4.8). Account deletion is one-tap in Settings.
```

---

## 6. On-device validations to perform after the first TestFlight build

| # | Test | How to verify |
|---|---|---|
| 1 | APNs notifications | Admin → "Send test push" returns `status: 200`; phone shows notification. |
| 2 | StoreKit purchase (monthly) | Tap Premium → Monthly → sandbox account → confirm `subscriptions` row + `unveil_premium` entitlement. |
| 3 | Restore Purchases | Settings → Restore → toast "Restored 1 purchase(s)". |
| 4 | Selfie verification | Onboarding → Verify → camera opens, capture, `verification_requests` row appears as `submitted`. |
| 5 | Apple Sign-In | Login → "Continue with Apple" → completes via system browser, lands on `/discover`. |
| 6 | Account deletion | Settings → Delete → confirm; sign-in within 24h is blocked with cooldown message. |

---

## 7. What is intentionally NOT in this build

- Production APNs sender for new-match / new-message / voice-note / contact-exchange-unlock notifications. Token registration is live; the per-event sender is scheduled for the post-TestFlight follow-up build and reuses `src/lib/push.functions.ts` as the signing path.
- StoreKit transaction-history sync to `transactions` table from iOS — RevenueCat webhook to Lovable Cloud handles this server-side; configure the RC → Lovable webhook in the RevenueCat dashboard once the bundle is on TestFlight.
