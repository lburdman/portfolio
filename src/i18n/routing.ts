import { DEFAULT_LOCALE, isLocale, type Locale } from './types';

/**
 * Every URL in the site is built here. Nothing else concatenates a base path,
 * a locale prefix and a route.
 *
 * Two deployment facts make this module load-bearing:
 *
 * 1. The site is served from a subpath (`base: '/portfolio'`), so a bare
 *    `/projects` in a template is a broken link in production.
 * 2. Astro runs `trailingSlash: 'always'` with `build.format: 'directory'`, so
 *    the *only* valid form of every URL ends in `/`.
 *
 * The audit found both rules violated at once: `hreflang` alternates were
 * emitted relative (Google discards those outright) *and* without the trailing
 * slash their own canonical carried, which invalidates the locale pairing even
 * after the URLs are made absolute. Canonical and alternates are therefore
 * generated from the same normalisation below — `canonicalFor(p)` is by
 * construction identical to `getAlternates(p)[localeFromPath(p)]`, and
 * `tests/routing.test.ts` asserts exactly that.
 *
 * Convention for every parameter here:
 * - `path` may be a bare route (`/projects`), an already-based path
 *   (`/portfolio/projects/`) or an already-localized one
 *   (`/portfolio/es/projects/`). All three normalise to the same result, so
 *   these helpers are safe to apply to `Astro.url.pathname` and are idempotent.
 * - `base` is the deployment base path — `'/portfolio'` or `''` for a root
 *   deployment. Trailing slashes are tolerated.
 * - `origin` is a scheme + host with no trailing slash, e.g.
 *   `https://lburdman.github.io`.
 */

/** The keys emitted as `<link rel="alternate" hreflang="...">`. */
export type AlternateKey = Locale | 'x-default';

/** Absolute URLs for every hreflang key. Never relative — see audit 1.2. */
export type Alternates = Record<AlternateKey, string>;

/** `'/portfolio/'` and `'portfolio'` both normalise to `'/portfolio'`; `'/'` to `''`. */
function normalizeBase(base: string): string {
  const trimmed = base.trim().replace(/\/+$/, '');
  if (trimmed === '') return '';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/** Splits a path into non-empty segments, ignoring query and hash. */
function segmentsOf(path: string): string[] {
  const withoutQuery = path.split(/[?#]/, 1)[0] ?? '';
  return withoutQuery.split('/').filter((segment) => segment.length > 0);
}

/** Joins segments into a directory-format path under `base`, always slash-terminated. */
function buildPath(base: string, segments: readonly string[]): string {
  const suffix = segments.length > 0 ? `${segments.join('/')}/` : '';
  return `${base}/${suffix}`;
}

/**
 * Strips the base prefix and any leading locale segment, leaving the
 * locale-independent route: `/portfolio/es/projects/` → `['projects']`.
 */
function routeSegments(path: string, base: string): string[] {
  const normalizedBase = normalizeBase(base);
  const baseSegments = segmentsOf(normalizedBase);
  let segments = segmentsOf(path);

  // Drop the base prefix only when it is genuinely a prefix.
  const hasBase = baseSegments.every((segment, i) => segments[i] === segment);
  if (hasBase) segments = segments.slice(baseSegments.length);

  const first = segments[0];
  if (first !== undefined && isLocale(first)) segments = segments.slice(1);

  return segments;
}

/**
 * The locale-independent route for a path, always slash-terminated and with no
 * base or locale prefix: `/portfolio/es/projects/` → `/projects/`, `/` → `/`.
 *
 * Useful to a language switcher, which needs "the same page in the other
 * locale" without knowing which locale it is currently in.
 */
export function routePath(path: string, base: string): string {
  return buildPath('', routeSegments(path, base));
}

/**
 * Reads the locale out of a path.
 *
 * The base is stripped *first*. The previous implementation split the raw
 * pathname and tested its first segment, which under `base: '/portfolio'` is
 * `'portfolio'` — so it reported `'en'` for every Spanish page (audit 5.3).
 */
export function localeFromPath(path: string, base: string): Locale {
  const normalizedBase = normalizeBase(base);
  const baseSegments = segmentsOf(normalizedBase);
  const segments = segmentsOf(path);

  const hasBase = baseSegments.every((segment, i) => segments[i] === segment);
  const first = hasBase ? segments[baseSegments.length] : segments[0];

  return first !== undefined && isLocale(first) ? first : DEFAULT_LOCALE;
}

/**
 * Site-relative href for a route in a given locale.
 *
 * English carries no prefix; Spanish is prefixed `/es`. The result always ends
 * in `/` and never contains a double slash.
 *
 * `localizePath('/projects', 'es', '/portfolio')` → `/portfolio/es/projects/`
 * `localizePath('/', 'en', '/portfolio')`         → `/portfolio/`
 * `localizePath('/', 'es', '/portfolio')`         → `/portfolio/es/`
 */
export function localizePath(path: string, locale: Locale, base: string): string {
  const normalizedBase = normalizeBase(base);
  const route = routeSegments(path, base);
  const segments = locale === DEFAULT_LOCALE ? route : [locale, ...route];
  return buildPath(normalizedBase, segments);
}

/**
 * Fully-qualified URL for a path, preserving whatever locale the path already
 * carries. Use `localizePath` first when you need to *change* locale.
 */
export function absoluteURL(path: string, origin: string, base: string): string {
  const normalizedBase = normalizeBase(base);
  const normalizedOrigin = origin.replace(/\/+$/, '');
  const locale = localeFromPath(path, base);
  const route = routeSegments(path, base);
  const segments = locale === DEFAULT_LOCALE ? route : [locale, ...route];
  return `${normalizedOrigin}${buildPath(normalizedBase, segments)}`;
}

/**
 * The canonical URL for the page currently at `currentPath`.
 *
 * Absolute, slash-terminated, and built from the same normalisation as
 * `getAlternates`, so the two cannot disagree about a trailing slash.
 */
export function canonicalFor(currentPath: string, origin: string, base: string): string {
  const locale = localeFromPath(currentPath, base);
  return absoluteURL(localizePath(currentPath, locale, base), origin, base);
}

/**
 * The full hreflang set for a page: both locales plus `x-default`.
 *
 * Every value is an **absolute** URL. Relative `hreflang` values are discarded
 * by Google, which is why the previous relative implementation meant the two
 * locales competed as near-duplicates instead of being served by language.
 *
 * `x-default` points at the English URL — English is the unprefixed default
 * and the fallback for any language the site does not serve.
 */
export function getAlternates(currentPath: string, origin: string, base: string): Alternates {
  const en = absoluteURL(localizePath(currentPath, 'en', base), origin, base);
  const es = absoluteURL(localizePath(currentPath, 'es', base), origin, base);
  return { en, es, 'x-default': en };
}
