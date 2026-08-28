/**
 * One page-lifecycle contract for every visual on the site.
 *
 * ── The defect this exists to end ───────────────────────────────────────────
 *
 * The hero field shipped with `window.addEventListener('pagehide', () =>
 * lines.destroy(), { once: true })`. Cross-document navigation makes that look
 * like belt-and-braces, and on Chrome it usually is. Safari and Firefox freeze
 * the document into the back/forward cache instead of destroying it, and a Back
 * restores it *without re-running the module* — so the one thing that had
 * already happened was the teardown. `destroy()` latches, `start()` returns
 * early on that latch forever, and the field came back as a dead static hatch
 * that never answered the pointer again. No error, no console warning, and only
 * on the two browsers the developer was not testing in.
 *
 * `ProjectGrid.astro` got this right and the hero did not, which is the real
 * lesson: the decision is four lines of branching that two files were each
 * expected to remember. It is one function now, in `src/lib`, where the
 * repository's own rule says logic lives — and where it can be unit-tested
 * rather than reviewed.
 *
 * ── The distinction the DOM makes, and this preserves ────────────────────────
 *
 * `pagehide` fires for both endings and `event.persisted` is the only thing
 * that tells them apart:
 *
 *   persisted: true    frozen into the cache. The document may come back, in
 *                      this same JavaScript context, with this same state. The
 *                      only correct response is a *reversible* stand-down.
 *   persisted: false   really going away. Release everything.
 *
 * `pageshow` mirrors it: it also fires on the very first load, where `persisted`
 * is false and nothing should restart, so the flag is checked on both sides.
 */

/**
 * A visual that can be stood down and brought back.
 *
 * `stop()` must be reversible — it may detach listeners and cancel frames, but
 * it may not latch anything `start()` cannot undo. `destroy()` is the one-way
 * release. `src/components/visuals/hero/magnet-lines.ts` is written to exactly
 * this shape and is the reason it is worded as a contract rather than as a hook.
 */
export interface PageLifecycleController {
  start(): void;
  stop(): void;
  destroy(): void;
}

/**
 * Binds a controller to the page's freeze / restore / unload transitions.
 *
 * @param target    Usually `window`. Taken as a parameter so the branching can
 *                  be tested against a bare `EventTarget`.
 * @param controller The visual to drive.
 * @param onUnload  Anything owned by the *call site* rather than by the
 *                  controller — an `IntersectionObserver` it opened, say —
 *                  released just before `destroy()`. It is deliberately not
 *                  called on a freeze: the restored document is the same
 *                  document, and an observer that survives it is still watching
 *                  the element it was given.
 * @returns A detach function, so a caller that outlives the page can let go.
 */
export function bindPageLifecycle(
  target: EventTarget,
  controller: PageLifecycleController,
  onUnload?: () => void,
): () => void {
  const onHide = (event: Event): void => {
    if (isPersisted(event)) {
      // Reversible only. `destroy()` here is the bug this module is named for.
      controller.stop();
      return;
    }
    onUnload?.();
    controller.destroy();
  };

  const onShow = (event: Event): void => {
    // `persisted` is false on a first load, where there is nothing to resume.
    if (isPersisted(event)) controller.start();
  };

  target.addEventListener('pagehide', onHide);
  target.addEventListener('pageshow', onShow);

  return () => {
    target.removeEventListener('pagehide', onHide);
    target.removeEventListener('pageshow', onShow);
  };
}

/**
 * Reads `persisted` off a page transition without assuming the event class.
 *
 * `instanceof PageTransitionEvent` is not available everywhere this runs (it is
 * absent from the Node environment the tests use), and an event that carries no
 * `persisted` at all — a synthetic `Event('pagehide')`, or an older engine —
 * must read as "not cached", which is the safe answer: it releases rather than
 * suspends.
 */
function isPersisted(event: Event): boolean {
  return 'persisted' in event && event.persisted === true;
}
