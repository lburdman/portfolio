import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { HOME_PATH } from '../src/config/navigation';
import { LOCALES, localizePath } from '../src/i18n';
import { HERO_FIELD_LINE_COUNT, HERO_FIELD_TIERS, REST_ANGLE_DEG, tierLineCount } from '../src/lib/motion/magnet-field';

/**
 * The hero field survives the Content Security Policy — proved against the
 * BUILD, because development cannot prove it.
 *
 * ── The failure this exists to catch ────────────────────────────────────────
 *
 * `astro.config.mjs` emits a hash-based CSP in a `<meta http-equiv>` (GitHub
 * Pages cannot set headers) with no `'unsafe-inline'` and no `'unsafe-hashes'`.
 * A hash authorises a `<style>` ELEMENT and never a style ATTRIBUTE, and
 * `style-src-attr` falls back to `style-src` — so the browser drops every
 * inline style attribute this site emits.
 *
 * The component this field is adapted from (React Bits' "Magnet Lines")
 * inline-styles the grid tracks, the line size, the colour and, fatally, the
 * `transform: rotate(var(--rotate))` declaration itself. Under this policy that
 * ships as two hundred zero-size invisible spans, with:
 *
 *   · no build warning,
 *   · no console error,
 *   · and a perfect preview in `astro dev`, which serves no CSP at all.
 *
 * Nothing else in this repository would notice. `tests/layout.test.ts` proves
 * no component *emits* a style attribute; that is necessary and not sufficient,
 * because it says nothing about whether the declarations that were moved out of
 * the markup actually landed in a stylesheet. This file closes that gap from
 * the other side: it reads the emitted CSS and fails if the field's geometry,
 * colour or rotation is missing from it — which is precisely the state a
 * CSP-stripped field would be in.
 *
 * ── Why `dist/` ─────────────────────────────────────────────────────────────
 *
 * The CSP `<meta>` and the bundled stylesheet only exist in a build.
 * `tests/global-setup.ts` produces one, once, before any suite. Nothing here
 * builds.
 */

/** Built by `tests/global-setup.ts` before any suite runs. Never built here. */
const DIST = fileURLToPath(new URL('../dist', import.meta.url));

const HOME_PAGES = LOCALES.map((locale) => {
  const route = localizePath(HOME_PATH, locale, '');
  return {
    name: `${locale} homepage`,
    file: join(DIST, ...route.split('/').filter(Boolean), 'index.html'),
  };
});

/**
 * Every stylesheet the build emitted, concatenated with all whitespace
 * removed.
 *
 * The output is minified and the minifier rewrites more than spacing —
 * `transform-origin: center` comes back as `50%`, `repeat(6, 1fr)` loses its
 * space — so the assertions below are written against the compacted text and
 * accept either spelling where the minifier has a choice. Matching the source
 * formatting instead would be a test of Lightning CSS, not of this component.
 */
function builtCss(): string {
  const dir = join(DIST, '_astro');
  const files = readdirSync(dir).filter((name) => name.endsWith('.css'));
  expect(files.length, 'the build emitted no stylesheet at all').toBeGreaterThan(0);
  return files
    .map((name) => readFileSync(join(dir, name), 'utf8'))
    .join('\n')
    .replace(/\s+/g, '');
}

/** The field's markup, from `<div … data-hero-field` to its closing tag. */
function fieldMarkupOf(html: string): string {
  const start = html.indexOf('data-hero-field');
  expect(start, 'no hero field in the built document').toBeGreaterThan(-1);
  const open = html.lastIndexOf('<', start);
  const end = html.indexOf('</div>', start);
  expect(end).toBeGreaterThan(open);
  return html.slice(open, end + '</div>'.length);
}

let css = '';
const documents = new Map<string, string>();

beforeAll(() => {
  css = builtCss();
  for (const { name, file } of HOME_PAGES) documents.set(name, readFileSync(file, 'utf8'));
});

describe('the policy this guard is written against is the policy that ships', () => {
  it('emits a hash-based CSP with no inline-style escape hatch', () => {
    for (const [name, html] of documents) {
      const meta = /<meta http-equiv="content-security-policy" content="([^"]*)"/i.exec(html);
      expect(meta, `${name}: no CSP meta tag`).not.toBeNull();
      const policy = meta?.[1] ?? '';

      expect(policy, `${name}: style-src missing`).toContain("style-src 'self'");
      expect(policy).toContain("script-src 'self'");
      // If either of these ever appears, the rest of this file stops being a
      // test of anything — and the repository has taken the one shortcut its
      // instructions forbid.
      expect(policy).not.toContain('unsafe-inline');
      expect(policy).not.toContain('unsafe-hashes');
      expect(policy).toMatch(/style-src [^;]*'sha256-/);
    }
  });
});

describe('the field is in the served HTML, and carries no style attribute', () => {
  it('renders one line per span, for the widest tier', () => {
    for (const [name, html] of documents) {
      const field = fieldMarkupOf(html);
      const lines = field.match(/data-hero-line/g) ?? [];
      expect(lines.length, `${name}: wrong number of lines`).toBe(HERO_FIELD_LINE_COUNT);
    }
  });

  it('emits no style attribute anywhere inside the field', () => {
    for (const [name, html] of documents) {
      // The whole reason the geometry had to move into the stylesheet. One
      // `style=""` here and that element is invisible in production only.
      expect(fieldMarkupOf(html), `${name}: inline style inside the hero field`).not.toMatch(/\sstyle=/);
    }
  });

  it('is decoration, and says so', () => {
    for (const [name, html] of documents) {
      expect(fieldMarkupOf(html), `${name}: the field must be aria-hidden`).toMatch(/aria-hidden="true"/);
    }
  });
});

describe('every visual property the field needs is in a stylesheet, not on an element', () => {
  it('declares the rotation that the runtime custom property drives', () => {
    // THE assertion. `element.style.setProperty('--hero-field-angle', …)` is a
    // CSSOM write and CSP permits it — but it drives nothing unless a
    // stylesheet consumes the value. In the stock component this declaration
    // is an inline style, which is exactly why the stock component ships
    // invisible here.
    expect(css).toContain('transform:rotate(var(--hero-field-angle))');
    // `center` and `50%` are the same computed value; the minifier picks.
    expect(css).toMatch(/transform-origin:(center|50%)/);
  });

  it('gives the field a resting angle, so it is correct before and without JavaScript', () => {
    // Read from the constant, not written out: the CSS default and
    // `REST_ANGLE_DEG` are one decision expressed twice, and this is what
    // stops the field from snapping the moment the first pointer event lands.
    expect(css).toContain(`--hero-field-angle:${REST_ANGLE_DEG}deg`);
    expect(css).toMatch(/--hero-field-heat:0[;}]/);
  });

  it('gives every line a real size and a real colour — not the zero-size failure mode', () => {
    // A CSP-stripped field is not merely unrotated: it has no width, no height
    // and no background either, because all three were inline too. Asserting
    // the declarations exist in CSS is asserting the field is visible at all.
    expect(css).toMatch(/\.hero-field__line[^{]*\{[^}]*width:1\.75rem/);
    expect(css).toMatch(/\.hero-field__line[^{]*\{[^}]*height:var\(--border-hairline\)/);
    expect(css).toMatch(/\.hero-field__line[^{]*\{[^}]*background-color:color-mix\(/);
  });

  it('takes its colour from tokens rather than from a literal', () => {
    const rule = /\.hero-field__line[^{]*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rule).toContain('var(--color-rule)');
    expect(rule).toContain('var(--color-accent)');
    // `src/styles/tokens.css` is the only file allowed to name a colour, and
    // the component this was adapted from ships `#efefef` as a prop default.
    expect(rule).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it('lays the grid out in CSS, never from a computed track list', () => {
    for (const tier of HERO_FIELD_TIERS) {
      expect(css).toContain(`grid-template-columns:repeat(${tier.columns},1fr)`);
      expect(css).toContain(`grid-template-rows:repeat(${tier.rows},1fr)`);
    }
  });
});

describe('the stylesheet and the tier table cannot drift apart', () => {
  /**
   * Two copies of the same numbers exist by necessity: `repeat()` cannot take
   * a `var()` as its count, and a track list computed in JavaScript would have
   * to be written back as an inline style — the thing that does not work here.
   * This is what makes the duplication safe.
   */
  const source = readFileSync(
    fileURLToPath(new URL('../src/components/visuals/hero/MagnetField.astro', import.meta.url)),
    'utf8',
  );

  it('declares each tier in the same order, at the same breakpoints', () => {
    const columns = [...source.matchAll(/grid-template-columns:\s*repeat\((\d+), 1fr\)/g)].map((m) => Number(m[1]));
    const rows = [...source.matchAll(/grid-template-rows:\s*repeat\((\d+), 1fr\)/g)].map((m) => Number(m[1]));
    const breakpoints = [
      0,
      ...[...source.matchAll(/@media \(min-width: (\d+(?:\.\d+)?)rem\)/g)].map((m) => Number(m[1])),
    ];

    expect(columns).toEqual(HERO_FIELD_TIERS.map((tier) => tier.columns));
    expect(rows).toEqual(HERO_FIELD_TIERS.map((tier) => tier.rows));
    expect(breakpoints).toEqual(HERO_FIELD_TIERS.map((tier) => tier.minWidthRem));
  });

  it('hides exactly the tail each tier cannot place', () => {
    // One `:nth-child()` threshold per tier that is not the widest, each set
    // to one past that tier's line count. A wrong number here leaves lines
    // stacked into a row that has no track for them.
    const thresholds = [...source.matchAll(/nth-child\(n \+ (\d+)\)\s*\{\s*display: none/g)].map((m) => Number(m[1]));
    const expected = HERO_FIELD_TIERS.slice(0, -1).map((tier) => tierLineCount(tier) + 1);
    expect(thresholds).toEqual(expected);

    // …and every hidden tail is shown again by the tier that can place it.
    const shown = [...source.matchAll(/nth-child\(n \+ (\d+)\)\s*\{\s*display: block/g)].map((m) => Number(m[1]));
    expect(shown).toEqual(expected);
  });
});
