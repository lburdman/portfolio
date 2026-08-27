import { useEffect, useRef, useState, type RefObject } from 'react';
import { clamp01 } from './traverse';

export interface PointerField {
  /** Horizontal pointer position over the stage, `0 → 1`. */
  readonly x: number;
  /** Vertical pointer position over the stage, `0 → 1`. */
  readonly y: number;
  /** `false` while nothing is pointing at the stage; `x`/`y` then read 0.5. */
  readonly engaged: boolean;
}

const RESTING: PointerField = { x: 0.5, y: 0.5, engaged: false };

/**
 * Normalised pointer position over a stage, or the resting centre.
 *
 * Contract, from docs/MOTION_SYSTEM.md §4: **when `active` is false this hook
 * attaches nothing.** No listener, no rAF, no timer. Four of the five stages
 * are inert at any moment and this is what makes that literally true rather
 * than merely quiet.
 *
 * Three details matter:
 *
 * - Every listener is `passive`, so a touch drag over a stage scrolls the page
 *   normally. The stage can never swallow a scroll gesture (brief §4).
 * - `pointerdown` is handled as well as `pointermove`, so a tap on a
 *   touchscreen reaches the same state a hover does. Nothing here is
 *   hover-only (brief §14).
 * - Updates are coalesced to one per animation frame. A pointer can fire far
 *   faster than the display refreshes, and one React render per event would be
 *   the expensive part of an otherwise free interaction.
 */
export function usePointerField(active: boolean): {
  ref: RefObject<HTMLDivElement | null>;
  field: PointerField;
} {
  const ref = useRef<HTMLDivElement | null>(null);
  const [field, setField] = useState<PointerField>(RESTING);

  useEffect(() => {
    const element = ref.current;
    if (!active || !element) return;

    let frame = 0;
    let pending: { x: number; y: number } | null = null;

    const flush = () => {
      frame = 0;
      if (!pending) return;
      const next = pending;
      pending = null;
      setField({ x: next.x, y: next.y, engaged: true });
    };

    const handleMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pending = {
        x: clamp01((event.clientX - rect.left) / rect.width),
        y: clamp01((event.clientY - rect.top) / rect.height),
      };
      if (frame === 0) frame = requestAnimationFrame(flush);
    };

    const handleRelease = () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      frame = 0;
      pending = null;
      setField(RESTING);
    };

    element.addEventListener('pointermove', handleMove, { passive: true });
    element.addEventListener('pointerdown', handleMove, { passive: true });
    element.addEventListener('pointerleave', handleRelease, { passive: true });
    element.addEventListener('pointercancel', handleRelease, { passive: true });

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      element.removeEventListener('pointermove', handleMove);
      element.removeEventListener('pointerdown', handleMove);
      element.removeEventListener('pointerleave', handleRelease);
      element.removeEventListener('pointercancel', handleRelease);
      setField(RESTING);
    };
  }, [active]);

  return { ref, field };
}
