import { CONTINENTS, COUNTRY_BY_CODE, type Continent } from "@/lib/countries";

/**
 * Radius value encoding (mirrors profiles.discovery_radius_km comment):
 *   > 0  literal km
 *    0   "Anywhere in the world"
 *   -1   "Anywhere in my country"
 *   -2   "Anywhere in my continent"
 */
export const RADIUS_OPTIONS: { value: number; labelKey: string }[] = [
  { value: 10,  labelKey: "10 km" },
  { value: 25,  labelKey: "25 km" },
  { value: 50,  labelKey: "50 km" },
  { value: 100, labelKey: "100 km" },
  { value: 250, labelKey: "250 km" },
  { value: -1, labelKey: "Anywhere in my country" },
  { value: -2, labelKey: "Anywhere in my continent" },
  { value:  0, labelKey: "Anywhere in the world" },
];

export type RadiusValue = {
  radius_km: number;
  open_to_international: boolean;
};

type Props = {
  value: RadiusValue;
  onChange: (v: RadiusValue) => void;
  /** Used to display "Anywhere in [Africa]" with the continent name. */
  countryCode?: string | null;
};

export function MatchRadiusPicker({ value, onChange, countryCode }: Props) {
  const country = countryCode ? COUNTRY_BY_CODE[countryCode] : null;
  const continent: Continent | null = country?.continent ?? null;
  const continentName = continent ? CONTINENTS.find((c) => c.code === continent)?.name : null;

  function label(opt: { value: number; labelKey: string }): string {
    if (opt.value === -1 && country) return `Anywhere in ${country.name}`;
    if (opt.value === -2 && continentName) return `Anywhere in ${continentName}`;
    return opt.labelKey;
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Matching radius
        </div>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((opt) => {
            const active = value.radius_km === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...value, radius_km: opt.value })}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-surface"
                }`}
              >
                {label(opt)}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-primary"
          checked={value.open_to_international}
          onChange={(e) => onChange({ ...value, open_to_international: e.target.checked })}
        />
        <span>
          <span className="font-medium text-foreground">Open to international matches</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            When enabled, you can be matched globally. Distance becomes informational only.
          </span>
        </span>
      </label>
    </div>
  );
}
