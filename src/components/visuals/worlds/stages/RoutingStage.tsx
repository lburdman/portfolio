import { useMemo } from 'react';
import { StageFrame, type StageProps } from '../StageFrame';
import { cellCentre, manhattanPath, STAGE_HEIGHT, type Point } from '../stage-geometry';
import { usePointerField } from '../usePointerField';

/**
 * FPGA / Digital Design — a fabric of logic cells and the routes through it.
 *
 * The brief calls this one of the strongest domain identities, and the reason
 * is that the picture is not a metaphor: an FPGA really is a lattice of
 * identical cells joined by switchable channels, and place-and-route really is
 * the act of choosing which channels carry which net. Pointer or focus picks a
 * route; the cells it lands on are claimed by it, and a pulse propagates along
 * it at the clock's pace.
 *
 * Every segment is a right angle. Diagonals would be a lie about the
 * technology — a router cannot draw one.
 *
 * Technology: SVG over a CSS-animated dash offset. No canvas.
 */

const GRID = { x: 46, y: 34, width: 232, height: 116 };
const COLUMNS = 8;
const ROWS = 4;
const CELL = 15;

const CELLS = Array.from({ length: COLUMNS * ROWS }, (_, index) => {
  const column = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  return { column, row, centre: cellCentre(column, row, COLUMNS, ROWS, GRID) };
});

/**
 * Four candidate placements of the same net, expressed as cell coordinates.
 * Deliberately hand-authored rather than generated: a real routing solution is
 * a decision, not noise, and these four read as four decisions.
 */
const ROUTE_CELLS: readonly (readonly (readonly [number, number])[])[] = [
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

      {/* Every candidate net stays drawn as a faint track; only one is driven. */}
      <g className="tw-routes">
        {ROUTES.map((candidate, index) => (
          <path
            key={index}
            className="tw-route"
            data-selected={index === selected ? 'true' : 'false'}
            d={candidate.path}
          />
        ))}
        {/* The propagating edge exists only while the stage is active, so the
            section contains no element whose resting state is invisible.

            `pathLength` re-scales this path's own length to 100, so the dash
            pattern and the CSS `stroke-dashoffset` keyframe are both plain
            constants. Without it the keyframe would need each route's measured
            length as a custom property — which would mean an inline `style`
            attribute, and the site's CSP blocks those. It also means all four
            routes pulse at the same visual rate despite differing in length. */}
        {active && route ? <path className="tw-route-pulse" d={route.path} pathLength={100} /> : null}
      </g>

      {/* Clock column: the edges everything in this fabric is timed against. */}
      <g className="tw-clock">
        <line x1={26} y1={GRID.y - 6} x2={26} y2={GRID.y + GRID.height + 6} />
        {Array.from({ length: ROWS }, (_, index) => {
          const y = cellCentre(0, index, COLUMNS, ROWS, GRID).y;
          return <line key={index} x1={22} y1={y} x2={30} y2={y} />;
        })}
        {route ? <circle className="tw-clock-active" cx={26} cy={route.entryY} r={3} /> : null}
      </g>

      {/* Fabric baseline, so the grid sits on something. */}
      <line className="tw-rule" x1={26} y1={STAGE_HEIGHT - 24} x2={GRID.x + GRID.width + 8} y2={STAGE_HEIGHT - 24} />
    </StageFrame>
  );
}
