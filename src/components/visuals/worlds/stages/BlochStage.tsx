import { useEffect, useRef } from 'react';
import {
  ARROW_HEAD_PATH,
  AXIS_X,
  AXIS_Z,
  BLOCH_CX,
  BLOCH_CY,
  BLOCH_LABELS,
  BLOCH_R,
  EQUATOR,
  MERIDIAN,
  PHI_EASE,
  PHI_EPSILON,
  READOUT_WIDTH,
  READOUT_X,
  STATIC_FRAME,
  STATIC_PROGRESS,
  azimuthFromPointer,
  blochFrame,
  type BlochFrame,
} from '../../../../lib/visuals/bloch';
import { StageFrame, type StageProps } from '../StageFrame';
import { subscribeStageProgress, traverseIndexOf } from '../traverse';
import { REDUCED_MOTION_QUERY, useMediaQuery } from '../useMediaQuery';

/**
 * Quantum Computing — a Bloch sphere the reader's own scroll drives.
 *
 * The state is `|ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩` with **θ = p·π**, where
 * `p` is this world's local traverse progress. So the descent through the
 * section *is* the rotation: |0⟩ at the top, |+⟩ — an equal superposition —
 * exactly at the centred dwell, |1⟩ at the bottom. Scrolling back up runs the
 * state backwards, exactly, because θ is a pure function of p and of nothing
 * else. The probability bars beside it are the same fact stated as numbers.
 *
 * The pointer owns φ alone, over a deliberately small ±16°: it rotates the
 * state about the Z axis, which is a real degree of freedom and one that
 * changes *no* measurement outcome. The bars therefore stay frozen while the
 * pointer moves — a second, non-geometric confirmation that φ is not the story.
 * See `src/lib/visuals/bloch.ts` for why 16° and not 35°.
 *
 * ── HOW IT IS DRAWN ────────────────────────────────────────────────────────
 * SVG, not canvas, and the reason is the site's CSP: every colour has to come
 * from a stylesheet rule, which SVG reads natively (`--tw-accent`) where canvas
 * would need `getComputedStyle` to launder tokens through JavaScript. SVG also
 * server-renders a correct picture for the no-JS, reduced-motion and mobile
 * cases, all of which get the |+⟩ still.
 *
 * ── HOW IT MOVES ───────────────────────────────────────────────────────────
 * Once per activation, this component renders. After that it never re-renders:
 * the scroll subscription and the pointer both write **presentation attributes
 * through refs**. React state per frame would re-render the panel sixty times a
 * second to change fifteen numbers, and an inline `style` — the other obvious
 * way to move something — is dropped outright by the hash-based CSP in
 * production while working perfectly in dev.
 *
 * The rAF loop exists only for φ's ease back to centre. It is not a render
 * loop: a scroll update paints one frame and stops, and the loop stands down as
 * soon as φ has reached its target (`docs/MOTION_SYSTEM.md` §4).
 *
 * The two effects below are split along the one line that matters: **scroll is
 * not gated on `active`, the pointer is.** The reasons are on each of them.
 */

/** Every node the scroll and the pointer write to. */
interface StageNodes {
  latitudeFront: SVGPathElement | null;
  latitudeBack: SVGPathElement | null;
  frontGroup: SVGGElement | null;
  frontShaft: SVGPathElement | null;
  frontHead: SVGPathElement | null;
  backGroup: SVGGElement | null;
  backShaft: SVGPathElement | null;
  backHead: SVGPathElement | null;
  barZero: SVGRectElement | null;
  barOne: SVGRectElement | null;
  readZero: SVGTextElement | null;
  readOne: SVGTextElement | null;
  readTheta: SVGTextElement | null;
  hitZero: SVGTextElement | null;
  hitOne: SVGTextElement | null;
  hitPlus: SVGTextElement | null;
}

function emptyNodes(): StageNodes {
  return {
    latitudeFront: null,
    latitudeBack: null,
    frontGroup: null,
    frontShaft: null,
    frontHead: null,
    backGroup: null,
    backShaft: null,
    backHead: null,
    barZero: null,
    barOne: null,
    readZero: null,
    readOne: null,
    readTheta: null,
    hitZero: null,
    hitOne: null,
    hitPlus: null,
  };
}

/**
 * Writes one frame, skipping every field that has not moved.
 *
 * The diff is not a micro-optimisation, it is what keeps the readout honest:
 * `textContent` and `data-hit` change a handful of times across a whole
 * traverse, and rewriting them every frame would invalidate text layout sixty
 * times a second for no visible change.
 */
function paintFrame(nodes: StageNodes, next: BlochFrame, previous: BlochFrame | null): void {
  const moved = (key: keyof BlochFrame): boolean => previous === null || previous[key] !== next[key];

  if (moved('latitudeFront')) nodes.latitudeFront?.setAttribute('d', next.latitudeFront);
  if (moved('latitudeBack')) nodes.latitudeBack?.setAttribute('d', next.latitudeBack);

  // Both copies of the vector receive identical geometry. Depth is linear and
  // vanishes at the origin, so the arrow is never half in front and half
  // behind; only the two opacities differ, and they crossfade.
  if (moved('shaft')) {
    nodes.frontShaft?.setAttribute('d', next.shaft);
    nodes.backShaft?.setAttribute('d', next.shaft);
  }
  if (moved('head')) {
    nodes.frontHead?.setAttribute('transform', next.head);
    nodes.backHead?.setAttribute('transform', next.head);
  }
  if (moved('frontOpacity')) {
    nodes.frontGroup?.setAttribute('stroke-opacity', next.frontOpacity);
    nodes.frontGroup?.setAttribute('fill-opacity', next.frontOpacity);
  }
  if (moved('backOpacity')) {
    nodes.backGroup?.setAttribute('stroke-opacity', next.backOpacity);
    nodes.backGroup?.setAttribute('fill-opacity', next.backOpacity);
  }

  if (moved('barZero')) nodes.barZero?.setAttribute('width', next.barZero);
  if (moved('barOne')) nodes.barOne?.setAttribute('width', next.barOne);
  if (moved('readZero') && nodes.readZero) nodes.readZero.textContent = next.readZero;
  if (moved('readOne') && nodes.readOne) nodes.readOne.textContent = next.readOne;
  if (moved('readTheta') && nodes.readTheta) nodes.readTheta.textContent = next.readTheta;

  if (moved('hitZero')) nodes.hitZero?.setAttribute('data-hit', next.hitZero);
  if (moved('hitOne')) nodes.hitOne?.setAttribute('data-hit', next.hitOne);
  if (moved('hitPlus')) nodes.hitPlus?.setAttribute('data-hit', next.hitPlus);
}

/** Everything that survives between frames. None of it is React state. */
interface Motion {
  progress: number;
  phi: number;
  targetPhi: number;
  frame: number;
  previous: BlochFrame | null;
}

export function BlochStage({ domain, active }: StageProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<StageNodes>(emptyNodes());
  const motionRef = useRef<Motion>({
    progress: STATIC_PROGRESS,
    phi: 0,
    targetPhi: 0,
    frame: 0,
    previous: null,
  });
  /** Set by the scroll effect, called by the pointer effect. */
  const scheduleRef = useRef<(() => void) | null>(null);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  /* ── The scroll channel ──────────────────────────────────────────────────
     Not gated on `active`, and that is the whole difference between a state
     and a diagram of one. This world's local progress spans its *entire*
     ownership window — the move that brings the panel in, its centred dwell,
     and the move that takes it out — and only that full span carries the
     story: |0⟩ as the panel arrives, |+⟩ while it is held, |1⟩ as it leaves.
     Gating on `active` froze the sphere at |+⟩ for the two moves the reader
     can plainly see it during, so p = 0 and p = 1 were never drawn at all.

     This does not break MOTION_SYSTEM §4. What §4 forbids an inactive stage is
     *animating* — a loop, a timer, an rAF that runs on its own clock. There is
     none here: a scroll update paints once and stops. `StageFrame` already
     subscribes to this same channel for every stage regardless of `active`,
     which is the framework's own statement that progress flows always and
     `active` gates animation. And while the world is off its window, progress
     clamps and the frame is byte-identical to the last, so the attribute diff
     writes nothing at all.
     ─────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (reducedMotion) return;

    const index = traverseIndexOf(domain.id);
    if (index < 0) return;

    const nodes = nodesRef.current;
    const motion = motionRef.current;

    const paint = (): void => {
      const next = blochFrame(motion.progress, motion.phi);
      paintFrame(nodes, next, motion.previous);
      motion.previous = next;
    };

    const schedule = (): void => {
      if (motion.frame === 0) motion.frame = requestAnimationFrame(tick);
    };

    function tick(): void {
      motion.frame = 0;
      if (motion.phi !== motion.targetPhi) {
        const delta = motion.targetPhi - motion.phi;
        motion.phi = Math.abs(delta) < PHI_EPSILON ? motion.targetPhi : motion.phi + delta * PHI_EASE;
      }
      paint();
      // The only reason to ask for another frame: φ is still easing home.
      // Scroll alone paints once and the loop stands down.
      if (motion.phi !== motion.targetPhi) schedule();
    }

    scheduleRef.current = schedule;

    const unsubscribe = subscribeStageProgress(index, (value) => {
      if (value === null) {
        // The traverse has stood down. Hand the stage back to the still it was
        // server-rendered as rather than freezing it mid-rotation.
        motion.progress = STATIC_PROGRESS;
        motion.phi = 0;
        motion.targetPhi = 0;
        paint();
        return;
      }
      motion.progress = value;
      schedule();
    });

    return () => {
      unsubscribe();
      scheduleRef.current = null;
      if (motion.frame !== 0) cancelAnimationFrame(motion.frame);
      motion.frame = 0;
      motion.progress = STATIC_PROGRESS;
      motion.phi = 0;
      motion.targetPhi = 0;
      paintFrame(nodes, STATIC_FRAME, motion.previous);
      motion.previous = STATIC_FRAME;
    };
  }, [domain.id, reducedMotion]);

  /* ── The pointer ─────────────────────────────────────────────────────────
     This one *is* gated on `active`, because φ is an interaction and only the
     centred world is the one being interacted with. Nothing is attached to the
     other four (MOTION_SYSTEM §4), and leaving eases φ back to zero rather
     than dropping it, so a world that scrolls away does not snap.
     ─────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const root = frameRef.current;
    if (!active || reducedMotion || !root) return;

    const motion = motionRef.current;

    const handlePointer = (event: PointerEvent): void => {
      const rect = root.getBoundingClientRect();
      if (rect.width <= 0) return;
      motion.targetPhi = azimuthFromPointer((event.clientX - rect.left) / rect.width);
      scheduleRef.current?.();
    };

    const handleRelease = (): void => {
      motion.targetPhi = 0;
      scheduleRef.current?.();
    };

    // Passive, so a touch drag over the sphere scrolls the page normally: this
    // stage can never swallow a scroll gesture. `pointerdown` as well as
    // `pointermove` so a tap reaches the same state a hover does.
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
      {/* ── Behind the sphere ──────────────────────────────────────────────
          Document order is the depth order. Every stroke here is dimmer than
          its twin in front, and the curves are dashed, which is the whole of
          how the sphere reads as a volume rather than as a disc. */}
      <path
        className="tw-bl-arc"
        data-arc="equator"
        data-face="back"
        d={EQUATOR.back}
        transform={EQUATOR.transform}
        strokeOpacity="0.22"
      />
      <path
        className="tw-bl-arc"
        data-arc="meridian"
        data-face="back"
        d={MERIDIAN.back}
        transform={MERIDIAN.transform}
        strokeOpacity="0.16"
      />
      <path
        className="tw-bl-lat"
        data-face="back"
        ref={(node) => {
          nodesRef.current.latitudeBack = node;
        }}
        d={STATIC_FRAME.latitudeBack}
        strokeOpacity="0.14"
      />
      <path className="tw-bl-axis" data-face="back" d={AXIS_X.back} strokeOpacity="0.16" />
      <path className="tw-bl-axis" data-face="back" d={AXIS_Z.back} strokeOpacity="0.16" />
      <g
        className="tw-bl-vector"
        data-face="back"
        ref={(node) => {
          nodesRef.current.backGroup = node;
        }}
        strokeOpacity={STATIC_FRAME.backOpacity}
        fillOpacity={STATIC_FRAME.backOpacity}
      >
        <path
          className="tw-bl-shaft"
          ref={(node) => {
            nodesRef.current.backShaft = node;
          }}
          d={STATIC_FRAME.shaft}
        />
        <path
          className="tw-bl-head"
          ref={(node) => {
            nodesRef.current.backHead = node;
          }}
          d={ARROW_HEAD_PATH}
          transform={STATIC_FRAME.head}
        />
      </g>

      {/* The glass. A wash at 10% is what separates the two halves without
          hiding either — the back strokes read through it, dimmed, which is
          exactly what being behind something looks like. */}
      <circle className="tw-bl-veil" cx={BLOCH_CX} cy={BLOCH_CY} r={BLOCH_R} fillOpacity="0.1" />
      {/* The silhouette, and the one element the arrival animation draws.
          `pathLength` lets the shared `tw-draw` keyframe run over a circle. */}
      <circle className="tw-bl-limb" cx={BLOCH_CX} cy={BLOCH_CY} r={BLOCH_R} pathLength={100} strokeOpacity="0.45" />

      {/* ── In front of it ─────────────────────────────────────────────── */}
      <path
        className="tw-bl-arc"
        data-arc="equator"
        data-face="front"
        d={EQUATOR.front}
        transform={EQUATOR.transform}
        strokeOpacity="0.55"
      />
      <path
        className="tw-bl-arc"
        data-arc="meridian"
        data-face="front"
        d={MERIDIAN.front}
        transform={MERIDIAN.transform}
        strokeOpacity="0.34"
      />
      <path
        className="tw-bl-lat"
        data-face="front"
        ref={(node) => {
          nodesRef.current.latitudeFront = node;
        }}
        d={STATIC_FRAME.latitudeFront}
        strokeOpacity="0.3"
      />
      <path className="tw-bl-axis" data-face="front" d={AXIS_X.front} strokeOpacity="0.42" />
      <path className="tw-bl-axis" data-face="front" d={AXIS_Z.front} strokeOpacity="0.42" />
      <g
        className="tw-bl-vector"
        data-face="front"
        ref={(node) => {
          nodesRef.current.frontGroup = node;
        }}
        strokeOpacity={STATIC_FRAME.frontOpacity}
        fillOpacity={STATIC_FRAME.frontOpacity}
      >
        <path
          className="tw-bl-shaft"
          ref={(node) => {
            nodesRef.current.frontShaft = node;
          }}
          d={STATIC_FRAME.shaft}
        />
        <path
          className="tw-bl-head"
          ref={(node) => {
            nodesRef.current.frontHead = node;
          }}
          d={ARROW_HEAD_PATH}
          transform={STATIC_FRAME.head}
        />
      </g>

      <g className="tw-bl-labels">
        {BLOCH_LABELS.map((label) => (
          <text
            key={label.id}
            className="tw-bl-label"
            data-label={label.id}
            data-hit={
              label.id === 'zero'
                ? STATIC_FRAME.hitZero
                : label.id === 'one'
                  ? STATIC_FRAME.hitOne
                  : STATIC_FRAME.hitPlus
            }
            ref={(node) => {
              if (label.id === 'zero') nodesRef.current.hitZero = node;
              else if (label.id === 'one') nodesRef.current.hitOne = node;
              else nodesRef.current.hitPlus = node;
            }}
            x={label.x}
            y={label.y}
            textAnchor={label.anchor}
          >
            {label.text}
          </text>
        ))}
      </g>

      {/* The readout. Driven by θ alone, which is why it does not move while
          the pointer does — the picture and the numbers agree about what a
          measurement would give, and both ignore φ. */}
      <g className="tw-bl-readout">
        <text className="tw-annot" x={READOUT_X} y={60}>
          |0⟩
        </text>
        <text
          className="tw-annot"
          ref={(node) => {
            nodesRef.current.readZero = node;
          }}
          x={READOUT_X + READOUT_WIDTH}
          y={60}
          textAnchor="end"
        >
          {STATIC_FRAME.readZero}
        </text>
        <rect className="tw-bl-track" x={READOUT_X} y={66} width={READOUT_WIDTH} height={3} />
        <rect
          className="tw-bl-bar"
          ref={(node) => {
            nodesRef.current.barZero = node;
          }}
          x={READOUT_X}
          y={66}
          width={STATIC_FRAME.barZero}
          height={3}
        />

        <text className="tw-annot" x={READOUT_X} y={92}>
          |1⟩
        </text>
        <text
          className="tw-annot"
          ref={(node) => {
            nodesRef.current.readOne = node;
          }}
          x={READOUT_X + READOUT_WIDTH}
          y={92}
          textAnchor="end"
        >
          {STATIC_FRAME.readOne}
        </text>
        <rect className="tw-bl-track" x={READOUT_X} y={98} width={READOUT_WIDTH} height={3} />
        <rect
          className="tw-bl-bar"
          ref={(node) => {
            nodesRef.current.barOne = node;
          }}
          x={READOUT_X}
          y={98}
          width={STATIC_FRAME.barOne}
          height={3}
        />

        <text className="tw-annot" x={READOUT_X} y={132}>
          θ
        </text>
        <text
          className="tw-annot"
          ref={(node) => {
            nodesRef.current.readTheta = node;
          }}
          x={READOUT_X + READOUT_WIDTH}
          y={132}
          textAnchor="end"
        >
          {STATIC_FRAME.readTheta}
        </text>
      </g>
    </StageFrame>
  );
}
