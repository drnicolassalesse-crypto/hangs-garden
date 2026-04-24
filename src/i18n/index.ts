import { useSyncExternalStore } from 'react';
import en from './en';
import vi from './vi';

export type Locale = 'en' | 'vi';
type Translations = Record<string, string>;

const dictionaries: Record<Locale, Translations> = { en, vi };

const STORAGE_KEY = 'planta.lang';
const DEFAULT_LOCALE: Locale = 'vi';

let currentLocale: Locale = readLocale();
const listeners = new Set<() => void>();

function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'vi') return stored;
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
  const suffix = count === 1 && currentLocale === 'en' ? '_one' : '_other';
  return t(`${baseKey}${suffix}`, { count, ...params });
}
