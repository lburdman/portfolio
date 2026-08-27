/**
 * Pure traverse logic for the Technical Worlds island.
 *
 * Everything here is deliberately DOM-free and framework-free: it is the part
 * of the sequence that can be unit-tested (`tests/worlds.test.ts`) without a
 * browser, a scroll position or a GSAP instance. The island imports these
 * functions; it never re-implements the arithmetic inline.
 *
 * The domain sequence is NOT declared here. It is read from
 * `src/config/domains.ts`, which is the single spine the whole site derives
 * from — reordering that array reorders this traverse, and adding a sixth
 * domain lengthens it, with no edit to this file or to the island.
 */

import { DOMAINS, type Domain, type DomainId } from '../../../config/domains';

/** The traverse order. Derived, never restated. */
export const TRAVERSE_SEQUENCE: readonly Domain[] = DOMAINS;

/** Number of stops in the traverse. */
export const TRAVERSE_LENGTH: number = TRAVERSE_SEQUENCE.length;

/** The ids in traverse order, for callers that only need identity. */
export function traverseIds(): readonly DomainId[] {
  return TRAVERSE_SEQUENCE.map((domain) => domain.id);
}

/** Clamps to the unit interval, mapping NaN to 0 rather than propagating it. */
export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Clamps an arbitrary number to a valid index in `[0, count - 1]`.
 *
 * An empty sequence answers 0 rather than -1, so no caller can index with a
 * negative number under `noUncheckedIndexedAccess`.
 */
export function clampIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  const whole = Math.trunc(index);
  if (whole < 0) return 0;
  if (whole > count - 1) return count - 1;
  return whole;
}

/**
 * Maps ScrollTrigger's `0 → 1` scroll progress onto the domain occupying the
 * viewport.
 *
 * The track travels `count - 1` panel widths across the full progress range,
 * so progress is divided into `count - 1` intervals and rounded to the nearest
 * stop. That makes the announced domain the one actually centred, rather than
 * one that is only half in view.
 *
 * Both boundaries are exact: `0` is the first domain, `1` is the last.
 */
export function activeIndexFromProgress(progress: number, count: number): number {
  if (count <= 1) return 0;
  return clampIndex(Math.round(clamp01(progress) * (count - 1)), count);
}

/** The inverse of {@link activeIndexFromProgress}: the progress a stop sits at. */
export function progressForIndex(index: number, count: number): number {
  if (count <= 1) return 0;
  return clampIndex(index, count) / (count - 1);
}

/**
 * Keyboard model for the traverse.
 *
 * `null` means "this key is not ours" — the caller must then leave the event
 * alone so the browser's own behaviour survives. Arrow Up/Down and Page
 * Up/Down are deliberately absent: they are vertical scroll, and intercepting
 * them is exactly the scroll-jacking the brief (§4) forbids.
 *
 * Both ends clamp rather than wrap. Wrapping a spatial traverse would throw the
 * page scroll from the end of the section back to its start, which reads as a
 * glitch rather than as navigation.
 */
export function nextIndexForKey(key: string, current: number, count: number): number | null {
  if (count <= 0) return null;
  const at = clampIndex(current, count);
  switch (key) {
    case 'ArrowRight':
      return clampIndex(at + 1, count);
    case 'ArrowLeft':
      return clampIndex(at - 1, count);
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/**
 * The document scroll position that puts `index` in the viewport, given the
 * pixel range ScrollTrigger reserved for the pinned section.
 *
 * A degenerate range (`end <= start`, which is what a not-yet-measured
 * ScrollTrigger reports) answers `start`, so a keypress before first layout is
 * a no-op instead of a jump to the top of the document.
 */
export function scrollTargetForIndex(index: number, count: number, start: number, end: number): number {
  if (!Number.isFinite(start)) return 0;
  if (!Number.isFinite(end) || end <= start) return start;
  return start + progressForIndex(index, count) * (end - start);
}
