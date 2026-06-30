# UNVEIL — Android Build & Google Play Billing

This guide takes a fresh checkout of UNVEIL to a signed `.aab` ready for the
Google Play Console, with Google Play Billing wired through RevenueCat.

---

## 1. Prerequisites

- Android Studio Hedgehog (2023.1.1) or newer
- JDK 17 (bundled with recent Android Studio)
- Bun ≥ 1.1 (`bun --version`)
- A Google Play Console developer account
- A RevenueCat project with the **Google Play** app added

## 2. Generate the Android project

```bash
bun install
bun run build
npx cap add android        # one-time only — creates the /android folder
npx cap sync android       # copies the dist/client SPA into the wrapper
```

Once `android/` exists, future builds only need `bun run build && npx cap sync android`.

## 3. Configure Google Play Billing

UNVEIL uses **Google Play Billing Library v8** under the hood. We do not
call the Billing Client directly — `@revenuecat/purchases-capacitor`
bundles the latest Play Billing client, handles `BillingClient` lifecycle,
acknowledges purchases inside the required 3-day window, validates
receipts server-side, and exposes a single `Purchases` API used by
`src/lib/purchases.ts`.

### 3a. Create the products in Google Play Console

In **Monetize → Products**, create the following items with IDs that
**exactly match** the IDs in `src/lib/purchases.ts`:

| Type            | Product ID            | Price (USD) | Notes                                  |
| --------------- | --------------------- | ----------- | -------------------------------------- |
| Subscription    | `premium_monthly`     | $15.99 / mo | Base plan, auto-renewing               |
| Subscription    | `premium_quarterly`   | $39.99 / 3mo| Base plan, auto-renewing               |
| Subscription    | `premium_annual`      | $149.99 / yr| Base plan, auto-renewing               |
| In-app product  | `pass_24h`            | $1.99       | Consumable — Daily Pass                |
| In-app product  | `pass_2w`             | $9.99       | Consumable — Two-Week Unlimited Pass   |
| In-app product  | `verification_badge`  | $9.99       | Non-consumable — one-time              |

Activate every product before testing.

### 3b. Wire the products into RevenueCat

In the RevenueCat dashboard:

1. Add each Play product to the **Google Play** app.
2. Attach all subscriptions to the **`unveil_premium`** entitlement.
3. Attach `pass_24h` and `pass_2w` to the **`active_pass`** entitlement.
4. Group everything into the **`default`** offering with package IDs
   matching the product IDs (`premium_monthly`, `pass_24h`, …).

### 3c. Service-account credentials (required by RevenueCat)

Google requires a Play Developer service account so RevenueCat can verify
purchases and reconcile renewals.

1. In Play Console → **Setup → API access**, link a Google Cloud project.
2. Create a service account, grant it the **"View financial data, orders,
   and cancellation survey responses"** + **"Manage orders and
   subscriptions"** permissions for the UNVEIL app.
3. Download the JSON key and upload it to RevenueCat
   (App Settings → Service credentials).

## 4. Secret: `REVENUECAT_ANDROID_PUBLIC_KEY`

The Android SDK key is a *public* SDK key prefixed `goog_…`. It is read at
runtime by `getRevenueCatConfig` and handed to the Capacitor wrapper. It
must be added to Lovable Cloud secrets (request via `add_secret` if not
present). The iOS key `REVENUECAT_IOS_PUBLIC_KEY` is unchanged.

## 5. App version & signing

- `android/app/build.gradle` → bump `versionCode` and `versionName` before
  every Play upload. **Current production:** `versionCode 2`,
  `versionName "1.0.1"` (v1 / 1.0.0 was consumed by the first upload
  attempt and cannot be reused — Play rejects duplicate version codes).
- Generate an upload keystore once:
  ```bash
  keytool -genkey -v -keystore unveil-upload.jks \
    -alias unveil -keyalg RSA -keysize 2048 -validity 10000
  ```
- Configure `signingConfigs.release` in `android/app/build.gradle` with
  the keystore path + credentials (read from environment variables, not
  committed).

## 6. Produce the signed App Bundle

```bash
bun run build
npx cap sync android
cd android
./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

Upload the `.aab` to **Play Console → Production → Create new release**.

## 7. Test the purchase flow before going live

1. Add testers to a **Closed testing track**.
2. Add the same Google accounts to **Play Console → Setup → License
   testing** so charges are refunded automatically.
3. Install the build from the testing track URL on a real device (Play
   Billing does not work on emulators without Google Play services).
4. Verify each product: purchase → entitlement appears immediately
   (`getEntitlements`) → kill app → reopen → still entitled →
   `restorePurchases()` succeeds → cancel from Play subscriptions →
   entitlement expires at period end.

## 8. Production readiness checklist

- [ ] All six products active in Play Console with matching IDs
- [ ] RevenueCat Google Play app linked, service-account JSON uploaded
- [ ] `REVENUECAT_ANDROID_PUBLIC_KEY` set in Lovable Cloud secrets
- [ ] `versionCode` / `versionName` bumped
- [ ] Signed `.aab` uploaded to the Production track
- [ ] Data safety form, content rating, target audience, and Child Safety
      Standards URL (`https://unveil.best/child-safety`) all completed
- [ ] Account deletion URL (`https://unveil.best/delete-account`) set in
      Play Console → User data
- [ ] Tested purchase, restore, cancel, and subscription upgrade flows on
      a real device via the Closed testing track
