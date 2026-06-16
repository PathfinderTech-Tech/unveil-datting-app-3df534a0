# Stage 2 — Gift Journey System

Additive feature. Does NOT touch auth, matching, messaging logic, voice notes, subscriptions, reveal, verification, AI Insights, or chat layout. Reuses existing `messages` table for in-chat delivery via a typed message row, so realtime/quotas/RLS all continue to work unchanged.

## Goals
1. A gift **catalog** (Rose, Coffee, Heart Note, Teddy Bear, Scented Candle, Love Letter, Spark…).
2. **Send from inside the existing chat composer** via a small gift button (no replacement of text input or voice notes).
3. Render gifts as a special **message bubble** in the conversation timeline.
4. A **Gift Journey** progression (First Gift → Meaningful → Deep Connection) + streaks.
5. **Premium gating**: free = 3 gifts / week + only "free-tier" gifts; premium = unlimited + all gifts.
6. Dedicated `/gifts` page kept as collection / journey overview (sending happens primarily in chat).

## Data model (single migration)

```text
gift_catalog        (static, seeded)
  slug PK, name, emoji, image_url, gem_cost int,
  tier text ('free'|'premium'|'milestone'),
  default_message text, sort int, active bool

gift_sends
  id, sender_id, recipient_id, conversation_id,
  gift_slug FK -> gift_catalog.slug,
  note text (<=140 chars, contact-share trigger reused),
  message_id FK -> messages.id (nullable),
  created_at

gift_journey  (one row per pair, ordered user_a<user_b)
  user_a, user_b PK,
  total_gifts int, last_gift_at, streak_days int,
  stage text ('first_gift'|'meaningful'|'deep_connection')

gift_weekly_usage  (rolling 7d counter for free tier)
  user_id, week_start date, sent_count int  PK(user_id, week_start)
```

RLS:
- `gift_catalog`: SELECT to anon+authenticated.
- `gift_sends`: SELECT where `auth.uid() in (sender_id, recipient_id)`. INSERT only via server fn (no direct client insert policy).
- `gift_journey`: SELECT where uid in (user_a, user_b).
- `gift_weekly_usage`: SELECT/own-row only.

GRANTs included per project rules. service_role full access.

## Server functions (`src/lib/gifts.functions.ts`)
All use `requireSupabaseAuth`.

- `listGiftCatalog()` → returns catalog + per-user lock state (tier vs entitlements, journey stage required).
- `getGiftQuota()` → `{ used, limit, resetsAt, unlimited }` (free=3/week, premium=unlimited).
- `sendGift({ recipientId, slug, note? })`:
  1. Verify mutual match (reuse existing `matches` check used by chat).
  2. Check entitlements + quota; raise typed errors `GIFT_QUOTA_EXHAUSTED`, `GIFT_LOCKED`, `NOT_MATCHED`.
  3. Find/create `conversations` row (same logic as `chat.tsx`).
  4. Insert into `messages` with `content` = serialized marker `[[gift:<slug>]] <note>` and a new column `kind='gift'` (added in migration; default `'text'` to preserve everything).
  5. Insert `gift_sends`, upsert `gift_journey` (increment + recompute stage), increment `gift_weekly_usage`.
- `getJourney({ peerId })` → stage, totals, streak, next milestone.

Quota / matching / contact-share triggers are not modified — the gift note still flows through `enforce_contact_sharing`.

## UI

### 1. Chat composer (`src/routes/chat.tsx`)
- Add a small `Gift` icon button between the existing AI Insights button and the Voice Note controls.
- Opens `<GiftPickerSheet />` (bottom sheet on mobile, dialog on desktop).
- After successful send the message arrives via existing realtime — no client-side timeline patching needed.

### 2. `<GiftPickerSheet />` (new)
- Grid of gifts from `listGiftCatalog()`.
- Unlocked → tap → optional short note (prefilled with `default_message`, e.g. "I enjoy talking to you.") → **Send Gift**.
- Locked → disabled tile + "Continue building your connection to unlock this gift."
- Quota exhausted free user → inline banner "Upgrade to Premium to send more meaningful gifts." + `[Upgrade to Premium]` → `/premium`.
- Footer shows: `2 / 3 gifts this week` or `Unlimited (Premium)`.

### 3. `<GiftMessageBubble />` (new)
- Rendered inside the existing chat message list when `message.kind === 'gift'` (or content matches `[[gift:slug]]`).
- Shows gift image/emoji, "Namy sent you Rose", optional note, soft glow card in the Unveil purple/magenta style.
- Falls back gracefully if catalog row missing.

### 4. `/gifts` page (`src/routes/gifts.tsx` — new)
- Premium-feature hero matching the attached prototype.
- Featured gifts grid (read-only, taps deep-link to a match picker → opens chat with picker preopened).
- **Gift Journey** card: First Gift → Meaningful → Deep Connection, current stage highlighted.
- **Streak** card (consecutive days a gift was sent/received).
- **Unlock Rewards** teaser.
- "Upgrade to Premium" CTA at bottom for free users.
- Added to `UnveilNav` + `MobileBottomNav` as "Gifts" with a `Premium` chip.

## Premium gating summary
| Tier | Catalog access | Weekly sends |
|---|---|---|
| Free | `tier='free'` gifts only | 3 / 7-day rolling |
| Premium | all gifts including `milestone` | Unlimited |

Existing reveal / message quota / subscription / RevenueCat flows untouched. Entitlement read via the existing `useEntitlements()` hook.

## Files

New:
- `supabase/migrations/<ts>_gift_journey.sql`
- `src/lib/gifts.functions.ts`
- `src/components/GiftPickerSheet.tsx`
- `src/components/GiftMessageBubble.tsx`
- `src/components/GiftJourneyCard.tsx`
- `src/routes/gifts.tsx`
- `src/assets/gifts/*` (emoji-based, no binary deps; reuse lucide + emoji for v1)

Edited (additive only):
- `src/routes/chat.tsx` — add gift button + sheet mount + bubble renderer branch.
- `src/components/UnveilNav.tsx`, `src/components/MobileBottomNav.tsx` — add Gifts item.

## Regression checks (before declaring done)
- Send text → works. Send voice note → works. AI Insights tab → works.
- Existing messages still render (kind default 'text').
- Message quota + contact-share triggers still fire on gift notes.
- Premium paywall, subscription, reveal, verification unchanged.
- Mobile chat layout unchanged aside from one extra 32px icon button.

## Execution order
1. Migration (catalog + seed + tables + RLS + GRANTs + `messages.kind` default 'text').
2. `gifts.functions.ts`.
3. `GiftPickerSheet` + `GiftMessageBubble`.
4. Wire into `chat.tsx`.
5. `/gifts` page + nav entries.
6. Manual regression pass on chat, voice, AI Insights, premium paywall.

Stage 3 is NOT started in this phase.
