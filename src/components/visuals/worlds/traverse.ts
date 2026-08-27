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

/* ===========================================================================
   HOW LONG THE PIN LASTS, AND WHERE THAT TIME GOES

   ScrollTrigger's `end` used to be the horizontal travel distance in pixels:
   `+=${track.scrollWidth - viewport.clientWidth}`. Two measured consequences,
   both recorded in docs/REDESIGN_DECISIONS.md #14 and the Audio row of §P2:

   1. The pin ran 4400px of a 10207px document — 43% of the page was one
      section, because the travel distance happens to be ~3.3 viewport widths
      and nothing had ever chosen that number as a scroll budget.

   2. The last world arrived at the centre of the viewport at the exact scroll
      position where the pin released. Measured: Audio crossed centre at
      y=6500, the pin ended at y=6500. The finale had no dwell at all — it
      slid in and the page immediately scrolled on.

   Both come from the same mistake: *how far the track moves* and *how much
   scrolling that should cost* were one number. They are separated here.

   The budget is expressed in viewport heights, because that is the unit the
   reader actually experiences — one wheel gesture is a fraction of a screen,
   not a fraction of a track width — and because it makes the pin's share of
   the document stable across window sizes rather than a side effect of how
   wide the panels happened to lay out.
   ======================================================================== */

/**
 * Scroll spent travelling from one world to the next, in viewport heights.
 *
 * Four steps at 0.6 is 2.4 screens of travel. The previous behaviour was
 * effectively 1.0 per world, which is the conventional figure for a pinned
 * horizontal sequence and is exactly why it read as endless here: this
 * document only has five sections, so a conventional pin was half of it.
 */
export const SCROLL_PER_STEP = 0.6;

/**
 * Scroll the final world holds at rest before the pin releases, in viewport
 * heights.
 *
 * This is the fix for the finale, and it is not a taste adjustment. Worlds one
 * to four each stay dominant for roughly a step's worth of scroll on either
 * side of their stop; the fifth had only the approach, because the pin ended
 * on its arrival frame. The hold gives it the second half it never had.
 */
export const FINALE_DWELL = 0.4;

/** The whole pinned range, in viewport heights. */
export const TRAVERSE_SCROLL_HEIGHTS = (TRAVERSE_LENGTH - 1) * SCROLL_PER_STEP + FINALE_DWELL;

/**
 * The fraction of the pinned range in which the track is moving. The rest of
 * it is the finale's hold, during which scroll progress advances and the
 * horizontal position does not.
 *
 * Every mapping between scroll progress and a domain index has to go through
 * this, or the traverse would report itself as travelling during the hold.
 */
export function travelShare(steps: number, perStep: number, dwell: number): number {
  const travel = steps * perStep;
  const total = travel + dwell;
  // A range with no length at all is not "everything is the hold"; there is
  // nothing to divide, so the caller gets the plain proportional mapping back.
  if (!Number.isFinite(total) || total <= 0) return 1;
  if (!Number.isFinite(travel) || travel <= 0) return 0;
  return Math.min(1, travel / total);
}

export const TRAVEL_SHARE = travelShare(TRAVERSE_LENGTH - 1, SCROLL_PER_STEP, FINALE_DWELL);

/**
 * The pixel length to reserve for the pin, given the viewport height.
 *
 * A non-finite or non-positive height answers 0, which ScrollTrigger reads as
 * "no scroll range" and which leaves the band un-pinned rather than pinned
 * forever.
 */
export function pinnedScrollLength(viewportHeight: number): number {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) return 0;
  return Math.round(TRAVERSE_SCROLL_HEIGHTS * viewportHeight);
}

/**
 * Converts progress through the whole pinned range into progress through the
 * *travelling* part of it.
 *
 * Past the travel share this saturates at 1 — the track is parked on the last
 * world and the remaining scroll is its dwell.
 */
export function travelProgress(progress: number, travelShare: number = TRAVEL_SHARE): number {
  if (!Number.isFinite(travelShare) || travelShare <= 0) return 1;
  if (travelShare >= 1) return clamp01(progress);
  return clamp01(clamp01(progress) / travelShare);
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
  // `<= 0` rather than `< 0`: `Math.trunc(-0.4)` is `-0`, which passes a `< 0`
  // test and is then returned as the index. Harmless for an array read, and
  // exactly the kind of value that surprises an `Object.is` comparison later.
  if (whole <= 0) return 0;
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
 *
 * `travelShare` is the inverse of {@link travelProgress}: the stops live in the
 * travelling part of the range, so a keypress must land inside that part and
 * not somewhere in the finale's hold. It defaults to 1 — the whole range is
 * travel — so a caller that has no hold gets the plain proportional mapping.
 */
export function scrollTargetForIndex(
  index: number,
  count: number,
  start: number,
  end: number,
  travelShare = 1,
): number {
  if (!Number.isFinite(start)) return 0;
  if (!Number.isFinite(end) || end <= start) return start;
  // A share of zero or worse is not "every stop is the start"; it is a caller
  // that has nothing meaningful to say, so fall back to the whole range.
  const share = Number.isFinite(travelShare) && travelShare > 0 ? Math.min(travelShare, 1) : 1;
  return start + share * progressForIndex(index, count) * (end - start);
}
