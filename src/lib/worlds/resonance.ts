/**
 * A swept tone through a resonant system — the arithmetic behind the Audio
 * stage.
 *
 * ── WHAT WAS WRONG WITH THE STAGE THIS REPLACES ────────────────────────────
 * The audio stage drew a travelling wave above a spectrum and claimed the two
 * were "never independent". They were: with no pointer on the stage, the wave
 * travelled and the spectrum stood perfectly still. A reader who scrolled the
 * whole dwell without moving a mouse — which is most readers, most of the
 * time — saw two unrelated pictures sharing a box, which is the exact failure
 * that retired the AI stage's forecast. The coupling existed only as a
 * response to a hover, and a coupling nobody triggers is a caption.
 *
 * ── WHAT IS COUPLED NOW, AND BY WHAT ───────────────────────────────────────
 * Three quantities, three owners, one arithmetic:
 *
 *   the excitation   the reader's **scroll**. Local progress is swept
 *                    frequency: low at the top of the world's window, high at
 *                    the bottom, and exactly mid-band at the centred dwell.
 *   the system       the reader's **pointer**. Horizontal moves the resonant
 *                    frequency, vertical sharpens or broadens it. That is
 *                    tuning the instrument, not decorating it.
 *   the response     neither. It is {@link response} evaluated at the
 *                    excitation, and it sets the waveform's amplitude, the
 *                    height of every bar in the spectrum, and the readout.
 *
 * So the waveform swells as the sweep crosses the resonance and thins as it
 * leaves — because both are the same number — and moving the pointer moves the
 * frequency at which that happens. The two halves of the picture cannot
 * disagree, and neither of them can stand still while the other moves.
 *
 * ── WHY THE FREQUENCY IS A SCALE AND NOT A REGENERATED PATH ────────────────
 * The waveform is sampled once, at module scope, and the sweep is an SVG
 * `transform` **presentation attribute** on the group that holds it. Scaling
 * horizontally is exactly what changing frequency looks like, it costs one
 * attribute write per frame instead of a two-thousand-character path string,
 * and `vector-effect: non-scaling-stroke` keeps the hairline a hairline at
 * every frequency.
 *
 * The scale never goes below 1. Two tiles are drawn end to end and the travel
 * animation shifts by exactly one view-box width, so at a scale of 1 the pair
 * covers the frame at every point of the loop; below 1 they would not, and the
 * end of the second tile would appear inside the frame.
 */

/** Cycles baked into one tile of the waveform, before any sweep scale. */
export const WAVE_CYCLES = 9;

/** Widest the waveform is ever stretched: the low end of the sweep. */
export const SCALE_MAX = 2.6;
/** Narrowest — the high end of the sweep, and the floor the tiling needs. */
export const SCALE_MIN = 1;

/** Resting resonant frequency, normalised across the band. */
export const RESTING_PEAK = 0.42;
/** Resting sharpness. Higher is a narrower resonance. */
export const RESTING_SHARPNESS = 9.5;

/** Pointer limits for the resonance the pointer tunes. */
const PEAK_MIN = 0.14;
const PEAK_MAX = 0.78;
const SHARPNESS_MIN = 5;
const SHARPNESS_MAX = 16;

/** Local progress at the centred dwell — the contract `traverse.ts` publishes. */
export const STATIC_PROGRESS = 0.5;

/** Bars in the spectrum. */
export const BAR_COUNT = 25;

/* ── Stage geometry ─────────────────────────────────────────────────────── */
export const WAVE_CENTRE = 62;
export const WAVE_HALF = 34;
export const BAR_LEFT = 26;
export const BAR_SPAN = 268;
export const BAR_BASE = 166;
export const BAR_MAX = 46;
export const CURSOR_TOP = 114;
export const CURSOR_BOTTOM = 172;
export const READOUT_Y = 106;
export const AXIS_TICK = 4;
export const AXIS_TICK_COUNT = 5;

const BAR_PITCH = BAR_SPAN / BAR_COUNT;
const BAR_WIDTH = BAR_PITCH - 2.2;

/** Clamps to the unit interval, mapping a non-finite input to 0. */
function unit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * The system's magnitude response at normalised frequency `x`.
 *
 * A Lorentzian at `peak` plus a quieter one an octave up, which is what keeps
 * it reading as a resonant *body* rather than as a single bell curve — the
 * same shape the retired `spectrumBars` drew, now written once as a continuous
 * function so the bars, the waveform's amplitude and the readout are provably
 * the same number rather than three that were tuned to agree.
 */
export function response(x: number, peak: number, sharpness: number): number {
  const delta = (x - peak) * sharpness;
  const fundamental = 1 / (1 + delta * delta);
  const overtoneDelta = (x - Math.min(peak * 2 + 0.08, 1)) * sharpness * 1.6;
  const overtone = 0.42 / (1 + overtoneDelta * overtoneDelta);
  return Math.min(1, fundamental + overtone);
}

/** The resonant frequency the pointer's horizontal position tunes to. */
export function peakFromPointer(x: number): number {
  return PEAK_MIN + unit(x) * (PEAK_MAX - PEAK_MIN);
}

/** The sharpness the pointer's vertical position tunes to; top is narrowest. */
export function sharpnessFromPointer(y: number): number {
  return SHARPNESS_MIN + (1 - unit(y)) * (SHARPNESS_MAX - SHARPNESS_MIN);
}

/** Horizontal scale of the waveform for a normalised excitation frequency. */
export function scaleFor(frequency: number): number {
  return SCALE_MAX - unit(frequency) * (SCALE_MAX - SCALE_MIN);
}

/** Cycles of the wave visible inside the frame at that excitation. */
export function visibleCycles(frequency: number): number {
  return WAVE_CYCLES / scaleFor(frequency);
}

/**
 * Vertical scale of the waveform.
 *
 * Never zero: an amplitude that collapses to a flat line at the ends of the
 * sweep would make the stage's resting state depend on where the reader
 * stopped, and the far side of a resonance is quiet, not silent.
 */
export function amplitudeFor(level: number): number {
  return 0.34 + unit(level) * 0.66;
}

/** Everything one frame of the stage writes. All strings: they are attributes. */
export interface ResonanceFrame {
  /** `transform` for the group that holds both waveform tiles. */
  readonly waveTransform: string;
  /** The spectrum's unlit bars, as one path. */
  readonly bars: string;
  /** The bar under the excitation cursor, as one path. */
  readonly litBar: string;
  /** The excitation cursor. */
  readonly cursor: string;
  /** Cycles visible in the frame, to two figures. */
  readonly readCycles: string;
  /** Response at the excitation, `0.00`–`1.00`. */
  readonly readLevel: string;
}

function barPath(index: number, height: number): string {
  const x = BAR_LEFT + index * BAR_PITCH;
  const top = BAR_BASE - height;
  return `M${x.toFixed(2)} ${BAR_BASE}L${x.toFixed(2)} ${top.toFixed(2)}L${(x + BAR_WIDTH).toFixed(2)} ${top.toFixed(2)}L${(x + BAR_WIDTH).toFixed(2)} ${BAR_BASE}Z`;
}

/** Which bar the excitation cursor is standing on. */
export function barIndexFor(frequency: number): number {
  const index = Math.floor(unit(frequency) * BAR_COUNT);
  return index >= BAR_COUNT ? BAR_COUNT - 1 : index;
}

/**
 * One complete frame.
 *
 * `frequency` is this world's local traverse progress, unchanged: 0 as the
 * panel arrives, exactly 0.5 while it is centred, 1 as it leaves.
 */
export function resonanceFrame(frequency: number, peak: number, sharpness: number): ResonanceFrame {
  const f = unit(frequency);
  const level = response(f, peak, sharpness);
  const lit = barIndexFor(f);

  const unlitParts: string[] = [];
  let litPath = '';
  for (let i = 0; i < BAR_COUNT; i += 1) {
    // Bars are sampled at their own centres, so the lit one really is the
    // system's response where the cursor is standing.
    const height = Math.max(1.2, response((i + 0.5) / BAR_COUNT, peak, sharpness) * BAR_MAX);
    if (i === lit) litPath = barPath(i, height);
    else unlitParts.push(barPath(i, height));
  }

  const cursorX = (BAR_LEFT + f * BAR_SPAN).toFixed(2);
  const scale = scaleFor(f);

  return {
    waveTransform:
      `translate(0 ${WAVE_CENTRE}) scale(${scale.toFixed(3)} ${amplitudeFor(level).toFixed(3)}) ` +
      `translate(0 ${-WAVE_HALF})`,
    bars: unlitParts.join(''),
    litBar: litPath,
    cursor: `M${cursorX} ${CURSOR_TOP}L${cursorX} ${CURSOR_BOTTOM}`,
    readCycles: visibleCycles(f).toFixed(1),
    readLevel: level.toFixed(2),
  };
}

/** The picture with no traverse and no pointer: mid-sweep, resting resonance. */
export const STATIC_FRAME: ResonanceFrame = resonanceFrame(STATIC_PROGRESS, RESTING_PEAK, RESTING_SHARPNESS);

/** Tick positions under the spectrum axis. */
export const AXIS_TICKS: readonly number[] = Array.from(
  { length: AXIS_TICK_COUNT },
  (_, i) => BAR_LEFT + (BAR_SPAN * i) / (AXIS_TICK_COUNT - 1),
);
