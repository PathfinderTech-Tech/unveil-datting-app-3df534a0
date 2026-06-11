# Plan — Global Location + Location Trust Verification

This is large and touches onboarding, profiles, discovery, and verification. I want to split it into two reviewable stages so you can approve / adjust before I move on, exactly like the previous master update.

---

## Stage A — Global Location System (Step 1)

### Database (one migration)
Add to `profiles`:
- `country_code TEXT` — ISO-3166-1 alpha-2 (e.g. `CI`, `US`, `FR`)
- `country_name TEXT` — display name
- `region TEXT` — optional state/province/region
- `city_name TEXT` — free-text + standardized when possible
- `match_radius_km INTEGER` — nullable; sentinel values `-1` country, `-2` continent, `0` global
- `match_continent TEXT` — only used when radius sentinel = `-2` (e.g. `AF`)
- `open_to_international BOOLEAN DEFAULT false`

Backfill: copy existing `city` → `city_name`, derive `country_code` from existing `country` text where unambiguous (ISO lookup table), leave others null for user to confirm. Existing `discovery_radius_km` preserved → mirrored into `match_radius_km` when set.

`profiles_guard_update` trigger: allow user edits to all new fields.

`discover_profiles` RPC: extend filters to honor `open_to_international`, country sentinel, and continent sentinel without breaking current km-based filtering.

### Data
- New static module `src/lib/countries.ts` — full ISO list (≈250 entries) with `code, name, name_fr, continent, has_states`.
- `src/lib/regions.ts` — region lists only for countries where it's meaningful (US, CA, AU, IN, BR, NG, ZA, MX, DE, GB, FR départements, CI districts). Other countries → region field hidden.

### UI
- New `<LocationPicker />` component: searchable country combobox (cmdk), city text input with optional Nominatim/OSM autocomplete (graceful fallback to free text — no extra API key required, public endpoint), conditional region dropdown.
- New `<MatchRadiusPicker />`: 10/25/50/100/250 km, "Anywhere in my country", "Anywhere in [continent]", "Anywhere in the world", + "Open to international matches" toggle.
- Wire into `onboarding.tsx` (replace existing location step) and `settings.tsx` + `NearbyDiscoverySettings.tsx`.
- Auto-detect country via browser `Intl.DateTimeFormat().resolvedOptions().timeZone` → country map fallback; if GPS already granted, reverse-geocode via Nominatim.
- Discovery filters (`MatchFilters.tsx`): add Country / Region / "International only" filters.

### i18n
- All new strings added to `en.json` and `fr.json`; `es.json`/`pt.json` keys present with English fallback so they're ready when translated.

---

## Stage B — Location Trust Verification (Step 2)

### Database (second migration, after Stage A approved)
New table `location_verifications`:
- `user_id`, `created_at`
- `profile_country_code`, `device_country_code`, `ip_country_code`, `gps_country_code`
- `match_result` ENUM: `match | mismatch | partial`
- `risk_level` ENUM: `low | medium | high`
- `vpn_suspected BOOLEAN`
- `selfie_path TEXT` (reuse `verification-docs` bucket)
- `user_confirmed_traveling BOOLEAN DEFAULT false`

Add to `profiles`:
- `location_risk_level TEXT DEFAULT 'low'`
- `location_mismatch_count INTEGER DEFAULT 0`

### Server
- `src/lib/location-trust.functions.ts` — server fn that takes selfie + signals, calls IP geo (Cloudflare `CF-IPCountry` header — free, no key), computes risk, writes row, returns `{ result, risk, message }`.
- Hook into existing selfie verification flow in `src/routes/avatar.tsx` (current trust check). Existing `markSelfieVerified` stays; new fn runs alongside and records the trust signal.
- Risk rules exactly as spec: low = match, medium = single mismatch, high = repeated mismatches in short window OR VPN flag.

### UI
- New `<LocationMismatchModal />` shown after selfie when result = `mismatch`:
  - Copy: "We detected that your current location differs from the country listed on your profile. If you are traveling, you may continue and update your location preferences."
  - 3 buttons: **I'm traveling** (sets `user_confirmed_traveling=true`, proceeds), **Update my country** (opens LocationPicker), **Retry verification**.
- No automatic bans. High-risk accounts get a soft flag surfaced to admin review only (no UX change beyond the modal).

---

## Out of scope / explicit non-goals
- No paid government ID verification (kept retired per Stage 4 of previous update).
- No changes to messaging quota, premium, or Stripe.
- No new third-party paid APIs. Country detection uses browser Intl + Cloudflare IP header; city autocomplete uses public Nominatim with throttle + free-text fallback.

---

## Order of execution
1. Stage A migration (you approve SQL).
2. Stage A code (countries module, LocationPicker, radius picker, onboarding + settings + discovery wiring, i18n).
3. Stop, show preview, wait for your approval.
4. Stage B migration.
5. Stage B server fn + modal + avatar wiring.
6. Stop, show preview.

Confirm and I'll start with the Stage A migration.
