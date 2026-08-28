import { describe, expect, it } from 'vitest';
import { bindPageLifecycle, type PageLifecycleController } from '../src/lib/motion/page-lifecycle';

/**
 * The back/forward cache contract.
 *
 * ── The defect ──────────────────────────────────────────────────────────────
 *
 * The hero field destroyed itself on every `pagehide`, one-shot, with no
 * `pageshow` counterpart. Chrome hid it: an ordinary navigation there really
 * does discard the document, so the teardown ran against a page that was about
 * to stop existing anyway. Safari and Firefox freeze the document instead, and
 * a Back restores it *in the same JavaScript context* — so the module never
 * re-ran, the destroy latch was already set, and `start()` returned early
 * forever. The field came back as a static hatch that never answered the
 * pointer again, silently, on the two engines nobody was testing in.
 *
 * ── Why the branching is worth its own module and its own suite ─────────────
 *
 * Because it is four lines that two separate files were each expected to
 * remember, and one of them forgot. Now there is one function, and these are the
 * cases it has to get right — written against `EventTarget` and `Event`, which
 * Node has, so no DOM stub stands between the assertion and the code.
 */

function controller(): PageLifecycleController & {
  readonly calls: string[];
} {
  const calls: string[] = [];
  return {
    calls,
    start: () => calls.push('start'),
    stop: () => calls.push('stop'),
    destroy: () => calls.push('destroy'),
  };
}

/** A `pagehide`/`pageshow` carrying the flag the browser sets. */
function transition(type: 'pagehide' | 'pageshow', persisted: boolean): Event {
  const event = new Event(type);
  Object.defineProperty(event, 'persisted', { value: persisted });
  return event;
}

describe('bindPageLifecycle', () => {
  it('suspends rather than destroys when the page is frozen into the cache', () => {
    // The defect, stated as an assertion: a persisted hide must be reversible.
    const target = new EventTarget();
    const visual = controller();
    bindPageLifecycle(target, visual);

    target.dispatchEvent(transition('pagehide', true));

    expect(visual.calls).toEqual(['stop']);
    expect(visual.calls).not.toContain('destroy');
  });

  it('brings the visual back when the cached page is restored', () => {
    const target = new EventTarget();
    const visual = controller();
    bindPageLifecycle(target, visual);

    target.dispatchEvent(transition('pagehide', true));
    target.dispatchEvent(transition('pageshow', true));

    expect(visual.calls).toEqual(['stop', 'start']);
  });

  it('survives more than one round trip', () => {
    // `{ once: true }` was on the original listener. It would have protected
    // exactly the first Back and no other.
    const target = new EventTarget();
    const visual = controller();
    bindPageLifecycle(target, visual);

    for (let i = 0; i < 3; i += 1) {
      target.dispatchEvent(transition('pagehide', true));
      target.dispatchEvent(transition('pageshow', true));
    }

    expect(visual.calls).toEqual(['stop', 'start', 'stop', 'start', 'stop', 'start']);
  });

  it('destroys when the page is really going away', () => {
    const target = new EventTarget();
    const visual = controller();
    bindPageLifecycle(target, visual);

    target.dispatchEvent(transition('pagehide', false));

    expect(visual.calls).toEqual(['destroy']);
  });

  it('releases the caller’s own resources before destroying, and only then', () => {
    // The hero's `IntersectionObserver` is not the controller's to close, and
    // it outlived `destroy()` — going on calling `start()`/`stop()` on a dead
    // handle. It must be released on an unload and kept across a freeze, since
    // a restored document is still watching the same element.
    const target = new EventTarget();
    const visual = controller();
    // Recorded into the controller's own log, so the ORDER is asserted rather
    // than merely the fact that both ran.
    bindPageLifecycle(target, visual, () => visual.calls.push('release'));

    target.dispatchEvent(transition('pagehide', true));
    expect(visual.calls).toEqual(['stop']);

    target.dispatchEvent(transition('pagehide', false));
    expect(visual.calls).toEqual(['stop', 'release', 'destroy']);
  });

  it('does nothing on the first load, where `pageshow` also fires', () => {
    // `pageshow` fires once on every navigation, cached or not. Starting on the
    // uncached one would restart a visual the caller may deliberately not have
    // started — and would do it before the caller's own `start()`.
    const target = new EventTarget();
    const visual = controller();
    bindPageLifecycle(target, visual);

    target.dispatchEvent(transition('pageshow', false));

    expect(visual.calls).toEqual([]);
  });

  it('treats an event with no `persisted` flag as a real unload', () => {
    // The safe default: release rather than suspend. A suspended visual that is
    // never restored is a blank box; a released one on a page that survives is
    // at worst a missing enhancement.
    const target = new EventTarget();
    const visual = controller();
    bindPageLifecycle(target, visual);

    target.dispatchEvent(new Event('pagehide'));

    expect(visual.calls).toEqual(['destroy']);
  });

  it('lets go of both listeners when detached', () => {
    const target = new EventTarget();
    const visual = controller();
    const detach = bindPageLifecycle(target, visual);

    detach();
    target.dispatchEvent(transition('pagehide', true));
    target.dispatchEvent(transition('pageshow', true));
    target.dispatchEvent(transition('pagehide', false));

    expect(visual.calls).toEqual([]);
  });
});
