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

/**
 * The hydration gate — the query `home/TechnicalWorlds.astro` hands to
 * `client:media`, and the reason React is not on the mobile path at all.
 *
 * It is `TRAVERSE_QUERY` plus a motion clause, and it is composed here rather
 * than written out at the call site so the two gates cannot drift. The island
 * decides whether to *build* the timeline from `TRAVERSE_QUERY` and
 * `REDUCED_MOTION_QUERY`; this decides whether the runtime is *downloaded* at
 * all. If those two disagreed, some viewport would pay 60 KB of React to
 * render a stack it was already sent as HTML — which is exactly the state this
 * constant exists to end (docs/REDESIGN_DECISIONS.md #11).
 *
 * Three deliberate choices:
 *
 * 1. **64rem, not 48rem.** The decision record proposed 48rem, but the island
 *    pins at 64rem. A 48–64rem tablet would have downloaded React, GSAP and
 *    ScrollTrigger and then rendered the same stack it already had. The gate
 *    is set to the width that can actually use the payload.
 *
 * 2. **The height clause travels with it.** A 1200×500 window is wide enough
 *    to look like a desktop and too short to pin, so it is on the stack path
 *    for the same reason a phone is.
 *
 * 3. **`(prefers-reduced-motion: no-preference)`, not `not (… : reduce)`.**
 *    `client:media` takes any media query string, so a reduced-motion visitor
 *    can be excluded here too — and should be, because the island's own
 *    `matchMedia` check means they would never construct the timeline. The
 *    MQ4 boolean form `(not (prefers-reduced-motion: reduce))` says the same
 *    thing and is the more precise reading, but it needs Safari 16.4+ to parse
 *    at all, and an unparsed query never matches. `no-preference` is the MQ3
 *    form, understood everywhere the feature exists.
 *
 * Both failure modes are the same and both are safe: a user agent that cannot
 * evaluate the query does not match it, so it keeps the server-rendered stack —
 * complete, readable, and the composition four other cases already use. The
 * only thing anyone can lose here is the enhancement.
 *
 * Astro's media directive re-checks on `change`, so widening the window or
 * turning the OS motion setting off hydrates the island then, without a reload.
 */
export const HYDRATION_QUERY = `${TRAVERSE_QUERY} and (prefers-reduced-motion: no-preference)`;
