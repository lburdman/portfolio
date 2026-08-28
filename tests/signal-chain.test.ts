import { describe, expect, it } from 'vitest';
import {
  CHAIN_STAGES,
  SEGMENT_SAMPLES,
  chainSamples,
  distinctValues,
  isStepped,
  segmentPath,
  spread,
} from '../src/lib/worlds/signal-chain';

/**
 * The Electronics stage's five traces.
 *
 * The whole point of the strip is that the signal **changes** across the chain,
 * and that each change is the one the block above it performs. These assertions
 * are that claim, stated as properties of the data rather than as a caption
 * under a picture: if the filter ever stops removing noise, or the converter
 * ever stops quantising, the stage goes on drawing five plausible squiggles and
 * only this file notices.
 */

const BOX = { x: 0, mid: 100, width: 50, amplitude: 20 } as const;

describe('the chain', () => {
  it('has one trace per block, in the order the signal travels', () => {
    expect(CHAIN_STAGES).toEqual(['source', 'filter', 'convert', 'process', 'output']);
  });

  it('samples every stage at the same rate', () => {
    for (const stage of CHAIN_STAGES) {
      expect(chainSamples(stage)).toHaveLength(SEGMENT_SAMPLES);
    }
  });

  it('is deterministic, so the server and the hydrated client draw the same picture', () => {
    for (const stage of CHAIN_STAGES) {
      expect(chainSamples(stage)).toEqual(chainSamples(stage));
      expect(segmentPath(stage, BOX)).toBe(segmentPath(stage, BOX));
    }
  });

  it('keeps every sample inside the segment it is drawn in', () => {
    for (const stage of CHAIN_STAGES) {
      for (const value of chainSamples(stage)) {
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });

  it('draws five visibly different traces, not one shape repeated', () => {
    const paths = new Set(CHAIN_STAGES.map((stage) => segmentPath(stage, BOX)));
    expect(paths.size).toBe(CHAIN_STAGES.length);
  });
});

describe('what each block does to the signal', () => {
  it('the filter removes the noise the source carries', () => {
    expect(spread('filter')).toBeLessThan(spread('source'));
    // And it is the *same* signal underneath: the clean trace must not be a
    // different waveform, only a quieter one.
    const source = chainSamples('source');
    const filter = chainSamples('filter');
    const residual = source.map((value, i) => value - (filter[i] ?? 0));
    expect(Math.max(...residual.map(Math.abs))).toBeLessThan(0.4);
  });

  it('the converter turns a continuous curve into finitely many levels', () => {
    expect(distinctValues('filter')).toBeGreaterThan(10);
    expect(distinctValues('convert')).toBeLessThanOrEqual(9);
    expect(distinctValues('convert')).toBeGreaterThan(1);
  });

  it('the converter also holds each reading, so the trace has flats in it', () => {
    const samples = chainSamples('convert');
    const repeats = samples.filter((value, i) => i > 0 && value === samples[i - 1]).length;
    expect(repeats).toBeGreaterThan(samples.length / 2);
  });

  it('processing extracts an envelope, which is one-sided by definition', () => {
    for (const value of chainSamples('process')) expect(value).toBeGreaterThanOrEqual(0);
    expect(Math.max(...chainSamples('process'))).toBeGreaterThan(0.3);
  });

  it('the output stage drives a load, so it is two-valued', () => {
    expect(distinctValues('output')).toBe(2);
    const [high, low] = [...new Set(chainSamples('output'))].sort((a, b) => b - a);
    expect(high).toBeGreaterThan(0);
    expect(low).toBeLessThan(0);
  });

  it('actually switches, rather than sitting at one rail for the whole segment', () => {
    const samples = chainSamples('output');
    const edges = samples.filter((value, i) => i > 0 && value !== samples[i - 1]).length;
    expect(edges).toBeGreaterThan(0);
  });
});

describe('segmentPath', () => {
  it('draws the discrete stages with right angles and the continuous ones without', () => {
    expect(isStepped('convert')).toBe(true);
    expect(isStepped('output')).toBe(true);
    expect(isStepped('source')).toBe(false);
    expect(isStepped('filter')).toBe(false);
    expect(isStepped('process')).toBe(false);
  });

  it('gives a stepped stage more points than it has samples, and a smooth one exactly as many', () => {
    const count = (stage: Parameters<typeof segmentPath>[0]) => (segmentPath(stage, BOX).match(/[ML]/g) ?? []).length;
    expect(count('filter')).toBe(SEGMENT_SAMPLES);
    expect(count('convert')).toBeGreaterThan(SEGMENT_SAMPLES);
  });

  it('starts at the left edge and ends at the right one', () => {
    const path = segmentPath('filter', BOX);
    expect(path.startsWith('M0.00 ')).toBe(true);
    expect(path.endsWith(` ${(BOX.mid - (chainSamples('filter').at(-1) ?? 0) * BOX.amplitude).toFixed(2)}`)).toBe(true);
    const xs = [...path.matchAll(/[ML]([\d.]+) /g)].map((m) => Number(m[1]));
    expect(Math.max(...xs)).toBeCloseTo(BOX.width, 6);
  });

  it('stays inside its box vertically', () => {
    for (const stage of CHAIN_STAGES) {
      const ys = [...segmentPath(stage, BOX).matchAll(/[ML][\d.]+ (-?[\d.]+)/g)].map((m) => Number(m[1]));
      expect(Math.min(...ys)).toBeGreaterThanOrEqual(BOX.mid - BOX.amplitude);
      expect(Math.max(...ys)).toBeLessThanOrEqual(BOX.mid + BOX.amplitude);
    }
  });

  it('emits no NaN, whatever geometry it is handed', () => {
    expect(segmentPath('source', { x: 0, mid: 0, width: 0, amplitude: 0 })).not.toMatch(/NaN/);
  });
});
