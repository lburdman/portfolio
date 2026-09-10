import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DOMAINS, domainOrdinal, getDomain } from '../src/config/domains';
import { STAGE_HEIGHT, STAGE_INSET, STAGE_WIDTH } from '../src/components/visuals/worlds/stage-geometry';
import {
  AXIS_TICKS,
  BARS_PATH,
  BAR_BASE,
  BAR_MAX,
  BEST_STREAK_THROUGH,
  CELL,
  DAYS,
  DAY_SEQUENCE,
  GRID_SEED,
  GRID_WIDTH,
  GRID_X,
  GRID_Y,
  LEVELS,
  LEVEL_MAX,
  LEVEL_PATHS,
  PITCH,
  READOUT_Y,
  STATIC_FRAME,
  STATIC_WEEK,
  TODAY_PATH,
  WEEKS,
  WEEK_TOTALS,
  barHeight,
  barPath,
  buildLevels,
  clampWeek,
  completionFrame,
  dayY,
  rectPath,
  weekFromPointer,
  weekX,
} from '../src/lib/worlds/completion';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';

/**
 * The Product world's completion grid, and the contracts the picture rests on.
 *
 * Four of these are not ordinary unit tests, and they are why the file exists.
 *
 * 1. **Determinism.** The island is server-rendered and then hydrated. A grid
 *    generated with `Math.random()` would differ between the two passes and
 *    React would throw the server markup away — visibly, as a flash, and only
 *    in a production build. The generator is called twice and compared.
 *
 * 2. **The streak is a property of days, not of columns.** The readout claims a
 *    run of consecutive days, which must be free to cross a week boundary. It
 *    is checked against an independent walk of the flat day sequence rather
 *    than against the implementation's own accumulator.
 *
 * 3. **Statelessness.** The stage writes attributes straight out of
 *    `completionFrame`, with no React render in between, and that is only sound
 *    while a frame is a pure function of the selected week. Sweeping the grid
 *    in both directions and comparing serialised frames is what makes a future
 *    easing or hysteresis fail here rather than in review.
 *
 * 4. **The DOM half.** `CompletionStage.tsx`'s listeners, cached box and
 *    teardown have no seam a node-environment test can pull on — the runner has
 *    no DOM — so they are pinned as source assertions, in the same style as
 *    `tests/bloch.test.ts`. Each is a rule that is invisible in `astro dev` and
 *    only bites on a touch device, a reduced-motion setting or a hidden tab.
 */

/* ===========================================================================
   The axis this domain was added to
   ======================================================================== */

describe('the descent', () => {
  it('opens at product and still ends at the physics', () => {
    expect(DOMAINS.map((domain) => domain.id)).toEqual(['product', 'ai', 'quantum', 'fpga', 'electronics', 'audio']);
  });

  it('numbers every domain from its position, with no gaps', () => {
    // `domainOrdinal` is `layerIndex + 1`, so a mis-set `layerIndex` shows up
    // as a repeated or skipped figure in the navigation, the hero and the
    // layers sequence at once.
    expect(DOMAINS.map(domainOrdinal)).toEqual(['01', '02', '03', '04', '05', '06']);
    expect(DOMAINS.map((domain) => domain.layerIndex)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('gives product its own accent token and its own stage kind', () => {
    const product = getDomain('product');
    expect(product.accentVar).toBe('--color-domain-product');
    expect(product.stage).toBe('completion');
    // No other domain may share either, or two channels of the instrument
    // become one.
    expect(new Set(DOMAINS.map((domain) => domain.stage)).size).toBe(DOMAINS.length);
    expect(new Set(DOMAINS.map((domain) => domain.accentVar)).size).toBe(DOMAINS.length);
  });
});

describe('the sixth accent is a member of the palette, not a new brand', () => {
  const TOKENS = readFileSync(fileURLToPath(new URL('../src/styles/tokens.css', import.meta.url)), 'utf8');

  it('is declared in tokens.css, which is the only place a hex may appear', () => {
    expect(TOKENS).toMatch(/--color-domain-product:\s*#[0-9a-f]{6};/);
  });

  it('carries the same measured-contrast comment every other accent carries', () => {
    // Rule 4 at the head of tokens.css: the ratios in the comments are real
    // measurements, and a token added without one is a token nobody can check.
    expect(TOKENS).toMatch(/on ink[\s\S]{0,120}--color-domain-product: #/);
    expect(TOKENS).toContain('--color-domain-product       6.74      2.13          2.30');
  });
});

describe('both dictionaries name the new layer', () => {
  it.each([
    ['en', en],
    ['es', es],
  ])('%s carries a layer name and a world summary for product', (_locale, t) => {
    expect(t.layers.items.product.layer.length).toBeGreaterThan(0);
    expect(t.layers.items.product.description.length).toBeGreaterThan(0);
    expect(t.worlds.items.product.name.length).toBeGreaterThan(0);
    expect(t.worlds.items.product.summary.length).toBeGreaterThan(0);
  });

  it.each([
    ['en', en],
    ['es', es],
  ])('%s keeps the layer label in the set’s uppercase register', (_locale, t) => {
    const label = t.layers.items.product.layer;
    expect(label).toBe(label.toUpperCase());
    // The existing five are single words except DIGITAL LOGIC; the sixth is one.
    expect(label.split(' ')).toHaveLength(1);
  });

  it.each([
    ['en', en],
    ['es', es],
  ])('%s no longer tells the reader there are five areas', (_locale, t) => {
    // The subtitle counts the domains out loud. A count in copy is a fact that
    // goes stale the moment the array grows, so it is asserted against the array.
    expect(t.worlds.subtitle).not.toMatch(/\b(five|cinco)\b/i);
    expect(t.worlds.subtitle).toMatch(/\b(six|seis)\b/i);
    expect(DOMAINS).toHaveLength(6);
  });
});

/* ===========================================================================
   The data
   ======================================================================== */

describe('the grid is generated, and generated the same way twice', () => {
  it('is bit-identical across two calls with the same seed', () => {
    // The hydration contract. `Math.random()` here would pass every other test
    // in this file and still discard the server markup in the browser.
    expect(buildLevels(GRID_SEED)).toEqual(buildLevels(GRID_SEED));
  });

  it('is a different grid for a different seed, so the seed is really read', () => {
    expect(buildLevels(GRID_SEED + 1)).not.toEqual(buildLevels(GRID_SEED));
  });

  it('is the right shape, with every cell a real level', () => {
    expect(LEVELS).toHaveLength(WEEKS);
    for (const week of LEVELS) {
      expect(week).toHaveLength(DAYS);
      for (const level of week) {
        expect(Number.isInteger(level)).toBe(true);
        expect(level).toBeGreaterThanOrEqual(0);
        expect(level).toBeLessThanOrEqual(LEVEL_MAX);
      }
    }
  });

  it('rises: the habit is acquired rather than switched on', () => {
    // The first quarter against the last. Asserted as a comparison rather than
    // as two numbers, so tuning the adoption curve does not rewrite the test —
    // only reversing or flattening it does.
    const quarter = Math.floor(WEEKS / 4);
    const early = WEEK_TOTALS.slice(0, quarter).reduce((sum, n) => sum + n, 0);
    const late = WEEK_TOTALS.slice(-quarter).reduce((sum, n) => sum + n, 0);
    expect(late).toBeGreaterThan(early);
  });

  it('has a working week in it — the weekend is the shape that reads as real', () => {
    const weekday = LEVELS.reduce((sum, week) => sum + week.slice(0, 5).filter((n) => n > 0).length, 0) / 5;
    const weekend = LEVELS.reduce((sum, week) => sum + week.slice(5).filter((n) => n > 0).length, 0) / 2;
    expect(weekend).toBeLessThan(weekday);
  });

  it('is neither empty nor full, which are the two grids that say nothing', () => {
    const used = DAY_SEQUENCE.filter((level) => level > 0).length;
    expect(used).toBeGreaterThan(DAY_SEQUENCE.length * 0.25);
    expect(used).toBeLessThan(DAY_SEQUENCE.length * 0.9);
    // All three intensities are actually present, or the legend is a fiction.
    for (let level = 1; level <= LEVEL_MAX; level += 1) {
      expect(DAY_SEQUENCE.filter((value) => value === level).length).toBeGreaterThan(0);
    }
  });

  it('counts each week off the matrix rather than off a second source', () => {
    expect(WEEK_TOTALS).toEqual(LEVELS.map((week) => week.filter((level) => level > 0).length));
  });

  it('flattens in chronological order — week-major, then day', () => {
    expect(DAY_SEQUENCE).toHaveLength(WEEKS * DAYS);
    expect(DAY_SEQUENCE[0]).toBe(LEVELS[0]?.[0]);
    expect(DAY_SEQUENCE[DAYS]).toBe(LEVELS[1]?.[0]);
    expect(DAY_SEQUENCE.at(-1)).toBe(LEVELS.at(-1)?.at(-1));
  });
});

describe('the streak', () => {
  /** Longest run of used days in the first `days` of the sequence, walked fresh. */
  const bruteForce = (days: number): number => {
    let run = 0;
    let best = 0;
    for (let i = 0; i < days; i += 1) {
      run = (DAY_SEQUENCE[i] ?? 0) > 0 ? run + 1 : 0;
      if (run > best) best = run;
    }
    return best;
  };

  it('is the longest run of consecutive days, measured independently', () => {
    for (let week = 0; week < WEEKS; week += 1) {
      expect(BEST_STREAK_THROUGH[week], `week ${week}`).toBe(bruteForce((week + 1) * DAYS));
    }
  });

  it('never goes down as the reader moves right', () => {
    // It is a running best, and the readout's whole meaning depends on that:
    // a number that fell would be claiming a streak had been un-earned.
    for (let week = 1; week < WEEKS; week += 1) {
      expect(BEST_STREAK_THROUGH[week] ?? 0).toBeGreaterThanOrEqual(BEST_STREAK_THROUGH[week - 1] ?? 0);
    }
  });

  it('crosses a week boundary, which is what makes it a streak and not a column', () => {
    // A run longer than seven days cannot be contained in one column. Without
    // one, "streak" would be indistinguishable from "a full week", and the
    // flattening would be untested by construction.
    expect(Math.max(...BEST_STREAK_THROUGH)).toBeGreaterThan(DAYS);
  });
});

/* ===========================================================================
   Geometry
   ======================================================================== */

/** Bounds of a path built out of `rectPath` subpaths. */
function pathBounds(d: string): { minX: number; minY: number; maxX: number; maxY: number } {
  const matches = [...d.matchAll(/M(-?[\d.]+) (-?[\d.]+)h(-?[\d.]+)v(-?[\d.]+)h(-?[\d.]+)Z/g)];
  // A path this cannot parse must fail loudly rather than report empty bounds
  // and pass every containment assertion vacuously.
  if (matches.length === 0) throw new Error(`no rectangles found in: ${d.slice(0, 60)}`);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const match of matches) {
    const x = Number(match[1]);
    const y = Number(match[2]);
    const width = Number(match[3]);
    const height = Number(match[4]);
    minX = Math.min(minX, x, x + width);
    maxX = Math.max(maxX, x, x + width);
    minY = Math.min(minY, y, y + height);
    maxY = Math.max(maxY, y, y + height);
  }
  return { minX, minY, maxX, maxY };
}

describe('rectPath', () => {
  it('closes a rectangle with two relative runs and a vertical', () => {
    expect(rectPath(4, 6, 10, 3)).toBe('M4.00 6.00h10.00v3.00h-10.00Z');
  });

  it('is what pathBounds measures, so the containment tests are not circular', () => {
    expect(pathBounds(rectPath(4, 6, 10, 3))).toEqual({ minX: 4, minY: 6, maxX: 14, maxY: 9 });
  });
});

describe('the drawing stays inside the frame', () => {
  const MIN = STAGE_INSET;
  const MAX_X = STAGE_WIDTH - STAGE_INSET;
  const MAX_Y = STAGE_HEIGHT - STAGE_INSET;

  const inside = (d: string, label: string) => {
    const box = pathBounds(d);
    expect(box.minX, `${label} left`).toBeGreaterThanOrEqual(MIN);
    expect(box.minY, `${label} top`).toBeGreaterThanOrEqual(MIN);
    expect(box.maxX, `${label} right`).toBeLessThanOrEqual(MAX_X);
    expect(box.maxY, `${label} bottom`).toBeLessThanOrEqual(MAX_Y);
  };

  it('keeps every matrix level, the bars and the live edge inside the rule', () => {
    LEVEL_PATHS.forEach((path, level) => inside(path, `level ${level}`));
    inside(BARS_PATH, 'bars');
    inside(TODAY_PATH, 'today');
  });

  it('keeps the cursor inside it at both ends of the sweep', () => {
    inside(completionFrame(0).cursor, 'cursor at the first week');
    inside(completionFrame(WEEKS - 1).cursor, 'cursor at the last week');
  });

  it('leaves the readout row inside the frame too', () => {
    expect(READOUT_Y).toBeLessThanOrEqual(MAX_Y);
    expect(READOUT_Y).toBeGreaterThan(BAR_BASE);
  });

  it('centres the matrix horizontally, so the picture is the composition', () => {
    expect(GRID_X).toBe((STAGE_WIDTH - GRID_WIDTH) / 2);
    expect(GRID_WIDTH).toBe(WEEKS * PITCH - (PITCH - CELL));
  });

  it('does not let the bars reach the matrix above them', () => {
    expect(BAR_BASE - BAR_MAX).toBeGreaterThan(GRID_Y + DAYS * PITCH);
  });
});

describe('the lattice', () => {
  it('places columns and rows on one pitch in both axes, so the cells are square', () => {
    expect(weekX(1) - weekX(0)).toBe(PITCH);
    expect(dayY(1) - dayY(0)).toBe(PITCH);
  });

  it('clamps a column index rather than indexing past the matrix', () => {
    expect(clampWeek(-4)).toBe(0);
    expect(clampWeek(WEEKS + 9)).toBe(WEEKS - 1);
    expect(clampWeek(Number.NaN)).toBe(0);
    expect(clampWeek(3.9)).toBe(3);
  });

  it('splits the matrix into exactly the cells the four level paths draw', () => {
    const drawn = LEVEL_PATHS.reduce((sum, path) => sum + [...path.matchAll(/Z/g)].length, 0);
    expect(drawn).toBe(WEEKS * DAYS);
  });

  it('emits four paths for a hundred and sixty-eight cells', () => {
    // The node-count trade the audio spectrum already makes. A regression to
    // one element per cell is a forty-fold increase in this stage's DOM.
    expect(LEVEL_PATHS).toHaveLength(LEVEL_MAX + 1);
  });

  it('draws a tick every fourth week, on the column centres', () => {
    expect(AXIS_TICKS).toHaveLength(Math.ceil(WEEKS / 4));
    expect(AXIS_TICKS[0]).toBe(weekX(0) + CELL / 2);
    expect(new Set(AXIS_TICKS).size).toBe(AXIS_TICKS.length);
  });

  it('marks the live edge on the most recent day, used or not', () => {
    // Deliberately the last cell and not the last *used* cell: the claim is
    // "today is not over", which is true whatever today's level turns out to be.
    const box = pathBounds(TODAY_PATH);
    expect(box.minX).toBeLessThan(weekX(WEEKS - 1));
    expect(box.maxX).toBeGreaterThan(weekX(WEEKS - 1) + CELL);
    expect(box.minY).toBeLessThan(dayY(DAYS - 1));
  });
});

describe('the weekly bars are a second reading of the same data', () => {
  it('is proportional to the week it stands under, and never taller than the strip', () => {
    for (let week = 0; week < WEEKS; week += 1) {
      expect(barHeight(week)).toBeCloseTo(((WEEK_TOTALS[week] ?? 0) / DAYS) * BAR_MAX, 10);
      expect(barHeight(week)).toBeLessThanOrEqual(BAR_MAX);
    }
  });

  it('draws nothing at all for a week with no use, rather than a zero-height mark', () => {
    const emptyWeek = WEEK_TOTALS.findIndex((total) => total === 0);
    if (emptyWeek >= 0) expect(barPath(emptyWeek)).toBe('');
    // And every non-empty week is in the strip.
    const drawn = [...BARS_PATH.matchAll(/Z/g)].length;
    expect(drawn).toBe(WEEK_TOTALS.filter((total) => total > 0).length);
  });

  it('stands every bar on the same baseline', () => {
    for (let week = 0; week < WEEKS; week += 1) {
      const path = barPath(week);
      if (path === '') continue;
      expect(pathBounds(path).maxY).toBeCloseTo(BAR_BASE, 10);
    }
  });
});

/* ===========================================================================
   The frame
   ======================================================================== */

describe('the pointer selects a column', () => {
  it('maps the matrix, not the frame, so the column is the one under the hand', () => {
    // The frame is 320 wide and the matrix is not. Mapping the whole frame
    // would put the selection up to two columns from the pointer at the edges.
    expect(weekFromPointer((weekX(0) + CELL / 2) / STAGE_WIDTH)).toBe(0);
    expect(weekFromPointer((weekX(11) + CELL / 2) / STAGE_WIDTH)).toBe(11);
    expect(weekFromPointer((weekX(WEEKS - 1) + CELL / 2) / STAGE_WIDTH)).toBe(WEEKS - 1);
  });

  it('clamps a pointer that has left the stage rather than indexing off the end', () => {
    expect(weekFromPointer(-3)).toBe(0);
    expect(weekFromPointer(4)).toBe(WEEKS - 1);
    expect(weekFromPointer(Number.NaN)).toBe(STATIC_WEEK);
  });

  it('crosses columns monotonically across the sweep', () => {
    let previous = -1;
    for (let i = 0; i <= 400; i += 1) {
      const week = weekFromPointer(i / 400);
      expect(week).toBeGreaterThanOrEqual(previous);
      previous = week;
    }
    expect(previous).toBe(WEEKS - 1);
  });
});

describe('a frame is a pure function of its column', () => {
  const serialise = (week: number) => JSON.stringify(completionFrame(week));

  it('produces bit-identical frames sweeping left to right and back again', () => {
    const forward = Array.from({ length: WEEKS }, (_, week) => serialise(week));
    const backward = Array.from({ length: WEEKS }, (_, index) => serialise(WEEKS - 1 - index)).reverse();
    expect(backward).toEqual(forward);
  });

  it('is unaffected by whatever the pointer did on the way through', () => {
    const direct = serialise(9);
    for (const detour of [0, WEEKS - 1, 3, 17]) completionFrame(detour);
    expect(serialise(9)).toBe(direct);
  });

  it('reads the numbers off the data rather than off a second table', () => {
    for (let week = 0; week < WEEKS; week += 1) {
      const frame = completionFrame(week);
      expect(frame.readWeek).toBe(String(week + 1).padStart(2, '0'));
      expect(frame.readDays).toBe(`${WEEK_TOTALS[week]}/${DAYS}`);
      expect(frame.readStreak).toBe(String(BEST_STREAK_THROUGH[week]));
      expect(frame.litBar).toBe(barPath(week));
    }
  });

  it('brackets the matrix and the bar strip as one column', () => {
    // A marker on only one of them would invite the eye to read the two halves
    // as separate charts, which is the reading this stage exists to avoid.
    const box = pathBounds(completionFrame(6).cursor);
    expect(box.minY).toBeLessThan(GRID_Y);
    expect(box.maxY).toBeGreaterThan(BAR_BASE);
    expect(box.minX).toBeLessThan(weekX(6));
    expect(box.maxX).toBeGreaterThan(weekX(6) + CELL);
  });
});

describe('the still frame', () => {
  it('is the most recent week — what SSR, mobile and reduced motion all get', () => {
    expect(STATIC_WEEK).toBe(WEEKS - 1);
    expect(STATIC_FRAME).toEqual(completionFrame(STATIC_WEEK));
  });

  it('is a complete composition, not a placeholder', () => {
    // Every number in it is the summary of the whole window: the last week, its
    // own total, and the best streak anywhere in the grid.
    expect(STATIC_FRAME.readWeek).toBe(String(WEEKS).padStart(2, '0'));
    expect(STATIC_FRAME.readStreak).toBe(String(Math.max(...BEST_STREAK_THROUGH)));
    expect(STATIC_FRAME.cursor.length).toBeGreaterThan(0);
  });
});

/* ===========================================================================
   THE DOM HALF

   Pinned as source assertions for the reason `tests/bloch.test.ts` gives: the
   runner has no DOM, and each of these is a rule that is invisible in
   `astro dev` and only bites on a touch device, a reduced-motion setting, a
   hidden tab or a profiler.
   ======================================================================== */

const STAGE_SOURCE = readFileSync(
  fileURLToPath(new URL('../src/components/visuals/worlds/stages/CompletionStage.tsx', import.meta.url)),
  'utf8',
);

/**
 * The stage with every comment removed.
 *
 * Load-bearing, exactly as it is in `tests/bloch.test.ts`: this file's own
 * header names `getBoundingClientRect` and `requestAnimationFrame` in prose to
 * explain where they may and may not appear, and a guard that counted
 * occurrences in the raw source would count the sentence that documents the
 * rule as a violation of it.
 */
const STAGE_CODE = STAGE_SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * The body of `const <name> = ...` up to its matching closing brace.
 *
 * Throws rather than answering an empty string for a name it cannot find: a
 * renamed handler must fail loudly here, not pass vacuously.
 */
function bodyOf(name: string): string {
  const start = [`const ${name} = `, `function ${name}(`]
    .map((declaration) => STAGE_CODE.indexOf(declaration))
    .find((index) => index >= 0);
  if (start === undefined) throw new Error(`CompletionStage.tsx has no \`${name}\``);
  const open = STAGE_CODE.indexOf('{', start);
  if (open < 0) throw new Error(`\`${name}\` has no body`);
  let depth = 0;
  for (let i = open; i < STAGE_CODE.length; i += 1) {
    if (STAGE_CODE[i] === '{') depth += 1;
    else if (STAGE_CODE[i] === '}') {
      depth -= 1;
      if (depth === 0) return STAGE_CODE.slice(open, i + 1);
    }
  }
  throw new Error(`\`${name}\` is unbalanced`);
}

describe('the stage attaches nothing it cannot take back', () => {
  it('gates the whole effect on active, reduced motion and a fine pointer', () => {
    // None of the three is a degradation: the resting grid is the finished
    // picture, and none of them constructs a listener or a frame.
    // docs/MOTION_SYSTEM.md §4, §6, §7.
    expect(STAGE_CODE).toContain('REDUCED_MOTION_QUERY');
    expect(STAGE_CODE).toContain('FINE_POINTER_QUERY');
    expect(STAGE_CODE).toMatch(/if \(!active \|\| reducedMotion \|\| !finePointer \|\| !root\) return;/);
  });

  it('reads both queries as a subscription, so an OS toggle needs no reload', () => {
    expect((STAGE_CODE.match(/useMediaQuery\(/g) ?? []).length).toBe(2);
    expect(STAGE_CODE).not.toMatch(/matchMedia/);
  });

  it('scopes every pointer listener to the stage and never to window', () => {
    const pointerListeners = STAGE_CODE.match(/(\w+)\.addEventListener\('pointer\w+'/g) ?? [];
    expect(pointerListeners.length).toBe(4);
    for (const listener of pointerListeners) expect(listener.startsWith('root.')).toBe(true);
    expect(STAGE_CODE).not.toMatch(/window\.addEventListener\('pointer/);
    // All passive, so a drag over the grid still scrolls the page.
    expect((STAGE_CODE.match(/'pointer\w+', handle\w+, \{ passive: true \}/g) ?? []).length).toBe(4);
    // `pointerdown` as well as `pointermove`: a tap must reach the state a
    // hover does, or the interaction is hover-only (MOTION_SYSTEM §7).
    expect(STAGE_CODE).toContain("root.addEventListener('pointerdown', handlePointer");
  });

  it('removes every listener it adds, from the same target', () => {
    const added = STAGE_CODE.match(/(\w+)\.addEventListener\('([\w-]+)'/g) ?? [];
    expect(added.length).toBeGreaterThan(4);
    for (const call of added) {
      const [target, event] = call.replace(/'/g, '').split('.addEventListener(');
      expect(STAGE_CODE, `${target}.${event} is added and never removed`).toContain(
        `${target}.removeEventListener('${event}'`,
      );
    }
  });

  it('disconnects both observers and cancels the pending frame', () => {
    expect(STAGE_CODE).toContain('intersectionObserver?.disconnect()');
    expect(STAGE_CODE).toContain('resizeObserver?.disconnect()');
    expect(bodyOf('settleNow')).toContain('cancelAnimationFrame(motion.frame)');
  });

  it('watches the two conditions §4 names, and routes both through one detach', () => {
    expect(STAGE_CODE).toContain("document.addEventListener('visibilitychange'");
    expect(STAGE_CODE).toContain('new IntersectionObserver(');
    expect(STAGE_CODE).toMatch(/const shouldRun = \(\): boolean => onScreen && !document\.hidden;/);
    expect(bodyOf('evaluate')).toContain('detach()');
  });

  it('settles to the still on every way out, rather than freezing on a column', () => {
    const settle = bodyOf('settleNow');
    expect(settle).toContain('STATIC_FRAME');
    expect(settle).toContain('motion.engaged = false');
    expect(bodyOf('detach')).toContain('settleNow()');
    // And the unmount path settles even when there was nothing to detach —
    // `detach()` is a no-op for an effect torn down while off screen, so the
    // cleanup calls both rather than relying on the first.
    const cleanup = STAGE_CODE.slice(STAGE_CODE.lastIndexOf('return () => {'));
    expect(cleanup).toContain('detach();');
    expect(cleanup).toContain('settleNow();');
  });

  it('reads no layout on the pointer path', () => {
    // `getBoundingClientRect()` inside the handler forces a synchronous reflow
    // on the hottest event a page has, and it is invisible outside a profiler.
    expect((STAGE_CODE.match(/getBoundingClientRect/g) ?? []).length).toBe(1);
    expect(bodyOf('measure')).toContain('getBoundingClientRect');
    for (const handler of ['handlePointer', 'handleRelease', 'handleScroll']) {
      const body = bodyOf(handler);
      expect(body, `${handler} reads layout`).not.toContain('getBoundingClientRect');
      expect(body, `${handler} measures`).not.toContain('measure()');
    }
    expect(bodyOf('handleScroll')).toContain('motion.boxDirty = true');
  });

  it('coalesces pointer events into a single animation frame, and runs no loop', () => {
    expect(bodyOf('handlePointer')).toContain('schedule()');
    expect(bodyOf('schedule')).toMatch(/if \(motion\.frame === 0 && attached\)/);
    expect((STAGE_CODE.match(/requestAnimationFrame/g) ?? []).length).toBe(1);
    // Nothing here eases, so no frame may ask for the next one. A `schedule()`
    // inside `tick` would be a loop that never stands down on a picture that
    // is not moving — the opposite of the Bloch stage, whose envelope is the
    // one thing on the band with a time constant.
    expect(bodyOf('tick')).not.toContain('schedule(');
  });

  it('keeps the arithmetic out of the frame callback', () => {
    // `src/lib` is where logic lives and where a test can reach it.
    expect(STAGE_CODE).toContain('completionFrame(');
    expect(STAGE_CODE).toContain('weekFromPointer(');
    expect(STAGE_CODE).not.toMatch(/Math\.(sin|cos|floor|round)\(/);
  });

  it('writes attributes rather than re-rendering, and never an inline style', () => {
    // React state per pointer event would re-render the whole matrix to move
    // one bracket; an inline `style` is dropped outright by the site's CSP.
    expect(STAGE_CODE).not.toContain('useState');
    expect(STAGE_CODE).not.toMatch(/style=\{/);
    expect(STAGE_CODE).toContain("setAttribute('d'");
  });
});

/* ===========================================================================
   THE STYLESHEET CONTRACT

   Read out of the source rather than out of a browser, because what is being
   forbidden is a *declaration*, and a declaration that is present but currently
   harmless is exactly the thing that becomes a bug the next time the geometry
   moves.
   ======================================================================== */

const WORLDS_CSS = readFileSync(
  fileURLToPath(new URL('../src/components/home/TechnicalWorlds.astro', import.meta.url)),
  'utf8',
);
/** The stylesheet with every comment removed — the prose discusses what it forbids. */
const WORLDS_RULES = WORLDS_CSS.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every declaration block whose selector mentions one of the given classes. */
function rulesMentioning(classNames: readonly string[]): string[] {
  const out: string[] = [];
  for (const match of WORLDS_RULES.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1] ?? '';
    const body = match[2] ?? '';
    if (classNames.some((name) => selector.includes(name))) out.push(`${selector.trim()} { ${body.trim()} }`);
  }
  return out;
}

describe('the product stage stylesheet', () => {
  it('resolves the accent from a rule, since CSS cannot build the token name', () => {
    expect(WORLDS_CSS).toContain(".tw [data-domain='product']");
    expect(WORLDS_CSS).toContain('--tw-accent: var(--color-domain-product);');
  });

  it('declares no `d` on the two paths the pointer writes per frame', () => {
    // A CSS declaration outranks a presentation attribute, so a `d` here would
    // make the writes silently do nothing — in production only.
    const guarded = rulesMentioning(['.tw-pg-cursor', '.tw-pg-lit']);
    expect(guarded.length).toBeGreaterThan(0);
    for (const rule of guarded) expect(rule, 'a `d` here freezes the cursor').not.toMatch(/(^|[;{\s])d\s*:/);
  });

  it('declares no transform on the group the arrival clips', () => {
    // `tw-sweep-in`'s lengths are plain user units only while `.tw-pg-reveal`
    // carries no transform of its own.
    for (const rule of rulesMentioning(['.tw-pg-reveal'])) {
      expect(rule).not.toMatch(/\btransform\s*:/);
    }
  });

  it('starts every animation only under [data-active="true"]', () => {
    // MOTION_SYSTEM §4: an inactive stage has no animation to pause — it has
    // none. This is the per-stage restatement of the band-wide guard.
    for (const rule of rulesMentioning(['.tw-pg-'])) {
      if (!/animation(-name)?\s*:\s*(?!none)/.test(rule)) continue;
      expect(rule, 'an ungated animation runs on five inert stages').toContain("[data-active='true']");
    }
  });

  it('gives no product element a resting state that depends on an animation', () => {
    // Audit 2.3, and the reason the reduced-motion block at the foot of the
    // stylesheet can use `animation: none` at all. Both ends of the ambient
    // keyframe are the element's own resting opacity.
    expect(WORLDS_RULES).toMatch(/@keyframes tw-pg-live \{[\s\S]*?opacity: 1;[\s\S]*?\}/);
    for (const rule of rulesMentioning(['.tw-pg-'])) {
      expect(rule, 'a resting opacity of 0 hides content from reduced motion').not.toMatch(/opacity:\s*0;/);
    }
  });

  it('never puts pathLength and non-scaling-stroke on the same element', () => {
    // The band's one rule about dashed strokes. Nothing this stage draws
    // declares `pathLength`, which is what makes its `vector-effect` safe.
    expect(STAGE_CODE).not.toContain('pathLength');
  });
});

/* ===========================================================================
   THE SERVER RENDER

   The band's progressive-enhancement guarantee applies to the sixth panel
   exactly as it does to the other five: the picture is complete in the HTML
   before any JavaScript exists.
   ======================================================================== */

describe('server-rendered markup', () => {
  const render = async () => {
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { default: TechnicalWorlds } = await import('../src/components/visuals/worlds/TechnicalWorlds');
    return renderToStaticMarkup(createElement(TechnicalWorlds, { t: en }));
  };

  it('renders the product panel, its stage kind and its ordinal', async () => {
    const html = await render();
    expect(html).toContain('data-domain="product"');
    expect(html).toContain('data-stage="completion"');
    expect(html).toContain(en.worlds.items.product.name.replace(/&/g, '&amp;'));
    expect(html).toContain(en.worlds.items.product.summary);
    expect(html).toContain('id="world-product"');
  });

  it('puts product first, which is the whole point of the change', async () => {
    const html = await render();
    const positions = DOMAINS.map((domain) => html.indexOf(`data-domain="${domain.id}"`));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('draws the complete grid before any JavaScript runs', async () => {
    const html = await render();
    for (const path of LEVEL_PATHS) expect(html).toContain(path);
    expect(html).toContain(BARS_PATH);
    expect(html).toContain(TODAY_PATH);
  });

  it('server-renders the still, so there is nothing to hydrate into', async () => {
    const html = await render();
    expect(html).toContain(`d="${STATIC_FRAME.cursor}"`);
    expect(html).toContain(`>${STATIC_FRAME.readWeek}</text>`);
    expect(html).toContain(`>${STATIC_FRAME.readDays}</text>`);
    expect(html).toContain(`>${STATIC_FRAME.readStreak}</text>`);
  });
});
