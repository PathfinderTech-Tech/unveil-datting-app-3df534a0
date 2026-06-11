import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Globe, MapPin, Search } from "lucide-react";
import { COUNTRIES, COUNTRY_BY_CODE, REGIONS, detectCountryFromTimezone, type Country } from "@/lib/countries";

export type LocationValue = {
  country_code: string | null;
  country: string | null;      // display name (matches profiles.country)
  state_region: string | null; // optional
  city: string | null;
};

export const EMPTY_LOCATION: LocationValue = {
  country_code: null, country: null, state_region: null, city: null,
};

type Props = {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  required?: boolean;
  /** Auto-fill country from browser timezone if nothing selected yet. */
  autoDetect?: boolean;
  /** Internationalised labels (defaults to English). */
  labels?: Partial<{
    country: string; city: string; region: string;
    countryPlaceholder: string; cityPlaceholder: string; regionPlaceholder: string;
    searchPlaceholder: string; noResults: string;
  }>;
};

const DEFAULT_LABELS = {
  country: "Country",
  city: "City",
  region: "State / Province / Region (optional)",
  countryPlaceholder: "Select your country…",
  cityPlaceholder: "Type your city",
  regionPlaceholder: "Optional",
  searchPlaceholder: "Search countries…",
  noResults: "No countries match",
};

export function LocationPicker({ value, onChange, required, autoDetect = true, labels }: Props) {
  const L = { ...DEFAULT_LABELS, ...(labels ?? {}) };
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!autoDetect || value.country_code) return;
    const code = detectCountryFromTimezone();
    if (!code) return;
    const c = COUNTRY_BY_CODE[code];
    if (c) onChange({ ...value, country_code: c.code, country: c.name });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected: Country | null = value.country_code ? COUNTRY_BY_CODE[value.country_code] ?? null : null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.name_fr.toLowerCase().includes(q) ||
        c.code.toLowerCase() === q,
    );
  }, [query]);

  const regions = selected?.hasRegions ? REGIONS[selected.code] ?? [] : [];

  return (
    <div className="space-y-3">
      {/* COUNTRY */}
      <div>
        <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {L.country}{required && " *"}
        </div>
        <div className="relative" ref={popRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-left text-sm transition hover:border-foreground/30"
          >
            <span className="flex items-center gap-2 truncate">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
              {selected ? (
                <span className="truncate">
                  <span className="text-foreground">{selected.name}</span>
                  <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{selected.code}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">{L.countryPlaceholder}</span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>

          {open && (
            <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-border bg-card shadow-xl">
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={L.searchPlaceholder}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filtered.length === 0 && (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground">{L.noResults}</div>
                )}
                {filtered.map((c) => {
                  const active = c.code === value.country_code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        onChange({
                          country_code: c.code,
                          country: c.name,
                          // reset region when changing country
                          state_region: c.code === value.country_code ? value.state_region : null,
                          city: value.city,
                        });
                        setOpen(false);
                        setQuery("");
                      }}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition ${
                        active ? "bg-primary/5 text-primary" : "hover:bg-surface"
                      }`}
                    >
                      <span className="truncate">
                        {c.name}
                        <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{c.code}</span>
                      </span>
                      {active && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CITY */}
      <div>
        <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {L.city}{required && " *"}
        </div>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={value.city ?? ""}
            onChange={(e) => onChange({ ...value, city: e.target.value })}
            placeholder={L.cityPlaceholder}
            className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm transition placeholder:text-muted-foreground hover:border-foreground/30 focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* REGION — only shown for countries that have a curated list */}
      {selected?.hasRegions && (
        <div>
          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {L.region}
          </div>
          <select
            value={value.state_region ?? ""}
            onChange={(e) => onChange({ ...value, state_region: e.target.value || null })}
            className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm transition hover:border-foreground/30 focus:border-primary focus:outline-none"
          >
            <option value="">{L.regionPlaceholder}</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
