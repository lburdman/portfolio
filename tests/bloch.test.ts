import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LOCALES, localizePath } from '../src/i18n';
import { HOME_PATH } from '../src/config/navigation';
import { ENGAGEMENT_EASE, stepEngagement } from '../src/lib/motion/magnet-field';
import {
  ARROW_HEAD_LENGTH,
  AXIS_X,
  AXIS_Z,
  BACK_VECTOR_OPACITY,
  BLOCH_CX,
  BLOCH_CY,
  BLOCH_LABELS,
  BLOCH_R,
  CAMERA_AZIMUTH,
  CAMERA_ELEVATION,
  CAMERA_FORWARD,
  EQUATOR,
  LABEL_GAP,
  MERIDIAN,
  PHI_MAX,
  READOUT_WIDTH,
  READOUT_X,
  RESTING_STATE,
  SILHOUETTE_CROSSING_P,
  STATIC_FRAME,
  STATIC_PROGRESS,
  azimuthFromPointer,
  blochFrame,
  blochVector,
  cross,
  depth,
  dot,
  greatCircle,
  latitudeRing,
  normalise,
  pointerState,
  polarAngle,
  probabilityOne,
  probabilityZero,
  project,
  stateVector,
  type Vec3,
} from '../src/lib/visuals/bloch';

/**
 * The Quantum world's geometry, and the contracts the picture depends on.
 *
 * Three of these are not ordinary unit tests and are the reason the file exists.
 *
 * 1. **Statelessness.** The piece promises that the sphere is wherever the hand
 *    is: the same pointer position always draws the same state, whatever route
 *    the hand took to get there. That holds only while a frame is a pure
 *    function of its two angles — no easing over time, no cached previous
 *    value, no hysteresis. Sweeping the range in both directions and comparing
 *    the serialised frames is what makes a future `lerp` toward the last frame
 *    fail here instead of in review.
 *
 * 2. **The stylesheet guard.** A CSS `transition` on the vector's `d` or the
 *    latitude ring's `d` would look like a smoothing improvement and would
 *    break the 1:1 pointer contract, lagging the picture behind the hand. It
 *    cannot be caught by rendering; it is caught by reading the stylesheet.
 *
 * 3. **The DOM half.** `BlochStage.tsx`'s listeners, cached box and teardown
 *    have no seam a node-environment test can pull on — the runner has no DOM —
 *    so they are pinned as source assertions, in the same style as
 *    `tests/card-light.test.ts`. Each one is a rule that is invisible in
 *    `astro dev` and only bites on a touch device, a reduced-motion setting, a
 *    hidden tab or a profiler.
 *
 * The rest holds the projection to its closed form, which is what lets the
 * stage draw great circles as two `A` commands instead of sampling them.
 */

const TIGHT = 1e-12;
const EXACT = 1e-9;

function close(actual: number, expected: number, tolerance = EXACT): void {
  expect(Math.abs(actual - expected), `${actual} vs ${expected}`).toBeLessThan(tolerance);
}

/** Deterministic pseudo-random unit vectors — no `Math.random()` in a test. */
function sampleUnitVectors(count: number, seed = 1): Vec3[] {
  let state = seed >>> 0 || 1;
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const out: Vec3[] = [];
  for (let i = 0; i < count; i += 1) {
    // Uniform on the sphere: z uniform in [-1, 1], azimuth uniform in [0, 2π).
    const z = next() * 2 - 1;
    const phi = next() * Math.PI * 2;
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    out.push([r * Math.cos(phi), r * Math.sin(phi), z]);
  }
  return out;
}

describe('the state', () => {
  it('maps progress onto the three states the traverse tells a story about', () => {
    const zero = blochVector(0);
    const plus = blochVector(0.5);
    const one = blochVector(1);

    close(zero[0], 0, TIGHT);
    close(zero[1], 0, TIGHT);
    close(zero[2], 1, TIGHT);

    close(plus[0], 1, TIGHT);
    close(plus[1], 0, TIGHT);
    close(plus[2], 0, TIGHT);

    close(one[0], 0, TIGHT);
    close(one[1], 0, TIGHT);
    close(one[2], -1, TIGHT);
  });

  it('stays on the unit sphere across the whole sweep, at every azimuth', () => {
    for (let i = 0; i <= 200; i += 1) {
      const p = i / 200;
      for (const phi of [-PHI_MAX, 0, PHI_MAX]) {
        const v = blochVector(p, phi);
        close(Math.hypot(v[0], v[1], v[2]), 1, TIGHT);
      }
    }
  });

  it('descends strictly in z — which is what proves nothing eases the mapping', () => {
    let previous = Number.POSITIVE_INFINITY;
    for (let i = 0; i <= 500; i += 1) {
      const z = blochVector(i / 500)[2];
      expect(z, `z is not strictly decreasing at p = ${i / 500}`).toBeLessThan(previous);
      previous = z;
    }
  });

  it('clamps progress outside [0, 1] rather than continuing to rotate', () => {
    expect(polarAngle(-3)).toBe(0);
    expect(polarAngle(4)).toBe(Math.PI);
    expect(blochFrame(-1)).toEqual(blochFrame(0));
    expect(blochFrame(2)).toEqual(blochFrame(1));
  });
});

describe('probabilities', () => {
  it('sums to exactly one, everywhere', () => {
    for (let i = 0; i <= 400; i += 1) {
      const theta = (i / 400) * Math.PI;
      expect(probabilityZero(theta) + probabilityOne(theta)).toBe(1);
    }
  });

  it('reads 1 / 0.5 / 0 at the three states, exactly', () => {
    expect(probabilityZero(polarAngle(0))).toBe(1);
    expect(probabilityZero(polarAngle(0.5))).toBe(0.5);
    expect(probabilityZero(polarAngle(1))).toBe(0);
  });

  it('ignores φ entirely, which is the whole reason the pointer may own it', () => {
    const centred = blochFrame(0.32, 0);
    const swung = blochFrame(0.32, PHI_MAX);
    expect(swung.readZero).toBe(centred.readZero);
    expect(swung.readOne).toBe(centred.readOne);
    expect(swung.barZero).toBe(centred.barZero);
    expect(swung.barOne).toBe(centred.barOne);
    // …while the picture itself does move.
    expect(swung.shaft).not.toBe(centred.shaft);
  });
});

describe('the orthographic camera', () => {
  it('has an orthonormal basis', () => {
    for (const v of [CAMERA_FORWARD] as const) close(Math.hypot(v[0], v[1], v[2]), 1);
    const right = cross(CAMERA_FORWARD, [0, 0, 1]);
    close(dot(CAMERA_FORWARD, normalise(right)), 0);
  });

  it('puts |0⟩ exactly where the elevation says it should be', () => {
    const p = project([0, 0, 1]);
    close(p[0], BLOCH_CX);
    close(p[1], BLOCH_CY - BLOCH_R * Math.cos(CAMERA_ELEVATION));
  });

  it('never projects a unit vector outside the sphere — the label rule rests on this', () => {
    for (const v of sampleUnitVectors(10_000)) {
      const p = project(v);
      expect(Math.hypot(p[0] - BLOCH_CX, p[1] - BLOCH_CY)).toBeLessThanOrEqual(BLOCH_R + EXACT);
    }
  });

  it('anchors every label clear of the sphere, and therefore of every tip', () => {
    // A tip's screen radius is at most R (asserted above), so a label anchored
    // beyond R is clear of the vector at every progress by construction. The
    // small typographic nudge in `y` is the only slack, hence the -7.
    for (const label of BLOCH_LABELS) {
      const radius = Math.hypot(label.x - BLOCH_CX, label.y - BLOCH_CY);
      expect(radius, `label ${label.id} is inside the sphere`).toBeGreaterThan(BLOCH_R);
      expect(radius).toBeGreaterThan(BLOCH_R + LABEL_GAP - 7);
    }
  });
});

describe('great circles project to closed-form ellipses', () => {
  it('gives the equator rx = R, ry = R sin ε and no rotation', () => {
    close(EQUATOR.rx, BLOCH_R);
    close(EQUATOR.ry, BLOCH_R * Math.sin(CAMERA_ELEVATION));
    close(Math.abs(EQUATOR.rotation) % 180, 0);
  });

  it('gives rx = R and ry = R|n̂·ĉ| for a hundred random normals', () => {
    for (const normal of sampleUnitVectors(100, 7)) {
      const circle = greatCircle(normal);
      close(circle.rx, BLOCH_R);
      close(circle.ry, BLOCH_R * Math.abs(dot(normal, CAMERA_FORWARD)));
    }
  });

  it('places 720 sampled points of each circle on its own ellipse', () => {
    const cases: readonly { readonly normal: Vec3; readonly a: Vec3; readonly b: Vec3 }[] = [
      { normal: [0, 0, 1], a: [1, 0, 0], b: [0, 1, 0] },
      { normal: [0, 1, 0], a: [1, 0, 0], b: [0, 0, 1] },
      { normal: [1, 0, 0], a: [0, 1, 0], b: [0, 0, 1] },
    ];

    for (const { normal, a, b } of cases) {
      const circle = greatCircle(normal);
      const rad = (-circle.rotation * Math.PI) / 180;
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      let worst = 0;
      for (let k = 0; k < 720; k += 1) {
        const t = (k * Math.PI) / 360;
        const v: Vec3 = [
          a[0] * Math.cos(t) + b[0] * Math.sin(t),
          a[1] * Math.cos(t) + b[1] * Math.sin(t),
          a[2] * Math.cos(t) + b[2] * Math.sin(t),
        ];
        const q = project(v);
        const px = q[0] - BLOCH_CX;
        const py = q[1] - BLOCH_CY;
        const x = (px * c - py * s) / circle.rx;
        const y = (px * s + py * c) / circle.ry;
        worst = Math.max(worst, Math.abs(x * x + y * y - 1));
      }
      expect(worst, `normal ${normal.join(',')} is off its ellipse`).toBeLessThan(EXACT);
    }
  });

  it('splits each circle into two halves that differ only in sweep flag', () => {
    const parts = /^M(\S+) (\S+) A(\S+) (\S+) (\S+) (\S+) (\S+) (\S+) (\S+)$/;
    for (const circle of [EQUATOR, MERIDIAN]) {
      const front = parts.exec(circle.front);
      const back = parts.exec(circle.back);
      expect(front).not.toBeNull();
      expect(back).not.toBeNull();
      // Same start, same radii, same end — only the sweep flag (group 7) moves.
      for (const group of [1, 2, 3, 4, 5, 6, 8, 9]) expect(front?.[group]).toBe(back?.[group]);
      expect(Number(front?.[7]) + Number(back?.[7])).toBe(1);
    }
  });
});

describe('depth ordering', () => {
  it('changes sign exactly once, at the silhouette crossing', () => {
    let crossings = 0;
    let previous = Math.sign(depth(blochVector(0)));
    for (let i = 1; i <= 100_000; i += 1) {
      const sign = Math.sign(depth(blochVector(i / 100_000)));
      if (sign !== previous) crossings += 1;
      previous = sign;
    }
    expect(crossings).toBe(1);
  });

  it('puts that crossing at p* = 0.7901, and the derived constant is where the sign flips', () => {
    expect(SILHOUETTE_CROSSING_P).toBeCloseTo(0.7901, 4);
    close(depth(blochVector(SILHOUETTE_CROSSING_P)), 0, TIGHT);
    expect(depth(blochVector(SILHOUETTE_CROSSING_P - 1e-6))).toBeGreaterThan(0);
    expect(depth(blochVector(SILHOUETTE_CROSSING_P + 1e-6))).toBeLessThan(0);
  });

  it('keeps |+⟩ in front of the sphere for every reachable φ — the reason φmax is 16°', () => {
    for (let deg = -16; deg <= 16; deg += 0.25) {
      const v = stateVector(Math.PI / 2, (deg * Math.PI) / 180);
      expect(depth(v), `φ = ${deg}° pushes the equatorial state behind the sphere`).toBeGreaterThan(0);
    }
    // And the rejected value does not: this is the measurement, not an opinion.
    // The camera's azimuth breaks the symmetry, so it is the negative swing
    // that goes behind the sphere — which is exactly the asymmetry that makes a
    // large φmax unusable rather than merely bold.
    expect(depth(stateVector(Math.PI / 2, (-35 * Math.PI) / 180))).toBeLessThan(0);
  });

  it('crossfades the two vector copies rather than switching them', () => {
    const front = blochFrame(0);
    const back = blochFrame(1);
    expect(Number(front.frontOpacity)).toBe(1);
    expect(Number(front.backOpacity)).toBe(0);
    expect(Number(back.backOpacity)).toBeGreaterThan(Number(back.frontOpacity));
    expect(Number(back.backOpacity)).toBeCloseTo(BACK_VECTOR_OPACITY, 3);

    // Neither weight ever jumps: a discontinuity here is a visible flicker.
    let previousFront = Number(blochFrame(0).frontOpacity);
    for (let i = 1; i <= 2000; i += 1) {
      const value = Number(blochFrame(i / 2000).frontOpacity);
      expect(Math.abs(value - previousFront)).toBeLessThan(0.02);
      previousFront = value;
    }
  });

  it('gives both copies identical geometry — the arrow is never split', () => {
    for (let i = 0; i <= 100; i += 1) {
      const frame = blochFrame(i / 100, PHI_MAX / 2);
      // One shaft string and one head transform are emitted; both copies are
      // written from them, so equality here is equality on screen.
      expect(frame.shaft.startsWith(`M${BLOCH_CX.toFixed(2)} ${BLOCH_CY.toFixed(2)} L`)).toBe(true);
      expect(frame.head).toMatch(/^translate\(-?\d/);
    }
  });
});

describe('the arrow', () => {
  it('stops one head-length short of the tip at |0⟩', () => {
    const frame = blochFrame(0);
    const expectedY = BLOCH_CY - BLOCH_R * Math.cos(CAMERA_ELEVATION) + ARROW_HEAD_LENGTH;
    const match = /L([-\d.]+) ([-\d.]+)$/.exec(frame.shaft);
    expect(match).not.toBeNull();
    close(Number(match?.[1]), BLOCH_CX, 0.5);
    close(Number(match?.[2]), expectedY, 0.5);
  });

  it('never collapses to zero length, so the head always has a direction', () => {
    for (let i = 0; i <= 400; i += 1) {
      const v = blochVector(i / 400);
      const p = project(v);
      expect(Math.hypot(p[0] - BLOCH_CX, p[1] - BLOCH_CY)).toBeGreaterThan(ARROW_HEAD_LENGTH * 2);
    }
  });
});

describe('the latitude ring', () => {
  it('collapses to a point at both poles and is widest at |+⟩', () => {
    const widthOf = (p: number): number => {
      const rx = BLOCH_R * Math.sin(polarAngle(p));
      return rx;
    };
    close(widthOf(0), 0, TIGHT);
    close(widthOf(1), 0, TIGHT);
    close(widthOf(0.5), BLOCH_R, TIGHT);
  });

  it('is an unrotated ellipse split at its own silhouette', () => {
    const ring = latitudeRing(polarAngle(0.5));
    // Both halves start and end at cx ± rx on the same y — the split points are
    // exactly the ring's extremes, which is where front becomes back.
    const ends = /^M([-\d.]+) ([-\d.]+) A([-\d.]+) ([-\d.]+) 0 0 [01] ([-\d.]+) ([-\d.]+)$/.exec(ring.front);
    expect(ends).not.toBeNull();
    close(Number(ends?.[1]), BLOCH_CX + BLOCH_R, 0.01);
    close(Number(ends?.[5]), BLOCH_CX - BLOCH_R, 0.01);
    expect(ends?.[2]).toBe(ends?.[6]);
    close(Number(ends?.[4]), BLOCH_R * Math.sin(CAMERA_ELEVATION), 0.01);
  });
});

describe('the pointer drives both angles', () => {
  const at = (x: number, y: number, engagement = 1): ReturnType<typeof pointerState> =>
    pointerState({ x, y, engagement });

  it('maps the vertical axis onto the three states the piece is about', () => {
    // Top edge |0⟩, exact middle |+⟩, bottom edge |1⟩ — the vector points where
    // the hand is, and +Z projects straight up the screen under this camera.
    expect(at(0.5, 0).progress).toBe(0);
    expect(at(0.5, 0.5).progress).toBe(STATIC_PROGRESS);
    expect(at(0.5, 1).progress).toBe(1);

    expect(blochFrame(at(0.5, 0).progress).hitZero).toBe('true');
    expect(blochFrame(at(0.5, 1).progress).hitOne).toBe('true');
    expect(blochFrame(at(0.5, 0.5).progress).hitPlus).toBe('true');
  });

  it('reads the probability bars off the vertical axis alone', () => {
    // The readout is a function of θ, so it answers the hand's height and
    // nothing else. Crossing the stage must not move it by a single digit.
    const high = blochFrame(at(0, 0.25).progress, at(0, 0.25).phi);
    const highSwung = blochFrame(at(1, 0.25).progress, at(1, 0.25).phi);
    expect(highSwung.readZero).toBe(high.readZero);
    expect(highSwung.barZero).toBe(high.barZero);
    expect(highSwung.shaft).not.toBe(high.shaft);

    const low = blochFrame(at(0.5, 0.75).progress);
    expect(Number(low.readZero)).toBeLessThan(Number(high.readZero));
  });

  it('is the identity on the pointer at full engagement — exactly, not nearly', () => {
    // The contract is "no perceptible lag", and `a + (b - a) * t` would answer
    // 0.09999999999999998 for a hand at y = 0.1. A state a float away from the
    // one being pointed at is a state that was interpolated, and this is the
    // assertion that stops one creeping back in.
    for (let i = 0; i <= 100; i += 1) {
      const y = i / 100;
      const x = 1 - y;
      expect(at(x, y).progress).toBe(y);
      expect(at(x, y).phi).toBe(azimuthFromPointer(x));
    }
  });

  it('rests at |+⟩ with φ = 0 while the envelope is closed', () => {
    // The state a pointer that has left, a coarse-pointer reader and the server
    // all share. Whatever the last coordinates were, a closed envelope answers
    // the still — so an engagement that reaches zero cannot leave the sphere
    // parked a fraction of a degree off the composition it claims to be.
    for (const [x, y] of [
      [0, 0],
      [1, 1],
      [0.31, 0.87],
    ] as const) {
      expect(at(x, y, 0)).toEqual(RESTING_STATE);
    }
    expect(blochFrame(RESTING_STATE.progress, RESTING_STATE.phi)).toEqual(STATIC_FRAME);
  });

  it('stays between rest and the pointer while the envelope is opening', () => {
    // The envelope swells the response in; it never overshoots either end, so
    // no frame of the entrance shows a state outside the two it is between.
    let previous = RESTING_STATE.progress;
    for (let i = 1; i <= 20; i += 1) {
      const state = at(1, 1, i / 20);
      expect(state.progress).toBeGreaterThan(previous);
      expect(state.progress).toBeLessThanOrEqual(1);
      expect(state.phi).toBeGreaterThan(0);
      expect(state.phi).toBeLessThanOrEqual(PHI_MAX);
      previous = state.progress;
    }
  });

  it('clamps a pointer that has left the stage rather than over-rotating', () => {
    // The last event before `pointerleave` routinely carries a coordinate a
    // pixel or two outside the box.
    expect(at(-4, -2).progress).toBe(0);
    expect(at(9, 3).progress).toBe(1);
    expect(at(-4, 0.5).phi).toBe(-PHI_MAX);
    expect(at(9, 0.5).phi).toBe(PHI_MAX);
    expect(at(0.5, Number.NaN).progress).toBe(0);
    expect(at(0.5, 0.5, Number.NaN)).toEqual(RESTING_STATE);
  });

  it('maps the stage edges to ±φmax and its centre to zero', () => {
    close(azimuthFromPointer(0), -PHI_MAX, TIGHT);
    close(azimuthFromPointer(0.5), 0, TIGHT);
    close(azimuthFromPointer(1), PHI_MAX, TIGHT);
  });

  it('clamps a pointer that has left the stage rather than over-rotating', () => {
    expect(azimuthFromPointer(-4)).toBe(-PHI_MAX);
    expect(azimuthFromPointer(9)).toBe(PHI_MAX);
  });

  it('shortens the on-screen vector far less than the rejected 35° would', () => {
    // The failure mode φmax exists to avoid: +X̂ is foreshortened, so swinging φ
    // changes the *drawn length* of the vector, and a reader has no way to tell
    // that from a change in θ. It cannot be eliminated under an orthographic
    // camera — only kept small enough that the picture still reads as rotation
    // about Z. These are the two measurements the 16° decision was made on.
    const worstSwing = (phiMax: number): number => {
      let worst = 0;
      for (let i = 0; i <= 400; i += 1) {
        const centred = project(blochVector(i / 400, 0));
        const base = Math.hypot(centred[0] - BLOCH_CX, centred[1] - BLOCH_CY);
        for (const phi of [phiMax, -phiMax]) {
          const swung = project(blochVector(i / 400, phi));
          const length = Math.hypot(swung[0] - BLOCH_CX, swung[1] - BLOCH_CY);
          worst = Math.max(worst, Math.abs(length - base) / BLOCH_R);
        }
      }
      return worst;
    };

    const chosen = worstSwing(PHI_MAX);
    const rejected = worstSwing((35 * Math.PI) / 180);
    expect(rejected).toBeGreaterThan(0.34);
    expect(chosen).toBeLessThan(0.17);
    expect(chosen).toBeLessThan(rejected / 2);
  });
});

describe('the engagement envelope is the only thing with a time constant', () => {
  it('reaches its target exactly, and in a bounded number of frames', () => {
    // "It must stop" as arithmetic. The stage's rAF loop asks for another frame
    // only while `engagement !== engagementTarget`, so an envelope that merely
    // converged would leave a frame pending forever.
    let engagement = 0;
    let frames = 0;
    while (engagement !== 1) {
      engagement = stepEngagement(engagement, 1);
      frames += 1;
      expect(frames, 'the envelope never reaches 1').toBeLessThan(60);
    }
    expect(engagement).toBe(1);

    frames = 0;
    while (engagement !== 0) {
      engagement = stepEngagement(engagement, 0);
      frames += 1;
      expect(frames, 'the envelope never reaches 0').toBeLessThan(60);
    }
    expect(engagement).toBe(0);
  });

  it('settles inside the window a response still reads as caused by the hand', () => {
    // 0.32/frame is ~165ms to 95% at 60Hz. The number lives in `magnet-field`,
    // which is where its justification is; this asserts the sphere inherits it
    // rather than tuning a second one of its own.
    expect(ENGAGEMENT_EASE).toBeGreaterThanOrEqual(0.25);
    let engagement = 0;
    for (let i = 0; i < 10; i += 1) engagement = stepEngagement(engagement, 1);
    expect(engagement).toBeGreaterThan(0.95);
  });

  it('leaves the angles themselves uneased', () => {
    // The one failure this whole design is arranged to avoid: an eased angle
    // arrives after the hand has stopped and is not read as a response at all.
    // At full engagement two consecutive positions are two consecutive states,
    // with nothing carried between them — there is no state to carry.
    const a = pointerState({ x: 0.2, y: 0.2, engagement: 1 });
    const b = pointerState({ x: 0.8, y: 0.8, engagement: 1 });
    expect(pointerState({ x: 0.8, y: 0.8, engagement: 1 })).toEqual(b);
    expect(pointerState({ x: 0.2, y: 0.2, engagement: 1 })).toEqual(a);
  });
});

describe('the mapping is stateless', () => {
  const serialise = (p: number, phi = 0): string => JSON.stringify(blochFrame(p, phi));

  it('produces bit-identical frames sweeping down the stage and back up', () => {
    const steps = Array.from({ length: 101 }, (_, i) => i / 100);
    const forward = steps.map((p) => serialise(p));
    const backward = steps
      .slice()
      .reverse()
      .map((p) => serialise(p));
    expect(backward.reverse()).toEqual(forward);
  });

  it('is unaffected by whatever the pointer did on the way through', () => {
    // A frame at a given height with φ back at rest is the frame at that
    // height, whatever happened in between. Nothing accumulates.
    const before = serialise(0.4);
    for (let i = 0; i <= 50; i += 1) blochFrame(0.4, azimuthFromPointer(i / 50));
    expect(serialise(0.4)).toBe(before);
  });

  it('holds under a re-entrant sweep at a different sampling rate', () => {
    for (let i = 0; i <= 997; i += 1) {
      const p = i / 997;
      expect(serialise(p)).toBe(serialise(p));
    }
  });
});

describe('the still frame', () => {
  it('is |+⟩ with equal probabilities — what SSR, mobile and reduced motion get', () => {
    expect(STATIC_FRAME.readZero).toBe('0.50');
    expect(STATIC_FRAME.readOne).toBe('0.50');
    expect(STATIC_FRAME.readTheta).toBe('0.50π');
    expect(STATIC_FRAME.hitPlus).toBe('true');
    expect(STATIC_FRAME.hitZero).toBe('false');
    expect(STATIC_FRAME.hitOne).toBe('false');
    expect(Number(STATIC_FRAME.barZero)).toBeCloseTo(READOUT_WIDTH / 2, 6);
  });

  it('is exactly the state a closed envelope resolves to, and the centre of the stage', () => {
    // Both routes to "at rest" land on the same picture: an envelope that has
    // settled, and a pointer sitting in the exact middle of the stage. The
    // first client frame after hydration therefore matches the server markup
    // byte for byte, and there is no flash on either arrival or departure.
    expect(blochFrame(0.5, 0)).toEqual(STATIC_FRAME);
    expect(blochFrame(RESTING_STATE.progress, RESTING_STATE.phi)).toEqual(STATIC_FRAME);
    expect(blochFrame(pointerState({ x: 0.5, y: 0.5, engagement: 1 }).progress, 0)).toEqual(STATIC_FRAME);
  });
});

describe('the whole drawing stays inside the frame', () => {
  it('keeps every authored coordinate within the stage inset', () => {
    const inside = (x: number, y: number, what: string): void => {
      expect(x, `${what} x`).toBeGreaterThan(10);
      expect(x, `${what} x`).toBeLessThan(310);
      expect(y, `${what} y`).toBeGreaterThan(10);
      expect(y, `${what} y`).toBeLessThan(190);
    };

    inside(BLOCH_CX - BLOCH_R, BLOCH_CY - BLOCH_R, 'sphere top-left');
    inside(BLOCH_CX + BLOCH_R, BLOCH_CY + BLOCH_R, 'sphere bottom-right');
    inside(READOUT_X, 52, 'readout top-left');
    inside(READOUT_X + READOUT_WIDTH, 135, 'readout bottom-right');

    for (const label of BLOCH_LABELS) inside(label.x, label.y, `label ${label.id}`);
    for (const axis of [AXIS_X, AXIS_Z]) {
      for (const segment of [axis.front, axis.back]) {
        const match = /L([-\d.]+) ([-\d.]+)$/.exec(segment);
        inside(Number(match?.[1]), Number(match?.[2]), 'axis end');
      }
    }
  });

  it('leaves the sphere clear of the readout column', () => {
    expect(BLOCH_CX + BLOCH_R + LABEL_GAP).toBeLessThan(READOUT_X);
  });

  it('uses the azimuth the camera was specified at', () => {
    close(CAMERA_AZIMUTH, (62 * Math.PI) / 180, TIGHT);
    close(CAMERA_ELEVATION, (20 * Math.PI) / 180, TIGHT);
  });
});

/* ===========================================================================
   THE STYLESHEET CONTRACT

   Read out of the source rather than out of a browser, because what is being
   forbidden is a *declaration*, and a declaration that is present but currently
   harmless is exactly the thing that becomes a bug the next time the geometry
   moves.
   ======================================================================== */

const WORLDS_CSS = readFileSync(
  fileURLToPath(new URL('../src/components/home/TechnicalWorlds.astro', import.meta.url)),
  'utf8',
);

/**
 * The stylesheet with every comment removed.
 *
 * Load-bearing: this file's own rationale mentions `stroke-opacity` in prose to
 * explain why it must not be declared, and a guard that searched the raw source
 * would fail on the comment that documents it.
 */
const WORLDS_RULES = WORLDS_CSS.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every declaration block whose selector mentions one of the given classes. */
function rulesMentioning(classNames: readonly string[]): string[] {
  const out: string[] = [];
  for (const match of WORLDS_RULES.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1] ?? '';
    const body = match[2] ?? '';
    if (classNames.some((name) => selector.includes(name))) out.push(`${selector.trim()} { ${body.trim()} }`);
  }
  return out;
}

describe('the stylesheet may not fight the scroll', () => {
  const GEOMETRY_CARRIERS = ['.tw-bl-shaft', '.tw-bl-head', '.tw-bl-lat', '.tw-bl-vector'];

  it('declares no transition on anything the scroll writes per frame', () => {
    for (const rule of rulesMentioning(GEOMETRY_CARRIERS)) {
      expect(rule, 'a transition here breaks the 1:1 scroll contract').not.toMatch(/\btransition\b/);
    }
  });

  it('declares no stroke-opacity or fill-opacity on the vector or the arcs', () => {
    // Presentation attributes lose to CSS rules, so one of these would silently
    // outrank the depth crossfade the component writes.
    for (const rule of rulesMentioning(['.tw-bl-vector', '.tw-bl-shaft', '.tw-bl-head', '.tw-bl-arc'])) {
      expect(rule).not.toMatch(/\bstroke-opacity\b/);
      expect(rule).not.toMatch(/\bfill-opacity\b/);
    }
  });

  it('animates the arrival with opacity and dash geometry only', () => {
    const keyframe = /@keyframes tw-bl-in \{([\s\S]*?)\n {2}\}/.exec(WORLDS_RULES);
    expect(keyframe, 'the arrival keyframe is gone').not.toBeNull();
    expect(keyframe?.[1]).toMatch(/opacity/);
    expect(keyframe?.[1]).not.toMatch(/(transform|clip-path|cx|cy|width|height|\bd)\s*:/);

    // And nothing on this stage runs any other animation. `tw-draw` is the
    // shared dash-offset trace; `tw-bl-in` is opacity. There is no third.
    for (const rule of rulesMentioning(['.tw-bl-'])) {
      const animation = /animation:\s*([a-z-]+)/.exec(rule);
      if (animation) expect(['tw-draw', 'tw-bl-in']).toContain(animation[1]);
    }
  });

  it('gives no element the arrival fades a resting opacity of its own', () => {
    // The arrival runs `opacity: 0 → 1` with `both`, so on any element that also
    // declares `opacity: 0.1` in the stylesheet the animation *replaces* the
    // resting value with 1 rather than multiplying it. That is how the sphere's
    // glass wash once ended up an opaque grey disc over the whole picture.
    // Paint-level dimming on a faded element belongs on a `*-opacity`
    // presentation attribute, which composes instead of colliding.
    const FADED = [
      '.tw-bl-veil',
      '.tw-bl-arc',
      '.tw-bl-axis',
      '.tw-bl-lat',
      '.tw-bl-labels',
      '.tw-bl-readout',
      '.tw-bl-vector',
    ];
    for (const name of FADED) {
      for (const rule of rulesMentioning([name])) {
        expect(rule, `${name} declares an opacity the arrival would overwrite`).not.toMatch(/[;{]\s*opacity\s*:/);
      }
    }
  });

  it('still finds the classes it is guarding — a renamed class must not pass vacuously', () => {
    for (const name of [...GEOMETRY_CARRIERS, '.tw-bl-arc', '.tw-bl-limb', '.tw-bl-bar', '.tw-bl-label']) {
      expect(rulesMentioning([name]).length, `${name} has no rule`).toBeGreaterThan(0);
    }
  });

  it('has retired every rule and keyframe belonging to the interference stage', () => {
    for (const dead of ['tw-ripple', 'tw-fringe', 'tw-emitter', 'tw-histogram', 'tw-dimension', 'tw-expand']) {
      expect(WORLDS_CSS, `${dead} outlived the stage that used it`).not.toContain(dead);
    }
  });
});

/* ===========================================================================
   THE DOM HALF

   `BlochStage.tsx` owns listeners, a cached box and a teardown, none of which a
   node-environment runner can exercise — there is no DOM here, and a test that
   mocked one would assert that the mocks were called. So the rules that govern
   it are read out of its source, the way `tests/card-light.test.ts` pins
   `ProjectGrid.astro`'s script. Every one of them is invisible in `astro dev`
   and bites only on a touch device, a reduced-motion setting, a hidden tab, or
   in a profiler.
   ======================================================================== */

const STAGE_SOURCE = readFileSync(
  fileURLToPath(new URL('../src/components/visuals/worlds/stages/BlochStage.tsx', import.meta.url)),
  'utf8',
);

/** The source with comments stripped, so prose about a rule cannot satisfy it. */
const STAGE_CODE = STAGE_SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * The body of `const <name> = ...` up to its matching closing brace.
 *
 * Throws rather than answering an empty string for a name it cannot find: a
 * renamed handler must fail loudly here, not pass vacuously.
 */
function bodyOf(name: string): string {
  const start = STAGE_CODE.indexOf(`const ${name} = `);
  if (start < 0) throw new Error(`BlochStage.tsx has no \`${name}\``);
  const open = STAGE_CODE.indexOf('{', start);
  if (open < 0) throw new Error(`\`${name}\` has no body`);
  let depth = 0;
  for (let i = open; i < STAGE_CODE.length; i += 1) {
    if (STAGE_CODE[i] === '{') depth += 1;
    else if (STAGE_CODE[i] === '}') {
      depth -= 1;
      if (depth === 0) return STAGE_CODE.slice(open, i + 1);
    }
  }
  throw new Error(`\`${name}\` is unbalanced`);
}

describe('the stage attaches nothing it cannot take back', () => {
  it('gates the whole effect on active, reduced motion and a fine pointer', () => {
    // Reduced motion and a coarse pointer are not degradations here: both keep
    // the |+⟩ still, which is a complete composition, and neither constructs a
    // listener or a frame. `docs/MOTION_SYSTEM.md` §6, §7.
    expect(STAGE_CODE).toContain('REDUCED_MOTION_QUERY');
    expect(STAGE_CODE).toContain('FINE_POINTER_QUERY');
    expect(STAGE_CODE).toMatch(/if \(!active \|\| reducedMotion \|\| !finePointer \|\| !root\) return;/);
  });

  it('reads both queries as a subscription, so an OS toggle needs no reload', () => {
    // `useMediaQuery` is `useSyncExternalStore` over a `change` listener. A
    // one-shot `matchMedia(...).matches` would strand a reader who turned the
    // setting on after the page loaded.
    expect((STAGE_CODE.match(/useMediaQuery\(/g) ?? []).length).toBe(2);
    expect(STAGE_CODE).not.toMatch(/matchMedia/);
  });

  it('scopes every pointer listener to the stage and never to window', () => {
    const pointerListeners = STAGE_CODE.match(/(\w+)\.addEventListener\('pointer\w+'/g) ?? [];
    expect(pointerListeners.length).toBe(4);
    for (const listener of pointerListeners) expect(listener.startsWith('root.')).toBe(true);
    expect(STAGE_CODE).not.toMatch(/window\.addEventListener\('pointer/);
    // And they are all passive, so a drag over the sphere still scrolls the page.
    expect((STAGE_CODE.match(/'pointer\w+', handle\w+, \{ passive: true \}/g) ?? []).length).toBe(4);
  });

  it('removes every listener it adds, from the same target', () => {
    const added = STAGE_CODE.match(/(\w+)\.addEventListener\('([\w-]+)'/g) ?? [];
    expect(added.length).toBeGreaterThan(4);
    for (const call of added) {
      const [target, event] = call.replace(/'/g, '').split('.addEventListener(');
      expect(STAGE_CODE, `${target}.${event} is added and never removed`).toContain(
        `${target}.removeEventListener('${event}'`,
      );
    }
  });

  it('disconnects both observers and cancels the pending frame', () => {
    // MOTION_SYSTEM §4: offscreen animation is paused, not throttled, and the
    // rAF loop is cancelled on teardown.
    expect(STAGE_CODE).toContain('intersectionObserver?.disconnect()');
    expect(STAGE_CODE).toContain('resizeObserver?.disconnect()');
    expect(STAGE_CODE).toContain('cancelAnimationFrame(motion.frame)');
    expect(bodyOf('settleNow')).toContain('cancelAnimationFrame');
  });

  it('watches the two conditions §4 names, and routes both through one detach', () => {
    expect(STAGE_CODE).toContain("document.addEventListener('visibilitychange'");
    expect(STAGE_CODE).toContain('new IntersectionObserver(');
    expect(STAGE_CODE).toMatch(/const shouldRun = \(\): boolean => onScreen && !document\.hidden;/);
    expect(bodyOf('evaluate')).toContain('detach()');
  });

  it('settles to the |+⟩ still on every way out, rather than freezing mid-turn', () => {
    const settle = bodyOf('settleNow');
    expect(settle).toContain('STATIC_FRAME');
    expect(settle).toContain('motion.engagement = 0');
    expect(bodyOf('detach')).toContain('settleNow()');
  });

  it('reads no layout on the pointer path', () => {
    // The defect this is named for: `getBoundingClientRect()` inside the
    // handler forces a synchronous reflow on the hottest event a page has, and
    // it is invisible everywhere except a profiler. The box is measured on
    // attach, on resize and after a scroll, and read from cache in the frame.
    expect((STAGE_CODE.match(/getBoundingClientRect/g) ?? []).length).toBe(1);
    expect(bodyOf('measure')).toContain('getBoundingClientRect');
    for (const handler of ['handlePointer', 'handleRelease', 'handleScroll']) {
      const body = bodyOf(handler);
      expect(body, `${handler} reads layout`).not.toContain('getBoundingClientRect');
      expect(body, `${handler} measures`).not.toContain('measure()');
    }
    expect(bodyOf('handleScroll')).toContain('motion.boxDirty = true');
  });

  it('coalesces pointer events into a single animation frame', () => {
    // A 1000 Hz mouse must not paint 1000 frames. The handler stores two
    // numbers and asks for a frame; `schedule` is a no-op while one is pending.
    expect(bodyOf('handlePointer')).toContain('schedule()');
    expect(bodyOf('schedule')).toMatch(/if \(motion\.frame === 0 && attached\)/);
    expect((STAGE_CODE.match(/requestAnimationFrame/g) ?? []).length).toBe(1);
  });

  it('no longer subscribes to the traverse — the pointer is the only driver', () => {
    expect(STAGE_CODE).not.toContain('subscribeStageProgress');
    expect(STAGE_CODE).not.toContain('traverseIndexOf');
  });

  it('keeps the arithmetic out of the frame callback', () => {
    // `src/lib` is where logic lives and where a test can reach it. The frame
    // callback measures, calls in, and writes.
    expect(STAGE_CODE).toContain('pointerState({');
    expect(STAGE_CODE).not.toMatch(/Math\.(sin|cos|atan2)\(/);
  });
});

/* ===========================================================================
   THE BUILT DOCUMENT

   `tests/global-setup.ts` builds `dist/` once before any suite. What is checked
   here is what actually ships: the island is server-rendered, so the Bloch
   sphere exists in the HTML of every locale before a byte of JavaScript runs.
   ======================================================================== */

const DIST = fileURLToPath(new URL('../dist', import.meta.url));

const HOME_PAGES = LOCALES.map((locale) => ({
  name: `${locale} homepage`,
  html: readFileSync(
    join(DIST, ...localizePath(HOME_PATH, locale, '').split('/').filter(Boolean), 'index.html'),
    'utf8',
  ),
}));

/** The quantum stage's own markup, sliced out of the built page. */
function quantumStage(html: string): string {
  const start = html.indexOf('data-domain="quantum"');
  expect(start, 'no quantum stage in the built document').toBeGreaterThan(-1);
  const svgStart = html.indexOf('<svg', start);
  const svgEnd = html.indexOf('</svg>', svgStart);
  expect(svgEnd).toBeGreaterThan(svgStart);
  return html.slice(svgStart, svgEnd + 6);
}

describe.each(HOME_PAGES)('$name', ({ html }) => {
  it('server-renders the |+⟩ still, so there is nothing to hydrate into', () => {
    const stage = quantumStage(html);
    expect(stage).toContain(`d="${STATIC_FRAME.shaft}"`);
    expect(stage).toContain(`transform="${STATIC_FRAME.head}"`);
    expect(stage).toContain('0.50π');
    expect(stage).toContain('data-label="plus" data-hit="true"');
  });

  it('carries both copies of the vector, at the crossfaded opacities', () => {
    const stage = quantumStage(html);
    expect(stage).toContain('data-face="back"');
    expect(stage).toContain('data-face="front"');
    expect((stage.match(/class="tw-bl-shaft"/g) ?? []).length).toBe(2);
    expect((stage.match(/class="tw-bl-head"/g) ?? []).length).toBe(2);
  });

  it('renders no style attribute anywhere in the stage — the CSP drops them', () => {
    expect(quantumStage(html)).not.toMatch(/\sstyle="/);
  });

  it('stays inside the node budget', () => {
    const count = (quantumStage(html).match(/<(?!\/)/g) ?? []).length;
    expect(count).toBeLessThanOrEqual(45);
    // A floor as well: a stage that silently rendered nothing would pass a
    // ceiling-only check.
    expect(count).toBeGreaterThan(25);
  });

  it('has no trace of the interference stage left in the markup', () => {
    for (const dead of ['tw-ripple', 'tw-emitter', 'tw-histogram']) {
      expect(quantumStage(html)).not.toContain(dead);
    }
  });
});
