import { existsSync, readFileSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import astroConfig from '../astro.config.mjs';

/**
 * Link integrity over the BUILT SITE.
 *
 * Every other suite in this repo renders a component in isolation. That is the
 * right level for most questions and the wrong level for this one: a link is
 * only correct relative to the set of pages that actually got emitted, and no
 * component can know that set. So this suite reads `dist/` — the artefact that
 * ships — and asks three questions of it.
 *
 *   1. Does every internal link point at a file that exists?
 *   2. Does every `<a>` have an accessible name?
 *   3. Is any `href` a `#` or `""` placeholder?
 *
 * Question 1 is here because 288 tests and five green gates shipped a site
 * whose primary "Get in touch" CTA pointed at an anchor with no target, and
 * whose "View on GitHub" links pointed at three repositories that no longer
 * exist. Shape was validated; existence never was.
 *
 * ── Scope, stated so it is not mistaken for a gap ──────────────────────────
 *
 * NO NETWORK. Nothing here resolves an external URL. Tests must be fast and
 * must pass on a plane. External liveness is `scripts/project-validate.mjs`,
 * which fetches every `links.*` URL and is opted out of with `--offline`.
 *
 * NO FRAGMENTS. `#contact` resolving to an `id="contact"` is asserted in
 * `tests/anchors.test.ts`. This suite deliberately strips the fragment and
 * asks only about the document it hangs off.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = path.join(ROOT, 'dist');

/**
 * Deployment origin and base path, taken from `astro.config.mjs` itself.
 *
 * Deliberately NOT from `src/config/site.ts`: that module reads
 * `import.meta.env.SITE` / `BASE_URL`, which Astro only populates during a
 * build. Under Vitest they fall back to `/`, so `BASE_PATH` would be `''` and
 * every `/portfolio/...` href would be measured against the wrong root — a
 * check that reports failures it invented, or worse, passes for the wrong
 * reason. The config object is the one source that reads the same here as it
 * does at build time.
 */
const ORIGIN = (astroConfig.site ?? '').replace(/\/+$/, '');
/** `/portfolio` — normalised to no trailing slash so it concatenates cleanly. */
const BASE = (astroConfig.base ?? '').replace(/\/+$/, '');
/** `https://lburdman.github.io/portfolio` — the same links, written absolutely. */
const ABSOLUTE_BASE = `${ORIGIN}${BASE}`;

interface Anchor {
  /** Everything between `<a` and `>`. */
  readonly attributes: string;
  /** Everything between `>` and `</a>`. */
  readonly inner: string;
}

interface Page {
  /** Path relative to `dist/`, e.g. `projects/augmenta/index.html`. */
  readonly name: string;
  readonly html: string;
  readonly anchors: readonly Anchor[];
  /** Every `href` value in the document, `<a>` and `<link>` alike. */
  readonly hrefs: readonly string[];
  /** Every `id` in the document, for `aria-labelledby` resolution. */
  readonly ids: ReadonlySet<string>;
}

/** Anchors cannot nest, so a non-greedy match to the next `</a>` is exact. */
const ANCHOR = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
const HREF = /\shref="([^"]*)"/gi;
const ID = /\sid="([^"]*)"/gi;
/**
 * An `href` that is NOT double-quoted. Astro always emits double quotes, and
 * every pattern above depends on that. Asserting it rather than assuming it
 * means a change in Astro's output makes this suite go red, instead of making
 * it silently match nothing and report a green with zero links checked.
 */
const UNQUOTED_HREF = /\shref\s*=\s*(?!")/i;

const pages: Page[] = [];

/** Recursively lists every `.html` file under `dist/`, relative to it. */
async function htmlFiles(dir: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries) {
    const name = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      found.push(...(await htmlFiles(path.join(dir, entry.name), name)));
    } else if (entry.name.endsWith('.html')) {
      found.push(name);
    }
  }
  return found.sort();
}

/**
 * Every capture-group-1 value for `pattern` in `html`.
 *
 * The `?? ''` is not a shrug at `noUncheckedIndexedAccess`: group 1 of every
 * pattern used here is mandatory, so `undefined` is unreachable — and if that
 * ever stopped being true, an empty string is the value that makes the checks
 * below report a problem rather than quietly skip one.
 */
function matchAll(html: string, pattern: RegExp): string[] {
  return [...html.matchAll(new RegExp(pattern.source, pattern.flags))].map((match) => match[1] ?? '');
}

/**
 * Resolves an internal href to the file `dist/` must contain for it to work,
 * or `undefined` when the href is not an internal page/asset link.
 *
 * A directory route (`/portfolio/about/`) needs `about/index.html`; an asset
 * (`/portfolio/favicon.svg`) needs the file itself. `trailingSlash: 'always'`
 * plus `build.format: 'directory'` is what makes those two cases exhaustive.
 */
function resolveInternal(href: string): { readonly href: string; readonly candidates: string[] } | undefined {
  const withoutFragment = (href.split('#')[0] ?? '').split('?')[0] ?? '';
  if (withoutFragment === '') return undefined;

  let pathname: string;
  if (withoutFragment.startsWith(`${ABSOLUTE_BASE}/`) || withoutFragment === ABSOLUTE_BASE) {
    pathname = withoutFragment.slice(ORIGIN.length);
  } else if (withoutFragment.startsWith(`${BASE}/`) || withoutFragment === BASE) {
    pathname = withoutFragment;
  } else {
    // Off-site, `mailto:`, or a bare fragment. Not this suite's question.
    return undefined;
  }

  const relative = pathname.slice(BASE.length).replace(/^\/+/, '');
  const candidates =
    relative === '' || relative.endsWith('/')
      ? [`${relative}index.html`]
      : // A file first, then the directory form, because an extensionless path
        // may legitimately be either.
        [relative, `${relative}/index.html`];

  return { href, candidates };
}

function existsInDist(candidate: string): boolean {
  const target = path.join(DIST, candidate);
  // `path.join` normalises `..`; refuse anything that escaped `dist/` rather
  // than reporting it as present.
  if (!target.startsWith(DIST + path.sep)) return false;
  return existsSync(target) && statSync(target).isFile();
}

/** Removes every element marked `aria-hidden="true"`, subtree included. */
function stripAriaHidden(html: string): string {
  const hidden = /<(\w+)\b[^>]*\saria-hidden="true"[^>]*>[\s\S]*?<\/\1>/gi;
  let previous = html;
  // Repeated because the pattern is not recursive: an outer hidden element
  // wrapping an inner one is removed on a later pass.
  for (let i = 0; i < 10; i += 1) {
    const next = previous.replace(hidden, '');
    if (next === previous) break;
    previous = next;
  }
  return previous.replace(/<\w+\b[^>]*\saria-hidden="true"[^>]*\/?>/gi, '');
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&(\w+);/g, (whole, name: string) => NAMED_ENTITIES[name] ?? whole);
}

/**
 * The accessible name of an anchor, computed the way an assistive technology
 * would reach it, in the order the accname spec resolves: `aria-labelledby`,
 * then `aria-label`, then the content subtree.
 *
 * The subtree step drops `aria-hidden="true"` elements first. That is the
 * detail that makes this check real rather than decorative: an icon-only link
 * whose sole child is an `aria-hidden` glyph looks like it has text in the
 * HTML and announces nothing at all.
 */
function accessibleName(anchor: Anchor, page: Page): string {
  const labelledBy = /\saria-labelledby="([^"]*)"/i.exec(anchor.attributes)?.[1]?.trim();
  if (labelledBy !== undefined && labelledBy !== '') {
    const referenced = labelledBy.split(/\s+/).filter((id) => page.ids.has(id));
    // An `aria-labelledby` pointing at nothing names nothing; fall through so
    // the anchor is judged on what it actually has.
    if (referenced.length > 0) return referenced.join(' ');
  }

  const label = /\saria-label="([^"]*)"/i.exec(anchor.attributes)?.[1];
  if (label !== undefined && decodeEntities(label).trim() !== '') return decodeEntities(label).trim();

  const visible = stripAriaHidden(anchor.inner)
    // An image's alt text is part of the name.
    .replace(/<img\b[^>]*\salt="([^"]*)"[^>]*>/gi, ' $1 ')
    .replace(/<[^>]+>/g, ' ');

  return decodeEntities(visible).replace(/\s+/g, ' ').trim();
}

beforeAll(async () => {
  // `dist/` is built by `tests/global-setup.ts`, once, before any suite. This
  // file deliberately does not build it: two suites read the built site, and
  // when each built it on demand they raced into the same directory — and a
  // build spawned from inside a Vitest worker inherits `BASE_URL=/` and emits
  // a site with no deployment base at all.
  for (const name of await htmlFiles(DIST)) {
    const html = readFileSync(path.join(DIST, name), 'utf8');
    const anchors = [...html.matchAll(new RegExp(ANCHOR.source, ANCHOR.flags))].map((match) => ({
      attributes: match[1] ?? '',
      inner: match[2] ?? '',
    }));
    pages.push({
      name,
      html,
      anchors,
      hrefs: matchAll(html, HREF),
      ids: new Set(matchAll(html, ID)),
    });
  }
}, 180_000);

describe('built output', () => {
  it('was produced and contains every route', () => {
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.map((page) => page.name)).toContain('index.html');
  });

  it('quotes every href with double quotes, which every check below assumes', () => {
    const offenders = pages
      .filter((page) => UNQUOTED_HREF.test(page.html))
      .map((page) => `${page.name}: an href is not double-quoted, so the link checks would silently skip it`);

    expect(offenders).toEqual([]);
  });

  /**
   * The production invariant: this site is served from `/portfolio`, so a
   * root-relative href that does not carry that prefix is broken in
   * production, full stop.
   *
   * It is asserted separately from link resolution because a base-less build
   * passes resolution while being completely wrong. `dist/` IS the site root
   * on disk, so `href="/about/"` looks up `dist/about/index.html` and finds
   * it — the file exists, the link is dead on the deployed site, and the
   * resolution check has no way to tell the difference.
   *
   * That is not hypothetical. A build spawned from inside a Vitest worker
   * inherits `BASE_URL=/` and emits exactly this document, and the suite went
   * green over it. This assertion is what makes that impossible: it fails on
   * the first `href="/about/"` regardless of what exists on disk.
   */
  it('carries the deployment base on every root-relative href', () => {
    const baseless: string[] = [];

    for (const page of pages) {
      for (const href of page.hrefs) {
        if (!href.startsWith('/')) continue;
        if (href === BASE || href.startsWith(`${BASE}/`)) continue;
        baseless.push(`${page.name} → ${href} (missing the "${BASE}" deployment base)`);
      }
    }

    expect([...new Set(baseless)]).toEqual([]);
  });
});

describe('internal links', () => {
  it('every href into the site resolves to a file in dist/', () => {
    const dead: string[] = [];
    let checked = 0;
    let checkedPages = 0;

    for (const page of pages) {
      for (const href of page.hrefs) {
        const internal = resolveInternal(href);
        if (!internal) continue;
        checked += 1;
        // Hashed `_astro/` assets are emitted by the bundler and always
        // resolve. Counting them separately keeps the "did this guard do real
        // work" assertion below honest: when the build lost its base, 79 of
        // the 86 links this test saw were stylesheets and canonical tags, and
        // only 7 were real page links. It still passed.
        if (!href.includes('/_astro/')) checkedPages += 1;
        if (!internal.candidates.some(existsInDist)) {
          dead.push(`${page.name} → ${href} (looked for dist/${internal.candidates.join(' or dist/')})`);
        }
      }
    }

    // A guard that checks nothing passes trivially. Assert it had real work.
    expect(checked).toBeGreaterThan(0);
    expect(checkedPages).toBeGreaterThan(pages.length);
    expect([...new Set(dead)]).toEqual([]);
  });
});

describe('anchors', () => {
  it('every <a> has a non-empty accessible name', () => {
    const nameless: string[] = [];
    let checked = 0;

    for (const page of pages) {
      for (const anchor of page.anchors) {
        checked += 1;
        if (accessibleName(anchor, page) === '') {
          const href = /\shref="([^"]*)"/i.exec(anchor.attributes)?.[1] ?? '(no href)';
          nameless.push(`${page.name} → <a href="${href}"> announces nothing`);
        }
      }
    }

    expect(checked).toBeGreaterThan(0);
    expect([...new Set(nameless)]).toEqual([]);
  });

  it('no href is a "#" or "" placeholder', () => {
    const placeholders: string[] = [];

    for (const page of pages) {
      for (const href of page.hrefs) {
        if (href.trim() === '#' || href.trim() === '') {
          placeholders.push(`${page.name} → href="${href}"`);
        }
      }
    }

    expect([...new Set(placeholders)]).toEqual([]);
  });
});
