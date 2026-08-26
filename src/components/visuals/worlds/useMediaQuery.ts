import { useCallback, useSyncExternalStore } from 'react';

/**
 * `matchMedia` as a React store.
 *
 * `useSyncExternalStore` rather than `useState` + `useEffect` is deliberate,
 * and it is the fix for the ordering trap described in docs/MOTION_SYSTEM.md §6.
 *
 * With the `useState(false)` + `useEffect(() => setMatches(...))` shape, every
 * effect of the first commit runs *before* the state update re-renders. The
 * effect that builds the GSAP timeline would therefore see `reduced === false`
 * on its first pass and create the pinned sequence for exactly the user who
 * asked for no motion, only to tear it down a frame later. Here the browser
 * snapshot is read during render, so the first post-hydration render already
 * carries the true value and the timeline is never constructed.
 *
 * The server snapshot is `false` — no media query matches on a static build —
 * and React reconciles the difference itself instead of reporting a hydration
 * mismatch, which is precisely what this hook exists for.
 *
 * Subscribing to `change` is what makes toggling the OS setting take effect
 * without a reload.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onStoreChange);
      return () => list.removeEventListener('change', onStoreChange);
    },
    [query],
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** The one query that gates every timeline, loop and ambient animation here. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * The traverse breakpoint.
 *
 * 64rem (1024px) is the tablet/desktop line: below it the domains stack
 * vertically and nothing is pinned (brief §33, docs/MOTION_SYSTEM.md §7). The
 * height clause guards the other failure mode — a short landscape window where
 * a pinned 100svh band would leave no room for the heading, the panel text and
 * the stage at once.
 */
export const TRAVERSE_QUERY = '(min-width: 64rem) and (min-height: 34rem)';
