import { useEffect, useRef } from 'react';
import {
  AXIS_TICK,
  AXIS_TICKS,
  BAR_BASE,
  BAR_LEFT,
  BAR_SPAN,
  READOUT_Y,
  RESTING_PEAK,
  RESTING_SHARPNESS,
  STATIC_FRAME,
  STATIC_PROGRESS,
  WAVE_CENTRE,
  WAVE_CYCLES,
  peakFromPointer,
  resonanceFrame,
  sharpnessFromPointer,
  type ResonanceFrame,
} from '../../../../lib/worlds/resonance';
import { StageFrame, type StageProps } from '../StageFrame';
import { STAGE_HEIGHT, STAGE_WIDTH, wavePath } from '../stage-geometry';
import { subscribeStageProgress, traverseIndexOf } from '../traverse';
import { REDUCED_MOTION_QUERY, useMediaQuery } from '../useMediaQuery';

/**
 * Audio / Acoustics — a swept tone through a resonant system.
 *
 * The top half is time: a travelling wave. The bottom half is frequency: the
 * system's response, and a cursor at the frequency currently exciting it. The
 * two are not two pictures. They are one number seen twice — see the header of
 * `src/lib/worlds/resonance.ts` for the arithmetic and for the measurement that
 * condemned the version before this one.
 *
 *   scroll   sweeps the excitation, low to high, exactly mid-band at the dwell
 *   pointer  tunes the system: horizontal moves the resonance, vertical its Q
 *   both     meet in one response, which is the wave's amplitude, every bar's
 *            height and the readout at once
 *
 * So the wave swells as the sweep crosses the resonance and thins as it leaves,
 * with no pointer anywhere near it — which is the defect being repaired. The
 * old stage's spectrum stood still unless hovered, so its claim that "the two
 * halves are never independent" was true only for readers who happened to move
 * a mouse over it.
 *
 * ── HOW IT MOVES ───────────────────────────────────────────────────────────
 * Once per activation, this component renders. After that it never re-renders:
 * the scroll subscription and the pointer both write **presentation attributes
 * through refs**, six of them per frame. React state per pointer event — which
 * is what `usePointerField` gives, and what this stage used to use — re-rendered
 * twenty-six spectrum bars to move one curve. An inline `style` is not an
 * option at all: Astro server-renders this island, React serialises a `style`
 * prop into a literal `style=""` attribute, and the site's hash-based CSP drops
 * every one of those in production while `astro dev` looks perfect.
 *
 * There is no rAF loop. A scroll tick and a pointer move each paint one frame
 * and stop (MOTION_SYSTEM §4). The only continuous animation is the wave's
 * travel, which is CSS.
 *
 * ── THE ONE PRECEDENCE RULE ────────────────────────────────────────────────
 * The stylesheet must never declare `transform` on `.tw-wave-scale`, or `d` on
 * `.tw-spectrum-body`, `.tw-spectrum-lit` or `.tw-cursor`. A CSS declaration
 * outranks a presentation attribute, so a rule on any of those would make the
 * per-frame writes silently do nothing. `tests/worlds.test.ts` guards the
 * class. The travel animation lives on a *different*, inner group for exactly
 * this reason.
 */

/** One tile is one frame width, so the travel keyframe can shift by 100%. */
const WAVE_TILE = STAGE_WIDTH;
const WAVE_PATH = wavePath(WAVE_TILE, 68, WAVE_CYCLES, 200, [1, 0.3, 0.12]);

interface StageNodes {
  scale: SVGGElement | null;
  bars: SVGPathElement | null;
  lit: SVGPathElement | null;
  cursor: SVGPathElement | null;
  readCycles: SVGTextElement | null;
  readLevel: SVGTextElement | null;
}

function emptyNodes(): StageNodes {
  return { scale: null, bars: null, lit: null, cursor: null, readCycles: null, readLevel: null };
}

/** Writes one frame, skipping every field that has not moved. */
function paintFrame(nodes: StageNodes, next: ResonanceFrame, previous: ResonanceFrame | null): void {
  const moved = (key: keyof ResonanceFrame): boolean => previous === null || previous[key] !== next[key];

  if (moved('waveTransform')) nodes.scale?.setAttribute('transform', next.waveTransform);
  if (moved('bars')) nodes.bars?.setAttribute('d', next.bars);
  if (moved('litBar')) nodes.lit?.setAttribute('d', next.litBar);
  if (moved('cursor')) nodes.cursor?.setAttribute('d', next.cursor);
  if (moved('readCycles') && nodes.readCycles) nodes.readCycles.textContent = next.readCycles;
  if (moved('readLevel') && nodes.readLevel) nodes.readLevel.textContent = next.readLevel;
}

/** Everything that survives between frames. None of it is React state. */
interface Motion {
  progress: number;
  peak: number;
  sharpness: number;
  previous: ResonanceFrame | null;
}

export function WaveformStage({ domain, active }: StageProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<StageNodes>(emptyNodes());
  const motionRef = useRef<Motion>({
    progress: STATIC_PROGRESS,
    peak: RESTING_PEAK,
    sharpness: RESTING_SHARPNESS,
    previous: null,
  });
  /** Set by the scroll effect, called by the pointer effect. */
  const paintRef = useRef<(() => void) | null>(null);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  /* ── The scroll channel ──────────────────────────────────────────────────
     Not gated on `active`, for the reason the Bloch stage's is not: this
     world's local progress spans its entire ownership window, and only the
     whole span carries the sweep. Gating on `active` would freeze the tone
     mid-band for the two moves the reader can plainly see the panel during, so
     the ends of the sweep would never be drawn at all.

     This does not animate an inactive stage. A scroll update paints one frame
     and stops; there is no loop, no timer and no rAF here. `StageFrame`
     already subscribes to this same channel for every stage regardless of
     `active`, which is the framework's own statement that progress flows
     always and `active` gates animation. */
  useEffect(() => {
    if (reducedMotion) return;

    const index = traverseIndexOf(domain.id);
    if (index < 0) return;

    const nodes = nodesRef.current;
    const motion = motionRef.current;

    const paint = (): void => {
      const next = resonanceFrame(motion.progress, motion.peak, motion.sharpness);
      paintFrame(nodes, next, motion.previous);
      motion.previous = next;
    };

    paintRef.current = paint;

    const unsubscribe = subscribeStageProgress(index, (value) => {
      if (value === null) {
        // The traverse has stood down. Back to the still this was
        // server-rendered as, rather than frozen wherever the sweep stopped.
        motion.progress = STATIC_PROGRESS;
        motion.peak = RESTING_PEAK;
        motion.sharpness = RESTING_SHARPNESS;
        paint();
        return;
      }
      motion.progress = value;
      paint();
    });

    return () => {
      unsubscribe();
      paintRef.current = null;
      motion.progress = STATIC_PROGRESS;
      motion.peak = RESTING_PEAK;
      motion.sharpness = RESTING_SHARPNESS;
      paintFrame(nodes, STATIC_FRAME, motion.previous);
      motion.previous = STATIC_FRAME;
    };
  }, [domain.id, reducedMotion]);

  /* ── The pointer ─────────────────────────────────────────────────────────
     Gated on `active`: tuning the system is an interaction, and only the
     centred world is the one being interacted with (MOTION_SYSTEM §4). Every
     listener is passive, so a touch drag over the stage scrolls the page
     normally, and `pointerdown` is handled as well as `pointermove` so a tap
     reaches the same state a hover does. Leaving restores the resting
     resonance rather than stranding the system where the pointer left it.

     Coalesced to one paint per animation frame: a pointer fires faster than
     the display refreshes. */
  useEffect(() => {
    const root = frameRef.current;
    if (!active || reducedMotion || !root) return;

    const motion = motionRef.current;
    let frame = 0;
    let pending: { x: number; y: number } | null = null;

    const flush = (): void => {
      frame = 0;
      if (!pending) return;
      motion.peak = peakFromPointer(pending.x);
      motion.sharpness = sharpnessFromPointer(pending.y);
      pending = null;
      paintRef.current?.();
    };

    const handlePointer = (event: PointerEvent): void => {
      const rect = root.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pending = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      };
      if (frame === 0) frame = requestAnimationFrame(flush);
    };

    const handleRelease = (): void => {
      if (frame !== 0) cancelAnimationFrame(frame);
      frame = 0;
      pending = null;
      motion.peak = RESTING_PEAK;
      motion.sharpness = RESTING_SHARPNESS;
      paintRef.current?.();
    };

    root.addEventListener('pointermove', handlePointer, { passive: true });
    root.addEventListener('pointerdown', handlePointer, { passive: true });
    root.addEventListener('pointerleave', handleRelease, { passive: true });
    root.addEventListener('pointercancel', handleRelease, { passive: true });

    return () => {
      root.removeEventListener('pointermove', handlePointer);
      root.removeEventListener('pointerdown', handlePointer);
      root.removeEventListener('pointerleave', handleRelease);
      root.removeEventListener('pointercancel', handleRelease);
      handleRelease();
    };
  }, [active, reducedMotion]);

  return (
    <StageFrame domain={domain} active={active} frameRef={frameRef}>
      <clipPath id={`tw-clip-${domain.id}`}>
        <rect x={11} y={11} width={STAGE_WIDTH - 22} height={STAGE_HEIGHT - 22} />
      </clipPath>

      {/* Zero line and amplitude graticule — an oscilloscope has both. */}
      <g className="tw-graticule">
        <line x1={16} y1={WAVE_CENTRE} x2={STAGE_WIDTH - 16} y2={WAVE_CENTRE} />
        <line x1={16} y1={WAVE_CENTRE - 30} x2={STAGE_WIDTH - 16} y2={WAVE_CENTRE - 30} />
        <line x1={16} y1={WAVE_CENTRE + 30} x2={STAGE_WIDTH - 16} y2={WAVE_CENTRE + 30} />
      </g>

      <g clipPath={`url(#tw-clip-${domain.id})`}>
        {/* The arrival wipe, and nothing else, lives on this group. It has no
            transform, so the lengths in its `clip-path` keyframe are plain
            root user units — see `tw-sweep-in` in the stylesheet, and the note
            on `.tw-wave` for why the arrival cannot be the usual dash draw. */}
        <g className="tw-wave-reveal">
          {/* The sweep. `transform` here is a presentation attribute rewritten
              every scroll tick, so no CSS rule may ever set `transform` on this
              class — a declaration would outrank the attribute and the sweep
              would silently stop working, in production only. */}
          <g
            className="tw-wave-scale"
            ref={(node) => {
              nodesRef.current.scale = node;
            }}
            transform={STATIC_FRAME.waveTransform}
          >
            {/* The travel animation is on this *inner* group, so the CSS
                `transform` it animates and the attribute above are never
                authored on the same element.

                Neither wave path declares `pathLength` any more, and neither is
                ever dashed. Both facts are load-bearing — see the stylesheet. */}
            <g className="tw-wave-travel">
              <path className="tw-wave" d={WAVE_PATH} />
              {/* The second copy is what makes the loop seamless: as the first
                  leaves the frame the second is already in it. */}
              <path className="tw-wave" d={WAVE_PATH} transform={`translate(${WAVE_TILE} 0)`} />
            </g>
          </g>
        </g>
      </g>

      {/* The readout. The cycle count is checkable by eye — count the crests
          above it — and the level is the same response that sets the wave's
          height and the lit bar's. Symbols, not words: this stage renders no
          text in any language, for the reason the electronics chain renders
          none. */}
      <g className="tw-readout">
        <text className="tw-annot" x={BAR_LEFT} y={READOUT_Y}>
          f
        </text>
        <text
          className="tw-annot"
          ref={(node) => {
            nodesRef.current.readCycles = node;
          }}
          x={BAR_LEFT + 26}
          y={READOUT_Y}
          textAnchor="end"
        >
          {STATIC_FRAME.readCycles}
        </text>
        <text className="tw-annot" x={BAR_LEFT + BAR_SPAN - 40} y={READOUT_Y}>
          A
        </text>
        <text
          className="tw-annot"
          ref={(node) => {
            nodesRef.current.readLevel = node;
          }}
          x={BAR_LEFT + BAR_SPAN}
          y={READOUT_Y}
          textAnchor="end"
        >
          {STATIC_FRAME.readLevel}
        </text>
      </g>

      {/* The system's response, sampled into bars — and the one bar the
          excitation is standing on, which is the same number as the wave's
          amplitude above. */}
      <g className="tw-spectrum">
        <path
          className="tw-spectrum-body"
          ref={(node) => {
            nodesRef.current.bars = node;
          }}
          d={STATIC_FRAME.bars}
        />
        <path
          className="tw-spectrum-lit"
          ref={(node) => {
            nodesRef.current.lit = node;
          }}
          d={STATIC_FRAME.litBar}
        />
      </g>

      <path
        className="tw-cursor"
        ref={(node) => {
          nodesRef.current.cursor = node;
        }}
        d={STATIC_FRAME.cursor}
      />

      <line className="tw-rule" x1={BAR_LEFT} y1={BAR_BASE} x2={BAR_LEFT + BAR_SPAN} y2={BAR_BASE} />
      <g className="tw-axis-ticks">
        {AXIS_TICKS.map((x) => (
          <line key={x} x1={x} y1={BAR_BASE} x2={x} y2={BAR_BASE + AXIS_TICK} />
        ))}
      </g>
    </StageFrame>
  );
}
