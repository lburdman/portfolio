import { describe, expect, it } from 'vitest';
import {
  BAR_COUNT,
  RESTING_PEAK,
  RESTING_SHARPNESS,
  SCALE_MAX,
  SCALE_MIN,
  STATIC_FRAME,
  STATIC_PROGRESS,
  WAVE_CYCLES,
  amplitudeFor,
  barIndexFor,
  peakFromPointer,
  resonanceFrame,
  response,
  scaleFor,
  sharpnessFromPointer,
  visibleCycles,
} from '../src/lib/worlds/resonance';

/**
 * The Audio stage's arithmetic.
 *
 * These are not shape assertions. Every one of them is a property the *picture*
 * depends on: that the wave and the spectrum move together, that the sweep is a
 * pure function of scroll and therefore exactly reversible, and that the
 * waveform's two tiles can never uncover the frame — which is the failure mode
 * a horizontal scale below 1 would cause, silently and only at one end of the
 * sweep.
 */

describe('response', () => {
  it('is tallest at the resonance it is given', () => {
    const samples = Array.from({ length: 201 }, (_, i) => response(i / 200, 0.25, 12));
    const tallest = samples.indexOf(Math.max(...samples));
    expect(tallest / 200).toBeCloseTo(0.25, 1);
  });

  it('moves the resonance when the pointer moves it', () => {
    const at = (peak: number) => {
      const samples = Array.from({ length: 201 }, (_, i) => response(i / 200, peak, 12));
      return samples.indexOf(Math.max(...samples));
    };
    expect(at(0.2)).toBeLessThan(at(0.7));
  });

  it('stays inside 0…1 everywhere', () => {
    for (let i = 0; i <= 200; i += 1) {
      const value = response(i / 200, 0.5, 12);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('falls away from the resonance rather than plateauing', () => {
    const peak = response(0.4, 0.4, 12);
    expect(response(0.0, 0.4, 12)).toBeLessThan(peak);
    expect(response(1.0, 0.4, 12)).toBeLessThan(peak);
  });

  it('narrows as the pointer sharpens it', () => {
    // Half an octave off resonance, a sharper system must be quieter.
    expect(response(0.6, 0.4, 16)).toBeLessThan(response(0.6, 0.4, 5));
  });
});

describe('the pointer mapping', () => {
  it('sweeps the resonance across the band, left to right', () => {
    expect(peakFromPointer(0)).toBeLessThan(peakFromPointer(1));
  });

  it('sharpens towards the top of the stage, where a narrow peak reads best', () => {
    expect(sharpnessFromPointer(0)).toBeGreaterThan(sharpnessFromPointer(1));
  });

  it('clamps a pointer reported outside the stage instead of extrapolating', () => {
    expect(peakFromPointer(-3)).toBe(peakFromPointer(0));
    expect(peakFromPointer(4)).toBe(peakFromPointer(1));
    expect(sharpnessFromPointer(Number.NaN)).toBe(sharpnessFromPointer(0));
  });
});

describe('the sweep', () => {
  /**
   * The tiling contract. Two copies of the wave are drawn end to end and the
   * travel animation shifts by exactly one view-box width, so the pair covers
   * the frame at every point of the loop *only while the horizontal scale is at
   * least 1*. Below that, the end of the second tile walks into the frame and
   * the waveform appears to stop halfway across — which is precisely the kind
   * of defect that looks like a clipping bug and is not one.
   */
  it('never scales the waveform below the width its two tiles can cover', () => {
    for (let i = 0; i <= 100; i += 1) {
      expect(scaleFor(i / 100)).toBeGreaterThanOrEqual(SCALE_MIN);
    }
    expect(scaleFor(0)).toBeCloseTo(SCALE_MAX, 6);
    expect(scaleFor(1)).toBeCloseTo(SCALE_MIN, 6);
  });

  it('raises the frequency as the reader descends', () => {
    expect(visibleCycles(0)).toBeLessThan(visibleCycles(0.5));
    expect(visibleCycles(0.5)).toBeLessThan(visibleCycles(1));
  });

  it('shows the baked cycle count at the top of the sweep', () => {
    expect(visibleCycles(1)).toBeCloseTo(WAVE_CYCLES, 6);
  });

  it('is a pure function of progress, so scrolling back up runs it backwards', () => {
    const forward = Array.from({ length: 40 }, (_, i) => scaleFor(i / 39));
    const backward = Array.from({ length: 40 }, (_, i) => scaleFor((39 - i) / 39));
    expect([...backward].reverse()).toEqual(forward);
  });

  it('never lets the waveform collapse to a flat line', () => {
    expect(amplitudeFor(0)).toBeGreaterThan(0);
    expect(amplitudeFor(1)).toBeGreaterThan(amplitudeFor(0));
  });

  it('clamps a progress an over-scrolled ScrollTrigger reports outside 0…1', () => {
    expect(scaleFor(-0.4)).toBe(scaleFor(0));
    expect(scaleFor(1.4)).toBe(scaleFor(1));
    expect(Number.isFinite(scaleFor(Number.NaN))).toBe(true);
  });
});

describe('barIndexFor', () => {
  it('walks the bars in order across the band', () => {
    expect(barIndexFor(0)).toBe(0);
    expect(barIndexFor(1)).toBe(BAR_COUNT - 1);
    expect(barIndexFor(0.5)).toBeGreaterThan(barIndexFor(0.2));
  });

  it('never answers an index outside the spectrum', () => {
    for (let i = -20; i <= 120; i += 1) {
      const index = barIndexFor(i / 100);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(BAR_COUNT);
    }
  });

  /* An odd bar count is deliberate: the centred dwell publishes exactly 0.5,
     and with an even count that lands on a boundary between two bars, so the
     cursor would straddle the join in the one frame the reader sees most. */
  it('puts the centred dwell inside a bar rather than on a seam', () => {
    expect(BAR_COUNT % 2).toBe(1);
    const index = barIndexFor(STATIC_PROGRESS);
    expect(index / BAR_COUNT).toBeLessThan(STATIC_PROGRESS);
    expect((index + 1) / BAR_COUNT).toBeGreaterThan(STATIC_PROGRESS);
  });
});

describe('resonanceFrame', () => {
  it('couples the waveform, the spectrum and the readout to one number', () => {
    const quiet = resonanceFrame(0.95, 0.2, 14);
    const loud = resonanceFrame(0.2, 0.2, 14);
    // The readout is the response, so the loud frame reads higher…
    expect(Number(loud.readLevel)).toBeGreaterThan(Number(quiet.readLevel));
    // …and the waveform's vertical scale, which is the same number, follows it.
    const scaleY = (frame: { waveTransform: string }) =>
      Number(/scale\([\d.]+ ([\d.]+)\)/.exec(frame.waveTransform)?.[1]);
    expect(scaleY(loud)).toBeGreaterThan(scaleY(quiet));
  });

  it('moves the cursor with the sweep and nothing else', () => {
    const x = (f: number) => Number(/^M([\d.]+) /.exec(resonanceFrame(f, 0.4, 10).cursor)?.[1]);
    expect(x(0.1)).toBeLessThan(x(0.5));
    expect(x(0.5)).toBeLessThan(x(0.9));
    // The pointer tunes the system, not the excitation, so it must not move it.
    expect(resonanceFrame(0.5, 0.2, 8).cursor).toBe(resonanceFrame(0.5, 0.7, 16).cursor);
  });

  it('lights exactly one bar and draws the rest in the other path', () => {
    const frame = resonanceFrame(0.62, 0.4, 10);
    expect(frame.litBar.match(/M/g)).toHaveLength(1);
    expect(frame.bars.match(/M/g)).toHaveLength(BAR_COUNT - 1);
  });

  it('reshapes the spectrum when the pointer tunes the system', () => {
    expect(resonanceFrame(0.5, 0.2, 10).bars).not.toBe(resonanceFrame(0.5, 0.7, 10).bars);
    expect(resonanceFrame(0.5, 0.4, 5).bars).not.toBe(resonanceFrame(0.5, 0.4, 16).bars);
  });

  it('emits only finite coordinates, whatever it is handed', () => {
    for (const frame of [resonanceFrame(Number.NaN, 0.4, 10), resonanceFrame(2, 0.4, 10)]) {
      for (const value of [frame.bars, frame.litBar, frame.cursor, frame.waveTransform]) {
        expect(value).not.toMatch(/NaN|Infinity/);
      }
    }
  });

  it('is what the server renders: the centred dwell at the resting resonance', () => {
    expect(STATIC_FRAME).toEqual(resonanceFrame(STATIC_PROGRESS, RESTING_PEAK, RESTING_SHARPNESS));
  });
});
