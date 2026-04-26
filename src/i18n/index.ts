import { useSyncExternalStore } from 'react';
import en from './en';
import vi from './vi';
import th from './th';
import fr from './fr';
import es from './es';

export type Locale = 'en' | 'vi' | 'th' | 'fr' | 'es';
type Translations = Record<string, string>;

const dictionaries: Record<Locale, Translations> = { en, vi, th, fr, es };

const SUPPORTED_LOCALES: Locale[] = ['en', 'vi', 'th', 'fr', 'es'];

const STORAGE_KEY = 'planta.lang';
const DEFAULT_LOCALE: Locale = 'vi';

let currentLocale: Locale = readLocale();
const listeners = new Set<() => void>();

function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED_LOCALES.includes(stored as Locale)) return stored as Locale;
  } catch { /* SSR / test fallback */ }
  return DEFAULT_LOCALE;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale): void {
  if (locale === currentLocale) return;
  currentLocale = locale;
  try { localStorage.setItem(STORAGE_KEY, locale); } catch { /* noop */ }
  try { document.documentElement.lang = locale; } catch { /* test env */ }
  listeners.forEach((cb) => cb());
}

export function useLocale(): Locale {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => currentLocale,
  );
}

export function t(key: string, params?: Record<string, string | number>): string {
  const dict = dictionaries[currentLocale];
  let value = dict[key] ?? dictionaries.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replaceAll(`{{${k}}}`, String(v));
    }
  }
  return value;
}

export function tp(
  baseKey: string,
  count: number,
  params?: Record<string, string | number>,
): string {
  const useSingular = count === 1 && (currentLocale === 'en' || currentLocale === 'fr' || currentLocale === 'es');
  const suffix = useSingular ? '_one' : '_other';
  return t(`${baseKey}${suffix}`, { count, ...params });
}
