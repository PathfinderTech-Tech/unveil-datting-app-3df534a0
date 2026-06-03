## Scope

Five production features layered on existing schema. No removals — Stripe, auth, premium gating, existing chat realtime infrastructure all preserved.

## 1. Database (one migration)

New tables (all RLS-protected, GRANTed):

- `daily_questions` — pool of curated questions (`category` ∈ relationship/values/personality, `prompt`, `options jsonb`). Seeded ~30 rows. Public read for authenticated.
- `daily_answers` — `user_id`, `question_id`, `answer`, `day_key date`. Unique `(user_id, day_key)`. Owner CRUD.
- `personality_blueprint` — `user_id pk`, `communication_style`, `attachment_style`, `conflict_style`, `relationship_style`, `updated_at`. Owner read/write; matched-user read.
- `reveal_progress` — `user_id`, `match_id`, `day int 1..7`, `unlocked_at`. Owner read/write either side.

Add columns to `profiles`:
- `readiness_score int default 0`
- `readiness_breakdown jsonb default '{}'` (communication/commitment/emotional/values/goals subscores)

DB function `compute_readiness_score(uid)` — derives subscores from `daily_answers` + `onboarding_answers` + `personality_blueprint`, returns int 0–100, upserts into profiles.

## 2. Server functions (`src/lib/`)

- `daily.functions.ts` — `getTodayQuestion()`, `saveDailyAnswer({questionId, answer})` → triggers `compute_readiness_score`.
- `blueprint.functions.ts` — `getBlueprint(userId)`, `updateBlueprint(partial)`.
- `reveal.functions.ts` — `getRevealProgress(matchId)`, `advanceReveal(matchId)` (enforces 24h cadence, max day 7).
- Icebreakers function already exists — reuse.

## 3. Routes

- `src/routes/_authenticated/messages.tsx` — inbox: list conversations with avatar, last message preview, unread badge (computed from `messages` minus `message_reads`), realtime updates. Links to existing `/chat/:conversationId` flow.
- `src/routes/_authenticated/insights.tsx` — tabbed dashboard:
  1. **Today** — Daily question card + answer history streak
  2. **Readiness** — score gauge 0–100 + 5 subscore bars
  3. **Blueprint** — 4-quadrant cards (communication/attachment/conflict/relationship) with edit
  4. **Reveal Journey** — per-match 7-day timeline with locked/unlocked stages
- Update nav (`src/components/AppNav.tsx` or similar) — desktop: Discover · Compatibility · Messages · Matches · Insights · Profile. Mobile bottom bar: Discover · Messages · Matches · Insights · Profile. Messages icon shows unread dot.

## 4. Mobile

All new routes use existing responsive primitives (`Card`, `Tabs`, `Sheet`). Bottom nav fixed on `<md`. Touch targets ≥44px.

## 5. Out of scope this turn

- Voice messages / image upload in chat (deferred)
- Push notifications (needs FCM/APNs setup)
- Admin analytics dashboard (next slice)
- Playwright E2E (next slice)

## Files

New: 1 migration, 3 server-fn files, 2 routes, 1 nav component update, 1 unread-badge hook, 1 readiness-gauge component, 1 blueprint-card component, 1 reveal-timeline component.

Edited: existing nav, `__root` or layout if needed for bottom bar slot.

## Verification

Build passes, security linter clean, manual smoke: open Messages (empty state), open Insights tabs, answer a daily question, see readiness score update.
