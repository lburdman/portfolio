import type { Locale, UIStrings } from './types';
import { en } from './en';
import { es } from './es';
import { DEFAULT_LOCALE } from './types';

export type { Locale, UIStrings };
export { DEFAULT_LOCALE };

const strings: Record<Locale, UIStrings> = { en, es };

export function useTranslations(locale: Locale): UIStrings {
  return strings[locale];
}

export function getLocaleFromURL(url: URL): Locale {
  const [, firstSegment] = url.pathname.split('/');
  if (firstSegment === 'es') return 'es';
  return DEFAULT_LOCALE;
}

export function getAlternateURL(url: URL, targetLocale: Locale, base: string): string {
  const pathname = url.pathname;
  // Strip base prefix if present
  const strippedPath = base && pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  const segments = strippedPath.split('/').filter(Boolean);

  // Remove existing locale prefix if present
  const isLocalePrefix = segments[0] === 'en' || segments[0] === 'es';
  const pathSegments = isLocalePrefix ? segments.slice(1) : segments;

  if (targetLocale === DEFAULT_LOCALE) {
    // EN: no prefix, just base + path
    const path = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '/';
    return `${base}${path}`;
  } else {
    // ES: prefix with locale
    const path = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '';
    return `${base}/${targetLocale}${path}`;
  }
}

export function localizeURL(path: string, locale: Locale, base: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) {
    return `${base}${normalized}`;
  }
  return `${base}/${locale}${normalized}`;
}
