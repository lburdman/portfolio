/**
 * The project card's raking light: the pure geometry, the media gates, and the
 * source invariants that hold the CSS and the script to the same contract.
 *
 * The DOM wiring itself (`ProjectGrid.astro`'s `<script>`) is not unit-tested
 * and deliberately so — a node-environment test of it would assert that mocked
 * observers were constructed, not that a light moves. What *is* testable is
 * pulled out into `src/lib/motion/`, and what cannot be is pinned here as a
 * source assertion, in the same style as `tests/project-card.test.ts`: every
 * invariant below is one that is invisible in `astro dev` and only bites on a
 * real build, on a real input device, or for a user who asked for less motion.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { boxContains, lightPosition, pickBox, RESTING_LIGHT, type CardBox } from '../src/lib/motion/card-light.ts';
import { FINE_POINTER_QUERY, matchesMedia, REDUCED_MOTION_QUERY, watchMedia } from '../src/lib/motion/media.ts';

function source(relative: string): string {
  return readFileSync(fileURLToPath(new URL(`../src/${relative}`, import.meta.url)), 'utf8');
}

/** Strips block comments so prose about `:hover` cannot satisfy a `:hover` guard. */
function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** The `<style>` block of an Astro component, comments removed. */
function styles(relative: string): string {
  const block = /<style>([\s\S]*)<\/style>/.exec(source(relative));
  if (!block?.[1]) throw new Error(`${relative} has no <style> block`);
  return withoutComments(block[1]);
}

/** Every selector list in a stylesheet, flattened and whitespace-normalised. */
function selectorLists(css: string): string[] {
  const lists: string[] = [];
  for (const match of css.matchAll(/(^|[{}])([^{}@]+)\{/g)) {
    const list = (match[2] ?? '').trim().replace(/\s+/g, ' ');
    // Declarations inside a block are not selectors; a selector list has no colon
    // outside a pseudo, and a declaration never starts with `.`, `:` or an
    // element name followed by `{`.
    if (list.length > 0 && !list.includes(';')) lists.push(list);
  }
  return lists;
}

const BOX: CardBox = { x: 100, y: 200, width: 400, height: 300 };

describe('lightPosition', () => {
  it('maps a pointer at the box origin to the top-left corner', () => {
    expect(lightPosition(BOX, 100, 200)).toEqual({ x: 0, y: 0 });
  });

  it('maps the centre to 50% / 50%', () => {
    expect(lightPosition(BOX, 300, 350)).toEqual({ x: 50, y: 50 });
  });

  it('maps a point a quarter across and two thirds down', () => {
    expect(lightPosition(BOX, 200, 400)).toEqual({ x: 25, y: 66.7 });
  });

  it('clamps a pointer that has already left the box', () => {
    // The last frame before `pointerleave` can carry coordinates a pixel or two
    // outside; unclamped, the highlight kicks sideways on the way out.
    expect(lightPosition(BOX, 40, 900)).toEqual({ x: 0, y: 100 });
    expect(lightPosition(BOX, 9000, -9000)).toEqual({ x: 100, y: 0 });
  });

  it('answers the resting light for a box with no area', () => {
    // A `hidden` card (the domain filter) measures 0×0. `NaN` here would make
    // `--card-x` invalid at computed-value time, which invalidates the whole
    // `background-image` declaration and drops the sheet entirely.
    expect(lightPosition({ x: 0, y: 0, width: 0, height: 0 }, 10, 10)).toEqual(RESTING_LIGHT);
    expect(lightPosition({ x: 0, y: 0, width: 400, height: 0 }, 10, 10)).toEqual(RESTING_LIGHT);
  });

  it('rounds to one decimal place, so a 1000 Hz mouse does not churn the property', () => {
    const light = lightPosition({ x: 0, y: 0, width: 3, height: 3 }, 1, 1);
    expect(light.x).toBe(33.3);
    expect(String(light.x)).not.toMatch(/\.\d{2}/);
  });
});

describe('boxContains', () => {
  it('includes the near edges and excludes the far ones', () => {
    // Half-open, so two boxes sharing an edge cannot both claim a pixel and the
    // listing can never light two cards at once.
    expect(boxContains(BOX, 100, 200)).toBe(true);
    expect(boxContains(BOX, 499, 499)).toBe(true);
    expect(boxContains(BOX, 500, 350)).toBe(false);
    expect(boxContains(BOX, 300, 500)).toBe(false);
    expect(boxContains(BOX, 99, 350)).toBe(false);
  });

  it('never contains a point when the box has no area', () => {
    expect(boxContains({ x: 10, y: 10, width: 0, height: 0 }, 10, 10)).toBe(false);
  });
});

describe('pickBox', () => {
  const boxes: CardBox[] = [
    { x: 0, y: 0, width: 100, height: 100 },
    { x: 100, y: 0, width: 100, height: 100 },
  ];

  it('finds the box under the pointer', () => {
    expect(pickBox(boxes, 50, 50)).toBe(0);
    expect(pickBox(boxes, 150, 50)).toBe(1);
  });

  it('gives the shared edge to exactly one box', () => {
    expect(pickBox(boxes, 100, 50)).toBe(1);
  });

  it('answers -1 when the pointer is over no card', () => {
    expect(pickBox(boxes, 50, 500)).toBe(-1);
    expect(pickBox([], 0, 0)).toBe(-1);
  });
});

describe('media helpers', () => {
  it('answers false where matchMedia does not exist', () => {
    // The node test environment has no `window`, which is the same shape as the
    // server render and as a user agent too old to know the query: unsupported
    // must mean "does not match", so the resting state is what ships.
    expect(matchesMedia(REDUCED_MOTION_QUERY)).toBe(false);
    expect(matchesMedia(FINE_POINTER_QUERY)).toBe(false);
  });

  it('returns a callable unsubscribe even with nothing to subscribe to', () => {
    const stop = watchMedia(REDUCED_MOTION_QUERY, () => {});
    expect(() => stop()).not.toThrow();
  });

  it('declares the reduced-motion query exactly once for the whole site', () => {
    // `src/components/visuals/worlds/useMediaQuery.ts` is the React binding of
    // the same idea and carries its own copy for the island. Nothing else may.
    expect(REDUCED_MOTION_QUERY).toBe('(prefers-reduced-motion: reduce)');
    expect(FINE_POINTER_QUERY).toBe('(pointer: fine)');
  });
});

describe('the card and the script agree about the resting light', () => {
  /**
   * `RESTING_LIGHT` is what the pointer script hands a card back to when the
   * cursor leaves — by removing the properties, so the stylesheet's own default
   * takes over again. If the two ever disagree, the light would jump on
   * `pointerleave`, and it would jump only on a device that has a pointer,
   * which is exactly the case a source review does not exercise.
   */
  it('ProjectCard declares --card-x / --card-y matching RESTING_LIGHT', () => {
    const css = styles('components/projects/ProjectCard.astro');
    expect(css).toMatch(new RegExp(`--card-x:\\s*${RESTING_LIGHT.x}%`));
    expect(css).toMatch(new RegExp(`--card-y:\\s*${RESTING_LIGHT.y}%`));
  });

  it('consumes them in a static rule rather than an attribute', () => {
    // CSSOM writes are permitted by the hash-based CSP; a `style` attribute is
    // dropped in production and works perfectly in `astro dev`.
    const css = styles('components/projects/ProjectCard.astro');
    expect(css).toMatch(/radial-gradient\([^)]*at var\(--card-x\) var\(--card-y\)/);

    const script = withoutComments(source('components/projects/ProjectGrid.astro'));
    expect(script).toContain("style.setProperty('--card-x'");
    expect(script).toContain("style.setProperty('--card-y'");
    expect(script).not.toMatch(/setAttribute\(\s*'style'/);
  });
});

describe('the hover state is reachable without a pointer', () => {
  /**
   * MOTION_SYSTEM §7: nothing may be hover-only. The card's whole interaction is
   * a lit, raised sheet, and every declaration that produces it must therefore
   * answer to focus as well — otherwise a keyboard user tabbing through a
   * listing gets a link with no visible affordance at all.
   */
  it('every :hover rule in ProjectCard has a focus twin in the same selector list', () => {
    const hoverLists = selectorLists(styles('components/projects/ProjectCard.astro')).filter((list) =>
      list.includes(':hover'),
    );

    expect(hoverLists.length).toBeGreaterThan(0);
    for (const list of hoverLists) {
      expect(list, `${list} responds to a pointer and to nothing else`).toMatch(/:focus-(within|visible)/);
    }
  });

  it('gives the link itself a state, not only the article around it', () => {
    // `.card__link` is the focusable, clickable element — its stretched
    // `::after` is the card's entire hit area — and it carried no `:hover` and
    // no `:focus-visible` of its own at all.
    const css = styles('components/projects/ProjectCard.astro');
    expect(css).toMatch(/\.card__link:hover,\s*\.card__link:focus-visible\s*\{/);
  });

  it('enumerates what the link transitions rather than writing `all`', () => {
    const css = styles('components/projects/ProjectCard.astro');
    expect(css).not.toMatch(/transition:\s*all/);
    expect(css).toMatch(/\.card__link\s*\{[^}]*transition:\s*text-decoration-color/);
  });
});

describe('the sheet is visible without motion', () => {
  /**
   * A card that communicates only by moving fails for exactly the users this
   * matters most for. Under reduced motion the site's global stylesheet already
   * collapses every duration to 1ms, so what must survive here is the *static*
   * half of the state: the shadow, the edge and the shading.
   */
  it('withdraws the lift under reduced motion and nothing else', () => {
    const css = styles('components/projects/ProjectCard.astro');
    const block = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n {2}\}/.exec(css);
    expect(block?.[1]).toBeDefined();

    const reduced = block?.[1] ?? '';
    expect(reduced, 'the lift is motion and goes').toMatch(/transform:\s*none/);
    expect(reduced, 'the sheet is the affordance and stays').not.toMatch(/box-shadow|opacity:\s*0\b/);
  });

  it('carries a real shadow and a real edge, not a paper-on-paper pool', () => {
    // The deployed build's hover changed no shadow, no border and no background
    // that a pixel diff could find: the "spotlight" was `--color-paper-raised`
    // on `--color-paper`, and the only visible movement was a 2px text shift.
    const css = styles('components/projects/ProjectCard.astro');
    const sheet = /\.card::before \{([\s\S]*?)\n {2}\}/.exec(css)?.[1] ?? '';
    expect(sheet).toMatch(/box-shadow:/);
    expect(sheet).toMatch(/border:\s*var\(--border-hairline\)/);
    expect(sheet).toMatch(/color-mix\(in oklab, var\(--color-ink\)/);
  });

  it('gives a coarse pointer the sheet at rest', () => {
    const css = styles('components/projects/ProjectCard.astro');
    const touch = /@media \(hover: none\) \{([\s\S]*?)\n {2}\}/.exec(css)?.[1] ?? '';
    expect(touch).toMatch(/\.card::before \{[^}]*opacity:\s*1/);
  });
});

describe('the pointer enhancement is gated and bounded', () => {
  const script = withoutComments(source('components/projects/ProjectGrid.astro'));

  it('attaches nothing under reduced motion or a coarse pointer', () => {
    expect(script).toMatch(
      /if \(matchesMedia\(REDUCED_MOTION_QUERY\) \|\| !matchesMedia\(FINE_POINTER_QUERY\)\) return;/,
    );
  });

  it('re-evaluates when the device or the OS setting changes', () => {
    expect(script).toContain('watchMedia(REDUCED_MOTION_QUERY, reevaluate)');
    expect(script).toContain('watchMedia(FINE_POINTER_QUERY, reevaluate)');
  });

  it('listens on the grid, never on the window and never per card', () => {
    // One listener per listing. A `window` listener would run for every pointer
    // movement anywhere on the page, and a per-card one multiplies that by four.
    expect(script).toContain("field.addEventListener('pointermove', onPointerMove");
    expect(script).not.toMatch(/window\.addEventListener\(\s*'pointermove'/);
    expect(script).not.toMatch(/card\.addEventListener\(\s*'pointermove'/);
  });

  it('measures in a batch and never inside the pointer handler', () => {
    const handler = /function onPointerMove\([\s\S]*?\n {4}\}/.exec(script)?.[0] ?? '';
    expect(handler).not.toContain('getBoundingClientRect');
    expect(handler).not.toContain('scrollX');
    expect(script).toMatch(/function measure\(\): void \{[\s\S]*?getBoundingClientRect/);
  });

  it('keeps at most one animation frame in flight and cancels it on teardown', () => {
    expect(script).toContain('if (frame === 0) frame = window.requestAnimationFrame(paint)');
    expect(script).toContain('window.cancelAnimationFrame(frame)');
  });

  it('measures only the cards an IntersectionObserver has admitted', () => {
    expect(script).toContain('new IntersectionObserver');
    expect(script).toMatch(/for \(const card of cards\)/);
  });

  it('removes every listener and observer it added', () => {
    const detach = /function detach\(\): void \{([\s\S]*?)\n {4}\}/.exec(script)?.[1] ?? '';
    expect(detach).toContain("removeEventListener('pointermove'");
    expect(detach).toContain("removeEventListener('pointerleave'");
    expect(detach).toContain('intersection?.disconnect()');
    expect(detach).toContain('resize?.disconnect()');
  });
});
