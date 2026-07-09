Two independent changes bundled in this turn.

## 1. Free Your Mind & Heart — cleaner controls

File: `src/components/games/FreeYourMindHeartGame.tsx`

- Remove the large **Reset Level** button from the main game screen.
- Keep **Hint**, **Undo**, and a new **☰ Menu** button as the only visible controls during play.
- Menu (popover/sheet) contains:
  - Restart Level (with confirm dialog: "Restart this level? Your current progress on this puzzle will be lost.")
  - How to Play
  - Sound on/off
  - Exit Game (→ `/games`)
- Auto-detect stuck state (no valid moves). When true, show a modal:
  - Title: "No more moves available."
  - Actions: **Restart Level** | **Back to Games**
- Expand the board area slightly (remove reset-row height) and add breathing room to the instruction bar.

Scope: presentational + local state only. No changes to level data, scoring, or persistence.

## 2. Journey — visual partner picker

Files: `src/components/PartnerPicker.tsx`, `src/routes/journey.tsx`, `src/lib/social-api.ts` (extend `Partner` with fields already available on profiles: age, city, country, verified, match %, journey level, online status, photo).

- Replace the chip list with a **grid of profile cards**:
  - Circular avatar (existing `<Avatar>` + real photo if present)
  - First name, age
  - City 🇨🇴 country flag
  - ✓ Verified badge
  - Online / Recently active dot
  - Match % + Journey Lv
  - `Invite` button
- Tap card → expands inline (accordion) showing larger photo, short bio, journey stats (distance, countries, streak, badges, favourite landmark — pulled from existing `journeys`/`profiles` where present, otherwise gracefully hidden), and a large **Start Journey Together** CTA.
- Add a search input and filter chips: Matches · Online · Nearby · Verified · Highest compatibility.
- Solo mode: on the Journey map header, render the user's own avatar plus a glowing `+` placeholder card labelled "Invite a Match Anytime".

Data: reuse existing `loadMutualPartners` and enrich its SELECT to pull profile fields we already store. No new tables, no new server functions. Missing fields render as omitted (no fake data).

Out of scope for this turn (defer, ask before doing):
- Rich push notification copy for invites (needs notification template work).
- Heart/Mind role assignment UI on accepted journeys.
- New filters that need new indexes (Nearby beyond existing city match, Friends, Recent conversations).

Confirm and I'll implement both.