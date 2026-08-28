/**
 * The signal an electronics chain actually carries, stage by stage.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────
 * The Electronics stage drew five blocks with datasheet glyphs inside them and
 * one dash sliding along the trace that joined them. Every glyph was a static
 * *icon of a function* — a sine, a roll-off, a staircase, a die, an arrow — and
 * the only thing that moved was the same dash, unchanged, passing all five. So
 * the picture asserted that a chain transforms a signal and then showed the
 * signal not being transformed. A reader who did not already know what a
 * source, a filter, an ADC and a DSP block do learned nothing from it, and a
 * reader who did learned nothing either.
 *
 * What is missing from that picture is the signal. This module is it: five
 * waveforms, each **derived from the one before it**, so the change at every
 * boundary is caused by the block above it rather than drawn to look plausible.
 *
 *   01 source     a sine, with noise on it — a transducer's raw output
 *   02 filter     the same sine, with the noise gone
 *   03 conversion that sine sampled and quantised: a staircase, not a curve
 *   04 processing the envelope extracted from those samples — a feature
 *   05 output     a two-level driven signal, gated on that envelope
 *
 * Read left to right, the five say: measure, clean, digitise, extract, act.
 * That is the chain, and it is now visible rather than captioned.
 *
 * ── WHY IT IS PURE, AND HERE ───────────────────────────────────────────────
 * `docs/ARCHITECTURE.md` and the repo's own rules put logic in `src/lib/**`
 * where it is unit-tested, not in a component where it is not. Everything here
 * is a pure function of its arguments, evaluated once at module scope by the
 * stage, and `tests/signal-chain.test.ts` asserts the properties the picture
 * depends on — that the filter is quieter than the source, that the converter's
 * output takes finitely many values, that the gate is two-valued.
 *
 * Determinism is not a preference either. The island is server-rendered and
 * then hydrated, so a coordinate from `Math.random()` would differ between the
 * two passes and React would throw the server markup away. The noise below is a
 * seeded LCG, exactly as `stage-geometry.ts` requires of every "organic"
 * layout in this section.
 */

import { createRandom } from '../../components/visuals/worlds/stage-geometry';

/** How many points each segment is sampled at. */
export const SEGMENT_SAMPLES = 49;

/** Cycles of the carrier inside one segment. */
const CYCLES = 2;

/**
 * Peak of the carrier itself, leaving headroom for the source's noise.
 *
 * The carrier is the **same height before and after the filter**, and that is
 * deliberate: the filter removes the noise, it does not change the signal. A
 * source drawn at full scale and a filter drawn shorter would say the opposite.
 */
const CARRIER_PEAK = 0.74;

/** Half the peak-to-peak noise the transducer's output carries. */
const NOISE_PEAK = 0.26;

/** Quantiser resolution, in levels either side of zero. Small enough to see. */
const ADC_LEVELS = 4;

/** Samples the converter holds each reading for — the visible sample period. */
const ADC_HOLD = 4;

/** Where the gate at the end of the chain trips, against the envelope. */
const GATE_THRESHOLD = 0.4;

/** How hard the output stage drives its load, either way. */
const GATE_LEVEL = 0.72;

/** Seed for the source's noise. Any fixed number; this one is not special. */
const NOISE_SEED = 20260828;

/**
 * The clean carrier: a sine with a little second harmonic, so the filtered
 * trace is recognisably a *signal* and not a textbook sinusoid.
 */
function carrier(t: number): number {
  const phase = t * CYCLES * Math.PI * 2;
  return ((Math.sin(phase) + 0.24 * Math.sin(phase * 2 + 0.6)) / 1.24) * CARRIER_PEAK;
}

/** The five stages of the chain, in order. */
export type ChainStage = 'source' | 'filter' | 'convert' | 'process' | 'output';

export const CHAIN_STAGES: readonly ChainStage[] = ['source', 'filter', 'convert', 'process', 'output'];

/**
 * One stage's samples, in `[-1, 1]`, at `SEGMENT_SAMPLES` evenly spaced points.
 *
 * Each is computed from the stage before it, which is the whole point: the
 * filter's trace is the source's trace minus its noise, the converter's is the
 * filter's rounded, the envelope is measured off the converter's samples, and
 * the gate is a comparison against that envelope. Nothing here is drawn to
 * look like the caption.
 */
export function chainSamples(stage: ChainStage): readonly number[] {
  const clean = Array.from({ length: SEGMENT_SAMPLES }, (_, i) => carrier(i / (SEGMENT_SAMPLES - 1)));
  if (stage === 'filter') return clean;

  const noise = createRandom(NOISE_SEED);
  const noisy = clean.map((value) => value + (noise() * 2 - 1) * NOISE_PEAK);
  if (stage === 'source') return noisy;

  // The converter: sample and hold, then round to a finite ladder. Both halves
  // are visible — the flats are the hold, the jumps are the ladder.
  const step = 1 / ADC_LEVELS;
  const quantised = clean.map((_, i) => {
    const held = clean[Math.min(clean.length - 1, Math.floor(i / ADC_HOLD) * ADC_HOLD)] ?? 0;
    return Math.max(-1, Math.min(1, Math.round(held / step) * step));
  });
  if (stage === 'convert') return quantised;

  // Processing: the envelope of those samples. A leaky peak follower, which is
  // what an envelope detector in software actually is.
  let peak = 0;
  const envelope = quantised.map((value) => {
    peak = Math.max(Math.abs(value), peak * 0.86);
    return peak;
  });
  if (stage === 'process') return envelope;

  // The output stage drives a load, so it is two-valued: on above the
  // threshold, off below it. Held slightly off the rails so the trace never
  // sits exactly on the segment's own edge.
  return envelope.map((value) => (value >= GATE_THRESHOLD ? GATE_LEVEL : -GATE_LEVEL));
}

/** Stages the converter has already discretised, and which are drawn as steps. */
const STEPPED: ReadonlySet<ChainStage> = new Set<ChainStage>(['convert', 'output']);

/** Whether a stage's trace is drawn as a staircase rather than as a curve. */
export function isStepped(stage: ChainStage): boolean {
  return STEPPED.has(stage);
}

export interface SegmentBox {
  /** Left edge of the segment, in stage coordinates. */
  readonly x: number;
  /** The segment's zero line. */
  readonly mid: number;
  readonly width: number;
  /** Half-height: a sample of 1 reaches `mid - amplitude`. */
  readonly amplitude: number;
}

/**
 * One stage's trace, as an SVG path inside `box`.
 *
 * Discrete stages are drawn with right angles and continuous ones with straight
 * segments, because that difference is the information: after the converter the
 * signal genuinely only exists at sample instants, and drawing it as a smooth
 * curve would be the same lie the old glyphs told.
 */
export function segmentPath(stage: ChainStage, box: SegmentBox): string {
  const samples = chainSamples(stage);
  const stepped = isStepped(stage);
  const parts: string[] = [];
  let previousY: number | null = null;

  samples.forEach((value, index) => {
    const x = box.x + (index / (samples.length - 1)) * box.width;
    const y = box.mid - value * box.amplitude;
    if (previousY === null) {
      parts.push(`M${x.toFixed(2)} ${y.toFixed(2)}`);
    } else if (stepped && y !== previousY) {
      parts.push(`L${x.toFixed(2)} ${previousY.toFixed(2)}`, `L${x.toFixed(2)} ${y.toFixed(2)}`);
    } else {
      parts.push(`L${x.toFixed(2)} ${y.toFixed(2)}`);
    }
    previousY = y;
  });

  return parts.join(' ');
}

/**
 * Peak-to-peak spread of a stage's samples.
 *
 * Not used to draw anything — it is what `tests/signal-chain.test.ts` measures
 * the filter against the source with, so "the filter removed the noise" is an
 * asserted property of the data rather than a claim in a comment.
 */
export function spread(stage: ChainStage): number {
  const samples = chainSamples(stage);
  return Math.max(...samples) - Math.min(...samples);
}

/** How many distinct values a stage's samples take. Discrete stages are few. */
export function distinctValues(stage: ChainStage): number {
  return new Set(chainSamples(stage).map((value) => value.toFixed(6))).size;
}
