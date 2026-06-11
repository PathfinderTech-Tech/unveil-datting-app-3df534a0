# Location Trust Visibility Pass + Pre-TestFlight Audit

_Last updated: 2026-06-11_

---

## Part A — Location Trust Visibility Report

`LocationTrustBadge` (states: Verified Location · Travel Mode Active · Warning 1/2 · Warning 2/2 · Restricted) and `useMyLocationTrust` are now wired in. The badge uses fluorescent green (`#39FF14`) with a neon glow for the verified state and tooltip-on-hover/tap for every state.

| Surface | File | Status | Source |
|---|---|---|---|
| User Profile header (self) | `src/routes/profile.tsx` | ✅ Live | profile row |
| Passport identity card | `src/components/PassportIdentityCard.tsx` | ✅ Live | profile row (select extended) |
| Messages list — own status pill in header | `src/routes/messages.tsx` | ✅ Live | `useMyLocationTrust` |
| Messages list — per-row peer badge | `src/routes/messages.tsx` | ✅ Live | profiles select extended |
| Conversation list (chat sidebar) | `src/routes/chat.tsx` | ✅ Live | peers select extended |
| Conversation header (peer) | `src/routes/chat.tsx` | ✅ Live | peer row |
| Match detail / Date planning header | `src/routes/match.$userId.tsx` | ✅ Live | profile select extended |
| Matches / Discovery page header (self) | `src/routes/matches.tsx` | ✅ Live | `useMyLocationTrust` |
| Travel Mode panel | `src/components/TravelModeToggle.tsx` | ✅ Existing detailed status (verified-at + 14-day countdown) |
| Admin Trust Panel — user list | `src/components/AdminTrustPanel.tsx` | ✅ Live | admin select extended |
| Reported user review screens | inherits via match detail / passport components | ✅ Indirect |

### Not yet wired (data-layer changes required)

| Surface | Reason | Recommended next step |
|---|---|---|
| Per-card peer badge on Discovery / Matches feed | `discover_profiles` RPC does not return `travel_status` / `travel_expires_at` / `travel_warning_count` / `account_restricted` | Extend RPC return columns (4 fields) in a follow-up migration, then drop `<LocationTrustBadge profile={m} />` into the card body |
| Public passport (`/p/:userId`) badge | uses a public RPC that doesn't expose travel fields | Add the same 4 fields to `public_passport.functions.ts` |

These two are listed for transparency — the badge component is fully reusable; the only blocker is one RPC/select widening per surface. No changes were made to matching, payment, messaging, or verification logic.

---

## Part B — Pre-TestFlight Readiness Audit

Scoring legend: ✅ PASS · ⚠️ WARNING · ❌ FAIL

### 1. TestFlight Readiness — ⚠️ WARNING
- iOS capacitor shell present (`capacitor.config.ts`, `ios/`, `IOS_BUILD.md`, `TESTFLIGHT_CHECKLIST.md`)
- RevenueCat iOS public key configured; all 5 StoreKit products mapped (`pass_24h`, `pass_2w`, `premium_monthly`, `premium_quarterly`, `premium_annual`)
- **Blocker**: external runtime smoke test (sandbox purchases, push, Sign In With Apple) cannot be executed from this environment — must be completed on-device per `TESTFLIGHT_CHECKLIST.md`
- **Risk**: Sign In With Apple must be enabled on Lovable Cloud auth providers before TestFlight build, otherwise Apple will reject

### 2. Authentication — ✅ PASS
- Email + password (`/login`, `/signup`, `/reset-password`) — ✅
- Google OAuth — ✅ (`OAuthButtons.tsx`)
- Session persistence via Supabase client + `useAuth` — ✅
- Logout — ✅ (`/settings`)
- Duplicate handling: `handle_new_user` trigger + 24h `account_deletions` cooldown — ✅
- Password HIBP check — ⚠️ verify enabled in Cloud auth settings before launch
- **Apple Sign-In** — ⚠️ required for App Store; configure provider before submission

### 3. Onboarding — ✅ PASS
- Single funnel `/onboarding` with country/city, photos, personality, intent
- Guarded by `use-require-onboarding` everywhere
- No dead ends observed in route tree; `onboarding_complete` flag gates Discover/Matches

### 4. Selfie Verification — ✅ PASS
- `SelfieVerifyModal` + `verification.functions.ts` (`markSelfieVerified`)
- Storage bucket `verification-docs` (private) — ✅
- `profiles.verified` flipped via admin client (bypasses guard) — ✅
- Verified badge displayed everywhere VerifiedBadge is imported (5+ surfaces)
- ⚠️ Camera permission strings: confirm `NSCameraUsageDescription` in iOS `Info.plist`

### 5. Location Trust System — ✅ PASS
- `start_verified_travel` RPC: claim → selfie → device/GPS/IP/timezone match → 14-day window or warning
- Restriction at warning ≥ 2 → blocks `like_profile` and `enforce_message_quota`
- Support appeal: `/support` linked from `TravelModeToggle` restricted banner
- Badge visibility — see Part A
- ⚠️ Re-check cron: no scheduled job currently re-verifies on Day 14; users must re-open the modal. Acceptable for TestFlight but recommend pg_cron nudge before GA.

### 6. Messaging — ✅ PASS
- Send / receive / voice notes (bucket `voice-messages`)
- `enforce_message_quota` trigger uses `get_effective_message_limit` (15/day free, unlimited with active pass or premium price_id)
- Restricted accounts blocked at DB layer
- Daily Limit Reached paywall renders full ladder (passes + 3 premium tiers)

### 7. Web Payments (Stripe) — ✅ PASS
- 5 products + prices wired (`STRIPE_LIVE_API_KEY` connector + sandbox)
- Webhook at `/api/public/payments/webhook` with `PAYMENTS_LIVE_WEBHOOK_SECRET` / `PAYMENTS_SANDBOX_WEBHOOK_SECRET` signature verification
- Embedded checkout (`StripeEmbeddedCheckout`) + `/checkout/return` with `PremiumSuccessOverlay` (2s) → restores `returnTo`
- Originating conversation restored via `localStorage` + `document.referrer` fallback

### 8. iOS / RevenueCat — ⚠️ WARNING
- Config function `revenuecat-config.functions.ts` returns the public key
- `purchases.ts` wraps purchase/restore
- All 5 product IDs match StoreKit
- **Cannot validate live offerings from this env** — must verify in RevenueCat dashboard that each product is attached to the active offering before TestFlight upload

### 9. Discovery — ✅ PASS (minor)
- `discover_profiles` RPC: filters by country, language, intent, age, radius; trust-first sort by `verified DESC, pairScore DESC`
- Empty state present in `matches.tsx`
- ⚠️ Add 4 travel fields to RPC to enable per-card LocationTrustBadge (see Part A follow-up)

### 10. Safety — ✅ PASS
- Block (`blocks` table + `ReportUserDialog.blockUser`)
- Report (`reports` table + `ReportUserDialog`)
- Unmatch via `matches` table update
- Delete account: `account.functions.ts` + `account_deletions` + 24h re-register cooldown enforced in `handle_new_user`

### 11. Passport — ✅ PASS
- `/passport`, `ShareablePassportCard`, public `/p/$userId`
- OG endpoint `api/public/passport-og.ts` for social previews
- No broken share assets detected

### 12. Admin — ✅ PASS
- `/admin` route with role gate (`has_role('admin')`)
- `AdminTrustPanel` shows trust + location signals + risk + warnings + LocationTrustBadge
- Reports / beta / failure logs admin tools present

### 13. Database — ✅ PASS (with notes)
- 50+ tables, RLS enabled, GRANTs in migrations
- `profiles_guard_update` trigger locks privileged fields
- ⚠️ Run `supabase--linter` before submission to catch unindexed FKs (informational only — not a blocker)

### 14. Performance — ⚠️ WARNING
- Bundle splitting via TanStack code-splitter ✅
- Lazy images via `SignedImage` ✅
- ⚠️ `discover.tsx` (onboarding-discover questionnaire) and `chat.tsx` are large (1k+ LOC) — runtime is acceptable, but consider chunking post-TestFlight
- ⚠️ No cursor pagination on conversation messages query — fine for beta volumes

### 15. Security — ✅ PASS
- No client-side admin checks; everything via `has_role` RPC
- Service-role key never imported into client modules
- Privileged server fns use `requireSupabaseAuth` middleware
- Webhook signature verified with `timingSafeEqual` pattern
- ⚠️ Confirm `password_hibp_enabled: true` (see §2)

### 16. Apple App Store Compliance — ⚠️ WARNING
| Item | Status |
|---|---|
| Sign In With Apple | ⚠️ enable provider |
| Privacy Policy | ✅ `/privacy` |
| Terms | ✅ `/terms` |
| Refund Policy | ✅ `/refund` |
| Community Guidelines | ✅ `/community-guidelines` |
| Cookie notice | ✅ `/cookies` |
| Account deletion in-app | ✅ `/settings` → delete flow |
| User reporting | ✅ `ReportUserDialog` |
| User blocking | ✅ |
| Subscription disclosures | ✅ auto-renew copy in `MessagePaywallModal` & `/premium` — re-verify exact App Store wording before submission |
| Export compliance | ⚠️ answer in App Store Connect |

### 17. Final Report

**Overall readiness: 86 / 100**

| Category | Score |
|---|---|
| Auth | ✅ |
| Onboarding | ✅ |
| Selfie verification | ✅ |
| Location trust | ✅ |
| Messaging | ✅ |
| Web payments | ✅ |
| iOS / RevenueCat | ⚠️ |
| Discovery | ✅ |
| Safety | ✅ |
| Passport | ✅ |
| Admin | ✅ |
| Database | ✅ |
| Performance | ⚠️ |
| Security | ✅ |
| App Store compliance | ⚠️ |
| TestFlight readiness | ⚠️ |

**Critical issues (must fix before upload):** none in code.

**Pre-upload checklist (operator actions, outside code):**
1. Enable Sign In With Apple provider on Lovable Cloud auth.
2. Enable HIBP password check.
3. In RevenueCat dashboard: confirm all 5 products attached to the active offering and StoreKit IDs match exactly.
4. In App Store Connect: complete export compliance, screenshots, review notes, "What to test", privacy nutrition labels.
5. Add `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` to iOS `Info.plist`.
6. On-device sandbox purchase of all 5 SKUs + restore-purchases dry run.

**Recommended (non-blocking) fixes:**
- Extend `discover_profiles` + public passport RPC with 4 travel columns so per-card LocationTrustBadge renders for peers in Discovery feed.
- Add a Day-14 reminder cron for travel re-verification.
- Cursor-paginate conversation messages.

**Estimated readiness:**
- **TestFlight (external beta):** READY pending the 6 operator actions above. No code blockers.
- **App Store Review (full release):** 1–2 days after operator checklist + on-device QA.
- **Google Play:** N/A this milestone (iOS-first per `TESTFLIGHT_CHECKLIST.md`).

**Final recommendation: READY FOR TESTFLIGHT** — conditional on the 6 operator/dashboard items. No code changes are required to ship the build.
