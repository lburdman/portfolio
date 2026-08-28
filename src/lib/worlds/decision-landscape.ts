/**
 * The AI / Machine Learning stage's geometry, as plain testable functions.
 *
 * Everything here is DOM-free and framework-free. The stage component turns
 * these strings into SVG attributes; it does no arithmetic of its own, which
 * is the same division `traverse.ts` and `stage-geometry.ts` already keep.
 *
 * The numbers come from `./decision-landscape.data`, which is generated —
 * see `scripts/gen-decision-landscape.mjs` for what is being solved and why it
 * is not solved in the browser. What is left for runtime is deliberately
 * cheap: a linear blend between two baked frames, four path strings and a
 * nearest-vertex search.
 */

import {
  BOUNDARY_VERTS,
  CONTOUR_STRIDE,
  COORD_STEP,
  ERROR_INDICES,
  ERROR_SETTLED_AT,
  LANDSCAPE_BOX,
  LANDSCAPE_FRAMES,
  LANDSCAPE_POINTS,
  OFFSETS_PER_VERTEX,
  POINT_COUNT,
  SUBPATH_COUNT,
} from './decision-landscape.data';

/* ===========================================================================
   THE SCROLL CHANNEL

   `localProgress` (traverse.ts) runs 0 → 1 across a world's whole ownership
   window and reads exactly 0.5 while it is centred. Capacity is mapped onto
   the part of that window the world is actually legible in: it starts rising
   once the panel is most of the way in, and reaches a fitted model just before
   the panel starts leaving.

   That asymmetry is the point. The reader arrives on an underfit partition
   with nine points flagged, and the act of scrolling is the act of fitting it.
   ======================================================================== */

/** Local progress at which capacity starts rising. */
export const CAPACITY_FROM = 0.12;
/** How much local progress the fit takes. */
export const CAPACITY_SPAN = 0.72;

/** Clamps to the unit interval, mapping a non-finite input to 0. */
function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Model capacity `λ` for a world's local progress: 0 is the nearest-centroid
 * partition, 1 the fully fitted kernel one.
 */
export function capacityFor(progress: number): number {
  return clamp01((clamp01(progress) - CAPACITY_FROM) / CAPACITY_SPAN);
}

/* ===========================================================================
   THE PLOT

   Read off the generated module so the frame, the glyphs and the boundary
   cannot disagree about where the plot is.
   ======================================================================== */

export const PLOT = LANDSCAPE_BOX;

/** The foot axis the fit meter is read against. */
export const FOOT_AXIS_Y = 166;
export const FOOT_TICK = 4;
/** Ticks at 0, 25, 50, 75 and 100 per cent. */
export const FOOT_TICK_COUNT = 5;
/** The fit meter's own rule. */
export const FIT_BAR_Y = 178;

/** Where the query sits with no pointer on the stage — over the learned lobe. */
export const RESTING_QUERY = { x: 206, y: 92 } as const;

/* ===========================================================================
   GLYPHS
   ======================================================================== */

export interface Glyph {
  readonly x: number;
  readonly y: number;
  /** 0, 1 or 2 — drawn as a disc, a ring and a cross respectively. */
  readonly klass: number;
}

/** The class glyphs, decoded once from the generated flat table. */
export const GLYPHS: readonly Glyph[] = Array.from({ length: POINT_COUNT }, (_, index) => ({
  x: (LANDSCAPE_POINTS[index * 3] ?? 0) * COORD_STEP,
  y: (LANDSCAPE_POINTS[index * 3 + 1] ?? 0) * COORD_STEP,
  klass: LANDSCAPE_POINTS[index * 3 + 2] ?? 0,
}));

/** The glyphs the nearest-centroid model gets wrong, in flag order. */
export const FLAGGED: readonly Glyph[] = ERROR_INDICES.map((index) => GLYPHS[index] ?? { x: 0, y: 0, klass: 0 });

/* ===========================================================================
   INTERPOLATING BETWEEN BAKED FRAMES
   ======================================================================== */

interface Blend {
  readonly from: number;
  readonly to: number;
  readonly t: number;
}

/** Which two baked frames a capacity falls between, and how far along. */
export function frameBlend(lambda: number): Blend {
  const last = LANDSCAPE_FRAMES.length - 1;
  if (last <= 0) return { from: 0, to: 0, t: 0 };
  const scaled = clamp01(lambda) * last;
  const from = Math.min(last - 1, Math.floor(scaled));
  return { from, to: from + 1, t: scaled - from };
}

/**
 * Blends two baked tables and converts them out of the generator's half-pixel
 * units in the same pass — the one place the stored resolution is decoded, so
 * nothing downstream has to know the data is quantised at all.
 */
function lerpTable(a: readonly number[], b: readonly number[], t: number): number[] {
  const out = new Array<number>(a.length);
  for (let i = 0; i < a.length; i += 1) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? va;
    out[i] = (va + (vb - va) * t) * COORD_STEP;
  }
  return out;
}

export interface Landscape {
  /** Flat `x, y` pairs: `SUBPATH_COUNT × BOUNDARY_VERTS` boundary vertices. */
  readonly boundary: readonly number[];
  /** Flat contour distances along the boundary normal, `OFFSETS_PER_VERTEX` per sampled vertex. */
  readonly offsets: readonly number[];
}

const EMPTY: Landscape = { boundary: [], offsets: [] };

/**
 * The boundary and its topography at one capacity.
 *
 * Vertex-wise linear interpolation is only valid because the generator
 * guarantees every frame the same subpath count, vertex count, order and
 * direction — see its header. Nothing here re-checks that; the generator
 * throws rather than emitting a set that cannot be morphed.
 */
export function landscapeAt(lambda: number): Landscape {
  const { from, to, t } = frameBlend(lambda);
  const a = LANDSCAPE_FRAMES[from];
  const b = LANDSCAPE_FRAMES[to] ?? a;
  if (!a || !b) return EMPTY;
  return {
    boundary: lerpTable(a.boundary, b.boundary, t),
    offsets: lerpTable(a.offsets, b.offsets, t),
  };
}

/* ===========================================================================
   PATHS
   ======================================================================== */

const fixed = (value: number): string => value.toFixed(1);

/** The decision boundary: one open subpath per class pair. */
export function boundaryPath(boundary: readonly number[]): string {
  const parts: string[] = [];
  for (let s = 0; s < SUBPATH_COUNT; s += 1) {
    const base = s * BOUNDARY_VERTS * 2;
    const segment: string[] = [];
    for (let v = 0; v < BOUNDARY_VERTS; v += 1) {
      const x = boundary[base + v * 2];
      const y = boundary[base + v * 2 + 1];
      if (x === undefined || y === undefined) return parts.join(' ');
      segment.push(`${v === 0 ? 'M' : 'L'}${fixed(x)} ${fixed(y)}`);
    }
    parts.push(segment.join(''));
  }
  return parts.join(' ');
}

/**
 * A margin iso-contour, as the boundary read outward at a stored distance.
 *
 * Two subpaths per class pair, one either side. The normal is taken from the
 * interpolated boundary rather than baked, so the topography stays registered
 * to the curve it describes at every intermediate capacity.
 */
export function contourPath(boundary: readonly number[], offsets: readonly number[], level: number): string {
  const parts: string[] = [];
  const sampled = Math.ceil(BOUNDARY_VERTS / CONTOUR_STRIDE);

  for (let s = 0; s < SUBPATH_COUNT; s += 1) {
    const vertexBase = s * BOUNDARY_VERTS * 2;
    const offsetBase = s * sampled * OFFSETS_PER_VERTEX;

    for (const side of [0, 1]) {
      const segment: string[] = [];
      for (let n = 0; n < sampled; n += 1) {
        const v = n * CONTOUR_STRIDE;
        const x = boundary[vertexBase + v * 2];
        const y = boundary[vertexBase + v * 2 + 1];
        const previousIndex = Math.max(0, v - 1);
        const nextIndex = Math.min(BOUNDARY_VERTS - 1, v + 1);
        const px = boundary[vertexBase + previousIndex * 2];
        const py = boundary[vertexBase + previousIndex * 2 + 1];
        const nx = boundary[vertexBase + nextIndex * 2];
        const ny = boundary[vertexBase + nextIndex * 2 + 1];
        const distance = offsets[offsetBase + n * OFFSETS_PER_VERTEX + level * 2 + side];
        if (
          x === undefined ||
          y === undefined ||
          px === undefined ||
          py === undefined ||
          nx === undefined ||
          ny === undefined ||
          distance === undefined
        ) {
          return parts.join(' ');
        }

        const tx = nx - px;
        const ty = ny - py;
        const length = Math.hypot(tx, ty) || 1;
        const sign = side === 0 ? 1 : -1;
        segment.push(
          `${n === 0 ? 'M' : 'L'}${fixed(x + (-ty / length) * sign * distance)} ` +
            `${fixed(y + (tx / length) * sign * distance)}`,
        );
      }
      parts.push(segment.join(''));
    }
  }
  return parts.join(' ');
}

/* ===========================================================================
   THE FIT METER

   Derived from the flag list rather than from a table of its own: the meter is
   literally the count of flags still lit, so the bar and the glyphs cannot
   tell the reader two different things.
   ======================================================================== */

/** Whether flag `index` is still lit at this capacity. */
export function flagLit(index: number, lambda: number): boolean {
  const settled = ERROR_SETTLED_AT[index];
  if (settled === undefined) return false;
  return settled > clamp01(lambda);
}

/** Training accuracy at a capacity, `0 → 1`. */
export function fitAt(lambda: number): number {
  if (POINT_COUNT <= 0) return 1;
  let wrong = 0;
  for (let index = 0; index < ERROR_SETTLED_AT.length; index += 1) {
    if (flagLit(index, lambda)) wrong += 1;
  }
  return 1 - wrong / POINT_COUNT;
}

/** The fit meter, as a horizontal rule filled to the current accuracy. */
export function fitBarPath(lambda: number): string {
  const end = PLOT.x + fitAt(lambda) * PLOT.width;
  return `M${fixed(PLOT.x)} ${fixed(FIT_BAR_Y)}L${fixed(end)} ${fixed(FIT_BAR_Y)}`;
}

/** Where the meter starts, so the reader can see how far it has travelled. */
export const FIT_ORIGIN_X = PLOT.x + (1 - ERROR_SETTLED_AT.length / Math.max(1, POINT_COUNT)) * PLOT.width;

/* ===========================================================================
   THE QUERY
   ======================================================================== */

export interface Nearest {
  readonly x: number;
  readonly y: number;
  readonly distance: number;
}

/**
 * The nearest point on the boundary to a query, searched segment by segment
 * within each subpath.
 *
 * Vertex-to-vertex projection rather than path arithmetic: the boundary is
 * already a dense polyline, so the exact nearest point on each segment is a
 * clamped dot product, and no `getPointAtLength` — which forces layout — is
 * needed.
 */
export function nearestOnBoundary(boundary: readonly number[], x: number, y: number): Nearest | null {
  let best: Nearest | null = null;

  for (let s = 0; s < SUBPATH_COUNT; s += 1) {
    const base = s * BOUNDARY_VERTS * 2;
    for (let v = 0; v < BOUNDARY_VERTS - 1; v += 1) {
      const ax = boundary[base + v * 2];
      const ay = boundary[base + v * 2 + 1];
      const bx = boundary[base + (v + 1) * 2];
      const by = boundary[base + (v + 1) * 2 + 1];
      if (ax === undefined || ay === undefined || bx === undefined || by === undefined) continue;

      const dx = bx - ax;
      const dy = by - ay;
      const squared = dx * dx + dy * dy || 1;
      const t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / squared));
      const px = ax + t * dx;
      const py = ay + t * dy;
      const distance = Math.hypot(px - x, py - y);
      if (!best || distance < best.distance) best = { x: px, y: py, distance };
    }
  }

  return best;
}

/** Arms of the query crosshair, in px. */
const CROSS_INNER = 2.5;
const CROSS_OUTER = 7;

/** A gapped crosshair, so the reading is not hidden under its own marker. */
export function crosshairPath(x: number, y: number): string {
  return (
    `M${fixed(x - CROSS_OUTER)} ${fixed(y)}L${fixed(x - CROSS_INNER)} ${fixed(y)}` +
    `M${fixed(x + CROSS_INNER)} ${fixed(y)}L${fixed(x + CROSS_OUTER)} ${fixed(y)}` +
    `M${fixed(x)} ${fixed(y - CROSS_OUTER)}L${fixed(x)} ${fixed(y - CROSS_INNER)}` +
    `M${fixed(x)} ${fixed(y + CROSS_INNER)}L${fixed(x)} ${fixed(y + CROSS_OUTER)}`
  );
}

/**
 * The query's distance to the partition, drawn as a length with a tick at the
 * boundary end. That is the margin: how far this point is from being called
 * something else.
 */
export function marginPath(x: number, y: number, boundary: readonly number[]): string {
  const near = nearestOnBoundary(boundary, x, y);
  if (!near) return '';
  const dx = near.x - x;
  const dy = near.y - y;
  const length = Math.hypot(dx, dy) || 1;
  const tx = (-dy / length) * 3;
  const ty = (dx / length) * 3;
  return (
    `M${fixed(x)} ${fixed(y)}L${fixed(near.x)} ${fixed(near.y)}` +
    `M${fixed(near.x - tx)} ${fixed(near.y - ty)}L${fixed(near.x + tx)} ${fixed(near.y + ty)}`
  );
}

/**
 * Clamps a pointer reading into the plot, so a query never leaves the frame
 * its margin is measured in.
 */
export function clampToPlot(x: number, y: number): { readonly x: number; readonly y: number } {
  return {
    x: Math.min(PLOT.x + PLOT.width, Math.max(PLOT.x, x)),
    y: Math.min(PLOT.y + PLOT.height, Math.max(PLOT.y, y)),
  };
}
