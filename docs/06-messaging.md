# 6. Messaging Flow

## Tables

`conversations`, `messages`, `message_reads`, `message_reactions`, `typing_indicators`, `shared_contacts`.

## Insert paths

1. **Open a chat** (`/chat?with=<userId>` → `src/routes/chat.tsx`):
   - Find existing `conversations` row where `(user_a, user_b)` ∈ {(me, them), (them, me)}.
   - If none, INSERT — RLS WITH CHECK requires a mutual match.
2. **Send a message**:
   - INSERT into `messages` with `conversation_id`, `sender_id=auth.uid()`, `content`.
   - Triggers:
     - `enforce_message_quota` → may raise quota error.
     - `enforce_contact_sharing` → may strip/reject contact info.
     - `bump_conversation_last_message_at`.
3. **Read receipts**: on view, insert `(message_id, user_id)` into `message_reads`.
4. **Reactions**: insert/delete in `message_reactions`.

## Realtime

`chat.tsx` subscribes to the `chat-<conversationId>` channel for `postgres_changes` on `messages`, `message_reads`, `message_reactions`, `typing_indicators`.

`messages.tsx` (inbox) subscribes to all three on the inbox topic for live unread counts.

`useUnreadCount` + `useNavBadges` (`use-nav-badges.ts`) feed the badge counts on `UnveilNav` and `MobileBottomNav`. Each `useNavBadges` instance subscribes to a uniquely suffixed channel (`nav-badges-<uid>-<ref>`) to prevent duplicate `postgres_changes` callbacks.

## Quotas, sharing, blocking

- See [07-message-quota](./07-message-quota.md) and [08-contact-sharing](./08-contact-sharing.md).
- Blocking: an INSERT into `blocks` immediately hides the conversation from both inboxes and rejects future messages by RLS (the recipient's conversation row predicate fails after the block).

## Push & email notifications

- `device_tokens` table holds web-push subscriptions per device.
- `use-push-notifications` registers the SW and saves the token.
- Email digests for unread messages are scheduled via the email sender state machine (`email_send_state`, `email_send_log`).
