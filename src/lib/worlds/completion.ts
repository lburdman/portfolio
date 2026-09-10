/**
 * A completion grid — the arithmetic behind the Product stage.
 *
 * ── WHAT THIS DOMAIN'S HONEST ARTIFACT IS ──────────────────────────────────
 * Every other world on the band draws its subject directly: a decision
 * boundary, a state vector, a routed net, a signal chain, a spectrum. Product
 * has no such object. The software itself is a screenshot, and a screenshot of
 * an interface says nothing an interface does not already say better by being
 * used.
 *
 * What it does have is a record of *return*. A calendar matrix — weeks across,
 * days down, a cell filled for every day the thing was used — is the one
 * artifact that distinguishes software someone opens from software someone
 * installed. It is also not a metaphor: it is exactly the habit heatmap the
 * product that motivated this domain renders for its own users, so the picture
 * on the band and the picture in the product are the same picture.
 *
 * ── WHAT IS IN THE DATA, AND WHY IT IS NOT NOISE ───────────────────────────
 * Three properties are authored deliberately, and each one is a claim:
 *
 *   a rising trend   early weeks are sparse and late weeks are dense. A habit
 *                    is acquired, not switched on, and a grid that were
 *                    uniformly full would be a grid nobody had to earn.
 *   a weekend dip    days 5 and 6 of each week are half as likely. The shape
 *                    a real usage grid has is a working week, and its absence
 *                    is the first thing that reads as fabricated.
 *   a longest run    the streak the readout names is measured over the flat
 *                    chronological day sequence, so it can and does cross a
 *                    week boundary — which is what a streak is.
 *
 * ── DETERMINISM ────────────────────────────────────────────────────────────
 * The grid is generated from a seeded LCG at module scope, never from
 * `Math.random()`. The island is server-rendered by Astro and hydrated in the
 * browser, and a grid that differed between the two passes would make React
 * throw the server markup away. Same reasoning, same generator and same
 * precedent as `signal-chain.ts`. `tests/completion.test.ts` asserts it.
 *
 * ── FOUR PATHS, NOT A HUNDRED AND SIXTY-EIGHT RECTS ────────────────────────
 * 24 × 7 is 168 cells, and 168 `<rect>` elements would be the heaviest stage
 * on the band by an order of magnitude for a picture that never changes after
 * it is drawn. Each *level* is emitted as one `<path>` instead — four nodes
 * for the whole matrix — which is the same trade the audio stage's spectrum
 * already makes for the same reason: "two paths, not twenty-six rects".
 *
 * Only three things move, and each is one attribute write: the cursor around
 * the selected week, the lit bar under it, and the three readout numbers.
 */

import { createRandom, STAGE_WIDTH } from '../../components/visuals/worlds/stage-geometry';

/* ── The matrix ──────────────────────────────────────────────────────────── */

/** Columns. Roughly half a year, which is long enough for a habit to show. */
export const WEEKS = 24;
/** Rows. A week, and the reason the weekend dip is legible at all. */
export const DAYS = 7;

/** Intensity steps above "not used". Four states in total, counting zero. */
export const LEVEL_MAX = 3;

/** Probability that a day is used at all, at the first and last week. */
const ADOPTION_FLOOR = 0.22;
const ADOPTION_CEILING = 0.92;
/** How much less likely days 5 and 6 of a week are than days 0–4. */
const WEEKEND_FACTOR = 0.5;

/**
 * Seed for the grid. Arbitrary, fixed, and load-bearing only in that it must
 * never change between the server render and the hydration of the same build.
 */
export const GRID_SEED = 6091723;

/* ── Geometry, in the shared 320 × 200 stage space ───────────────────────── */

/** Side of one day cell, and the gap between two of them. */
export const CELL = 8;
export const GAP = 2;
/** Centre-to-centre spacing of two cells, in both axes. */
export const PITCH = CELL + GAP;

/** Width and height of the matrix itself — the trailing gap is not drawn. */
export const GRID_WIDTH = WEEKS * PITCH - GAP;
export const GRID_HEIGHT = DAYS * PITCH - GAP;
/** Centred horizontally in the frame, so the matrix is the composition. */
export const GRID_X = (STAGE_WIDTH - GRID_WIDTH) / 2;
export const GRID_Y = 30;

/** The weekly-total strip below the matrix: its baseline and its full height. */
export const BAR_BASE = 142;
export const BAR_MAX = 36;

/** Ticks under the baseline, one every `TICK_EVERY` weeks. */
export const AXIS_TICK = 4;
export const TICK_EVERY = 4;

/** Baseline of the readout row. */
export const READOUT_Y = 166;

/** How far the week cursor reaches above the matrix and below the baseline. */
const CURSOR_OVERHANG = 4;
/** Clearance either side of the cursor's column, so it never touches a cell. */
const CURSOR_MARGIN = 2;

/** Left edge of week `week`'s column of cells. */
export function weekX(week: number): number {
  return GRID_X + clampWeek(week) * PITCH;
}

/** Top edge of day `day`'s row of cells. */
export function dayY(day: number): number {
  const row = Number.isFinite(day) ? Math.min(DAYS - 1, Math.max(0, Math.trunc(day))) : 0;
  return GRID_Y + row * PITCH;
}

/** Clamps to a real column. A pointer that has left the stage picks an end. */
export function clampWeek(week: number): number {
  if (!Number.isFinite(week)) return 0;
  const whole = Math.trunc(week);
  if (whole <= 0) return 0;
  if (whole > WEEKS - 1) return WEEKS - 1;
  return whole;
}

/**
 * Which week a normalised horizontal pointer position selects.
 *
 * Measured against the matrix rather than against the frame, so the column
 * under the cursor is the column the cursor is over — the frame is 320 wide
 * and the matrix is not, and mapping the whole frame would put the selection
 * up to two columns away from the hand at the edges.
 */
export function weekFromPointer(x: number): number {
  // The resting column, spelled out rather than as `STATIC_WEEK`, which is
  // declared below this function.
  if (!Number.isFinite(x)) return WEEKS - 1;
  const local = (x * STAGE_WIDTH - GRID_X) / PITCH;
  return clampWeek(Math.floor(local));
}

/* ── The data ────────────────────────────────────────────────────────────── */

/**
 * Builds the matrix as `[week][day]` intensity levels in `0 … LEVEL_MAX`.
 *
 * Exported for the test rather than for a second caller: a generator whose
 * only invocation is at module scope cannot be shown to be deterministic by
 * calling it once.
 */
export function buildLevels(seed: number): readonly (readonly number[])[] {
  const random = createRandom(seed);
  const weeks: number[][] = [];

  for (let week = 0; week < WEEKS; week += 1) {
    const adoption = ADOPTION_FLOOR + (ADOPTION_CEILING - ADOPTION_FLOOR) * (week / (WEEKS - 1));
    const days: number[] = [];
    for (let day = 0; day < DAYS; day += 1) {
      const chance = adoption * (day >= 5 ? WEEKEND_FACTOR : 1);
      const draw = random();
      // A single draw decides both *whether* the day was used and *how much*,
      // so the two can never disagree: `draw >= chance` is the unused day, and
      // the used range splits into three bands inside it.
      if (draw >= chance) days.push(0);
      else if (draw < chance * 0.3) days.push(3);
      else if (draw < chance * 0.62) days.push(2);
      else days.push(1);
    }
    weeks.push(days);
  }

  return weeks;
}

/** The matrix the stage draws. */
export const LEVELS: readonly (readonly number[])[] = buildLevels(GRID_SEED);

/** The same matrix flattened into chronological day order, for the streak. */
export const DAY_SEQUENCE: readonly number[] = LEVELS.flat();

/** Days used in each week, `0 … DAYS`. */
export const WEEK_TOTALS: readonly number[] = LEVELS.map((week) => week.filter((level) => level > 0).length);

/**
 * The longest run of consecutive used days ending on or before the last day of
 * each week — a running best, so it never goes down as the reader moves right.
 *
 * A streak is a property of the day sequence and not of the columns, so this is
 * measured over {@link DAY_SEQUENCE}: a run that starts on a Friday and ends on
 * the following Tuesday is one streak of five, which is what a reader counting
 * cells with a finger would also find.
 */
export const BEST_STREAK_THROUGH: readonly number[] = (() => {
  const best: number[] = [];
  let run = 0;
  let record = 0;
  for (let week = 0; week < WEEKS; week += 1) {
    for (let day = 0; day < DAYS; day += 1) {
      const level = DAY_SEQUENCE[week * DAYS + day] ?? 0;
      run = level > 0 ? run + 1 : 0;
      if (run > record) record = run;
    }
    best.push(record);
  }
  return best;
})();

/* ── Paths ───────────────────────────────────────────────────────────────── */

/** One axis-aligned rectangle, as a closed subpath. */
export function rectPath(x: number, y: number, width: number, height: number): string {
  return `M${x.toFixed(2)} ${y.toFixed(2)}h${width.toFixed(2)}v${height.toFixed(2)}h${(-width).toFixed(2)}Z`;
}

/** Every cell at one intensity level, as a single path. */
export function levelPath(level: number): string {
  const parts: string[] = [];
  for (let week = 0; week < WEEKS; week += 1) {
    for (let day = 0; day < DAYS; day += 1) {
      if ((LEVELS[week]?.[day] ?? 0) !== level) continue;
      parts.push(rectPath(weekX(week), dayY(day), CELL, CELL));
    }
  }
  return parts.join(' ');
}

/**
 * The four matrix paths, indexed by level. Index 0 is the unused ground and is
 * drawn in the muted ink colour; 1–3 are the accent at three opacities.
 */
export const LEVEL_PATHS: readonly string[] = Array.from({ length: LEVEL_MAX + 1 }, (_, level) => levelPath(level));

/** Height of one week's total bar. */
export function barHeight(week: number): number {
  return ((WEEK_TOTALS[clampWeek(week)] ?? 0) / DAYS) * BAR_MAX;
}

/** One week's bar, as a path. Empty for a week with no use at all. */
export function barPath(week: number): string {
  const height = barHeight(week);
  if (height <= 0) return '';
  return rectPath(weekX(week), BAR_BASE - height, CELL, height);
}

/** Every week's bar as one path — the reference the lit bar is read against. */
export const BARS_PATH: string = Array.from({ length: WEEKS }, (_, week) => barPath(week))
  .filter((part) => part.length > 0)
  .join(' ');

/** Ticks under the baseline, at the centre of every `TICK_EVERY`-th column. */
export const AXIS_TICKS: readonly number[] = Array.from(
  { length: Math.ceil(WEEKS / TICK_EVERY) },
  (_, index) => weekX(index * TICK_EVERY) + CELL / 2,
);

/**
 * The live edge: the most recent day in the matrix, marked whether or not it
 * was used.
 *
 * Deliberately the last cell rather than the last *used* cell. An outline on an
 * empty final square says "today is not finished", which is true of every day
 * anyone looks at this on, and it is the one thing in the picture that is still
 * open.
 */
export const TODAY_PATH: string = rectPath(weekX(WEEKS - 1) - 1, dayY(DAYS - 1) - 1, CELL + 2, CELL + 2);

/** The week the stage rests on with no pointer: the most recent one. */
export const STATIC_WEEK = WEEKS - 1;

export interface CompletionFrame {
  /** The bracket around the selected week, spanning matrix and bar strip. */
  readonly cursor: string;
  /** The selected week's total bar, drawn again in the accent. */
  readonly litBar: string;
  /** Selected week, two digits. */
  readonly readWeek: string;
  /** Days used in that week, over the seven available. */
  readonly readDays: string;
  /** Longest run of consecutive days up to the end of that week. */
  readonly readStreak: string;
}

/**
 * One frame, as a pure function of the selected week.
 *
 * Pure in the strict sense the Bloch stage's mapping is: the same week always
 * produces the same frame, whatever route the pointer took to get there. No
 * easing, no cached previous value, no hysteresis — which is what lets the
 * stage write attributes straight from it and skip a React render entirely.
 */
export function completionFrame(week: number): CompletionFrame {
  const index = clampWeek(week);
  const left = weekX(index) - CURSOR_MARGIN;
  const top = GRID_Y - CURSOR_OVERHANG;
  return {
    cursor: rectPath(left, top, CELL + CURSOR_MARGIN * 2, BAR_BASE + CURSOR_OVERHANG - top),
    litBar: barPath(index),
    readWeek: String(index + 1).padStart(2, '0'),
    readDays: `${WEEK_TOTALS[index] ?? 0}/${DAYS}`,
    readStreak: String(BEST_STREAK_THROUGH[index] ?? 0),
  };
}

/**
 * The still every non-pointer reader gets: server render, reduced motion,
 * coarse pointer, and the stage's own teardown. It is the finished picture —
 * the whole window summarised at its most recent week — not a degraded one.
 */
export const STATIC_FRAME: CompletionFrame = completionFrame(STATIC_WEEK);
