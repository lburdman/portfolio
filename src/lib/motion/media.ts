/**
 * The two media queries every enhancement on this site is gated on, plus the
 * smallest possible `matchMedia` wrapper.
 *
 * There is exactly one of these. `src/components/visuals/worlds/useMediaQuery.ts`
 * is the *React* binding of the same idea — `useSyncExternalStore` over a media
 * query list — and it exists because a hook has to participate in render. This
 * module is the framework-free half, for the plain `<script>` enhancements that
 * are not inside an island: the hero field and the project cards.
 *
 * The dependency runs in this direction on purpose. `useMediaQuery.ts` imports
 * `REDUCED_MOTION_QUERY` from here and re-exports it; nothing restates the
 * string. Pointing it the other way would put React on the hero's path to reach
 * one string, and the hero must stay on the 0 KB critical path.
 *
 * Both helpers are total on a server: `matchesMedia` answers `false` and
 * `watchMedia` returns a no-op unsubscribe when there is no `window` or no
 * `matchMedia`. That matters because "unsupported ⇒ does not match" is the
 * whole degradation strategy — a user agent that cannot evaluate the query
 * keeps the server-rendered state, which is always the complete one.
 *
 * The contract that matters in both halves is **subscribe to `change`**.
 * `docs/MOTION_SYSTEM.md` §6 requires that toggling the OS motion setting take
 * effect without a reload, and a one-shot `matchMedia(q).matches` read at
 * start-up cannot do that.
 */

/** The one query that gates every timeline, loop and pointer enhancement. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * A pointing device that can hover precisely — a mouse or a trackpad.
 *
 * `(pointer: fine)` and **not** `(hover: hover)`. A stylus is fine but does not
 * hover; a TV remote hovers but is coarse. The enhancements this gates all
 * track a continuous cursor position, so precision is the property that
 * actually matters. Touch is excluded by construction, which is the point:
 * MOTION_SYSTEM §7 forbids hover-only information, so on a coarse pointer the
 * resting state must already be the complete one and there is nothing to
 * attach — not a degraded imitation, but a finished composition in its own
 * right.
 */
export const FINE_POINTER_QUERY = '(pointer: fine)';

function mediaList(query: string): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(query);
}

/** Whether a media query matches right now. `false` where `matchMedia` is absent. */
export function matchesMedia(query: string): boolean {
  return mediaList(query)?.matches ?? false;
}

/**
 * Subscribes to a media query and returns an unsubscribe function.
 *
 * The callback is **not** invoked on subscribe — read the current value with
 * `matchesMedia` first if you need it. Keeping the two apart means a caller
 * that only wants to know "did this change?" cannot be surprised by a
 * synchronous first call during setup.
 *
 * Calling the returned function is the caller's responsibility, and is what
 * keeps teardown clean.
 */
export function watchMedia(query: string, onChange: (matches: boolean) => void): () => void {
  const list = mediaList(query);
  if (!list) return () => {};

  const handler = (event: MediaQueryListEvent): void => onChange(event.matches);
  list.addEventListener('change', handler);
  return () => list.removeEventListener('change', handler);
}
