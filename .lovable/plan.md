# UNVEIL Restructure — Compatibility First, Games Second

A large frontend restructure to reframe the app around three clear phases. Backend schema stays as-is; we use existing tables (`onboarding_answers`, `profiles`, `matches`, `challenge_results`, `spark_answers`) and add new client routes/sections. No DB migrations needed for this pass.

## Phase 1 — Discover Yourself (replaces current scattered onboarding)

Rebuild `/onboarding` as a guided multi-step "Discover Yourself" flow with 10 sections:

1. Relationship Goals
2. Lifestyle Preferences
3. Communication Style
4. Love Languages
5. Attachment Style
6. Family & Children
7. Values & Beliefs
8. Personality Insights
9. Green Flag Preferences
10. Red Flag Preferences

- Each section: 3–5 questions, with Back / Next / Skip controls (consistent nav across all steps).
- Progress bar showing "Section X of 10".
- Answers persisted to `onboarding_answers.answers` (jsonb) per section.
- On completion: compute a local Compatibility Profile summary (personality, communication style, headline match score) and write derived fields to `profiles` (archetype, emotional_rhythm, communication_style, compatibility_score). Mark `onboarding_complete = true`.
- New `/discover-summary` route shows the generated profile before unlocking matches.

## Phase 2 — Match Discovery (refresh of `/matches`)

- Gate matches behind `onboarding_complete`. If false, redirect to `/onboarding` with a clear CTA.
- Match card redesigned to lead with compatibility metrics rather than photo:
  - Overall Compatibility %
  - Communication Match %
  - Lifestyle Match %
  - Values Match %
  - Relationship Goals Match %
- Compatibility values derived from the overlap between the two users' `onboarding_answers` + `emotional_rhythm` (client-side scoring for now, deterministic per pair).
- Photo de-emphasized: small avatar, metrics dominate the card.

## Phase 3 — Play Together (locked until mutual match)

Rename `/challenges` → `/play` (keep `/challenges` as a redirect for safety) titled "Play Together".

- Hub page with 6 game tiles, each locked until the user has at least one mutual match. Tiles open with a partner picker.
- Games:
  1. **Red Flag / Green Flag** — existing challenge experience, kept.
  2. **Predict Your Match** — guess partner's answer to a prompt; reveal correctness.
  3. **This or That** — rapid binary compatibility round.
  4. **Story Builder** — turn-based story; alternating contributions saved to conversation.
  5. **Couple Quiz Battle** — simultaneous answers, scored on match + speed; shows Compatibility Streak, Shared Interests, Curiosity Score.
  6. **Relationship Escape Room** — sequential puzzles; outputs a Relationship Dynamic Score (teamwork / communication / leadership / patience).
- Each game writes results to `challenge_results` (reusing existing schema with a `meta`-style payload in `picks`).

## Navigation & journey

Update `UnveilNav` and `/index` CTAs to reflect the new linear journey:

```text
Create Account → Discover Yourself → Compatibility Profile → Matches
→ Mutual Match → Play Together → Date Planning → Contact Sharing → Passport
```

- Header hides Play / Matches links until prerequisites are met (still reachable by URL but with a gating screen).

## Technical scope

**Files to add**
- `src/routes/discover-summary.tsx` — generated profile recap.
- `src/routes/play.tsx` — hub (replaces `/challenges` as primary).
- `src/routes/play.predict.tsx`, `play.this-or-that.tsx`, `play.story.tsx`, `play.quiz.tsx`, `play.escape.tsx` — game routes.
- `src/lib/compatibility.ts` — scoring helpers (overall + 4 sub-scores) from onboarding answers.
- `src/lib/discover-sections.ts` — section/question definitions.

**Files to edit**
- `src/routes/onboarding.tsx` — full rebuild as 10-section guided flow.
- `src/routes/matches.tsx` — psychology-first card layout + onboarding gate.
- `src/routes/challenges.tsx` — convert to redirect/alias of `/play`.
- `src/routes/index.tsx` — update CTA to "Discover Yourself".
- `src/components/UnveilNav.tsx` — phase-aware links.

**Out of scope for this pass**
- DB schema changes (existing tables cover everything needed).
- Realtime sync for simultaneous games — Quiz Battle and Escape Room will be turn-based first; realtime can be a follow-up.
- AI-generated personality narratives — summaries are template-based for now.

**Design**
- Keep current dark purple premium look and existing tokens in `src/styles.css`. No new color system.

## Suggested order

1. Discover Yourself flow + compatibility scoring lib + summary page.
2. Matches refresh with new metrics and gating.
3. Play Together hub + the 6 game routes (turn-based versions).
4. Nav + index polish to reflect new journey.

This is a multi-turn build. After you approve, I'll start with step 1 and check in before moving to step 2.