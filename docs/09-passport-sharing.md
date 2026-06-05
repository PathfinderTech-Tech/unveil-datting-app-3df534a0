# 9. Passport Sharing System

The **Passport** is a public, shareable identity card derived from a user's profile + archetype + readiness signals. It lets users share *who they are* without exposing contact details.

## Routes

| Route | Purpose |
|---|---|
| `/passport` | Authenticated owner view + share modal (`ShareablePassportCard`). |
| `/p/$userId` | Public render of someone's passport (no auth required). Returns 404 if the user has not enabled sharing. |

## Server fn

`public-passport.functions.ts → getPublicPassport({ userId })` (no auth middleware — public):
- Reads minimal fields from `profiles`: `first_name`, `age`, `city`, `country`, `archetype`, `avatar_url`, `verified`, `readiness_score`, `readiness_breakdown`, `personality_axes`.
- Returns `null` if `profiles.passport_public` (or equivalent flag) is false.

## Open Graph / Twitter cards

`p.$userId.tsx` route `head()` builds OG/Twitter meta from the loader payload:

- `og:title` = `"{first_name} — UNVEIL Passport"`
- `og:description` = archetype tagline
- `og:image` / `twitter:image` = `avatar_url` (the avatar **is** the share image)
- `twitter:card` = `summary_large_image`

## Share channels

`ShareablePassportCard.tsx` Dialog:

| Channel | Implementation |
|---|---|
| Native share | `navigator.share({ url, title })` when available |
| Copy link | Clipboard API |
| Email | `mailto:` with prefilled subject + body |
| Facebook | `https://www.facebook.com/sharer/sharer.php?u=<encoded url>` |
| X (Twitter) | `https://twitter.com/intent/tweet?text=<encoded text>&url=<encoded url>` |
| WhatsApp | `https://wa.me/?text=<encoded text url>` |
| Image download | Renders card to PNG via `html-to-image` |

Each click writes an `analytics_events` row: `shareable_card_<channel>_clicked`.

## Privacy

- Passport never exposes email, phone, last name, exact location (only city/country), or message history.
- The owner can disable public sharing at any time from `/passport`.
