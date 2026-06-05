# 5. Matching Algorithm

Source: `src/lib/compatibility.ts`, `src/lib/matching-api.ts`, `src/lib/chemistry-ledger.ts`.

## Inputs

For each candidate pair `(A, B)`:

- **Personality axes** (`profiles.personality_axes` JSONB): five normalized 0–1 axes derived from onboarding answers + game results.
- **Communication style** (`profiles.communication_style`).
- **Emotional rhythm** (`profiles.emotional_rhythm`).
- **Archetype** (`profiles.archetype`) — categorical bonus when paired with complementary archetypes.
- **Relationship intent + interested_in + age range** — hard filters.
- **Location** — `lat_approx`/`lng_approx` rounded to ~5 km grid; haversine distance must be ≤ `discovery_radius_km` of *both* users when both have location enabled.
- **Blocks / passes / hidden** — exclude via `blocks`, `matches.passed=true`, `hidden_match_views`.

## Score

```
pairScore = 0.45 * personalityFit
          + 0.20 * communicationFit
          + 0.15 * rhythmFit
          + 0.10 * archetypeBonus
          + 0.10 * interestOverlap     // Jaccard on profiles.interests[]
```

Each fit function is `1 - normalizedDistance` on its respective axes, clamped to [0, 1]. The final score is rendered as a 0–100% on match cards and bucketed into bands (`Spark`, `Aligned`, `Resonant`, `Soulwave`).

## Mutual interest

- A swipe-right writes `matches.user_interested=true`.
- A trigger flips `mutual_interest=true` when both directions are true.
- `mutual_interest=true` is the gate for `conversations` insert, `profiles_select_matched`, contact sharing, and slow-reveal progression.

## Chemistry ledger

`chemistry-ledger.ts` aggregates ongoing signals after a mutual match:
- Daily question answer overlap
- Challenge agreement rate
- First-impression card alignment
- Message cadence / reaction reciprocity

The aggregate is written to `matches.chemistry_score` and `matches.connection_score`. These do not affect `compatibility_score` (the initial pair fit), but drive the reveal pacing and "Why we match" sheet.

## Slow reveal

`reveal.functions.ts` advances `matches.reveal_stage` (`stage_1` → `stage_2` → `stage_3`) and writes `reveal_progress` rows per day (1–7). Stage 3 unlocks the unblurred photo only when both `photo_reveal_*_consent` are true.

## Discovery query

`matching-api.ts → fetchDiscoveryFeed`:
1. Pulls candidate `profiles` filtered by intent + interested_in + age + verified-required + location radius.
2. Excludes blocked / passed / hidden / already-matched.
3. Computes `pairScore` server-side.
4. Returns top N sorted by score, paged.
