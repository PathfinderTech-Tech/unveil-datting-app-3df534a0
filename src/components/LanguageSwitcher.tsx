import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, setLanguage, type LanguageCode } from "@/i18n";
import { Globe, Check } from "lucide-react";

interface Props {
  variant?: "default" | "compact";
  /** When true, also renders the "languages I speak" multi-select. */
  showSpoken?: boolean;
}

const SPOKEN_KEY = "unveil_spoken_langs";

export function getSpokenLanguages(): LanguageCode[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(SPOKEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LanguageCode[]) : [];
  } catch {
    return [];
  }
}

export function setSpokenLanguages(codes: LanguageCode[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(SPOKEN_KEY, JSON.stringify(codes));
}

export function LanguageSwitcher({ variant = "default", showSpoken = false }: Props) {
  const { i18n } = useTranslation();
  const current = (i18n.language?.split("-")[0] ?? "en") as LanguageCode;
  const [spoken, setSpoken] = useState<LanguageCode[]>([]);

  useEffect(() => {
    setSpoken(getSpokenLanguages());
  }, []);

  function toggle(code: LanguageCode) {
    const next = spoken.includes(code) ? spoken.filter((c) => c !== code) : [...spoken, code];
    setSpoken(next);
    setSpokenLanguages(next);
  }

  return (
    <div className="space-y-4">
      <label className={`inline-flex items-center gap-2 ${variant === "compact" ? "text-xs" : "text-sm"}`}>
        <Globe className="h-4 w-4 text-muted-foreground" />
        <select
          value={current}
          onChange={(e) => setLanguage(e.target.value as LanguageCode)}
          className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
          aria-label="Interface language"
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.flag} {l.label}
            </option>
          ))}
        </select>
      </label>

      {showSpoken && (
        <div>
          <div className="text-xs font-medium text-foreground">Other languages you speak</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Select every language you're comfortable conversing in. Helps us match you with people you can connect with.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.map((l) => {
              const active = spoken.includes(l.code);
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => toggle(l.code)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-surface text-muted-foreground hover:bg-surface-2"
                  }`}
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                  {active && <Check className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
          {spoken.length > 0 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              You speak {spoken.length} language{spoken.length === 1 ? "" : "s"}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
