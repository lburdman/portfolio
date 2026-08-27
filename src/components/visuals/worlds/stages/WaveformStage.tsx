import { useMemo } from 'react';
import { StageFrame, type StageProps } from '../StageFrame';
import { spectrumBars, STAGE_HEIGHT, STAGE_WIDTH, wavePath } from '../stage-geometry';
import { usePointerField } from '../usePointerField';

/**
 * Audio / Acoustics — the same signal in both of its domains at once.
 *
 * The top half is time: a travelling wave. The bottom half is frequency: the
 * spectrum of that wave. Moving the pointer horizontally compresses the wave
 * *and* slides the spectral peak; moving it vertically raises the amplitude
 * *and* the whole spectrum with it. The two halves are never independent,
 * which is the point being communicated — the pointer is not decorating a
 * squiggle, it is demonstrating that a change in one domain is a change in the
 * other (brief §6).
 *
 * Technology: SVG. The waveform is generated once, over twice the frame width,
 * and travels via a single CSS `translateX` animation; the pointer changes an
 * SVG transform and 26 bar heights. No rAF, no canvas, no per-frame path
 * arithmetic.
 */

const WAVE_HEIGHT = 96;
const WAVE_CENTRE = 74;
/**
 * One tile is exactly one frame width, carrying a whole number of cycles, and
 * two tiles are drawn end to end. The CSS travel animation shifts by exactly
 * one tile, so the second copy arrives where the first left and the loop has no
 * seam. `STAGE_WIDTH` is the shared coordinate space, so the CSS keyframe can
 * express that shift as `translateX(-100%)` against the view box — no length
 * has to be handed to CSS through an inline custom property, which the site's
 * CSP would block.
 */
const WAVE_TILE = STAGE_WIDTH;
const WAVE_CYCLES = 5;
const WAVE_PATH = wavePath(WAVE_TILE, WAVE_HEIGHT, WAVE_CYCLES, 200, [1, 0.34, 0.13]);

const BAR_COUNT = 26;
const BAR_LEFT = 26;
const BAR_SPAN = STAGE_WIDTH - BAR_LEFT * 2;
const BAR_WIDTH = BAR_SPAN / BAR_COUNT - 2;
const BAR_BASE = STAGE_HEIGHT - 26;
const BAR_MAX = 42;

export function WaveformStage({ domain, active }: StageProps) {
  const { ref, field } = usePointerField(active);

  // Resting values are mid-scale, so an untouched stage still shows a real
  // waveform rather than a flat line. Frequency never drops below 1: the wave
  // is two tiles wide, so scaling it *out* past 1:1 would eventually expose the
  // end of the second tile inside the frame.
  const frequency = 1 + field.x * 0.9;
  const amplitude = 0.55 + (1 - field.y) * 0.6;

  const bars = useMemo(() => spectrumBars(BAR_COUNT, 0.16 + field.x * 0.6, 11), [field.x]);

  return (
    <StageFrame domain={domain} active={active} frameRef={ref}>
      <clipPath id={`tw-clip-${domain.id}`}>
        <rect x={11} y={11} width={STAGE_WIDTH - 22} height={STAGE_HEIGHT - 22} />
      </clipPath>

      {/* Zero line and amplitude graticule — an oscilloscope has both. */}
      <g className="tw-graticule">
        <line x1={16} y1={WAVE_CENTRE} x2={STAGE_WIDTH - 16} y2={WAVE_CENTRE} />
        <line x1={16} y1={WAVE_CENTRE - 34} x2={STAGE_WIDTH - 16} y2={WAVE_CENTRE - 34} />
        <line x1={16} y1={WAVE_CENTRE + 34} x2={STAGE_WIDTH - 16} y2={WAVE_CENTRE + 34} />
      </g>

      <g clipPath={`url(#tw-clip-${domain.id})`}>
        <g
          transform={`translate(0 ${WAVE_CENTRE}) scale(${frequency.toFixed(3)} ${amplitude.toFixed(3)}) translate(0 ${-WAVE_HEIGHT / 2})`}
        >
          <g className="tw-wave-travel">
            <path className="tw-wave" d={WAVE_PATH} />
            {/* The second copy is what makes the loop seamless: as the first
                leaves the frame the second is already in it. */}
            <path className="tw-wave" d={WAVE_PATH} transform={`translate(${WAVE_TILE} 0)`} />
          </g>
        </g>
      </g>

      {/* Spectrum: the same signal, resolved into frequency. */}
      <g className="tw-spectrum">
        {bars.map((value, index) => {
          const height = Math.max(1, value * BAR_MAX * amplitude);
          return (
            <rect
              key={index}
              x={BAR_LEFT + (index * BAR_SPAN) / BAR_COUNT}
              y={BAR_BASE - height}
              width={BAR_WIDTH}
              height={height}
              data-peak={value > 0.9 ? 'true' : 'false'}
            />
          );
        })}
      </g>
      <line className="tw-rule" x1={BAR_LEFT} y1={BAR_BASE} x2={BAR_LEFT + BAR_SPAN} y2={BAR_BASE} />
    </StageFrame>
  );
}
