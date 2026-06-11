# Stage B — Location Trust Verification + Travel Mode

Approved scope extended with travel mode, dual home/current country, trust levels, and moderator signals. Below is exactly what I will build.

---

## 1. Database migration (single migration)

### `profiles` — add columns
- `home_country_code TEXT` — backfilled from existing `country_code`. Never changes when user toggles travel mode.
- `home_country_name TEXT` — display name mirror.
- `current_country_code TEXT` — where the user currently is. Defaults to home.
- `current_country_name TEXT`
- `travel_status TEXT DEFAULT 'home'` — enum-like: `home | travelling`.
- `travel_started_at TIMESTAMPTZ`
- `verified_country_code TEXT` — last country the selfie verification confirmed them in.
- `trust_level TEXT DEFAULT 'unverified'` — `unverified | verified | trusted | identity_verified`.
- `location_risk_score INTEGER DEFAULT 0` — 0–100.
- `location_mismatch_count INTEGER DEFAULT 0`.

Update `profiles_guard_update` trigger:
- Users CAN edit: `home_country_*`, `current_country_*`, `travel_status`, `travel_started_at`.
- Users CANNOT edit: `verified_country_code`, `trust_level`, `location_risk_score`, `location_mismatch_count` (managed by server fn / admin).

Backfill: set `home_country_code = country_code`, `current_country_code = country_code`, `home_country_name = country`, `current_country_name = country` for all existing rows.

### New table `location_verifications`
- `id UUID PK`
- `user_id UUID` → auth.users, cascade
- `created_at TIMESTAMPTZ DEFAULT now()`
- `profile_country_code TEXT` (home at the time)
- `current_country_code TEXT` (declared current)
- `device_country_code TEXT` (browser locale / timezone)
- `ip_country_code TEXT` (Cloudflare `CF-IPCountry`)
- `gps_country_code TEXT` (reverse-geocoded, nullable)
- `match_result TEXT` — `match | partial | mismatch`
- `risk_level TEXT` — `low | medium | high`
- `vpn_suspected BOOLEAN DEFAULT false`
- `selfie_path TEXT` (reuse `verification-docs` bucket)
- `user_confirmed_traveling BOOLEAN DEFAULT false`

GRANTS: `SELECT` to authenticated (own rows only via RLS), `ALL` to service_role.
RLS: user can read own rows; only service_role inserts/updates.

### Helper function
`set_user_travel_mode(_current_country_code TEXT, _travelling BOOLEAN)` — security-definer, validates input, updates `current_country_*`, `travel_status`, `travel_started_at`. Never touches `home_country_*`.

---

## 2. Server functions

### `src/lib/location-trust.functions.ts`
- `recordLocationVerification({ selfiePath, deviceCountry, gpsCountry, currentCountry })`
  - middleware: `requireSupabaseAuth`
  - reads IP country from `CF-IPCountry` header
  - loads profile (`home_country_code`, `current_country_code`, `location_mismatch_count`)
  - computes `match_result`: all 3 (device, ip, gps where present) align with `current_country_code` → match; one differs → partial; two+ differ → mismatch
  - computes `risk_level`:
    - low = match
    - medium = partial OR single mismatch
    - high = repeated mismatches (`location_mismatch_count >= 2` in last 7 days) OR `vpn_suspected`
  - `vpn_suspected` heuristic: ip ≠ device AND ip ≠ gps when gps present
  - inserts `location_verifications` row (via service-role import inside handler)
  - on match: bumps `trust_level` to `trusted` if currently `verified`; sets `verified_country_code = current_country_code`
  - on mismatch: increments `location_mismatch_count`, sets `location_risk_score` (low=0, medium=40, high=80)
  - returns `{ result, risk, message, requiresAction }`

### `src/lib/travel-mode.functions.ts`
- `setTravelMode({ currentCountryCode, travelling })` — calls `set_user_travel_mode` RPC.
- `endTravelMode()` — resets `current_country = home_country`, `travel_status = 'home'`.

---

## 3. UI components

### `src/components/TravelModeToggle.tsx`
- Shown in `/settings` and on `/profile`.
- Banner when `travel_status='travelling'`: **"Currently travelling in [Country]"** with "End travel mode" button.
- When off: "I'm travelling" button → opens a small dialog with `<LocationPicker />` to pick current country.

### `src/components/LocationMismatchModal.tsx`
- Shown after selfie if `recordLocationVerification` returns `mismatch`.
- Copy: *"We detected that your current location differs from the country listed on your profile. If you are traveling, you may continue and update your location preferences."*
- 3 buttons:
  - **I'm travelling** → opens travel-country picker, calls `setTravelMode`, marks `user_confirmed_traveling=true`.
  - **Update my home country** → opens `<LocationPicker />`, updates `home_country_*`.
  - **Retry verification** → closes modal, returns to selfie capture.

### `src/components/TrustLevelBadge.tsx`
- Renders pill for `unverified | verified | trusted | identity_verified`. Reused on profile, match cards, chat header.
- `identity_verified` is reserved (no UI to obtain it yet — kept as a forward-compatible slot).

### Profile location display (`/profile`, public passport)
- Show **Home: [Country]** and (if travelling) **Currently in: [Country]** + travel badge.
- Verification line: *"Verified in [verified_country_code]"* when present.

---

## 4. Wiring

- `src/routes/avatar.tsx` selfie flow: after existing `markSelfieVerified` succeeds, also call `recordLocationVerification`. If result is `mismatch`, show `<LocationMismatchModal />`. Existing flow unchanged on `match`.
- `src/routes/settings.tsx`: add `<TravelModeToggle />` section under existing location settings.
- `src/routes/profile.tsx`: show home/current/travel/verified country block.
- `src/components/LocationPicker.tsx`: no changes (reused).

---

## 5. Moderator/admin signals (data only, no new dashboard UI yet)

- All new columns + the `location_verifications` table are queryable by admins via existing `/admin` patterns. A future admin tab can render them — out of scope for this stage to avoid scope creep, but the data is captured starting now so history is available retroactively. I will note this as "ready for moderator dashboard" in the closing message.

---

## 6. Safety guarantees (explicit non-actions)

- No automatic bans for mismatches.
- No paid government ID flow built — `identity_verified` is a placeholder enum value only.
- No changes to messaging quota, Stripe, RLS on existing tables, or the selfie verification gate itself.
- No new paid third-party APIs. IP country uses Cloudflare's free `CF-IPCountry` header; device country uses browser `Intl`; GPS country uses public Nominatim only when GPS permission is already granted.

---

## Order of execution

1. Submit migration (you approve).
2. After migration runs: write server fns, UI components, wire into avatar/settings/profile.
3. Preview screenshots, stop for review.

Confirm and I'll submit the migration.
