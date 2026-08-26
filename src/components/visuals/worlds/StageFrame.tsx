import type { ReactNode, RefObject } from 'react';
import { domainOrdinal, type Domain } from '../../../config/domains';
import { STAGE_HEIGHT, STAGE_INSET, STAGE_WIDTH } from './stage-geometry';

export interface StageProps {
  readonly domain: Domain;
  /**
   * Whether this stage owns the frame. **When false the stage must be inert** —
   * no animation, no listener, no rAF (docs/MOTION_SYSTEM.md §4). Every stage
   * implements that by attaching its pointer hook only while active and by
   * declaring its CSS animations only under `[data-active='true']`.
   */
  readonly active: boolean;
}

interface StageFrameProps extends StageProps {
  readonly frameRef?: RefObject<HTMLDivElement | null>;
  readonly children: ReactNode;
}

const TICK = 12;

/**
 * The chrome every domain stage shares.
 *
 * This is the answer to brief §6: five domains must not look like five
 * unrelated microsites. They differ in *behaviour* and in one accent; the
 * frame, the coordinate space, the corner ticks, the annotation row and the
 * hairline weights are identical across all five, so the set reads as five
 * channels of one instrument.
 *
 * The SVG is `aria-hidden`. It carries no information that the panel's heading
 * and summary do not already carry in text, so labelling it would add noise to
 * a screen reader rather than meaning. Everything the pointer reveals inside it
 * is decoration over content that is already readable (brief §29, §14).
 *
 * `data-domain` rather than an inline `style` is what carries the accent: the
 * site ships a hash-based CSP with no `'unsafe-inline'` and no
 * `'unsafe-hashes'`, under which every inline `style=""` attribute is blocked.
 * `--tw-accent` is therefore resolved from a stylesheet rule keyed on this
 * attribute. Nothing in this island writes an inline style.
 */
export function StageFrame({ domain, active, frameRef, children }: StageFrameProps) {
  const right = STAGE_WIDTH - STAGE_INSET;
  const bottom = STAGE_HEIGHT - STAGE_INSET;

  return (
    <div
      ref={frameRef}
      className="tw-stage"
      data-domain={domain.id}
      data-stage={domain.stage}
      data-active={active ? 'true' : 'false'}
    >
      <p className="tw-stage__meta" aria-hidden="true">
        <span className="tw-stage__ordinal">{domainOrdinal(domain)}</span>
        <span className="tw-stage__channel" />
      </p>

      <svg
        className="tw-stage__svg"
        viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        {children}

        {/* Frame last so the drawing is clipped visually by the rule, not over it. */}
        <g className="tw-stage__frame">
          <rect
            className="tw-rule"
            x={STAGE_INSET}
            y={STAGE_INSET}
            width={STAGE_WIDTH - STAGE_INSET * 2}
            height={STAGE_HEIGHT - STAGE_INSET * 2}
          />
          <path
            className="tw-tick"
            d={
              `M${STAGE_INSET} ${STAGE_INSET + TICK} L${STAGE_INSET} ${STAGE_INSET} L${STAGE_INSET + TICK} ${STAGE_INSET} ` +
              `M${right - TICK} ${STAGE_INSET} L${right} ${STAGE_INSET} L${right} ${STAGE_INSET + TICK} ` +
              `M${right} ${bottom - TICK} L${right} ${bottom} L${right - TICK} ${bottom} ` +
              `M${STAGE_INSET + TICK} ${bottom} L${STAGE_INSET} ${bottom} L${STAGE_INSET} ${bottom - TICK}`
            }
          />
        </g>
      </svg>
    </div>
  );
}
