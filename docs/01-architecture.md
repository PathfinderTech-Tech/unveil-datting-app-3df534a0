# 1. Architecture Overview

## Stack

| Layer | Technology |
|---|---|
| Framework | **TanStack Start v1** (React 19, file-based routing) |
| Build | **Vite 7** |
| Runtime (SSR + server fns) | **Cloudflare Workers** (`nodejs_compat`) |
| Styling | **Tailwind CSS v4** via `src/styles.css`, OKLCH design tokens |
| UI primitives | **shadcn/ui** in `src/components/ui/` |
| State / data | **TanStack Query** + **TanStack Router** loaders |
| Backend | **Lovable Cloud** (Supabase: Postgres + Auth + Storage + Realtime) |
| Payments | **Stripe** (Embedded Checkout + Customer Portal) |
| AI | **Lovable AI Gateway** (Gemini image-edit for avatars) |
| Email | Lovable transactional email |
| Hosting | Lovable (custom domain `unveil.best`, `www.unveil.best`) |

## Request flow

```
Browser ─▶ Cloudflare Worker (src/server.ts)
              │
              ├─ SSR render (React) ──▶ TanStack Router match
              │                          │
              │                          └─ loader → ensureQueryData → createServerFn
              │
              ├─ /api/public/*  → src/routes/api/**  (webhooks, public APIs)
              │
              └─ Static assets (bundled by Vite)
```

Client-to-server RPC uses `createServerFn` from `@tanstack/react-start`. Each protected fn runs through `requireSupabaseAuth` middleware; the browser attaches the bearer via the global `attachSupabaseAuth` function middleware registered in `src/start.ts`.

## Three Supabase clients

| Client | File | Key | Where |
|---|---|---|---|
| Browser | `src/integrations/supabase/client.ts` | publishable | client components, realtime, auth |
| Auth-middleware | `src/integrations/supabase/auth-middleware.ts` | publishable + user JWT | protected server fns (RLS-scoped) |
| Admin | `src/integrations/supabase/client.server.ts` | service role | webhooks, admin tasks (bypasses RLS) |

## Realtime topics

- `chat-<conversationId>` — message inserts/updates, reactions, reads, typing indicators
- `inbox-<userId>` — unread + new-conversation pushes
- `nav-badges-<userId>-<suffix>` — `useNavBadges` (unique suffix per hook instance to avoid duplicate channel subscriptions)

## Key directories

- `src/routes/` — file-based pages. Layout segments: `__root.tsx`, `_authenticated/`.
- `src/routes/api/` — server routes (HTTP endpoints, webhooks).
- `src/lib/*.functions.ts` — `createServerFn` RPC handlers.
- `src/lib/*.server.ts` — server-only helpers (never imported by client).
- `src/components/` — UI, kept presentational.
- `src/hooks/` — data hooks (`use-auth`, `use-unread`, `use-nav-badges`, `use-message-quota`, `use-verification`, `use-subscription`).
- `supabase/migrations/` — SQL migrations (forward-only).
