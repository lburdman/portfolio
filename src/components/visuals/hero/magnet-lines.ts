/**
 * The hero field controller — measure once, then write only.
 *
 * ── Provenance ──────────────────────────────────────────────────────────────
 *
 * Adapted from React Bits' "Magnet Lines" (reactbits.dev). Nothing was
 * installed and nothing is fetched: the idea is theirs, this implementation is
 * ours, and the runtime has no dependency on that project in any form. Four
 * things had to change before the original could ship here at all, and each is
 * a rule this repository already had:
 *
 * 1. **Every visual property moved into the stylesheet.** The original inline-
 *    styles the grid tracks, the line size, the colour and — fatally — the
 *    `transform: rotate(var(--rotate))` declaration itself. This site ships a
 *    hash-based CSP with no `'unsafe-inline'` and no `'unsafe-hashes'`, and a
 *    hash authorises a `<style>` *element*, never a `style=""` *attribute*
 *    (docs/ARCHITECTURE.md §10). Every one of those attributes is dropped in
 *    production, so the stock component would ship as invisible zero-size
 *    spans with no console error and a perfect `astro dev` preview. Writing
 *    `--hero-field-angle` through `setProperty` is a CSSOM write and is
 *    allowed; it only *does* anything because the `rotate()` that consumes it
 *    lives in `MagnetField.astro`'s `<style>` block.
 * 2. **The layout thrash is gone.** The original reads `getBoundingClientRect()`
 *    and writes a custom property per line inside one loop, per pointer event —
 *    a read/write interleave that forces a synchronous reflow for every line on
 *    every move. Rotation is about `transform-origin: center`, so the centres
 *    never move: they are measured once, cached, and refreshed only on resize
 *    or scroll. The steady-state pointer path performs zero layout reads.
 * 3. **The listener is scoped and coalesced.** `window` becomes the hero
 *    section; every pointer event is folded into a single `requestAnimationFrame`.
 * 4. **It stops.** Reduced motion, a coarse pointer, a hidden tab or a hero
 *    scrolled out of view all mean *nothing is attached and no frame is
 *    pending* (docs/MOTION_SYSTEM.md §4). The CSS resting angle is a finished
 *    composition, so "off" is a ruled sheet, not a blank one.
 *
 * The mathematics lives in `src/lib/motion/magnet-field.ts`, where it is unit
 * tested. This file measures, calls in there, and writes.
 */

import { INFLUENCE_RADIUS_IN_PITCHES, REST_ANGLE_DEG, lineResponse, stepEngagement } from '@/lib/motion/magnet-field';
import { FINE_POINTER_QUERY, REDUCED_MOTION_QUERY, matchesMedia, watchMedia } from '@/lib/motion/media';

/** The two custom properties the stylesheet reads back. */
const ANGLE_PROPERTY = '--hero-field-angle';
const HEAT_PROPERTY = '--hero-field-heat';

/**
 * Write thresholds. A line whose angle moved by less than a sixth of a degree
 * is not repainted: below that the change is invisible, and skipping it keeps
 * the per-frame write count to the few dozen lines actually inside the
 * disturbance rather than to every line in the field.
 */
const ANGLE_EPSILON_DEG = 0.15;
const HEAT_EPSILON = 0.008;

export interface MagnetLinesOptions {
  /**
   * The element pointer events are read from — the hero section, not the field
   * and not `window`. The field itself is `pointer-events: none` so it can
   * never swallow a click meant for a link beneath it, which is exactly why
   * the listener cannot live on it.
   */
  readonly pointerTarget: HTMLElement;
}

export interface MagnetLinesHandle {
  /** Allow the field to run. Idempotent. */
  start(): void;
  /** Forbid it, settle every line to rest, and release the listeners. */
  stop(): void;
  /** Release everything, permanently. */
  destroy(): void;
}

/**
 * One line's cached state.
 *
 * `centreX`/`centreY` are relative to the container's own box, so scrolling
 * does not invalidate them — only a resize does. `written*` is what was last
 * pushed to the element, which is how a frame skips the lines whose value has
 * not visibly moved.
 *
 * A record per line rather than parallel typed arrays: at two hundred entries
 * the allocation is irrelevant, and iterating objects means the hot loop never
 * indexes anything, which under `noUncheckedIndexedAccess` is the difference
 * between honest code and a file full of non-null assertions.
 */
interface FieldLine {
  readonly element: HTMLElement;
  centreX: number;
  centreY: number;
  /** False while a breakpoint has this line hidden; it then has no box. */
  rendered: boolean;
  writtenAngle: number;
  writtenHeat: number;
}

export function createMagnetLines(container: HTMLElement, options: MagnetLinesOptions): MagnetLinesHandle {
  const lines: FieldLine[] = Array.from(
    container.querySelectorAll<HTMLElement>('[data-hero-line]'),
    (element): FieldLine => ({
      element,
      centreX: 0,
      centreY: 0,
      rendered: false,
      writtenAngle: REST_ANGLE_DEG,
      writtenHeat: 0,
    }),
  );

  /* The container's position in the viewport. Invalidated by scroll and
     resize, re-read at the top of a frame — never inside the pointer handler. */
  let originX = 0;
  let originY = 0;
  let radius = 0;

  let geometryDirty = true;
  let originDirty = true;

  let pointerX = 0;
  let pointerY = 0;
  let engagement = 0;
  let engagementTarget = 0;

  let frame = 0;
  let attached = false;

  let started = false;
  let onScreen = true;
  let allowed = matchesMedia(FINE_POINTER_QUERY) && !matchesMedia(REDUCED_MOTION_QUERY);
  let destroyed = false;

  /* ── Measurement ─────────────────────────────────────────────────────────
     All reads, together, at the top of a frame. Nothing here writes, so the
     browser performs at most one layout for the whole batch. */

  function measureOrigin(): void {
    const rect = container.getBoundingClientRect();
    originX = rect.left;
    originY = rect.top;
    originDirty = false;
  }

  function measureGeometry(): void {
    measureOrigin();

    let firstX = Number.NaN;
    let pitch = 0;

    for (const line of lines) {
      const rect = line.element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        line.rendered = false;
        continue;
      }
      line.rendered = true;
      const cx = rect.left + rect.width / 2 - originX;
      line.centreX = cx;
      line.centreY = rect.top + rect.height / 2 - originY;

      /* The horizontal pitch, read off the layout rather than computed from
         the breakpoint table: the first two visible lines are neighbours in
         the first row, so the gap between their centres is one column. */
      if (Number.isNaN(firstX)) firstX = cx;
      else if (pitch === 0 && cx > firstX) pitch = cx - firstX;
    }

    radius = pitch * INFLUENCE_RADIUS_IN_PITCHES;
    geometryDirty = false;
  }

  /* ── Writing ─────────────────────────────────────────────────────────────
     Pure CSSOM writes. `setProperty` on a custom property is not an inline
     style declaration the CSP can drop, and the `rotate()` that consumes it is
     in the component stylesheet where a hash authorises it. */

  function write(line: FieldLine, angleDeg: number, heat: number): void {
    line.element.style.setProperty(ANGLE_PROPERTY, `${angleDeg.toFixed(2)}deg`);
    line.element.style.setProperty(HEAT_PROPERTY, heat.toFixed(3));
    line.writtenAngle = angleDeg;
    line.writtenHeat = heat;
  }

  function render(): void {
    const px = pointerX - originX;
    const py = pointerY - originY;
    const settled = engagement === 0;

    for (const line of lines) {
      if (!line.rendered) continue;

      /* Once the envelope is closed the field must land exactly on its resting
         values, not merely within a threshold of them — otherwise a line is
         left permanently askew by a fraction of a degree and the "off" state
         is not the CSS composition it claims to be. */
      if (settled) {
        if (line.writtenAngle !== REST_ANGLE_DEG || line.writtenHeat !== 0) write(line, REST_ANGLE_DEG, 0);
        continue;
      }

      const { angleDeg, heat } = lineResponse({
        dx: px - line.centreX,
        dy: py - line.centreY,
        radius,
        engagement,
      });

      const still =
        Math.abs(angleDeg - line.writtenAngle) < ANGLE_EPSILON_DEG && Math.abs(heat - line.writtenHeat) < HEAT_EPSILON;
      if (still) continue;

      write(line, angleDeg, heat);
    }
  }

  /* ── The frame loop ──────────────────────────────────────────────────────
     Scheduled by a pointer event, and self-sustaining only while the envelope
     is still moving. At rest there is no pending frame at all, which is what
     makes "stopped" verifiable rather than merely quiet. */

  function schedule(): void {
    if (frame === 0 && attached) frame = requestAnimationFrame(tick);
  }

  function tick(): void {
    frame = 0;
    if (geometryDirty) measureGeometry();
    else if (originDirty) measureOrigin();

    engagement = stepEngagement(engagement, engagementTarget);
    render();

    if (engagement !== engagementTarget) schedule();
  }

  /** Settle synchronously, without waiting for a frame that may never come. */
  function settleNow(): void {
    if (frame !== 0) cancelAnimationFrame(frame);
    frame = 0;
    engagement = 0;
    engagementTarget = 0;
    render();
  }

  /* ── Input ───────────────────────────────────────────────────────────────
     The handler stores two numbers. It reads no layout, touches no element and
     allocates nothing, so a pointer moving across the hero costs one closure
     call per event and one frame per display refresh. */

  function handleMove(event: PointerEvent): void {
    pointerX = event.clientX;
    pointerY = event.clientY;
    engagementTarget = 1;
    schedule();
  }

  function handleLeave(): void {
    engagementTarget = 0;
    schedule();
  }

  function handleScroll(): void {
    originDirty = true;
  }

  function handleResize(): void {
    geometryDirty = true;
    schedule();
  }

  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(handleResize) : null;

  function attach(): void {
    if (attached) return;
    attached = true;
    const target = options.pointerTarget;
    target.addEventListener('pointermove', handleMove, { passive: true });
    target.addEventListener('pointerleave', handleLeave, { passive: true });
    target.addEventListener('pointercancel', handleLeave, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    resizeObserver?.observe(container);
  }

  function detach(): void {
    if (!attached) return;
    const target = options.pointerTarget;
    target.removeEventListener('pointermove', handleMove);
    target.removeEventListener('pointerleave', handleLeave);
    target.removeEventListener('pointercancel', handleLeave);
    window.removeEventListener('scroll', handleScroll);
    resizeObserver?.disconnect();
    attached = false;
    settleNow();
  }

  /* ── Gating ──────────────────────────────────────────────────────────────
     One predicate, four inputs. Every "off" path ends in `detach()`, so there
     is no state in which a listener outlives the reason it was attached. */

  function shouldRun(): boolean {
    return started && allowed && onScreen && !destroyed && typeof document !== 'undefined' && !document.hidden;
  }

  function evaluate(): void {
    if (shouldRun()) attach();
    else detach();
  }

  const stopWatchingMotion = watchMedia(REDUCED_MOTION_QUERY, (reduce) => {
    allowed = !reduce && matchesMedia(FINE_POINTER_QUERY);
    evaluate();
  });

  const stopWatchingPointer = watchMedia(FINE_POINTER_QUERY, (fine) => {
    allowed = fine && !matchesMedia(REDUCED_MOTION_QUERY);
    evaluate();
  });

  function handleVisibility(): void {
    evaluate();
  }

  document.addEventListener('visibilitychange', handleVisibility);

  const intersectionObserver =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) onScreen = entry.isIntersecting;
            evaluate();
          },
          { threshold: 0 },
        )
      : null;

  intersectionObserver?.observe(container);

  return {
    start(): void {
      if (destroyed) return;
      started = true;
      evaluate();
    },
    stop(): void {
      started = false;
      evaluate();
    },
    destroy(): void {
      destroyed = true;
      started = false;
      detach();
      intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      stopWatchingMotion();
      stopWatchingPointer();
    },
  };
}
