# 13. Environment Variables

Two scopes:

- **Browser / build-time** — prefixed `VITE_*`, inlined by Vite at build.
- **Server / runtime** — read via `process.env.*` **inside** `.handler()` blocks of server fns or inside server route handlers. Never read `process.env` at module scope of any file imported by the client.

## Public (committed in `.env`, safe in client bundle)

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Lovable Cloud project URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon / publishable key for the browser Supabase client. |
| `VITE_SUPABASE_PROJECT_ID` | Project ref (used for storage URL construction). |
| `SUPABASE_URL` | Same URL exposed to the server. |
| `SUPABASE_PUBLISHABLE_KEY` | Same publishable key exposed to the server. |
| `SUPABASE_PROJECT_ID` | Same project ref exposed to the server. |

These are auto-managed by the Lovable Cloud integration; do not edit `.env` or `src/integrations/supabase/*` manually.

## Secrets (server-only, managed via Lovable secrets tool)

| Variable | Purpose |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Admin client — bypasses RLS. Used by webhooks and admin tasks only. |
| `STRIPE_SECRET_KEY` | Stripe SDK (live key in prod, test key in dev). |
| `STRIPE_PUBLISHABLE_KEY` | Embedded Checkout init (also bundled via `VITE_STRIPE_PUBLISHABLE_KEY` for the client). |
| `STRIPE_WEBHOOK_SECRET` | Verifies signatures on `/api/public/stripe-webhook`. |
| `STRIPE_PRICE_PREMIUM_MONTHLY` | Price ID for monthly Premium. |
| `STRIPE_PRICE_PREMIUM_YEARLY` | Price ID for yearly Premium. |
| `STRIPE_PRICE_MESSAGE_PASS` | Price ID for the 24-hour message pass. |
| `LOVABLE_API_KEY` | Lovable AI Gateway (Gemini image-edit for avatars, verification). **Rotate via the dedicated rotate tool, not update_secret.** |
| `RESEND_API_KEY` *(if used)* | Transactional email. Lovable Email may manage this for you. |
| `PUSH_VAPID_PUBLIC_KEY` / `PUSH_VAPID_PRIVATE_KEY` | Web Push subscriptions. |
| `WEBHOOK_SHARED_SECRET` | HMAC for any custom internal webhooks. |

## Rules

- **Never** put a secret in `.env` or in any `VITE_*` variable (the latter ship to the browser).
- Always read `process.env` **inside** `.handler()` — at module scope it's `undefined` during SSR build.
- Adding a new secret: use the Lovable secrets tool (or Project Settings → Secrets). The 100-secret-per-env cap applies; delete unused ones first if you hit `secret_limit_exceeded`.
- Rotating Stripe keys: update the secret, then redeploy. The Stripe SDK instance is created per-request, so new keys take effect immediately.

## Local override

`.env.local` (gitignored) can hold dev overrides. The Cloudflare Worker dev runtime reads `process.env` from `wrangler` config / Lovable's dev shell — no separate `.dev.vars` is required.
