/**
 * The five technical domains, in the order the site descends through them.
 *
 * This array is the spine of the whole portfolio. It drives, in one pass:
 *   - the "I build across layers" sequence,
 *   - the Technical Worlds traverse,
 *   - project domain tags and the projects filter,
 *   - domain accent colours,
 *   - the section numbering in the navigation.
 *
 * The order is deliberate and descending: the site starts at the most abstract
 * layer (models) and travels down into the physics (signals). Reordering this
 * array reorders the experience — that is the intended way to change it.
 *
 * Accent hues are a tempered oscilloscope channel palette: five hues at
 * matched saturation and lightness so the domains read as channels of one
 * instrument rather than five unrelated brands. Their concrete values live in
 * `src/styles/tokens.css`; this file only names the token.
 */

export const DOMAIN_IDS = ['ai', 'quantum', 'fpga', 'electronics', 'audio'] as const;

export type DomainId = (typeof DOMAIN_IDS)[number];

export interface Domain {
  readonly id: DomainId;
  /**
   * The engineering layer this domain occupies, used as the eyebrow label in
   * the layers sequence. Localized via `t.layers.items[id].layer`.
   */
  readonly layerIndex: number;
  /**
   * CSS custom property holding this domain's accent, defined in tokens.css.
   * Components read it as `var(--color-domain-ai)` etc.
   */
  readonly accentVar: `--color-domain-${DomainId}`;
  /**
   * Which visual vocabulary the Technical Worlds stage renders for this
   * domain. Each is a distinct, deliberately cheap SVG/DOM treatment — see
   * docs/MOTION_SYSTEM.md for why none of them is WebGL.
   */
  readonly stage: 'forecast' | 'interference' | 'routing' | 'signalpath' | 'waveform';
}

export const DOMAINS = [
  { id: 'ai', layerIndex: 0, accentVar: '--color-domain-ai', stage: 'forecast' },
  { id: 'quantum', layerIndex: 1, accentVar: '--color-domain-quantum', stage: 'interference' },
  { id: 'fpga', layerIndex: 2, accentVar: '--color-domain-fpga', stage: 'routing' },
  { id: 'electronics', layerIndex: 3, accentVar: '--color-domain-electronics', stage: 'signalpath' },
  { id: 'audio', layerIndex: 4, accentVar: '--color-domain-audio', stage: 'waveform' },
] as const satisfies readonly Domain[];

/** Runtime guard used by the content schema so invalid domains fail the build. */
export function isDomainId(value: string): value is DomainId {
  return (DOMAIN_IDS as readonly string[]).includes(value);
}

export function getDomain(id: DomainId): Domain {
  const domain = DOMAINS.find((d) => d.id === id);
  // Unreachable for a valid DomainId; throwing beats returning undefined into a template.
  if (!domain) throw new Error(`Unknown domain id: ${id}`);
  return domain;
}

/** Formats a domain's position as the two-digit label used across the UI. */
export function domainOrdinal(domain: Domain): string {
  return String(domain.layerIndex + 1).padStart(2, '0');
}
