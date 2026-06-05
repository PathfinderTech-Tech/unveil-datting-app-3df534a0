# 3. Authentication Flow

## Providers

- **Email + password** (Supabase Auth)
- **Google OAuth** (`OAuthButtons.tsx`)
- **Magic link** (password reset only)

Phone/Apple are not enabled.

## Routes

| Route | Purpose |
|---|---|
| `/signup` | Create account (email/password or Google). Triggers profile row + sends confirmation email. |
| `/login` | Sign in. |
| `/reset-password` | Public page that handles `type=recovery` hash and calls `supabase.auth.updateUser({ password })`. |
| `/onboarding` | Required after first sign-in. Gated by `use-require-onboarding`. Writes `onboarding_answers` + sets `profiles.onboarding_complete`. |
| `/verify` | Photo verification (see [04-verification](./04-verification.md)). |
| `_authenticated/*` | Layout guard. `beforeLoad` redirects unauthenticated users to `/login`. |

## Session handling

- The browser client persists session in `localStorage`.
- `useAuth` exposes `{ user, loading }` and listens to `supabase.auth.onAuthStateChange` (registered early to avoid race conditions).
- For any check that must *trust* the user identity (deletes, payment ownership), server code calls `supabase.auth.getUser()` to re-validate the JWT.
- Server fns receive the bearer automatically via `attachSupabaseAuth` global function middleware (`src/start.ts`). Without that registration, protected fns 401.

## Sign-out

`/settings` calls `supabase.auth.signOut()` and clears cached query data.

## Account deletion

`account.functions.ts → deleteAccount` (protected):
1. Inserts a row into `account_deletion_attempts` for audit.
2. Calls admin client to delete from `auth.users` (cascades through FKs on user data).
3. Inserts `account_deletions` with `reactivation_allowed_at` (cooldown).
4. Signs the user out.

## Anti-abuse

- No anonymous sign-ups.
- Email confirmation required (not auto-confirm).
- HIBP leaked-password protection enabled at the Auth layer.
- Reactivation lockout via `account_deletions.reactivation_allowed_at`.
