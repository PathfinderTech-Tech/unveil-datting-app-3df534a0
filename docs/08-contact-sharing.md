# 8. Contact Sharing Rules

UNVEIL discourages off-platform contact exchange until both users have built enough signal. The rule is enforced **in the database** so client bugs cannot leak contacts early.

## Eligibility — `can_share_contacts(a uuid, b uuid)`

Returns true only when **all** are satisfied:

1. A mutual match exists between `a` and `b` (`matches.mutual_interest = true`).
2. **Both** users have `profiles.verified = true`.
3. At least one of:
   - The match is at least **7 days old** (`matches.created_at <= now() - interval '7 days'`), **OR**
   - Either user has **premium** (`subscription_tier='premium'` or active `message_pass_until` is *not* sufficient — only premium unlocks early sharing).

## Message-content guard — `enforce_contact_sharing` (BEFORE INSERT trigger on `messages`)

When `can_share_contacts(sender, recipient)` is **false**, the trigger inspects `NEW.content` against regexes for:

- Phone numbers (international + national formats)
- Email addresses
- URLs (`http(s)://`, `www.`, bare domains with TLDs)
- Social handles (`@handle` patterns, common platform names: `instagram`, `telegram`, `whatsapp`, `snap`, `tiktok`, `discord`)

If any match → `RAISE EXCEPTION 'contact_sharing_blocked'`. The client mirrors the same regex in `chat.tsx` to show an inline warning **before** the send, but the trigger is the source of truth.

## Structured sharing — `shared_contacts` table

Once eligible, users can write structured contact fields (phone, whatsapp, telegram, instagram) via the `/contact-share` flow. RLS:
- Owner can always read/write their own row.
- Partner can read **only** if a mutual match exists.

## UI surfaces

- `contact-share.tsx` route — opt-in form.
- `ShareablePassportCard.tsx` — does **not** expose phone/email; share channels are public URLs only.
- Chat composer shows a banner when sharing is still locked, with the unlock date / premium CTA.
