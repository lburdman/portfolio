/**
 * The hero field's mathematics — a uniform field with one local disturbance.
 *
 * Every value here is a pure function of numbers. There is no DOM, no timing
 * and no CSS in this file, which is the whole point: `docs/ARCHITECTURE.md`
 * puts logic in `src/lib/**` where a unit test can reach it, and the audit
 * found four `.astro` frontmatter blocks that had already drifted apart
 * because the same rule was not followed. The DOM half lives in
 * `src/components/visuals/hero/magnet-lines.ts` and is deliberately dumb: it
 * measures, it calls in here, it writes.
 *
 * ── The physical idea ───────────────────────────────────────────────────────
 *
 * At rest every line lies at `REST_ANGLE_DEG` — a ruled sheet, drawn with the
 * same hairline that is this system's primary structural device. The pointer
 * adds a second, local field: lines near it turn **tangentially**, closing
 * into concentric circles around the cursor. That is Ørsted's demonstration,
 * iron filings circling a current-carrying conductor — not a starburst, and
 * not the radial look of the component this was adapted from.
 *
 * The blend between the two is a superposition weighted by a smoothstep of
 * distance. Outside the influence radius a line sits exactly at rest, so the
 * field always reads as an ordered system being locally disturbed rather than
 * as scattered noise.
 */

/** Clamp to the unit interval. `NaN` resolves to 0 rather than propagating. */
export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Hermite smoothstep over the unit interval.
 *
 * Used instead of a linear ramp so the edge of the influence radius has no
 * visible seam: the first derivative is zero at both ends, so a line entering
 * the radius starts turning from a standstill.
 */
export function smoothstep01(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** Fold an angle in degrees into the half-open range `(-180, 180]`. */
export function normalizeAngleDeg(deg: number): number {
  if (!Number.isFinite(deg)) return 0;
  let angle = deg % 360;
  if (angle > 180) angle -= 360;
  if (angle <= -180) angle += 360;
  return angle;
}

/**
 * The signed difference `to - from`, taken the short way round.
 *
 * Load-bearing. Interpolating raw degrees lets a line take the 350° route to a
 * target 10° away — a full spin that reads as a glitch, and the reason the
 * naive version of this effect looks broken near the pointer.
 */
export function shortestAngleDeltaDeg(from: number, to: number): number {
  return normalizeAngleDeg(to - from);
}

/**
 * The tangent to a circle centred on the pointer, for the offset `(dx, dy)`
 * measured **from the line's centre to the pointer**.
 *
 * `atan2` gives the radial direction; +90° turns it into the tangent. A line
 * exactly under the pointer has no defined radius, and `atan2(0, 0)` is 0, so
 * that degenerate case resolves to a stable 90° rather than to `NaN`.
 */
export function tangentAngleDeg(dx: number, dy: number): number {
  return normalizeAngleDeg((Math.atan2(dy, dx) * 180) / Math.PI + 90);
}

/**
 * How strongly a point at `distance` sits inside a disturbance of `radius`.
 * `1` at the centre, `0` at the radius and beyond.
 */
export function fieldInfluence(distance: number, radius: number): number {
  if (!(radius > 0)) return 0;
  return smoothstep01(1 - distance / radius);
}

/**
 * The resting angle of every line: a uniform hatch, raked slightly off level.
 *
 * It was 0° — a perfectly level ruled sheet — and that was wrong twice over,
 * both found by screenshotting the built page rather than by reasoning:
 *
 * 1. **It read as a strikethrough.** A 1px slate line lying exactly level, at
 *    the vertical pitch the phone tier uses, lands on text baselines. Several
 *    lines of the hero's own copy came out looking struck through.
 * 2. **It collided with the layout's real rules.** Section rules, the
 *    credential separators and the underlines beneath the quiet links are all
 *    level hairlines in the same token colour, so a level field competed with
 *    structure that carries meaning.
 *
 * A rake of 16° is enough that no line can be mistaken for either, and small
 * enough that the field still reads as ruled rather than as hatching. The
 * value must match `--hero-field-angle` in `MagnetField.astro`; the field is
 * correct before any script runs precisely because both say the same thing,
 * and `tests/hero-field.test.ts` reads the built CSS to make sure they do.
 */
export const REST_ANGLE_DEG = -16;

/**
 * The heat radius is tighter than the rotation radius, so the accent tint
 * marks the core of the disturbance while the turning reaches further out.
 * One number in one place, so the two cannot drift into looking unrelated.
 */
export const HEAT_RADIUS_SCALE = 0.72;

/**
 * The length of one line, in `rem`.
 *
 * A mark, not a rule: about a third of the grid pitch, so that a thousand of
 * them read as texture behind the type rather than as a competing ruled grid.
 * The stylesheet carries the same number as a literal — a `width` cannot be
 * driven from here without an inline style, which this site's CSP drops — and
 * `tests/hero-field.test.ts` reads the built CSS back to check the two agree.
 */
export const LINE_LENGTH_REM = 1;

export interface LineResponse {
  /** Rotation in degrees, written as a CSS custom property. */
  readonly angleDeg: number;
  /** `0 → 1`; drives the accent mix and the opacity lift in the stylesheet. */
  readonly heat: number;
}

export interface LineResponseInput {
  /** Pointer x minus line-centre x, in pixels. */
  readonly dx: number;
  /** Pointer y minus line-centre y, in pixels. */
  readonly dy: number;
  /** Radius of the disturbance, in pixels. */
  readonly radius: number;
  /**
   * Global engagement, `0 → 1`. Eased on pointer enter and leave so the field
   * powers up and settles instead of snapping. It is the ONLY eased quantity:
   * the angle itself tracks the pointer with no lag, because a response that
   * arrives after the hand has stopped is not read as a response at all.
   */
  readonly engagement: number;
}

/** The complete response of one line to one pointer position. */
export function lineResponse({ dx, dy, radius, engagement }: LineResponseInput): LineResponse {
  const gain = clamp01(engagement);
  if (gain === 0) return { angleDeg: REST_ANGLE_DEG, heat: 0 };

  const distance = Math.hypot(dx, dy);
  const influence = fieldInfluence(distance, radius) * gain;
  if (influence === 0) return { angleDeg: REST_ANGLE_DEG, heat: 0 };

  const target = tangentAngleDeg(dx, dy);
  const angleDeg = REST_ANGLE_DEG + shortestAngleDeltaDeg(REST_ANGLE_DEG, target) * influence;
  const heat = fieldInfluence(distance, radius * HEAT_RADIUS_SCALE) * gain;

  return { angleDeg, heat };
}

/**
 * One step of the engagement envelope, per animation frame.
 *
 * 0.32 per frame reaches 95% in ten frames — about 165ms at 60Hz, and only on
 * enter and leave. The hero effect this replaces eased its *entire* response
 * at 0.08 per frame (~600ms to settle) and measured as dead for exactly that
 * reason; 0.32 sits above the 0.25 floor that keeps a response inside the
 * window where it still reads as caused by the hand that caused it.
 */
export const ENGAGEMENT_EASE = 0.32;

/** Below this the envelope snaps, so the loop can actually reach a stop. */
export const ENGAGEMENT_EPSILON = 0.002;

export function stepEngagement(current: number, target: number): number {
  const next = current + (target - current) * ENGAGEMENT_EASE;
  return Math.abs(target - next) < ENGAGEMENT_EPSILON ? target : next;
}

/**
 * The influence radius as a multiple of the measured grid pitch.
 *
 * Expressed in pitches rather than pixels so the disturbance covers the same
 * *number of lines* at every breakpoint. A fixed pixel radius would swallow a
 * whole small window and read as a pinprick on a 27-inch display.
 *
 * Raised from 5.2 when the pitch tightened to ~48px: at the old multiple the
 * disturbance would have shrunk from a 374px halo to a 250px one, which reads
 * as a smaller effect rather than as a denser one. Seven pitches holds the
 * halo near its previous physical size, so the density change is the only
 * change the eye is asked to notice.
 */
export const INFLUENCE_RADIUS_IN_PITCHES = 7;

/**
 * The grid, per breakpoint tier.
 *
 * This table is the source of truth for how many lines the component renders.
 * The stylesheet carries the same numbers as literals — `repeat()` cannot take
 * a `var()` as its count, and geometry computed in JavaScript would have to be
 * written back as an inline style, which this site's CSP drops — so
 * `tests/hero-field.test.ts` parses the component's CSS and fails if the two
 * ever disagree. That guard is what makes two copies of a number acceptable.
 *
 * `minWidthRem` matches the `min-width` of the corresponding media query.
 */
export interface FieldTier {
  readonly minWidthRem: number;
  readonly columns: number;
  readonly rows: number;
}

/**
 * Four tiers, not three, and the extra one is not decoration.
 *
 * The field spans the whole opening band — the hero *and* the descent beneath
 * it, ending at the edge of the Technical Worlds ink band — so its box is
 * content-height twice over and its aspect ratio swings hard: about 0.16 on a
 * phone (390x2450) and about 0.78 on a laptop (1440x1860). A single track count
 * stretched across that range stops reading as a grid — measured on a 390px
 * device with 6x8, the vertical pitch came out at twice the horizontal one and
 * the field read as scattered marks, one of which sat exactly on a text
 * baseline and looked like a strikethrough. Each tier below is chosen to keep
 * the cell roughly square at the viewport it serves.
 *
 * The pitch is held near 48px at every tier — two thirds of the 72px the hero
 * alone used to run at. Denser marks on a taller band, so the texture reads as
 * one continuous sheet the page descends through rather than as a patch behind
 * the name.
 *
 * ── Where the band heights come from ────────────────────────────────────────
 *
 * They are computed, not eyeballed: the hero is `min(82svh, 50rem)` and the
 * descent is deterministic type, so its height adds up from the tokens — the
 * section padding, the figure rule, a two-line `--text-display-2` heading, the
 * narrative at `--text-xl`, and five list items whose own height is set by
 * `--spacing-stack` padding plus a `--text-display-4` name. The intro stacks
 * below 60rem and the list items stack below 48rem, which is why the band grows
 * taller as the viewport gets narrower even though it holds the same words.
 *
 * The arithmetic is close, not exact — a description that wraps to a third line
 * moves it. A row count that is off by one leaves the cell a couple of percent
 * from square, which for a 16px mark raked 16 degrees off level is not a defect
 * anyone can see. It is worth knowing that this is the number to adjust if the
 * field ever reads as vertically stretched on a real screen.
 */
export const HERO_FIELD_TIERS = [
  /* Phones, ~390x2450: 49 x 49. Static — nothing here has a fine pointer. */
  { minWidthRem: 0, columns: 8, rows: 50 },
  /* Large phones and narrow windows, ~480x2060: 48 x 47. */
  { minWidthRem: 30, columns: 10, rows: 44 },
  /* Tablets, ~768x1980: 48 x 48. */
  { minWidthRem: 48, columns: 16, rows: 41 },
  /* The desktop composition the response is tuned for, ~1440x1860: 48 x 49. */
  { minWidthRem: 80, columns: 30, rows: 38 },
] as const satisfies readonly FieldTier[];

/** Lines in a tier. */
export function tierLineCount(tier: FieldTier): number {
  return tier.columns * tier.rows;
}

/**
 * How many `<span>`s the component renders: enough for the widest tier.
 *
 * Smaller tiers hide the tail with a single `:nth-child()` rule rather than
 * rendering a different count per breakpoint — a static build ships one HTML
 * document to every viewport, so the count cannot be a media query. Hidden
 * lines have a zero-size box and the controller skips them by measurement, so
 * they cost nothing beyond their (highly compressible) markup.
 */
export function heroFieldLineCount(tiers: readonly FieldTier[] = HERO_FIELD_TIERS): number {
  return tiers.reduce((max, tier) => Math.max(max, tierLineCount(tier)), 0);
}

export const HERO_FIELD_LINE_COUNT = heroFieldLineCount();
