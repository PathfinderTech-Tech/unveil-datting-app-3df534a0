# Unveil Reveal Journey — Business Logic Update

This is a logic-only update. No redesigns; existing auth, payments, onboarding, messaging, voice, AI, verification, admin, and routing stay as they are. Only the reveal progression and a small status panel inside the chat thread change.

## Goals (per spec)

- Match → veiled card with name/age/city/score/AI vibe tags + “You've matched” copy
- Veil lifts automatically when BOTH:
  1. ≥10 meaningful interactions in the conversation (combined text + voice), and
  2. Each user has sent ≥1 voice note
- After reveal: track 3 days of active conversation + ≥1 shared challenge/game → unlock Date Mode
- Date Mode: AI date suggestions + sponsor preference toggle (preference only, no payments)

“Meaningful” excludes: empty messages, emoji-only, repeated duplicates, very short spam.

## Data model (single migration)

Add to `public.matches`:
- `meaningful_interactions int not null default 0`
- `voice_notes_user int not null default 0` (sent by `user_id`)
- `voice_notes_peer int not null default 0` (sent by `matched_user_id`)
- `veil_lifted_at timestamptz`
- `active_day_count int not null default 0`
- `last_active_day date`
- `shared_activity_count int not null default 0`
- `date_unlocked_at timestamptz`
- `sponsor_preference text` — one of `sponsor|split|decide_together|null`

New SECURITY DEFINER triggers / functions (all on `public`, search_path locked):

1. `fn_is_meaningful_message(content text, type text) returns boolean`
   - voice → true; else trim+strip emoji+collapse whitespace → length ≥ 2 chars AND ≠ last meaningful content from same sender in same conversation.
2. `trg_matches_progress_on_message` AFTER INSERT on `public.messages`
   - Resolves both `matches` rows (user_a↔user_b) for the conversation.
   - If meaningful: `meaningful_interactions += 1` on both rows.
   - If voice: increment `voice_notes_user/peer` on the correct side of each row.
   - Updates `last_active_day` / `active_day_count` (increment when date changes).
   - If `meaningful_interactions >= 10` AND both voice counters ≥ 1 AND `veil_lifted_at IS NULL` → set `veil_lifted_at = now()` on both rows.
   - If `veil_lifted_at` set AND `active_day_count >= 3` AND `shared_activity_count >= 1` AND `date_unlocked_at IS NULL` → set `date_unlocked_at = now()`.
3. `trg_matches_shared_activity` AFTER INSERT on `public.challenge_results` / `public.game_results` / `public.puzzle_scores` — when both users in a match have a result for the same challenge/game/puzzle id, `shared_activity_count += 1` on both rows and re-check date unlock.
4. `set_sponsor_preference(_peer uuid, _pref text)` — updates the caller's match row only.

The existing `reveal_stage` / `share_unlocked` / contact-sharing journey is **left intact** — this update only governs the photo veil and date-readiness, not the separate 7-day contact exchange.

## Frontend (logic + minimal UI only)

- `src/lib/reveal.ts` (new): `useMatchReveal(peerUserId)` → `{ veilLifted, meaningful, voiceMe, voicePeer, activeDays, sharedActivities, dateUnlocked, sponsorPreference }`, polls/subscribes to the match row.
- `src/components/HiddenMatchCard.tsx`: keep current card; show veiled photo until `veilLifted`. Add the AI vibe tags row (already available on profile) and the “Get to know each other…” copy.
- `src/routes/chat.tsx`: insert a slim `ConnectionProgress` strip above the composer when `!veilLifted`:
  - `Connection Progress N / 10`
  - `Voice Notes: You ✓/—  Them ✓/—`
  - “Keep talking to unlock the reveal.”
  When veil flips to lifted in-session, fire a one-time “Veil Lifted” overlay (re-uses existing dialog primitives) with the spec copy.
- After reveal, the strip switches to `Conversation Journey Day N/3` + `Challenge Progress N/1`. When `dateUnlocked` → render `DateReadinessPanel` (new, in `src/components/`) with existing AI date suggestion call + three radio chips (Sponsor / Split / Decide together) wired to `set_sponsor_preference`.
- `src/components/ProfileAvatar.tsx` / discover/messages already accept `veiled` prop — pass `!veilLifted` from match data so list views align.

No changes to onboarding, premium gates, payments, verification, or routing.

## Sponsor preference

Stored on the caller's `matches` row via the RPC above. No Stripe, no checkout, no entitlement changes. Premium-only UI: hide the panel when `!isPremium` (re-use `useEntitlements`).

## Backfill

One-time UPDATE in the migration: any match with `mutual_interest=true AND reveal_stage='stage_3'` (or already photo-revealed) → set `veil_lifted_at = now()` so existing matches don't regress.

## Out of scope

- No design system changes, no new routes, no schema changes outside the columns above, no edits to `client.ts` / auto-generated files, no payment integration.

## Files touched

- new migration (matches columns + triggers + RPC + grants)
- `src/lib/reveal.ts` (new hook)
- `src/components/HiddenMatchCard.tsx` (veil + vibe tags wiring)
- `src/components/ConnectionProgress.tsx` (new, small)
- `src/components/DateReadinessPanel.tsx` (new, small)
- `src/routes/chat.tsx` (mount the two panels, fire Veil Lifted overlay)
- `src/routes/match.$userId.tsx` (use `veilLifted` instead of `reveal_stage` for photo gating)
