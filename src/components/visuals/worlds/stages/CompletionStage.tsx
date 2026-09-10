import { useEffect, useRef } from 'react';
import { FINE_POINTER_QUERY } from '../../../../lib/motion/media';
import {
  AXIS_TICK,
  AXIS_TICKS,
  BARS_PATH,
  BAR_BASE,
  GRID_WIDTH,
  GRID_X,
  LEVEL_PATHS,
  READOUT_Y,
  STATIC_FRAME,
  STATIC_WEEK,
  TODAY_PATH,
  completionFrame,
  weekFromPointer,
  type CompletionFrame,
} from '../../../../lib/worlds/completion';
import { StageFrame, type StageProps } from '../StageFrame';
import { REDUCED_MOTION_QUERY, useMediaQuery } from '../useMediaQuery';

/**
 * Product & Software — a completion grid, and what it says about return.
 *
 * The matrix is weeks across and days down, one cell per day, filled at three
 * intensities for how much the software was used. Under it, one bar per week,
 * and a readout of three numbers. `src/lib/worlds/completion.ts` holds the
 * data, the geometry and the reason a habit grid is this domain's honest
 * artifact rather than a screenshot of an interface.
 *
 *   pointer  selects a week. The bracket moves to it, its bar lights, and the
 *            three numbers become that week's: which week, how many of its
 *            seven days, and the longest unbroken run of days up to it.
 *   no one   the most recent week, which is the whole window summarised — the
 *            still, not a placeholder.
 *
 * The streak number is the point of the piece. It only ever goes up as the
 * hand moves right, because it is a running best over the flat day sequence,
 * and watching it climb while the columns fill in is the claim this domain
 * makes: software people come back to.
 *
 * ── HOW IT IS DRAWN ────────────────────────────────────────────────────────
 * SVG, and four `<path>` elements for a hundred and sixty-eight cells — one
 * per intensity level. The site's CSP is why it is not canvas (every colour has
 * to come from a stylesheet rule, which SVG reads natively as `--tw-accent`),
 * and the node count is why it is not a hundred and sixty-eight rects. The
 * whole matrix is static after it is drawn, so nothing is lost by baking it.
 *
 * ── HOW IT MOVES ───────────────────────────────────────────────────────────
 * Once per activation, this component renders. After that it never re-renders:
 * the pointer writes **presentation attributes through refs** — five of them,
 * and only the ones that changed. React state per pointer event would re-render
 * the whole matrix to move one bracket, and an inline `style` is dropped
 * outright by the hash-based CSP in production while working perfectly in dev.
 *
 * Same shape as `BlochStage.tsx`: **measure once, then write only.** The
 * handler stores one number and asks for a frame; the frame reads the cached
 * box, picks a column and writes. No `getBoundingClientRect` is ever read on
 * the pointer path — the box is measured on attach, on resize and after a
 * scroll, which is the only thing that moves this panel.
 *
 * There is no `requestAnimationFrame` *loop*. Nothing here eases, so a pointer
 * move paints one frame and the loop stands down; the single pending frame
 * exists only to coalesce events that fire faster than the display refreshes.
 *
 * ── WHEN IT STOPS ──────────────────────────────────────────────────────────
 * `docs/MOTION_SYSTEM.md` §4 and §6, as one predicate. Nothing is attached and
 * no frame is pending unless every one of these holds: this world is the
 * centred one, motion is not reduced, the pointer is fine, the stage is on
 * screen, and the tab is visible. Each of the last two is watched
 * (`IntersectionObserver`, `visibilitychange`) and each "off" path ends in the
 * same `detach()`, so there is no state in which a listener outlives the reason
 * it was attached. Every one of them also settles the grid to the most recent
 * week — the finished still, not whichever column the hand happened to leave.
 *
 * A coarse pointer and a reduced-motion reader get that same still, and it is
 * a complete composition rather than a degraded one: the matrix, the bars and
 * the totals are all already there, and the bracket is on the live edge. There
 * is nothing this stage reveals on hover that it does not also state at rest
 * (MOTION_SYSTEM §7).
 *
 * The two media queries are read through `useSyncExternalStore`, so toggling
 * either at the OS level takes effect without a reload and the effect below is
 * never even constructed for a reader who asked for less motion.
 */

/** Left edge of each readout column, and the right edge its number is set to. */
const READOUT_STEP = 88;
const READOUT_VALUE = 62;
const READOUT_COLUMNS = [
  { key: 'week', label: 'w', x: GRID_X },
  { key: 'days', label: 'd', x: GRID_X + READOUT_STEP },
  { key: 'streak', label: 'n', x: GRID_X + GRID_WIDTH - READOUT_VALUE },
] as const;

/** Every node the pointer writes to. */
interface StageNodes {
  cursor: SVGPathElement | null;
  litBar: SVGPathElement | null;
  readWeek: SVGTextElement | null;
  readDays: SVGTextElement | null;
  readStreak: SVGTextElement | null;
}

function emptyNodes(): StageNodes {
  return { cursor: null, litBar: null, readWeek: null, readDays: null, readStreak: null };
}

/**
 * Writes one frame, skipping every field that has not moved.
 *
 * The diff is not a micro-optimisation, it is what keeps the readout honest:
 * the three numbers change once per column crossed, and rewriting them every
 * frame would invalidate text layout for no visible change.
 */
function paintFrame(nodes: StageNodes, next: CompletionFrame, previous: CompletionFrame | null): void {
  const moved = (key: keyof CompletionFrame): boolean => previous === null || previous[key] !== next[key];

  if (moved('cursor')) nodes.cursor?.setAttribute('d', next.cursor);
  if (moved('litBar')) nodes.litBar?.setAttribute('d', next.litBar);
  if (moved('readWeek') && nodes.readWeek) nodes.readWeek.textContent = next.readWeek;
  if (moved('readDays') && nodes.readDays) nodes.readDays.textContent = next.readDays;
  if (moved('readStreak') && nodes.readStreak) nodes.readStreak.textContent = next.readStreak;
}

/**
 * Everything that survives between frames. None of it is React state.
 *
 * The box is held here rather than read per event, and in *viewport*
 * coordinates because that is what a `PointerEvent` reports. Only the
 * horizontal axis is kept: this stage selects a column, and nothing in it
 * responds to vertical position.
 */
interface Motion {
  /** Pointer position as the last event reported it, in viewport coordinates. */
  pointerX: number;
  /** The stage's cached box. */
  left: number;
  width: number;
  /** Set by scroll and resize; consumed by the next frame, before it writes. */
  boxDirty: boolean;
  /** Whether a pointer is currently over the stage. */
  engaged: boolean;
  frame: number;
  previous: CompletionFrame | null;
}

export function CompletionStage({ domain, active }: StageProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const nodesRef = useRef<StageNodes>(emptyNodes());
  const motionRef = useRef<Motion>({
    pointerX: 0,
    left: 0,
    width: 0,
    boxDirty: true,
    engaged: false,
    frame: 0,
    previous: null,
  });
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const finePointer = useMediaQuery(FINE_POINTER_QUERY);

  /* ── The pointer, and nothing else ───────────────────────────────────────
     Gated on `active`, because only the centred world is the one being
     interacted with, and nothing at all is attached to the other five
     (MOTION_SYSTEM §4). Gated on the two media queries as well, for the reason
     in this file's header: the resting grid is a finished composition and
     there is nothing hover-only to make reachable some other way.
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
      motion.width = rect.width;
      motion.boxDirty = false;
    };

    /* ── Writing ─────────────────────────────────────────────────────────── */
    const paint = (week: number): void => {
      const next = completionFrame(week);
      paintFrame(nodes, next, motion.previous);
      motion.previous = next;
    };

    const schedule = (): void => {
      if (motion.frame === 0 && attached) motion.frame = requestAnimationFrame(tick);
    };

    function tick(): void {
      motion.frame = 0;
      if (motion.boxDirty) measure();

      // A box with no width is a stage laid out to nothing — a breakpoint
      // change caught mid-frame. The resting week is the honest answer; a
      // division by zero would put NaN into the column index.
      const measured = motion.width > 0;
      paint(motion.engaged && measured ? weekFromPointer((motion.pointerX - motion.left) / motion.width) : STATIC_WEEK);
    }

    /* ── Input ─────────────────────────────────────────────────────────────
       One number and a flag. No layout read, no element touched, nothing
       allocated. Passive, so a drag over the grid scrolls the page normally:
       this stage can never swallow a scroll gesture. `pointerdown` as well as
       `pointermove` so a tap reaches the same state a hover does. */
    const handlePointer = (event: PointerEvent): void => {
      motion.pointerX = event.clientX;
      motion.engaged = true;
      schedule();
    };

    const handleRelease = (): void => {
      motion.engaged = false;
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
      motion.engaged = false;
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
      {/* ── The record ─────────────────────────────────────────────────────
          Everything inside this group is the accumulated past, so it is the
          part that arrives on the left-to-right wipe: the grid fills in the
          direction time runs in it. The group carries no transform, which is
          what lets `tw-sweep-in`'s lengths stay plain user units.

          Four paths for the matrix — level 0 is the unused ground, 1 to 3 are
          the accent at three fixed opacities. Three steps and not a ramp: a
          heatmap that reads as a gradient cannot be counted, and the whole
          point of this picture is that it is countable. */}
      <g className="tw-pg-reveal">
        {LEVEL_PATHS.map((path, level) =>
          level === 0 ? (
            <path key={level} className="tw-pg-empty" d={path} />
          ) : (
            <path key={level} className="tw-pg-level" data-level={level} d={path} />
          ),
        )}

        {/* The live edge — the most recent day, marked whether or not it was
            used. It is the one thing in the frame that is not finished yet,
            and the only ambient animation on this stage says exactly that. */}
        <path className="tw-pg-today" d={TODAY_PATH} />

        {/* One bar per week: the same seven days, summed. Deliberately a
            second reading of the same data rather than new data — it is what
            makes the trend legible without asking anyone to count columns. */}
        <path className="tw-pg-bars" d={BARS_PATH} />
      </g>

      {/* The selected week's bar, drawn again in the accent over the muted
          strip. One `d` write per column crossed. No CSS rule may declare `d`
          on this class or on the cursor below: a declaration outranks a
          presentation attribute and the writes would silently do nothing. */}
      <path
        className="tw-pg-lit"
        ref={(node) => {
          nodesRef.current.litBar = node;
        }}
        d={STATIC_FRAME.litBar}
      />

      {/* The bracket. It spans the matrix and the bar strip because the two are
          one column of one week, and a marker on only one of them would invite
          the eye to read them as separate charts. */}
      <path
        className="tw-pg-cursor"
        ref={(node) => {
          nodesRef.current.cursor = node;
        }}
        d={STATIC_FRAME.cursor}
      />

      {/* The baseline the bars stand on, and a tick every fourth week so the
          horizontal axis is time rather than a stripe. */}
      <line className="tw-rule" x1={GRID_X} y1={BAR_BASE} x2={GRID_X + GRID_WIDTH} y2={BAR_BASE} />
      <g className="tw-pg-ticks">
        {AXIS_TICKS.map((x) => (
          <line key={x} x1={x} y1={BAR_BASE} x2={x} y2={BAR_BASE + AXIS_TICK} />
        ))}
      </g>

      {/* The readout: which week, how many of its days, and the longest run of
          consecutive days up to it. Symbols, not words — this stage renders no
          text in any language, for the reason the audio stage renders none. */}
      <g className="tw-pg-readout">
        {READOUT_COLUMNS.map((column) => (
          <text key={column.key} className="tw-annot" x={column.x} y={READOUT_Y}>
            {column.label}
          </text>
        ))}
        <text
          className="tw-annot"
          ref={(node) => {
            nodesRef.current.readWeek = node;
          }}
          x={GRID_X + READOUT_VALUE}
          y={READOUT_Y}
          textAnchor="end"
        >
          {STATIC_FRAME.readWeek}
        </text>
        <text
          className="tw-annot"
          ref={(node) => {
            nodesRef.current.readDays = node;
          }}
          x={GRID_X + READOUT_STEP + READOUT_VALUE}
          y={READOUT_Y}
          textAnchor="end"
        >
          {STATIC_FRAME.readDays}
        </text>
        <text
          className="tw-annot"
          ref={(node) => {
            nodesRef.current.readStreak = node;
          }}
          x={GRID_X + GRID_WIDTH}
          y={READOUT_Y}
          textAnchor="end"
        >
          {STATIC_FRAME.readStreak}
        </text>
      </g>
    </StageFrame>
  );
}
