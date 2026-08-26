import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { HOME_PATH, SECTION_IDS } from '../src/config/navigation';
import { SITE } from '../src/config/site';
import { localizePath } from '../src/i18n';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';

/**
 * Rendering tests for the layout shell, navigation, Hero and layers sequence.
 *
 * These render the real `.astro` components through `experimental_AstroContainer`
 * and assert against emitted HTML — the surface `vitest.config.ts` describes as
 * open and unused. Nothing here mocks anything.
 *
 * ── Why the inline-style guard below is the important one ───────────────────
 *
 * `astro.config.mjs` enables a hash-based CSP with no `'unsafe-inline'`, and
 * Astro emits no `style-src-attr`. Per CSP, `style-src-attr` falls back to
 * `style-src`, and a hash authorises a `<style>` *element* — never a `style=""`
 * *attribute*. Without `'unsafe-hashes'`, the browser therefore drops every
 * inline style attribute on the page.
 *
 * The failure mode is the dangerous kind: `astro dev` serves no CSP, so an
 * inline style works perfectly in development and silently does nothing in
 * production. There is no console error anyone would notice and no build
 * warning. The element simply renders unstyled.
 *
 * A guard is the only thing that catches that, so every component in this
 * layer is rendered and asserted to emit none. Accents, staggers and SVG
 * geometry belong in the component stylesheet — keyed off `data-*` attributes
 * and `:nth-child()` — or in SVG presentation attributes, which CSP does not
 * touch.
 */

const BASE = '/portfolio';
const REQUEST = new Request('https://lburdman.github.io/portfolio/');
const ES_REQUEST = new Request('https://lburdman.github.io/portfolio/es/');

/** Any inline style attribute, however it is quoted. */
const INLINE_STYLE = /\sstyle=/;

/**
 * The path is a variable on purpose: a literal `.astro` specifier has no type
 * declaration for `tsc`, and generating one would mean a build step to run the
 * tests. The container still resolves it through Vite at run time.
 */
async function renderComponent(
  path: string,
  props: Record<string, unknown> = {},
  options: { request?: Request; slots?: Record<string, string> } = {},
): Promise<string> {
  const container = await AstroContainer.create();
  const mod = (await import(/* @vite-ignore */ path)) as { default: unknown };
  const component = mod.default as Parameters<typeof container.renderToString>[0];
  return container.renderToString(component, {
    props,
    request: options.request ?? REQUEST,
    ...(options.slots ? { slots: options.slots } : {}),
  });
}

const propsFor = (t: typeof en, locale: 'en' | 'es') => ({ locale, t, base: BASE });

/**
 * Every component this agent owns that emits markup, with the props it needs.
 * `MobileMenu`, `LanguageSwitcher`, `Container`, `Eyebrow`, `ActionLink`,
 * `SkipLink` and `BaseLayout` are all reached through the composites below, so
 * an inline style introduced in any of them fails here too.
 */
const COMPONENTS = [
  { name: 'LayerSpine', path: '../src/components/visuals/spine/LayerSpine.astro', props: {} },
  { name: 'Navbar', path: '../src/components/navigation/Navbar.astro', props: propsFor(en, 'en') },
  { name: 'Footer', path: '../src/components/navigation/Footer.astro', props: propsFor(en, 'en') },
  { name: 'Hero', path: '../src/components/home/Hero.astro', props: propsFor(en, 'en') },
  { name: 'LayersSequence', path: '../src/components/home/LayersSequence.astro', props: propsFor(en, 'en') },
  {
    name: 'Section',
    path: '../src/components/ui/Section.astro',
    props: { section: 'layers', label: en.sections.layers },
  },
] as const;

describe('no component in this layer emits an inline style attribute', () => {
  for (const { name, path, props } of COMPONENTS) {
    it(`${name} renders without a style attribute`, async () => {
      const html = await renderComponent(path, props);
      expect(html).not.toMatch(INLINE_STYLE);
    });
  }

  it('holds for the Spanish locale too', async () => {
    for (const { path, props } of COMPONENTS) {
      const localized = 'locale' in props ? propsFor(es, 'es') : props;
      const html = await renderComponent(path, localized, { request: ES_REQUEST });
      expect(html).not.toMatch(INLINE_STYLE);
    }
  });

  it('holds for the full page shell, slots and all', async () => {
    const html = await renderComponent(
      '../src/layouts/PageLayout.astro',
      { locale: 'en', t: en, title: en.seo.home.title, description: en.seo.home.description, spine: true },
      { slots: { default: '<p>body</p>' } },
    );
    expect(html).not.toMatch(INLINE_STYLE);
    // Proves the guard above actually covered the shell rather than an empty string.
    expect(html).toContain('data-layer-spine');
    expect(html).toContain('skip-link');
  });
});

describe('the layer spine carries its geometry in presentation attributes', () => {
  it('draws every layer with no inline style and no computed style values', async () => {
    const html = await renderComponent('../src/components/visuals/spine/LayerSpine.astro');
    // Five layers plus the dotted connector, the node ticks, the vias and the
    // boundary ticks — all as `d=""` path data generated at build time.
    const paths = html.match(/<path\b/g) ?? [];
    expect(paths.length).toBeGreaterThanOrEqual(8);
    expect(html).not.toMatch(INLINE_STYLE);
    // Stroke, dash pattern and colour all resolve from the stylesheet.
    expect(html).not.toMatch(/stroke-dasharray=/);
  });
});

describe('section numbering is derived from SECTION_IDS', () => {
  it('renders the figure number for the array position, not a literal', async () => {
    for (const id of SECTION_IDS) {
      const expected = String(SECTION_IDS.indexOf(id)).padStart(2, '0');
      const html = await renderComponent('../src/components/ui/Section.astro', {
        section: id,
        label: en.sections[id],
      });
      expect(html).toContain(`>${expected}<`);
      expect(html).toContain(`id="${id}"`);
    }
  });

  it('forwards an undeclared data attribute onto the section element', async () => {
    // Regression guard. A `data-*` hook passed here used to be accepted by the
    // type checker and then silently dropped from the output — the failure was
    // only visible in a production build. Anything not named in `Props` must
    // now reach the element.
    const html = await renderComponent('../src/components/ui/Section.astro', {
      section: 'worlds',
      label: en.sections.worlds,
      'data-stops-hero-visual': true,
      'data-probe': 'forwarded',
      role: 'region',
    });
    expect(html).toContain('data-stops-hero-visual');
    expect(html).toContain('data-probe="forwarded"');
    expect(html).toContain('role="region"');
  });

  it('does not let a forwarded attribute clobber a value the component derives', async () => {
    // `id`, `aria-labelledby` and `class` are destructured out of the rest
    // object, so a spread cannot reach them from either direction.
    const html = await renderComponent('../src/components/ui/Section.astro', {
      section: 'layers',
      label: en.sections.layers,
      labelledBy: 'layers-heading',
      class: 'caller-class',
      'data-probe': 'forwarded',
    });
    expect(html).toContain('id="layers"');
    expect(html).toContain('aria-labelledby="layers-heading"');
    // The caller's class is merged with the component's own, not replaced.
    expect(html).toMatch(/class="[^"]*\bsection\b[^"]*"/);
    expect(html).toMatch(/class="[^"]*\bcaller-class\b[^"]*"/);
    // Exactly one id attribute — not a duplicate emitted by the spread.
    expect(html.match(/\sid="/g) ?? []).toHaveLength(1);
    expect(html).toContain('data-probe="forwarded"');
  });

  it("carries the parent component's style scope onto the section element", async () => {
    // Not a cosmetic detail. Astro compiles a parent's section-level rule to
    // `.hero[data-astro-cid-<parent>]`, and passes that scope attribute to the
    // child component's root. Before `Section` spread undeclared attributes it
    // swallowed the scope, so `.hero { min-height; display: flex; ... }`
    // matched nothing and the hero silently lost its height and centering in
    // production while looking correct in source. Verified by A/B rebuild.
    const html = await renderComponent('../src/components/home/Hero.astro', propsFor(en, 'en'));

    const section = /<section\b[^>]*>/.exec(html)?.[0] ?? '';
    const scopeOnSection = new Set(section.match(/data-astro-cid-[a-z0-9]+/g) ?? []);
    // Hero's own scope, taken from an element Hero definitely renders itself.
    const heroScope = /<h1\b[^>]*?(data-astro-cid-[a-z0-9]+)/.exec(html)?.[1];

    expect(heroScope).toBeDefined();
    expect(scopeOnSection.has(heroScope as string)).toBe(true);
    // Section's own scope is still there too — both must coexist.
    expect(scopeOnSection.size).toBeGreaterThanOrEqual(2);
  });

  it('honours a raw aria-labelledby when labelledBy is not given', async () => {
    const html = await renderComponent('../src/components/ui/Section.astro', {
      section: 'hero',
      label: en.sections.hero,
      'aria-labelledby': 'raw-heading',
    });
    expect(html).toContain('aria-labelledby="raw-heading"');
  });

  it('renders the localized section word, uppercased by CSS rather than by the dictionary', async () => {
    const html = await renderComponent('../src/components/ui/Section.astro', {
      section: 'hero',
      label: es.sections.hero,
    });
    // Sentence case in the DOM. A dictionary that shouted would fail here as
    // well as in the i18n suite.
    expect(html).toContain(es.sections.hero);
    expect(html).not.toContain(es.sections.hero.toUpperCase());
  });
});

describe('the head slot and the indexable flag', () => {
  it('renders page-supplied head content inside <head>, not the body', async () => {
    // `PageLayout` used to drop this slot, which forced document-level
    // metadata into the body. Presence alone is not enough — the assertion is
    // about *position*, because content that lands after </head> is exactly
    // the bug this fixes.
    const html = await renderComponent(
      '../src/layouts/PageLayout.astro',
      { locale: 'en', t: en, title: en.seo.home.title, description: en.seo.home.description },
      { slots: { head: '<meta name="probe-head" content="landed" />', default: '<p>body</p>' } },
    );

    const headEnd = html.indexOf('</head>');
    const probe = html.indexOf('probe-head');
    expect(headEnd).toBeGreaterThan(-1);
    expect(probe).toBeGreaterThan(-1);
    expect(probe).toBeLessThan(headEnd);
  });

  it('emits canonical, every hreflang and og:url by default', async () => {
    const html = await renderComponent(
      '../src/layouts/PageLayout.astro',
      { locale: 'en', t: en, title: en.seo.home.title, description: en.seo.home.description },
      { slots: { default: '<p>body</p>' } },
    );
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('hreflang="en"');
    expect(html).toContain('hreflang="es"');
    expect(html).toContain('hreflang="x-default"');
    expect(html).toContain('property="og:url"');
    expect(html).not.toContain('name="robots"');
  });

  it('withdraws them and declares noindex when the document has no URL of its own', async () => {
    const html = await renderComponent(
      '../src/layouts/PageLayout.astro',
      {
        locale: 'en',
        t: en,
        title: en.seo.notFound.title,
        description: en.seo.notFound.description,
        indexable: false,
      },
      { slots: { default: '<p>body</p>' } },
    );
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('hreflang="x-default"');
    expect(html).not.toContain('property="og:url"');
    expect(html).toContain('content="noindex, follow"');
  });

  it('points the language switcher at the other locale home when there is no equivalent page', async () => {
    // Otherwise the switcher on the 404 offers `/es/404/`, which does not
    // exist — Pages answers it with the same English 404 and the control
    // silently does nothing.
    //
    // Asserted against `localizePath` rather than a literal, because the
    // container renders with `BASE_URL='/'` while the build uses `/portfolio`.
    // Hardcoding either one would make this pass in the wrong environment.
    const notFound = new Request('https://lburdman.github.io/portfolio/404/');
    const langHref = (html: string) => /<a class="lang__link" href="([^"]*)"/.exec(html)?.[1];

    const base = { locale: 'en', t: en, title: en.seo.notFound.title, description: en.seo.notFound.description };
    const opts = { slots: { default: '<p>body</p>' }, request: notFound };

    const stable = await renderComponent('../src/layouts/PageLayout.astro', base, opts);
    // Default behaviour is unchanged: the switcher still translates the path.
    expect(langHref(stable)).toContain('404');

    const unstable = await renderComponent('../src/layouts/PageLayout.astro', { ...base, indexable: false }, opts);
    expect(langHref(unstable)).not.toContain('404');
    expect(langHref(unstable)).toBe(localizePath(HOME_PATH, 'es', SITE.basePath));
  });
});
