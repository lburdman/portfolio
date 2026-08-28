/**
 * Geometry for the five domain stages.
 *
 * Two rules govern everything in this file.
 *
 * 1. **Deterministic.** The island is server-rendered by Astro and hydrated in
 *    the browser, so any coordinate produced by `Math.random()` would differ
 *    between the two passes and React would discard the server markup. Every
 *    "organic" layout here comes from a seeded LCG, so the same seed always
 *    produces the same picture. `tests/worlds.test.ts` asserts that.
 *
 * 2. **Cheap.** These are plain numbers turned into SVG attributes. No canvas,
 *    no WebGL, no per-frame JavaScript — the stages' motion is CSS animation
 *    over static geometry, and pointer response is a handful of recomputed
 *    numbers (docs/MOTION_SYSTEM.md §4, §8).
 *
 * All stages share one coordinate space so the five read as one instrument.
 */

/** Shared SVG coordinate space for every stage. */
export const STAGE_WIDTH = 320;
export const STAGE_HEIGHT = 200;
/** Inset of the drawn frame from the viewBox edge. */
export const STAGE_INSET = 10;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Linear congruential generator (Numerical Recipes constants).
 *
 * Chosen over `Math.random()` for reproducibility, not for statistical
 * quality — nothing here is cryptographic or statistical, it just needs to
 * look unplanned and be identical on both sides of hydration.
 */
export function createRandom(seed: number): () => number {
  let state = Math.trunc(seed) >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * Two-source interference intensity across a detection screen, normalised to
 * `0 → 1`.
 *
 * `I = cos²(π · d · u / λ)` for a screen coordinate `u ∈ [-1, 1]`. The centre
 * sample is always fully constructive; widening `separation` packs more fringes
 * into the same screen, which is the whole point being demonstrated.
 */
export function interferenceProfile(samples: number, separation: number, wavelength: number): number[] {
  const count = Math.max(1, Math.trunc(samples));
  const lambda = Math.max(Math.abs(wavelength), 1e-6);
  const out: number[] = [];

  for (let i = 0; i < count; i += 1) {
    const u = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
    out.push(Math.cos((Math.PI * separation * u) / lambda) ** 2);
  }

  return out;
}

/**
 * A sampled sine, as an SVG path.
 *
 * `cycles` is counted over `width`, and the path is generated once at rest
 * amplitude — the audio stage then scales it with CSS custom properties rather
 * than regenerating the string, so pointer response costs no path arithmetic.
 */
export function wavePath(
  width: number,
  height: number,
  cycles: number,
  samples: number,
  harmonics: readonly number[] = [1],
): string {
  const count = Math.max(2, Math.trunc(samples));
  const mid = height / 2;
  const weightTotal = harmonics.reduce((sum, weight) => sum + Math.abs(weight), 0) || 1;
  const parts: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const t = i / (count - 1);
    const phase = t * cycles * Math.PI * 2;
    let value = 0;
    harmonics.forEach((weight, harmonic) => {
      value += weight * Math.sin(phase * (harmonic + 1));
    });
    const x = t * width;
    const y = mid - (value / weightTotal) * mid;
    parts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`);
  }

  return parts.join(' ');
}

/**
 * A resonance envelope: one peak at `peak` with skirts, sampled into `bars`
 * normalised heights. Used as the audio stage's spectrum.
 */
export function spectrumBars(bars: number, peak: number, sharpness: number): number[] {
  const count = Math.max(1, Math.trunc(bars));
  const out: number[] = [];

  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / (count - 1);
    const delta = (t - peak) * sharpness;
    const fundamental = 1 / (1 + delta * delta);
    // A second, quieter formant an octave up keeps it reading as sound rather
    // than as a single bell curve.
    const overtoneDelta = (t - Math.min(peak * 2 + 0.08, 1)) * sharpness * 1.6;
    const overtone = 0.42 / (1 + overtoneDelta * overtoneDelta);
    out.push(Math.min(1, fundamental + overtone));
  }

  return out;
}

/** Centre of a cell in a uniform `columns × rows` lattice inside `bounds`. */
export function cellCentre(
  column: number,
  row: number,
  columns: number,
  rows: number,
  bounds: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): Point {
  const safeColumns = Math.max(1, Math.trunc(columns));
  const safeRows = Math.max(1, Math.trunc(rows));
  const cellWidth = bounds.width / safeColumns;
  const cellHeight = bounds.height / safeRows;
  return {
    x: bounds.x + (column + 0.5) * cellWidth,
    y: bounds.y + (row + 0.5) * cellHeight,
  };
}

/**
 * A Manhattan (right-angle) polyline through the given waypoints, which is how
 * an FPGA router and a PCB autorouter both actually lay track down. Diagonals
 * would be a lie about the technology.
 */
export function manhattanPath(waypoints: readonly Point[]): string {
  const [first, ...rest] = waypoints;
  if (!first) return '';

  const parts = [`M${first.x.toFixed(2)} ${first.y.toFixed(2)}`];
  let cursor = first;

  for (const point of rest) {
    if (point.y !== cursor.y) parts.push(`L${cursor.x.toFixed(2)} ${point.y.toFixed(2)}`);
    if (point.x !== cursor.x) parts.push(`L${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
    cursor = point;
  }

  return parts.join(' ');
}

/** Total length of a Manhattan polyline — the dash cycle the pulse animates over. */
export function manhattanLength(waypoints: readonly Point[]): number {
  let total = 0;
  let cursor: Point | null = null;
  for (const point of waypoints) {
    if (cursor) total += Math.abs(point.x - cursor.x) + Math.abs(point.y - cursor.y);
    cursor = point;
  }
  return total;
}
