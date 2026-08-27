import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { CONTACT_SECTION_ID, HOME_PATH } from '../src/config/navigation';
import { SITE } from '../src/config/site';
import { LOCALES, localizePath } from '../src/i18n';

/**
 * Every in-page anchor resolves to an element that exists — in the **built**
 * document, in every locale.
 *
 * ── Why this file exists ────────────────────────────────────────────────────
 *
 * `#contact` shipped as a dead link from four places at once (the desktop nav,
 * the mobile menu, the footer and the Hero's "Get in touch") while no element
 * on the site carried that `id`. 288 tests and five green gates passed over it,
 * because every one of them asked a question about a single file: the nav's
 * `href` was correct, the constant was correct, the dictionary was correct.
 * The defect only exists in the *assembled document*, which nothing read.
 *
 * So this test reads the assembled document, and it reads it from `dist/`
 * rather than from a container render. That is not a convenience — the
 * homepage cannot be rendered by `experimental_AstroContainer` at all: it
 * mounts a `.tsx` island (no renderer is registered in a unit-test container)
 * and reads `astro:content` (no runtime outside a build). A test that could
 * only check what the container can render would have skipped precisely the
 * page the bug was on.
 *
 * ── Who builds `dist/` ──────────────────────────────────────────────────────
 *
 * `tests/global-setup.ts` does, once, before any suite. Nothing here builds:
 * two suites building the same directory on demand raced on a clean checkout,
 * and a build spawned from inside a Vitest worker inherits an environment that
 * silently strips the deployment base. Both are that file's problem now.
 *
 * This file's earlier mtime-staleness check is gone with the rest of it. It was
 * the cheaper design — rebuild only when an input is newer than the output —
 * and it was set aside for an unconditional build because an unconditional
 * build cannot be wrong about staleness, not because it was worse. If build
 * time ever starts to hurt, that is the idea to bring back.
 *
 * ── Why the base path is still read out of the HTML ─────────────────────────
 *
 * A fragment link is matched to the document it targets by pathname, so this
 * test has to know the path each built page is *served* at. It does not ask
 * `SITE.basePath`: that reads `import.meta.env.BASE_URL`, which is the runner's
 * value, not the build's. The two were measured disagreeing here — the suite
 * seeing `''` while the build emitted `/portfolio` — and resolving against the
 * runner's answer would have made every in-page link look cross-document and
 * turned this whole file into a vacuous pass, the exact failure it exists to
 * prevent.
 *
 * `global-setup.ts` now makes them agree, and this stays anyway: it is an
 * independent derivation of the same fact, taken from the built markup where
 * the base is emitted rather than assumed. A guard that only holds while a
 * second file keeps its promise is not a guard.
 */

/** Built by `tests/global-setup.ts` before any suite runs. Never built here. */
const DIST = fileURLToPath(new URL('../dist', import.meta.url));

/**
 * The built homepage in every locale. The bug lived on all of them.
 *
 * Derived from `LOCALES` and `localizePath` with an empty base — which is
 * exactly the shape of the output tree (`dist/index.html`, `dist/es/index.html`)
 * whatever `base` the deployment uses. A third locale is covered the day it is
 * added rather than the day someone remembers this file.
 */
const HOME_PAGES = LOCALES.map((locale) => {
  const route = localizePath(HOME_PATH, locale, '');
  return {
    name: `${locale} homepage`,
    file: join(DIST, ...route.split('/').filter(Boolean), 'index.html'),
    /** Path within the deployment, still missing the base the build applied. */
    route,
  };
});

/** Every `id` attribute in a document. */
function idsIn(html: string): Set<string> {
  return new Set([...html.matchAll(/\sid="([^"]*)"/g)].map((match) => match[1] ?? ''));
}

/**
 * Every `<a href>` in a document.
 *
 * Astro serialises the whole dictionary into the island's props, where quotes
 * are `&quot;`-escaped — so no href or id inside that blob can match either
 * pattern. Verified against the real output by the "reads a real document"
 * case below, which would otherwise report absurd counts.
 */
function hrefsIn(html: string): string[] {
  return [...html.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)].map((match) => match[1] ?? '');
}

/**
 * The base path the build actually applied, read back off a bundled asset.
 *
 * Vite writes `_astro/` references through the real deployment base, so this is
 * `/portfolio` for `base: '/portfolio'` and `''` for a root deployment. It is
 * the one place in the document where the base is stated as emitted rather than
 * as configured.
 */
function builtBaseOf(html: string, name: string): string {
  const match = /(?:href|src)="([^"]*)\/_astro\//.exec(html);
  expect(match, `${name}: no bundled asset to read the deployment base from`).not.toBeNull();
  return match?.[1] ?? '';
}

interface BuiltPage {
  name: string;
  url: URL;
  ids: Set<string>;
  hrefs: string[];
}

function load(): BuiltPage[] {
  return HOME_PAGES.map(({ name, file, route }) => {
    const html = readFileSync(file, 'utf8');
    return {
      name,
      url: new URL(`${builtBaseOf(html, name)}${route}`, SITE.origin),
      ids: idsIn(html),
      hrefs: hrefsIn(html),
    };
  });
}

describe('in-page anchors resolve in the built output', () => {
  let pages: BuiltPage[];

  beforeAll(() => {
    pages = load();
  });

  it('reads a real document rather than an empty one', () => {
    for (const page of pages) {
      expect(page.hrefs.length, `${page.name}: no links found`).toBeGreaterThan(10);
      expect(page.ids.size, `${page.name}: no ids found`).toBeGreaterThan(3);
    }
  });

  /**
   * A fragment link is matched to its target document by pathname, so the path
   * this test resolves each document to has to be the path that document's own
   * links are written against. If the two ever diverge, every in-page link
   * silently becomes "cross-document, not my problem" — the vacuous green the
   * guard below exists to prevent. Fail here instead, where the message says why.
   */
  it('resolves each document to the path its own links are built with', () => {
    for (const page of pages) {
      const self = page.hrefs.filter((href) => href.startsWith(page.url.pathname));
      expect(
        self.length,
        `${page.name}: no link begins with "${page.url.pathname}" — the built base and localizePath disagree`,
      ).toBeGreaterThan(0);
    }
  });

  /**
   * The assertion the shipped defect would have failed.
   *
   * A fragment link is only checkable when its path names a document this test
   * holds; `/portfolio/es/#contact` on the English page is a link to the
   * *Spanish* homepage, and is validated against that page's ids, not this
   * one's. Anything pointing outside the pair is left alone rather than
   * guessed at.
   */
  it('gives every fragment link a matching id in the document it targets', () => {
    const byPath = new Map(pages.map((page) => [page.url.pathname, page]));
    let checked = 0;

    for (const page of pages) {
      for (const href of page.hrefs) {
        if (!href.includes('#')) continue;

        const target = new URL(href, page.url);
        const fragment = decodeURIComponent(target.hash.slice(1));
        if (fragment === '') continue;

        const document = byPath.get(target.pathname);
        if (document === undefined) continue;

        checked += 1;
        expect(document.ids, `${page.name}: "${href}" has no #${fragment} in ${document.name}`).toContain(fragment);
      }
    }

    // Without this the loop above passes vacuously if the link markup changes
    // shape — the same silence that let four dead anchors ship.
    expect(checked, 'no in-page fragment links were checked').toBeGreaterThanOrEqual(8);
  });

  /**
   * Named explicitly, because "every anchor resolves" is also satisfied by
   * deleting all four links. The contact anchor is the site's primary
   * call-to-action and must be present, not merely consistent.
   */
  it('keeps the contact anchor linked and present in both locales', () => {
    for (const page of pages) {
      const links = page.hrefs.filter((href) => href.endsWith(`#${CONTACT_SECTION_ID}`));
      expect(links.length, `${page.name}: nothing links to #${CONTACT_SECTION_ID}`).toBeGreaterThanOrEqual(4);
      expect(page.ids, `${page.name}: no element carries id="${CONTACT_SECTION_ID}"`).toContain(CONTACT_SECTION_ID);
    }
  });
});
