/**
 * `matchMedia` for code that is not React.
 *
 * The React side of this site already has `useMediaQuery` (a
 * `useSyncExternalStore` wrapper in `src/components/visuals/worlds/`). This is
 * its plain-DOM twin, for the hero, which deliberately ships no framework: the
 * hero must stay on the 0 KB critical path, and importing a module that
 * imports `react` to reach one string would put React on it.
 *
 * The contract that matters is the same in both: **subscribe to `change`.**
 * `docs/MOTION_SYSTEM.md` §6 requires that toggling the OS motion setting take
 * effect without a reload, and a one-shot `matchMedia(q).matches` read at
 * start-up cannot do that.
 *
 * Both functions tolerate a missing `matchMedia` — an old browser, or a
 * prerender — by reporting `false` and subscribing to nothing. `false` is the
 * safe answer for both queries this file is used with: no reduce preference
 * detected and no fine pointer detected means the field renders as its static
 * CSS self and attaches nothing at all.
 */

/**
 * Gates every loop, timeline and ambient animation on the site.
 *
 * This is the single declaration. `visuals/worlds/useMediaQuery.ts` re-exports
 * it for the React side rather than restating the string — the dependency runs
 * in that direction because this module is React-free, and the hero must stay
 * off the React path to keep the critical path at 0 KB.
 */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * A pointer that can actually hover — a mouse, a trackpad, a stylus.
 *
 * The hero field is driven by pointer *position*, which a touchscreen only
 * reports while a finger is down and directly under the thing it is meant to
 * be revealing. `docs/MOTION_SYSTEM.md` §7 forbids hover-dependent
 * information; this visual carries none, so the correct behaviour on a coarse
 * pointer is not a degraded imitation but the static field, which is a
 * finished composition in its own right.
 */
export const FINE_POINTER_QUERY = '(pointer: fine)';

function mediaList(query: string): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(query);
}

/** Current value of a media query, or `false` where none can be evaluated. */
export function matchesMedia(query: string): boolean {
  return mediaList(query)?.matches ?? false;
}

/**
 * Call `onChange` whenever the query flips. Returns an unsubscribe function;
 * calling it is the caller's responsibility and is what keeps teardown clean.
 */
export function watchMedia(query: string, onChange: (matches: boolean) => void): () => void {
  const list = mediaList(query);
  if (!list) return () => {};

  const handle = (event: MediaQueryListEvent) => onChange(event.matches);
  list.addEventListener('change', handle);
  return () => list.removeEventListener('change', handle);
}
