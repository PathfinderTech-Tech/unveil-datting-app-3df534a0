# 4. Verification Flow

Verification grants the **Verified Badge**, raises the daily message quota from 5 → 15, and is a prerequisite for contact-sharing eligibility.

## Steps

1. User opens `/verify` (`src/routes/verify.tsx`).
2. `PhotoUpload` captures a live selfie + accepts an existing profile photo.
3. Both images uploaded to the `photos/` storage bucket under the user's prefix.
4. `verification.functions.ts` server fn compares the live capture to the profile photo using the AI gateway (face-match heuristic + liveness signal).
5. On success: `profiles.verified = true`. A row is appended to `analytics_events` (`verification_succeeded`).
6. On failure: failure recorded in `failure_logs` (`category='verification'`), user can retry after cooldown.

## UI surfaces

- `VerifiedBadge.tsx` — pill rendered on match cards, chat header, profile, and passport.
- `VerificationGate.tsx` — wraps premium-gated actions that require verification.
- `use-verification` hook — exposes `{ verified, loading, refresh }`.

## RLS / safety

- The verification fn runs as the authenticated user (publishable key + JWT). Only the user's own `profiles.verified` may be set.
- Raw verification images are auto-deleted after 7 days by a scheduled job; only the boolean flag persists.
