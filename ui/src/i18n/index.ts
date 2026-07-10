import i18n, { type InitOptions, type TOptions } from "i18next";
import { initReactI18next, useTranslation as useReactI18nextTranslation } from "react-i18next";

import { DEFAULT_LOCALE, i18nextResources, supportedLocales } from "./locales";

export const LOCALE_STORAGE_KEY = "paperclip.locale";

export function resolveLocale(candidate: string | null | undefined): string | undefined {
  if (!candidate) return undefined;
  if (supportedLocales.includes(candidate)) return candidate;
  const base = candidate.split("-")[0];
  if (supportedLocales.includes(base)) return base;
  return supportedLocales.find((locale) => locale.split("-")[0] === base);
}

function initialLocale(): string {
  try {
    const stored = resolveLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
    if (stored) return stored;
  } catch {
    // Ignore local storage read failures in restricted environments.
  }
  const browserLanguages = typeof navigator !== "undefined" ? navigator.languages ?? [] : [];
  return browserLanguages.map(resolveLocale).find(Boolean) ?? DEFAULT_LOCALE;
}

const i18nextOptions: InitOptions = {
  resources: i18nextResources,
  lng: initialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: supportedLocales,
  defaultNS: "translation",
  interpolation: { escapeValue: false },
  returnObjects: false,
  initAsync: false,
};

void i18n.use(initReactI18next).init(i18nextOptions).catch((error: unknown) => {
  console.error("Failed to initialize i18next", error);
});

if (typeof document !== "undefined") {
  document.documentElement.lang = i18n.language;
}

export function setLocale(locale: string) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore local storage write failures in restricted environments.
  }
  void i18n.changeLanguage(locale);
  document.documentElement.lang = locale;
}

export function t(key: string, options: TOptions = {}) {
  return i18n.t(key, options);
}

export const useTranslation = useReactI18nextTranslation;
export { i18n };
