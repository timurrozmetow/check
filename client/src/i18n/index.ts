import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ru from "./locales/ru.json";
import tr from "./locales/tr.json";

export const SUPPORTED_LANGS = ["ru", "tr"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

/** Нормализует код языка к поддерживаемому (ru | tr), иначе ru. */
export function normalizeLang(value: string | undefined | null): Lang {
  const base = (value ?? "").slice(0, 2).toLowerCase();
  return (SUPPORTED_LANGS as readonly string[]).includes(base)
    ? (base as Lang)
    : "ru";
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      tr: { translation: tr },
    },
    fallbackLng: "ru",
    supportedLngs: [...SUPPORTED_LANGS],
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "lang",
      caches: ["localStorage"],
    },
  });

/** Синхронизируем атрибут <html lang> с текущим языком. */
function syncHtmlLang(lng: string) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = normalizeLang(lng);
  }
}
syncHtmlLang(i18n.language);
i18n.on("languageChanged", syncHtmlLang);

export default i18n;
