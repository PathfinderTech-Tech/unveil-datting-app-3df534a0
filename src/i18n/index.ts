import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";
import zh from "./locales/zh.json";
import de from "./locales/de.json";
import it from "./locales/it.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import ar from "./locales/ar.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

// Country → preferred language mapping
export const COUNTRY_TO_LANG: Record<string, LanguageCode> = {
  US: "en", GB: "en", CA: "en", AU: "en", NZ: "en", IE: "en",
  FR: "fr", BE: "fr", CH: "fr", LU: "fr", MC: "fr", CI: "fr", SN: "fr", CM: "fr", MA: "fr", DZ: "fr", TN: "fr",
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es", UY: "es", BO: "es", EC: "es", CR: "es", DO: "es", GT: "es",
  PT: "pt", BR: "pt", AO: "pt", MZ: "pt",
  CN: "zh", TW: "zh", HK: "zh", SG: "zh",
  DE: "de", AT: "de",
  IT: "it", SM: "it", VA: "it",
  JP: "ja",
  KR: "ko",
  SA: "ar", AE: "ar", EG: "ar", JO: "ar", LB: "ar", IQ: "ar", KW: "ar", QA: "ar", BH: "ar", OM: "ar", YE: "ar", SY: "ar", LY: "ar",
};

export const RTL_LANGUAGES: LanguageCode[] = ["ar"];

const STORAGE_KEY = "unveil_lang";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      es: { translation: es },
      pt: { translation: pt },
      zh: { translation: zh },
      de: { translation: de },
      it: { translation: it },
      ja: { translation: ja },
      ko: { translation: ko },
      ar: { translation: ar },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

// Apply RTL direction on language change
if (typeof document !== "undefined") {
  const applyDir = (lng: string) => {
    document.documentElement.dir = RTL_LANGUAGES.includes(lng as LanguageCode) ? "rtl" : "ltr";
    document.documentElement.lang = lng;
  };
  applyDir(i18n.language);
  i18n.on("languageChanged", applyDir);
}

export function setLanguage(code: LanguageCode) {
  i18n.changeLanguage(code);
  if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, code);
}

export function setLanguageFromCountry(countryCode: string) {
  const lang = COUNTRY_TO_LANG[countryCode.toUpperCase()] ?? "en";
  setLanguage(lang);
}

export default i18n;
