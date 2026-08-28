#!/usr/bin/env node
/**
 * Bakes the AI / Machine Learning stage's decision landscape.
 *
 * ── WHY A GENERATOR ────────────────────────────────────────────────────────
 * The stage draws a three-class posterior: a Parzen (RBF) model blended
 * against a nearest-centroid one, with the blend `λ` driven by scroll. Solving
 * that at runtime means a 96 × 56 grid of 59-term kernel sums plus marching
 * squares, three times over, on every frame — which is a canvas-sized cost for
 * an SVG stage, and the repo's one animating-canvas slot is already spent
 * (docs/MOTION_SYSTEM.md §4).
 *
 * So it is solved here, once, at authoring time, and checked in as a typed
 * constant module. The stage interpolates between a handful of baked `λ`
 * frames; no kernel arithmetic ships to the browser.
 *
 * Run it with `npm run landscape:gen`. `tests/decision-landscape.test.ts`
 * re-runs the same pipeline in memory and fails if the checked-in module has
 * drifted from what this script produces, so the two cannot diverge silently.
 *
 * ── WHAT MAKES THE MORPH SAFE ──────────────────────────────────────────────
 * Vertex-wise interpolation between two frames is only meaningful if every
 * frame has the *same* number of subpaths, in the *same* order, each with the
 * *same* vertex count and the *same* direction of travel. None of that is free
 * from marching squares, which answers an unordered segment soup whose
 * component count depends on the level set. Four things enforce it:
 *
 *   1. One subpath per class *pair*, always three, in a fixed pair order.
 *      Each is the level set of `p_a − p_b` masked to where `{a, b}` really is
 *      the local top two, so it is the segment of the partition those two
 *      classes actually share — a ray from the triple junction to the frame
 *      edge.
 *   2. Only the longest component per pair survives, and the script throws if
 *      a discarded component is long enough to have been visible. A boundary
 *      that sprouts an island at some `λ` is a topology change, and a
 *      vertex-wise morph through one pops.
 *   3. Arc-length resampling to a fixed vertex count, so vertex `k` is the
 *      same fraction along the curve in every frame.
 *   4. Orientation is pinned to the first frame: whichever end is nearer to
 *      frame 0's start becomes the start.
 *
 * ── AND WHAT MAKES IT SMALL ────────────────────────────────────────────────
 * The margin iso-contours are not stored as their own point sets. For each
 * sampled boundary vertex the script marches outward along the curve normal
 * until the posterior margin reaches the contour's level, and stores that
 * **distance** — one number instead of two, reconstructed at runtime against
 * the same interpolated boundary the accent path is drawn from. That halves
 * the payload and, more usefully, means the topography can never drift out of
 * register with the boundary it describes.
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { format, resolveConfig } from 'prettier';

const HERE = dirname(fileURLToPath(import.meta.url));
export const OUTPUT_PATH = join(HERE, '..', 'src', 'lib', 'worlds', 'decision-landscape.data.ts');

/* ===========================================================================
   THE PLOTTING FRAME

   Shares the stages' 320 × 200 space. The plot sits above a foot axis so the
   fit meter has a scale to be read against, the way every other stage's
   readout does.
   ======================================================================== */

export const BOX = { x: 26, y: 26, w: 268, h: 126 };

/* ===========================================================================
   THE DATA

   Five Gaussian blobs over three classes. Two things are being designed here
   and neither is decoration:

   **The opening partition must not be symmetric.** Nearest-centroid over three
   roughly equidistant centroids is the Voronoi diagram of an equilateral
   triangle — three rays at 120° from a junction near the middle, which reads
   as a logo mark rather than as a partition of data. The centroids below form
   a deliberately scalene triangle with the junction pushed off centre, so the
   three rays leave at three obviously different angles and one of them is much
   shorter than the others.

   **The kernel must have something to be right about.** Class 1 reaches an
   arm down and left, deep into the region nearest-centroid hands to class 2.
   The linear model cannot do anything but misclassify its far end; the kernel
   bends a lobe around it. That lobe is the whole visual argument for capacity,
   and it is why the misclassification flags go out as `λ` rises rather than
   merely fading.

   An arm and not an island, and that is a hard constraint rather than a taste:
   a detached blob makes the class-1/class-2 boundary sprout a second component
   partway through the sweep, so the subpath count changes — and a vertex-wise
   morph through a topology change pops. This throws rather than emit one; see
   {@link STRAY_COMPONENT_PX}.
   ======================================================================== */

/** `[u, v, sigmaU, sigmaV, count, class]`, in normalised plot coordinates. */
const BLOBS = [
  // class 0 — upper left.
  [0.1, 0.14, 0.075, 0.075, 7, 0],
  [0.28, 0.06, 0.08, 0.05, 5, 0],
  [0.16, 0.36, 0.06, 0.07, 6, 0],
  // class 1 — upper right, with an arm reaching down and left, deep into the
  // territory nearest-centroid hands to class 2. That arm is the thing the
  // kernel has to learn, and it is where the flags are.
  [0.72, 0.16, 0.09, 0.08, 7, 1],
  [0.62, 0.36, 0.07, 0.07, 4, 1],
  [0.6, 0.52, 0.05, 0.05, 4, 1],
  [0.48, 0.61, 0.045, 0.045, 4, 1],
  [0.38, 0.65, 0.045, 0.045, 5, 1],
  // class 2 — the lower band.
  [0.26, 0.88, 0.1, 0.045, 7, 2],
  [0.58, 0.78, 0.08, 0.055, 6, 2],
  [0.13, 0.7, 0.07, 0.06, 5, 2],
];

/** Kernel width for the Parzen model, in squared normalised units. */
const GAMMA = 26;
/** Equal, wide covariance — which is what makes the low-`λ` partition linear. */
const GAMMA_LINEAR = 2.6;

/** Posterior grid. Fine enough that marching squares does not visibly stair. */
const NX = 96;
const NY = 56;

/** Baked `λ` frames. */
export const FRAME_COUNT = 5;

/** Vertices per boundary subpath, after arc-length resampling. */
export const BOUNDARY_VERTS = 40;
/** The contours read every `CONTOUR_STRIDE`-th boundary vertex. */
export const CONTOUR_STRIDE = 2;

/**
 * Margin levels the two iso-contours are drawn at.
 *
 * Kept low, and the march kept short, on purpose. Far from the boundary the
 * upper iso-set stops being a corridor around the partition and starts being
 * the outline of the plot rectangle, which draws a shape that means nothing.
 * Clamping at {@link MARCH_MAX} turns those readings into a parallel curve at
 * a fixed offset instead — still true where it is interesting, and quiet where
 * it is not.
 */
export const CONTOUR_LEVELS = [0.13, 0.34];

/** Class pairs, in the fixed order every frame's subpaths follow. */
const PAIRS = [
  [0, 1],
  [1, 2],
  [0, 2],
];

/* ===========================================================================
   SEEDED SAMPLING

   The same LCG `src/components/visuals/worlds/stage-geometry.ts` uses. It is
   restated here rather than imported because this script runs under plain Node
   with no TypeScript loader — but the constants are the ones the repo already
   ships, and the generated module's point positions are asserted against a
   re-run of this pipeline in the test suite.
   ======================================================================== */

function createRandom(seed) {
  let state = Math.trunc(seed) >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function gauss(random) {
  let u = 0;
  let v = 0;
  while (u === 0) u = random();
  while (v === 0) v = random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const SEED = 20260828;

export function samplePoints(blobs = BLOBS) {
  const random = createRandom(SEED);
  const points = [];
  for (const [cu, cv, su, sv, count, klass] of blobs) {
    for (let i = 0; i < count; i += 1) {
      const u = Math.min(0.975, Math.max(0.025, cu + gauss(random) * su));
      const v = Math.min(0.975, Math.max(0.025, cv + gauss(random) * sv));
      points.push({ u, v, k: klass });
    }
  }
  return points;
}

/* ===========================================================================
   THE MODEL
   ======================================================================== */

function centroidsOf(points) {
  return [0, 1, 2].map((k) => {
    const group = points.filter((p) => p.k === k);
    return [
      group.reduce((sum, p) => sum + p.u, 0) / group.length,
      group.reduce((sum, p) => sum + p.v, 0) / group.length,
    ];
  });
}

function makePosterior(points) {
  const centroids = centroidsOf(points);
  const counts = [0, 1, 2].map((k) => points.filter((p) => p.k === k).length);

  const normalise = (a) => {
    const sum = a[0] + a[1] + a[2] || 1;
    return [a[0] / sum, a[1] / sum, a[2] / sum];
  };

  return (u, v, lambda) => {
    const rbf = [0, 0, 0];
    for (const p of points) {
      const du = u - p.u;
      const dv = v - p.v;
      rbf[p.k] += Math.exp(-GAMMA * (du * du + dv * dv));
    }
    for (let k = 0; k < 3; k += 1) rbf[k] /= counts[k];

    const linear = centroids.map(([cu, cv]) => {
      const du = u - cu;
      const dv = v - cv;
      return Math.exp(-GAMMA_LINEAR * (du * du + dv * dv));
    });

    const r = normalise(rbf);
    const l = normalise(linear);
    return normalise([0, 1, 2].map((k) => (1 - lambda) * l[k] + lambda * r[k]));
  };
}

function topTwo(p) {
  const order = [0, 1, 2].sort((a, b) => p[b] - p[a]);
  return { arg: order[0], second: order[1], margin: p[order[0]] - p[order[1]] };
}

/* ===========================================================================
   MARCHING SQUARES
   ======================================================================== */

const CASES = [
  [],
  [[2, 3]],
  [[1, 2]],
  [[1, 3]],
  [[0, 1]],
  [
    [0, 3],
    [1, 2],
  ],
  [[0, 2]],
  [[0, 3]],
  [[0, 3]],
  [[0, 2]],
  [
    [0, 1],
    [2, 3],
  ],
  [[0, 1]],
  [[1, 3]],
  [[1, 2]],
  [[2, 3]],
  [],
];

function edgePoint(edge, i, j, v0, v1, v2, v3, level) {
  const t = (a, b) => {
    const d = b - a;
    return d === 0 ? 0.5 : (level - a) / d;
  };
  if (edge === 0) return [i + t(v0, v1), j];
  if (edge === 1) return [i + 1, j + t(v1, v2)];
  if (edge === 2) return [i + t(v3, v2), j + 1];
  return [i, j + t(v0, v3)];
}

function marchingSquares(field, nx, ny, level, keep) {
  const at = (i, j) => field[j * nx + i];
  const segments = [];
  for (let j = 0; j < ny - 1; j += 1) {
    for (let i = 0; i < nx - 1; i += 1) {
      const v0 = at(i, j);
      const v1 = at(i + 1, j);
      const v2 = at(i + 1, j + 1);
      const v3 = at(i, j + 1);
      let index = 0;
      if (v0 > level) index |= 8;
      if (v1 > level) index |= 4;
      if (v2 > level) index |= 2;
      if (v3 > level) index |= 1;
      for (const [ea, eb] of CASES[index]) {
        const pa = edgePoint(ea, i, j, v0, v1, v2, v3, level);
        const pb = edgePoint(eb, i, j, v0, v1, v2, v3, level);
        if (keep && !keep((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2)) continue;
        segments.push([pa, pb]);
      }
    }
  }
  return segments;
}

function joinSegments(segments, tolerance = 1e-6) {
  const key = (p) => `${Math.round(p[0] / tolerance)},${Math.round(p[1] / tolerance)}`;
  const index = new Map();
  segments.forEach((segment, n) => {
    for (const p of segment) {
      const k = key(p);
      if (!index.has(k)) index.set(k, []);
      index.get(k).push(n);
    }
  });

  const used = new Array(segments.length).fill(false);
  const lines = [];
  for (let n = 0; n < segments.length; n += 1) {
    if (used[n]) continue;
    used[n] = true;
    const line = [segments[n][0], segments[n][1]];
    for (const forward of [true, false]) {
      for (;;) {
        const end = forward ? line[line.length - 1] : line[0];
        const candidate = (index.get(key(end)) ?? []).find((m) => !used[m]);
        if (candidate === undefined) break;
        used[candidate] = true;
        const [a, b] = segments[candidate];
        const next = key(a) === key(end) ? b : a;
        if (forward) line.push(next);
        else line.unshift(next);
      }
    }
    if (line.length > 2) lines.push(line);
  }
  return lines;
}

/* ===========================================================================
   POLYLINE PLUMBING
   ======================================================================== */

const toX = (i) => BOX.x + (i / (NX - 1)) * BOX.w;
const toY = (j) => BOX.y + (j / (NY - 1)) * BOX.h;

/** Chaikin, twice: turns a marching-squares staircase into a smooth curve. */
function smooth(points, passes = 2) {
  let current = points;
  for (let pass = 0; pass < passes; pass += 1) {
    const next = [current[0]];
    for (let k = 0; k < current.length - 1; k += 1) {
      const a = current[k];
      const b = current[k + 1];
      next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    next.push(current[current.length - 1]);
    current = next;
  }
  return current;
}

function polylineLength(points) {
  let total = 0;
  for (let k = 1; k < points.length; k += 1) {
    total += Math.hypot(points[k][0] - points[k - 1][0], points[k][1] - points[k - 1][1]);
  }
  return total;
}

/** Resample to exactly `count` vertices at uniform arc length. */
function resample(points, count) {
  const cumulative = [0];
  for (let k = 1; k < points.length; k += 1) {
    cumulative.push(cumulative[k - 1] + Math.hypot(points[k][0] - points[k - 1][0], points[k][1] - points[k - 1][1]));
  }
  const total = cumulative[cumulative.length - 1];
  if (total <= 0) return Array.from({ length: count }, () => [points[0][0], points[0][1]]);

  const out = [];
  let cursor = 1;
  for (let n = 0; n < count; n += 1) {
    const target = (total * n) / (count - 1);
    while (cursor < cumulative.length - 1 && cumulative[cursor] < target) cursor += 1;
    const a = points[cursor - 1];
    const b = points[cursor];
    const span = cumulative[cursor] - cumulative[cursor - 1];
    const t = span <= 0 ? 0 : (target - cumulative[cursor - 1]) / span;
    out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  return out;
}

/* ===========================================================================
   BAKING ONE FRAME
   ======================================================================== */

/** How long a discarded boundary component may be before it is a real defect. */
const STRAY_COMPONENT_PX = 6;

/** Ray-march resolution and reach for the contour distances, in px. */
const MARCH_STEP = 0.35;
const MARCH_MAX = 20;

function bakeFrame(lambda, points, posterior, reference) {
  const cells = NX * NY;
  const post = new Float64Array(cells * 3);

  for (let j = 0; j < NY; j += 1) {
    for (let i = 0; i < NX; i += 1) {
      const p = posterior(i / (NX - 1), j / (NY - 1), lambda);
      const n = j * NX + i;
      post[n * 3] = p[0];
      post[n * 3 + 1] = p[1];
      post[n * 3 + 2] = p[2];
    }
  }

  const sampleTopTwo = (gi, gj) => {
    const i = Math.min(NX - 1, Math.max(0, Math.round(gi)));
    const j = Math.min(NY - 1, Math.max(0, Math.round(gj)));
    const n = j * NX + i;
    const p = [post[n * 3], post[n * 3 + 1], post[n * 3 + 2]];
    const order = [0, 1, 2].sort((a, b) => p[b] - p[a]);
    return [order[0], order[1]].sort((a, b) => a - b);
  };

  const subpaths = PAIRS.map(([a, b], pairIndex) => {
    const difference = new Float64Array(cells);
    for (let n = 0; n < cells; n += 1) difference[n] = post[n * 3 + a] - post[n * 3 + b];

    const segments = marchingSquares(difference, NX, NY, 0, (gi, gj) => {
      const top = sampleTopTwo(gi, gj);
      return top[0] === a && top[1] === b;
    });

    const components = joinSegments(segments)
      .map((line) => smooth(line.map(([i, j]) => [toX(i), toY(j)])))
      .sort((p, q) => polylineLength(q) - polylineLength(p));

    if (components.length === 0) {
      throw new Error(`Pair ${a}/${b} has no boundary at lambda ${lambda} — the partition lost a class.`);
    }
    for (const stray of components.slice(1)) {
      const length = polylineLength(stray);
      if (length > STRAY_COMPONENT_PX) {
        throw new Error(
          `Pair ${a}/${b} at lambda ${lambda} has a ${length.toFixed(1)}px second component. ` +
            'A boundary whose subpath count changes between frames cannot be morphed vertex-wise. ' +
            'Move the blobs rather than dropping the component.',
        );
      }
    }

    let curve = resample(components[0], BOUNDARY_VERTS);
    const anchor = reference?.[pairIndex];
    if (anchor) {
      const head = Math.hypot(curve[0][0] - anchor[0], curve[0][1] - anchor[1]);
      const tail = Math.hypot(curve[curve.length - 1][0] - anchor[0], curve[curve.length - 1][1] - anchor[1]);
      if (tail < head) curve = curve.slice().reverse();
    }
    return curve;
  });

  /* The topography, as a distance from each sampled boundary vertex to the
     margin level along the curve normal. Marched rather than approximated: a
     true iso-contour is only a parallel offset to first order, and the places
     this picture is most interesting — the lobe, the triple junction — are
     exactly where that approximation is worst. */
  const marginAt = (x, y) => topTwo(posterior((x - BOX.x) / BOX.w, (y - BOX.y) / BOX.h, lambda)).margin;

  const offsets = subpaths.map((curve) => {
    const readings = [];
    for (let index = 0; index < curve.length; index += CONTOUR_STRIDE) {
      const point = curve[index];
      const previous = curve[Math.max(0, index - 1)];
      const next = curve[Math.min(curve.length - 1, index + 1)];
      const tx = next[0] - previous[0];
      const ty = next[1] - previous[1];
      const length = Math.hypot(tx, ty) || 1;
      const nx = -ty / length;
      const ny = tx / length;

      for (const level of CONTOUR_LEVELS) {
        for (const side of [1, -1]) {
          let distance = MARCH_STEP;
          while (distance < MARCH_MAX) {
            const x = point[0] + nx * side * distance;
            const y = point[1] + ny * side * distance;
            if (x < BOX.x || x > BOX.x + BOX.w || y < BOX.y || y > BOX.y + BOX.h) break;
            if (marginAt(x, y) >= level) break;
            distance += MARCH_STEP;
          }
          readings.push(Math.min(distance, MARCH_MAX));
        }
      }
    }
    return readings;
  });

  const wrong = points.map((p) => topTwo(posterior(p.u, p.v, lambda)).arg !== p.k);

  return { lambda, subpaths, offsets, wrong };
}

/* ===========================================================================
   HOW MANY FRAMES

   Vertex-wise interpolation between baked frames approximates a posterior that
   moves nonlinearly in `λ`. Rather than guess, this bakes an extra half-step
   between every pair of frames and measures how far the interpolated geometry
   falls from the real one. Reported by the CLI; asserted by the test suite.
   ======================================================================== */

export function maxInterpolationError(frames, points, posterior) {
  let worst = 0;
  for (let f = 0; f < frames.length - 1; f += 1) {
    const a = frames[f];
    const b = frames[f + 1];
    const truth = bakeFrame(
      (a.lambda + b.lambda) / 2,
      points,
      posterior,
      a.subpaths.map((curve) => curve[0]),
    );
    for (let s = 0; s < a.subpaths.length; s += 1) {
      for (let v = 0; v < BOUNDARY_VERTS; v += 1) {
        const x = (a.subpaths[s][v][0] + b.subpaths[s][v][0]) / 2;
        const y = (a.subpaths[s][v][1] + b.subpaths[s][v][1]) / 2;
        worst = Math.max(worst, Math.hypot(x - truth.subpaths[s][v][0], y - truth.subpaths[s][v][1]));
      }
    }
  }
  return worst;
}

/* ===========================================================================
   THE WHOLE BAKE
   ======================================================================== */

export function bakeLandscape(blobs = BLOBS) {
  const points = samplePoints(blobs);
  const posterior = makePosterior(points);

  const lambdas = Array.from({ length: FRAME_COUNT }, (_, i) => i / (FRAME_COUNT - 1));
  const frames = [];
  let reference = null;
  for (const lambda of lambdas) {
    const frame = bakeFrame(lambda, points, posterior, reference);
    if (!reference) reference = frame.subpaths.map((curve) => curve[0]);
    frames.push(frame);
  }

  /* ── Which points get a flag, and exactly when each one goes out ────────
     Not read off the geometry frames. The λ a point is learned at is a
     property of the model, not of how finely the boundary happens to be baked,
     so it is bisected against the real posterior — which both decouples the
     flags from FRAME_COUNT and lets them go out at nine different moments
     instead of at five.

     The stage derives the fit meter from these same numbers rather than from a
     table of its own, so the bar and the flags cannot disagree: the meter IS
     the count of flags still lit. */

  const wrongAt = (index, lambda) =>
    topTwo(posterior(points[index].u, points[index].v, lambda)).arg !== points[index].k;

  /* A flag that came back on would read as the model getting worse the further
     you scroll, and the fit meter would have to run backwards with it. Sampled
     finely rather than at the frames, because a flicker between two frames is
     exactly the case the frames cannot see. */
  const PROBE_STEPS = 240;
  points.forEach((_, index) => {
    let seenCorrect = false;
    for (let s = 0; s <= PROBE_STEPS; s += 1) {
      const wrong = wrongAt(index, s / PROBE_STEPS);
      if (!wrong) seenCorrect = true;
      else if (seenCorrect) {
        throw new Error(
          `Point ${index} is classified correctly and then wrong again as lambda rises. ` +
            'The stage draws training error as monotonically falling; move the blobs so it is.',
        );
      }
    }
  });

  const errorIndices = [];
  points.forEach((_, index) => {
    if (wrongAt(index, 0)) errorIndices.push(index);
  });

  const settledAt = errorIndices.map((index) => {
    // Above 1 means it is never learned, and the flag never goes out.
    if (wrongAt(index, 1)) return 2;
    let low = 0;
    let high = 1;
    for (let i = 0; i < 40; i += 1) {
      const mid = (low + high) / 2;
      if (wrongAt(index, mid)) low = mid;
      else high = mid;
    }
    return high;
  });

  return { points, frames, errorIndices, settledAt, posterior };
}

/* ===========================================================================
   EMITTING
   ======================================================================== */

const round = (value, places) => Number(value.toFixed(places));

/* ===========================================================================
   QUANTISATION

   Every coordinate and every contour distance is emitted as an integer number
   of half-pixels, and multiplied back by {@link COORD_STEP} when the stage
   builds a path.

   This is a payload decision with a measured reason. The island rides the
   desktop traverse budget in docs/MOTION_SYSTEM.md §8, which has a 115 KB
   ceiling and was measured at 109 KB — so this file's compressed size is not
   free space. Written as one-decimal floats the baked frames cost 3.1 KB gz;
   as small integers they cost about half that, because "247" is both shorter
   than "123.4" and far more compressible next to its neighbours.

   Half a pixel in a 320-wide view box is a third of a CSS pixel where the
   stage renders widest, on geometry that is a smooth curve resampled at forty
   vertices. It is below the resolution of the thing being drawn.
   ======================================================================== */

/** Emitted units per stage pixel: 2 means half-pixel resolution. */
const COORD_UNITS = 2;

const quantise = (value) => Math.round(value * COORD_UNITS);

function serialiseNumbers(values, places, perLine) {
  const parts = values.map((value) => String(round(value, places)));
  const lines = [];
  for (let i = 0; i < parts.length; i += perLine) {
    lines.push(`  ${parts.slice(i, i + perLine).join(', ')},`);
  }
  return lines.join('\n');
}

export function emit(baked) {
  const { points, frames, errorIndices, settledAt } = baked;

  const glyphs = points.flatMap((p) => [quantise(BOX.x + p.u * BOX.w), quantise(BOX.y + p.v * BOX.h), p.k]);

  const frameBlocks = frames
    .map((frame) => {
      const boundary = frame.subpaths.flatMap((curve) => curve.flatMap(([x, y]) => [quantise(x), quantise(y)]));
      const offsets = frame.offsets.flat().map((distance) => quantise(distance));
      return (
        '  {\n' +
        `    lambda: ${round(frame.lambda, 4)},\n` +
        '    boundary: [\n' +
        `${serialiseNumbers(boundary, 1, 16).replace(/^ {2}/gm, '      ')}\n` +
        '    ],\n' +
        '    offsets: [\n' +
        `${serialiseNumbers(offsets, 1, 16).replace(/^ {2}/gm, '      ')}\n` +
        '    ],\n' +
        '  },'
      );
    })
    .join('\n');

  return `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Produced by \`scripts/gen-decision-landscape.mjs\` (\`npm run landscape:gen\`).
 * \`tests/decision-landscape.test.ts\` re-runs that script in memory and fails
 * if this file has drifted from it, so an edit here is a failing test rather
 * than a silent divergence.
 *
 * What it holds: a three-class posterior blended from a nearest-centroid model
 * toward a Parzen one, its decision boundary extracted per class pair by
 * marching squares, arc-length resampled so the frames can be morphed
 * vertex-wise, and its margin iso-contours stored as distances along the
 * boundary normal rather than as point sets of their own. See the script's
 * header for why none of that happens in the browser.
 */

/** The plot rectangle inside the shared 320 × 200 stage space. */
export const LANDSCAPE_BOX = { x: ${BOX.x}, y: ${BOX.y}, width: ${BOX.w}, height: ${BOX.h} } as const;

/** Subpaths per frame — one per class pair, always in the same order. */
export const SUBPATH_COUNT = ${PAIRS.length};
/** Vertices per subpath, after arc-length resampling. */
export const BOUNDARY_VERTS = ${BOUNDARY_VERTS};
/** The contours read every Nth boundary vertex. */
export const CONTOUR_STRIDE = ${CONTOUR_STRIDE};
/** Contour readings per sampled vertex: two levels, each side of the boundary. */
export const OFFSETS_PER_VERTEX = ${CONTOUR_LEVELS.length * 2};
/** Posterior margin levels the two iso-contours trace. */
export const CONTOUR_LEVELS = [${CONTOUR_LEVELS.join(', ')}] as const;
/** How many classes the partition separates. */
export const CLASS_COUNT = 3;

/**
 * Stage pixels per emitted unit. Every coordinate and every contour distance
 * below is an integer number of half-pixels; multiply by this to draw.
 *
 * Integers rather than one-decimal floats because this module rides the
 * desktop traverse's 115 KB budget (docs/MOTION_SYSTEM.md §8) and they
 * compress to about half the size. Half a pixel in a 320-wide view box is a
 * third of a CSS pixel at the width this stage renders widest.
 */
export const COORD_STEP = 0.5;

export interface LandscapeFrame {
  /** Blend from the nearest-centroid model (0) to the Parzen one (1). */
  readonly lambda: number;
  /**
   * Flat \`x, y\` pairs in {@link COORD_STEP} units:
   * \`SUBPATH_COUNT × BOUNDARY_VERTS\` vertices.
   */
  readonly boundary: readonly number[];
  /**
   * Flat contour distances along the boundary normal, in {@link COORD_STEP}
   * units. Per sampled vertex, in order: level 0 one side, level 0 the other,
   * level 1 one side, level 1 the other.
   */
  readonly offsets: readonly number[];
}

/**
 * Class glyph positions, flat: \`x, y, class\` per point. \`x\` and \`y\` are in
 * {@link COORD_STEP} units; \`class\` is a plain 0, 1 or 2.
 */
export const LANDSCAPE_POINTS: readonly number[] = [
${serialiseNumbers(glyphs, 1, 12)}
];

/** How many points the partition is fitted to. */
export const POINT_COUNT = ${points.length};

/** Indices of the points the nearest-centroid model gets wrong — the flagged ones. */
export const ERROR_INDICES: readonly number[] = [${errorIndices.join(', ')}];

/**
 * The λ past which each flagged point stays correctly classified, bisected
 * against the real posterior rather than read off the baked frames. A value
 * above 1 means it never is, which the stage draws as a flag that never goes
 * out — an honest picture of a model that has not learned everything.
 *
 * The fit meter is derived from this list too, so the bar and the flags are
 * two readings of one fact and cannot disagree.
 */
export const ERROR_SETTLED_AT: readonly number[] = [${settledAt.map((value) => round(value, 4)).join(', ')}];

export const LANDSCAPE_FRAMES: readonly LandscapeFrame[] = [
${frameBlocks}
];
`;
}

/* ===========================================================================
   CLI
   ======================================================================== */

/**
 * The module source, formatted with the project's own Prettier config.
 *
 * Not a nicety: `npm run verify` runs `format:check` over the whole tree, and
 * an emitter whose output Prettier would reformat means the checked-in file is
 * either unformatted (a failing check) or reformatted by hand (a failing drift
 * test). Formatting here is what lets both gates hold at once.
 */
export async function generate() {
  const baked = bakeLandscape();
  const options = await resolveConfig(OUTPUT_PATH);
  return { source: await format(emit(baked), { ...options, filepath: OUTPUT_PATH }), baked };
}

const invokedDirectly = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (invokedDirectly) {
  const { source, baked } = await generate();

  /* `--stdout` prints the module instead of writing it. That is how
     `tests/decision-landscape.test.ts` compares the checked-in file against a
     fresh bake without either running the bake through a TypeScript import or
     overwriting the very file it is checking. */
  if (process.argv.includes('--stdout')) {
    process.stdout.write(source);
    process.exit(0);
  }

  writeFileSync(OUTPUT_PATH, source, 'utf8');

  const error = maxInterpolationError(baked.frames, baked.points, baked.posterior);
  const bytes = Buffer.byteLength(source, 'utf8');
  const opening = 1 - baked.errorIndices.length / baked.points.length;
  const never = baked.settledAt.filter((value) => value > 1).length;
  process.stdout.write(
    `decision landscape → ${OUTPUT_PATH}\n` +
      `  points ${baked.points.length}, flags ${baked.errorIndices.length}, frames ${baked.frames.length}\n` +
      `  fit ${(opening * 100).toFixed(1)}% → ${(100 - (never / baked.points.length) * 100).toFixed(1)}%\n` +
      `  flags out at lambda ${baked.settledAt.map((v) => v.toFixed(2)).join(', ')}\n` +
      `  worst mid-frame interpolation error ${error.toFixed(2)}px\n` +
      `  ${(bytes / 1024).toFixed(1)} KB of TypeScript\n`,
  );
}
