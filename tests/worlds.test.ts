import { afterEach, describe, expect, it, vi } from 'vitest';
import { DOMAINS } from '../src/config/domains';
import {
  activeIndexFromProgress,
  clamp01,
  clampIndex,
  nextIndexForKey,
  progressForIndex,
  scrollTargetForIndex,
  TRAVERSE_LENGTH,
  traverseIds,
} from '../src/components/visuals/worlds/traverse';
import {
  createRandom,
  interferenceProfile,
  manhattanLength,
  manhattanPath,
  nearestNeighbourEdges,
  nearestPointIndex,
  scatterPoints,
  spectrumBars,
  wavePath,
} from '../src/components/visuals/worlds/stage-geometry';

/**
 * Unit tests for the Technical Worlds island's pure layers.
 *
 * Nothing here touches the DOM, React or GSAP. What is asserted is the
 * arithmetic that decides which domain the traverse is on, what the keyboard
 * does to that decision, and that the geometry the stages draw is identical on
 * the server and in the browser — the three things that are wrong silently
 * rather than loudly if they are wrong at all.
 *
 * AUDIT.md 3.2 is the standard being avoided: every assertion below is written
 * so that a plausible defect in the source makes it fail.
 */

const COUNT = DOMAINS.length;

describe('clamp01', () => {
  it('passes values inside the unit interval through unchanged', () => {
    expect(clamp01(0.37)).toBe(0.37);
  });

  it('clamps outside the unit interval at both ends', () => {
    expect(clamp01(-2.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
  });

  it('answers 0 for NaN rather than propagating it into a transform', () => {
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe('clampIndex', () => {
  it('keeps a valid index', () => {
    expect(clampIndex(3, COUNT)).toBe(3);
  });

  it('clamps below zero and above the last index', () => {
    expect(clampIndex(-4, COUNT)).toBe(0);
    expect(clampIndex(COUNT + 9, COUNT)).toBe(COUNT - 1);
  });

  it('never answers a negative index for an empty sequence', () => {
    // The island indexes arrays under `noUncheckedIndexedAccess`; -1 here
    // would become an `undefined` read at the call site rather than an error.
    expect(clampIndex(2, 0)).toBe(0);
  });
});

describe('activeIndexFromProgress', () => {
  it('maps progress 0 to the first domain', () => {
    expect(activeIndexFromProgress(0, COUNT)).toBe(0);
  });

  it('maps progress 1 to the last domain, not past it', () => {
    expect(activeIndexFromProgress(1, COUNT)).toBe(COUNT - 1);
  });

  it('advances one domain per interval across the whole range', () => {
    // The track travels `count - 1` panel widths, so the stops sit at
    // 0, 0.25, 0.5, 0.75, 1 for five domains.
    const stops = Array.from({ length: COUNT }, (_, index) => activeIndexFromProgress(index / (COUNT - 1), COUNT));
    expect(stops).toEqual([0, 1, 2, 3, 4].slice(0, COUNT));
  });

  it('rounds to the nearer stop rather than truncating', () => {
    // Just past the midpoint between stop 1 and stop 2 must already read as 2.
    const midpoint = (1 / (COUNT - 1) + 2 / (COUNT - 1)) / 2;
    expect(activeIndexFromProgress(midpoint - 0.001, COUNT)).toBe(1);
    expect(activeIndexFromProgress(midpoint + 0.001, COUNT)).toBe(2);
  });

  it('clamps progress reported outside 0…1 by an over-scrolled ScrollTrigger', () => {
    expect(activeIndexFromProgress(-0.4, COUNT)).toBe(0);
    expect(activeIndexFromProgress(1.4, COUNT)).toBe(COUNT - 1);
  });

  it('answers 0 for a single-domain or empty sequence instead of dividing by zero', () => {
    expect(activeIndexFromProgress(0.5, 1)).toBe(0);
    expect(activeIndexFromProgress(0.5, 0)).toBe(0);
  });
});

describe('progressForIndex', () => {
  it('is the inverse of activeIndexFromProgress at every stop', () => {
    for (let index = 0; index < COUNT; index += 1) {
      expect(activeIndexFromProgress(progressForIndex(index, COUNT), COUNT)).toBe(index);
    }
  });

  it('puts the first stop at 0 and the last at 1', () => {
    expect(progressForIndex(0, COUNT)).toBe(0);
    expect(progressForIndex(COUNT - 1, COUNT)).toBe(1);
  });
});

describe('nextIndexForKey', () => {
  it('steps right and left', () => {
    expect(nextIndexForKey('ArrowRight', 1, COUNT)).toBe(2);
    expect(nextIndexForKey('ArrowLeft', 1, COUNT)).toBe(0);
  });

  it('clamps at both ends rather than wrapping', () => {
    expect(nextIndexForKey('ArrowRight', COUNT - 1, COUNT)).toBe(COUNT - 1);
    expect(nextIndexForKey('ArrowLeft', 0, COUNT)).toBe(0);
  });

  it('jumps to the ends with Home and End', () => {
    expect(nextIndexForKey('Home', 3, COUNT)).toBe(0);
    expect(nextIndexForKey('End', 1, COUNT)).toBe(COUNT - 1);
  });

  it('claims no key that the browser uses for vertical scrolling', () => {
    // Intercepting these is the scroll-jacking the brief (§4) forbids, so the
    // handler must be told they are not its keys.
    for (const key of ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Space', ' ', 'Tab', 'Enter']) {
      expect(nextIndexForKey(key, 2, COUNT)).toBeNull();
    }
  });

  it('tolerates a current index that is already out of range', () => {
    expect(nextIndexForKey('ArrowRight', 99, COUNT)).toBe(COUNT - 1);
    expect(nextIndexForKey('ArrowLeft', -99, COUNT)).toBe(0);
  });

  it('handles no key at all for an empty sequence', () => {
    expect(nextIndexForKey('ArrowRight', 0, 0)).toBeNull();
  });
});

describe('scrollTargetForIndex', () => {
  it('spreads the stops evenly across the pinned scroll range', () => {
    expect(scrollTargetForIndex(0, 5, 1000, 3000)).toBe(1000);
    expect(scrollTargetForIndex(2, 5, 1000, 3000)).toBe(2000);
    expect(scrollTargetForIndex(4, 5, 1000, 3000)).toBe(3000);
  });

  it('answers the range start for an unmeasured ScrollTrigger', () => {
    // `end === start` is what a trigger reports before its first refresh; a
    // naive implementation would divide by zero and scroll to NaN.
    expect(scrollTargetForIndex(3, 5, 1200, 1200)).toBe(1200);
    expect(scrollTargetForIndex(3, 5, 1200, 400)).toBe(1200);
  });

  it('clamps an out-of-range index into the pinned range', () => {
    expect(scrollTargetForIndex(-3, 5, 1000, 3000)).toBe(1000);
    expect(scrollTargetForIndex(50, 5, 1000, 3000)).toBe(3000);
  });
});

describe('the traverse sequence', () => {
  it('is the DOMAINS order, not a copy of it', () => {
    expect(traverseIds()).toEqual(DOMAINS.map((domain) => domain.id));
    expect(TRAVERSE_LENGTH).toBe(DOMAINS.length);
  });

  /**
   * The assertion above passes just as happily against a hardcoded literal
   * that currently agrees with `DOMAINS`. This one does not: the config module
   * is replaced with a different, shorter set of domains, and the traverse is
   * re-imported. If the sequence were restated anywhere in `traverse.ts`, the
   * module would keep answering the five real domains and this fails.
   */
  it('follows the config module when the config module changes', async () => {
    vi.resetModules();
    vi.doMock('../src/config/domains', () => ({
      DOMAIN_IDS: ['alpha', 'beta', 'gamma'],
      DOMAINS: [
        { id: 'alpha', layerIndex: 0, accentVar: '--color-domain-alpha', stage: 'network' },
        { id: 'beta', layerIndex: 1, accentVar: '--color-domain-beta', stage: 'waveform' },
        { id: 'gamma', layerIndex: 2, accentVar: '--color-domain-gamma', stage: 'routing' },
      ],
      isDomainId: () => true,
      getDomain: () => undefined,
      domainOrdinal: () => '00',
    }));

    const reloaded = await import('../src/components/visuals/worlds/traverse');

    expect(reloaded.traverseIds()).toEqual(['alpha', 'beta', 'gamma']);
    expect(reloaded.TRAVERSE_LENGTH).toBe(3);
    // And the arithmetic follows it: full progress lands on the third domain.
    expect(reloaded.activeIndexFromProgress(1, reloaded.TRAVERSE_LENGTH)).toBe(2);
    expect(reloaded.activeIndexFromProgress(0.5, reloaded.TRAVERSE_LENGTH)).toBe(1);
  });
});

afterEach(() => {
  vi.doUnmock('../src/config/domains');
  vi.resetModules();
});

/* ===========================================================================
   Stage geometry
   ======================================================================== */

describe('createRandom', () => {
  it('produces the same stream for the same seed', () => {
    const a = createRandom(20260826);
    const b = createRandom(20260826);
    expect(Array.from({ length: 8 }, a)).toEqual(Array.from({ length: 8 }, b));
  });

  it('produces a different stream for a different seed', () => {
    const a = createRandom(1);
    const b = createRandom(2);
    expect(Array.from({ length: 8 }, a)).not.toEqual(Array.from({ length: 8 }, b));
  });

  it('stays inside [0, 1)', () => {
    const next = createRandom(7);
    for (let i = 0; i < 200; i += 1) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('scatterPoints', () => {
  const bounds = { x: 10, y: 20, width: 100, height: 60 };

  it('is deterministic — the server render and the hydration render must agree', () => {
    // A `Math.random()` here would make React discard the server markup and
    // re-render the whole island. That failure is invisible except as a warning.
    expect(scatterPoints(12, 42, bounds)).toEqual(scatterPoints(12, 42, bounds));
  });

  it('keeps every point inside the bounds', () => {
    for (const point of scatterPoints(30, 99, bounds)) {
      expect(point.x).toBeGreaterThanOrEqual(bounds.x);
      expect(point.x).toBeLessThanOrEqual(bounds.x + bounds.width);
      expect(point.y).toBeGreaterThanOrEqual(bounds.y);
      expect(point.y).toBeLessThanOrEqual(bounds.y + bounds.height);
    }
  });

  it('spreads points further apart than a uniform scatter does', () => {
    const spread = scatterPoints(14, 5, bounds, 14);
    const clumped = scatterPoints(14, 5, bounds, 1);
    const minGap = (points: readonly { x: number; y: number }[]) => {
      let smallest = Number.POSITIVE_INFINITY;
      points.forEach((point, i) => {
        points.forEach((other, j) => {
          if (i >= j) return;
          smallest = Math.min(smallest, Math.hypot(point.x - other.x, point.y - other.y));
        });
      });
      return smallest;
    };
    expect(minGap(spread)).toBeGreaterThan(minGap(clumped));
  });

  it('answers an empty list for a non-positive count', () => {
    expect(scatterPoints(0, 1, bounds)).toEqual([]);
    expect(scatterPoints(-3, 1, bounds)).toEqual([]);
  });
});

describe('nearestNeighbourEdges', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 10, y: 0 },
    { x: 11, y: 0 },
  ];

  it('links each point to its closest neighbour', () => {
    expect(nearestNeighbourEdges(points, 1)).toEqual([
      { a: 0, b: 1 },
      { a: 2, b: 3 },
    ]);
  });

  it('draws a mutual pair once rather than twice', () => {
    const edges = nearestNeighbourEdges(points, 2);
    const keys = edges.map((edge) => `${edge.a}:${edge.b}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(edges.every((edge) => edge.a < edge.b)).toBe(true);
  });

  it('never links a point to itself', () => {
    expect(nearestNeighbourEdges(points, 3).some((edge) => edge.a === edge.b)).toBe(false);
  });
});

describe('nearestPointIndex', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 50, y: 50 },
    { x: 100, y: 0 },
  ];

  it('finds the closest point', () => {
    expect(nearestPointIndex(points, 96, 4)).toBe(2);
    expect(nearestPointIndex(points, 48, 44)).toBe(1);
  });

  it('answers 0 for an empty list instead of -1', () => {
    expect(nearestPointIndex([], 5, 5)).toBe(0);
  });
});

describe('interferenceProfile', () => {
  it('is fully constructive at the centre of the screen', () => {
    const profile = interferenceProfile(21, 60, 26);
    expect(profile[10]).toBeCloseTo(1, 10);
  });

  it('stays within 0…1 everywhere', () => {
    for (const value of interferenceProfile(64, 140, 19)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('packs more fringes in as the sources move apart', () => {
    const fringes = (separation: number) => {
      const profile = interferenceProfile(400, separation, 26);
      let peaks = 0;
      for (let i = 1; i < profile.length - 1; i += 1) {
        const previous = profile[i - 1] ?? 0;
        const current = profile[i] ?? 0;
        const next = profile[i + 1] ?? 0;
        if (current > previous && current >= next) peaks += 1;
      }
      return peaks;
    };
    // This is the relationship the stage exists to demonstrate; if it inverts,
    // the pointer teaches the reader something false.
    expect(fringes(110)).toBeGreaterThan(fringes(35));
  });

  it('survives a zero wavelength without producing NaN', () => {
    for (const value of interferenceProfile(8, 50, 0)) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});

describe('wavePath', () => {
  it('starts at the vertical centre and stays inside the box', () => {
    const path = wavePath(320, 100, 4, 200);
    const coordinates = path
      .slice(1)
      .split(/[ML]/)
      .filter(Boolean)
      .map((pair) => pair.trim().split(' ').map(Number));

    const firstPoint = coordinates[0];
    expect(firstPoint?.[0]).toBeCloseTo(0, 6);
    expect(firstPoint?.[1]).toBeCloseTo(50, 6);

    for (const [x, y] of coordinates) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(320);
      expect(y).toBeGreaterThanOrEqual(-0.01);
      expect(y).toBeLessThanOrEqual(100.01);
    }
  });

  it('tiles seamlessly: the last sample repeats the first', () => {
    // The audio stage draws two copies side by side and translates by exactly
    // one tile. A wave whose ends do not meet would visibly snap each loop.
    const path = wavePath(320, 100, 8, 321);
    const points = path.slice(1).split(/[ML]/).filter(Boolean);
    const first = points[0]?.trim().split(' ')[1];
    const last = points[points.length - 1]?.trim().split(' ')[1];
    expect(Number(last)).toBeCloseTo(Number(first), 2);
  });

  it('is deterministic', () => {
    expect(wavePath(320, 100, 8, 64, [1, 0.3])).toBe(wavePath(320, 100, 8, 64, [1, 0.3]));
  });
});

describe('spectrumBars', () => {
  it('puts the tallest bar at the requested peak', () => {
    const bars = spectrumBars(41, 0.25, 12);
    const tallest = bars.indexOf(Math.max(...bars));
    expect(tallest / (bars.length - 1)).toBeCloseTo(0.25, 1);
  });

  it('moves the peak when the pointer moves', () => {
    const low = spectrumBars(41, 0.2, 12);
    const high = spectrumBars(41, 0.7, 12);
    expect(low.indexOf(Math.max(...low))).toBeLessThan(high.indexOf(Math.max(...high)));
  });

  it('stays within 0…1', () => {
    for (const value of spectrumBars(41, 0.5, 12)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe('manhattanPath', () => {
  it('turns waypoints into right angles only', () => {
    const path = manhattanPath([
      { x: 0, y: 0 },
      { x: 10, y: 5 },
    ]);
    // Vertical first, then horizontal — never a diagonal, which no router draws.
    expect(path).toBe('M0.00 0.00 L0.00 5.00 L10.00 5.00');
  });

  it('emits nothing for no waypoints', () => {
    expect(manhattanPath([])).toBe('');
  });

  it('skips a segment when an axis does not change', () => {
    expect(
      manhattanPath([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ]),
    ).toBe('M0.00 0.00 L10.00 0.00');
  });
});

describe('manhattanLength', () => {
  it('measures the routed length, not the straight-line distance', () => {
    // 3-4-5 triangle: the crow flies 5, the router walks 7.
    expect(
      manhattanLength([
        { x: 0, y: 0 },
        { x: 3, y: 4 },
      ]),
    ).toBe(7);
  });

  it('is zero for fewer than two waypoints', () => {
    expect(manhattanLength([])).toBe(0);
    expect(manhattanLength([{ x: 4, y: 9 }])).toBe(0);
  });
});

/* ===========================================================================
   The progressive-enhancement guarantee

   MOTION_SYSTEM §3 and ARCHITECTURE §5 both rest on one claim: the five
   domains are real DOM in document order, and the traverse moves them rather
   than creating them. With JavaScript off, all five must be readable.

   That claim is worth exactly as much as it is testable, so it is tested. The
   island is rendered the way Astro renders it at build time — no browser, no
   effects, no hydration — and the resulting markup is inspected.
   ======================================================================== */

describe('server-rendered markup', () => {
  const render = async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { en } = await import('../src/i18n/en');
    const { default: TechnicalWorlds } = await import('../src/components/visuals/worlds/TechnicalWorlds');
    return { html: renderToStaticMarkup(createElement(TechnicalWorlds, { t: en })), en };
  };

  it('contains every domain name and summary before any JavaScript runs', async () => {
    const { html, en } = await render();
    for (const domain of DOMAINS) {
      const item = en.worlds.items[domain.id];
      // `&` is HTML-escaped in the output, so compare against escaped text.
      expect(html).toContain(item.name.replace(/&/g, '&amp;'));
      expect(html).toContain(item.summary.replace(/&/g, '&amp;'));
    }
  });

  it('keeps the domains in DOMAINS order in the document', async () => {
    const { html, en } = await render();
    const positions = DOMAINS.map((domain) => html.indexOf(en.worlds.items[domain.id].name.replace(/&/g, '&amp;')));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('opens at h2 and gives each domain an h3', async () => {
    const { html } = await render();
    expect(html.match(/<h1/g)).toBeNull();
    expect(html.match(/<h2/g)).toHaveLength(1);
    expect(html.match(/<h3/g)).toHaveLength(DOMAINS.length);
  });

  it('renders every stage, with none of them animating', async () => {
    const { html } = await render();
    for (const domain of DOMAINS) {
      expect(html).toContain(`data-stage="${domain.stage}"`);
    }
    // Five inert stages and not one active: the server has no viewport to be
    // in and no pointer, so nothing may claim the frame.
    expect(html.match(/data-active="false"/g)).toHaveLength(DOMAINS.length);
    expect(html).not.toContain('data-active="true"');
  });

  it('ships the stack, not the traverse', async () => {
    const { html } = await render();
    // Both are added by effects after mount. Their presence in the static
    // markup would mean the horizontal layout renders before GSAP exists.
    expect(html).not.toContain('data-traverse');
    expect(html).not.toContain('tabindex');
  });

  it('hides every decorative visual from assistive technology', async () => {
    const { html } = await render();
    const svgTags = html.match(/<svg[^>]*>/g) ?? [];
    expect(svgTags).toHaveLength(DOMAINS.length);
    expect(svgTags.every((tag) => tag.includes('aria-hidden="true"'))).toBe(true);
  });

  it('carries the localized keyboard hint and a polite live region', async () => {
    const { html, en } = await render();
    expect(html).toContain(en.a11y.worldsInstructions);
    expect(html).toContain('aria-live="polite"');
  });

  it('renders the band contents, not its own <section>', async () => {
    const { html } = await render();
    // `ui/Section.astro` owns the `<section id="worlds">`, the `02 / TECHNICAL
    // WORLDS` annotation and the `.tw on-ink` classes. A `<section>` here would
    // nest two of them and produce a second, unnumbered landmark.
    expect(html.startsWith('<div class="tw-band"')).toBe(true);
    expect(html).not.toContain('<section');
  });

  it('renders no figure annotation of its own', async () => {
    const { html, en } = await render();
    // The `02` and the localized margin word are `Section`'s job now. A copy
    // here would be a second number able to drift from `SECTION_IDS`.
    expect(html).not.toContain('tw-header__eyebrow');
    expect(html).not.toContain(en.sections.worlds);
  });

  it('gives the hero the anchor id it links to, for every domain', async () => {
    const { html } = await render();
    // The hero renders keyboard-reachable links to `#world-<domain id>`. If
    // these ids drift, those links dead-end silently.
    for (const domain of DOMAINS) {
      expect(html).toContain(`id="world-${domain.id}"`);
    }
  });

  it('carries the attribute that stops the hero canvas, server-rendered', async () => {
    const { html } = await render();
    // The hero's signal-field module observes this attribute and stops its loop
    // while the band is on screen — MOTION_SYSTEM §4's one-expensive-visual-at-
    // a-time rule. It has to be in the *static* markup: this island hydrates on
    // `client:visible`, so a hero that queries at first paint would miss an
    // attribute added later. Without it the canvas keeps running behind this
    // band and nothing in either module would report the problem.
    expect(html).toContain('data-stops-hero-visual');
  });

  it('writes no inline style attribute anywhere', async () => {
    const { html } = await render();
    // `astro.config.mjs` enables a hash-based CSP with no `'unsafe-inline'`,
    // and Astro emits no `style-src-attr`, so `style-src` governs style
    // attributes too — with no `'unsafe-hashes'`, every inline `style=""` is
    // dropped by the browser. A single one here would mean an accent, a
    // stagger or a dash pattern that works in `astro dev` and silently does
    // not in production. Hence: none.
    expect(html).not.toMatch(/\sstyle="/);
  });

  it('injects no script or style element', async () => {
    const { html } = await render();
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<style');
  });
});

describe('the band wrapper', () => {
  const readWrapper = async () => {
    const { readFile } = await import('node:fs/promises');
    return readFile(new URL('../src/components/home/TechnicalWorlds.astro', import.meta.url), 'utf8');
  };

  it('takes its place in the sequence from Section, not from a literal', async () => {
    const wrapper = await readWrapper();
    // `section=` and `label=` are what make the figure number
    // `SECTION_IDS.indexOf('worlds')` and the margin word `t.sections.worlds`.
    // The band previously hand-rolled a `02` eyebrow: correct on the day it was
    // written, and silently stale the moment `SECTION_IDS` was reordered.
    expect(wrapper).toContain('section={SECTION}');
    expect(wrapper).toContain('label={t.sections[SECTION]}');
    // No two-digit figure literal anywhere in the markup.
    const markup = wrapper.slice(wrapper.indexOf('<Section'), wrapper.indexOf('</Section>'));
    expect(markup).not.toMatch(/>\s*0\d\s*</);
  });

  it('applies the ink inversion through Section', async () => {
    const wrapper = await readWrapper();
    // `.on-ink` re-points --focus-ring to --color-phosphor. Without it the ring
    // is ultramarine at 2.36:1 on this ground, and `.tw` carries the band's
    // layout — including the class the island's `closest('.tw')` pins.
    expect(wrapper).toContain('class="tw on-ink"');
  });

  it("points Section at the island's own heading", async () => {
    const wrapper = await readWrapper();
    expect(wrapper).toContain('labelledBy="tw-heading"');
  });
});

describe('the band stylesheet', () => {
  const readStylesheet = async () => {
    const { readFile } = await import('node:fs/promises');
    return readFile(new URL('../src/components/home/TechnicalWorlds.astro', import.meta.url), 'utf8');
  };

  it('resolves an accent for every domain', async () => {
    const css = await readStylesheet();
    // CSS cannot build `--color-domain-${id}` from the `data-domain` value, so
    // the mapping is written out. This is the guard that a sixth domain does
    // not silently render as a grey stage.
    for (const domain of DOMAINS) {
      expect(css).toContain(`.tw [data-domain='${domain.id}']`);
      expect(css).toContain(`--tw-accent: var(${domain.accentVar});`);
    }
  });

  /**
   * Every rule that starts an animation must be gated on
   * `[data-active='true']`, or an inactive stage keeps animating and
   * MOTION_SYSTEM §4's one-stage-at-a-time rule becomes a comment rather than
   * a fact. This walks the declaration blocks rather than pattern-matching
   * lines, so a rule spread over several lines cannot slip past it.
   */
  const animationRules = (css: string) => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
    // Drop @keyframes bodies: their nested braces are not rules, and their
    // percentage stops never start an animation.
    const withoutKeyframes = withoutComments.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
    const rules: { selector: string; body: string }[] = [];
    for (const match of withoutKeyframes.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = (match[1] ?? '').trim();
      const body = match[2] ?? '';
      // Only rules that *start* an animation. `animation: none` is the
      // reduced-motion block switching them off — the opposite concern, and it
      // must not be required to carry the active gate. Declarations are split
      // rather than pattern-matched: a lookahead for `none` backtracks over
      // the whitespace and matches anyway.
      const startsAnimation = body.split(';').some((declaration) => {
        const separator = declaration.indexOf(':');
        if (separator < 0) return false;
        const property = declaration.slice(0, separator).trim();
        if (property !== 'animation' && property !== 'animation-name') return false;
        return !declaration
          .slice(separator + 1)
          .trim()
          .startsWith('none');
      });
      if (startsAnimation) rules.push({ selector, body });
    }
    return rules;
  };

  it('starts an animation only under an active stage', async () => {
    const css = await readStylesheet();
    const rules = animationRules(css);

    // Guard against the parser silently matching nothing, which would make
    // every assertion below vacuous.
    expect(rules.length).toBeGreaterThanOrEqual(4);

    for (const { selector } of rules) {
      // The two pulse paths are the one exception: the island renders them
      // only while the stage is active, so they cannot exist on an inactive
      // one at all — there is no resting element for the rule to reach.
      const isPulse = selector.includes('.tw-route-pulse') || selector.includes('.tw-trace-pulse');
      expect(isPulse || selector.includes("[data-active='true']")).toBe(true);
    }
  });

  it('gates the traverse layout on the attribute the island sets after GSAP loads', async () => {
    const css = await readStylesheet();
    // If the horizontal layout applied without `data-traverse`, a failed GSAP
    // import would leave an unpinned, un-scrollable strip showing one domain.
    expect(css).toContain(".tw[data-traverse='true'] .tw-track");
    expect(css).toContain('height: 100svh');
    // The stacked track must not depend on that attribute to be readable.
    expect(css).toMatch(/\.tw-track\s*\{[^}]*display:\s*grid/);
  });
});
