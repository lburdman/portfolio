import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DOMAINS } from '../src/config/domains';
import {
  activeIndexFromProgress,
  clamp01,
  clampIndex,
  HOLD_HEIGHTS,
  holdCentre,
  localProgress,
  MOVE_HEIGHTS,
  nextIndexForKey,
  pinnedScrollLength,
  progressForIndex,
  publishTraverseProgress,
  resetTraverseProgress,
  scrollTargetForIndex,
  segmentPitch,
  snapProgress,
  stageProgressSubscriberCount,
  subscribeStageProgress,
  timelineAt,
  TRAVERSE_LENGTH,
  TRAVERSE_SCROLL_HEIGHTS,
  traverseIds,
  traverseIndexOf,
  traverseScrollHeights,
} from '../src/components/visuals/worlds/traverse';
import { HYDRATION_QUERY, REDUCED_MOTION_QUERY, TRAVERSE_QUERY } from '../src/components/visuals/worlds/useMediaQuery';
import {
  clockPath,
  createRandom,
  manhattanLength,
  manhattanPath,
  STAGE_WIDTH,
  wavePath,
} from '../src/components/visuals/worlds/stage-geometry';
import { ROUTE_CELLS, ROUTE_STEPS } from '../src/components/visuals/worlds/stages/RoutingStage';

/**
 * Unit tests for the Technical Worlds island's pure layers.
 *
 * Nothing here touches the DOM, React or GSAP. What is asserted is the
 * arithmetic that decides which domain the traverse is on, what the keyboard
 * does to that decision, and that the geometry the stages draw is identical on
 * the server and in the browser — the three things that are wrong silently
 * rather than loudly if they are wrong at all.
 *
 * AUDIT.md 3.2 is the standard being avoided: every assertion below is written
 * so that a plausible defect in the source makes it fail.
 */

const COUNT = DOMAINS.length;

describe('clamp01', () => {
  it('passes values inside the unit interval through unchanged', () => {
    expect(clamp01(0.37)).toBe(0.37);
  });

  it('clamps outside the unit interval at both ends', () => {
    expect(clamp01(-2.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
  });

  it('answers 0 for NaN rather than propagating it into a transform', () => {
    expect(clamp01(Number.NaN)).toBe(0);
  });
});

describe('clampIndex', () => {
  it('keeps a valid index', () => {
    expect(clampIndex(3, COUNT)).toBe(3);
  });

  it('clamps below zero and above the last index', () => {
    expect(clampIndex(-4, COUNT)).toBe(0);
    expect(clampIndex(COUNT + 9, COUNT)).toBe(COUNT - 1);
  });

  it('never answers a negative index for an empty sequence', () => {
    // The island indexes arrays under `noUncheckedIndexedAccess`; -1 here
    // would become an `undefined` read at the call site rather than an error.
    expect(clampIndex(2, 0)).toBe(0);
  });

  it('answers the first index for a non-finite one', () => {
    // `Math.trunc(NaN)` is NaN and every comparison against it is false, so
    // without the guard this would return NaN and index the panel array with
    // it. Both infinities are checked because only one of them is caught by
    // the "above the last index" branch.
    expect(clampIndex(Number.NaN, COUNT)).toBe(0);
    expect(clampIndex(Number.POSITIVE_INFINITY, COUNT)).toBe(0);
    expect(clampIndex(Number.NEGATIVE_INFINITY, COUNT)).toBe(0);
  });

  it('truncates a fractional index rather than rounding it', () => {
    expect(clampIndex(2.9, COUNT)).toBe(2);
    expect(clampIndex(-0.4, COUNT)).toBe(0);
  });
});

/* ===========================================================================
   The timeline's shape

   The traverse is not one slope. It alternates `hold(0) move(0→1) hold(1) …
   hold(n-1)`: `count` dwells with a panel exactly centred, and `count - 1`
   eased slides of one panel pitch between them.

   The helpers below rebuild that shape from the two constants, so every
   assertion is written against the structure rather than against a number that
   happens to be true at today's tuning.
   ======================================================================== */

const PITCH = HOLD_HEIGHTS + MOVE_HEIGHTS;
const TOTAL = COUNT * HOLD_HEIGHTS + (COUNT - 1) * MOVE_HEIGHTS;
/** Scroll progress at a timeline position given in viewport heights. */
const at = (heights: number) => heights / TOTAL;
/** The start, centre and end of world `i`'s hold, as scroll progress. */
const holdStart = (i: number) => at(i * PITCH);
const holdMid = (i: number) => at(i * PITCH + HOLD_HEIGHTS / 2);
const holdEnd = (i: number) => at(i * PITCH + HOLD_HEIGHTS);

describe('the timeline geometry helpers', () => {
  it('agrees with the shape the island builds', () => {
    expect(segmentPitch()).toBeCloseTo(PITCH, 12);
    expect(traverseScrollHeights()).toBeCloseTo(TOTAL, 12);
    expect(TRAVERSE_SCROLL_HEIGHTS).toBeCloseTo(TOTAL, 12);
    // `count` holds and `count - 1` moves, which is the same thing said twice:
    // the range is `count - 1` whole periods plus one closing hold.
    expect(TOTAL).toBeCloseTo((COUNT - 1) * PITCH + HOLD_HEIGHTS, 12);
  });

  it('converts progress into timeline position and clamps at both ends', () => {
    expect(timelineAt(0, COUNT)).toBe(0);
    expect(timelineAt(1, COUNT)).toBeCloseTo(TOTAL, 12);
    expect(timelineAt(1.7, COUNT)).toBeCloseTo(TOTAL, 12);
    expect(timelineAt(Number.NaN, COUNT)).toBe(0);
  });

  it('centres each hold half a hold after its start', () => {
    for (let i = 0; i < COUNT; i += 1) {
      expect(holdCentre(i, COUNT)).toBeCloseTo(i * PITCH + HOLD_HEIGHTS / 2, 12);
    }
  });

  it('answers a degenerate pitch as zero rather than NaN', () => {
    expect(segmentPitch(0, 0)).toBe(0);
    expect(segmentPitch(Number.NaN, 1)).toBe(0);
    expect(traverseScrollHeights(0)).toBe(0);
  });
});

describe('activeIndexFromProgress', () => {
  /* The rule: world `i` becomes active at the START of hold(i) — the instant
     its panel reaches the centre — and stays active through the move that
     carries it out again. That is what makes each arrival animation fire while
     its own panel is centred, and what keeps the outgoing world's ambient
     running as it slides away instead of freezing mid-exit. */

  it('makes a world active exactly when it reaches the centre', () => {
    for (let i = 0; i < COUNT; i += 1) {
      expect(activeIndexFromProgress(holdStart(i), COUNT)).toBe(i);
      expect(activeIndexFromProgress(holdMid(i), COUNT)).toBe(i);
    }
  });

  it('keeps the outgoing world active for the whole of its exit move', () => {
    for (let i = 0; i < COUNT - 1; i += 1) {
      // Anywhere strictly inside move(i → i+1) is still world i.
      expect(activeIndexFromProgress(at(i * PITCH + HOLD_HEIGHTS + MOVE_HEIGHTS * 0.05), COUNT)).toBe(i);
      expect(activeIndexFromProgress(at(i * PITCH + HOLD_HEIGHTS + MOVE_HEIGHTS * 0.5), COUNT)).toBe(i);
      expect(activeIndexFromProgress(at(i * PITCH + HOLD_HEIGHTS + MOVE_HEIGHTS * 0.95), COUNT)).toBe(i);
      // …and the handover is the arrival, not the departure.
      expect(activeIndexFromProgress(holdStart(i + 1), COUNT)).toBe(i + 1);
    }
  });

  it('never skips a world, however coarse the sampling', () => {
    // The 800px-jump defect: a scroll delta large enough to cross a whole
    // segment used to step past a domain. Because this is a pure function of
    // progress and never accumulates, sampling it at any resolution visits
    // every index in order.
    const seen: number[] = [];
    for (let step = 0; step <= 40; step += 1) {
      const index = activeIndexFromProgress(step / 40, COUNT);
      if (seen[seen.length - 1] !== index) seen.push(index);
    }
    expect(seen).toEqual(Array.from({ length: COUNT }, (_, i) => i));
  });

  it('maps both ends of the range to the first and last domain', () => {
    expect(activeIndexFromProgress(0, COUNT)).toBe(0);
    expect(activeIndexFromProgress(1, COUNT)).toBe(COUNT - 1);
  });

  it('clamps progress reported outside 0…1 by an over-scrolled ScrollTrigger', () => {
    expect(activeIndexFromProgress(-0.4, COUNT)).toBe(0);
    expect(activeIndexFromProgress(1.4, COUNT)).toBe(COUNT - 1);
  });

  it('answers 0 for a single-domain or empty sequence instead of dividing by zero', () => {
    expect(activeIndexFromProgress(0.5, 1)).toBe(0);
    expect(activeIndexFromProgress(0.5, 0)).toBe(0);
    expect(activeIndexFromProgress(0.5, COUNT, 0, 0)).toBe(0);
  });
});

describe('progressForIndex', () => {
  it('is the centre of the stop’s hold, not its leading edge', () => {
    for (let index = 0; index < COUNT; index += 1) {
      expect(progressForIndex(index, COUNT)).toBeCloseTo(holdMid(index), 12);
    }
  });

  it('lands inside the right hold at every stop', () => {
    for (let index = 0; index < COUNT; index += 1) {
      expect(activeIndexFromProgress(progressForIndex(index, COUNT), COUNT)).toBe(index);
    }
  });

  it('opens and closes the range with half a hold', () => {
    // Neither end is 0 or 1 any more, and that is the fix: the first world is
    // already centred when the pin engages and the last one is still centred
    // when it lets go. Before, the first stop sat at progress 0 — where its
    // panel was 94px off centre — and the last at progress 1, after 350px in
    // which nothing moved at all.
    expect(progressForIndex(0, COUNT)).toBeCloseTo(HOLD_HEIGHTS / 2 / TOTAL, 12);
    expect(1 - progressForIndex(COUNT - 1, COUNT)).toBeCloseTo(HOLD_HEIGHTS / 2 / TOTAL, 12);
  });

  it('answers 0 for a single-domain or empty sequence instead of dividing by zero', () => {
    // `count - 1` is the divisor. Without the guard a one-domain site would
    // put every stop at Infinity and scroll the keyboard traverse off the page.
    expect(progressForIndex(0, 1)).toBe(0);
    expect(progressForIndex(3, 1)).toBe(0);
    expect(progressForIndex(0, 0)).toBe(0);
  });
});

describe('nextIndexForKey', () => {
  it('steps right and left', () => {
    expect(nextIndexForKey('ArrowRight', 1, COUNT)).toBe(2);
    expect(nextIndexForKey('ArrowLeft', 1, COUNT)).toBe(0);
  });

  it('clamps at both ends rather than wrapping', () => {
    expect(nextIndexForKey('ArrowRight', COUNT - 1, COUNT)).toBe(COUNT - 1);
    expect(nextIndexForKey('ArrowLeft', 0, COUNT)).toBe(0);
  });

  it('jumps to the ends with Home and End', () => {
    expect(nextIndexForKey('Home', 3, COUNT)).toBe(0);
    expect(nextIndexForKey('End', 1, COUNT)).toBe(COUNT - 1);
  });

  it('claims no key that the browser uses for vertical scrolling', () => {
    // Intercepting these is the scroll-jacking the brief (§4) forbids, so the
    // handler must be told they are not its keys.
    for (const key of ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Space', ' ', 'Tab', 'Enter']) {
      expect(nextIndexForKey(key, 2, COUNT)).toBeNull();
    }
  });

  it('tolerates a current index that is already out of range', () => {
    expect(nextIndexForKey('ArrowRight', 99, COUNT)).toBe(COUNT - 1);
    expect(nextIndexForKey('ArrowLeft', -99, COUNT)).toBe(0);
  });

  it('handles no key at all for an empty sequence', () => {
    expect(nextIndexForKey('ArrowRight', 0, 0)).toBeNull();
  });
});

describe('scrollTargetForIndex', () => {
  it('lands on the centre of each stop’s hold', () => {
    const start = 1000;
    const end = 3000;
    for (let index = 0; index < COUNT; index += 1) {
      expect(scrollTargetForIndex(index, COUNT, start, end)).toBeCloseTo(start + holdMid(index) * (end - start), 8);
    }
  });

  it('spreads the stops evenly, one period apart', () => {
    // Consecutive stops are exactly one `hold + move` apart, so a keypress
    // always costs the same scroll wherever in the traverse it is pressed.
    const gaps: number[] = [];
    for (let index = 1; index < COUNT; index += 1) {
      gaps.push(scrollTargetForIndex(index, COUNT, 1000, 3000) - scrollTargetForIndex(index - 1, COUNT, 1000, 3000));
    }
    for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0] ?? 0, 8);
  });

  it('keeps both end stops strictly inside the pinned range', () => {
    // The last stop must not sit at the very end: there it would be the frame
    // the pin releases on, which is the finale defect this shape removes.
    expect(scrollTargetForIndex(0, COUNT, 1000, 3000)).toBeGreaterThan(1000);
    expect(scrollTargetForIndex(COUNT - 1, COUNT, 1000, 3000)).toBeLessThan(3000);
  });

  it('answers the range start for an unmeasured ScrollTrigger', () => {
    // `end === start` is what a trigger reports before its first refresh; a
    // naive implementation would divide by zero and scroll to NaN.
    expect(scrollTargetForIndex(3, 5, 1200, 1200)).toBe(1200);
    expect(scrollTargetForIndex(3, 5, 1200, 400)).toBe(1200);
  });

  it('clamps an out-of-range index onto the first and last stop', () => {
    expect(scrollTargetForIndex(-3, COUNT, 1000, 3000)).toBe(scrollTargetForIndex(0, COUNT, 1000, 3000));
    expect(scrollTargetForIndex(50, COUNT, 1000, 3000)).toBe(scrollTargetForIndex(COUNT - 1, COUNT, 1000, 3000));
  });

  it('answers 0 for a non-finite range start', () => {
    // `self.start` is NaN if a keypress arrives before ScrollTrigger has
    // measured anything. `window.scrollTo({ top: NaN })` is a silent no-op in
    // some engines and a jump in others; 0 is the same in both.
    expect(scrollTargetForIndex(2, 5, Number.NaN, 3000)).toBe(0);
    expect(scrollTargetForIndex(2, 5, Number.POSITIVE_INFINITY, 3000)).toBe(0);
  });

  it('answers the range start for a non-finite range end', () => {
    expect(scrollTargetForIndex(2, 5, 1200, Number.NaN)).toBe(1200);
    expect(scrollTargetForIndex(2, 5, 1200, Number.POSITIVE_INFINITY)).toBe(1200);
  });
});

/* ===========================================================================
   The pin's scroll budget

   docs/REDESIGN_DECISIONS.md #14 and the Audio row of §P2. Before that pass,
   the pinned range WAS the horizontal travel distance in pixels, which made
   the section 43% of the document (measured: 4400px of 10207px at 1440×900)
   and gave the last of five worlds no dwell at all.

   The pass that fixed it introduced a `FINALE_DWELL` appended after the
   travel. A later browser audit measured what that produced: 350px of pinned
   scroll in which the transform did not change, and — because the dwell ate
   into the range without adding travel — a track moving 2.14px per scrolled
   px, with no plateau anywhere and every world within 60px of centre for about
   50px of scroll.

   The dwell is now inside the timeline, one per world, so there is no separate
   finale constant to bound. What is asserted here instead is the structure
   that replaced it, and one honest ceiling on how long the whole thing may be.
   ======================================================================== */

describe('the pinned scroll budget', () => {
  it('is one hold per world plus one move between each pair', () => {
    expect(TRAVERSE_SCROLL_HEIGHTS).toBeCloseTo(
      TRAVERSE_LENGTH * HOLD_HEIGHTS + (TRAVERSE_LENGTH - 1) * MOVE_HEIGHTS,
      10,
    );
  });

  /* This replaces the old `FINALE_DWELL` range assertion, which protected a
     constant that no longer exists. What needs protecting now is the property
     that constant was standing in for: the range must END in a dwell, and that
     dwell must be a real one and no longer than anyone else's. */

  it('ends the pin in a dwell, not in a frozen tail', () => {
    // The last world is already active, and still active, at the very end.
    expect(activeIndexFromProgress(1, COUNT)).toBe(COUNT - 1);
    // Its local progress runs out exactly at the pin's end — so the last thing
    // the reader scrolls through is the finale leaving, not nothing at all.
    expect(localProgress(COUNT - 1, 1, COUNT)).toBe(1);
    // And the tail after the last stop is exactly half a hold. A re-added dead
    // tail of any length would make this remainder larger.
    expect((1 - progressForIndex(COUNT - 1, COUNT)) * TOTAL).toBeCloseTo(HOLD_HEIGHTS / 2, 12);
  });

  it('gives every world the same dwell, the finale included', () => {
    const dwell = (i: number) => (holdEnd(i) - holdStart(i)) * TOTAL;
    for (let i = 0; i < COUNT; i += 1) expect(dwell(i)).toBeCloseTo(HOLD_HEIGHTS, 12);
  });

  it('holds long enough to read as a stop and not so long as to stall', () => {
    // Under about half a move and the plateau stops registering as a plateau —
    // which is the defect that started this. Over about a move and the band
    // reads as having stalled, which is the defect the pass before it started.
    expect(HOLD_HEIGHTS).toBeGreaterThanOrEqual(MOVE_HEIGHTS / 2);
    expect(HOLD_HEIGHTS).toBeLessThanOrEqual(MOVE_HEIGHTS);
  });

  /* ── The ceiling ────────────────────────────────────────────────────────
     This bound used to be `pin / document < 1/3` against a hardcoded
     `rest = 5750`, which capped the per-step scroll at 0.698 viewport heights.
     That number was never measured — it was a round fraction, and the retune
     above (which is what makes every world actually reach and hold the centre)
     exceeds it.

     A round budget does not outrank correct pacing, so the bound is retuned
     rather than deleted or weakened away. What it protects is unchanged and
     still real: this document has five sections, and a pinned band that is
     approaching half of it is the "43% of the page is one section" finding
     that started the whole line of work.

     `rest` is now measured, not assumed — 6549px on the built site at
     1440×900, the document height with the pin's own range excluded. The
     ceiling is 40%: the current shape sits at 34.0%, the pre-fix behaviour at
     40.2% fails it, and the constants above would have to grow by about 14%
     before it bit. It is a ceiling on absurdity, not a target. */

  it('keeps the band under two fifths of the document', () => {
    const rest = 6549;
    const pin = pinnedScrollLength(900);
    expect(pin / (rest + pin)).toBeLessThan(0.4);
    // …and the behaviour this line of work started from, ~4400px, fails it.
    expect(4400 / (rest + 4400)).toBeGreaterThan(0.4);
  });

  it('scales the pin with the viewport rather than with the track width', () => {
    expect(pinnedScrollLength(900)).toBe(Math.round(TRAVERSE_SCROLL_HEIGHTS * 900));
    expect(pinnedScrollLength(1800)).toBe(2 * pinnedScrollLength(900));
  });

  it('answers zero for a viewport it cannot measure', () => {
    // ScrollTrigger reads 0 as "no range", which leaves the band unpinned —
    // the safe failure. A NaN here would pin it forever.
    expect(pinnedScrollLength(0)).toBe(0);
    expect(pinnedScrollLength(-100)).toBe(0);
    expect(pinnedScrollLength(Number.NaN)).toBe(0);
  });
});

describe('localProgress', () => {
  /* The continuous channel a scroll-driven stage reads. Its contract is three
     points: 0 as the world begins arriving, exactly 0.5 while it is centred,
     1 once it has finished leaving. A later feature keys its midpoint state to
     that 0.5, so it is asserted for every world including the clamped ends. */

  it('reads exactly 0.5 at the centre of every hold', () => {
    for (let i = 0; i < COUNT; i += 1) {
      expect(localProgress(i, holdMid(i), COUNT)).toBeCloseTo(0.5, 12);
      // …and at the same progress the keyboard would target for that stop.
      expect(localProgress(i, progressForIndex(i, COUNT), COUNT)).toBeCloseTo(0.5, 12);
    }
  });

  it('spans the whole ownership window: entry move, hold, exit move', () => {
    for (let i = 1; i < COUNT - 1; i += 1) {
      // 0 at the instant its entry move begins…
      expect(localProgress(i, at(i * PITCH - MOVE_HEIGHTS), COUNT)).toBeCloseTo(0, 12);
      // …and 1 at the instant its exit move ends.
      expect(localProgress(i, at((i + 1) * PITCH), COUNT)).toBeCloseTo(1, 12);
    }
  });

  it('clamps the first world’s window to the start of the pin', () => {
    // World 0 has no entry move, so its window opens where the pin does.
    expect(localProgress(0, 0, COUNT)).toBe(0);
    expect(localProgress(0, holdMid(0), COUNT)).toBeCloseTo(0.5, 12);
    expect(localProgress(0, at(PITCH), COUNT)).toBeCloseTo(1, 12);
  });

  it('clamps the last world’s window to the end of the pin', () => {
    const last = COUNT - 1;
    expect(localProgress(last, at(last * PITCH - MOVE_HEIGHTS), COUNT)).toBeCloseTo(0, 12);
    expect(localProgress(last, holdMid(last), COUNT)).toBeCloseTo(0.5, 12);
    expect(localProgress(last, 1, COUNT)).toBe(1);
  });

  it('rises monotonically and never leaves the unit interval', () => {
    for (let i = 0; i < COUNT; i += 1) {
      let previous = -1;
      for (let step = 0; step <= 200; step += 1) {
        const value = localProgress(i, step / 200, COUNT);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
        expect(value).toBeGreaterThanOrEqual(previous);
        previous = value;
      }
    }
  });

  it('is 0 before its world is anywhere near, and 1 long after', () => {
    expect(localProgress(COUNT - 1, 0, COUNT)).toBe(0);
    expect(localProgress(0, 1, COUNT)).toBe(1);
  });

  it('answers 0 rather than NaN for a sequence with no length', () => {
    expect(localProgress(0, 0.5, 0)).toBe(0);
    expect(localProgress(0, 0.5, COUNT, 0, 0)).toBe(0);
  });

  it('never divides by zero, even with no hold at all', () => {
    // A zero hold collapses every window to the two moves either side of it.
    // The midpoint contract survives — it is just instantaneous — and no
    // sample anywhere in the range comes back NaN.
    for (let i = 0; i < COUNT; i += 1) {
      expect(localProgress(i, at(i * MOVE_HEIGHTS) / 1, COUNT, 0, MOVE_HEIGHTS)).toBeGreaterThanOrEqual(0);
      for (let step = 0; step <= 60; step += 1) {
        expect(Number.isFinite(localProgress(i, step / 60, COUNT, 0, MOVE_HEIGHTS))).toBe(true);
      }
    }
  });
});

describe('snapProgress', () => {
  /* Releasing mid-move settles onto the nearer world. Releasing inside a hold
     does nothing at all — a reader who has come to rest on a centred world
     must not have the page pulled out from under them, which is the line
     between settling a gesture and jacking the scroll. */

  it('leaves a reader who is resting inside a hold exactly where they are', () => {
    for (let i = 0; i < COUNT; i += 1) {
      for (const p of [holdStart(i), holdMid(i), holdEnd(i), (holdStart(i) + holdMid(i)) / 2]) {
        expect(snapProgress(p, COUNT)).toBeCloseTo(p, 12);
      }
    }
  });

  it('settles a release mid-move onto the nearer hold’s centre', () => {
    for (let i = 0; i < COUNT - 1; i += 1) {
      const justAfter = at(i * PITCH + HOLD_HEIGHTS + MOVE_HEIGHTS * 0.2);
      const justBefore = at(i * PITCH + HOLD_HEIGHTS + MOVE_HEIGHTS * 0.8);
      expect(snapProgress(justAfter, COUNT)).toBeCloseTo(holdMid(i), 12);
      expect(snapProgress(justBefore, COUNT)).toBeCloseTo(holdMid(i + 1), 12);
    }
  });

  it('always answers a progress the traverse can rest at', () => {
    const stops = Array.from({ length: COUNT }, (_, i) => holdMid(i));
    for (let step = 0; step <= 400; step += 1) {
      const settled = snapProgress(step / 400, COUNT);
      const index = activeIndexFromProgress(settled, COUNT);
      // Either untouched inside a hold, or landed on a stop.
      const inHold = settled >= holdStart(index) - 1e-9 && settled <= holdEnd(index) + 1e-9;
      const onStop = stops.some((stop) => Math.abs(stop - settled) < 1e-9);
      expect(inHold || onStop).toBe(true);
    }
  });

  it('clamps and never answers NaN', () => {
    expect(snapProgress(-3, COUNT)).toBe(0);
    expect(snapProgress(4, COUNT)).toBe(1);
    expect(snapProgress(Number.NaN, COUNT)).toBe(0);
    expect(snapProgress(0.5, 1)).toBe(0.5);
    expect(snapProgress(0.5, COUNT, 0, 0)).toBe(0.5);
  });
});

/* ===========================================================================
   The local progress channel

   Stages need a continuous value every frame. Sending it through React state
   would re-render five panels and five stages per scroll tick, so it travels
   through a plain subscription registry instead — the island publishes one
   number and each subscriber is called with its own world's local progress.
   ======================================================================== */

describe('the stage progress registry', () => {
  afterEach(() => {
    resetTraverseProgress();
  });

  it('gives each subscriber its own world’s local progress', () => {
    const seen = new Map<number, number[]>();
    const stop = Array.from({ length: COUNT }, (_, i) => {
      seen.set(i, []);
      return subscribeStageProgress(i, (value) => {
        if (value !== null) seen.get(i)?.push(value);
      });
    });

    publishTraverseProgress(holdMid(2), COUNT);

    // The centred world reads 0.5; the one before it has already left, the one
    // after has not begun.
    expect(seen.get(2)?.[0]).toBeCloseTo(0.5, 12);
    expect(seen.get(1)?.[0]).toBeCloseTo(1, 12);
    expect(seen.get(3)?.[0]).toBeCloseTo(0, 12);
    for (const unsubscribe of stop) unsubscribe();
  });

  it('stops calling a listener once it unsubscribes', () => {
    const calls: number[] = [];
    const stop = subscribeStageProgress(0, (value) => {
      if (value !== null) calls.push(value);
    });
    publishTraverseProgress(0.5, COUNT);
    expect(calls).toHaveLength(1);
    stop();
    publishTraverseProgress(0.9, COUNT);
    expect(calls).toHaveLength(1);
  });

  it('drops the index entirely when its last listener leaves', () => {
    // A leak here would keep every torn-down stage's closure alive for the
    // life of the page, which is the failure mode a registry invites.
    const before = stageProgressSubscriberCount();
    const a = subscribeStageProgress(3, () => {});
    const b = subscribeStageProgress(3, () => {});
    expect(stageProgressSubscriberCount()).toBe(before + 1);
    a();
    expect(stageProgressSubscriberCount()).toBe(before + 1);
    b();
    expect(stageProgressSubscriberCount()).toBe(before);
  });

  it('tells every listener when the traverse stands down', () => {
    // `null` is what makes a stage return to its resting picture rather than
    // stay frozen at whatever value the timeline was torn down on.
    let last: number | null = 0.25;
    const stop = subscribeStageProgress(1, (value) => {
      last = value;
    });
    publishTraverseProgress(holdMid(1), COUNT);
    expect(last).toBeCloseTo(0.5, 12);
    resetTraverseProgress();
    expect(last).toBeNull();
    stop();
  });

  it('publishes nothing when nobody is listening', () => {
    // The island calls this on every scroll tick of the pin. With the stack
    // composition rendered there is no subscriber, and it must cost nothing.
    expect(stageProgressSubscriberCount()).toBe(0);
    expect(() => publishTraverseProgress(0.5, COUNT)).not.toThrow();
  });
});

describe('traverseIndexOf', () => {
  it('finds each domain at its place in the sequence', () => {
    traverseIds().forEach((id, index) => {
      expect(traverseIndexOf(id)).toBe(index);
    });
  });

  it('answers -1 for a domain that is not in the traverse', () => {
    // `StageFrame` uses this to decide whether to subscribe at all, so a wrong
    // answer here is a stage silently reading another world's progress.
    expect(traverseIndexOf('not-a-domain')).toBe(-1);
  });
});

describe('the traverse sequence', () => {
  it('is the DOMAINS order, not a copy of it', () => {
    expect(traverseIds()).toEqual(DOMAINS.map((domain) => domain.id));
    expect(TRAVERSE_LENGTH).toBe(DOMAINS.length);
  });

  /**
   * The assertion above passes just as happily against a hardcoded literal
   * that currently agrees with `DOMAINS`. This one does not: the config module
   * is replaced with a different, shorter set of domains, and the traverse is
   * re-imported. If the sequence were restated anywhere in `traverse.ts`, the
   * module would keep answering the five real domains and this fails.
   */
  it('follows the config module when the config module changes', async () => {
    vi.resetModules();
    vi.doMock('../src/config/domains', () => ({
      DOMAIN_IDS: ['alpha', 'beta', 'gamma'],
      DOMAINS: [
        { id: 'alpha', layerIndex: 0, accentVar: '--color-domain-alpha', stage: 'landscape' },
        { id: 'beta', layerIndex: 1, accentVar: '--color-domain-beta', stage: 'waveform' },
        { id: 'gamma', layerIndex: 2, accentVar: '--color-domain-gamma', stage: 'routing' },
      ],
      isDomainId: () => true,
      getDomain: () => undefined,
      domainOrdinal: () => '00',
    }));

    const reloaded = await import('../src/components/visuals/worlds/traverse');

    expect(reloaded.traverseIds()).toEqual(['alpha', 'beta', 'gamma']);
    expect(reloaded.TRAVERSE_LENGTH).toBe(3);
    // And the arithmetic follows it: full progress lands on the third domain.
    expect(reloaded.activeIndexFromProgress(1, reloaded.TRAVERSE_LENGTH)).toBe(2);
    expect(reloaded.activeIndexFromProgress(0.5, reloaded.TRAVERSE_LENGTH)).toBe(1);
  });
});

afterEach(() => {
  vi.doUnmock('../src/config/domains');
  vi.resetModules();
});

/* ===========================================================================
   Stage geometry
   ======================================================================== */

describe('createRandom', () => {
  it('produces the same stream for the same seed', () => {
    const a = createRandom(20260826);
    const b = createRandom(20260826);
    expect(Array.from({ length: 8 }, a)).toEqual(Array.from({ length: 8 }, b));
  });

  it('produces a different stream for a different seed', () => {
    const a = createRandom(1);
    const b = createRandom(2);
    expect(Array.from({ length: 8 }, a)).not.toEqual(Array.from({ length: 8 }, b));
  });

  it('stays inside [0, 1)', () => {
    const next = createRandom(7);
    for (let i = 0; i < 200; i += 1) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('does not lock up on a zero seed', () => {
    // State 0 is the LCG's fixed point for the multiply, so seeding with 0 —
    // or with anything that truncates to it — has to be substituted, or the
    // stream would be a constant and every "organic" layout a straight line.
    const zero = Array.from({ length: 6 }, createRandom(0));
    const fraction = Array.from({ length: 6 }, createRandom(0.4));
    expect(new Set(zero).size).toBe(zero.length);
    expect(fraction).toEqual(zero);
  });
});

/**
 * Two numbers in this island live in both TypeScript and CSS, because a
 * keyframe cannot import a module and handing one a value would mean an inline
 * custom property, which the site's CSP drops. Both are asserted against the
 * stylesheet's own source, so a change on either side fails here rather than
 * quietly clocking a pulse at the wrong rate or wiping the wrong distance.
 */
describe('the constants duplicated into the stylesheet', () => {
  const stylesheet = readFileSync(new URL('../src/components/home/TechnicalWorlds.astro', import.meta.url), 'utf8');

  it('steps the FPGA pulse once per cell on the route', () => {
    expect(ROUTE_CELLS.length).toBeGreaterThan(0);
    for (const route of ROUTE_CELLS) expect(route.length).toBe(ROUTE_STEPS);
    expect(stylesheet).toContain(`steps(${ROUTE_STEPS}, end)`);
  });

  it('wipes the audio sweep across exactly the frame', () => {
    expect(stylesheet).toContain(`clip-path: inset(-20px ${STAGE_WIDTH}px -20px 0);`);
  });

  /**
   * The repair this guards. `.tw-wave` is the only stroked path on the band
   * under a group the scroll *scales*, and it carries
   * `vector-effect: non-scaling-stroke` so the hairline survives that scale.
   * With both, the dash pattern and `pathLength`'s normalisation are measured
   * in different spaces, and `tw-draw`'s finished `stroke-dasharray: 100 100` —
   * a solid stroke on every other path here — left a third to a half of the
   * waveform unpainted at rest. It shipped that way. The arrival is a clip
   * wipe now, and the wave must never be dashed or normalised again.
   */
  it('never dashes the waveform, whose stroke lives in a scaled space', () => {
    const source = readFileSync(
      new URL('../src/components/visuals/worlds/stages/WaveformStage.tsx', import.meta.url),
      'utf8',
    );
    expect(source).not.toMatch(/className="tw-wave"[^>]*pathLength/);
    expect(source).not.toMatch(/strokeDasharray/);
    const rules = stylesheet.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const match of rules.matchAll(/([^{}]*\.tw-wave\b[^{}]*)\{([^{}]*)\}/g)) {
      expect(match[2]).not.toMatch(/stroke-dash/);
      expect(match[2]).not.toMatch(/animation:\s*tw-draw/);
    }
  });
});

describe('wavePath', () => {
  it('starts at the vertical centre and stays inside the box', () => {
    const path = wavePath(320, 100, 4, 200);
    const coordinates = path
      .slice(1)
      .split(/[ML]/)
      .filter(Boolean)
      .map((pair) => pair.trim().split(' ').map(Number));

    const firstPoint = coordinates[0];
    expect(firstPoint?.[0]).toBeCloseTo(0, 6);
    expect(firstPoint?.[1]).toBeCloseTo(50, 6);

    for (const [x, y] of coordinates) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(320);
      expect(y).toBeGreaterThanOrEqual(-0.01);
      expect(y).toBeLessThanOrEqual(100.01);
    }
  });

  it('tiles seamlessly: the last sample repeats the first', () => {
    // The audio stage draws two copies side by side and translates by exactly
    // one tile. A wave whose ends do not meet would visibly snap each loop.
    const path = wavePath(320, 100, 8, 321);
    const points = path.slice(1).split(/[ML]/).filter(Boolean);
    const first = points[0]?.trim().split(' ')[1];
    const last = points[points.length - 1]?.trim().split(' ')[1];
    expect(Number(last)).toBeCloseTo(Number(first), 2);
  });

  it('is deterministic', () => {
    expect(wavePath(320, 100, 8, 64, [1, 0.3])).toBe(wavePath(320, 100, 8, 64, [1, 0.3]));
  });

  it('draws a flat line rather than dividing by zero for weightless harmonics', () => {
    const path = wavePath(320, 100, 4, 5, [0, 0]);
    for (const pair of path.slice(1).split(/[ML]/).filter(Boolean)) {
      expect(Number(pair.trim().split(' ')[1])).toBeCloseTo(50, 6);
    }
  });
});

describe('clockPath', () => {
  /**
   * The property the FPGA timing strip is built on. Its accent marker walks the
   * wave with `steps(6)` over a `pathLength="100"` normalisation, so it lands on
   * one whole clock period per step **only if every period has the same arc
   * length**. If a period ever differed, the marker would drift across the
   * edges it is supposed to be marking and the link between the pulse crossing
   * the fabric and the clock below it would quietly stop being true.
   */
  const periodLengths = (path: string, periods: number) => {
    const points = [...path.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
    const perPeriod = (points.length - 1) / periods;
    const lengths: number[] = [];
    for (let p = 0; p < periods; p += 1) {
      let total = 0;
      for (let i = p * perPeriod; i < (p + 1) * perPeriod; i += 1) {
        const a = points[i];
        const b = points[i + 1];
        if (!a || !b) continue;
        total += Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
      }
      lengths.push(total);
    }
    return lengths;
  };

  it('gives every period an identical arc length', () => {
    const lengths = periodLengths(clockPath(40, 100, 240, 14, ROUTE_STEPS), ROUTE_STEPS);
    expect(lengths).toHaveLength(ROUTE_STEPS);
    for (const length of lengths) expect(length).toBeCloseTo(lengths[0] ?? 0, 9);
  });

  it('starts low on a rising edge and ends low, so the wave tiles cleanly', () => {
    const path = clockPath(0, 10, 120, 14, 6);
    expect(path.startsWith('M0.00 24.00')).toBe(true);
    expect(path.endsWith('120.00 24.00')).toBe(true);
  });

  it('spans exactly the width it is given, in right angles only', () => {
    const path = clockPath(46, 144, 232, 14, ROUTE_STEPS);
    const points = [...path.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
    expect(Math.min(...points.map((p) => p[0]))).toBeCloseTo(46, 6);
    expect(Math.max(...points.map((p) => p[0]))).toBeCloseTo(278, 6);
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      if (!a || !b) continue;
      // Every segment moves along exactly one axis: a clock has no ramps.
      expect(a[0] === b[0] || a[1] === b[1]).toBe(true);
    }
  });

  it('answers a single period rather than dividing by zero', () => {
    expect(clockPath(0, 0, 60, 10, 0)).toContain('M0.00 10.00');
    expect(clockPath(0, 0, 60, 10, 0)).not.toMatch(/NaN/);
  });
});

describe('manhattanPath', () => {
  it('turns waypoints into right angles only', () => {
    const path = manhattanPath([
      { x: 0, y: 0 },
      { x: 10, y: 5 },
    ]);
    // Vertical first, then horizontal — never a diagonal, which no router draws.
    expect(path).toBe('M0.00 0.00 L0.00 5.00 L10.00 5.00');
  });

  it('emits nothing for no waypoints', () => {
    expect(manhattanPath([])).toBe('');
  });

  it('skips a segment when an axis does not change', () => {
    expect(
      manhattanPath([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ]),
    ).toBe('M0.00 0.00 L10.00 0.00');
  });
});

describe('manhattanLength', () => {
  it('measures the routed length, not the straight-line distance', () => {
    // 3-4-5 triangle: the crow flies 5, the router walks 7.
    expect(
      manhattanLength([
        { x: 0, y: 0 },
        { x: 3, y: 4 },
      ]),
    ).toBe(7);
  });

  it('is zero for fewer than two waypoints', () => {
    expect(manhattanLength([])).toBe(0);
    expect(manhattanLength([{ x: 4, y: 9 }])).toBe(0);
  });
});

/* ===========================================================================
   The progressive-enhancement guarantee

   MOTION_SYSTEM §3 and ARCHITECTURE §5 both rest on one claim: the five
   domains are real DOM in document order, and the traverse moves them rather
   than creating them. With JavaScript off, all five must be readable.

   That claim is worth exactly as much as it is testable, so it is tested. The
   island is rendered the way Astro renders it at build time — no browser, no
   effects, no hydration — and the resulting markup is inspected.
   ======================================================================== */

describe('server-rendered markup', () => {
  const render = async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { en } = await import('../src/i18n/en');
    const { default: TechnicalWorlds } = await import('../src/components/visuals/worlds/TechnicalWorlds');
    return { html: renderToStaticMarkup(createElement(TechnicalWorlds, { t: en })), en };
  };

  it('contains every domain name and summary before any JavaScript runs', async () => {
    const { html, en } = await render();
    for (const domain of DOMAINS) {
      const item = en.worlds.items[domain.id];
      // `&` is HTML-escaped in the output, so compare against escaped text.
      expect(html).toContain(item.name.replace(/&/g, '&amp;'));
      expect(html).toContain(item.summary.replace(/&/g, '&amp;'));
    }
  });

  it('keeps the domains in DOMAINS order in the document', async () => {
    const { html, en } = await render();
    const positions = DOMAINS.map((domain) => html.indexOf(en.worlds.items[domain.id].name.replace(/&/g, '&amp;')));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('opens at h2 and gives each domain an h3', async () => {
    const { html } = await render();
    expect(html.match(/<h1/g)).toBeNull();
    expect(html.match(/<h2/g)).toHaveLength(1);
    expect(html.match(/<h3/g)).toHaveLength(DOMAINS.length);
  });

  it('renders every stage, with none of them animating', async () => {
    const { html } = await render();
    for (const domain of DOMAINS) {
      expect(html).toContain(`data-stage="${domain.stage}"`);
    }
    // Five inert stages and not one active: the server has no viewport to be
    // in and no pointer, so nothing may claim the frame.
    expect(html.match(/data-active="false"/g)).toHaveLength(DOMAINS.length);
    expect(html).not.toContain('data-active="true"');
  });

  it('ships the stack, not the traverse', async () => {
    const { html } = await render();
    // Both are added by effects after mount. Their presence in the static
    // markup would mean the horizontal layout renders before GSAP exists.
    expect(html).not.toContain('data-traverse');
    expect(html).not.toContain('tabindex');
  });

  it('hides every decorative visual from assistive technology', async () => {
    const { html } = await render();
    const svgTags = html.match(/<svg[^>]*>/g) ?? [];
    expect(svgTags).toHaveLength(DOMAINS.length);
    expect(svgTags.every((tag) => tag.includes('aria-hidden="true"'))).toBe(true);
  });

  it('carries the localized keyboard hint and a polite live region', async () => {
    const { html, en } = await render();
    expect(html).toContain(en.a11y.worldsInstructions);
    expect(html).toContain('aria-live="polite"');
  });

  it('renders the band contents, not its own <section>', async () => {
    const { html } = await render();
    // `ui/Section.astro` owns the `<section id="worlds">`, the `02 / TECHNICAL
    // WORLDS` annotation and the `.tw on-ink` classes. A `<section>` here would
    // nest two of them and produce a second, unnumbered landmark.
    expect(html.startsWith('<div class="tw-band"')).toBe(true);
    expect(html).not.toContain('<section');
  });

  it('renders no figure annotation of its own', async () => {
    const { html, en } = await render();
    // The `02` and the localized margin word are `Section`'s job now. A copy
    // here would be a second number able to drift from `SECTION_IDS`.
    expect(html).not.toContain('tw-header__eyebrow');
    expect(html).not.toContain(en.sections.worlds);
  });

  it('gives the hero the anchor id it links to, for every domain', async () => {
    const { html } = await render();
    // The hero renders keyboard-reachable links to `#world-<domain id>`. If
    // these ids drift, those links dead-end silently.
    for (const domain of DOMAINS) {
      expect(html).toContain(`id="world-${domain.id}"`);
    }
  });

  it('carries the attribute that stops the hero canvas, server-rendered', async () => {
    const { html } = await render();
    // The hero's signal-field module observes this attribute and stops its loop
    // while the band is on screen — MOTION_SYSTEM §4's one-expensive-visual-at-
    // a-time rule. It has to be in the *static* markup: this island hydrates on
    // `client:media`, so on a phone, a short window or with reduced motion it
    // never hydrates at all — an attribute added at hydration time would
    // simply not exist for those visitors. Without it the canvas keeps running
    // behind this band and nothing in either module would report the problem.
    expect(html).toContain('data-stops-hero-visual');
  });

  it('writes no inline style attribute anywhere', async () => {
    const { html } = await render();
    // `astro.config.mjs` enables a hash-based CSP with no `'unsafe-inline'`,
    // and Astro emits no `style-src-attr`, so `style-src` governs style
    // attributes too — with no `'unsafe-hashes'`, every inline `style=""` is
    // dropped by the browser. A single one here would mean an accent, a
    // stagger or a dash pattern that works in `astro dev` and silently does
    // not in production. Hence: none.
    expect(html).not.toMatch(/\sstyle="/);
  });

  it('injects no script or style element', async () => {
    const { html } = await render();
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<style');
  });
});

describe('the band wrapper', () => {
  const readWrapper = async () => {
    const { readFile } = await import('node:fs/promises');
    return readFile(new URL('../src/components/home/TechnicalWorlds.astro', import.meta.url), 'utf8');
  };

  it('takes its place in the sequence from Section, not from a literal', async () => {
    const wrapper = await readWrapper();
    // `section=` and `label=` are what make the figure number
    // `SECTION_IDS.indexOf('worlds')` and the margin word `t.sections.worlds`.
    // The band previously hand-rolled a `02` eyebrow: correct on the day it was
    // written, and silently stale the moment `SECTION_IDS` was reordered.
    expect(wrapper).toContain('section={SECTION}');
    expect(wrapper).toContain('label={t.sections[SECTION]}');
    // No two-digit figure literal anywhere in the markup.
    const markup = wrapper.slice(wrapper.indexOf('<Section'), wrapper.indexOf('</Section>'));
    expect(markup).not.toMatch(/>\s*0\d\s*</);
  });

  it('applies the ink inversion through Section', async () => {
    const wrapper = await readWrapper();
    // `.on-ink` re-points --focus-ring to --color-phosphor. Without it the ring
    // is ultramarine at 2.36:1 on this ground, and `.tw` carries the band's
    // layout — including the class the island's `closest('.tw')` pins.
    expect(wrapper).toContain('class="tw on-ink"');
  });

  it("points Section at the island's own heading", async () => {
    const wrapper = await readWrapper();
    expect(wrapper).toContain('labelledBy="tw-heading"');
  });

  /* ── The hydration gate (docs/REDESIGN_DECISIONS.md #11) ─────────────────
     `client:visible` hydrated this island for everyone who scrolled to it,
     including the viewports whose first act after hydrating is to decide not
     to build the timeline. Measured: 67.2 KB gz of React and island code to
     re-render markup already present in the HTML. */

  /** The `<Section>…</Section>` block only — the prose above it discusses the
      directive this band no longer uses, and the stylesheet below it has its
      own legitimate `min-width` breakpoints. */
  const readMarkup = async () => {
    const wrapper = await readWrapper();
    return wrapper.slice(wrapper.indexOf('<Section'), wrapper.indexOf('</Section>'));
  };

  it('downloads the island only on viewports that can run the traverse', async () => {
    const markup = await readMarkup();
    expect(markup).toContain('client:media={HYDRATION_QUERY}');
    // Not `client:visible`, and not `client:load`: either one puts React on
    // the phone path for a section a phone renders from HTML alone.
    expect(markup).not.toContain('client:visible');
    expect(markup).not.toContain('client:load');
    expect(markup).not.toContain('client:idle');
  });

  it('imports the gate rather than restating the query', async () => {
    const wrapper = await readWrapper();
    const frontmatter = wrapper.slice(0, wrapper.indexOf('\n---', 3));
    // A second copy of the breakpoint here could drift from the one the island
    // gates its timeline on, and the symptom would be a viewport that
    // downloads 60 KB and never pins — silently, and only in production.
    expect(frontmatter).toContain("import { HYDRATION_QUERY } from '../visuals/worlds/useMediaQuery'");
    expect(frontmatter.replace(/\/\*[\s\S]*?\*\//g, '')).not.toContain('min-width');
  });
});

describe('the hydration query', () => {
  it("is the island's own traverse breakpoint, widened by nothing", () => {
    expect(HYDRATION_QUERY.startsWith(TRAVERSE_QUERY)).toBe(true);
  });

  it('excludes reduced-motion visitors too', () => {
    // `client:media` takes any media query, so the motion preference belongs
    // in it — the island would refuse to build the timeline for these users
    // anyway, and this is what stops them paying for the refusal.
    expect(HYDRATION_QUERY).toContain('prefers-reduced-motion');
    // `no-preference` rather than the MQ4 `not (… : reduce)` form: an
    // unparsed query never matches, and the browsers that cannot parse MQ4
    // booleans would silently lose the traverse.
    expect(HYDRATION_QUERY).toContain('(prefers-reduced-motion: no-preference)');
    expect(HYDRATION_QUERY).not.toContain('not (');
  });

  it('is a single conjunction, so any clause failing keeps the stack', () => {
    const clauses = HYDRATION_QUERY.split(' and ');
    expect(clauses).toHaveLength(3);
    for (const clause of clauses) expect(clause.startsWith('(')).toBe(true);
    expect(HYDRATION_QUERY).not.toContain(',');
  });

  it('leaves the runtime gates alone', () => {
    // Two independent decisions: this one is what gets fetched, those are what
    // gets built. Neither may become the other's proxy.
    expect(REDUCED_MOTION_QUERY).toBe('(prefers-reduced-motion: reduce)');
    expect(TRAVERSE_QUERY).toContain('min-width');
    expect(TRAVERSE_QUERY).toContain('min-height');
  });
});

describe('the band stylesheet', () => {
  const readStylesheet = async () => {
    const { readFile } = await import('node:fs/promises');
    return readFile(new URL('../src/components/home/TechnicalWorlds.astro', import.meta.url), 'utf8');
  };

  it('resolves an accent for every domain', async () => {
    const css = await readStylesheet();
    // CSS cannot build `--color-domain-${id}` from the `data-domain` value, so
    // the mapping is written out. This is the guard that a sixth domain does
    // not silently render as a grey stage.
    for (const domain of DOMAINS) {
      expect(css).toContain(`.tw [data-domain='${domain.id}']`);
      expect(css).toContain(`--tw-accent: var(${domain.accentVar});`);
    }
  });

  /**
   * Every rule that starts an animation must be gated on
   * `[data-active='true']`, or an inactive stage keeps animating and
   * MOTION_SYSTEM §4's one-stage-at-a-time rule becomes a comment rather than
   * a fact. This walks the declaration blocks rather than pattern-matching
   * lines, so a rule spread over several lines cannot slip past it.
   */
  const animationRules = (css: string) => {
    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
    // Drop @keyframes bodies: their nested braces are not rules, and their
    // percentage stops never start an animation.
    const withoutKeyframes = withoutComments.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
    const rules: { selector: string; body: string }[] = [];
    for (const match of withoutKeyframes.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = (match[1] ?? '').trim();
      const body = match[2] ?? '';
      // Only rules that *start* an animation. `animation: none` is the
      // reduced-motion block switching them off — the opposite concern, and it
      // must not be required to carry the active gate. Declarations are split
      // rather than pattern-matched: a lookahead for `none` backtracks over
      // the whitespace and matches anyway.
      const startsAnimation = body.split(';').some((declaration) => {
        const separator = declaration.indexOf(':');
        if (separator < 0) return false;
        const property = declaration.slice(0, separator).trim();
        if (property !== 'animation' && property !== 'animation-name') return false;
        return !declaration
          .slice(separator + 1)
          .trim()
          .startsWith('none');
      });
      if (startsAnimation) rules.push({ selector, body });
    }
    return rules;
  };

  it('starts an animation only under an active stage', async () => {
    const css = await readStylesheet();
    const rules = animationRules(css);

    // Guard against the parser silently matching nothing, which would make
    // every assertion below vacuous.
    expect(rules.length).toBeGreaterThanOrEqual(4);

    for (const { selector } of rules) {
      // The two pulse paths are the one exception: the island renders them
      // only while the stage is active, so they cannot exist on an inactive
      // one at all — there is no resting element for the rule to reach.
      const isPulse = selector.includes('.tw-route-pulse') || selector.includes('.tw-trace-pulse');
      expect(isPulse || selector.includes("[data-active='true']")).toBe(true);
    }
  });

  it('gates the traverse layout on the attribute the island sets after GSAP loads', async () => {
    const css = await readStylesheet();
    // If the horizontal layout applied without `data-traverse`, a failed GSAP
    // import would leave an unpinned, un-scrollable strip showing one domain.
    expect(css).toContain(".tw[data-traverse='true'] .tw-track");
    expect(css).toContain('height: 100svh');
    // The stacked track must not depend on that attribute to be readable.
    expect(css).toMatch(/\.tw-track\s*\{[^}]*display:\s*grid/);
  });

  /* ── The spacers (docs/REDESIGN_DECISIONS.md #15, plus the centring fix) ──
     Five panels pitched 86% apart travel 430% − 100% = 330% across four steps,
     which is 82.5% per step against an 86% pitch. The 3.5% shortfall
     accumulates and leaves the outgoing panel standing inside the frame at
     every stop — measured slivers of 46, 102, 157 and 213px at 1440×900, each
     showing the clipped tail of the previous stage's annotation. 14% of spacer
     makes the travel a whole number of pitches and removes that.

     *Where* that 14% sits then decides whether anything is ever centred. All of
     it behind the last panel put panel 0's centre half a peek right of the
     frame's centre at zero translation — measured closest approach 94.6px, and
     the last world settled 94px past centre for the same reason. Split into
     two halves, stop `i` is centred at exactly −`i` × pitch. */

  it('opens and closes the track with a spacer of half a peek each', async () => {
    const css = await readStylesheet();
    // Both, and equal. One alone is the defect: the same total width, all of it
    // on one side, offsets every panel by half a peek.
    expect(css).toMatch(
      /\.tw\[data-traverse='true'\] \.tw-track::before,\s*\n\s*\.tw\[data-traverse='true'\] \.tw-track::after\s*\{[^}]*content:\s*''/,
    );
    expect(css).toContain('flex: 0 0 var(--tw-peek);');
    expect(css).toContain('--tw-peek: calc((100% - var(--tw-panel-pitch)) / 2);');
    // The pair still adds up to one whole peek, which is what keeps the travel
    // a whole number of pitches.
    expect(css).not.toMatch(/\.tw-track::(before|after)[^}]*flex:\s*0 0 calc\(100% - var\(--tw-panel-pitch\)\)/);
  });

  it('derives the panel width, the spacers and the mask from one number', async () => {
    const css = await readStylesheet();
    // The bug was two rules that were allowed to disagree. A literal `86%` on
    // the panel would let them disagree again.
    expect(css).toContain('--tw-panel-pitch: 86%;');
    expect(css).toContain('flex: 0 0 var(--tw-panel-pitch);');
    const panelRule = css.slice(css.indexOf(".tw[data-traverse='true'] .tw-panel {"));
    expect(panelRule.slice(0, panelRule.indexOf('}'))).not.toMatch(/flex:[^;]*\d+%/);
  });

  it('generates the spacers only while the traverse is engaged', async () => {
    const css = await readStylesheet();
    // Stacked, `.tw-track` is a grid: unconditional pseudo-elements would add
    // empty rows and row-gaps around the domains.
    for (const pseudo of ['.tw-track::before', '.tw-track::after']) {
      const spacer = css.indexOf(pseudo);
      expect(spacer).toBeGreaterThan(0);
      expect(css.slice(0, spacer)).toMatch(/\.tw\[data-traverse='true'\] $/);
    }
  });

  /* ── The edge mask ──────────────────────────────────────────────────────
     Measured on the deployed build: for 83% of the pinned scroll some
     neighbouring heading or paragraph was crossing the frame's clip boundary
     and being chopped mid-word, with nothing to say it was a frame edge. */

  /** The pinned viewport's own declaration block. No nested braces in it. */
  const traverseViewportRule = (css: string) =>
    /\.tw\[data-traverse='true'\] \.tw-viewport \{([^}]*)\}/.exec(css)?.[1] ?? '';

  it('fades the frame’s edges instead of chopping them', async () => {
    const css = await readStylesheet();
    const body = traverseViewportRule(css);
    expect(body).toContain('overflow: hidden');
    // Both spellings: without the prefixed one, WebKit renders no mask at all
    // and the defect is back for a large share of the traffic.
    expect(body).toMatch(/(?<!-webkit-)mask-image: linear-gradient\(/);
    expect(body).toContain('-webkit-mask-image: linear-gradient(');
  });

  it('keeps the fade clear of the centred panel’s own text', async () => {
    const css = await readStylesheet();
    // The active panel starts one whole peek in from each edge. A fade derived
    // from a fraction of that peek can never reach it — which is the property
    // that makes this a fix rather than a different way of losing words. A
    // literal here could exceed the peek on a narrow window and wash out the
    // heading of the world the band is supposed to be showing.
    expect(traverseViewportRule(css)).toMatch(/--tw-fade:\s*min\(64px, calc\(var\(--tw-peek\) \* 0\.68\)\)/);
  });

  it('applies the mask only while the traverse is engaged', async () => {
    const css = await readStylesheet();
    // Stacked there is no horizontal clip, so a mask would fade the left and
    // right edges of readable prose for no reason at all. Every mask
    // declaration in the file must therefore be inside the pinned rule.
    const total = (css.match(/mask-image:/g) ?? []).length;
    const pinned = (traverseViewportRule(css).match(/mask-image:/g) ?? []).length;
    expect(pinned).toBe(2);
    expect(total).toBe(pinned);
  });

  /* ── The ambient clock ──────────────────────────────────────────────────
     Every ambient animation used to sit behind `--tw-settle: 800ms`, and the
     ones with long periods needed another 3–7.5s after that before their
     meaningful phase arrived — routinely longer than a world stayed on screen,
     so the settled state was described and never shown. */

  it('starts ambient before the arrival has finished', async () => {
    const css = await readStylesheet();
    const settle = /--tw-settle:\s*(\d+)ms/.exec(css);
    const lag = /--tw-arrive-lag:\s*(\d+)ms/.exec(css);
    expect(settle).not.toBeNull();
    expect(lag).not.toBeNull();
    const settleMs = Number(settle?.[1]);
    const lagMs = Number(lag?.[1]);
    // `--tw-arrive` is `--duration-deliberate`, 720ms, so the arrival ends at
    // lag + 720. Ambient has to be running by then, not starting after it.
    expect(settleMs).toBeLessThan(lagMs + 720);
    // And still a whole number of FPGA clock ticks, which is what keeps the
    // fabric's register blink in phase with its own 0.4s clock.
    expect(settleMs % 400).toBe(0);
  });

  it('arrives mid-cycle rather than at keyframe 0', async () => {
    const css = await readStylesheet();
    // A commit removed every negative `animation-delay` on this band except the
    // ripple's, and the ripple is the one stage that still read as continuous.
    // These are the groups that got theirs back — counted in both the forms
    // they take, a literal negative and an offset from the chain's own negative
    // phase, so moving one group between the two cannot quietly reduce the
    // count.
    //
    // Quantum is deliberately not in this population any more. Its ambient loop
    // was the interference ripple, and the Bloch sphere that replaced it has no
    // loop at all: its motion is the reader's own scroll, so there is no cycle
    // for it to start part-way through. Seven is the whole of what is left, and
    // every one of the seven is real.
    const literal = css.match(/animation-delay:\s*-\d/g) ?? [];
    const phased = css.match(/animation-delay:\s*calc\(var\(--tw-chain-phase\)/g) ?? [];
    expect(literal.length + phased.length).toBeGreaterThanOrEqual(7);
    expect(css).toContain('--tw-chain-phase: -0.9s;');
  });

  it('completes an ambient cycle inside a world’s dwell', async () => {
    const css = await readStylesheet();
    // 7.5s for the travelling wave was longer than a whole world's ownership
    // window. Nothing ambient on this band may run slower than the chain's
    // own period by more than half again.
    //
    // The floor is a guard against the regex matching nothing and passing
    // vacuously, not a target. It moved 6 -> 5 when the forecast stage was
    // replaced: the forecast ran two ambient keyframes (`tw-fc-roll` and
    // `tw-fc-resolve`), the decision landscape that replaced it runs one
    // (`tw-dl-scan`). Five is the whole remaining population, listed here so
    // the next person to see this number knows what it is counting:
    // tw-energise, tw-dl-scan, tw-wave-travel, tw-pulse-travel, tw-clock-tick.
    const periods = [...css.matchAll(/animation:\s*tw-[a-z-]+\s+([\d.]+)s/g)].map((m) => Number(m[1]));
    expect(periods.length).toBeGreaterThanOrEqual(5);
    for (const period of periods) expect(period).toBeLessThanOrEqual(3.6);
  });
});
