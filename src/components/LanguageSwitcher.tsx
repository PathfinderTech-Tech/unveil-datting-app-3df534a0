import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, setLanguage, type LanguageCode } from "@/i18n";
import { Globe } from "lucide-react";

interface Props {
  variant?: "default" | "compact";
}

export function LanguageSwitcher({ variant = "default" }: Props) {
  const { i18n } = useTranslation();
  const current = (i18n.language?.split("-")[0] ?? "en") as LanguageCode;

  return (
    <label className={`inline-flex items-center gap-2 ${variant === "compact" ? "text-xs" : "text-sm"}`}>
      <Globe className="h-4 w-4 text-muted-foreground" />
      <select
        value={current}
        onChange={(e) => setLanguage(e.target.value as LanguageCode)}
        className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-primary"
        aria-label="Language"
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
