import { useMemo } from 'react';
import { StageFrame, type StageProps } from '../StageFrame';
import { cellCentre, clockPath, manhattanPath, STAGE_HEIGHT, type Point } from '../stage-geometry';
import { usePointerField } from '../usePointerField';

/**
 * FPGA / Digital Design — a fabric of logic cells, the routes through it, and
 * the clock everything in it is timed against.
 *
 * The brief calls this one of the strongest domain identities, and the reason
 * is that the picture is not a metaphor: an FPGA really is a lattice of
 * identical cells joined by switchable channels, and place-and-route really is
 * the act of choosing which channels carry which net. Pointer or focus picks a
 * route; the cells it lands on are claimed by it, and a pulse propagates along
 * it one cell per clock edge.
 *
 * Every segment is a right angle. Diagonals would be a lie about the
 * technology — a router cannot draw one.
 *
 * ── WHAT PASS 3 REPAIRED ───────────────────────────────────────────────────
 *
 * 1. **The committed route rested broken.** `.tw-route[data-selected]` carries
 *    the shared `tw-draw` arrival, whose finished state is
 *    `stroke-dasharray: 100 100; stroke-dashoffset: 0`. That is a *solid*
 *    stroke only in the `pathLength="100"` space every other user of `tw-draw`
 *    declares — and this path declared none. Measured in the production build,
 *    the selected route's real length is 290 user units, so its resting state
 *    was 100 on, 100 off, 90 on: a third of the routed net was permanently
 *    invisible, and the two ends of the same wire read as unconnected. It is
 *    the defect a screenshot of this stage shows most plainly, and one
 *    attribute fixes it.
 *
 * 2. **The rejected candidates were indistinguishable from the fabric.** Three
 *    of the four nets were drawn as solid hairlines in the rule colour, at the
 *    same weight as the routing channels behind them, so they read as more
 *    grid rather than as *other placements that were considered*. They are now
 *    dashed, which is the drawing convention for a track that is not there.
 *
 * 3. **The clock was asserted, not shown.** The stage claimed synchronous
 *    propagation and drew a fabric with a dot blinking beside it, in a frame
 *    whose bottom third was empty. The timing strip at the foot is that claim
 *    made visible: six clock periods for the six cells on a route, with an
 *    accent segment riding the wave one period per tick, in exact lock-step
 *    with the pulse crossing the fabric above it. Both are driven by the same
 *    `tw-pulse-travel` keyframe over the same 2.4s period with the same
 *    negative delay, so the link between them is structural rather than tuned.
 *
 * ── WHY THIS STAGE DOES NOT READ THE SCROLL ────────────────────────────────
 * The local progress channel transformed the Quantum and AI stages because in
 * both the reader's descent *is* a parameter of the subject — a rotation, a
 * model capacity. Here it would be a lie. The entire claim of a synchronous
 * fabric is that it advances on its own clock, deterministically, whether or
 * not anyone is watching; binding the pulse to scroll position would say the
 * opposite, and say it about the one domain whose defining property is that it
 * does not depend on you. The reader's agency is already spent on the thing
 * that *is* a choice — which net gets placed — and that is the pointer.
 *
 * Technology: SVG over CSS-animated dash offsets. No canvas.
 */

const GRID = { x: 46, y: 26, width: 232, height: 104 };
const COLUMNS = 8;
const ROWS = 4;
const CELL = 15;

const CELLS = Array.from({ length: COLUMNS * ROWS }, (_, index) => {
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  return { column, row, centre: cellCentre(column, row, COLUMNS, ROWS, GRID) };
});

/**
 * Cells on a route, and therefore **clock ticks per traversal**.
 *
 * The propagating pulse used to be a fixed-rate infinite dash, which reads as
 * *flow* — fluid moving through a pipe — and an FPGA fabric does not do that
 * (REDESIGN_DECISIONS P2, FPGA). It is synchronous logic: a value is latched
 * into one cell on a clock edge and appears in the next cell on the following
 * edge. So the pulse advances in `ROUTE_STEPS` discrete jumps, one per tick,
 * the timing strip below the fabric draws exactly this many clock periods, and
 * the marker on it advances one period per jump.
 *
 * The step count lives in CSS as `steps(6)` — a keyframe timing function cannot
 * read a module constant, and handing it one would mean an inline custom
 * property, which the site's CSP drops. `tests/worlds.test.ts` asserts every
 * route really has this many cells, so the two cannot drift apart silently.
 */
export const ROUTE_STEPS = 6;

/**
 * Four candidate placements of the same net, expressed as cell coordinates.
 * Deliberately hand-authored rather than generated: a real routing solution is
 * a decision, not noise, and these four read as four decisions.
 */
export const ROUTE_CELLS: readonly (readonly (readonly [number, number])[])[] = [
  [
    [0, 1],
    [2, 1],
    [2, 0],
    [5, 0],
    [5, 2],
    [7, 2],
  ],
  [
    [0, 2],
    [1, 2],
    [1, 3],
    [4, 3],
    [4, 1],
    [7, 1],
  ],
  [
    [0, 0],
    [3, 0],
    [3, 2],
    [6, 2],
    [6, 3],
    [7, 3],
  ],
  [
    [0, 3],
    [2, 3],
    [2, 1],
    [5, 1],
    [5, 3],
    [7, 0],
  ],
];

interface Route {
  readonly path: string;
  readonly claimed: ReadonlySet<string>;
  readonly entryY: number;
}

const ROUTES: readonly Route[] = ROUTE_CELLS.map((cells) => {
  const points: Point[] = cells.map(([column, row]) => cellCentre(column, row, COLUMNS, ROWS, GRID));
  const entry = points[0];
  return {
    path: manhattanPath(points),
    claimed: new Set(cells.map(([column, row]) => `${column}:${row}`)),
    entryY: entry ? entry.y : GRID.y,
  };
});

/* ── The timing strip ───────────────────────────────────────────────────────
   One clock period per cell on the route, drawn under the fabric it times.
   `clockPath` gives every period identical arc length, which is what lets the
   accent marker walk it in `steps(6)` and land on whole periods. */
const CLOCK_TOP = 144;
const CLOCK_HEIGHT = 14;
const CLOCK_WAVE = clockPath(GRID.x, CLOCK_TOP, GRID.width, CLOCK_HEIGHT, ROUTE_STEPS);
const CLOCK_STEP = GRID.width / ROUTE_STEPS;
/** One ordinal per period, at its rising edge — the ticks are countable. */
const CLOCK_TICKS = Array.from({ length: ROUTE_STEPS }, (_, index) => ({
  index,
  x: GRID.x + index * CLOCK_STEP + 2.5,
}));

export function RoutingStage({ domain, active }: StageProps) {
  const { ref, field } = usePointerField(active);

  // Vertical pointer position selects the net; with no pointer the second
  // route stays selected, so the concept is on show without any interaction.
  const selected = useMemo(() => {
    if (!field.engaged) return 1;
    return Math.min(ROUTES.length - 1, Math.max(0, Math.floor(field.y * ROUTES.length)));
  }, [field]);

  const route = ROUTES[selected] ?? ROUTES[0];

  return (
    <StageFrame domain={domain} active={active} frameRef={ref}>
      {/* Routing channels: the switchable tracks between the cells. */}
      <g className="tw-channels">
        {Array.from({ length: COLUMNS + 1 }, (_, index) => {
          const x = GRID.x + (index * GRID.width) / COLUMNS;
          return <line key={`v${index}`} x1={x} y1={GRID.y - 6} x2={x} y2={GRID.y + GRID.height + 6} />;
        })}
        {Array.from({ length: ROWS + 1 }, (_, index) => {
          const y = GRID.y + (index * GRID.height) / ROWS;
          return <line key={`h${index}`} x1={GRID.x - 8} y1={y} x2={GRID.x + GRID.width + 8} y2={y} />;
        })}
      </g>

      {/* Logic cells: identical, deterministic blocks. */}
      <g className="tw-cells">
        {CELLS.map(({ column, row, centre }) => (
          <rect
            key={`${column}:${row}`}
            className="tw-cell"
            data-claimed={route?.claimed.has(`${column}:${row}`) ? 'true' : 'false'}
            x={centre.x - CELL / 2}
            y={centre.y - CELL / 2}
            width={CELL}
            height={CELL}
          />
        ))}
      </g>

      {/* Every candidate net stays drawn — the rejected ones dashed, because a
          track that was considered and not taken is not a track.

          `pathLength={100}` on all four is load-bearing, not decoration. The
          selected one carries the shared `tw-draw` arrival, whose finished
          state is `stroke-dasharray: 100 100`; without the normalisation that
          is 100 *user units* on and 100 off over a 290-unit route, so the net
          rested permanently broken into thirds. With it, 100 is the whole
          path and the finished state is the solid stroke it was meant to be. */}
      <g className="tw-routes">
        {ROUTES.map((candidate, index) => (
          <path
            key={index}
            className="tw-route"
            data-selected={index === selected ? 'true' : 'false'}
            d={candidate.path}
            pathLength={100}
          />
        ))}
        {/* The propagating edge exists only while the stage is active, so the
            section contains no element whose resting state is invisible.

            `pathLength` also means all four routes pulse at the same visual
            rate despite differing in length, and that the dash pattern and the
            CSS `stroke-dashoffset` keyframe are both plain constants — a
            measured length would have to reach CSS through an inline custom
            property, and the site's CSP drops those. */}
        {active && route ? <path className="tw-route-pulse" d={route.path} pathLength={100} /> : null}
      </g>

      {/* Clock column: which row of the fabric this net is driven from. */}
      <g className="tw-clock">
        <line x1={26} y1={GRID.y - 6} x2={26} y2={GRID.y + GRID.height + 6} />
        {Array.from({ length: ROWS }, (_, index) => {
          const y = cellCentre(0, index, COLUMNS, ROWS, GRID).y;
          return <line key={index} x1={22} y1={y} x2={30} y2={y} />;
        })}
        {route ? <circle className="tw-clock-active" cx={26} cy={route.entryY} r={3} /> : null}
      </g>

      {/* Timing strip: six periods for the six cells the net crosses.

          The wave itself is muted and always present, so nothing here depends
          on an animation to be visible. The accent segment riding it is
          rendered only while the stage is active, exactly like the pulse
          above — and it is driven by the same keyframe, the same 2.4s period
          and the same negative delay, so a reader can watch one advance and
          see the other advance with it. */}
      <g className="tw-timing">
        <path className="tw-clock-wave" d={CLOCK_WAVE} />
        {active ? <path className="tw-clock-edge" d={CLOCK_WAVE} pathLength={100} /> : null}
        {CLOCK_TICKS.map(({ index, x }) => (
          <text key={index} className="tw-annot" x={x} y={CLOCK_TOP + CLOCK_HEIGHT + 10}>
            {index + 1}
          </text>
        ))}
      </g>

      {/* Fabric baseline, so the timing strip sits on something. */}
      <line className="tw-rule" x1={26} y1={STAGE_HEIGHT - 24} x2={GRID.x + GRID.width + 8} y2={STAGE_HEIGHT - 24} />
    </StageFrame>
  );
}
