import { describe, expect, it } from 'vitest';
import { absoluteURL, canonicalFor, getAlternates, localeFromPath, localizePath, routePath } from '../src/i18n/routing';
import { LOCALES } from '../src/i18n/types';

/**
 * These are the real deployment values (astro.config.mjs). Every assertion
 * below runs with the base path present, because that is precisely where the
 * audit found the production defects: relative hreflang (1.2), a canonical /
 * alternate trailing-slash mismatch (1.2), and `getLocaleFromURL` reading
 * `'portfolio'` as the locale segment and answering `'en'` for every Spanish
 * page (5.3). Base-less tests hid all three.
 */
const ORIGIN = 'https://lburdman.github.io';
const BASE = '/portfolio';

/** Every page the site actually builds, in locale-independent form. */
const ROUTES = ['/', '/about', '/projects', '/projects/augmenta', '/projects/quantum-audio'];

describe('localizePath', () => {
  it('prefixes the base and no locale for English', () => {
    expect(localizePath('/projects', 'en', BASE)).toBe('/portfolio/projects/');
  });

  it('prefixes the base and the locale for Spanish', () => {
    expect(localizePath('/projects', 'es', BASE)).toBe('/portfolio/es/projects/');
  });

  it('handles the home path in both locales', () => {
    expect(localizePath('/', 'en', BASE)).toBe('/portfolio/');
    expect(localizePath('/', 'es', BASE)).toBe('/portfolio/es/');
  });

  it('handles nested routes', () => {
    expect(localizePath('/projects/augmenta', 'en', BASE)).toBe('/portfolio/projects/augmenta/');
    expect(localizePath('/projects/augmenta', 'es', BASE)).toBe('/portfolio/es/projects/augmenta/');
  });

  it('always ends with a trailing slash', () => {
    for (const route of ROUTES) {
      for (const locale of LOCALES) {
        expect(localizePath(route, locale, BASE).endsWith('/')).toBe(true);
      }
    }
  });

  it('never produces a double slash', () => {
    const messyInputs = ['/', '//', '/projects', '/projects/', '//projects//', 'projects'];
    for (const input of messyInputs) {
      for (const locale of LOCALES) {
        expect(localizePath(input, locale, BASE)).not.toContain('//');
      }
    }
  });

  it('is invariant to a trailing slash on the input', () => {
    for (const route of ROUTES) {
      const withSlash = route.endsWith('/') ? route : `${route}/`;
      for (const locale of LOCALES) {
        expect(localizePath(withSlash, locale, BASE)).toBe(localizePath(route, locale, BASE));
      }
    }
  });

  it('tolerates a base written with a trailing slash', () => {
    expect(localizePath('/projects', 'es', '/portfolio/')).toBe('/portfolio/es/projects/');
  });

  it('works for a root deployment with an empty base', () => {
    expect(localizePath('/', 'en', '')).toBe('/');
    expect(localizePath('/', 'es', '')).toBe('/es/');
    expect(localizePath('/about', 'es', '')).toBe('/es/about/');
  });

  it('is idempotent — re-localizing an already-localized path is a no-op', () => {
    for (const route of ROUTES) {
      for (const locale of LOCALES) {
        const once = localizePath(route, locale, BASE);
        expect(localizePath(once, locale, BASE)).toBe(once);
      }
    }
  });

  it('round-trips EN → ES → EN without accumulating prefixes', () => {
    for (const route of ROUTES) {
      const english = localizePath(route, 'en', BASE);
      const spanish = localizePath(english, 'es', BASE);
      expect(localizePath(spanish, 'en', BASE)).toBe(english);
      expect(spanish).not.toContain('/es/es/');
    }
  });

  it('drops a query string and fragment', () => {
    expect(localizePath('/projects?filter=ai#grid', 'es', BASE)).toBe('/portfolio/es/projects/');
  });
});

describe('localeFromPath', () => {
  it("returns 'es' for a Spanish page under the real base (audit 5.3)", () => {
    // The previous implementation split the raw pathname and saw 'portfolio'
    // as the first segment, so it answered 'en' here.
    expect(localeFromPath('/portfolio/es/about/', BASE)).toBe('es');
  });

  it("returns 'en' for an English page under the real base", () => {
    expect(localeFromPath('/portfolio/about/', BASE)).toBe('en');
  });

  it('handles both locale home pages', () => {
    expect(localeFromPath('/portfolio/', BASE)).toBe('en');
    expect(localeFromPath('/portfolio/es/', BASE)).toBe('es');
  });

  it('works without a base', () => {
    expect(localeFromPath('/es/about/', '')).toBe('es');
    expect(localeFromPath('/about/', '')).toBe('en');
  });

  it('only reads the segment immediately after the base', () => {
    // A project slug that happens to be 'es' is not a locale prefix.
    expect(localeFromPath('/portfolio/projects/es/', BASE)).toBe('en');
  });

  it('agrees with the locale localizePath produced', () => {
    for (const route of ROUTES) {
      for (const locale of LOCALES) {
        expect(localeFromPath(localizePath(route, locale, BASE), BASE)).toBe(locale);
      }
    }
  });
});

describe('routePath', () => {
  it('strips both the base and the locale prefix', () => {
    expect(routePath('/portfolio/es/projects/augmenta/', BASE)).toBe('/projects/augmenta/');
    expect(routePath('/portfolio/projects/augmenta/', BASE)).toBe('/projects/augmenta/');
  });

  it('reduces both home pages to the root route', () => {
    expect(routePath('/portfolio/', BASE)).toBe('/');
    expect(routePath('/portfolio/es/', BASE)).toBe('/');
  });

  it('gives both locales of a page the same route', () => {
    for (const route of ROUTES) {
      const english = routePath(localizePath(route, 'en', BASE), BASE);
      const spanish = routePath(localizePath(route, 'es', BASE), BASE);
      expect(spanish).toBe(english);
    }
  });
});

describe('absoluteURL', () => {
  it('produces a fully-qualified URL including the base', () => {
    expect(absoluteURL('/about', ORIGIN, BASE)).toBe('https://lburdman.github.io/portfolio/about/');
  });

  it('preserves a locale prefix already present in the path', () => {
    expect(absoluteURL('/portfolio/es/about/', ORIGIN, BASE)).toBe('https://lburdman.github.io/portfolio/es/about/');
  });

  it('tolerates an origin written with a trailing slash', () => {
    expect(absoluteURL('/about', `${ORIGIN}/`, BASE)).toBe('https://lburdman.github.io/portfolio/about/');
  });

  it('always ends with a trailing slash and parses as a URL', () => {
    for (const route of ROUTES) {
      for (const locale of LOCALES) {
        const url = absoluteURL(localizePath(route, locale, BASE), ORIGIN, BASE);
        expect(url.endsWith('/')).toBe(true);
        expect(new URL(url).pathname).toBe(localizePath(route, locale, BASE));
      }
    }
  });
});

describe('getAlternates', () => {
  it('emits exactly en, es and x-default', () => {
    const alternates = getAlternates('/portfolio/es/about/', ORIGIN, BASE);
    expect(Object.keys(alternates).sort()).toEqual(['en', 'es', 'x-default']);
  });

  it('returns absolute URLs — relative hreflang is discarded by Google (audit 1.2)', () => {
    for (const route of ROUTES) {
      const alternates = getAlternates(localizePath(route, 'es', BASE), ORIGIN, BASE);
      for (const [key, href] of Object.entries(alternates)) {
        expect(href.startsWith('https://'), `${key} → ${href} is not absolute`).toBe(true);
        expect(href.startsWith(ORIGIN)).toBe(true);
      }
    }
  });

  it('pairs the two locales of the same page', () => {
    const alternates = getAlternates('/portfolio/es/about/', ORIGIN, BASE);
    expect(alternates.en).toBe('https://lburdman.github.io/portfolio/about/');
    expect(alternates.es).toBe('https://lburdman.github.io/portfolio/es/about/');
  });

  it('points x-default at the English URL', () => {
    for (const route of ROUTES) {
      const alternates = getAlternates(localizePath(route, 'es', BASE), ORIGIN, BASE);
      expect(alternates['x-default']).toBe(alternates.en);
    }
  });

  it('is the same set whichever locale of the page asks for it', () => {
    for (const route of ROUTES) {
      const fromEnglish = getAlternates(localizePath(route, 'en', BASE), ORIGIN, BASE);
      const fromSpanish = getAlternates(localizePath(route, 'es', BASE), ORIGIN, BASE);
      expect(fromSpanish).toEqual(fromEnglish);
    }
  });

  it('handles the home page', () => {
    const alternates = getAlternates('/portfolio/', ORIGIN, BASE);
    expect(alternates.en).toBe('https://lburdman.github.io/portfolio/');
    expect(alternates.es).toBe('https://lburdman.github.io/portfolio/es/');
  });

  it('ends every alternate with a trailing slash', () => {
    for (const route of ROUTES) {
      const alternates = getAlternates(localizePath(route, 'en', BASE), ORIGIN, BASE);
      for (const href of Object.values(alternates)) {
        expect(href.endsWith('/')).toBe(true);
      }
    }
  });
});

describe('canonical ↔ alternate consistency (audit 1.2, second defect)', () => {
  /**
   * The one invariant this module exists to guarantee: a page's canonical URL
   * is byte-identical to its own entry in its hreflang set. A trailing-slash
   * divergence between the two leaves the locale pair unconfirmed and dropped,
   * which is what the build output showed before this rewrite.
   */
  it('canonical equals the alternate for the page own locale', () => {
    for (const route of ROUTES) {
      for (const locale of LOCALES) {
        const currentPath = localizePath(route, locale, BASE);
        const canonical = canonicalFor(currentPath, ORIGIN, BASE);
        const alternates = getAlternates(currentPath, ORIGIN, BASE);
        expect(canonical, `${currentPath} (${locale})`).toBe(alternates[locale]);
      }
    }
  });

  it('holds when the current path is missing its trailing slash', () => {
    const currentPath = '/portfolio/es/about';
    const canonical = canonicalFor(currentPath, ORIGIN, BASE);
    expect(canonical).toBe('https://lburdman.github.io/portfolio/es/about/');
    expect(canonical).toBe(getAlternates(currentPath, ORIGIN, BASE).es);
  });

  it('is self-referential — every alternate canonicalizes to itself', () => {
    for (const route of ROUTES) {
      for (const locale of LOCALES) {
        const alternates = getAlternates(localizePath(route, locale, BASE), ORIGIN, BASE);
        for (const key of LOCALES) {
          const href = alternates[key];
          expect(canonicalFor(new URL(href).pathname, ORIGIN, BASE)).toBe(href);
        }
      }
    }
  });

  it('reports the locale each canonical belongs to', () => {
    for (const route of ROUTES) {
      for (const locale of LOCALES) {
        const canonical = canonicalFor(localizePath(route, locale, BASE), ORIGIN, BASE);
        expect(localeFromPath(new URL(canonical).pathname, BASE)).toBe(locale);
      }
    }
  });
});
