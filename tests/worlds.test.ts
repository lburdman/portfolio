import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DOMAINS } from '../src/config/domains';
import {
  activeIndexFromProgress,
  clamp01,
  clampIndex,
  FINALE_DWELL,
  nextIndexForKey,
  pinnedScrollLength,
  progressForIndex,
  scrollTargetForIndex,
  SCROLL_PER_STEP,
  TRAVEL_SHARE,
  travelProgress,
  travelShare,
  TRAVERSE_LENGTH,
  TRAVERSE_SCROLL_HEIGHTS,
  traverseIds,
} from '../src/components/visuals/worlds/traverse';
import { HYDRATION_QUERY, REDUCED_MOTION_QUERY, TRAVERSE_QUERY } from '../src/components/visuals/worlds/useMediaQuery';
import {
  bandHalfWidth,
  createRandom,
  forecastSignal,
  interferenceProfile,
  interpolateAt,
  manhattanLength,
  manhattanPath,
  polylinePath,
  ribbonPath,
  spectrumBars,
  wavePath,
} from '../src/components/visuals/worlds/stage-geometry';
import { FORECAST_NOW_X } from '../src/components/visuals/worlds/stages/ForecastStage';
import { ROUTE_CELLS, ROUTE_STEPS } from '../src/components/visuals/worlds/stages/RoutingStage';

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

  it('answers the first index for a non-finite one', () => {
    // `Math.trunc(NaN)` is NaN and every comparison against it is false, so
    // without the guard this would return NaN and index the panel array with
    // it. Both infinities are checked because only one of them is caught by
    // the "above the last index" branch.
    expect(clampIndex(Number.NaN, COUNT)).toBe(0);
    expect(clampIndex(Number.POSITIVE_INFINITY, COUNT)).toBe(0);
    expect(clampIndex(Number.NEGATIVE_INFINITY, COUNT)).toBe(0);
  });

  it('truncates a fractional index rather than rounding it', () => {
    expect(clampIndex(2.9, COUNT)).toBe(2);
    expect(clampIndex(-0.4, COUNT)).toBe(0);
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

  it('answers 0 for a single-domain or empty sequence instead of dividing by zero', () => {
    // `count - 1` is the divisor. Without the guard a one-domain site would
    // put every stop at Infinity and scroll the keyboard traverse off the page.
    expect(progressForIndex(0, 1)).toBe(0);
    expect(progressForIndex(3, 1)).toBe(0);
    expect(progressForIndex(0, 0)).toBe(0);
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

  it('keeps every stop inside the travelling part of the range', () => {
    // With a quarter of the range reserved as the finale's hold, the last stop
    // is three quarters of the way along — not at the very end, where the
    // track has already been parked and stopped moving.
    expect(scrollTargetForIndex(4, 5, 1000, 3000, 0.75)).toBe(2500);
    expect(scrollTargetForIndex(2, 5, 1000, 3000, 0.75)).toBe(1750);
    // Home is unaffected by the hold, which is exactly why the End case has to
    // be asserted separately: a missing share is half-right and looks fine.
    expect(scrollTargetForIndex(0, 5, 1000, 3000, 0.75)).toBe(1000);
  });

  it('treats a missing or nonsensical share as the whole range', () => {
    expect(scrollTargetForIndex(4, 5, 1000, 3000)).toBe(3000);
    expect(scrollTargetForIndex(4, 5, 1000, 3000, 0)).toBe(3000);
    expect(scrollTargetForIndex(4, 5, 1000, 3000, Number.NaN)).toBe(3000);
    expect(scrollTargetForIndex(4, 5, 1000, 3000, 4)).toBe(3000);
  });

  it('answers 0 for a non-finite range start', () => {
    // `self.start` is NaN if a keypress arrives before ScrollTrigger has
    // measured anything. `window.scrollTo({ top: NaN })` is a silent no-op in
    // some engines and a jump in others; 0 is the same in both.
    expect(scrollTargetForIndex(2, 5, Number.NaN, 3000)).toBe(0);
    expect(scrollTargetForIndex(2, 5, Number.POSITIVE_INFINITY, 3000)).toBe(0);
  });

  it('answers the range start for a non-finite range end', () => {
    expect(scrollTargetForIndex(2, 5, 1200, Number.NaN)).toBe(1200);
    expect(scrollTargetForIndex(2, 5, 1200, Number.POSITIVE_INFINITY)).toBe(1200);
  });
});

/* ===========================================================================
   The pin's scroll budget, and the finale's dwell

   docs/REDESIGN_DECISIONS.md #14 and the Audio row of §P2. Before this, the
   pinned range WAS the horizontal travel distance in pixels, which made the
   section 43% of the document (measured: 4400px of 10207px at 1440×900) and
   gave the last of five worlds no dwell at all — it reached the centre of the
   viewport at y=6500 and the pin released at y=6500.

   Both numbers below are budgets, not measurements of anything, so what is
   worth asserting is the relationships they have to hold to.
   ======================================================================== */

describe('the pinned scroll budget', () => {
  it('is the travel steps plus one dwell for the finale', () => {
    expect(TRAVERSE_SCROLL_HEIGHTS).toBeCloseTo((TRAVERSE_LENGTH - 1) * SCROLL_PER_STEP + FINALE_DWELL, 10);
  });

  it('gives the last world a dwell comparable to a full step', () => {
    // The defect was a finale with zero dwell. A hold shorter than about half
    // a step would not fix it, and one longer than a step would read as the
    // page having stalled.
    expect(FINALE_DWELL).toBeGreaterThanOrEqual(SCROLL_PER_STEP / 2);
    expect(FINALE_DWELL).toBeLessThanOrEqual(SCROLL_PER_STEP * 1.5);
  });

  it('keeps the band under a third of a five-section page', () => {
    // The rest of this document measured ~5750px with the band excluded. A pin
    // longer than half of that is the "half the page is one section" finding.
    const rest = 5750;
    const pin = pinnedScrollLength(900);
    expect(pin / (rest + pin)).toBeLessThan(1 / 3);
    // …and the previous behaviour, ~4400px, would have failed exactly this.
    expect(4400 / (rest + 4400)).toBeGreaterThan(1 / 3);
  });

  it('scales the pin with the viewport rather than with the track width', () => {
    expect(pinnedScrollLength(900)).toBe(Math.round(TRAVERSE_SCROLL_HEIGHTS * 900));
    expect(pinnedScrollLength(1800)).toBe(2 * pinnedScrollLength(900));
  });

  it('answers zero for a viewport it cannot measure', () => {
    // ScrollTrigger reads 0 as "no range", which leaves the band unpinned —
    // the safe failure. A NaN here would pin it forever.
    expect(pinnedScrollLength(0)).toBe(0);
    expect(pinnedScrollLength(-100)).toBe(0);
    expect(pinnedScrollLength(Number.NaN)).toBe(0);
  });
});

describe('travelProgress', () => {
  it('reaches the end of the track before the end of the scroll range', () => {
    expect(travelProgress(0, 0.8)).toBe(0);
    expect(travelProgress(0.4, 0.8)).toBeCloseTo(0.5, 10);
    expect(travelProgress(0.8, 0.8)).toBe(1);
  });

  it('saturates through the finale hold instead of overrunning', () => {
    // This is the assertion that stops the traverse reporting a sixth stop
    // that does not exist while the last world is holding.
    expect(travelProgress(0.9, 0.8)).toBe(1);
    expect(travelProgress(1, 0.8)).toBe(1);
    expect(activeIndexFromProgress(travelProgress(1, 0.8), COUNT)).toBe(COUNT - 1);
    expect(activeIndexFromProgress(travelProgress(0.85, 0.8), COUNT)).toBe(COUNT - 1);
  });

  it('is the identity when the whole range travels', () => {
    expect(travelProgress(0.3, 1)).toBeCloseTo(0.3, 10);
  });

  it('answers "arrived" rather than NaN for a degenerate share', () => {
    expect(travelProgress(0.5, 0)).toBe(1);
    expect(travelProgress(0.5, Number.NaN)).toBe(1);
  });

  it("defaults to the island's own share", () => {
    expect(TRAVEL_SHARE).toBeGreaterThan(0);
    expect(TRAVEL_SHARE).toBeLessThan(1);
    expect(travelProgress(TRAVEL_SHARE)).toBe(1);
    expect(travelProgress(1)).toBe(1);
  });

  it('clamps a progress reported outside 0…1', () => {
    expect(travelProgress(-0.5, 0.8)).toBe(0);
    expect(travelProgress(1.6, 0.8)).toBe(1);
    expect(travelProgress(Number.NaN, 0.8)).toBe(0);
    expect(travelProgress(-0.5, 1)).toBe(0);
  });
});

describe('travelShare', () => {
  it('is travel over travel-plus-hold', () => {
    expect(travelShare(4, 0.6, 0.4)).toBeCloseTo(2.4 / 2.8, 10);
    expect(travelShare(3, 1, 1)).toBeCloseTo(0.75, 10);
  });

  it('is 1 when nothing is held back', () => {
    expect(travelShare(4, 0.6, 0)).toBe(1);
  });

  it('is 0 when nothing travels — a one-domain traverse is all hold', () => {
    // Reachable: `DOMAINS` is the only source of the step count, so a site cut
    // down to a single world would land here. `travelProgress` then reports
    // "arrived" for every scroll position, which is correct: there is nowhere
    // to travel to.
    expect(travelShare(0, 0.6, 0.4)).toBe(0);
    expect(travelProgress(0.5, travelShare(0, 0.6, 0.4))).toBe(1);
  });

  it('answers the plain proportional mapping for a range with no length', () => {
    expect(travelShare(0, 0, 0)).toBe(1);
    expect(travelShare(4, -1, 0)).toBe(1);
    expect(travelShare(4, Number.NaN, 0.4)).toBe(1);
  });

  it('never exceeds 1, even if a hold is given as negative', () => {
    expect(travelShare(4, 0.6, -0.4)).toBe(1);
  });

  it('is the source of the exported constant', () => {
    expect(TRAVEL_SHARE).toBeCloseTo(travelShare(TRAVERSE_LENGTH - 1, SCROLL_PER_STEP, FINALE_DWELL), 12);
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
        { id: 'alpha', layerIndex: 0, accentVar: '--color-domain-alpha', stage: 'forecast' },
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

  it('does not lock up on a zero seed', () => {
    // State 0 is the LCG's fixed point for the multiply, so seeding with 0 —
    // or with anything that truncates to it — has to be substituted, or the
    // stream would be a constant and every "organic" layout a straight line.
    const zero = Array.from({ length: 6 }, createRandom(0));
    const fraction = Array.from({ length: 6 }, createRandom(0.4));
    expect(new Set(zero).size).toBe(zero.length);
    expect(fraction).toEqual(zero);
  });
});

describe('forecastSignal', () => {
  it('is deterministic — the server render and the hydration render must agree', () => {
    // A `Math.random()` in the series would make React discard the server
    // markup and re-render the island. That failure is invisible but for a
    // console warning, so it is asserted rather than assumed.
    const once = Array.from({ length: 40 }, (_, i) => forecastSignal(i / 39));
    const twice = Array.from({ length: 40 }, (_, i) => forecastSignal(i / 39));
    expect(once).toEqual(twice);
  });

  it('stays inside the amplitude the stage maps it with', () => {
    // `ForecastStage` multiplies by a single constant and assumes roughly ±0.8.
    // A series that exceeded it would draw outside the frame.
    for (let i = 0; i <= 400; i += 1) {
      expect(Math.abs(forecastSignal(i / 400))).toBeLessThan(0.8);
    }
  });

  it('carries structure rather than being a single sine', () => {
    // A forecastable series has to have something a model could have learned.
    // Counting sign changes in the first difference separates "one carrier"
    // from "several": a pure sine over this window turns twice, no more.
    let turns = 0;
    let previous = forecastSignal(0.001) - forecastSignal(0);
    for (let i = 2; i <= 400; i += 1) {
      const delta = forecastSignal(i / 400) - forecastSignal((i - 1) / 400);
      if (delta * previous < 0) turns += 1;
      previous = delta;
    }
    expect(turns).toBeGreaterThan(6);
  });

  it('answers a finite value for a non-finite input rather than NaN', () => {
    expect(Number.isFinite(forecastSignal(Number.NaN))).toBe(true);
  });
});

describe('bandHalfWidth', () => {
  it('is already non-zero at the origin — residuals are not zero one step ahead', () => {
    expect(bandHalfWidth(0, 0.085, 0.44, 0.6)).toBeCloseTo(0.085, 10);
  });

  it('widens monotonically with horizon, which is the whole statement', () => {
    let previous = -1;
    for (let i = 0; i <= 50; i += 1) {
      const width = bandHalfWidth(i / 50, 0.085, 0.44, 0.6);
      expect(width).toBeGreaterThan(previous);
      previous = width;
    }
  });

  it('widens concavely, not as a straight cone', () => {
    // A calibrated interval grows sublinearly. Halfway out it must already be
    // more than half of its final extra width; a linear fan would be exactly
    // half, and this is what distinguishes the two pictures.
    const base = 0.085;
    const span = 0.44;
    const mid = bandHalfWidth(0.5, base, span, 0.6) - base;
    expect(mid).toBeGreaterThan(span * 0.5);
  });

  it('clamps the horizon rather than extrapolating past the frame', () => {
    expect(bandHalfWidth(4, 0.085, 0.44, 0.6)).toBeCloseTo(0.525, 10);
    expect(bandHalfWidth(-2, 0.085, 0.44, 0.6)).toBeCloseTo(0.085, 10);
    expect(bandHalfWidth(Number.NaN, 0.085, 0.44, 0.6)).toBeCloseTo(0.085, 10);
  });

  it('falls back to a linear exponent when given a useless one', () => {
    expect(bandHalfWidth(0.5, 0, 1, 0)).toBeCloseTo(0.5, 10);
    expect(bandHalfWidth(0.5, 0, 1, Number.NaN)).toBeCloseTo(0.5, 10);
  });
});

describe('polylinePath and ribbonPath', () => {
  const upper = [
    { x: 0, y: 10 },
    { x: 10, y: 8 },
    { x: 20, y: 4 },
  ];
  const lower = [
    { x: 0, y: 12 },
    { x: 10, y: 16 },
    { x: 20, y: 22 },
  ];

  it('moves once and lines thereafter', () => {
    expect(polylinePath(upper)).toBe('M0.00 10.00 L10.00 8.00 L20.00 4.00');
  });

  it('answers an empty string for no points', () => {
    expect(polylinePath([])).toBe('');
  });

  it('closes the ribbon and returns along the lower edge in reverse', () => {
    expect(ribbonPath(upper, lower)).toBe(
      'M0.00 10.00 L10.00 8.00 L20.00 4.00 L20.00 22.00 L10.00 16.00 L0.00 12.00 Z',
    );
  });

  it('does not mutate the edge it reverses', () => {
    const snapshot = lower.map((point) => ({ ...point }));
    ribbonPath(upper, lower);
    expect(lower).toEqual(snapshot);
  });

  it('answers an empty string when either edge is missing', () => {
    expect(ribbonPath([], lower)).toBe('');
    expect(ribbonPath(upper, [])).toBe('');
  });
});

describe('interpolateAt', () => {
  const values = [0, 1, -1];

  it('hits the table exactly at the sample positions', () => {
    expect(interpolateAt(values, 0)).toBe(0);
    expect(interpolateAt(values, 0.5)).toBe(1);
    expect(interpolateAt(values, 1)).toBe(-1);
  });

  it('interpolates linearly between them', () => {
    expect(interpolateAt(values, 0.25)).toBeCloseTo(0.5, 10);
    expect(interpolateAt(values, 0.75)).toBeCloseTo(0, 10);
  });

  it('clamps outside the unit interval instead of running off the table', () => {
    expect(interpolateAt(values, -3)).toBe(0);
    expect(interpolateAt(values, 9)).toBe(-1);
    expect(interpolateAt(values, Number.NaN)).toBe(0);
  });

  it('degrades safely on short tables', () => {
    expect(interpolateAt([], 0.4)).toBe(0);
    expect(interpolateAt([7], 0.4)).toBe(7);
  });
});

/**
 * One number in this island lives in both TypeScript and CSS — the FPGA route's
 * step count, because a keyframe timing function cannot import a module and
 * handing one a value would mean an inline custom property, which the site's
 * CSP drops. It is asserted against the stylesheet's own source, so a change on
 * either side fails here rather than quietly clocking the pulse at the wrong
 * rate.
 */
describe('the constant duplicated into the stylesheet', () => {
  const stylesheet = readFileSync(new URL('../src/components/home/TechnicalWorlds.astro', import.meta.url), 'utf8');

  it('steps the FPGA pulse once per cell on the route', () => {
    expect(ROUTE_CELLS.length).toBeGreaterThan(0);
    for (const route of ROUTE_CELLS) expect(route.length).toBe(ROUTE_STEPS);
    expect(stylesheet).toContain(`steps(${ROUTE_STEPS}, end)`);
  });

  it('opens the forecast fan without naming the rule in CSS', () => {
    // The activation reveals the band with a clip whose percentages resolve
    // against the band's own box. A `transform-origin` in view-box coordinates
    // would work too, and would put a copy of `FORECAST_NOW_X` in a stylesheet
    // that cannot import it. That copy is what this forbids.
    expect(stylesheet).not.toContain(`${FORECAST_NOW_X}px`);
    expect(stylesheet).toContain('clip-path: inset(-30% 100%');
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

  it('samples the centre of the screen for a single-bin histogram', () => {
    // With one sample there is no `(i / (count - 1))` to compute; the guard
    // has to answer the on-axis position, which is always constructive.
    expect(interferenceProfile(1, 90, 26)).toEqual([1]);
    expect(interferenceProfile(0, 90, 26)).toEqual([1]);
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

  it('draws a flat line rather than dividing by zero for weightless harmonics', () => {
    const path = wavePath(320, 100, 4, 5, [0, 0]);
    for (const pair of path.slice(1).split(/[ML]/).filter(Boolean)) {
      expect(Number(pair.trim().split(' ')[1])).toBeCloseTo(50, 6);
    }
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

  it('answers a single sample at the low end rather than dividing by zero', () => {
    const [only] = spectrumBars(1, 0.5, 12);
    expect(Number.isFinite(only)).toBe(true);
    expect(spectrumBars(0, 0.5, 12)).toHaveLength(1);
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

  /**
   * The forecast stage's one claim is that the observed series *stops* and a
   * calibrated interval *starts*, at one instant. Three separate paths have to
   * agree on where that instant is, and none of them is derived from the
   * others at runtime — they are three walks over the same `t`.
   */
  it('starts the forecast exactly where the observation stops', async () => {
    const { html } = await render();
    const x = FORECAST_NOW_X.toFixed(2);
    // The rule itself.
    expect(html).toContain(`class="tw-fc-now" x1="${FORECAST_NOW_X}"`);
    // The observed history ends on it…
    expect(html).toMatch(new RegExp(`class="tw-fc-history" d="[^"]*L${x} [\\d.]+"`));
    // …and the point forecast, the realised continuation and both band edges
    // all begin on it. A band that opened anywhere else would be drawing an
    // interval around horizons that had already happened.
    for (const cls of ['tw-fc-median', 'tw-fc-realised']) {
      expect(html).toMatch(new RegExp(`class="${cls}" d="M${x} `));
    }
    expect(html.match(new RegExp(`class="tw-fc-band" data-level="\\w+" d="M${x} `, 'g'))).toHaveLength(2);
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
    // `client:media`, so on a phone, a short window or with reduced motion it
    // never hydrates at all — an attribute added at hydration time would
    // simply not exist for those visitors. Without it the canvas keeps running
    // behind this band and nothing in either module would report the problem.
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

  /* ── The hydration gate (docs/REDESIGN_DECISIONS.md #11) ─────────────────
     `client:visible` hydrated this island for everyone who scrolled to it,
     including the viewports whose first act after hydrating is to decide not
     to build the timeline. Measured: 67.2 KB gz of React and island code to
     re-render markup already present in the HTML. */

  /** The `<Section>…</Section>` block only — the prose above it discusses the
      directive this band no longer uses, and the stylesheet below it has its
      own legitimate `min-width` breakpoints. */
  const readMarkup = async () => {
    const wrapper = await readWrapper();
    return wrapper.slice(wrapper.indexOf('<Section'), wrapper.indexOf('</Section>'));
  };

  it('downloads the island only on viewports that can run the traverse', async () => {
    const markup = await readMarkup();
    expect(markup).toContain('client:media={HYDRATION_QUERY}');
    // Not `client:visible`, and not `client:load`: either one puts React on
    // the phone path for a section a phone renders from HTML alone.
    expect(markup).not.toContain('client:visible');
    expect(markup).not.toContain('client:load');
    expect(markup).not.toContain('client:idle');
  });

  it('imports the gate rather than restating the query', async () => {
    const wrapper = await readWrapper();
    const frontmatter = wrapper.slice(0, wrapper.indexOf('\n---', 3));
    // A second copy of the breakpoint here could drift from the one the island
    // gates its timeline on, and the symptom would be a viewport that
    // downloads 60 KB and never pins — silently, and only in production.
    expect(frontmatter).toContain("import { HYDRATION_QUERY } from '../visuals/worlds/useMediaQuery'");
    expect(frontmatter.replace(/\/\*[\s\S]*?\*\//g, '')).not.toContain('min-width');
  });
});

describe('the hydration query', () => {
  it("is the island's own traverse breakpoint, widened by nothing", () => {
    expect(HYDRATION_QUERY.startsWith(TRAVERSE_QUERY)).toBe(true);
  });

  it('excludes reduced-motion visitors too', () => {
    // `client:media` takes any media query, so the motion preference belongs
    // in it — the island would refuse to build the timeline for these users
    // anyway, and this is what stops them paying for the refusal.
    expect(HYDRATION_QUERY).toContain('prefers-reduced-motion');
    // `no-preference` rather than the MQ4 `not (… : reduce)` form: an
    // unparsed query never matches, and the browsers that cannot parse MQ4
    // booleans would silently lose the traverse.
    expect(HYDRATION_QUERY).toContain('(prefers-reduced-motion: no-preference)');
    expect(HYDRATION_QUERY).not.toContain('not (');
  });

  it('is a single conjunction, so any clause failing keeps the stack', () => {
    const clauses = HYDRATION_QUERY.split(' and ');
    expect(clauses).toHaveLength(3);
    for (const clause of clauses) expect(clause.startsWith('(')).toBe(true);
    expect(HYDRATION_QUERY).not.toContain(',');
  });

  it('leaves the runtime gates alone', () => {
    // Two independent decisions: this one is what gets fetched, those are what
    // gets built. Neither may become the other's proxy.
    expect(REDUCED_MOTION_QUERY).toBe('(prefers-reduced-motion: reduce)');
    expect(TRAVERSE_QUERY).toContain('min-width');
    expect(TRAVERSE_QUERY).toContain('min-height');
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

  /* ── The trailing spacer (docs/REDESIGN_DECISIONS.md #15) ────────────────
     Five panels pitched 86% apart travel 430% − 100% = 330% across four steps,
     which is 82.5% per step against an 86% pitch. The 3.5% shortfall
     accumulates and leaves the outgoing panel standing inside the frame at
     every stop — measured slivers of 46, 102, 157 and 213px at 1440×900, each
     showing the clipped tail of the previous stage's annotation.

     A spacer of exactly the peek width makes the travel a whole number of
     pitches, so the arithmetic in `traverse.ts` and the geometry in this file
     finally describe the same thing. */

  it('closes the track with a spacer exactly one peek wide', async () => {
    const css = await readStylesheet();
    expect(css).toMatch(/\.tw\[data-traverse='true'\] \.tw-track::after\s*\{[^}]*content:\s*''/);
    expect(css).toContain('flex: 0 0 calc(100% - var(--tw-panel-pitch));');
  });

  it('derives the panel width and the spacer from one number', async () => {
    const css = await readStylesheet();
    // The bug was two rules that were allowed to disagree. A literal `86%` on
    // the panel would let them disagree again.
    expect(css).toContain('--tw-panel-pitch: 86%;');
    expect(css).toContain('flex: 0 0 var(--tw-panel-pitch);');
    const panelRule = css.slice(css.indexOf(".tw[data-traverse='true'] .tw-panel {"));
    expect(panelRule.slice(0, panelRule.indexOf('}'))).not.toMatch(/flex:[^;]*\d+%/);
  });

  it('generates the spacer only while the traverse is engaged', async () => {
    const css = await readStylesheet();
    // Stacked, `.tw-track` is a grid: an unconditional `::after` would add an
    // empty row and a row-gap below the last domain.
    const spacer = css.indexOf('.tw-track::after');
    expect(spacer).toBeGreaterThan(0);
    expect(css.slice(0, spacer)).toMatch(/\.tw\[data-traverse='true'\] $/);
  });
});
