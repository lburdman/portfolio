/**
 * The geometry behind a project card's raking light.
 *
 * A hovered card renders as a sheet of paper lifted off the page under a light
 * whose source is the cursor: one radial gradient on one pseudo-element, whose
 * centre is `var(--card-x) var(--card-y)`. This module owns the arithmetic that
 * turns a pointer position into those two percentages, and nothing else — no
 * DOM, no listeners, no `matchMedia`. That is what makes it testable, and it is
 * where the two properties that are easy to get wrong live: the clamp and the
 * rounding.
 *
 * The DOM wiring is in `ProjectGrid.astro`, which caches these boxes rather
 * than measuring per event.
 */

/**
 * A card's box in **page** coordinates — document origin, not viewport origin.
 *
 * Page coordinates on purpose. A viewport-relative box is invalidated by every
 * scroll, which would mean either a `scroll` listener calling
 * `getBoundingClientRect()` per card (a forced reflow on the hottest event a
 * page has) or a stale spotlight. Anchored to the document, the same cached box
 * stays correct until the *layout* changes, so the only invalidation is resize
 * and reflow — and the pointer handler reads `scrollX`/`scrollY` once per
 * animation frame instead.
 */
export interface CardBox {
  /** Distance from the document's left edge, in CSS pixels. */
  readonly x: number;
  /** Distance from the document's top edge, in CSS pixels. */
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The light's centre, as the two percentages a `radial-gradient` position takes. */
export interface LightPosition {
  readonly x: number;
  readonly y: number;
}

/**
 * Where the light sits when nothing is pointing at the card.
 *
 * Upper left, because that is the direction light is conventionally assumed to
 * come from in a raised-surface illustration, and because it is what a
 * keyboard, a touch screen and a browser with no JavaScript all get. The
 * resting composition is therefore a *complete* lit sheet rather than a flat
 * one waiting to be improved — only the light's source is fixed. This value is
 * duplicated as the CSS fallback in `ProjectCard.astro`; the card's own test
 * asserts the two agree.
 */
export const RESTING_LIGHT: LightPosition = { x: 18, y: 0 };

/** How many decimal places the emitted percentages carry. */
const PRECISION = 1;

function round(value: number): number {
  const factor = 10 ** PRECISION;
  return Math.round(value * factor) / factor;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 50;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

/**
 * Whether a page-space point falls inside a card's box.
 *
 * Half-open on the far edges (`< x + width`), so two boxes that share an edge
 * can never both claim the same pixel and the listing cannot light two cards at
 * once.
 */
export function boxContains(box: CardBox, pageX: number, pageY: number): boolean {
  return pageX >= box.x && pageX < box.x + box.width && pageY >= box.y && pageY < box.y + box.height;
}

/**
 * The first box in `boxes` containing the point, or `-1`.
 *
 * Linear, because a listing holds four cards and only the ones currently
 * intersecting the viewport are ever passed in. A spatial index for four
 * numbers would cost more to maintain than it saves.
 */
export function pickBox(boxes: readonly CardBox[], pageX: number, pageY: number): number {
  for (let i = 0; i < boxes.length; i += 1) {
    const box = boxes[i];
    if (box && boxContains(box, pageX, pageY)) return i;
  }
  return -1;
}

/**
 * The light position for a pointer at `(pageX, pageY)` over `box`.
 *
 * Clamped to 0–100 rather than left to run off, because the gradient's centre
 * is also consulted while the pointer is *leaving*: the last frame before
 * `pointerleave` can arrive with coordinates a pixel or two outside the box,
 * and an unclamped value would kick the highlight sideways on the way out.
 *
 * A zero-width or zero-height box (a card that is display:none, or measured
 * before layout) has no meaningful centre, so it answers the resting position
 * instead of `NaN` — an invalid `--card-x` would make the whole `background`
 * declaration invalid at computed-value time and drop the sheet entirely.
 */
export function lightPosition(box: CardBox, pageX: number, pageY: number): LightPosition {
  if (box.width <= 0 || box.height <= 0) return RESTING_LIGHT;
  return {
    x: round(clampPercent(((pageX - box.x) / box.width) * 100)),
    y: round(clampPercent(((pageY - box.y) / box.height) * 100)),
  };
}
