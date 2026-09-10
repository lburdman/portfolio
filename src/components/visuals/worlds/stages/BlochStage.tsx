import { useEffect, useRef } from 'react';
import { stepEngagement } from '../../../../lib/motion/magnet-field';
import { FINE_POINTER_QUERY } from '../../../../lib/motion/media';
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
  READOUT_WIDTH,
  READOUT_X,
  RESTING_STATE,
  STATIC_FRAME,
  blochFrame,
  pointerState,
  type BlochFrame,
  type BlochState,
} from '../../../../lib/visuals/bloch';
import { StageFrame, type StageProps } from '../StageFrame';
import { REDUCED_MOTION_QUERY, useMediaQuery } from '../useMediaQuery';

/**
 * Quantum Computing — a Bloch sphere the reader's own pointer drives.
 *
 * The state is `|ψ⟩ = cos(θ/2)|0⟩ + e^{iφ} sin(θ/2)|1⟩`, and the two axes of
 * the stage are its two angles: **θ = y·π** — the top edge is |0⟩, the exact
 * middle is |+⟩, an equal superposition, the bottom edge is |1⟩ — and **φ = x**,
 * over a deliberately small ±16°. So the vector points where the hand is, and
 * the probability bars beside it, which are a function of θ alone, rise and fall
 * as the hand rises and falls while staying perfectly still as it crosses. That
 * second fact is the non-geometric statement that φ changes no measurement
 * outcome. `src/lib/visuals/bloch.ts` holds the mapping, and why 16° and not
 * 35°.
 *
 * ── HOW IT IS DRAWN ────────────────────────────────────────────────────────
 * SVG, not canvas, and the reason is the site's CSP: every colour has to come
 * from a stylesheet rule, which SVG reads natively (`--tw-accent`) where canvas
 * would need `getComputedStyle` to launder tokens through JavaScript. SVG also
 * server-renders a correct picture for the no-JS, reduced-motion and coarse-
 * pointer cases, all of which get the |+⟩ still.
 *
 * ── HOW IT MOVES ───────────────────────────────────────────────────────────
 * Once per activation, this component renders. After that it never re-renders:
 * the pointer writes **presentation attributes through refs**. React state per
 * frame would re-render the panel sixty times a second to change fifteen
 * numbers, and an inline `style` — the other obvious way to move something — is
 * dropped outright by the hash-based CSP in production while working perfectly
 * in dev.
 *
 * This file is the DOM half and is deliberately dumb, in the same shape as
 * `src/components/visuals/hero/magnet-lines.ts`: **measure once, then write
 * only.** The handler stores two numbers and asks for a frame; the frame reads
 * the cached box, calls `pointerState`, and writes. No `getBoundingClientRect`
 * is ever read on the pointer path — the box is measured on attach, on resize
 * and after a scroll, which is the only thing that moves this panel — so a
 * pointer crossing the stage forces no layout at all.
 *
 * ── WHEN IT STOPS ──────────────────────────────────────────────────────────
 * `docs/MOTION_SYSTEM.md` §4 and §6, as one predicate. Nothing is attached and
 * no frame is pending unless every one of these holds: this world is the
 * centred one, motion is not reduced, the pointer is fine, the stage is on
 * screen, and the tab is visible. Each of the last two is watched
 * (`IntersectionObserver`, `visibilitychange`) and each "off" path ends in the
 * same `detach()`, so there is no state in which a listener outlives the reason
 * it was attached. Every one of them also settles the sphere to |+⟩ — the
 * finished still, not a frozen half-turn.
 *
 * The two media queries are read through `useSyncExternalStore`, so toggling
 * either at the OS level takes effect without a reload and the effect below is
 * never even constructed for a reader who asked for less motion.
 */

/** Every node the pointer writes to. */
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
 * pass of the hand, and rewriting them every frame would invalidate text layout
 * sixty times a second for no visible change.
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

/**
 * Everything that survives between frames. None of it is React state.
 *
 * The box is held here rather than read per event, and it is held in *viewport*
 * coordinates because that is what a `PointerEvent` reports. It is invalidated
 * by the two things that move this panel — a scroll (the traverse slides the
 * track as the page scrolls) and a resize — and re-read at the top of the next
 * frame, never inside a handler.
 */
interface Motion {
  /** Pointer position as the last event reported it, in viewport coordinates. */
  pointerX: number;
  pointerY: number;
  /** The stage's cached box. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Set by scroll and resize; consumed by the next frame, before it writes. */
  boxDirty: boolean;
  /** The one eased quantity: 0 at rest, 1 while the pointer is over the stage. */
  engagement: number;
  engagementTarget: number;
  frame: number;
  previous: BlochFrame | null;
}

export function BlochStage({ domain, active }: StageProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<StageNodes>(emptyNodes());
  const motionRef = useRef<Motion>({
    pointerX: 0,
    pointerY: 0,
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    boxDirty: true,
    engagement: 0,
    engagementTarget: 0,
    frame: 0,
    previous: null,
  });
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const finePointer = useMediaQuery(FINE_POINTER_QUERY);

  /* ── The pointer, and nothing else ───────────────────────────────────────
     Gated on `active`, because only the centred world is the one being
     interacted with, and nothing at all is attached to the other four
     (MOTION_SYSTEM §4). Gated on the two media queries as well: a reduced-
     motion reader and a coarse-pointer reader both keep the |+⟩ still, which
     is a finished composition rather than a degraded one — there is no
     information in this sphere that the panel's own heading and summary do not
     already carry in text, so there is nothing hover-only to make reachable
     some other way (MOTION_SYSTEM §7).
     ─────────────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const root = frameRef.current;
    if (!active || reducedMotion || !finePointer || !root) return;

    const nodes = nodesRef.current;
    const motion = motionRef.current;

    let attached = false;
    let onScreen = true;

    /* ── Measurement ───────────────────────────────────────────────────────
       The only layout read in the file, and it is never reached from a pointer
       handler. */
    const measure = (): void => {
      const rect = root.getBoundingClientRect();
      motion.left = rect.left;
      motion.top = rect.top;
      motion.width = rect.width;
      motion.height = rect.height;
      motion.boxDirty = false;
    };

    /* ── Writing ─────────────────────────────────────────────────────────── */
    const paint = (state: BlochState): void => {
      const next = blochFrame(state.progress, state.phi);
      paintFrame(nodes, next, motion.previous);
      motion.previous = next;
    };

    const schedule = (): void => {
      if (motion.frame === 0 && attached) motion.frame = requestAnimationFrame(tick);
    };

    function tick(): void {
      motion.frame = 0;
      if (motion.boxDirty) measure();

      motion.engagement = stepEngagement(motion.engagement, motion.engagementTarget);

      // A box with no area is a stage laid out to nothing — a breakpoint change
      // caught mid-frame. Resting is the honest answer; NaN would be written
      // into every coordinate on the sphere.
      const measured = motion.width > 0 && motion.height > 0;
      paint(
        motion.engagement === 0 || !measured
          ? RESTING_STATE
          : pointerState({
              x: (motion.pointerX - motion.left) / motion.width,
              y: (motion.pointerY - motion.top) / motion.height,
              engagement: motion.engagement,
            }),
      );

      // The only reason to ask for another frame: the envelope is still moving.
      // A pointer that has stopped paints once and the loop stands down.
      if (motion.engagement !== motion.engagementTarget) schedule();
    }

    /* ── Input ─────────────────────────────────────────────────────────────
       Two numbers and a flag. No layout read, no element touched, nothing
       allocated. Passive, so a drag over the sphere scrolls the page normally:
       this stage can never swallow a scroll gesture. `pointerdown` as well as
       `pointermove` so a tap reaches the same state a hover does. */
    const handlePointer = (event: PointerEvent): void => {
      motion.pointerX = event.clientX;
      motion.pointerY = event.clientY;
      motion.engagementTarget = 1;
      schedule();
    };

    const handleRelease = (): void => {
      motion.engagementTarget = 0;
      schedule();
    };

    const handleScroll = (): void => {
      motion.boxDirty = true;
    };

    // Scoped to the stage. `window` carries the scroll and the resize, which
    // invalidate a measurement; it never carries a pointer.
    const resizeObserver =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            motion.boxDirty = true;
            schedule();
          })
        : null;

    /** Settle synchronously, without waiting for a frame that may never come. */
    const settleNow = (): void => {
      if (motion.frame !== 0) cancelAnimationFrame(motion.frame);
      motion.frame = 0;
      motion.engagement = 0;
      motion.engagementTarget = 0;
      paintFrame(nodes, STATIC_FRAME, motion.previous);
      motion.previous = STATIC_FRAME;
    };

    const attach = (): void => {
      if (attached) return;
      attached = true;
      motion.boxDirty = true;
      root.addEventListener('pointermove', handlePointer, { passive: true });
      root.addEventListener('pointerdown', handlePointer, { passive: true });
      root.addEventListener('pointerleave', handleRelease, { passive: true });
      root.addEventListener('pointercancel', handleRelease, { passive: true });
      window.addEventListener('scroll', handleScroll, { passive: true });
      resizeObserver?.observe(root);
    };

    const detach = (): void => {
      if (!attached) return;
      attached = false;
      root.removeEventListener('pointermove', handlePointer);
      root.removeEventListener('pointerdown', handlePointer);
      root.removeEventListener('pointerleave', handleRelease);
      root.removeEventListener('pointercancel', handleRelease);
      window.removeEventListener('scroll', handleScroll);
      resizeObserver?.disconnect();
      settleNow();
    };

    /* ── Gating ────────────────────────────────────────────────────────────
       One predicate, and every "off" path ends in `detach()`. */
    const shouldRun = (): boolean => onScreen && !document.hidden;

    const evaluate = (): void => {
      if (shouldRun()) attach();
      else detach();
    };

    const handleVisibility = (): void => {
      evaluate();
    };

    document.addEventListener('visibilitychange', handleVisibility);

    const intersectionObserver =
      typeof IntersectionObserver === 'function'
        ? new IntersectionObserver(
            (entries) => {
              for (const entry of entries) onScreen = entry.isIntersecting;
              evaluate();
            },
            { threshold: 0 },
          )
        : null;

    intersectionObserver?.observe(root);
    evaluate();

    return () => {
      intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
      detach();
      // `detach()` settles only if it was attached; an effect torn down while
      // off screen has nothing to detach and must still hand back the still.
      settleNow();
    };
  }, [active, finePointer, reducedMotion]);

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
