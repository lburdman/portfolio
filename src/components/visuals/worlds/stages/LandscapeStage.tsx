import { useEffect, useRef } from 'react';
import { StageFrame, type StageProps } from '../StageFrame';
import { STAGE_HEIGHT, STAGE_WIDTH } from '../stage-geometry';
import { subscribeStageProgress, traverseIndexOf } from '../traverse';
import {
  boundaryPath,
  capacityFor,
  clampToPlot,
  contourPath,
  crosshairPath,
  FIT_BAR_Y,
  FIT_ORIGIN_X,
  fitBarPath,
  FOOT_AXIS_Y,
  FOOT_TICK,
  FOOT_TICK_COUNT,
  GLYPHS,
  landscapeAt,
  type Landscape,
  marginPath,
  PLOT,
  RESTING_QUERY,
  flagLit,
  FLAGGED,
} from '../../../../lib/worlds/decision-landscape';

/**
 * AI / Machine Learning — a nonlinear decision landscape, fitted by scrolling.
 *
 * ── WHY THIS AND NOT THE PICTURE BEFORE IT ─────────────────────────────────
 * Two earlier stages were retired here. The first drew points joined to their
 * nearest neighbours: *adjacency is a property of any point set*, so nothing
 * had been learned and nothing was being shown. The second drew a forecast and
 * its prediction interval — a truer statement, but a measurement killed it.
 * Its frames at local progress 0.15, 0.50 and 0.88 were **pixel-identical**:
 * the stage read no scroll at all, so a reader who scrolled the dwell without
 * moving a mouse saw a still image. It also read as "a chart with an
 * envelope", which is as much econometrics as machine learning, and it would
 * have made three of the five stages a horizontal line crossing the frame.
 *
 * That earlier file carried a note recording that "a decision boundary over
 * two blobs was rejected — it is the scikit-learn illustration the brief
 * forbids." The rejection was right about what it described and does not reach
 * this. What is drawn here is not a boundary over two blobs. It is a
 * three-class partition whose **shape is driven by the scroll**: it opens as a
 * piecewise-linear nearest-centroid partition with nine points flagged as
 * misclassified, and as the reader descends it bends into a kernel boundary,
 * the flags go out one at a time, and the fit meter at the foot fills from
 * 85.0% to 100%.
 *
 * **The scroll is the fit.** That is the strongest use the local progress
 * channel gets anywhere on the band, and it is the whole reason this stage
 * exists in this form.
 *
 * ── WHAT IS ON SCREEN ──────────────────────────────────────────────────────
 *   - a feature graticule, for the glyphs to be positioned against;
 *   - two margin iso-contours, the "confidence corridor" either side of the
 *     partition — muted, never the accent;
 *   - **exactly one accent object**: the decision boundary, in three subpaths,
 *     one per class pair;
 *   - sixty class glyphs, in three deliberately unalike marks;
 *   - nine corner-bracket flags on the points the linear model gets wrong;
 *   - a query crosshair and its margin — how far that point is from being
 *     called something else;
 *   - a foot axis and the fit meter.
 *
 * The three glyph marks are a disc, an open ring and a cross, and they are
 * that unalike on purpose. An earlier pass used a disc, a ring and a diamond
 * separated only by radius; screenshotted at the true 320px frame those three
 * collapse into "same grey speck", and the picture degrades into dots either
 * side of a curve — which is exactly the scikit-learn illustration being
 * avoided. Size ordering could not carry it, so the marks differ in kind:
 * solid, hollow, linear.
 *
 * The stage renders no words in any language, for the reason the electronics
 * stage does not: a label here would be English hardcoded into a decorative
 * SVG, outside the dictionaries.
 *
 * ── TECHNOLOGY ─────────────────────────────────────────────────────────────
 * SVG, not canvas — the hero owns the one animating-canvas slot
 * (MOTION_SYSTEM §4). The posterior is solved at build time by
 * `scripts/gen-decision-landscape.mjs` into a typed constant module; nothing
 * here evaluates a kernel. Per frame this writes about fifteen SVG
 * **presentation attributes** through refs and never sets React state, so a
 * scroll costs no render and no reconciliation.
 *
 * Presentation attributes and not `style`: the site ships a hash-based CSP
 * with no `'unsafe-inline'` and no `'unsafe-hashes'`, under which every inline
 * `style=""` attribute is dropped — silently, and only in production, because
 * `astro dev` serves no policy. Astro server-renders this island, and React's
 * `renderToString` turns a `style` prop into exactly such an attribute. There
 * is no `style` anywhere in this file, and `tests/worlds.test.ts` asserts it.
 *
 * The flags' `opacity` is written per frame, so the stylesheet must not also
 * declare `opacity` on `.tw-dl-flag` — a CSS declaration outranks a
 * presentation attribute, and the writes would silently do nothing.
 */

/* ── The resting picture ─────────────────────────────────────────────────—
   Capacity 1: fully fitted boundary, contours at their final offsets, no flag
   lit, meter full, crosshair at rest.

   This is what the server renders, what the first client frame renders (so
   hydration matches), what a reader with JavaScript off sees, and what
   reduced-motion and the stacked mobile composition get — none of those has a
   traverse publishing progress. It is also what the stage returns to when the
   traverse stands down and sends `null`, rather than freezing on whatever
   half-fitted partition the last scroll left behind. ------------------- */
const RESTING_CAPACITY = 1;

const GRID_COLUMNS = 4;
const GRID_ROWS = 3;

/** Corner brackets, at the same corner-tick idiom the stage frame itself uses. */
const FLAG_REACH = 4.2;
const FLAG_ARM = 2.9;

function flagPath(x: number, y: number): string {
  const l = x - FLAG_REACH;
  const r = x + FLAG_REACH;
  const t = y - FLAG_REACH;
  const b = y + FLAG_REACH;
  return (
    `M${l} ${t + FLAG_ARM}L${l} ${t}L${l + FLAG_ARM} ${t}` +
    `M${r - FLAG_ARM} ${t}L${r} ${t}L${r} ${t + FLAG_ARM}` +
    `M${r} ${b - FLAG_ARM}L${r} ${b}L${r - FLAG_ARM} ${b}` +
    `M${l + FLAG_ARM} ${b}L${l} ${b}L${l} ${b - FLAG_ARM}`
  );
}

/** A filled disc, an open ring and a cross — solid, hollow, linear. */
const DISC_R = 2.3;
const RING_R = 3.2;
const CROSS_ARM = 3.6;

/* Baked once at module scope: none of this depends on capacity, a pointer or a
   frame. */
const GRID_LINES = (() => {
  const vertical = Array.from({ length: GRID_COLUMNS - 1 }, (_, i) => PLOT.x + (PLOT.width * (i + 1)) / GRID_COLUMNS);
  const horizontal = Array.from({ length: GRID_ROWS - 1 }, (_, i) => PLOT.y + (PLOT.height * (i + 1)) / GRID_ROWS);
  return { vertical, horizontal };
})();

const FOOT_TICKS = Array.from({ length: FOOT_TICK_COUNT }, (_, i) => PLOT.x + (PLOT.width * i) / (FOOT_TICK_COUNT - 1));

const FLAG_PATHS = FLAGGED.map((glyph) => flagPath(glyph.x, glyph.y));

const RESTING_LANDSCAPE = landscapeAt(RESTING_CAPACITY);

/** The resting picture's six path strings, built once for every render of it. */
const RESTING_PATHS = {
  boundary: boundaryPath(RESTING_LANDSCAPE.boundary),
  inner: contourPath(RESTING_LANDSCAPE.boundary, RESTING_LANDSCAPE.offsets, 0),
  outer: contourPath(RESTING_LANDSCAPE.boundary, RESTING_LANDSCAPE.offsets, 1),
  fit: fitBarPath(RESTING_CAPACITY),
  cross: crosshairPath(RESTING_QUERY.x, RESTING_QUERY.y),
  margin: marginPath(RESTING_QUERY.x, RESTING_QUERY.y, RESTING_LANDSCAPE.boundary),
} as const;

export function LandscapeStage({ domain, active }: StageProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const boundaryRef = useRef<SVGPathElement | null>(null);
  const scanRef = useRef<SVGPathElement | null>(null);
  const innerRef = useRef<SVGPathElement | null>(null);
  const outerRef = useRef<SVGPathElement | null>(null);
  const fitRef = useRef<SVGPathElement | null>(null);
  const marginRef = useRef<SVGPathElement | null>(null);
  const crossRef = useRef<SVGPathElement | null>(null);
  const queryRef = useRef<SVGCircleElement | null>(null);
  const flagsRef = useRef<(SVGPathElement | null)[]>([]);

  /* The two things a frame reads. Refs rather than state on purpose: a scroll
     tick must not re-render sixty glyphs to move one curve. */
  const landscapeRef = useRef<Landscape>(RESTING_LANDSCAPE);
  const queryPointRef = useRef<{ x: number; y: number }>({ ...RESTING_QUERY });

  /* ── The scroll channel ─────────────────────────────────────────────────
     One subscription to `traverse.ts`'s registry, and the raw number: this
     stage recomputes a path from it, which no CSS custom property could have
     carried. That registry is the only progress channel the band has. */
  useEffect(() => {
    const index = traverseIndexOf(domain.id);
    if (index < 0) return;

    const drawMargin = () => {
      const node = marginRef.current;
      if (!node) return;
      const point = queryPointRef.current;
      node.setAttribute('d', marginPath(point.x, point.y, landscapeRef.current.boundary));
    };

    const draw = (progress: number | null) => {
      // `null` is the traverse standing down. Back to the resting picture,
      // rather than leaving the partition frozen half-fitted.
      const lambda = progress === null ? RESTING_CAPACITY : capacityFor(progress);
      const landscape = landscapeAt(lambda);
      landscapeRef.current = landscape;

      const d = boundaryPath(landscape.boundary);
      boundaryRef.current?.setAttribute('d', d);
      scanRef.current?.setAttribute('d', d);
      innerRef.current?.setAttribute('d', contourPath(landscape.boundary, landscape.offsets, 0));
      outerRef.current?.setAttribute('d', contourPath(landscape.boundary, landscape.offsets, 1));
      fitRef.current?.setAttribute('d', fitBarPath(lambda));

      flagsRef.current.forEach((node, flag) => {
        node?.setAttribute('opacity', flagLit(flag, lambda) ? '1' : '0');
      });

      drawMargin();
    };

    return subscribeStageProgress(index, draw);
  }, [domain.id]);

  /* ── The pointer ────────────────────────────────────────────────────────
     Its own listener rather than `usePointerField`, which is otherwise the
     shared hook for this: that hook answers through React state, which is one
     render of the whole stage per pointer frame. Here the pointer moves four
     attributes and nothing re-renders.

     The contract from MOTION_SYSTEM §4 is unchanged and is what the `active`
     guard below enforces: **an inactive stage attaches nothing.** Listeners
     are passive, so a touch drag over the stage still scrolls the page, and
     `pointerdown` is handled as well as `pointermove` so a tap reaches the
     same state a hover does. */
  useEffect(() => {
    const root = rootRef.current;
    if (!active || !root) return;
    const svg = root.querySelector('svg');
    if (!svg) return;

    let frame = 0;
    let pending: { x: number; y: number } | null = null;

    const apply = (point: { x: number; y: number }) => {
      queryPointRef.current = point;
      crossRef.current?.setAttribute('d', crosshairPath(point.x, point.y));
      queryRef.current?.setAttribute('cx', point.x.toFixed(1));
      queryRef.current?.setAttribute('cy', point.y.toFixed(1));
      marginRef.current?.setAttribute('d', marginPath(point.x, point.y, landscapeRef.current.boundary));
    };

    const flush = () => {
      frame = 0;
      if (!pending) return;
      const next = pending;
      pending = null;
      apply(next);
    };

    const handleMove = (event: PointerEvent) => {
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pending = clampToPlot(
        ((event.clientX - rect.left) / rect.width) * STAGE_WIDTH,
        ((event.clientY - rect.top) / rect.height) * STAGE_HEIGHT,
      );
      if (frame === 0) frame = requestAnimationFrame(flush);
    };

    const handleRelease = () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      frame = 0;
      pending = null;
      apply({ ...RESTING_QUERY });
    };

    svg.addEventListener('pointermove', handleMove, { passive: true });
    svg.addEventListener('pointerdown', handleMove, { passive: true });
    svg.addEventListener('pointerleave', handleRelease, { passive: true });
    svg.addEventListener('pointercancel', handleRelease, { passive: true });

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      svg.removeEventListener('pointermove', handleMove);
      svg.removeEventListener('pointerdown', handleMove);
      svg.removeEventListener('pointerleave', handleRelease);
      svg.removeEventListener('pointercancel', handleRelease);
      handleRelease();
    };
  }, [active]);

  return (
    <StageFrame domain={domain} active={active} frameRef={rootRef}>
      <g className="tw-dl-grid">
        {GRID_LINES.vertical.map((x) => (
          <line key={`v${x}`} x1={x} y1={PLOT.y} x2={x} y2={PLOT.y + PLOT.height} />
        ))}
        {GRID_LINES.horizontal.map((y) => (
          <line key={`h${y}`} x1={PLOT.x} y1={y} x2={PLOT.x + PLOT.width} y2={y} />
        ))}
      </g>

      {/* The confidence corridor. Two levels of one field, so the wider one is
          drawn first and the narrower reads as sitting inside it. */}
      <path ref={outerRef} className="tw-dl-contour" data-level="outer" d={RESTING_PATHS.outer} />
      <path ref={innerRef} className="tw-dl-contour" data-level="inner" d={RESTING_PATHS.inner} />

      <g className="tw-dl-glyphs">
        {GLYPHS.map((glyph, index) => {
          if (glyph.klass === 0) {
            return <circle key={index} className="tw-dl-glyph" data-class="0" cx={glyph.x} cy={glyph.y} r={DISC_R} />;
          }
          if (glyph.klass === 1) {
            return <circle key={index} className="tw-dl-glyph" data-class="1" cx={glyph.x} cy={glyph.y} r={RING_R} />;
          }
          return (
            <path
              key={index}
              className="tw-dl-glyph"
              data-class="2"
              d={
                `M${glyph.x - CROSS_ARM} ${glyph.y}L${glyph.x + CROSS_ARM} ${glyph.y}` +
                `M${glyph.x} ${glyph.y - CROSS_ARM}L${glyph.x} ${glyph.y + CROSS_ARM}`
              }
            />
          );
        })}
      </g>

      {/* Always mounted, never conditionally rendered: nine `opacity` writes a
          frame is a cheaper and steadier thing than nine elements entering and
          leaving the tree as the reader scrolls back and forth. They rest at 0
          — the resting picture is the fitted one, in which nothing is wrong. */}
      <g className="tw-dl-flags">
        {FLAG_PATHS.map((d, index) => (
          <path
            key={index}
            ref={(node) => {
              flagsRef.current[index] = node;
            }}
            className="tw-dl-flag"
            d={d}
            opacity="0"
          />
        ))}
      </g>

      <path ref={boundaryRef} className="tw-dl-boundary" d={RESTING_PATHS.boundary} pathLength={100} />

      {/* Ambient, and rendered only while the stage is active, so nothing here
          has a resting state that depends on an animation running
          (MOTION_SYSTEM §6). It re-walks the partition the model has settled
          on — the one pass over the data that is never finished.

          It mounts holding the boundary the frame is CURRENTLY drawing, not
          `RESTING_PATHS.boundary`. The stage becomes active at the centred
          hold, where progress is about 0.5 and `capacityFor` has already moved
          λ to 0.53, so seeding from the resting λ=1 constant laid a λ=1
          highlight over a λ=0.53 partition until the next scroll tick
          repainted it. `landscapeRef` is the same value `draw` last wrote. */}
      {active ? (
        <path ref={scanRef} className="tw-dl-scan" d={boundaryPath(landscapeRef.current.boundary)} pathLength={100} />
      ) : null}

      <path ref={marginRef} className="tw-dl-margin" d={RESTING_PATHS.margin} />
      <path ref={crossRef} className="tw-dl-cross" d={RESTING_PATHS.cross} />
      <circle ref={queryRef} className="tw-dl-query" cx={RESTING_QUERY.x} cy={RESTING_QUERY.y} r={1.9} />

      <line className="tw-rule" x1={PLOT.x} y1={FOOT_AXIS_Y} x2={PLOT.x + PLOT.width} y2={FOOT_AXIS_Y} />
      <g className="tw-dl-ticks">
        {FOOT_TICKS.map((x) => (
          <line key={x} x1={x} y1={FOOT_AXIS_Y} x2={x} y2={FOOT_AXIS_Y + FOOT_TICK} />
        ))}
      </g>

      {/* The meter, its track, and a notch at the fit the reader started from —
          without that reference the bar is just long, and the fifteen points it
          travels are invisible. */}
      <line className="tw-dl-fit-track" x1={PLOT.x} y1={FIT_BAR_Y} x2={PLOT.x + PLOT.width} y2={FIT_BAR_Y} />
      <line
        className="tw-dl-fit-origin"
        x1={FIT_ORIGIN_X}
        y1={FIT_BAR_Y - 3.5}
        x2={FIT_ORIGIN_X}
        y2={FIT_BAR_Y + 3.5}
      />
      <path ref={fitRef} className="tw-dl-fit" d={RESTING_PATHS.fit} />
    </StageFrame>
  );
}
