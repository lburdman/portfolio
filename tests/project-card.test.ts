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
