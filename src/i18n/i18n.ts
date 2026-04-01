import { detectLocale, translations, Locale, Translations } from './translations';

let _locale: Locale = detectLocale();
const LOCALE_KEY = 'ig-unfollowers-locale';

// Restore persisted locale
try {
  const saved = localStorage.getItem(LOCALE_KEY);
  if (
    saved === 'en' ||
    saved === 'pt-BR' ||
    saved === 'es' ||
    saved === 'fr' ||
    saved === 'it' ||
    saved === 'de'
  ) {
    _locale = saved;
  }
} catch {
  // ignore
}

export function getLocale(): Locale {
  return _locale;
}

export function setLocale(locale: Locale): void {
  _locale = locale;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // ignore
  }
}

export function t<K extends keyof Translations>(key: K): Translations[K] {
  return translations[_locale][key];
}
