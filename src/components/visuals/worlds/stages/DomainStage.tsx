import type { StageProps } from '../StageFrame';
import { InterferenceStage } from './InterferenceStage';
import { NetworkStage } from './NetworkStage';
import { RoutingStage } from './RoutingStage';
import { SignalPathStage } from './SignalPathStage';
import { WaveformStage } from './WaveformStage';

/**
 * The one place a `stage` kind becomes a component.
 *
 * The switch is exhaustive over `Domain['stage']`: adding a sixth kind to
 * `src/config/domains.ts` without a stage to render it is a type error here,
 * not a blank box at runtime.
 */
export function DomainStage({ domain, active }: StageProps) {
  switch (domain.stage) {
    case 'network':
      return <NetworkStage domain={domain} active={active} />;
    case 'interference':
      return <InterferenceStage domain={domain} active={active} />;
    case 'routing':
      return <RoutingStage domain={domain} active={active} />;
    case 'signalpath':
      return <SignalPathStage domain={domain} active={active} />;
    case 'waveform':
      return <WaveformStage domain={domain} active={active} />;
    default: {
      // Unreachable while the switch is exhaustive. It is a throw rather than
      // a `null` so that a sixth stage kind fails the build loudly instead of
      // shipping an empty frame — the same choice `getDomain` already makes.
      const unreachable: never = domain.stage;
      throw new Error(`Unhandled stage kind: ${String(unreachable)}`);
    }
  }
}
