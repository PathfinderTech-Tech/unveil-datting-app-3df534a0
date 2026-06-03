# Compatibility Engine & Messaging — Phased Plan

Most of the foundation already exists (profiles, matches, conversations, messages, `discover_profiles` RPC, `like_profile` RPC, realtime chat, admin dashboard). This plan fills the real gaps without rebuilding what works.

## Phase 1 — Compatibility data + scoring (this turn)

**DB migration**
- `saved_profiles(user_id, target_user_id, created_at)` — for the "Save" button on match cards
- `message_reactions(message_id, user_id, emoji, created_at)` — emoji reactions
- `message_reads(message_id, user_id, read_at)` — Seen status
- `typing_indicators(conversation_id, user_id, updated_at)` — typing
- `add columns to messages`: `delivered_at`, `media_url`, `media_type` (for voice/photo/gif)
- `add columns to matches`: `passed`, `saved` flags + indexes
- New RPC `compute_compatibility(_a uuid, _b uuid)` — pulls both `onboarding_answers.answers->'discover'`, weights goals/values/communication/lifestyle, returns `{overall, communication, lifestyle, values, goals, strengths text[], friction text[]}`
- Trigger on `like_profile` to populate `matches.compatibility_score` using the RPC
- Update `discover_profiles` to compute pair-score per row (replaces the current "diff of self-scores" heuristic)
- Hide rows with score < 60

## Phase 2 — Match cards + insights (this turn)

- New `MatchCard` component: avatar, age, city, verified badge, score band label (Exceptional/Strong/Good/Possible), top-3 strengths, intent, Like / Pass / Save buttons
- Refactor `/matches` to use it; wire Pass (writes `matches.passed=true`, hides) and Save (toggles `saved_profiles`)
- New `/match.$userId` insights route: shared values, shared interests, shared goals, strengths, friction points, communication tips — all derived from the RPC + both onboarding answer sets

## Phase 3 — Messaging upgrades (this turn)

- `/chat` enhancements:
  - Delivered + Seen ticks (mark read when conversation opens; realtime updates)
  - Typing indicator (debounced upsert into `typing_indicators`, realtime listen)
  - Emoji reactions on long-press / hover
  - Voice note recording (reuse `VoiceRecorder` + `voice-prompts` bucket pattern, store URL in `messages.media_url`)
  - Photo upload (new `chat-media` private bucket, signed URLs)
  - GIF picker (Tenor public API, no key needed for basic search? — fallback: emoji-only if unavailable)
  - Report user (writes to existing `reports`), Block (writes to `blocks`), Unmatch (sets match `passed=true` both sides, archives conversation)
- Safety: regex-strip phone/email/social handles from outgoing messages until users explicitly share via existing `consent_share_contact` RPC

## Phase 4 — Admin moderation (this turn, light)

Extend `/admin`:
- Reports queue (already has table) with resolve/dismiss
- Recent matches list
- Blocked users list

## Out of scope for this build

- Push notifications (needs APNs/FCM)
- E2E encryption (TLS-in-transit is what we have; true E2E needs key exchange UI)
- Multiplayer game engine (explicitly deferred per earlier turns)

## Technical notes

- Reactions/reads/typing tables get RLS scoped to conversation participants via `EXISTS` on `conversations`
- New RPC is `SECURITY DEFINER` so it can read both users' onboarding answers without exposing them via direct SELECT
- All new tables get GRANTs for `authenticated` + `service_role`
- Realtime: add `message_reactions`, `message_reads`, `typing_indicators` to `supabase_realtime` publication

Ship Phase 1+2 in this turn, Phase 3+4 in the next turn to keep diffs reviewable.
