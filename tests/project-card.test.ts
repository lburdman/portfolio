/**
 * Guards on the project presentation components.
 *
 * These are static source assertions rather than render tests, deliberately.
 * Both invariants below are invisible in `astro dev` and only bite in a
 * production build, which is exactly the shape of failure a unit test is worth
 * writing for — and both have already been violated once.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DOMAIN_IDS } from '../src/config/domains.ts';

const COMPONENTS = [
  'components/projects/ProjectCard.astro',
  'components/projects/ProjectGrid.astro',
  'components/home/SelectedProjects.astro',
] as const;

function source(relative: string): string {
  return readFileSync(fileURLToPath(new URL(`../src/${relative}`, import.meta.url)), 'utf8');
}

/**
 * Strips block comments so the prose explaining *why* inline styles are banned
 * cannot itself trip the ban.
 */
function withoutComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '');
}

describe('CSP: no inline style attributes', () => {
  /**
   * `astro.config.mjs` enables `security.csp`. Astro emits `style-src` with
   * hashes and no `style-src-attr`; `style-src-attr` falls back to `style-src`,
   * and a hash never authorises a style *attribute* — only a `<style>` element.
   * So every inline `style=""` is silently dropped in production while working
   * perfectly in dev: no console error, no build warning.
   *
   * These components shipped 16 of them per page. Twelve carried
   * `--domain-accent`, whose loss made the card masthead channels and domain
   * markers invisible; four carried `--vt-title`, whose loss made the project
   * transition do nothing on the live site.
   */
  it.each(COMPONENTS)('%s renders no style attribute', (component) => {
    const code = withoutComments(source(component));

    // `style={...}` — an expression attribute, how the bug originally shipped.
    expect(code, 'style={...} expression attribute').not.toMatch(/\bstyle=\{/);
    // `style="..."` — a literal attribute.
    expect(code, 'style="..." literal attribute').not.toMatch(/\bstyle="/);
    // `define:vars` compiles down to an inline style attribute, same failure.
    expect(code, 'define:vars compiles to a style attribute').not.toMatch(/define:vars/);
  });

  /**
   * A generated `<style>` element is not an escape hatch either: Astro hashes
   * only the style elements it compiles itself, so an `is:inline` one is absent
   * from the policy — and `Astro.csp.insertStyleHash()` cannot fix it from a
   * component, because the policy is serialised when `<head>` renders, before
   * any body component runs. Both were tried and verified against a real build.
   */
  it.each(COMPONENTS)('%s emits no unhashable inline <style> element', (component) => {
    expect(withoutComments(source(component))).not.toMatch(/<style[^>]*\bis:inline/);
  });
});

/**
 * docs/REDESIGN_DECISIONS.md #18. `loading="lazy"` was hardcoded on every
 * cover. No project ships one today, so the defect is latent — and a latent
 * defect in the LCP element is worth a test precisely because there is nothing
 * to see until the media lands, at which point the opening card's cover becomes
 * the largest paint on both the projects index and the homepage's projects band
 * and is discovered only after layout instead of by the preload scanner.
 */
describe('LCP: the opening card is not lazy-loaded', () => {
  it('decides loading per card rather than hardcoding it', () => {
    const code = withoutComments(source('components/projects/ProjectCard.astro'));
    expect(code, 'a hardcoded lazy cover is the regression').not.toMatch(/loading="lazy"/);
    expect(code).toMatch(/loading=\{priority \? 'eager' : 'lazy'\}/);
  });

  it('lifts the priority as well as removing the deferral', () => {
    // `loading="eager"` alone only stops the deferral; images still start at a
    // low fetch priority during initial layout.
    const code = withoutComments(source('components/projects/ProjectCard.astro'));
    expect(code).toMatch(/fetchpriority=\{priority \? 'high' : 'auto'\}/);
  });

  it('gives the priority to the first card with an image, not to document order', () => {
    // Not `position === 0`, which is what this asserted while no project
    // shipped media. A card with no cover renders as type and cannot be the
    // Largest Contentful Paint, so hardcoding position 0 would hand
    // `fetchpriority="high"` to a heading and leave the real LCP element — a
    // 1500px plot one card later — behind `loading="lazy"`. `findIndex`
    // returning −1 collapses to 0, so a listing with no media at all behaves
    // exactly as before.
    const grid = withoutComments(source('components/projects/ProjectGrid.astro'));
    expect(grid).toContain('priority={position === priorityIndex}');
    expect(grid).toMatch(/findIndex\(\(project\) => project\.meta\.cover !== undefined\)/);
    expect(grid).not.toContain('priority={position === 0}');
  });

  it('says on the card itself when a project is unfinished', () => {
    // `isVisible()` publishes a `wip` project into every listing beside the
    // finished ones, so a silent card presents unfinished work as done and the
    // reader finds out only after clicking through. The card must use the SAME
    // predicate and the SAME string as the detail page — two labels that can
    // drift are worse than one, because they disagree in only one locale.
    const card = withoutComments(source('components/projects/ProjectCard.astro'));
    expect(card).toContain('isWorkInProgress(project)');
    expect(card).toContain('t.projects.workInProgress');

    const detail = withoutComments(source('pages/[...locale]/projects/[slug].astro'));
    expect(detail).toContain('isWorkInProgress(project)');
    expect(detail).toContain('t.projects.workInProgress');
  });

  it('renders one uniform grid — no card is promoted to the full measure', () => {
    // The listing is a set of equals. A `grid-column: 1 / -1` on the first item
    // would rank the work for the reader; the order is carried by the figure
    // number in the margin instead. This is the guard against the lead
    // treatment coming back by accident with the next layout pass.
    const grid = withoutComments(source('components/projects/ProjectGrid.astro'));
    expect(grid).not.toMatch(/grid-column:\s*1 \/ -1/);
    expect(grid).not.toContain('emphasis=');
    expect(grid).toMatch(/grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);

    const card = withoutComments(source('components/projects/ProjectCard.astro'));
    expect(card).not.toContain('card--lead');
  });

  it('keeps the reserved box that holds CLS at zero either way', () => {
    const code = source('components/projects/ProjectCard.astro');
    expect(code).toMatch(/\.card__media :global\(img\)\s*\{[^}]*aspect-ratio:\s*16 \/ 10/);
  });
});

describe('every domain has an accent rule', () => {
  /**
   * `--domain-accent` is resolved from `[data-domain]` in the stylesheet. CSS
   * cannot derive `--color-domain-${id}` from the id, so a sixth domain needs a
   * sixth rule; without one its channel segment and marker resolve an undefined
   * accent, which makes the `color-mix()` invalid and the mark transparent.
   * Mirrors the same guard in the Technical Worlds island.
   */
  it.each(DOMAIN_IDS)('ProjectCard resolves --domain-accent for %s', (id) => {
    const code = source('components/projects/ProjectCard.astro');
    expect(code).toContain(`[data-domain='${id}']`);
    expect(code).toContain(`--domain-accent: var(--color-domain-${id})`);
  });
});
