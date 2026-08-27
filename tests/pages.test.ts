import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import { DOMAIN_IDS } from '../src/config/domains';
import { projectLinksSchema } from '../src/content/schema';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';

/**
 * Guards for the route layer (`src/pages/**`).
 *
 * ── Why the inline-style guard is the important one ─────────────────────────
 *
 * `astro.config.mjs` enables a hash-based CSP with no `'unsafe-inline'`. Astro
 * emits no `style-src-attr`, and per CSP that falls back to `style-src`, whose
 * hashes authorise a `<style>` **element** — never a `style=""` **attribute**.
 * Without `'unsafe-hashes'` the browser therefore drops every inline style
 * attribute on the page.
 *
 * The failure mode is the dangerous kind: `astro dev` serves no CSP, so an
 * inline style works perfectly in development and silently does nothing in
 * production. No console error, no build warning — the element just renders
 * unstyled. It shipped exactly once here: the project detail page painted its
 * domain accents and its `view-transition-name` through inline custom
 * properties, so on the live site the channel bars were uncoloured and the
 * project transition did nothing at all, while `dist` looked correct to any
 * check that only read the markup.
 *
 * Two layers, because neither alone is sufficient:
 *
 *   1. A source scan over every page. `src/pages/[...locale]/projects/*` reads
 *      `astro:content`, which has no runtime outside a build (see the note in
 *      `vitest.config.ts`), so those two pages cannot be rendered here — and
 *      they are precisely the ones the defect was found in.
 *   2. A real container render of the two pages that have no content
 *      dependency, which also covers every component they compose.
 *
 * Both were verified to go red by injecting a violation before being committed.
 */

const PAGES_DIR = fileURLToPath(new URL('../src/pages', import.meta.url));
const DETAIL_PAGE = join(PAGES_DIR, '[...locale]', 'projects', '[slug].astro');

const BASE_REQUEST = new Request('https://lburdman.github.io/portfolio/');
const ES_REQUEST = new Request('https://lburdman.github.io/portfolio/es/');

/** Any inline style attribute, however it is quoted or expressed. */
const INLINE_STYLE = /\sstyle\s*=/;

/**
 * Everything else that compiles down to a blocked style, in the order someone
 * reaches for them after the first is taken away.
 *
 * `define:vars` is the obvious next move and the worst one: it *is* an inline
 * style attribute after compilation, so it fails identically while looking
 * like an Astro feature rather than a hand-written attribute.
 *
 * `<style is:inline>` opts the element out of Astro's CSS pipeline. A hash can
 * be registered for it by hand — measured to work — but the resulting rule sits
 * outside the bundled stylesheet and beyond the reach of the reduced-motion
 * guard in `global.css`. Static CSS keyed off `data-*` is the house pattern;
 * this keeps the pages on it.
 */
const BLOCKED_STYLE_FORMS = [
  { name: 'define:vars (compiles to a style attribute)', pattern: /define:vars/ },
  { name: '<style is:inline> (outside the bundled stylesheet)', pattern: /<style[^>]*\sis:inline/ },
] as const;

/** Every `.astro` file under `src/pages`, at any depth. */
function pageFiles(dir: string = PAGES_DIR): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return pageFiles(path);
    return entry.name.endsWith('.astro') ? [path] : [];
  });
}

/**
 * Source with every comment removed.
 *
 * Load-bearing: these files *document* the CSP trap, and several of those
 * comments quote the forbidden `style=` form verbatim. Matching raw source
 * would fail on the explanation of the rule rather than on a violation of it.
 * Frontmatter `/** *\/`, CSS `/* *\/` and Astro `{/* *\/}` comments are all the
 * same block form.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Renders a page component to HTML through the real Astro renderer. */
async function renderPage(path: string, props: Record<string, unknown>, request: Request): Promise<string> {
  const container = await AstroContainer.create();
  // The specifier is a variable on purpose: `tsc` cannot resolve a literal
  // `.astro` import, and generating declarations would mean a build step to run
  // the tests. Vite still resolves it at run time.
  const mod = (await import(/* @vite-ignore */ path)) as { default: unknown };
  const component = mod.default as Parameters<typeof container.renderToString>[0];
  return container.renderToString(component, { props, request });
}

describe('no page emits an inline style attribute', () => {
  const files = pageFiles();

  it('finds every page file, so the loop below is not asserting over an empty list', () => {
    expect(files.length).toBeGreaterThanOrEqual(5);
    expect(files.some((file) => file.endsWith('[slug].astro'))).toBe(true);
  });

  for (const file of files) {
    const name = file.slice(PAGES_DIR.length + 1);

    it(`${name} declares no style attribute`, () => {
      expect(withoutComments(readFileSync(file, 'utf8'))).not.toMatch(INLINE_STYLE);
    });

    for (const { name: form, pattern } of BLOCKED_STYLE_FORMS) {
      it(`${name} uses no ${form}`, () => {
        expect(withoutComments(readFileSync(file, 'utf8'))).not.toMatch(pattern);
      });
    }
  }

  it('the comment stripper does not swallow a real violation', () => {
    const source = '/* a comment mentioning style="x" */\n<div style="color:red"></div>';
    expect(withoutComments(source)).toMatch(INLINE_STYLE);
  });

  it('renders the about page in both locales without one', async () => {
    for (const [locale, request] of [
      ['en', BASE_REQUEST],
      ['es', ES_REQUEST],
    ] as const) {
      const html = await renderPage(join(PAGES_DIR, '[...locale]', 'about.astro'), { locale }, request);
      expect(html).not.toMatch(INLINE_STYLE);
      // Proves the assertion ran against a real page rather than an empty string.
      expect(html).toContain(locale === 'en' ? en.about.heading : es.about.heading);
    }
  });

  it('renders the 404 page without one', async () => {
    const html = await renderPage(join(PAGES_DIR, '404.astro'), {}, BASE_REQUEST);
    expect(html).not.toMatch(INLINE_STYLE);
    expect(html).toContain(en.notFound.heading);
  });
});

describe('the detail page carries the CSP-safe replacements', () => {
  const source = readFileSync(DETAIL_PAGE, 'utf8');

  /**
   * The accent rules mirror `Domain['accentVar']`, typed
   * `--color-domain-${DomainId}`. CSS cannot derive that name from the data, so
   * a sixth domain needs a sixth rule — and without this test it would ship as
   * an uncoloured channel bar rather than as an error.
   */
  for (const domain of DOMAIN_IDS) {
    it(`resolves the ${domain} accent from a rule, not an attribute`, () => {
      expect(source).toContain(`[data-domain='${domain}']`);
      expect(source).toContain(`--domain-accent: var(--color-domain-${domain})`);
    });
  }

  /**
   * The pairing with `ProjectCard` is the whole point of the detail page's
   * transition, and it is invisible to every other check: the markup can be
   * perfect on both sides while the two disagree by one character and simply
   * do nothing. These assert the exact name grammar both files must produce.
   */
  it('names the title transition exactly as the card does', () => {
    expect(source).toContain('`project-title-${meta.slug}`');
    expect(source).toContain('data-vt={titleTransition}');
  });

  it('names the media transition exactly as the card does', () => {
    expect(source).toContain('`project-media-${meta.slug}`');
    expect(source).toContain('data-vt={mediaTransition}');
  });

  /**
   * `var(--vt-title, …)` must stay first in the chain: `global.css` withdraws a
   * name under reduced motion by nulling that custom property with
   * `!important`, and reversing the order would leave the guard with nothing to
   * reach while still looking correct.
   */
  it('keeps the reduced-motion custom property ahead of attr() in the chain', () => {
    expect(source).toContain('view-transition-name: var(--vt-title, attr(data-vt type(<custom-ident>), none))');
    expect(source).toContain('view-transition-name: var(--vt-media, attr(data-vt type(<custom-ident>), none))');
  });

  /**
   * Astro does not scope a bare attribute selector in a component `<style>`
   * block — `[data-domain='ai']` would ship globally and repaint other
   * components' elements. Every accent rule must carry the `.detail` prefix.
   */
  /**
   * The dictionary side is already covered: an existing test driven by
   * `Object.keys(projectLinksSchema.shape)` fails if the schema gains a link
   * type `UIStrings` cannot name. This is the *rendering* side of the same
   * question, and it is a genuinely different failure — a link type that is
   * named but never rendered passes that test and still disappears from the
   * page. `paper` and `article` sat in exactly that state.
   *
   * `LINK_TEXT` is typed `Record<keyof ProjectLinks, …>`, so a new schema key
   * is already a compile error there. `LINK_ORDER` is what this covers: it
   * cannot express completeness in the type system without a dummy assertion,
   * so the ordering is asserted here instead.
   */
  it('renders every link type the schema accepts', () => {
    const order = /const LINK_ORDER = \[([^\]]*)\]/.exec(source)?.[1] ?? '';
    const rendered = [...order.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);

    expect(rendered).toEqual(expect.arrayContaining(Object.keys(projectLinksSchema.shape)));
    expect(rendered).toHaveLength(Object.keys(projectLinksSchema.shape).length);
  });

  it('scopes every accent rule behind .detail', () => {
    for (const match of source.matchAll(/\[data-domain='[a-z]+'\]/g)) {
      const before = source.slice(Math.max(0, match.index - 9), match.index);
      expect(before).toContain('.detail ');
    }
  });
});
