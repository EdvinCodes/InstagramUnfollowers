import { detectLocale, translations, Locale, Translations, LOCALES } from './translations';

let _locale: Locale = detectLocale();
const LOCALE_KEY = 'ig-unfollowers-locale';
const localeListeners = new Set<() => void>();

// Restore persisted locale
try {
  const saved = localStorage.getItem(LOCALE_KEY);
  if (saved && (LOCALES as readonly string[]).includes(saved)) {
    _locale = saved as Locale;
  }
} catch {
  // ignore
}

export function getLocale(): Locale {
  return _locale;
}

export function subscribeLocale(listener: () => void): () => void {
  localeListeners.add(listener);
  return () => {
    localeListeners.delete(listener);
  };
}

export function setLocale(locale: Locale): void {
  _locale = locale;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // ignore
  }
  localeListeners.forEach(listener => listener());
}

export function t<K extends keyof Translations>(key: K): Translations[K] {
  return translations[_locale][key];
}
