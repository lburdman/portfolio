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

/**
 * Where a domain sits in the traverse, or `-1` for one that is not in it.
 *
 * A stage uses this to find its own local progress channel without the island
 * having to thread an index down through `DomainStage`.
 */
export function traverseIndexOf(id: string): number {
  return TRAVERSE_SEQUENCE.findIndex((domain) => domain.id === id);
}

/* ===========================================================================
   THE SHAPE OF THE PINNED RANGE

   The traverse used to be one unbroken linear tween: the track moved at a
   constant rate for the whole pinned range, then sat frozen for a tail. A
   browser audit of the deployed build measured what that produced at 1440×900:

   1. **No world ever held at centre.** The track moved 2.14px per 1px of
      scroll, with no plateau anywhere, so each domain was within 60px of the
      middle of the frame for 50–75px of scroll — well under one wheel tick.
      The band read as five things being dragged past, not five things being
      shown.

   2. **350px of dead scroll.** The finale's dwell was appended as an empty
      tween *after* the travel, so the last 350px of the pin advanced progress
      while nothing on screen changed at all. It also compressed the real
      travel into the remaining range, which is where the 2.14 ratio came from.

   Both are fixed by giving the timeline an explicit shape instead of one
   slope. It alternates:

       hold(0) move(0→1) hold(1) move(1→2) … move(n-2→n-1) hold(n-1)

   Five holds and four moves for five domains. A hold is a real dwell with the
   panel at the exact centre of the frame; a move is an eased slide of exactly
   one panel pitch. The last hold *is* the finale's dwell — it is the same
   duration as every other world's, and there is no frozen tail after it.

   Both durations are in viewport heights, because that is the unit the reader
   actually experiences: one wheel gesture is a fraction of a screen, not a
   fraction of a track width. It also keeps the pin's share of the document
   stable across window sizes rather than a side effect of how wide the panels
   happened to lay out.
   ======================================================================== */

/**
 * Scroll spent sliding from one world to the next, in viewport heights.
 *
 * Tuned in a browser rather than derived. At 0.5 a step is 450px at 900px
 * tall — roughly four wheel ticks for 1156px of travel — which is fast enough
 * that the traverse never feels like work and slow enough that the eased
 * approach into the centre is legible as a deceleration rather than a stop.
 */
export const MOVE_HEIGHTS = 0.5;

/**
 * Scroll each world holds at the exact centre of the frame, in viewport
 * heights. **Every** world gets this, including the first and the last.
 *
 * 0.35 is 315px at 900px tall. Measured against the eased ends of the two
 * moves either side of it, that puts each domain within 60px of centre for
 * ~450px of scroll, against 50px before. Shorter than about 0.3 and the hold
 * stops registering as a stop at all; longer than about 0.45 and the band
 * reads as having stalled — the failure the original pin was built to avoid.
 */
export const HOLD_HEIGHTS = 0.35;

/**
 * One world's full period: its hold plus the move that carries the next one
 * in. The timeline is `count - 1` of these followed by one last hold.
 */
export function segmentPitch(hold: number = HOLD_HEIGHTS, move: number = MOVE_HEIGHTS): number {
  const pitch = hold + move;
  return Number.isFinite(pitch) && pitch > 0 ? pitch : 0;
}

/** The whole pinned range, in viewport heights: `count` holds and `count - 1` moves. */
export function traverseScrollHeights(
  count: number = TRAVERSE_LENGTH,
  hold: number = HOLD_HEIGHTS,
  move: number = MOVE_HEIGHTS,
): number {
  if (count <= 0) return 0;
  const total = count * hold + (count - 1) * move;
  return Number.isFinite(total) && total > 0 ? total : 0;
}

/** The whole pinned range for the real domain sequence. */
export const TRAVERSE_SCROLL_HEIGHTS = traverseScrollHeights();

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
 * Position along the timeline, in viewport heights, for a scroll progress.
 *
 * Every mapping below goes through this: the timeline is scrubbed 1:1 against
 * the pinned range, so progress and timeline time are the same quantity in
 * different units, and converting once means the segment arithmetic can be
 * written in the units the constants are declared in.
 */
export function timelineAt(
  progress: number,
  count: number = TRAVERSE_LENGTH,
  hold: number = HOLD_HEIGHTS,
  move: number = MOVE_HEIGHTS,
): number {
  return clamp01(progress) * traverseScrollHeights(count, hold, move);
}

/**
 * The timeline position at which world `index` sits exactly centred — the
 * middle of its hold.
 */
export function holdCentre(
  index: number,
  count: number = TRAVERSE_LENGTH,
  hold: number = HOLD_HEIGHTS,
  move: number = MOVE_HEIGHTS,
): number {
  return clampIndex(index, count) * segmentPitch(hold, move) + hold / 2;
}

/**
 * Which domain owns the frame, derived from **which segment the timeline is
 * in** rather than from rounding a proportion.
 *
 * The rule is: world `i` becomes active at the *start of its hold*, which is
 * the instant its panel reaches the centre. It stays active through the move
 * that carries it out again, so the outgoing world's ambient keeps running
 * while it slides away and nothing on screen freezes mid-exit.
 *
 * Two defects this replaces, both measured:
 *
 * - `Math.round(progress × (count - 1))` treated progress 0 as world 0, so the
 *   first stage's arrival animation fired at page load, ~1900px above the
 *   fold, and had finished long before anyone scrolled to it.
 * - Because it is a pure function of progress and never accumulates, an
 *   800px scroll jump lands on the right world instead of stepping past one.
 *   The previous implementation dropped a domain on exactly that gesture.
 */
export function activeIndexFromProgress(
  progress: number,
  count: number,
  hold: number = HOLD_HEIGHTS,
  move: number = MOVE_HEIGHTS,
): number {
  if (count <= 1) return 0;
  const pitch = segmentPitch(hold, move);
  if (pitch <= 0) return 0;
  return clampIndex(Math.floor(timelineAt(progress, count, hold, move) / pitch), count);
}

/**
 * The inverse of {@link activeIndexFromProgress}: the scroll progress at which
 * a stop is *centred*.
 *
 * Deliberately the centre of the hold rather than its leading edge. This is
 * what the keyboard traverse and the snap both target, and landing on the edge
 * would put a keypress one frame away from the world it just announced.
 *
 * Neither end is 0 or 1 any more, and that is the point: the range now opens
 * with half a hold and closes with half a hold, so the first world is already
 * centred when the pin engages and the last one is still centred when it lets
 * go.
 */
export function progressForIndex(
  index: number,
  count: number,
  hold: number = HOLD_HEIGHTS,
  move: number = MOVE_HEIGHTS,
): number {
  if (count <= 1) return 0;
  const total = traverseScrollHeights(count, hold, move);
  if (total <= 0) return 0;
  return clamp01(holdCentre(index, count, hold, move) / total);
}

/**
 * Local progress for one world: `0` when it starts arriving, `0.5` at the
 * exact centre of its hold, `1` when it has finished leaving.
 *
 * This is the continuous channel a scroll-driven stage reads. Reaching exactly
 * 0.5 at the centred hold is a contract, not a coincidence — a stage keys its
 * midpoint state to that value.
 *
 * The window is the world's whole ownership: the move that brings it in, its
 * hold, and the move that takes it out. The first world has no incoming move
 * and the last has no outgoing one, so those two are clamped to the pin's own
 * ends — which is why the two halves are scaled separately rather than by one
 * slope. Every world still reads 0.5 dead centre.
 */
export function localProgress(
  index: number,
  progress: number,
  count: number = TRAVERSE_LENGTH,
  hold: number = HOLD_HEIGHTS,
  move: number = MOVE_HEIGHTS,
): number {
  if (count <= 0) return 0;
  const total = traverseScrollHeights(count, hold, move);
  if (total <= 0) return 0;

  const centre = holdCentre(index, count, hold, move);
  const reach = move + hold / 2;
  const from = Math.max(0, centre - reach);
  const to = Math.min(total, centre + reach);
  const at = timelineAt(progress, count, hold, move);

  // Both halves are guarded by the two clamps above rather than by a ternary
  // each: `at > from` and `at <= centre` together mean `centre > from`, and
  // `at < to` with `at > centre` means `to > centre`. Neither divisor can be
  // zero without one of the returns above having already fired.
  if (at <= from) return 0;
  if (at >= to) return 1;
  if (at <= centre) return (0.5 * (at - from)) / (centre - from);
  return 0.5 + (0.5 * (at - centre)) / (to - centre);
}

/**
 * Where a released scroll should settle.
 *
 * Inside a hold this answers the progress it was given: the reader has come to
 * rest on a centred world and tugging them to the exact middle of a dwell they
 * are already inside would be the page moving under a hand that had stopped.
 * Inside a move it answers the nearer hold's centre, so letting go halfway
 * between two worlds resolves onto one of them instead of parking the band in
 * a state it is never meant to rest in.
 */
export function snapProgress(
  progress: number,
  count: number = TRAVERSE_LENGTH,
  hold: number = HOLD_HEIGHTS,
  move: number = MOVE_HEIGHTS,
): number {
  const clamped = clamp01(progress);
  if (count <= 1) return clamped;
  const total = traverseScrollHeights(count, hold, move);
  const pitch = segmentPitch(hold, move);
  if (total <= 0 || pitch <= 0) return clamped;

  const at = clamped * total;
  const index = clampIndex(Math.floor(at / pitch), count);
  const holdStart = index * pitch;
  if (at >= holdStart && at <= holdStart + hold) return clamped;

  const here = holdCentre(index, count, hold, move);
  const next = holdCentre(index + 1, count, hold, move);
  const nearer = Math.abs(at - here) <= Math.abs(at - next) ? here : next;
  return clamp01(nearer / total);
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
 * The document scroll position that puts `index` centred in the viewport,
 * given the pixel range ScrollTrigger reserved for the pinned section.
 *
 * A degenerate range (`end <= start`, which is what a not-yet-measured
 * ScrollTrigger reports) answers `start`, so a keypress before first layout is
 * a no-op instead of a jump to the top of the document.
 *
 * There is no travel-share correction any more, and there is nothing left for
 * one to correct: {@link progressForIndex} answers a position in the whole
 * pinned range, because the holds are inside the timeline rather than appended
 * to the end of it.
 */
export function scrollTargetForIndex(index: number, count: number, start: number, end: number): number {
  if (!Number.isFinite(start)) return 0;
  if (!Number.isFinite(end) || end <= start) return start;
  return start + progressForIndex(index, count) * (end - start);
}

/* ===========================================================================
   THE LOCAL PROGRESS CHANNEL

   Stages need a continuous value, not a boolean, and they need it every frame.
   Sending it through React state would re-render five panels and five stages
   per scroll tick, which is the cost the island already refuses to pay for the
   active index.

   So it is a plain subscription registry: the island publishes one number per
   update, each subscriber is called with its own world's local progress, and
   nothing above them re-renders. `StageFrame` uses it to write `--tw-progress`
   onto its own root through CSSOM — which the site's hash-based CSP permits
   (it governs style *attributes* as authored, not scripted mutations of a
   CSSStyleDeclaration; GSAP's transforms already depend on the same thing).
   A stage that draws to a canvas can subscribe for the raw number instead.

   Module-level rather than a React context on purpose: a context would put the
   value back on the render path, which is the whole thing being avoided.
   ======================================================================== */

/**
 * Called with one world's local progress, `0 → 1`, on every traverse update —
 * or with `null` when the traverse stops running, which is the signal to drop
 * whatever the last value was rather than leave the stage frozen at it.
 */
export type StageProgressListener = (progress: number | null) => void;

const stageProgressListeners = new Map<number, Set<StageProgressListener>>();

/**
 * Subscribes to world `index`'s local progress. Returns the unsubscribe.
 *
 * An index outside the sequence is accepted and simply never called, so a
 * stage rendered outside the traverse does not have to special-case itself.
 */
export function subscribeStageProgress(index: number, listener: StageProgressListener): () => void {
  const key = Math.trunc(index);
  let listeners = stageProgressListeners.get(key);
  if (!listeners) {
    listeners = new Set<StageProgressListener>();
    stageProgressListeners.set(key, listeners);
  }
  listeners.add(listener);
  return () => {
    const current = stageProgressListeners.get(key);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) stageProgressListeners.delete(key);
  };
}

/**
 * Publishes one traverse progress to every subscribed world.
 *
 * Each subscriber receives {@link localProgress} for its own index, so the
 * island computes the timeline position once and no stage has to know the
 * shape of the timeline.
 */
export function publishTraverseProgress(progress: number, count: number = TRAVERSE_LENGTH): void {
  if (stageProgressListeners.size === 0) return;
  for (const [index, listeners] of stageProgressListeners) {
    const value = localProgress(index, progress, count);
    for (const listener of listeners) listener(value);
  }
}

/**
 * Tells every subscriber the traverse is no longer driving them.
 *
 * The island calls this when it tears the timeline down — a resize below the
 * breakpoint, a reduced-motion toggle, a route change. Without it the last
 * scroll value would stay written on every stage and the stacked composition
 * would inherit a frozen mid-traverse state.
 */
export function resetTraverseProgress(): void {
  for (const listeners of stageProgressListeners.values()) {
    for (const listener of listeners) listener(null);
  }
}

/** How many worlds currently have a subscriber. Test seam; not used at runtime. */
export function stageProgressSubscriberCount(): number {
  return stageProgressListeners.size;
}
