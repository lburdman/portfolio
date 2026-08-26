import { useMemo } from 'react';
import { StageFrame, type StageProps } from '../StageFrame';
import { interferenceProfile, STAGE_HEIGHT, STAGE_WIDTH } from '../stage-geometry';
import { usePointerField } from '../usePointerField';

/**
 * Quantum Computing — two coherent sources, and what their phases do to each
 * other.
 *
 * The brief (§6) rules out the atom icon, the orbiting electrons and the
 * decorative Bloch sphere. Interference is the honest picture: it is where
 * superposition stops being a slogan and becomes something you can measure.
 * The pointer moves the two sources apart, and the detection histogram at the
 * bottom re-fringes in response — wider separation, tighter fringes. That
 * relationship is the concept, and it is legible without a caption.
 *
 * Technology: SVG. Ambient motion is a staggered opacity wave over concentric
 * circles at fixed radii — an outward-travelling wavefront with no transform,
 * no radius animation and no per-frame JavaScript.
 */

const CENTRE_Y = 78;
const RINGS = 7;
const RING_STEP = 13;
const MIN_SEPARATION = 32;
const MAX_SEPARATION = 108;

const SCREEN_Y = STAGE_HEIGHT - 30;
const BAR_COUNT = 31;
const BAR_LEFT = 30;
const BAR_SPAN = STAGE_WIDTH - BAR_LEFT * 2;
const BAR_WIDTH = BAR_SPAN / BAR_COUNT - 1.4;
const BAR_MAX = 30;

/** Fixed wavelength: separation is the variable the pointer owns. */
const WAVELENGTH = 26;

function Emitter({ x }: { readonly x: number }) {
  return (
    <g transform={`translate(${x.toFixed(2)} ${CENTRE_Y})`}>
      {/* The stylesheet gives each ring a negative animation-delay by
          `:nth-child()`, counting *down* with radius so the bright front
          travels outward. Counting up would run the wavefront backwards, into
          the source. The delays live in CSS rather than in a per-ring inline
          style because the site's CSP blocks inline `style` attributes. */}
      <g className="tw-ripple">
        {Array.from({ length: RINGS }, (_, index) => (
          <circle key={index} r={(index + 1) * RING_STEP} />
        ))}
      </g>
      <circle className="tw-emitter" r={3} />
    </g>
  );
}

export function InterferenceStage({ domain, active }: StageProps) {
  const { ref, field } = usePointerField(active);

  const separation = MIN_SEPARATION + field.x * (MAX_SEPARATION - MIN_SEPARATION);
  const profile = useMemo(() => interferenceProfile(BAR_COUNT, separation, WAVELENGTH), [separation]);

  const left = STAGE_WIDTH / 2 - separation / 2;
  const right = STAGE_WIDTH / 2 + separation / 2;

  return (
    <StageFrame domain={domain} active={active} frameRef={ref}>
      {/* Wavefronts are clipped to the frame so they read as a field under
          observation rather than as circles drawn on top of a box. */}
      <clipPath id={`tw-clip-${domain.id}`}>
        <rect x={11} y={11} width={STAGE_WIDTH - 22} height={STAGE_HEIGHT - 22} />
      </clipPath>

      <g clipPath={`url(#tw-clip-${domain.id})`}>
        <g className="tw-wavefronts">
          <Emitter x={left} />
          <Emitter x={right} />
        </g>
      </g>

      {/* Source baseline with a separation dimension — datasheet annotation,
          numerals and rules only, no words in any language. */}
      <g className="tw-dimension">
        <line x1={left} y1={CENTRE_Y + 46} x2={right} y2={CENTRE_Y + 46} />
        <line x1={left} y1={CENTRE_Y + 42} x2={left} y2={CENTRE_Y + 50} />
        <line x1={right} y1={CENTRE_Y + 42} x2={right} y2={CENTRE_Y + 50} />
      </g>

      {/* Detection screen: |ψ₁ + ψ₂|² sampled into bins. */}
      <g className="tw-histogram">
        {profile.map((value, index) => {
          const height = Math.max(0.8, value * BAR_MAX);
          return (
            <rect
              key={index}
              x={BAR_LEFT + (index * BAR_SPAN) / BAR_COUNT}
              y={SCREEN_Y - height}
              width={BAR_WIDTH}
              height={height}
              data-peak={value > 0.92 ? 'true' : 'false'}
            />
          );
        })}
      </g>
      <line className="tw-rule" x1={BAR_LEFT} y1={SCREEN_Y} x2={BAR_LEFT + BAR_SPAN} y2={SCREEN_Y} />
    </StageFrame>
  );
}
