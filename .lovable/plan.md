# Launch-Critical UI Fixes

Scope is **UI/presentation only** — no changes to matching logic, verification logic, DB schema, or onboarding. All four blockers + Slow Reveal polish addressed together.

---

## 1. Avatar rendering on every surface

**Problem:** Match cards, Discover cards, Messages list and Slow Reveal thread sometimes show gradient/blank circles even when the user has an avatar or selfie.

**Fix:** Standardize on `<ProfileAvatar />` (already exists in `src/components/ProfileAvatar.tsx`) which signs `profile-photos` URLs and falls back to a deterministic gradient + initial only when there is truly no image. Audit each surface and replace ad-hoc `<Avatar seed=…>` / `<img src=avatar_url>` usages.

**Render priority** (already implemented in `resolveProfileImage`):
1. `discoveryMode === "photo"` → `photo_url` (selfie)
2. `avatar_url` (generated avatar)
3. `photo_url`
4. gradient + initial SVG fallback

**Files to update:**
- `src/routes/matches.tsx` — match cards
- `src/routes/discover.tsx` — discover cards (verify)
- `src/routes/messages.tsx` — thread list
- `src/routes/chat.tsx` — header + slow-reveal thread peer avatar
- `src/components/HiddenMatchCard.tsx` (if it renders peer image)

Each must pass `userId`, `name`, `discoveryMode`, `avatar_url`, `photo_url` — never an empty string.

---

## 2. Messages unread badge + per-thread indicator

**Problem:** No unread count on bottom-nav Messages icon, no per-thread dot.

**Fix:**
- Extend existing `src/hooks/use-unread.ts` to expose `{ total, perConversation }` derived from `messages` where `recipient_id = me AND read_at IS NULL`, with a Realtime subscription on `messages` for live updates.
- Bottom nav (`src/components/MobileBottomNav.tsx` + `UnveilNav.tsx`): show count badge on Messages tab.
- `src/routes/messages.tsx`: small pulse dot + bold thread row when `perConversation[id] > 0`.
- `src/routes/chat.tsx`: on open, mark messages read (existing RPC) — confirm count clears.

No schema changes; `messages.read_at` already exists.

---

## 3. Passport share card actually shares the card

**Problem:** Facebook/email shares show only UNVEIL logo, not the user's Passport.

**Fix in `src/components/ShareablePassportCard.tsx`:**
- Add **PNG export** alongside SVG so social previews work (render SVG → `<canvas>` → `toBlob('image/png')`, save to `profile-photos/share/<uid>.png` via existing bucket, return signed URL).
- Add an `/api/public/passport/:userId` server route that returns an HTML page with OG meta tags (`og:image`, `og:title`, `og:description`) pointing at the rendered PNG, so Facebook scrape returns the card not the app logo.
- Update Share button to use that public URL as the share link.
- Email share: `mailto:` body includes the public passport URL.

---

## 4. Slow Reveal conversational polish (UI only)

**Files:** `src/routes/chat.tsx` + new `src/components/RevealAnswerCard.tsx`, `src/components/RevealStageBadge.tsx`.

- Replace plain Q/A rows with answer cards: prompt in serif italic ("The thing I value most…"), answer in card with soft border + gradient edge.
- Empty state copy: "Waiting for their response · They'll see your answer once you share."
- Stage badge above thread:
  - Day 1 → "First Discovery"
  - Day 2 → "Building Trust"
  - Day 3-4 → "Meaningful Conversation"
  - Day 5+ → "Reveal Approaching"
- Day X of 7 progress (reuse existing `SlowRevealTimeline`).
- Reward toast after answer submit: rotating copy ("Great answer." / "You've shared something meaningful." / "Trust is growing.").
- Verification gate copy update (`src/components/VerificationGate.tsx`): "Trust comes first. Only verified members can continue conversations. Verification helps protect meaningful connections."
- Animations: Tailwind `animate-in fade-in slide-in-from-bottom-2` only. No flashy motion.

---

## Out of scope
- No DB migrations.
- No changes to like/match/verification RPCs.
- No new routes besides the public OG endpoint for Passport sharing.
- No redesign of nav, onboarding, or matching screens.

## Verification
After implementation: load `/matches`, `/messages`, `/chat?...`, `/passport` in preview to confirm avatars render and unread badge updates. Use Facebook's [Sharing Debugger](https://developers.facebook.com/tools/debug/) URL pattern (note in summary — user must test on live).
