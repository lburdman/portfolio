/**
 * Public surface of the i18n layer.
 *
 * Everything the rest of the site needs is re-exported here; nothing else
 * should import `./en`, `./es` or `./types` directly.
 *
 * Two rules this module exists to keep enforceable (docs/ARCHITECTURE.md §3):
 *
 * 1. Components never fetch translations. A page resolves `locale`, calls
 *    `useTranslations(locale)` once, and passes `t` down as a prop.
 * 2. Every URL goes through `src/i18n/routing.ts`. No template concatenates a
 *    base, a locale prefix and a route by hand.
 */

import { en } from './en';
import { es } from './es';
import { type Locale, type UIStrings } from './types';

export { DEFAULT_LOCALE, LOCALES, isLocale } from './types';
export type { Locale, PerDomain, UIStrings } from './types';

export { absoluteURL, canonicalFor, getAlternates, localeFromPath, localizePath, routePath } from './routing';
export type { AlternateKey, Alternates } from './routing';

import { localeFromPath } from './routing';

const DICTIONARIES: Record<Locale, UIStrings> = { en, es };

/** The dictionary for a locale. The only way to read UI copy. */
export function useTranslations(locale: Locale): UIStrings {
  return DICTIONARIES[locale];
}

/** Convenience wrapper for Astro pages, which hold a `URL` rather than a path. */
export function localeFromURL(url: URL, base: string): Locale {
  return localeFromPath(url.pathname, base);
}

/** The locale that is *not* the given one — what a language switcher links to. */
export function otherLocale(locale: Locale): Locale {
  return locale === 'en' ? 'es' : 'en';
}
