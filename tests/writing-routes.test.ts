import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import { DOMAIN_IDS } from '../src/config/domains';
import { writingLinksSchema } from '../src/content/writing-schema';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';
import type { Article } from '../src/lib/writing/types';

/**
 * Guards for the writing section's route and component layer.
 *
 * ── The hole this file closes ───────────────────────────────────────────────
 *
 * `tests/pages.test.ts` sweeps `src/pages/**` for the three forms that compile
 * to a blocked inline style. It does not, and cannot cheaply, sweep components
 * — and the writing section puts its most CSP-sensitive decision *in* a
 * component: the time axis positions every entry from a `data-gap` attribute
 * matched by static rules, precisely because `style="--gap: 4"` is dropped in
 * production by the hash-based policy in `astro.config.mjs`, silently, and only
 * in production. So the same sweep runs over `src/components/writing/**` here.
 *
 * ── The axis arithmetic ─────────────────────────────────────────────────────
 *
 * The gap between two entries is elapsed months, capped at `MAX_GAP_MONTHS`,
 * and each value needs a matching rule in the stylesheet because CSS cannot
 * compute a selector from data. Raising the cap without adding rules would not
 * fail anything: the entries would simply render with no gap, and the axis
 * would keep drawing a scale it had stopped honouring. That is the failure this
 * file makes loud, in two ways — by counting the rules against the constant,
 * and by rendering the component and reading the attributes it actually emits.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const WRITING_COMPONENTS = join(ROOT, 'src', 'components', 'writing');
const TIMELINE = join(WRITING_COMPONENTS, 'WritingTimeline.astro');
const ARTICLE_PAGE = join(ROOT, 'src', 'pages', '[...locale]', 'writing', '[slug].astro');
const INDEX_PAGE = join(ROOT, 'src', 'pages', '[...locale]', 'writing', 'index.astro');

const BASE_REQUEST = new Request('https://lburdman.github.io/portfolio/writing/');

/** Any inline style attribute, however it is quoted or expressed. */
const INLINE_STYLE = /\sstyle\s*=/;

const BLOCKED_STYLE_FORMS = [
  { name: 'define:vars (compiles to a style attribute)', pattern: /define:vars/ },
  { name: '<style is:inline> (outside the bundled stylesheet)', pattern: /<style[^>]*\sis:inline/ },
] as const;

/**
 * Source with every comment removed — load-bearing, because these files
 * *document* the CSP trap and several comments quote the forbidden `style=`
 * form verbatim. Same stripper as `tests/pages.test.ts`.
 */
function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function writingComponents(): string[] {
  return readdirSync(WRITING_COMPONENTS, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.astro'))
    .map((entry) => join(WRITING_COMPONENTS, entry.name));
}

/** Renders a `.astro` component to HTML through the real Astro renderer. */
async function renderComponent(path: string, props: Record<string, unknown>): Promise<string> {
  const container = await AstroContainer.create();
  // The specifier is a variable on purpose: `tsc` cannot resolve a literal
  // `.astro` import without a build step to generate declarations.
  const mod = (await import(/* @vite-ignore */ path)) as { default: unknown };
  const component = mod.default as Parameters<typeof container.renderToString>[0];
  return container.renderToString(component, { props, request: BASE_REQUEST });
}

/**
 * Synthetic articles, shaped to exercise the axis rather than to look realistic.
 *
 * Newest first, because that is the order `visibleArticles()` produces and the
 * order the component contracts to receive. The dates are chosen so the
 * expected gaps cover every interesting case at once: a same-month cluster
 * (0, 0), a real interval (4), a hiatus past the cap (16 → 9), and a
 * month-precision date sitting inside the cluster.
 */
const ARTICLES: Article[] = [
  {
    meta: { slug: 'hackathon', status: 'published', date: '2025-11-22', kind: 'community', domains: ['quantum'] },
    locale: 'en',
    title: 'The Grover hackathon',
    summary: 'Twelve teams, one afternoon, and a search problem small enough to run.',
  },
  {
    meta: { slug: 'museum-night', status: 'published', date: '2025-11-08', kind: 'community', domains: ['quantum'] },
    locale: 'en',
    title: 'Museum Night',
    summary: 'A desktop quantum computer on a table, and a queue of people asking what it does.',
  },
  {
    meta: { slug: 'fall-fest', status: 'published', date: '2025-11', kind: 'community', domains: ['quantum'] },
    locale: 'en',
    title: 'Fall Fest opens',
    summary: 'The month the calendar filled up, starting with a lecture hall of sixty people.',
  },
  {
    meta: { slug: 'course', status: 'published', date: '2025-07', kind: 'teaching', domains: ['quantum'] },
    locale: 'en',
    title: 'The course closes',
    summary: 'One semester of quantum computing, and what the last class looked like.',
  },
  {
    meta: { slug: 'earlier', status: 'published', date: '2024-03', kind: 'study', domains: ['ai'] },
    locale: 'en',
    title: 'On the other side of the desk',
    summary: 'A long way back on the axis, far enough that the scale has to be compressed.',
  },
];

/** What `WritingTimeline` must compute for `ARTICLES`, in render order. */
const EXPECTED_GAPS = ['0', '0', '0', '4', '9'];

describe('the writing components emit no blocked inline style', () => {
  const files = writingComponents();

  it('finds the component files, so the loop below is not asserting over an empty list', () => {
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  for (const file of files) {
    const name = file.slice(WRITING_COMPONENTS.length + 1);

    it(`${name} declares no style attribute`, () => {
      expect(withoutComments(readFileSync(file, 'utf8'))).not.toMatch(INLINE_STYLE);
    });

    for (const { name: form, pattern } of BLOCKED_STYLE_FORMS) {
      it(`${name} uses no ${form}`, () => {
        expect(withoutComments(readFileSync(file, 'utf8'))).not.toMatch(pattern);
      });
    }
  }
});

describe('the time axis positions entries with static rules, not inline styles', () => {
  const source = readFileSync(TIMELINE, 'utf8');

  /** The cap the component clamps to, read out of the component rather than retyped. */
  const declaredCap = Number(/const MAX_GAP_MONTHS = (\d+)/.exec(source)?.[1] ?? '0');

  it('declares a cap', () => {
    expect(declaredCap).toBeGreaterThan(0);
  });

  it('ships one rule for every gap the clamp can produce', () => {
    // `data-gap='0'` needs no rule — an entry in the same month as the one
    // above it sits at its own natural spacing — so the rules run 1..cap.
    for (let months = 1; months <= declaredCap; months += 1) {
      expect(source, `no rule for data-gap='${months}'`).toContain(`.timeline__row[data-gap='${months}']`);
    }
  });

  it('ships no rule for a gap the clamp can never produce', () => {
    // The other direction: a rule left behind after the cap was lowered is dead
    // CSS that looks like it is still holding the scale together.
    const declared = [...source.matchAll(/\.timeline__row\[data-gap='(\d+)'\]/g)].map((match) => Number(match[1]));
    expect(declared.length).toBeGreaterThan(0);
    expect(Math.max(...declared)).toBe(declaredCap);
    expect(new Set(declared).size, 'duplicate gap rules').toBe(declaredCap);
  });

  it('scales every gap from one custom property, so the axis has a single scale', () => {
    // Twelve rules with twelve hardcoded lengths would be twelve chances for
    // the scale to stop being linear.
    for (let months = 1; months <= declaredCap; months += 1) {
      expect(source).toContain(`margin-top: calc(${months} * var(--month))`);
    }
  });
});

describe('the rendered chronology', () => {
  it('renders the empty state, and no axis, when nothing is public', async () => {
    for (const [locale, t] of [
      ['en', en],
      ['es', es],
    ] as const) {
      const html = await renderComponent(TIMELINE, { articles: [], t, locale, base: '/portfolio' });
      expect(html).toContain(t.writing.empty);
      expect(html).not.toContain('<ol');
      expect(html).not.toMatch(INLINE_STYLE);
    }
  });

  it('places each entry at its true distance in months from the one above', async () => {
    const html = await renderComponent(TIMELINE, { articles: ARTICLES, t: en, locale: 'en', base: '/portfolio' });
    const gaps = [...html.matchAll(/data-gap="(\d+)"/g)].map((match) => match[1]);
    expect(gaps).toEqual(EXPECTED_GAPS);
  });

  it('emits no inline style, so the axis survives the production CSP', async () => {
    const html = await renderComponent(TIMELINE, { articles: ARTICLES, t: en, locale: 'en', base: '/portfolio' });
    expect(html).not.toMatch(INLINE_STYLE);
    // Proves the assertion ran against a real render rather than an empty string.
    expect(html).toContain('The Grover hackathon');
  });

  it('gives every entry exactly one link, whose accessible name is the title', async () => {
    const html = await renderComponent(TIMELINE, { articles: ARTICLES, t: en, locale: 'en', base: '/portfolio' });
    const anchors = [...html.matchAll(/<a class="timeline__link"/g)];
    expect(anchors).toHaveLength(ARTICLES.length);
    // The visible "Read article" affordance is not a second anchor — it would
    // duplicate the destination in the tab order and in the a11y tree.
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain(`>${en.writing.readArticle}</a>`);
  });

  it('builds every href through localizePath, base and locale included', async () => {
    const html = await renderComponent(TIMELINE, { articles: ARTICLES, t: es, locale: 'es', base: '/portfolio' });
    for (const article of ARTICLES) {
      expect(html, `missing href for ${article.meta.slug}`).toContain(
        `href="/portfolio/es/writing/${article.meta.slug}/"`,
      );
    }
    // AUDIT.md 1.3: a component handed `base` but not `locale` pointed Spanish
    // pages at English URLs.
    expect(html).not.toContain('href="/portfolio/writing/');
  });

  it('renders entry titles one level below the page heading, never skipping', async () => {
    const html = await renderComponent(TIMELINE, {
      articles: ARTICLES,
      t: en,
      locale: 'en',
      base: '/portfolio',
      headingLevel: 2,
    });
    expect([...html.matchAll(/<h2 /g)]).toHaveLength(ARTICLES.length);
    expect(html).not.toContain('<h3');
    expect(html).not.toContain('<h1');
  });

  it('renders a machine-readable date at the precision the content declares', async () => {
    const html = await renderComponent(TIMELINE, { articles: ARTICLES, t: en, locale: 'en', base: '/portfolio' });
    // A day-precision date keeps its day; a month-precision one must NOT gain
    // an invented one, in the markup or in `datetime`.
    expect(html).toContain('datetime="2025-11-22"');
    expect(html).toContain('datetime="2025-11"');
    expect(html).not.toContain('datetime="2025-11-01"');
  });

  it('localizes the month name rather than shipping the English one to Spanish readers', async () => {
    const english = await renderComponent(TIMELINE, { articles: ARTICLES, t: en, locale: 'en', base: '/portfolio' });
    const spanish = await renderComponent(TIMELINE, { articles: ARTICLES, t: es, locale: 'es', base: '/portfolio' });
    expect(english).toMatch(/Nov/);
    expect(spanish).toMatch(/nov/);
    // The two renders must differ somewhere in the dateline, not only in the
    // surrounding copy: `Intl` orders the parts differently in each locale.
    expect(spanish).not.toContain('Jul 2025');
  });

  it('labels each entry with its kind, from the dictionary', async () => {
    const html = await renderComponent(TIMELINE, { articles: ARTICLES, t: es, locale: 'es', base: '/portfolio' });
    expect(html).toContain(es.writing.kinds.community);
    expect(html).toContain(es.writing.kinds.teaching);
    expect(html).toContain(es.writing.kinds.study);
    expect(html).not.toContain(en.writing.kinds.community);
  });
});

describe('the article page carries the CSP-safe replacements', () => {
  const source = readFileSync(ARTICLE_PAGE, 'utf8');

  /**
   * The accent rules mirror `Domain['accentVar']`, typed
   * `--color-domain-${DomainId}`. CSS cannot derive that name from the data, so
   * a sixth domain needs a sixth rule — and without this it would ship as an
   * uncoloured channel bar rather than as an error.
   */
  for (const domain of DOMAIN_IDS) {
    it(`resolves the ${domain} accent from a rule, not an attribute`, () => {
      expect(source).toContain(`[data-domain='${domain}']`);
      expect(source).toContain(`--domain-accent: var(--color-domain-${domain})`);
    });
  }

  it('scopes every accent rule behind .article', () => {
    // Astro does not scope a bare attribute selector in a component `<style>`
    // block: `[data-domain='ai']` would ship globally and repaint other
    // components' elements.
    for (const match of source.matchAll(/\[data-domain='[a-z]+'\]/g)) {
      const before = source.slice(Math.max(0, match.index - 10), match.index);
      expect(before).toContain('.article ');
    }
  });

  it('keeps the domain accents off text, at the measured non-text mix', () => {
    // tokens.css: the raw `--color-domain-*` values measure 1.72:1-2.77:1 on
    // paper. The 68% ink mix measures 3.41-4.90:1 — a legal graphic mark, and
    // NOT legal for text. This asserts the mix is only ever a background.
    for (const match of source.matchAll(/color-mix\(in oklab, var\(--domain-accent\)[^)]*\)[^;]*/g)) {
      const declaration = source.slice(source.lastIndexOf('\n', match.index), match.index);
      expect(declaration, 'a domain mix reached a color property').toContain('background-color');
    }
  });

  it('renders every link type the schema accepts', () => {
    // The dictionary side is covered in `tests/i18n.test.ts`. This is the
    // *rendering* side, which is a genuinely different failure: a link type
    // that is named but never rendered passes that test and still disappears
    // from the page. `paper` and `article` sat in exactly that state on the
    // projects side.
    const order = /const LINK_ORDER = \[([^\]]*)\]/.exec(source)?.[1] ?? '';
    const rendered = [...order.matchAll(/'([a-z]+)'/g)].map((match) => match[1]);

    expect(rendered).toEqual(expect.arrayContaining(Object.keys(writingLinksSchema.shape)));
    expect(rendered).toHaveLength(Object.keys(writingLinksSchema.shape).length);
  });
});

describe('the two writing surfaces agree on the view-transition names', () => {
  const timeline = readFileSync(TIMELINE, 'utf8');
  const page = readFileSync(ARTICLE_PAGE, 'utf8');

  /**
   * Pairing compares the computed `view-transition-name` across two documents,
   * so the index and the article page must produce byte-identical strings. The
   * markup can be perfect on both sides while the two disagree by one character
   * and simply do nothing — invisible to every other check here.
   */
  it('names the title transition identically on both sides', () => {
    expect(timeline).toContain('`article-title-${meta.slug}`');
    expect(page).toContain('`article-title-${meta.slug}`');
    expect(page).toContain('data-vt={titleTransition}');
  });

  it('names the media transition identically on both sides', () => {
    expect(timeline).toContain('`article-media-${meta.slug}`');
    expect(page).toContain('`article-media-${meta.slug}`');
    expect(page).toContain('data-vt={mediaTransition}');
  });

  it('does not collide with the projects namespace', () => {
    // An article and a project may share a slug. If both used `project-title-`
    // the browser would happily pair a project card with an article heading.
    for (const source of [timeline, page]) {
      expect(source).not.toContain('`project-title-${meta.slug}`');
      expect(source).not.toContain('`project-media-${meta.slug}`');
    }
  });

  /**
   * `var(--vt-title, …)` must stay first in the chain: `global.css` withdraws a
   * name under reduced motion by nulling that custom property with
   * `!important`, and reversing the order would leave the guard with nothing to
   * reach while still looking correct.
   */
  it('keeps the reduced-motion custom property ahead of attr() in the chain', () => {
    for (const source of [timeline, page]) {
      expect(source).toContain('view-transition-name: var(--vt-title, attr(data-vt type(<custom-ident>), none))');
      expect(source).toContain('view-transition-name: var(--vt-media, attr(data-vt type(<custom-ident>), none))');
    }
  });

  it('adds no client-side router to buy the transition', () => {
    // brief §8 / MOTION_SYSTEM §5: native cross-document transitions only.
    // Comments stripped first — both files *say* they ship no `<ClientRouter />`,
    // and matching raw source would fail on the explanation of the rule rather
    // than on a violation of it.
    for (const source of [timeline, page]) {
      expect(withoutComments(source)).not.toContain('ClientRouter');
    }
  });
});

describe('one visibility predicate (AUDIT.md 2.1)', () => {
  /**
   * The single most repeatable failure in this codebase: two surfaces each
   * deciding for themselves what "public" means, agreeing today and disagreeing
   * after the next edit. On the projects side it published a live,
   * sitemap-eligible detail page that appeared in no listing.
   *
   * Both writing routes must reach content only through the query API, and
   * neither may read `meta.status` at all.
   */
  const sources = [
    { name: 'writing/index.astro', source: readFileSync(INDEX_PAGE, 'utf8') },
    { name: 'writing/[slug].astro', source: readFileSync(ARTICLE_PAGE, 'utf8') },
    { name: 'WritingTimeline.astro', source: readFileSync(TIMELINE, 'utf8') },
  ];

  for (const { name, source } of sources) {
    it(`${name} never filters on status itself`, () => {
      const code = withoutComments(source);
      expect(code, `${name} reads meta.status`).not.toMatch(/\.status\b/);
      expect(code, `${name} names a status literal`).not.toMatch(/'(published|draft)'/);
    });

    it(`${name} never calls getCollection directly`, () => {
      expect(withoutComments(source)).not.toContain('getCollection');
    });
  }

  it('both routes take their article set from the same query function', () => {
    for (const { name, source } of sources.slice(0, 2)) {
      expect(withoutComments(source), `${name} does not call getVisibleArticles`).toContain('getVisibleArticles');
    }
  });
});
