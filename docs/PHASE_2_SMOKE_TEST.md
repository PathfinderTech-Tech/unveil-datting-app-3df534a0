# UNVEIL – Phase 2 Smoke Test Report

_Generated 2026-06-22. Playwright smoke tests against `http://localhost:8080`._

## ✅ Public surface — all green

| Route | Status | Title |
|---|---|---|
| `/` | 200 | UNVEIL |
| `/login` | 200 | UNVEIL — Sign in |
| `/signup` | 200 | Join UNVEIL |
| `/reset-password` | 200 | Reset password — UNVEIL |
| `/privacy` | 200 | Privacy Policy — UNVEIL |
| `/terms` | 200 | Terms of Service — UNVEIL |
| `/refund` | 200 | Refund Policy — UNVEIL |
| `/safety` | 200 | Safety & Reporting — UNVEIL |
| `/community-guidelines` | 200 | Community Guidelines — UNVEIL |
| `/cookies` | 200 | Cookie Policy — UNVEIL |

All public routes render with correct titles and meta. **No console errors** on these pages.

## ✅ Login UI

- Apple Sign-In button: present
- Google Sign-In button: present
- Phone input (`<input type="tel">`): present
- Send-Code button: present

## ⚠️ Authenticated tests — could not run from this environment

The `LOVABLE_BROWSER_SUPABASE_*` env vars that would let Playwright restore a pre-minted user session are **not populated** in this sandbox. This means no user is currently signed into the Lovable preview, so I cannot exercise:

- `/matches`, `/messages`, `/profile`, `/settings`, `/discover`, `/premium` (protected)
- Logout flow
- Stripe Embedded Checkout fetch (requires logged-in user)
- Twilio OTP verify end-to-end (requires a real phone number you provide)

### To unblock the rest of Phase 2 — one of these
1. **(Easiest)** Sign in to the Lovable preview yourself once, then ask me to re-run. The session will be injected and I can exercise every protected route, plus initiate a sandbox Stripe checkout and confirm a `clientSecret` is returned.
2. **(Real OTP path)** Give me a real phone number you can receive SMS on. I'll trigger Twilio Verify, you read the code to me, I'll complete verify, and we'll confirm session establishment + onboarding redirect.
3. **(Live payment path)** Same as #1 plus you complete a real test-card subscribe in the embedded Stripe form. I'll then check `subscriptions` table updates and Stripe Customer Portal access.

## Backend confirmations (already verified in Phase 1)

- Stripe live readiness: **all 5 steps complete** ✅
- Webhook handler at `/api/public/payments/webhook` exists with signature verification ✅
- Twilio Verify credentials present (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`) ✅
- All public tables have RLS + policies ✅

## Recommended next step

Sign into the preview once on your side, then say **"run Phase 2 again"** and I'll execute the full authenticated matrix automatically.
