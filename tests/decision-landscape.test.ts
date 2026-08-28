import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  boundaryPath,
  CAPACITY_FROM,
  CAPACITY_SPAN,
  capacityFor,
  clampToPlot,
  contourPath,
  crosshairPath,
  fitAt,
  fitBarPath,
  FIT_ORIGIN_X,
  frameBlend,
  GLYPHS,
  landscapeAt,
  marginPath,
  nearestOnBoundary,
  PLOT,
  RESTING_QUERY,
  flagLit,
  FLAGGED,
} from '../src/lib/worlds/decision-landscape';
import {
  BOUNDARY_VERTS,
  CLASS_COUNT,
  CONTOUR_STRIDE,
  ERROR_INDICES,
  ERROR_SETTLED_AT,
  LANDSCAPE_FRAMES,
  OFFSETS_PER_VERTEX,
  POINT_COUNT,
  SUBPATH_COUNT,
} from '../src/lib/worlds/decision-landscape.data';

/**
 * The AI / ML stage's decision landscape.
 *
 * The stage this replaced failed on one specific, measurable count: its frames
 * at local progress 0.15, 0.50 and 0.88 were pixel-identical, because it read
 * no scroll at all. Several assertions here exist purely so that failure
 * cannot recur silently — most directly `the boundary is a function of the
 * scroll`, which compares the emitted path at three progresses.
 *
 * The rest guard the invariants a vertex-wise morph depends on. They are not
 * decoration: if any of them stops holding, the boundary pops mid-scroll, and
 * a pop is the sort of defect that is obvious in motion and invisible in a
 * screenshot.
 */

const ROOT = new URL('..', import.meta.url);

/* ── The three progresses that named the previous stage's defect ────────── */
const EARLY = 0.15;
const MIDDLE = 0.5;
const LATE = 0.9;

describe('the generated module', () => {
  /**
   * The generator is the source of truth and the checked-in module is its
   * output. Nothing stops someone editing the output by hand, so this re-runs
   * the bake and compares — which makes a hand edit a failing test rather than
   * a divergence that survives until the next regeneration.
   */
  it('matches a fresh run of its generator', () => {
    const script = fileURLToPath(new URL('scripts/gen-decision-landscape.mjs', ROOT));
    const fresh = execFileSync(process.execPath, [script, '--stdout'], { encoding: 'utf8' });
    const checkedIn = readFileSync(new URL('src/lib/worlds/decision-landscape.data.ts', ROOT), 'utf8');
    expect(fresh).toBe(checkedIn);
  });

  it('bakes more than one capacity, or there is nothing to morph between', () => {
    expect(LANDSCAPE_FRAMES.length).toBeGreaterThan(1);
  });

  /**
   * The invariant the whole design rests on. Marching squares answers an
   * unordered segment soup whose component count depends on the level set, so
   * "same number of subpaths, same number of vertices, same order" is a
   * property the generator has to enforce rather than one that comes free.
   */
  it('gives every frame the same subpath and vertex count', () => {
    for (const frame of LANDSCAPE_FRAMES) {
      expect(frame.boundary.length).toBe(SUBPATH_COUNT * BOUNDARY_VERTS * 2);
      expect(frame.offsets.length).toBe(
        SUBPATH_COUNT * Math.ceil(BOUNDARY_VERTS / CONTOUR_STRIDE) * OFFSETS_PER_VERTEX,
      );
      expect(frame.boundary.every((value) => Number.isFinite(value))).toBe(true);
      expect(frame.offsets.every((value) => Number.isFinite(value))).toBe(true);
    }
  });

  it('runs its capacities from 0 to 1 in order', () => {
    const lambdas = LANDSCAPE_FRAMES.map((frame) => frame.lambda);
    expect(lambdas[0]).toBe(0);
    expect(lambdas[lambdas.length - 1]).toBe(1);
    expect([...lambdas].sort((a, b) => a - b)).toEqual(lambdas);
  });

  /**
   * Vertex `k` has to be the same fraction along the curve in every frame, or
   * interpolating between two frames slides the geometry along itself. Checked
   * as "no frame's subpath doubles back on where the first frame started",
   * which is what a flipped orientation looks like.
   */
  it('keeps every subpath pointing the same way as the first frame', () => {
    const first = LANDSCAPE_FRAMES[0];
    expect(first).toBeDefined();
    if (!first) return;

    for (const frame of LANDSCAPE_FRAMES) {
      for (let s = 0; s < SUBPATH_COUNT; s += 1) {
        const base = s * BOUNDARY_VERTS * 2;
        const tail = base + (BOUNDARY_VERTS - 1) * 2;
        const toHead = Math.hypot(
          (frame.boundary[base] ?? 0) - (first.boundary[base] ?? 0),
          (frame.boundary[base + 1] ?? 0) - (first.boundary[base + 1] ?? 0),
        );
        const toTail = Math.hypot(
          (frame.boundary[tail] ?? 0) - (first.boundary[base] ?? 0),
          (frame.boundary[tail + 1] ?? 0) - (first.boundary[base + 1] ?? 0),
        );
        expect(toHead).toBeLessThan(toTail);
      }
    }
  });

  it('keeps every glyph and every boundary vertex inside the plot', () => {
    const inside = (x: number, y: number) =>
      x >= PLOT.x - 1 && x <= PLOT.x + PLOT.width + 1 && y >= PLOT.y - 1 && y <= PLOT.y + PLOT.height + 1;

    for (const glyph of GLYPHS) expect(inside(glyph.x, glyph.y)).toBe(true);
    for (const frame of LANDSCAPE_FRAMES) {
      // Through `landscapeAt`, because the stored numbers are in the
      // generator's half-pixel units and only that decodes them.
      const { boundary } = landscapeAt(frame.lambda);
      for (let i = 0; i < boundary.length; i += 2) {
        expect(inside(boundary[i] ?? 0, boundary[i + 1] ?? 0)).toBe(true);
      }
    }
  });

  it('stores its coordinates as integers, which is what keeps the payload small', () => {
    for (const frame of LANDSCAPE_FRAMES) {
      expect(frame.boundary.every((value) => Number.isInteger(value))).toBe(true);
      expect(frame.offsets.every((value) => Number.isInteger(value))).toBe(true);
    }
  });

  it('draws three classes and nothing else', () => {
    expect(GLYPHS).toHaveLength(POINT_COUNT);
    for (const glyph of GLYPHS) {
      expect(glyph.klass).toBeGreaterThanOrEqual(0);
      expect(glyph.klass).toBeLessThan(CLASS_COUNT);
    }
    expect(new Set(GLYPHS.map((glyph) => glyph.klass)).size).toBe(CLASS_COUNT);
  });
});

describe('capacityFor', () => {
  it('is zero until the world is most of the way in', () => {
    expect(capacityFor(0)).toBe(0);
    expect(capacityFor(CAPACITY_FROM)).toBe(0);
  });

  it('reaches a fitted model before the world has finished leaving', () => {
    expect(capacityFor(CAPACITY_FROM + CAPACITY_SPAN)).toBeCloseTo(1, 10);
    expect(capacityFor(1)).toBe(1);
  });

  it('rises strictly across the window, which is the whole point of the stage', () => {
    let previous = -1;
    for (let i = 0; i <= 40; i += 1) {
      const value = capacityFor(CAPACITY_FROM + (CAPACITY_SPAN * i) / 40);
      expect(value).toBeGreaterThan(previous);
      previous = value;
    }
  });

  it('answers 0 for a non-finite progress rather than propagating it into a path', () => {
    expect(capacityFor(Number.NaN)).toBe(0);
  });
});

describe('frameBlend', () => {
  it('lands exactly on the last frame at full capacity', () => {
    const blend = frameBlend(1);
    expect(blend.to).toBe(LANDSCAPE_FRAMES.length - 1);
    expect(blend.t).toBeCloseTo(1, 10);
  });

  it('never indexes past the end', () => {
    for (let i = 0; i <= 50; i += 1) {
      const blend = frameBlend(i / 50);
      expect(blend.from).toBeGreaterThanOrEqual(0);
      expect(blend.to).toBeLessThan(LANDSCAPE_FRAMES.length);
    }
  });
});

describe('the boundary', () => {
  const pathAt = (progress: number) => boundaryPath(landscapeAt(capacityFor(progress)).boundary);

  /**
   * THE regression test for this stage. Its predecessor drew the same pixels at
   * every progress; a reader who scrolled the dwell without moving the mouse
   * saw a still image. Anything that reintroduces that fails here.
   */
  it('is a function of the scroll', () => {
    const early = pathAt(EARLY);
    const middle = pathAt(MIDDLE);
    const late = pathAt(LATE);
    expect(early).not.toBe(middle);
    expect(middle).not.toBe(late);
    expect(early).not.toBe(late);
  });

  it('moves a long way, not a rounding error', () => {
    const early = landscapeAt(capacityFor(EARLY)).boundary;
    const late = landscapeAt(capacityFor(LATE)).boundary;
    let worst = 0;
    for (let i = 0; i < early.length; i += 2) {
      worst = Math.max(worst, Math.hypot((early[i] ?? 0) - (late[i] ?? 0), (early[i + 1] ?? 0) - (late[i + 1] ?? 0)));
    }
    // A tenth of the plot width. Below that the "nonlinear" claim is not being
    // made by the picture, only by this file's comments.
    expect(worst).toBeGreaterThan(PLOT.width / 10);
  });

  it('returns identical geometry when the reader scrolls back', () => {
    const forward = [0.2, 0.4, 0.6, 0.8].map(pathAt);
    const backward = [0.8, 0.6, 0.4, 0.2].map(pathAt).reverse();
    expect(backward).toEqual(forward);
  });

  it('emits one subpath per class pair at every capacity', () => {
    for (let i = 0; i <= 20; i += 1) {
      const d = boundaryPath(landscapeAt(i / 20).boundary);
      expect(d.match(/M/g)).toHaveLength(SUBPATH_COUNT);
      expect(d).not.toContain('NaN');
    }
  });
});

describe('the margin contours', () => {
  it('emit two subpaths per class pair — one either side of the partition', () => {
    for (const level of [0, 1]) {
      const landscape = landscapeAt(0.5);
      const d = contourPath(landscape.boundary, landscape.offsets, level);
      expect(d.match(/M/g)).toHaveLength(SUBPATH_COUNT * 2);
      expect(d).not.toContain('NaN');
    }
  });

  it('stay clear of the boundary they describe', () => {
    const landscape = landscapeAt(1);
    const inner = contourPath(landscape.boundary, landscape.offsets, 0);
    const outer = contourPath(landscape.boundary, landscape.offsets, 1);
    // Two levels of one field: if they coincided the second would be drawing
    // nothing the first did not already say.
    expect(inner).not.toBe(outer);
  });
});

describe('the misclassification flags', () => {
  it('starts with one per point the linear model gets wrong', () => {
    expect(FLAGGED).toHaveLength(ERROR_INDICES.length);
    expect(ERROR_SETTLED_AT).toHaveLength(ERROR_INDICES.length);
    expect(ERROR_INDICES.length).toBeGreaterThan(0);
    for (let i = 0; i < FLAGGED.length; i += 1) expect(flagLit(i, 0)).toBe(true);
  });

  /**
   * A flag that came back on would read as the model getting worse the further
   * you scroll, and the meter — which is derived from the same list — would run
   * backwards with it. The generator refuses to emit such a set; this is the
   * reader's side of that guarantee.
   */
  it('goes out and stays out, one at a time', () => {
    for (let i = 0; i < FLAGGED.length; i += 1) {
      let extinguished = false;
      for (let step = 0; step <= 100; step += 1) {
        const lit = flagLit(i, step / 100);
        if (!lit) extinguished = true;
        else expect(extinguished).toBe(false);
      }
    }
  });

  it('has all of them out by the time the model is fully fitted', () => {
    for (let i = 0; i < FLAGGED.length; i += 1) expect(flagLit(i, 1)).toBe(false);
  });

  it('sits on real glyphs', () => {
    for (const flag of FLAGGED) {
      expect(GLYPHS.some((glyph) => glyph.x === flag.x && glyph.y === flag.y)).toBe(true);
    }
  });

  it('answers false for a flag that does not exist', () => {
    expect(flagLit(FLAGGED.length + 5, 0)).toBe(false);
  });
});

describe('the fit meter', () => {
  it('opens under-fitted and closes at a fitted model', () => {
    expect(fitAt(0)).toBeCloseTo(1 - ERROR_INDICES.length / POINT_COUNT, 10);
    expect(fitAt(1)).toBe(1);
  });

  it('never falls as capacity rises', () => {
    let previous = -1;
    for (let i = 0; i <= 100; i += 1) {
      const value = fitAt(i / 100);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it('fills the plot exactly, and starts at the notch drawn under it', () => {
    expect(fitBarPath(1)).toContain((PLOT.x + PLOT.width).toFixed(1));
    expect(fitBarPath(0)).toContain(FIT_ORIGIN_X.toFixed(1));
  });
});

describe('the query readout', () => {
  it('finds a point on the boundary nearer than any vertex of it', () => {
    const { boundary } = landscapeAt(0.6);
    const near = nearestOnBoundary(boundary, RESTING_QUERY.x, RESTING_QUERY.y);
    expect(near).not.toBeNull();
    if (!near) return;

    let closestVertex = Infinity;
    for (let i = 0; i < boundary.length; i += 2) {
      closestVertex = Math.min(
        closestVertex,
        Math.hypot((boundary[i] ?? 0) - RESTING_QUERY.x, (boundary[i + 1] ?? 0) - RESTING_QUERY.y),
      );
    }
    // Projecting onto the segments can only do better than the vertices.
    expect(near.distance).toBeLessThanOrEqual(closestVertex + 1e-9);
  });

  it('answers null for an empty boundary rather than a NaN path', () => {
    expect(nearestOnBoundary([], 10, 10)).toBeNull();
    expect(marginPath(10, 10, [])).toBe('');
  });

  it('draws a gapped crosshair, so the reading is not hidden under its marker', () => {
    const d = crosshairPath(100, 50);
    expect(d.match(/M/g)).toHaveLength(4);
    expect(d).not.toContain('NaN');
  });

  it('keeps a pointer outside the plot inside it', () => {
    expect(clampToPlot(-500, -500)).toEqual({ x: PLOT.x, y: PLOT.y });
    expect(clampToPlot(9000, 9000)).toEqual({ x: PLOT.x + PLOT.width, y: PLOT.y + PLOT.height });
    expect(clampToPlot(120, 60)).toEqual({ x: 120, y: 60 });
  });
});

/* ===========================================================================
   The rendered stage

   Two things can only be checked against real markup: that the server sends
   the fitted picture (so a reader with JavaScript off, on a phone, or with
   reduced motion gets a finished partition rather than an underfit one), and
   that nothing in this stage emits a `style` attribute — which the site's
   hash-based CSP drops in production while `astro dev` looks perfect.
   ======================================================================== */

describe('the server-rendered stage', () => {
  const render = async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { en } = await import('../src/i18n/en');
    const { default: TechnicalWorlds } = await import('../src/components/visuals/worlds/TechnicalWorlds');
    return renderToStaticMarkup(createElement(TechnicalWorlds, { t: en }));
  };

  /** The AI stage's own slice of the markup. */
  const slice = (html: string) => {
    const start = html.indexOf('data-domain="ai"');
    const end = html.indexOf('data-domain="quantum"');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    return html.slice(start, end);
  };

  it('emits no style attribute — the CSP drops those, silently and only in production', async () => {
    expect(slice(await render())).not.toContain('style="');
  });

  it('serves the fitted partition, not a half-learned one', async () => {
    const stage = slice(await render());
    expect(stage).toContain(`d="${boundaryPath(landscapeAt(1).boundary)}"`);
    expect(stage).toContain(`d="${fitBarPath(1)}"`);
  });

  it('serves every flag mounted and every one of them out', async () => {
    const stage = slice(await render());
    expect(stage.match(/class="tw-dl-flag"/g)).toHaveLength(FLAGGED.length);
    expect(stage.match(/opacity="0"/g)).toHaveLength(FLAGGED.length);
  });

  it('serves every glyph, in three kinds of mark', async () => {
    const stage = slice(await render());
    for (const klass of [0, 1, 2]) {
      const count = GLYPHS.filter((glyph) => glyph.klass === klass).length;
      expect(stage.match(new RegExp(`data-class="${klass}"`, 'g'))).toHaveLength(count);
    }
  });

  it('carries exactly one accent object, and it is the boundary', () => {
    const stylesheet = readFileSync(new URL('src/components/home/TechnicalWorlds.astro', ROOT), 'utf8');
    const block = stylesheet.slice(
      stylesheet.indexOf('--- ai / decision landscape'),
      stylesheet.indexOf('--- quantum / interference'),
    );
    expect(block.length).toBeGreaterThan(0);
    // `--tw-accent` may only be claimed by the boundary and by the meter that
    // reports on it. Anything else in this frame competing for the accent
    // would be a second subject.
    const accented = [...block.matchAll(/^ {2}(\.[\w-[\]'=]+)[^{]*\{[^}]*--tw-accent/gm)].map((match) => match[1]);
    expect([...new Set(accented)].sort()).toEqual(['.tw-dl-boundary', '.tw-dl-fit']);
  });
});
