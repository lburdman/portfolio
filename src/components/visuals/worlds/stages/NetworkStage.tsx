import { useMemo } from 'react';
import { StageFrame, type StageProps } from '../StageFrame';
import { nearestNeighbourEdges, nearestPointIndex, scatterPoints, STAGE_HEIGHT, STAGE_WIDTH } from '../stage-geometry';
import { usePointerField } from '../usePointerField';

/**
 * AI / Machine Learning — an embedding space and the relations inside it.
 *
 * The brief (§6) forbids the three clichés by name: no glowing brain, no
 * robot, no neon neural net. What is drawn instead is the thing the work
 * actually involves — points in a projected space, and the neighbourhood
 * structure that gives them meaning. Moving the pointer selects a
 * representation and lights the relations that define it, which is what
 * "nearest neighbours in embedding space" looks like.
 *
 * Technology: SVG. 15 circles, ~24 lines, one lattice. Ambient motion is a
 * staggered CSS pulse over fixed geometry — no rAF, no canvas.
 */

const FIELD = { x: 38, y: 34, width: 244, height: 132 };
/** Fixed seed: the layout must be byte-identical on the server and after hydration. */
const NODES = scatterPoints(15, 20260826, FIELD);
const EDGES = nearestNeighbourEdges(NODES, 2);

const LATTICE_COLUMNS = 13;
const LATTICE_ROWS = 7;
const LATTICE = Array.from({ length: LATTICE_COLUMNS * LATTICE_ROWS }, (_, index) => {
  const column = index % LATTICE_COLUMNS;
  const row = Math.floor(index / LATTICE_COLUMNS);
  return {
    x: FIELD.x + (column / (LATTICE_COLUMNS - 1)) * FIELD.width,
    y: FIELD.y + (row / (LATTICE_ROWS - 1)) * FIELD.height,
  };
});

export function NetworkStage({ domain, active }: StageProps) {
  const { ref, field } = usePointerField(active);

  const selected = useMemo(() => {
    if (!field.engaged) return -1;
    return nearestPointIndex(NODES, FIELD.x + field.x * FIELD.width, FIELD.y + field.y * FIELD.height);
  }, [field]);

  return (
    <StageFrame domain={domain} active={active} frameRef={ref}>
      <g className="tw-net-lattice">
        {LATTICE.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={0.7} />
        ))}
      </g>

      <g className="tw-net-edges">
        {EDGES.map((edge) => {
          const from = NODES[edge.a];
          const to = NODES[edge.b];
          if (!from || !to) return null;
          const related = selected === edge.a || selected === edge.b;
          return (
            <line
              key={`${edge.a}-${edge.b}`}
              className="tw-net-edge"
              data-related={related ? 'true' : 'false'}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
            />
          );
        })}
      </g>

      {/* The ambient pulse is staggered by `:nth-child()` in the stylesheet
          rather than by a per-node custom property: the site ships a CSP with
          no `'unsafe-inline'`, under which an inline `style` attribute is
          blocked outright. Nothing in this island writes one. */}
      <g className="tw-net-nodes">
        {NODES.map((node, index) => (
          <circle
            key={index}
            className="tw-net-node"
            data-selected={selected === index ? 'true' : 'false'}
            cx={node.x}
            cy={node.y}
            r={index % 4 === 0 ? 3.4 : 2.4}
          />
        ))}
      </g>

      {selected >= 0 && NODES[selected] ? (
        <circle className="tw-net-halo" cx={NODES[selected].x} cy={NODES[selected].y} r={13} />
      ) : null}

      {/* Axis hairlines: this is a projection, and a projection has axes. */}
      <g className="tw-net-axes">
        <line x1={FIELD.x} y1={STAGE_HEIGHT - 22} x2={FIELD.x + FIELD.width} y2={STAGE_HEIGHT - 22} />
        <line x1={STAGE_WIDTH - 22} y1={FIELD.y} x2={STAGE_WIDTH - 22} y2={FIELD.y + FIELD.height} />
      </g>
    </StageFrame>
  );
}
