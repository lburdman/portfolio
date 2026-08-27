import { useMemo } from 'react';
import { StageFrame, type StageProps } from '../StageFrame';
import {
  bandHalfWidth,
  createRandom,
  forecastSignal,
  interpolateAt,
  polylinePath,
  ribbonPath,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  type Point,
} from '../stage-geometry';
import { usePointerField } from '../usePointerField';

/**
 * AI / Machine Learning — a forecast and the interval around it.
 *
 * ── WHY THIS AND NOT THE PREVIOUS PICTURE ──────────────────────────────────
 * This stage used to draw points projected into a plane, joined to their
 * nearest neighbours. Two reviews rejected it, and the sharper reason was not
 * that the neural-net graph is a cliché: *adjacency is a property of any point
 * set.* Nothing had been learned, so nothing was being shown. A decision
 * boundary over two blobs was rejected for the neighbouring reason — it is the
 * scikit-learn illustration the brief forbids by name, and it depicts the most
 * generic task in the field.
 *
 * What is drawn instead is the one relationship an ML picture can state
 * without a caption and without overclaiming: **uncertainty grows with
 * horizon.** A series runs left to right; at the `now` rule the solid line
 * stops and a calibrated interval opens rightward, widening as it goes. The
 * realised path keeps running faintly *through* that interval, which is
 * rolling-origin validation drawn rather than captioned — every point past the
 * rule is an observation the forecast was scored against after the fact.
 *
 * The pointer owns the horizon. Further right, visibly wider band, and the
 * bracket at the horizon is the interval's width read off as a length.
 *
 * ── THE HONESTY CONSTRAINT ─────────────────────────────────────────────────
 * The work behind this picture is `energy-demand-forecast`, whose 14-day
 * actual-vs-forecast plot carries a **95% split-conformal** band. It is not
 * quantile regression — that is Future Work in the repository, and the case
 * study was corrected for claiming otherwise (REDESIGN_DECISIONS P0 #3). So
 * this stage draws ONE band and a nested inner one, both from a single
 * widening half-width, and never a family of per-quantile curves: a fan of
 * separately-shaped quantile lines would assert the method the repo does not
 * use. See {@link bandHalfWidth}.
 *
 * The stage also renders no words, in any language, for the reason the
 * electronics stage does not: a label here would be English hardcoded into a
 * decorative SVG, outside the dictionaries.
 *
 * ── TECHNOLOGY ─────────────────────────────────────────────────────────────
 * SVG, not canvas — the hero owns the one animating-canvas slot
 * (MOTION_SYSTEM §4). Every path below is computed once at module scope and
 * reused by every render: the fan's geometry does not depend on the pointer,
 * only how much of it is revealed does, and that is one `clipPath` rectangle
 * whose width is a plain SVG attribute. No path arithmetic per frame, no rAF.
 */

/* ── The plotting frame ──────────────────────────────────────────────────── */

const PLOT_LEFT = 30;
const PLOT_RIGHT = 298;
const MID_Y = 92;
/** Value units → pixels. `forecastSignal` stays inside roughly ±0.8. */
const AMP = 60;
const AXIS_Y = 164;

/**
 * The `now` rule, in the shared stage coordinate space — where the observed
 * series stops and the forecast begins.
 *
 * Defined here and nowhere else. The activation animation opens the fan *from
 * this rule*, but it does so with a widening `clip-path: inset()` whose
 * percentages resolve against the band's own bounding box — and that box
 * starts at this x. So the stylesheet never has to name the coordinate, and
 * there is no copy of it to drift. `tests/worlds.test.ts` asserts the rule, the
 * end of the history and the start of the band all land on the same x.
 */
export const FORECAST_NOW_X = 148;

const SPAN = PLOT_RIGHT - PLOT_LEFT;
const NOW_T = (FORECAST_NOW_X - PLOT_LEFT) / SPAN;

/* ── The interval ────────────────────────────────────────────────────────── */

/** Half-width at the origin: residuals are not zero one step ahead. */
const BAND_BASE = 0.085;
const BAND_SPAN = 0.44;
/** Below 1, so the band widens concavely rather than as a straight cone. */
const BAND_EXPONENT = 0.6;
/** The inner band is the same calibration read at a lower coverage level. */
const INNER_FRACTION = 0.42;

const HISTORY_SAMPLES = 46;
const FUTURE_SAMPLES = 38;
const BAND_SAMPLES = 26;

/** Resting horizon, so an untouched stage already shows an open fan. */
const RESTING_HORIZON = 0.62;
/** A pointer at or left of the rule still leaves a readable sliver of fan. */
const MIN_HORIZON = 0.06;

/* ── The realised series ─────────────────────────────────────────────────── */

/**
 * Residuals, drawn once from a seeded LCG and interpolated. Fixed seed for the
 * reason every other stage has one: the island is server-rendered and then
 * hydrated, and a `Math.random()` here would make the two disagree.
 */
const RESIDUALS = ((): number[] => {
  const random = createRandom(20260827);
  return Array.from({ length: 29 }, () => (random() - 0.5) * 2);
})();

const NOISE_SCALE = 0.062;

const toX = (t: number): number => PLOT_LEFT + t * SPAN;
const toY = (value: number): number => MID_Y - value * AMP;

/** What the model predicts: the structure, without the residual. */
const predicted = (t: number): number => forecastSignal(t);
/** What actually happened: prediction plus the residual it did not capture. */
const realised = (t: number): number => forecastSignal(t) + interpolateAt(RESIDUALS, t) * NOISE_SCALE;

/** Horizon `0 → 1` across the forecast region, for a `t` past the rule. */
const horizonAt = (t: number): number => (t - NOW_T) / (1 - NOW_T);

function sample(from: number, to: number, count: number, valueAt: (t: number) => number): Point[] {
  return Array.from({ length: count }, (_, index) => {
    const t = from + ((to - from) * index) / (count - 1);
    return { x: toX(t), y: toY(valueAt(t)) };
  });
}

/* ── Baked paths ─────────────────────────────────────────────────────────—
   Computed once, at module scope. Nothing below is recomputed by a render, a
   pointer move or a frame. ------------------------------------------------ */

const HISTORY_PATH = polylinePath(sample(0, NOW_T, HISTORY_SAMPLES, realised));
const MEDIAN_PATH = polylinePath(sample(NOW_T, 1, FUTURE_SAMPLES, predicted));
const REALISED_PATH = polylinePath(sample(NOW_T, 1, FUTURE_SAMPLES, realised));

function bandEdges(fraction: number): { upper: Point[]; lower: Point[] } {
  const upper: Point[] = [];
  const lower: Point[] = [];
  for (let index = 0; index < BAND_SAMPLES; index += 1) {
    const t = NOW_T + ((1 - NOW_T) * index) / (BAND_SAMPLES - 1);
    const centre = predicted(t);
    const half = bandHalfWidth(horizonAt(t), BAND_BASE, BAND_SPAN, BAND_EXPONENT) * fraction;
    upper.push({ x: toX(t), y: toY(centre + half) });
    lower.push({ x: toX(t), y: toY(centre - half) });
  }
  return { upper, lower };
}

const OUTER = bandEdges(1);
const INNER = bandEdges(INNER_FRACTION);
const OUTER_PATH = ribbonPath(OUTER.upper, OUTER.lower);
const INNER_PATH = ribbonPath(INNER.upper, INNER.lower);

/** Time graticule: one tick per eighth, so the horizon has something to read against. */
const TICKS = Array.from({ length: 9 }, (_, index) => PLOT_LEFT + (index * SPAN) / 8);

export function ForecastStage({ domain, active }: StageProps) {
  const { ref, field } = usePointerField(active);

  /* The pointer's x, converted into a forecast horizon. Left of the rule the
     horizon bottoms out rather than inverting: there is no such thing as a
     negative horizon, and clamping says so. */
  const horizon = useMemo(() => {
    if (!field.engaged) return RESTING_HORIZON;
    // `field.x` is normalised over the stage element; the SVG preserves its
    // aspect ratio, so scaling by the view box width lands in plot coordinates.
    const t = (field.x * STAGE_WIDTH - PLOT_LEFT) / SPAN;
    if (t <= NOW_T) return MIN_HORIZON;
    return Math.max(MIN_HORIZON, Math.min(1, horizonAt(t)));
  }, [field]);

  const horizonX = FORECAST_NOW_X + horizon * (PLOT_RIGHT - FORECAST_NOW_X);
  const horizonT = NOW_T + horizon * (1 - NOW_T);
  const half = bandHalfWidth(horizon, BAND_BASE, BAND_SPAN, BAND_EXPONENT) * AMP;
  const centreY = toY(predicted(horizonT));
  const upperY = centreY - half;
  const lowerY = centreY + half;

  return (
    <StageFrame domain={domain} active={active} frameRef={ref}>
      {/* The revealed part of the fan. A `<rect>` width is an SVG presentation
          attribute, not an inline `style` — the site's CSP drops those — so the
          horizon can be driven from React without writing one. */}
      <clipPath id={`tw-fan-${domain.id}`}>
        <rect x={PLOT_LEFT - 8} y={0} width={Math.max(0, horizonX - PLOT_LEFT + 8)} height={STAGE_HEIGHT} />
      </clipPath>

      <g className="tw-fc-grid">
        <line x1={PLOT_LEFT} y1={MID_Y - 44} x2={PLOT_RIGHT} y2={MID_Y - 44} />
        <line x1={PLOT_LEFT} y1={MID_Y} x2={PLOT_RIGHT} y2={MID_Y} />
        <line x1={PLOT_LEFT} y1={MID_Y + 44} x2={PLOT_RIGHT} y2={MID_Y + 44} />
      </g>

      {/* The clip sits on the outer group and the activation transform on the
          inner one, so "how far the fan has opened" (CSS, one-shot) and "how
          far the reader has pushed the horizon" (pointer) never multiply. */}
      <g clipPath={`url(#tw-fan-${domain.id})`}>
        <g className="tw-fc-open">
          <path className="tw-fc-band" data-level="outer" d={OUTER_PATH} />
          <path className="tw-fc-band" data-level="inner" d={INNER_PATH} />
          {/* Ambient, and rendered only while the stage is active. The wash
              sweeps out from the rule with the scan below: behind a rolling
              origin the interval is no longer a forecast, it is a horizon that
              has been scored. */}
          {active ? <path className="tw-fc-resolved" d={OUTER_PATH} /> : null}
          <path className="tw-fc-median" d={MEDIAN_PATH} />
        </g>
      </g>

      {/* Deliberately NOT clipped to the horizon: the realised path runs the
          whole width, through the interval, whether or not the fan has been
          opened that far. That is the picture of rolling-origin validation —
          the observations exist, and the forecast is scored against them. */}
      <path className="tw-fc-realised" d={REALISED_PATH} />
      {/* Ambient. Rendered only while the stage is active, so nothing in this
          section has a resting state that depends on an animation running
          (MOTION_SYSTEM §6). It re-walks the realised path from the rule
          outward: each pass is one origin rolling forward. */}
      {active ? <path className="tw-fc-scan" d={REALISED_PATH} pathLength={100} /> : null}

      {/* Observed history. `pathLength` normalises the dash geometry the
          activation draws it with to a plain 0–100 constant in CSS. */}
      <path className="tw-fc-history" d={HISTORY_PATH} pathLength={100} />

      <line className="tw-fc-now" x1={FORECAST_NOW_X} y1={26} x2={FORECAST_NOW_X} y2={AXIS_Y} />

      <g className="tw-fc-horizon">
        <line x1={horizonX} y1={30} x2={horizonX} y2={AXIS_Y} />
        <path
          d={
            `M${(horizonX - 4).toFixed(2)} ${upperY.toFixed(2)} L${(horizonX + 4).toFixed(2)} ${upperY.toFixed(2)} ` +
            `M${horizonX.toFixed(2)} ${upperY.toFixed(2)} L${horizonX.toFixed(2)} ${lowerY.toFixed(2)} ` +
            `M${(horizonX - 4).toFixed(2)} ${lowerY.toFixed(2)} L${(horizonX + 4).toFixed(2)} ${lowerY.toFixed(2)}`
          }
        />
        <circle cx={horizonX} cy={centreY} r={2.2} />
      </g>

      <line className="tw-rule" x1={PLOT_LEFT} y1={AXIS_Y} x2={PLOT_RIGHT} y2={AXIS_Y} />
      <g className="tw-fc-ticks">
        {TICKS.map((x, index) => (
          <line key={index} x1={x} y1={AXIS_Y} x2={x} y2={AXIS_Y + 4} />
        ))}
      </g>
    </StageFrame>
  );
}
