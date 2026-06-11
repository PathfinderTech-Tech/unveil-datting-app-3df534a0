# Unveil — Final TestFlight Checklist

Pre-flight checklist for submitting Unveil to TestFlight and Apple App Review.
Tick each item before clicking **Submit for Review**.

---

## RevenueCat / iOS StoreKit Products

Verify all five products are live in RevenueCat and App Store Connect:

- [ ] `premium_monthly` — Monthly subscription
- [ ] `premium_quarterly` — Quarterly subscription ($39.99)
- [ ] `premium_annual` — Annual subscription
- [ ] `pass_24h` — 24-Hour Pass
- [ ] `pass_2w` — 2-Week Pass

---

## App Store Connect

- [ ] Build uploaded and processed
- [ ] Export compliance answered
- [ ] Screenshots added (6.7" + 5.5" iPhone)
- [ ] Review notes added (see Section 7 below)
- [ ] "What to test" completed in TestFlight build info

---

## On-Device TestFlight Smoke Test

Run through the following on a physical device via TestFlight (sandbox):

### Auth & Onboarding
- [ ] Sign in
- [ ] Profile creation
- [ ] Edit photos
- [ ] Selfie verification

### Core Flow
- [ ] One match flow
- [ ] Messaging

### Purchases
- [ ] Restore purchases
- [ ] Sandbox purchase for all 5 iOS plans:
  - [ ] `premium_monthly`
  - [ ] `premium_quarterly`
  - [ ] `premium_annual`
  - [ ] `pass_24h`
  - [ ] `pass_2w`

### Safety
- [ ] Delete account
- [ ] Report user
- [ ] Block user

---

## 1. App Store Connect — App Record

- [ ] Bundle ID `best.unveil.app` registered in Apple Developer portal
- [ ] App created in App Store Connect
- [ ] Primary category: **Social Networking** (secondary: Lifestyle)
- [ ] Age rating: **17+** (frequent/intense mature/suggestive themes; infrequent/mild sexual content)
- [ ] Content rights: PathfinderTech, Inc. owns all content
- [ ] Export compliance: app uses only standard HTTPS / Apple cryptography → file ITSAppUsesNonExemptEncryption=NO in Info.plist
- [ ] App Privacy URL: `https://unveil.best/privacy`
- [ ] Terms of Use (EULA) URL: `https://unveil.best/terms` (Apple requires for dating apps under 1.1.6)
- [ ] Support URL: `https://unveil.best/support`
- [ ] Marketing URL: `https://unveil.best`

---

## 2. Required Assets

- [ ] App icon: 1024×1024 PNG, no transparency, no rounded corners
- [ ] Screenshots — 6.7" iPhone (mandatory, e.g. iPhone 15 Pro Max), 6 max
- [ ] Screenshots — 5.5" iPhone (mandatory legacy, iPhone 8 Plus), 6 max
- [ ] App preview video (optional, recommended)
- [ ] Promotional text (170 chars max)
- [ ] Description (4000 chars max)
- [ ] Keywords (100 chars max, comma-separated)
- [ ] What's New (4000 chars max)

---

## 3. App Privacy (Nutrition Labels)

Map exactly to what's collected (see `src/routes/privacy.tsx`):

- [ ] **Contact Info**: Email Address — linked to user, used for App Functionality
- [ ] **Identifiers**: User ID — linked, App Functionality
- [ ] **User Content**: Photos / Videos, Audio Data, Other (voice prompts, profile answers) — linked, App Functionality
- [ ] **Location**: Coarse Location (country/city only) — linked, App Functionality + Analytics
- [ ] **Sensitive Info**: Sexual Orientation, Gender — linked, App Functionality (used for compatibility)
- [ ] **Usage Data**: Product Interaction — linked, Analytics
- [ ] **Diagnostics**: Crash Data — linked, App Functionality
- [ ] **Purchases**: Purchase History — linked, App Functionality
- [ ] Data is **not** used for third-party advertising
- [ ] Data is **not** sold

---

## 4. Sign in with Apple

Required by guideline 4.8 when offering social login. Status:

- [ ] Apple Sign-In capability enabled in Xcode
- [ ] Lovable Cloud → Auth → Apple provider enabled (managed by default)
- [ ] Sign in with Apple button visible on `/login` and `/signup`, alongside other providers

---

## 5. In-App Purchases

- [ ] All five products (`pass_24h`, `pass_2w`, `premium_monthly`, `premium_quarterly`, `premium_annual`) status = **Ready to Submit**
- [ ] Localized display name + description on every product
- [ ] Each subscription has a localized **Privacy Policy URL** and **EULA URL**
- [ ] Subscription Group `unveil_premium` contains the three premium tiers
- [ ] Promotional images uploaded for each subscription (optional but recommended)
- [ ] "Restore Purchases" button reachable from Membership, Settings, and Manage Subscription pages → ✅ (`<RestorePurchasesButton />`)
- [ ] No external links to web payment from inside the iOS build → ✅ (`externalPaymentLinksAllowed()` returns false on iOS)

---

## 6. Account & Safety

- [ ] In-app account deletion reachable from Settings → Delete Account → ✅ (`/settings`, calls `deleteAccount` server fn)
- [ ] In-app reporting on profiles and messages (categories: Fake / Harassment / Scam / Inappropriate / Underage / Other) → ✅ (`<ReportUserDialog />`)
- [ ] In-app blocking — immediate, cuts off communication → ✅ (`blockUser()`)
- [ ] User-generated content moderation pipeline documented (Trust panel in `/admin`)
- [ ] Community Guidelines linked from Settings → ✅ (`/community-guidelines`)
- [ ] EULA / Terms linked from Settings and signup → ✅

---

## 7. App Review Notes (REQUIRED)

Paste this into App Store Connect → App Review Information → Notes:

```
Test account for reviewers:
  Email:    apple-review@unveil.best
  Password: (set in App Store Connect — keep out of source)

This account has Apple Reviewer Mode enabled. It:
  • Shows a "Reviewer Mode" badge in the top bar
  • Has access to premium features for evaluation
  • Has access to verification, reporting, blocking, and account deletion flows
  • Does NOT bypass selfie verification — reviewers can test the full flow

Reviewers can sign up with their own Apple ID via "Sign in with Apple"
if they prefer to test the full onboarding (selfie verification, country
selection, etc).

In-App Purchase testing: all five products are in App Store Connect under
the bundle ID best.unveil.app. The Restore Purchases button is on the
Membership, Settings, and Manage Subscription screens.

Account deletion: Settings → Delete account → DELETE. The account is
purged within 30 days; the same email is locked from re-registration for
24 hours to prevent abuse.

Reporting and blocking: any profile or message in the chat exposes an
overflow menu with Report and Block options. Reports are reviewed by
our trust team within 24 hours.
```

---

## 8. Final Xcode Steps

- [ ] Version bumped in `App/App/Info.plist` (or via target settings)
- [ ] Build number incremented
- [ ] Archive (Product → Archive)
- [ ] Validate App
- [ ] Distribute App → App Store Connect → Upload
- [ ] Wait for processing (~15–30 minutes)
- [ ] Add build to TestFlight group(s)
- [ ] When ready: Submit for Review

---

## 9. Post-Submission Monitoring

- [ ] Watch App Store Connect → App Review for messages
- [ ] Watch RevenueCat dashboard for live IAP events
- [ ] Watch `/admin` Trust panel for first-user verification mismatches
- [ ] Watch crash reports in Xcode Organizer
