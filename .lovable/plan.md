# UNVEIL V3 — Icebreakers, Reveal Journey & Hidden Matches™

This plan ships three connected slices on top of the existing Phase-1 foundation. Nothing existing (Stripe, memberships, auth, chat, premium, onboarding, discover) is removed.

## 1. AI Icebreakers (categorised)

Extend `src/lib/icebreakers.functions.ts`:
- Add `category` to the `Icebreaker` type: `fun | deep | romantic | career | travel | family | opener | compatibility | voice`.
- New input `{ peerId, category? }`. If category set, gateway prompt asks for 5 starters in that category; otherwise mixed.
- Prompt enriches with: my+their interests, values, goals, archetype, compatibility strengths, daily-answer snippets.
- Always include 1 "AI Suggested Opening Message" returned as `suggestedOpener: string`.
- Track `ANALYTICS.icebreakerGenerated` with `{ peerId, category }` server-side after success.

Update `src/routes/chat.tsx`:
- Add category chip row (Fun · Deep · Romantic · Career · Travel · Family) above existing icebreaker list.
- "Generate New Icebreaker" regenerates for the selected category.
- Render the AI suggested opener as a highlighted card with "Use this" → prefills composer.

## 2. 7-Day Reveal Journey polish

Existing: `reveal_progress` table, `getRevealProgress`/`advanceReveal` server fns, Reveal tab on `/insights`.

Changes:
- `src/components/RevealJourney.tsx` (new): full timeline component used on `/insights` Reveal tab and on `/match/$userId`. Renders 7 stage cards (Voice / Personality / Values / Goals / Partial Photo / Video / Full Profile) with:
  - Locked/unlocked/available states.
  - Unlock animation (Tailwind `animate-in fade-in slide-in-from-bottom-2` + a pulsing ring on the newly available stage).
  - Countdown to next unlock (20h cadence from `reveal.functions.ts`).
  - "Unlock now" button calling `advanceReveal`, then `trackEvent(ANALYTICS.revealUnlocked, { matchId, day })`.
- `src/hooks/use-reveal-notifications.ts` (new): polls `getRevealProgress` for the user's mutual matches every 60s; when a new stage becomes available, fires a `sonner` toast "New reveal unlocked with {name} — Day {n}: {title}". Mounted once from `__root.tsx`.
- Mobile/desktop responsive: stack vertically on mobile, horizontal timeline ≥md.

## 3. Hidden Matches™

### Schema (single migration)
- New table `hidden_match_views (id, user_id, target_user_id, kind 'view'|'unlock', created_at)`.
- Add column `profiles.personality_axes jsonb default '{}'` storing 4 axes derived from blueprint+daily answers: `social` (introvert↔extrovert), `planning` (dreamer↔planner), `cognition` (creative↔analytical), `role` (leader↔supporter), each -1..1.
- New SQL function `public.discover_hidden_matches(_limit int)` → returns candidates where:
  - values_score ≥ 70 (values must align)
  - sum(abs(axes_diff)) ≥ threshold (complementary)
  - excludes blocked / passed / already-mutual
  - returns `similarity_score, complementary_score, shared_values text[], growth_opportunities text[]`.
- RPC `public.compute_why_we_match(_a uuid, _b uuid)` returns similarity, complementary, shared values, growth opps, communication dynamics, strengths, challenges.

### Server fns (`src/lib/hidden-matches.functions.ts`)
- `loadHiddenMatches({ limit })` — wraps RPC, server-side gating: non-premium gets first 3 with full data + remaining as locked teasers (only count + complementary band). Premium: unlimited.
- `whyWeMatch({ peerId })` — wraps RPC + calls Lovable AI Gateway (`google/gemini-3-flash-preview`) for "AI relationship insights" paragraph + recommended conversation topics. Cached per pair in memory.
- All fire analytics: `hidden_match_view`, `hidden_match_unlock`, `why_we_match_open`, `hidden_match_message_started`.

### UI
- `src/routes/discover.tsx`: add Tabs `Your Matches` | `Hidden Matches`. Each tab keeps its own data source.
- `src/components/HiddenMatchCard.tsx`: complementary score ring, "Hidden Match" badge, tagline rotation, locked overlay for >3 (free) with `Unlock Hidden Matches™` CTA → `/premium`.
- `src/components/WhyWeMatchSheet.tsx`: Sheet/Dialog with Similarity, Complementary, Shared Values, Growth, Communication Dynamics, Strengths, Challenges, AI insights, recommended topics, "Send icebreaker".
- Curiosity banner on Discover header: "You have N Hidden Matches" + strongest band, computed from RPC.

### Premium gating
- Use existing `useSubscription`. Server fn also re-checks via `has_active_subscription` to prevent client bypass.

### Branding
- New tokens in `src/styles.css` (no color overwrites): `--gradient-hidden`, `--shadow-hidden` for Hidden Match surfaces.
- Taglines randomised from an array.

## 4. Sample data
- Insert via supabase insert tool: 4 demo profiles (`Maya`, `Theo`, `Aria`, `Kai`) with onboarding_answers, personality_blueprint, and a `reveal_progress` row at Day 3 vs current user for quick demo. (Skip if local auth.uid context not available — gate behind admin script note.)

## 5. Out of scope (defer)
- Native push notifications (toasts only for now).
- Admin reporting dashboard rebuild.
- Real video recording for Day 6 (placeholder upload UI).

## 6. Verification
- `tsc --noEmit` green.
- Manual smoke: open `/chat/:id` → pick "Deep" → new starters render + opener card.
- `/insights` Reveal tab → animations + countdown.
- `/discover` → Hidden Matches tab → 3 visible, 4th locked for free user; Why We Match opens.

## Files
- migrations: 1 (hidden_match_views, profiles.personality_axes, RPCs).
- new: `src/components/RevealJourney.tsx`, `src/hooks/use-reveal-notifications.ts`, `src/lib/hidden-matches.functions.ts`, `src/components/HiddenMatchCard.tsx`, `src/components/WhyWeMatchSheet.tsx`.
- edits: `src/lib/icebreakers.functions.ts`, `src/routes/chat.tsx`, `src/routes/insights.tsx`, `src/routes/discover.tsx`, `src/routes/__root.tsx`, `src/styles.css`.
