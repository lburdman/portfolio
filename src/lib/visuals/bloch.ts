/**
 * The Bloch sphere the Quantum world draws, as pure geometry.
 *
 * Everything the stage puts on screen is a string produced here. The component
 * owns refs, listeners and `setAttribute`; it owns no arithmetic. That split is
 * what makes the picture testable in a node environment — `tests/bloch.test.ts`
 * asserts the projection, the ellipses, the depth ordering and, most
 * importantly, that a frame is a **pure function of pointer position**, with no
 * hysteresis and no cached previous value.
 *
 * ── THE STATE ──────────────────────────────────────────────────────────
 *   |ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩
 *   r   = (sin θ cos φ, sin θ sin φ, cos θ)
 *   θ   = p·π
 *
 * so p = 0 is |0⟩ at +Z, p = 0.5 is |+⟩ at +X, p = 1 is |1⟩ at −Z.
 *
 * **The pointer owns both angles, and the two axes of the stage are the two
 * angles of the state.** `p` is the pointer's vertical position over the stage,
 * so the top edge is |0⟩, the exact middle is |+⟩ and the bottom edge is |1⟩:
 * the vector points where the hand is, and the north pole is up the screen
 * because it is up the sphere. φ is the horizontal position, over a deliberately
 * small ±16° (see {@link PHI_MAX}) — a rotation about Z, which changes no
 * measurement outcome, which is why the probability bars stay put while the
 * pointer crosses the stage and move only as it rises or falls.
 *
 * Neither angle is eased. The only quantity with a time constant is the
 * engagement envelope in {@link pointerState}, which swells on enter and settles
 * on leave; between those two moments the state *is* the pointer position, with
 * no lag. `src/lib/motion/magnet-field.ts` carries the reasoning, and the ease
 * itself, so there is one of it.
 *
 * ── WHY ORTHOGRAPHIC ───────────────────────────────────────────────────────
 * Under an orthographic camera every great circle on the unit sphere projects
 * to an ellipse centred on the sphere's own screen centre, with semi-major axis
 * exactly `R` and semi-minor axis `R|n̂·ĉ|`. So the equator and the meridian are
 * closed-form half-ellipse arcs — two `A` commands, no sampling, no polyline of
 * 200 points regenerated per frame. The tests verify the identity to 1e-9.
 *
 * A perspective camera would buy a slightly rounder-looking sphere and cost a
 * sampled path per curve per frame. It is not worth it.
 */

/** Screen radius of the sphere, in the shared 320 × 200 stage space. */
export const BLOCH_R = 62;

/**
 * Screen centre of the sphere.
 *
 * Deliberately left of the frame's own centre (which is 160): the right-hand
 * column, `x ∈ [200, 296]`, belongs to the probability readout. The sphere and
 * the numbers are one instrument with two panels, not a picture with a caption
 * dropped on top of it.
 */
export const BLOCH_CX = 116;
export const BLOCH_CY = 100;

const DEG = Math.PI / 180;

/** Camera elevation above the equatorial plane. */
export const CAMERA_ELEVATION = 20 * DEG;
/** Camera azimuth, measured from +X toward +Y. */
export const CAMERA_AZIMUTH = 62 * DEG;

/**
 * Maximum azimuthal excursion the pointer may drive, and it is 16° rather than
 * the 35° first proposed. Two measurements decided it:
 *
 * 1. At 35° the depth of the equatorial vector goes **negative**, so |+⟩ would
 *    pass behind the sphere at exactly the midpoint of the story.
 * 2. +X̂ is foreshortened to a depth of 0.44, so a 35° φ shortens the on-screen
 *    vector from 0.897R to 0.547R. A reader has no way to tell that from a
 *    change in θ — and "θ changed" is the one thing φ must never suggest.
 *
 * Foreshortening cannot be removed under an orthographic camera, only kept
 * small: at 16° the worst on-screen length change is 16% of R against 35%'s
 * 35%, and it is at its worst exactly where the vector is longest and a few
 * pixels read as least. The probability bars — which are a function of θ alone —
 * visibly do not move while the pointer does, which is the second, non-geometric
 * statement that φ is not the story.
 */
export const PHI_MAX = 16 * DEG;

/** Half-width of the depth crossfade band, in units of depth. */
const CROSSFADE = 0.12;

/** Opacity the behind-the-sphere copy of the vector reaches when fully behind. */
export const BACK_VECTOR_OPACITY = 0.62;

/** How far short of the tip the shaft stops, so the head is not drawn over it. */
export const ARROW_HEAD_LENGTH = 6;

/** The arrow head, authored pointing along +X at the origin and then placed. */
export const ARROW_HEAD_PATH = 'M0 0 L-7 3.1 L-7 -3.1 Z';

/** Axis half-length, as a multiple of the sphere radius. */
const AXIS_EXTENT = 1.13;

/**
 * Screen distance from the sphere centre at which a state label is anchored.
 *
 * Placement is along the **projected** radial, not the 3D axis scaled — the
 * first pass did the latter and gave |+⟩ only 5.8px of clearance, because +X̂ is
 * foreshortened. Since |r| = 1 and the projection is orthographic, a tip's
 * screen radius is at most `R`, so anchoring at `R + LABEL_GAP` guarantees the
 * gap by construction rather than by measurement.
 */
export const LABEL_GAP = 11;

/** Left edge and width of the readout column. */
export const READOUT_X = 200;
export const READOUT_WIDTH = 96;

/** How close to a pole (or to the equator) counts as "arrived" for a label. */
const HIT_TOLERANCE = 0.02;

export type Vec3 = readonly [number, number, number];
export type Point2 = readonly [number, number];

/* ===========================================================================
   THE CAMERA BASIS
   ======================================================================== */

const cosE = Math.cos(CAMERA_ELEVATION);
const sinE = Math.sin(CAMERA_ELEVATION);
const cosA = Math.cos(CAMERA_AZIMUTH);
const sinA = Math.sin(CAMERA_AZIMUTH);

/** Toward the viewer. `depth` is the component of a point along this. */
export const CAMERA_FORWARD: Vec3 = [cosE * cosA, cosE * sinA, sinE];
/** Screen right. */
export const CAMERA_RIGHT: Vec3 = [-sinA, cosA, 0];
/** Screen up. */
export const CAMERA_UP: Vec3 = [-sinE * cosA, -sinE * sinA, cosE];

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function normalise(v: Vec3): Vec3 {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

/** Orthographic projection of a point on (or in) the unit sphere to stage space. */
export function project(v: Vec3): Point2 {
  return [BLOCH_CX + BLOCH_R * dot(v, CAMERA_RIGHT), BLOCH_CY - BLOCH_R * dot(v, CAMERA_UP)];
}

/**
 * Signed distance toward the viewer. Linear, and zero at the origin — which is
 * why one sign test on the tip decides the whole arrow (see `blochFrame`).
 */
export function depth(v: Vec3): number {
  return dot(v, CAMERA_FORWARD);
}

/* ===========================================================================
   THE STATE
   ======================================================================== */

/**
 * Polar angle for a normalised vertical position. The entire mapping, in one
 * line, and the reason the stage needs no separate notion of "progress": `p` is
 * simply how far down the stage the pointer is.
 */
export function polarAngle(p: number): number {
  return clamp01(p) * Math.PI;
}

/** Bloch vector for a (θ, φ) pair. */
export function stateVector(theta: number, phi: number): Vec3 {
  const s = Math.sin(theta);
  return [s * Math.cos(phi), s * Math.sin(phi), Math.cos(theta)];
}

/** Bloch vector for a normalised vertical position and an azimuth. */
export function blochVector(p: number, phi = 0): Vec3 {
  return stateVector(polarAngle(p), phi);
}

/**
 * P(0) = cos²(θ/2), written as `(1 + cos θ)/2`.
 *
 * The two are the same number in exact arithmetic and *not* the same in
 * doubles: `cos(π/4)² = 0.5000000000000001`, while `(1 + cos(π/2))/2` is
 * exactly `0.5`. The readout at the midpoint of the traverse has to say 0.50
 * and mean it, and P(0) + P(1) has to be exactly 1 — which the complement below
 * guarantees for free.
 */
export function probabilityZero(theta: number): number {
  return (1 + Math.cos(theta)) / 2;
}

export function probabilityOne(theta: number): number {
  return 1 - probabilityZero(theta);
}

/**
 * The progress at which the tip crosses the silhouette, i.e. where `depth`
 * changes sign, for φ = 0.
 *
 * Solving `sin θ (ĉ·x̂) + cos θ (ĉ·ẑ) = 0` gives `tan θ = −ĉ_z/ĉ_x`, whose root
 * in `(0, π)` is `π − atan(tan ε / cos φ_c)`. There is exactly one, because on
 * a great semicircle a linear functional changes sign at most once.
 */
export const SILHOUETTE_CROSSING_P = (Math.PI - Math.atan(Math.tan(CAMERA_ELEVATION) / cosA)) / Math.PI;

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Hermite step, used for the depth crossfade and nothing else. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const span = edge1 - edge0;
  if (span === 0) return x < edge0 ? 0 : 1;
  const t = clamp01((x - edge0) / span);
  return t * t * (3 - 2 * t);
}

/**
 * φ for a normalised pointer x, `0 → 1`. Centre of the stage is φ = 0.
 *
 * Clamped rather than wrapped: the last `pointermove` before a `pointerleave`
 * can carry a coordinate a pixel or two outside the box, and a state that
 * kicked past ±φmax on the way out would be a visible flick.
 */
export function azimuthFromPointer(x: number): number {
  return PHI_MAX * (2 * clamp01(x) - 1);
}

/* ===========================================================================
   NUMBER FORMATTING

   Every coordinate reaches the DOM through here. Rounding is done before the
   string so that `-0` can be collapsed to `0`: `(-0.0004).toFixed(2)` is
   `"-0.00"`, and a sign that flickers on and off a coordinate that is not
   moving would make the reverse-scroll comparison fail for no visual reason.
   ======================================================================== */

function round(value: number, digits: number): number {
  const scale = 10 ** digits;
  const rounded = Math.round(value * scale) / scale;
  return rounded === 0 ? 0 : rounded;
}

export function fixed(value: number, digits: number): string {
  return round(value, digits).toFixed(digits);
}

/* ===========================================================================
   GREAT CIRCLES

   For a great circle with unit normal n̂:
     m̂ = (n̂ × ĉ)/|n̂ × ĉ|  is the point of the circle furthest from the camera
                            axis in screen terms, and satisfies d(m̂) = 0, so it
                            lies exactly on the silhouette;
     f̂ = m̂ × n̂             is the point a quarter turn along.
   S(m̂) − centre is the projected semi-major axis (length exactly R, because
   m̂ ⊥ ĉ), and S(f̂) − centre the semi-minor (length R|n̂·ĉ|).

   Splitting the ellipse at ±(S(m̂) − centre) therefore splits the circle at the
   silhouette, which is precisely where a curve passes from in front of the
   sphere to behind it. No sampling, and no wrong-side stroke.
   ======================================================================== */

export interface GreatCircle {
  /** Semi-major axis, always exactly `BLOCH_R`. */
  readonly rx: number;
  /** Semi-minor axis, `BLOCH_R · |n̂·ĉ|`. */
  readonly ry: number;
  /** Ellipse rotation in degrees. */
  readonly rotation: number;
  /** The half in front of the sphere, in the ellipse's own rotated frame. */
  readonly front: string;
  /** The half behind it. */
  readonly back: string;
  /** Places both halves: translate to the centre, then rotate. */
  readonly transform: string;
}

export function greatCircle(normal: Vec3): GreatCircle {
  const major = normalise(cross(normal, CAMERA_FORWARD));
  const minor = cross(major, normal);

  const q = project(major);
  const f = project(minor);
  const qx = q[0] - BLOCH_CX;
  const qy = q[1] - BLOCH_CY;
  const fx = f[0] - BLOCH_CX;
  const fy = f[1] - BLOCH_CY;

  const rx = Math.hypot(qx, qy);
  const ry = Math.hypot(fx, fy);
  const rotation = (Math.atan2(qy, qx) * 180) / Math.PI;

  // Which sweep flag draws the half that is in front depends on the handedness
  // of (major, minor) once projected — a cross product in 2D, one scalar.
  const frontSweep = qx * fy - qy * fx > 0 ? 1 : 0;
  const arc = (sweep: number): string =>
    `M${fixed(rx, 2)} 0 A${fixed(rx, 2)} ${fixed(ry, 2)} 0 0 ${sweep} ${fixed(-rx, 2)} 0`;

  return {
    rx,
    ry,
    rotation,
    front: arc(frontSweep),
    back: arc(1 - frontSweep),
    transform: `translate(${BLOCH_CX} ${BLOCH_CY}) rotate(${fixed(rotation, 3)})`,
  };
}

/** The equator, `z = 0`. */
export const EQUATOR: GreatCircle = greatCircle([0, 0, 1]);

/**
 * The λ = 0 meridian, the great circle through ±Z and ±X — the plane the
 * vector itself sweeps in while φ is 0.
 *
 * The λ = 90° meridian, the Y axis and the |i⟩ label were all drawn and all
 * removed. The Y axis projects to only 0.47R, so it terminates *inside* the
 * disc and reads as an unfinished stroke; a second meridian on top of that
 * turned a state into a wireframe.
 */
export const MERIDIAN: GreatCircle = greatCircle([0, 1, 0]);

/* ===========================================================================
   AXES
   ======================================================================== */

export interface AxisSegments {
  readonly front: string;
  readonly back: string;
}

function segment(a: Point2, b: Point2): string {
  return `M${fixed(a[0], 2)} ${fixed(a[1], 2)} L${fixed(b[0], 2)} ${fixed(b[1], 2)}`;
}

/**
 * An axis, split at the origin into the half toward the viewer and the half
 * away from it. Depth is linear and zero at the centre, so the sign of the
 * axis direction's depth is all the split needs.
 */
export function axisSegments(direction: Vec3): AxisSegments {
  const positive = project([direction[0] * AXIS_EXTENT, direction[1] * AXIS_EXTENT, direction[2] * AXIS_EXTENT]);
  const negative = project([-direction[0] * AXIS_EXTENT, -direction[1] * AXIS_EXTENT, -direction[2] * AXIS_EXTENT]);
  const centre: Point2 = [BLOCH_CX, BLOCH_CY];
  const towards = depth(direction) >= 0;
  return {
    front: segment(centre, towards ? positive : negative),
    back: segment(centre, towards ? negative : positive),
  };
}

export const AXIS_X: AxisSegments = axisSegments([1, 0, 0]);
export const AXIS_Z: AxisSegments = axisSegments([0, 0, 1]);

/* ===========================================================================
   LABELS
   ======================================================================== */

export interface BlochLabel {
  readonly id: 'zero' | 'one' | 'plus';
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly anchor: 'middle' | 'end';
}

function labelAt(id: BlochLabel['id'], text: string, v: Vec3, anchor: BlochLabel['anchor'], dy: number): BlochLabel {
  const p = project(v);
  const ux = p[0] - BLOCH_CX;
  const uy = p[1] - BLOCH_CY;
  const length = Math.hypot(ux, uy) || 1;
  return {
    id,
    text,
    x: round(BLOCH_CX + (ux / length) * (BLOCH_R + LABEL_GAP), 2),
    y: round(BLOCH_CY + (uy / length) * (BLOCH_R + LABEL_GAP) + dy, 2),
    anchor,
  };
}

/**
 * The three states the traverse actually visits. Ket notation, in no language —
 * the same choice every other stage on this band makes (numerals and rules, no
 * words), so nothing here needs a translation and nothing here can be read out
 * in the wrong one.
 */
export const BLOCH_LABELS: readonly BlochLabel[] = [
  labelAt('zero', '|0⟩', [0, 0, 1], 'middle', 0),
  labelAt('one', '|1⟩', [0, 0, -1], 'middle', 6),
  labelAt('plus', '|+⟩', [1, 0, 0], 'end', 3),
];

/* ===========================================================================
   A FRAME
   ======================================================================== */

export interface BlochFrame {
  readonly theta: number;
  readonly phi: number;
  /** `d` for the half of the current latitude ring in front of the sphere. */
  readonly latitudeFront: string;
  readonly latitudeBack: string;
  /** `d` for the arrow shaft — identical in both copies. */
  readonly shaft: string;
  /** `transform` placing the arrow head — identical in both copies. */
  readonly head: string;
  /** Crossfade weights. The pair always sums to at most 1 of each copy's own max. */
  readonly frontOpacity: string;
  readonly backOpacity: string;
  readonly barZero: string;
  readonly barOne: string;
  readonly readZero: string;
  readonly readOne: string;
  readonly readTheta: string;
  readonly hitZero: string;
  readonly hitOne: string;
  readonly hitPlus: string;
}

/**
 * The latitude ring at the current θ.
 *
 * A circle of constant z projects to an ellipse with **no rotation**: centre
 * `(CX, CY − R cos θ cos ε)`, `rx = R sin θ`, `ry = R sin θ sin ε`. It collapses
 * to a point at both poles and is widest at |+⟩, so it is a direct picture of
 * how much superposition there is — and it is what makes a pointer-driven φ
 * read as sliding along a drawn circle rather than as the arrow wobbling.
 *
 * Split at `x = cx ± rx`, which for a zero-rotation ellipse is exactly the
 * silhouette of the ring.
 */
export function latitudeRing(theta: number): { readonly front: string; readonly back: string } {
  const rx = BLOCH_R * Math.sin(theta);
  const ry = rx * sinE;
  const cy = BLOCH_CY - BLOCH_R * Math.cos(theta) * cosE;
  const arc = (sweep: number): string =>
    `M${fixed(BLOCH_CX + rx, 2)} ${fixed(cy, 2)} A${fixed(rx, 2)} ${fixed(ry, 2)} 0 0 ${sweep} ${fixed(BLOCH_CX - rx, 2)} ${fixed(cy, 2)}`;
  return { front: arc(1), back: arc(0) };
}

/**
 * Everything the stage writes for one (p, φ) pair, as strings.
 *
 * Pure. No module state, no cache, no easing over time — which is what makes
 * the same pointer position always draw the same pixels, whatever route the
 * hand took to get there, and what `tests/bloch.test.ts` asserts by running the
 * sweep forwards and backwards and comparing.
 *
 * **The vector is never split.** `depth` is linear and vanishes at the origin,
 * so the sign of the tip's depth decides the entire arrow: there is no case
 * where the shaft is half in front of the sphere and half behind it. Both
 * copies therefore receive *identical* geometry and differ only in opacity —
 * true z-order with no DOM reparenting, and no flicker at the crossing, because
 * the handover is a smoothstep across a ±0.12 band rather than a branch.
 */
export function blochFrame(p: number, phi = 0): BlochFrame {
  const progress = clamp01(p);
  const theta = polarAngle(progress);
  const v = stateVector(theta, phi);

  const tip = project(v);
  const dx = tip[0] - BLOCH_CX;
  const dy = tip[1] - BLOCH_CY;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const stop = Math.max(0, length - ARROW_HEAD_LENGTH);
  const angle = (Math.atan2(uy, ux) * 180) / Math.PI;

  const weight = smoothstep(-CROSSFADE, CROSSFADE, depth(v));
  const zero = probabilityZero(theta);
  const one = 1 - zero;
  const ring = latitudeRing(theta);

  return {
    theta,
    phi,
    latitudeFront: ring.front,
    latitudeBack: ring.back,
    shaft: segment([BLOCH_CX, BLOCH_CY], [BLOCH_CX + ux * stop, BLOCH_CY + uy * stop]),
    head: `translate(${fixed(tip[0], 2)} ${fixed(tip[1], 2)}) rotate(${fixed(angle, 2)})`,
    frontOpacity: fixed(weight, 3),
    backOpacity: fixed(BACK_VECTOR_OPACITY * (1 - weight), 3),
    barZero: fixed(READOUT_WIDTH * zero, 2),
    barOne: fixed(READOUT_WIDTH * one, 2),
    readZero: zero.toFixed(2),
    readOne: one.toFixed(2),
    readTheta: `${progress.toFixed(2)}π`,
    hitZero: progress < HIT_TOLERANCE ? 'true' : 'false',
    hitOne: progress > 1 - HIT_TOLERANCE ? 'true' : 'false',
    hitPlus: Math.abs(progress - 0.5) < HIT_TOLERANCE ? 'true' : 'false',
  };
}

/**
 * The frame every reader who is not pointing at the stage gets: |+⟩, φ = 0.
 *
 * It is the server-rendered markup, the reduced-motion picture, the coarse-
 * pointer picture, and the state the engagement envelope settles back to. So
 * the first client frame after hydration is byte-identical to the markup it
 * hydrates against — there is no mismatch and no flash — and it is also the
 * single most informative still: both probabilities equal, the latitude ring at
 * its widest, the vector on the equator. Superposition in one picture.
 *
 * It is 0.5 in both coordinates, which is the geometric centre of the stage, so
 * "at rest" and "pointer in the middle" are the same picture rather than two
 * that have to be reconciled.
 */
export const STATIC_PROGRESS = 0.5;
export const STATIC_FRAME: BlochFrame = blochFrame(STATIC_PROGRESS, 0);

/* ===========================================================================
   THE POINTER

   The whole of what the stage's DOM half is allowed to decide is *where the
   pointer is* and *how far the envelope has opened*. Turning those three
   numbers into a state is arithmetic, so it lives here where a test can reach
   it rather than inside a `requestAnimationFrame` callback.
   ======================================================================== */

/** A qubit state as this stage parameterises it: θ = p·π, and φ. */
export interface BlochState {
  /** θ as a fraction of π — the same normalised quantity {@link polarAngle} takes. */
  readonly progress: number;
  readonly phi: number;
}

/**
 * Where the sphere stands when nothing is pointing at it.
 *
 * Exactly {@link STATIC_FRAME}'s state, so a stage that has never been touched,
 * one whose pointer has just left, and one rendered on a server all show the
 * same picture — and the two that reach it through JavaScript write nothing at
 * all to get there, because the attribute diff sees no change.
 */
export const RESTING_STATE: BlochState = { progress: STATIC_PROGRESS, phi: 0 };

export interface PointerStateInput {
  /** Pointer x over the stage, `0 → 1` left to right. Drives φ. */
  readonly x: number;
  /** Pointer y over the stage, `0 → 1` top to bottom. Drives θ. */
  readonly y: number;
  /**
   * Global engagement, `0 → 1`, eased on enter and leave by
   * `stepEngagement` in `src/lib/motion/magnet-field.ts`.
   *
   * It is the ONLY eased quantity, for the reason stated there: an angle that
   * arrives after the hand has stopped is not read as a response at all. At
   * full engagement this function is the identity on the pointer position.
   */
  readonly engagement: number;
}

/**
 * Interpolates between the two endpoints so that both are hit *exactly*.
 *
 * `a + (b - a) * t` is the obvious form and is wrong at `t = 1`: for
 * `a = 0.5, b = 0.1` it answers `0.09999999999999998`, so a fully engaged
 * pointer would drive a state a float away from the one it is pointing at and
 * the "no lag" contract would be true only to within an epsilon. This form is
 * `a` at 0 and `b` at 1 by the arithmetic of multiplying by zero.
 */
function mix(a: number, b: number, t: number): number {
  return a * (1 - t) + b * t;
}

/**
 * The state one pointer position drives, under one engagement envelope.
 *
 * The two stage axes are the two angles: **y is θ** — top edge |0⟩, middle |+⟩,
 * bottom edge |1⟩, so the vector points where the hand is — and **x is φ**, the
 * rotation about Z that no measurement can see, over ±{@link PHI_MAX}.
 *
 * That assignment is not a free choice. θ is the angle from +Z, +Z projects to
 * straight up the screen under this camera, and the probability readout is a
 * function of θ alone; mapping the vertical axis onto it is therefore the only
 * assignment where moving the hand up the stage moves the vector up the sphere
 * and up the |0⟩ bar together. φ takes the axis that is left over, which is the
 * one it can afford: the horizontal excursion is small on purpose, and a small
 * excursion on the *vertical* axis would have been an unreadable one.
 *
 * Pure, and total: a non-finite or out-of-range coordinate clamps rather than
 * propagating, because the last event before a `pointerleave` is routinely a
 * pixel outside the box.
 */
export function pointerState({ x, y, engagement }: PointerStateInput): BlochState {
  const gain = clamp01(engagement);
  if (gain === 0) return RESTING_STATE;
  return {
    progress: mix(RESTING_STATE.progress, clamp01(y), gain),
    phi: mix(RESTING_STATE.phi, azimuthFromPointer(x), gain),
  };
}
