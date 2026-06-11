import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { DiscoverFilters } from "@/lib/matching-api";
import { Filter, X } from "lucide-react";
import { COUNTRIES, CONTINENTS, REGIONS, COUNTRY_BY_CODE } from "@/lib/countries";

const LANGS = [
  ["en","English"],["es","Español"],["fr","Français"],["pt","Português"],["de","Deutsch"],
  ["it","Italiano"],["zh","中文"],["ja","日本語"],["ko","한국어"],["ar","العربية"],
] as const;

const INTENTS = ["friendship","dating","serious","exploring","open"] as const;

export type FilterState = Required<Pick<DiscoverFilters, "nearbyOnly">> & {
  radiusKm: number;
  country: string;       // ISO alpha-2, "" = any
  region: string;        // free-text, "" = any
  continent: string;     // ISO continent, "" = any
  internationalOnly: boolean;
  language: string;
  intent: string;
  ageMin: number;
  ageMax: number;
};

export const DEFAULT_FILTERS: FilterState = {
  nearbyOnly: false,
  radiusKm: 80,
  country: "",
  region: "",
  continent: "",
  internationalOnly: false,
  language: "",
  intent: "",
  ageMin: 18,
  ageMax: 70,
};

export function MatchFilters({ value, onChange }: { value: FilterState; onChange: (v: FilterState) => void }) {
  const [open, setOpen] = useState(false);
  const [defaultRadius, setDefaultRadius] = useState(80);
  const [locOn, setLocOn] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("profiles")
        .select("discovery_radius_km, location_enabled, country_code")
        .eq("id", u.user.id).maybeSingle();
      if (data?.discovery_radius_km && data.discovery_radius_km > 0) setDefaultRadius(data.discovery_radius_km);
      setLocOn(!!data?.location_enabled);
    })();
  }, []);

  const active =
    value.nearbyOnly || value.country || value.region || value.continent ||
    value.internationalOnly || value.language || value.intent ||
    value.ageMin !== 18 || value.ageMax !== 70;

  const countryRegions = value.country ? REGIONS[value.country] ?? [] : [];
  const hasCountryRegions = countryRegions.length > 0;

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onChange({ ...value, nearbyOnly: !value.nearbyOnly, radiusKm: value.radiusKm || defaultRadius })}
          disabled={!locOn}
          title={locOn ? "" : "Enable Nearby Discovery in Settings"}
          className={`rounded-full border px-3 py-1.5 text-xs transition ${
            value.nearbyOnly ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-surface"
          } disabled:opacity-40`}
        >
          📍 Nearby
        </button>
        <button
          onClick={() => onChange({ ...value, internationalOnly: !value.internationalOnly })}
          className={`rounded-full border px-3 py-1.5 text-xs transition ${
            value.internationalOnly ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-surface"
          }`}
        >
          🌍 International only
        </button>
        <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-surface">
          <Filter className="h-3 w-3" /> Filters {active && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />}
        </button>
        {active && (
          <button onClick={() => onChange(DEFAULT_FILTERS)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Distance (when Nearby)">
            <select
              value={value.radiusKm}
              onChange={(e) => onChange({ ...value, radiusKm: Number(e.target.value) })}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value={10}>10 km</option>
              <option value={25}>25 km</option>
              <option value={50}>50 km</option>
              <option value={100}>100 km</option>
              <option value={250}>250 km</option>
              <option value={0}>Anywhere in the world</option>
            </select>
          </Field>

          <Field label="Country">
            <select
              value={value.country}
              onChange={(e) => onChange({ ...value, country: e.target.value, region: "" })}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">Any</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </Field>

          <Field label="Continent">
            <select
              value={value.continent}
              onChange={(e) => onChange({ ...value, continent: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">Any</option>
              {CONTINENTS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </Field>

          {hasCountryRegions && (
            <Field label={`Region in ${COUNTRY_BY_CODE[value.country]?.name ?? ""}`}>
              <select
                value={value.region}
                onChange={(e) => onChange({ ...value, region: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
              >
                <option value="">Any</option>
                {countryRegions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
          )}

          <Field label="Language">
            <select value={value.language} onChange={(e) => onChange({ ...value, language: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
              <option value="">Any</option>
              {LANGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Field>

          <Field label="Connection / Relationship intent">
            <select value={value.intent} onChange={(e) => onChange({ ...value, intent: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm">
              <option value="">Any</option>
              {INTENTS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>

          <Field label={`Age: ${value.ageMin}–${value.ageMax}`}>
            <div className="flex items-center gap-2">
              <input type="number" min={18} max={value.ageMax} value={value.ageMin}
                onChange={(e) => onChange({ ...value, ageMin: Math.max(18, Number(e.target.value) || 18) })}
                className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
              <span className="text-xs text-muted-foreground">to</span>
              <input type="number" min={value.ageMin} max={99} value={value.ageMax}
                onChange={(e) => onChange({ ...value, ageMax: Math.min(99, Number(e.target.value) || 99) })}
                className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm" />
            </div>
          </Field>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
