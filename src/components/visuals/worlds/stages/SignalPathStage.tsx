import { useMemo, type ReactNode } from 'react';
import { StageFrame, type StageProps } from '../StageFrame';
import { manhattanLength, manhattanPath, STAGE_HEIGHT, STAGE_WIDTH, type Point } from '../stage-geometry';
import { usePointerField } from '../usePointerField';

/**
 * Electronics — the sensor-to-processor chain, drawn the way a block diagram
 * on a datasheet is drawn.
 *
 * The chain is the brief's own conceptual example (§6): source → filter →
 * conversion → processing → output. It is rendered as *glyphs* rather than as
 * captions on purpose. Every label in this section would otherwise be an
 * English word hardcoded into a decorative SVG, outside the dictionaries that
 * the audit's finding 2.8 exists to protect. A sine, a roll-off curve, a
 * quantiser staircase and a pinned die say the same thing in both locales, and
 * say it the way the documentation this is imitating says it.
 *
 * Pointer or focus selects a block; the signal path is then drawn in the
 * domain accent *up to that point*, which is how far the signal has got.
 *
 * Technology: SVG over CSS dash animation. No canvas.
 */

const CENTRE_Y = 82;
const BLOCK_WIDTH = 34;
const BLOCK_HEIGHT = 30;
const BLOCK_COUNT = 5;
const FIRST_CENTRE = 39;
const BLOCK_PITCH = 61;
const JOG = 15;
const LEAD_IN = 14;
const LEAD_OUT = STAGE_WIDTH - 14;

const BLOCK_CENTRES = Array.from({ length: BLOCK_COUNT }, (_, index) => FIRST_CENTRE + index * BLOCK_PITCH);

/**
 * The routed trace, plus the waypoint index at which each block's output is
 * reached. The indices are what let the accent overlay stop exactly where the
 * selected block does, without measuring the DOM.
 */
const TRACE = ((): { waypoints: Point[]; outputAt: number[] } => {
  const waypoints: Point[] = [{ x: LEAD_IN, y: CENTRE_Y }];
  const outputAt: number[] = [];

  BLOCK_CENTRES.forEach((centre, index) => {
    waypoints.push({ x: centre - BLOCK_WIDTH / 2, y: CENTRE_Y });
    waypoints.push({ x: centre + BLOCK_WIDTH / 2, y: CENTRE_Y });
    outputAt.push(waypoints.length);

    const next = BLOCK_CENTRES[index + 1];
    if (next === undefined) return;
    const jog = index % 2 === 0 ? JOG : -JOG;
    waypoints.push({ x: centre + BLOCK_WIDTH / 2 + 12, y: CENTRE_Y });
    waypoints.push({ x: next - BLOCK_WIDTH / 2 - 12, y: CENTRE_Y + jog });
    waypoints.push({ x: next - BLOCK_WIDTH / 2, y: CENTRE_Y });
  });

  waypoints.push({ x: LEAD_OUT, y: CENTRE_Y });
  return { waypoints, outputAt };
})();

const TRACE_PATH = manhattanPath(TRACE.waypoints);
const TRACE_LENGTH = manhattanLength(TRACE.waypoints);
/** How far along the trace each block sits, as a percentage of the whole. */
const PREFIX_PERCENTS = TRACE.outputAt.map((index) =>
  Number(((manhattanLength(TRACE.waypoints.slice(0, index)) / TRACE_LENGTH) * 100).toFixed(2)),
);

/** Bend points get a via dot, exactly as they would on a real board. */
const VIAS = TRACE.waypoints.filter((_, index) => index > 0 && index < TRACE.waypoints.length - 1);

function BlockGlyph({ index }: { readonly index: number }): ReactNode {
  switch (index) {
    // Source: a transduced signal entering the chain.
    case 0:
      return <path d="M-9 0 q4.5 -8 9 0 t9 0" />;
    // Filter: a magnitude response with a corner and a roll-off.
    case 1:
      return <path d="M-10 -5 L0 -5 Q5 -5 6 0 L10 8" />;
    // Conversion: continuous in, quantised out.
    case 2:
      return <path d="M-10 7 L-6 7 L-6 2 L-2 2 L-2 -3 L2 -3 L2 -7 L10 -7" />;
    // Processing: a die with bonded pins on all four sides.
    case 3:
      return (
        <>
          <rect x={-6} y={-6} width={12} height={12} />
          <path d="M-10 -3 L-6 -3 M-10 3 L-6 3 M6 -3 L10 -3 M6 3 L10 3 M-3 -10 L-3 -6 M3 -10 L3 -6 M-3 6 L-3 10 M3 6 L3 10" />
        </>
      );
    // Output: a driven line into a terminal pad.
    default:
      return <path d="M-10 0 L4 0 M-1 -4 L4 0 L-1 4 M8 -6 L8 6" />;
  }
}

export function SignalPathStage({ domain, active }: StageProps) {
  const { ref, field } = usePointerField(active);

  // With no pointer the whole chain is energised, so the diagram is complete
  // by default and the pointer only chooses where to stop.
  const selected = useMemo(() => {
    if (!field.engaged) return BLOCK_COUNT - 1;
    return Math.min(BLOCK_COUNT - 1, Math.max(0, Math.round(field.x * (BLOCK_COUNT - 1))));
  }, [field]);

  const energised = PREFIX_PERCENTS[selected] ?? 100;
  const selectedCentre = BLOCK_CENTRES[selected] ?? FIRST_CENTRE;

  return (
    <StageFrame domain={domain} active={active} frameRef={ref}>
      <path className="tw-trace" d={TRACE_PATH} />
      {/* `pathLength={100}` rescales the trace to a 0–100 space, so "energised
          as far as block N" is a percentage and the CSS pulse keyframe is a
          plain constant. Both are presentation *attributes*, not inline
          styles — the site's CSP has no `'unsafe-inline'` and no
          `'unsafe-hashes'`, so a `style` attribute here would simply be
          dropped and the accent would never appear. */}
      <path className="tw-trace-live" d={TRACE_PATH} pathLength={100} strokeDasharray={`${energised} 100`} />
      {active ? <path className="tw-trace-pulse" d={TRACE_PATH} pathLength={100} /> : null}

      <g className="tw-vias">
        {VIAS.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={1.6} />
        ))}
      </g>

      <g className="tw-blocks">
        {BLOCK_CENTRES.map((centre, index) => (
          <g key={index} data-energised={index <= selected ? 'true' : 'false'}>
            <rect
              className="tw-block"
              x={centre - BLOCK_WIDTH / 2}
              y={CENTRE_Y - BLOCK_HEIGHT / 2}
              width={BLOCK_WIDTH}
              height={BLOCK_HEIGHT}
            />
            <g className="tw-block-glyph" transform={`translate(${centre} ${CENTRE_Y})`}>
              <BlockGlyph index={index} />
            </g>
            <text className="tw-annot" x={centre} y={CENTRE_Y + 34} textAnchor="middle">
              {String(index + 1).padStart(2, '0')}
            </text>
          </g>
        ))}
      </g>

      {/* Instrumentation bracket over the block currently under measurement. */}
      <g className="tw-probe" transform={`translate(${selectedCentre} 0)`}>
        <path d={`M${-BLOCK_WIDTH / 2} 42 L${-BLOCK_WIDTH / 2} 36 L${BLOCK_WIDTH / 2} 36 L${BLOCK_WIDTH / 2} 42`} />
        <line x1={0} y1={36} x2={0} y2={30} />
      </g>

      <line className="tw-rule" x1={22} y1={STAGE_HEIGHT - 24} x2={STAGE_WIDTH - 22} y2={STAGE_HEIGHT - 24} />
    </StageFrame>
  );
}
