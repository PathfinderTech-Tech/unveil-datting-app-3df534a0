# 2. Database Schema & Supabase Tables

All tables live in the `public` schema. RLS is enabled on every table. Roles are stored in a separate `user_roles` table (never on `profiles`) and read via the `has_role(uid, role)` security-definer function.

## Enums

| Enum | Values |
|---|---|
| `app_role` | `admin`, `moderator`, `user` |
| `subscription_tier` | `free`, `premium` |
| `reveal_stage` | `stage_1` (blurred), `stage_2`, `stage_3` (full reveal) |
| `report_status` | `pending`, `reviewed`, `actioned`, `dismissed` |

## Core tables

### Identity & profile
| Table | Purpose |
|---|---|
| `profiles` | One row per user. Stores demographics, `archetype`, `avatar_url`/`photo_url`, `verified`, `subscription_tier`, `premium_until`, `message_pass_until`, `daily_message_count`, `daily_message_reset_at`, location (approx lat/lng + `discovery_radius_km`), readiness/personality JSONB. |
| `user_roles` | `(user_id, role app_role)` — roles only. |
| `onboarding_answers` | Raw onboarding JSON answers. |
| `personality_blueprint` | Communication / attachment / conflict / leadership style. |

### Matching & discovery
| Table | Purpose |
|---|---|
| `matches` | One row per directional candidate. `mutual_interest=true` when both swiped yes. Holds `compatibility_score`, `reveal_stage`, `photo_reveal_*_consent`, `share_*_consent`, `passed`, `saved`. |
| `saved_profiles` | Bookmarks. |
| `blocks` | `(blocker_id, blocked_id)`. |
| `hidden_match_views` | Tracks "seen" matches per user. |
| `reveal_progress` | Daily reveal unlocks (`day` 1-7) per match. |
| `match_intro_prompts`, `match_day3_answers`, `first_impression_responses` | Match-bound interactions used by the chemistry ledger. |

### Messaging
| Table | Purpose |
|---|---|
| `conversations` | `(user_a, user_b, last_message_at)` — insert allowed only if a mutual match exists. |
| `messages` | `(conversation_id, sender_id, content, media_url, message_type, delivered_at, flagged)`. |
| `message_reads` | `(message_id, user_id, read_at)`. |
| `message_reactions` | Emoji reactions. |
| `typing_indicators` | Ephemeral typing presence. |
| `shared_contacts` | Phone / WhatsApp / Telegram / Instagram (released only when sharing rules pass). |

### Engagement content
`daily_questions` / `daily_answers`, `challenges` / `challenge_packs` / `challenge_questions` / `challenge_results`, `puzzles` / `puzzle_content` / `puzzle_scores`, `spark_answers`, `game_results`, `content_completions`, `guided_date_progress`, `date_plans`, `badges_catalog`.

### Ops / system
`analytics_events`, `failure_logs`, `feedback`, `reports`, `account_deletions`, `account_deletion_attempts`, `device_tokens`, `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `subscriptions` (Stripe mirror).

## Critical RLS patterns

- **`profiles`** — own row always readable; other users' rows readable **only** if a mutual match exists (`profiles_select_matched`).
- **`matches`** — read/update only by `user_id` or `matched_user_id`. No client inserts (RPC only).
- **`messages` / `conversations`** — scoped to `user_a`/`user_b`. Insert into `conversations` requires an existing mutual match (enforced in the WITH CHECK).
- **`shared_contacts`** — own row always read/write; partner can read only when `mutual_interest=true`.
- **Realtime topics** — restricted to `chat-<id>` / `inbox-<id>` patterns via `rt_restrict_topics`, with per-topic membership checks.

## Important functions / triggers

| Function | Purpose |
|---|---|
| `has_role(uid, role)` | Security-definer role check used by all RLS policies. |
| `get_message_quota(uid)` | Returns `{used, limit, resets_at}`. Limit = 15 if verified, 5 otherwise; bypassed by `user_has_unlimited_messaging`. |
| `enforce_message_quota` (trigger on `messages`) | Rejects insert when over quota. |
| `user_has_unlimited_messaging(uid)` | True if `subscription_tier='premium'` or `message_pass_until > now()`. |
| `can_share_contacts(a, b)` | True if mutual + both verified + (match age ≥ 7d OR either side premium). |
| `enforce_contact_sharing` (trigger on `messages`) | Strips/rejects phone, email, URLs and social handles unless `can_share_contacts` is true. |
| `bump_conversation_last_message_at` (trigger) | Updates `conversations.last_message_at`. |

## Storage buckets

- `avatars/` — generated identity-preserving avatars (per-user-scoped paths).
- `photos/` — original uploads, accessed via signed URLs (`SignedImage` component).
