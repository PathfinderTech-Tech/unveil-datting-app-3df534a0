# UNVEIL V2 – Relationship Intelligence Platform

Phase 1 plan. Builds on top of the foundation already shipped last turn (daily_questions, daily_answers, personality_blueprint, reveal_progress, readiness_score, Messages + Insights routes, updated nav). Nothing existing (Stripe, memberships, auth, premium, chat) will be removed.

## Status check (already shipped)

- DB: `daily_questions` (30 seeded), `daily_answers`, `personality_blueprint`, `reveal_progress`, `profiles.readiness_score` + `readiness_breakdown`, `compute_readiness_score()` RPC
- Server fns: `daily.functions.ts`, `blueprint.functions.ts`, `reveal.functions.ts`
- Routes: `/messages` (real-time inbox), `/insights` (Today / Readiness / Blueprint / Reveal tabs)
- Nav: Desktop + mobile updated with Messages & Insights

## Phase 1 – what's still missing

### 1. Daily Compatibility — broaden beyond a single question
- Extend `daily_questions.category` to include `relationship`, `values`, `personality`, `challenge`
- Seed ~20 more rows across the 4 categories (insert tool)
- `/insights` Today tab: render 4 cards (one per category) instead of single question; track per-category completion + streak
- Server fn `getTodayBundle()` returns 4 questions deterministically picked per `day_key`

### 2. Relationship Readiness Score — expand to 5 subscores
- Update `compute_readiness_score(uid)` to output 5 subscores in `readiness_breakdown`:
  `communication`, `emotional_intelligence`, `commitment`, `goals`, `values` (0–100 each)
  Derivation:
  - communication → `personality_blueprint.communication_style` + daily `relationship` answers
  - emotional_intelligence → `personality_blueprint.conflict_style` + `game_results.emotional_score`
  - commitment → `profiles.relationship_intent` + daily `relationship` answers
  - goals → `onboarding_answers` goals fields + daily `values` answers
  - values → daily `values` answers count + diversity
  Overall = weighted avg.
- Display: gauge on `/insights` Readiness tab (already present, just rebind), plus compact badge on `/profile`

### 3. Personality Blueprint — add Leadership Style
- Migration: add `leadership_style text` column to `personality_blueprint`
- Update Blueprint tab editor to 5 cards (Communication / Attachment / Conflict / Leadership / Relationship)
- Visual: 5-point radar via SVG (no new deps)

### 4. AI Icebreakers — wire to context
- Existing `src/lib/icebreakers.functions.ts` (already created): extend prompt to pull shared interests, shared goals, compatibility score, last daily challenge answers
- Render "Generate Icebreaker" + "New Suggestion" buttons inside chat composer (already present); add fallback in match detail
- Uses Lovable AI Gateway (`google/gemini-3-flash-preview`); key already in env

### 5. No-Match Experience
- New component `NoMatchHub` on `/discover` empty state and `/matches` empty state
- Shows: today's 4 daily cards (link to Insights), one Personality Growth task (from daily_questions where category='personality'), one AI insight (cached daily, generated via gateway), one quiz (challenge_questions)

### 6. 7-Day Reveal Journey — already scaffolded
- Verify `/insights` Reveal tab maps Day 1–7 to: Voice / Personality / Values / Life Goals / Partial Photo / Video / Full
- Add reveal cards UI per day with the right gated content source (voice_prompts, personality_blueprint, daily values answers, onboarding goals, photo_url blurred → clear, video TBD placeholder, full profile)

### 7. Navigation
- Desktop: Discover · Insights · Challenges · Matches · Messages · Profile
- Mobile bottom: Discover · Insights · Matches · Messages · Profile (Challenges via Insights tab)
- Add `/challenges` route surfacing `challenge_packs` + `challenge_questions` (already exists in DB)

### 8. Analytics
- Use existing `analytics_events` table
- Helper `trackEvent(event, properties)` (browser → insert with `user_id = auth.uid()`)
- Fire on: `daily_answer_submitted`, `quiz_completed`, `challenge_completed`, `reveal_unlocked`, `match_converted`, plus `app_open` for DAU
- Admin metrics: extend existing admin analytics page (if present) with these counters; otherwise read via existing dashboard

## Files

**Migration (1):**
- Add `leadership_style` to `personality_blueprint`
- Update `compute_readiness_score()` to 5 subscores

**Data inserts (1 via insert tool):**
- ~20 more `daily_questions` across relationship/values/personality/challenge

**Server fns (new/edit):**
- `src/lib/daily.functions.ts` — add `getTodayBundle()`
- `src/lib/icebreakers.functions.ts` — enrich context
- `src/lib/insights.functions.ts` — `generateDailyInsight()` (AI, cached per day_key)
- `src/lib/analytics.functions.ts` — `trackEvent()` server fn (optional; can do client-side insert)

**Routes / components:**
- `src/routes/challenges.tsx` (new)
- `src/routes/insights.tsx` — Today bundle (4 cards), 5-point Blueprint radar, Reveal Day cards
- `src/components/NoMatchHub.tsx` (new) + wired into `/discover` & `/matches` empty states
- `src/components/ReadinessBadge.tsx` for `/profile`
- `src/components/UnveilNav.tsx` + `MobileBottomNav.tsx` — add Challenges (desktop)

**Hooks:**
- `src/hooks/use-analytics.ts` (track helper)

## Verification

- Build green; supabase linter clean
- Manual smoke: answer one of each daily category → readiness subscores update; visit /discover with no matches → NoMatchHub renders; open Reveal tab on a mutual match → Day 1 voice card shows
- Existing flows untouched: signup/login, Stripe checkout, membership upgrade, chat send/receive

## Out of scope this phase

- Video introduction recording (Day 6) — placeholder UI only
- Push notifications, Playwright E2E, admin dashboard rebuild — defer to Phase 2
