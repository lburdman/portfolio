import { describe, expect, it } from 'vitest';
import {
  ENGAGEMENT_EASE,
  HERO_FIELD_LINE_COUNT,
  HERO_FIELD_TIERS,
  REST_ANGLE_DEG,
  clamp01,
  fieldInfluence,
  heroFieldLineCount,
  lineResponse,
  normalizeAngleDeg,
  shortestAngleDeltaDeg,
  smoothstep01,
  stepEngagement,
  tangentAngleDeg,
  tierLineCount,
  type FieldTier,
} from '../src/lib/motion/magnet-field';

/**
 * The hero field's mathematics, tested where it is testable.
 *
 * The DOM half of this visual (`src/components/visuals/hero/magnet-lines.ts`)
 * is measurement and CSSOM writes — it has no seam a node-environment test can
 * pull on, and a test that mocked it would assert that the mocks were called.
 * That surface is covered instead by `tests/hero-field.test.ts`, which reads
 * the production build, and by the Playwright pass documented with this change.
 *
 * What IS testable is every number that decides how a line behaves, which is
 * exactly why it lives in `src/lib` rather than in the controller.
 */

describe('clamping and easing', () => {
  it('clamps to the unit interval and refuses to propagate NaN', () => {
    expect(clamp01(-3)).toBe(0);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(9)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
  });

  it('smoothsteps with a zero derivative at both ends', () => {
    expect(smoothstep01(0)).toBe(0);
    expect(smoothstep01(1)).toBe(1);
    expect(smoothstep01(0.5)).toBe(0.5);
    // Flat near the ends: an equal step in t produces a much smaller step in
    // the output there than it does in the middle. That is what removes the
    // seam at the edge of the influence radius.
    expect(smoothstep01(0.05)).toBeLessThan(0.05);
    expect(smoothstep01(0.95)).toBeGreaterThan(0.95);
  });
});

describe('angles', () => {
  it('normalises into (-180, 180]', () => {
    expect(normalizeAngleDeg(0)).toBe(0);
    expect(normalizeAngleDeg(190)).toBe(-170);
    expect(normalizeAngleDeg(-190)).toBe(170);
    expect(normalizeAngleDeg(540)).toBe(180);
    expect(normalizeAngleDeg(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('takes the short way round', () => {
    // The whole point: 350 -> 10 is +20, not -340. Without this a line near
    // the pointer performs a full spin, which reads as a glitch.
    expect(shortestAngleDeltaDeg(350, 10)).toBe(20);
    expect(shortestAngleDeltaDeg(10, 350)).toBe(-20);
    expect(Math.abs(shortestAngleDeltaDeg(0, 179))).toBeLessThanOrEqual(180);
    expect(Math.abs(shortestAngleDeltaDeg(0, 181))).toBeLessThanOrEqual(180);
  });

  it('turns an offset into the tangent of a circle about the pointer', () => {
    // Pointer directly to the right of the line: the tangent is vertical.
    expect(tangentAngleDeg(100, 0)).toBeCloseTo(90, 6);
    // Pointer directly below: the tangent is horizontal (180 folds to 180).
    expect(Math.abs(tangentAngleDeg(0, 100))).toBeCloseTo(180, 6);
    // Degenerate — a line exactly under the pointer resolves, never to NaN.
    expect(Number.isFinite(tangentAngleDeg(0, 0))).toBe(true);
  });

  it('is always perpendicular to the radius, which is what makes the field circular', () => {
    const offsets: readonly (readonly [number, number])[] = [
      [1, 0],
      [3, 4],
      [-7, 2],
      [-1, -1],
      [0.5, -9],
    ];
    for (const [dx, dy] of offsets) {
      const radial = (Math.atan2(dy, dx) * 180) / Math.PI;
      const delta = Math.abs(shortestAngleDeltaDeg(radial, tangentAngleDeg(dx, dy)));
      expect(delta).toBeCloseTo(90, 6);
    }
  });
});

describe('influence falls off inside a radius and is exactly zero outside it', () => {
  it('is 1 at the centre and 0 at and beyond the radius', () => {
    expect(fieldInfluence(0, 300)).toBe(1);
    expect(fieldInfluence(300, 300)).toBe(0);
    expect(fieldInfluence(900, 300)).toBe(0);
  });

  it('decreases monotonically', () => {
    let previous = Number.POSITIVE_INFINITY;
    for (let d = 0; d <= 300; d += 25) {
      const value = fieldInfluence(d, 300);
      expect(value).toBeLessThanOrEqual(previous);
      previous = value;
    }
  });

  it('reports nothing for a degenerate radius rather than dividing by zero', () => {
    expect(fieldInfluence(10, 0)).toBe(0);
    expect(fieldInfluence(10, -5)).toBe(0);
  });
});

describe('the line response', () => {
  const radius = 320;

  it('leaves a line outside the radius at rest — the field stays ordered', () => {
    const far = lineResponse({ dx: 400, dy: 0, radius, engagement: 1 });
    expect(far.angleDeg).toBe(REST_ANGLE_DEG);
    expect(far.heat).toBe(0);
  });

  it('turns a line near the pointer most of the way to the tangent', () => {
    // 40px away, pointer to the right: the tangent is 90 deg and the line
    // should be most of the way there from its resting rake.
    const near = lineResponse({ dx: 40, dy: 0, radius, engagement: 1 });
    expect(near.angleDeg).toBeGreaterThan(70);
    expect(near.heat).toBeGreaterThan(0.8);
  });

  it('produces a displacement from rest that shrinks with distance', () => {
    let previous = Number.POSITIVE_INFINITY;
    for (const dx of [20, 80, 160, 240, 310]) {
      const displaced = Math.abs(lineResponse({ dx, dy: 0, radius, engagement: 1 }).angleDeg - REST_ANGLE_DEG);
      expect(displaced).toBeLessThan(previous);
      previous = displaced;
    }
  });

  it('heats a tighter core than it turns', () => {
    // A line at 80% of the rotation radius is still turning and is already
    // cold: the accent marks the core, the rotation reaches further out.
    const outer = lineResponse({ dx: radius * 0.8, dy: 0, radius, engagement: 1 });
    expect(Math.abs(outer.angleDeg - REST_ANGLE_DEG)).toBeGreaterThan(0);
    expect(outer.heat).toBe(0);
  });

  it('collapses the whole field to rest when engagement is zero', () => {
    const idle = lineResponse({ dx: 10, dy: 10, radius, engagement: 0 });
    expect(idle.angleDeg).toBe(REST_ANGLE_DEG);
    expect(idle.heat).toBe(0);
  });

  it('scales linearly with engagement, so enter and leave are a fade and not a jump', () => {
    const full = lineResponse({ dx: 60, dy: 0, radius, engagement: 1 });
    const half = lineResponse({ dx: 60, dy: 0, radius, engagement: 0.5 });
    // Half the displacement FROM REST, not half the absolute angle.
    expect(half.angleDeg - REST_ANGLE_DEG).toBeCloseTo((full.angleDeg - REST_ANGLE_DEG) / 2, 6);
  });

  it('never returns a non-finite angle for any offset', () => {
    for (const dx of [-500, -1, 0, 1, 500]) {
      for (const dy of [-500, -1, 0, 1, 500]) {
        const { angleDeg, heat } = lineResponse({ dx, dy, radius, engagement: 1 });
        expect(Number.isFinite(angleDeg)).toBe(true);
        expect(heat).toBeGreaterThanOrEqual(0);
        expect(heat).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('the engagement envelope', () => {
  it('eases fast enough to read as caused by the hand that caused it', () => {
    // docs: below ~0.25 per frame the response arrives after the pointer has
    // stopped. The previous hero effect used 0.08 and measured as dead.
    expect(ENGAGEMENT_EASE).toBeGreaterThanOrEqual(0.25);
  });

  it('reaches 95% within ten frames — under ~170ms at 60Hz', () => {
    let value = 0;
    for (let frame = 0; frame < 10; frame += 1) value = stepEngagement(value, 1);
    expect(value).toBeGreaterThan(0.95);
  });

  it('lands exactly on its target so the loop can stop', () => {
    let value = 1;
    for (let frame = 0; frame < 60; frame += 1) value = stepEngagement(value, 0);
    // Exact, not approximate: `magnet-lines.ts` stops scheduling frames on
    // `engagement === target`, and a value that only approaches zero would
    // keep a requestAnimationFrame loop alive over a hero nobody is touching.
    expect(value).toBe(0);
  });
});

describe('the breakpoint tiers', () => {
  it('ascends by width and never shrinks the grid', () => {
    // Ascending line counts are what makes the `:nth-child()` hide/show chain
    // in the stylesheet expressible at all: each tier reveals a tail, none
    // ever has to hide one a wider tier already showed.
    let previous: FieldTier | null = null;
    for (const tier of HERO_FIELD_TIERS) {
      if (previous !== null) {
        expect(tier.minWidthRem).toBeGreaterThan(previous.minWidthRem);
        expect(tierLineCount(tier)).toBeGreaterThan(tierLineCount(previous));
      }
      previous = tier;
    }
    // The narrowest tier must be unconditional — it is the base rule.
    expect(HERO_FIELD_TIERS[0].minWidthRem).toBe(0);
  });

  it('renders exactly enough lines for the widest tier', () => {
    expect(HERO_FIELD_LINE_COUNT).toBe(heroFieldLineCount());
    for (const tier of HERO_FIELD_TIERS) expect(tierLineCount(tier)).toBeLessThanOrEqual(HERO_FIELD_LINE_COUNT);
    expect(HERO_FIELD_TIERS.some((tier) => tierLineCount(tier) === HERO_FIELD_LINE_COUNT)).toBe(true);
  });
});
