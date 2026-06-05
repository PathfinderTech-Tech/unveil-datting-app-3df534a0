# 7. Daily Message Quota System

## Rules

| Tier | Daily limit |
|---|---|
| Free, unverified | **5** messages / 24h |
| Free, verified | **15** messages / 24h |
| Premium (active `subscription_tier='premium'` OR `message_pass_until > now()`) | **Unlimited** |

The window rolls per user using `profiles.daily_message_reset_at` (re-armed exactly 24h after the first message of the period).

## Server-side enforcement

Authoritative checks live in Postgres — clients cannot bypass them.

### `get_message_quota(uid uuid)`
Returns `{ used int, limit int, resets_at timestamptz }`. Computes:
```
_limit := CASE WHEN profiles.verified THEN 15 ELSE 5 END;
IF user_has_unlimited_messaging(uid) THEN _limit := -1;  -- sentinel for unlimited
```

### `user_has_unlimited_messaging(uid uuid)`
```sql
SELECT (subscription_tier = 'premium')
    OR (message_pass_until IS NOT NULL AND message_pass_until > now())
FROM profiles WHERE id = uid;
```

### `enforce_message_quota` (BEFORE INSERT trigger on `messages`)
- If `user_has_unlimited_messaging(sender_id)` → allow.
- Else: if `daily_message_reset_at < now() - 24h`, reset `daily_message_count=0`, set `daily_message_reset_at=now()`.
- If `daily_message_count >= _limit` → `RAISE EXCEPTION 'message_quota_exceeded'`.
- Else: `daily_message_count := daily_message_count + 1`.

## Client surface

`use-message-quota.ts` calls `get_message_quota` and exposes `{ used, limit, resetsAt, exhausted, unlimited }`. The chat input shows remaining count + countdown; on `exhausted` it opens `MessagePaywallModal` which offers:

- Verify (free upgrade 5 → 15) → links to `/verify`.
- 24-hour message pass (one-time Stripe charge) → sets `profiles.message_pass_until = now() + interval '24 hours'`.
- Premium subscription (recurring) → sets `subscription_tier='premium'` + `premium_until`.
