/**
 * Apple Reviewer Mode
 * --------------------
 * Provides Apple App Review staff with a frictionless evaluation account.
 *
 * Reviewer credentials are documented in App Store Connect → App Review →
 * Review Notes. The reviewer account is a normal authenticated user — it
 * does NOT bypass safety systems (selfie verification, reporting, blocking
 * are all reachable and functional). It only:
 *
 *   1. Skips hard paywalls so the reviewer can evaluate premium-gated UI.
 *   2. Displays a "Reviewer Mode" badge so the reviewer knows they're in
 *      the special account.
 *
 * This is purely a client-side UX accommodation; the reviewer still hits
 * RLS, rate limits, and the same trust pipeline as any other user.
 */
/**
 * Reviewer email is the App Store Connect demo account documented in
 * App Review Information. Keep this in sync with ASC; both addresses are
 * accepted so the historical alias keeps working.
 */
export const APPLE_REVIEWER_EMAIL = "support@unveil.best";
const REVIEWER_EMAIL_ALIASES = new Set<string>([
  "support@unveil.best",
  "apple-review@unveil.best",
]);

export function isReviewerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return REVIEWER_EMAIL_ALIASES.has(email.trim().toLowerCase());
}
