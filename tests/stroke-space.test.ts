import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DOMAINS } from '../src/config/domains';

/**
 * ONE INVARIANT: `pathLength` and `vector-effect: non-scaling-stroke` never
 * meet on the same element.
 *
 * ── Why this is a whole file ────────────────────────────────────────────────
 *
 * `pathLength="100"` rescales a path's length in USER space, so a dash value of
 * `100` resolves to `userLength / 100` user units per unit of dash.
 * `non-scaling-stroke` moves the entire stroke — width, dash array and dash
 * offset — into SCREEN space, where the same path is `scale × userLength` long.
 * Under both at once the dash is authored against one length and painted against
 * another, and the two disagree by exactly the viewport scale. `tw-draw`'s
 * finished `stroke-dasharray: 100 100` — the definition of "solid" everywhere
 * the Technical Worlds band draws a line — then paints `1 / scale` of its path.
 *
 * That shipped. Measured on a production build, 800 samples per path, real
 * browser hit-testing, the shipped frame against the same frame with
 * `stroke-dasharray` removed:
 *
 *   viewport    stage width   scale    painted
 *   1440×900        544px     1.700     58.6 %   the Bloch rim was a broken circle
 *   1280×800        507px     1.584     63.2 %   the FPGA route stopped short
 *   1040×800        300px     0.939    100.0 %   correct only by accident
 *
 * The last row is the reason this is a structural test and not a number. The
 * defect is invisible below `scale = 1` and grows continuously above it, so a
 * fixture at one window size proves nothing about any other. What holds at every
 * size is the invariant itself: keep dash and path in one space and
 * `stroke-dasharray: 100 100` over `pathLength="100"` is the whole path *by
 * definition*, whatever the scale.
 *
 * ── Why it is not a source grep ─────────────────────────────────────────────
 *
 * Because the pairing is made by the cascade, not by one line of source. The
 * `pathLength` is a presentation attribute in a `.tsx` file and the
 * `vector-effect` is a CSS declaration in an `.astro` file, and a rule three
 * hundred lines away from either can reach the element through a class it
 * inherited or a selector it did not know existed. So this reads the BUILT
 * stylesheet, resolves its selectors against the ACTUAL rendered markup of
 * every stage, and answers the question the browser answers.
 *
 * ── Why both `active` states ────────────────────────────────────────────────
 *
 * Five of the offenders — the ambient scan, both travelling pulses, the clock
 * marker and the energising sweep — are mounted only while a stage owns the
 * frame, so they do not exist in the server-rendered markup at all. Rendering
 * `DomainStage` at `active` both ways is what puts them in front of the check.
 *
 * ── The one legitimate exemption, and why it needs no exception here ────────
 *
 * `.tw-wave` genuinely cannot give up `non-scaling-stroke`: it lives under a
 * group the scroll scales anisotropically, and without the effect that scale
 * turns the hairline into an elliptical pen. It resolves the conflict the other
 * way — it declares no `pathLength`, is never dashed, and arrives on a clip
 * wipe — so the invariant below covers it with no special case. That is the
 * point of stating the rule as "never both" rather than as a list.
 */

/** Built by `tests/global-setup.ts` before any suite runs. Never built here. */
const DIST = fileURLToPath(new URL('../dist', import.meta.url));

/* ===========================================================================
   A very small CSS reader

   Enough to answer one question: which selectors carry
   `vector-effect: non-scaling-stroke`. Conditional groups are descended into,
   `@keyframes` blocks are skipped (their "selectors" are percentages, not
   elements), and everything else is a style rule.
   ======================================================================== */

interface StyleRule {
  readonly selectors: readonly string[];
  readonly declarations: string;
}

function readStyleRules(css: string): StyleRule[] {
  const rules: StyleRule[] = [];

  const walk = (text: string) => {
    let prelude = '';
    let index = 0;

    while (index < text.length) {
      const char = text[index];

      if (char === '{') {
        // Find the matching close brace for this block.
        let depth = 1;
        let end = index + 1;
        while (end < text.length && depth > 0) {
          if (text[end] === '{') depth += 1;
          else if (text[end] === '}') depth -= 1;
          end += 1;
        }
        const body = text.slice(index + 1, end - 1);
        const head = prelude.trim();

        if (head.startsWith('@')) {
          const name = head.slice(1).split(/[\s(]/, 1)[0]?.toLowerCase() ?? '';
          // Conditional groups hold ordinary style rules; keyframes do not.
          if (name !== 'keyframes' && name !== 'font-face' && name !== '-webkit-keyframes') walk(body);
        } else if (head.length > 0) {
          rules.push({
            selectors: head
              .split(',')
              .map((selector) => selector.trim())
              .filter(Boolean),
            declarations: body,
          });
        }

        prelude = '';
        index = end;
        continue;
      }

      if (char === ';' && prelude.trim().startsWith('@')) {
        // A statement at-rule such as `@import` or `@charset`.
        prelude = '';
        index += 1;
        continue;
      }

      prelude += char;
      index += 1;
    }
  };

  walk(css);
  return rules;
}

/** Every stylesheet the build emitted, concatenated. */
function builtCss(): string {
  const dir = join(DIST, '_astro');
  const files = readdirSync(dir).filter((name) => name.endsWith('.css'));
  expect(files.length, 'the build emitted no stylesheet at all').toBeGreaterThan(0);
  return files.map((name) => readFileSync(join(dir, name), 'utf8')).join('\n');
}

/* ===========================================================================
   A very small SVG reader

   The stage markup is XML-shaped — every element is closed or self-closing —
   so an element stack over its tags is exact. `expect` guards the shape rather
   than trusting it: an unbalanced walk would silently under-report ancestors,
   which is the one way this check could pass while being wrong.
   ======================================================================== */

interface Element {
  readonly tag: string;
  readonly classes: ReadonlySet<string>;
  readonly attributes: ReadonlyMap<string, string>;
  /** Closest first. */
  readonly ancestors: readonly Element[];
}

const TAG = /<(\/)?([a-zA-Z][-a-zA-Z0-9:]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/)?>/g;
const ATTRIBUTE = /([-a-zA-Z0-9:]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

function readElements(markup: string): Element[] {
  const elements: Element[] = [];
  const stack: Element[] = [];

  for (const match of markup.matchAll(TAG)) {
    const [, closing, rawTag, rawAttributes, selfClosing] = match;
    const tag = (rawTag ?? '').toLowerCase();

    if (closing) {
      const top = stack.pop();
      expect(top?.tag, `stray </${tag}> in the stage markup`).toBe(tag);
      continue;
    }

    const attributes = new Map<string, string>();
    for (const attribute of (rawAttributes ?? '').matchAll(ATTRIBUTE)) {
      const name = (attribute[1] ?? '').toLowerCase();
      attributes.set(name, attribute[2] ?? attribute[3] ?? attribute[4] ?? '');
    }

    const element: Element = {
      tag,
      classes: new Set((attributes.get('class') ?? '').split(/\s+/).filter(Boolean)),
      attributes,
      ancestors: [...stack].reverse(),
    };
    elements.push(element);

    if (!selfClosing) stack.push(element);
  }

  expect(
    stack.map((element) => element.tag),
    'the stage markup did not close every element',
  ).toEqual([]);
  return elements;
}

/* ===========================================================================
   A very small selector matcher

   It understands exactly the grammar this stylesheet uses — compounds of a
   type, classes and attribute conditions, joined by descendant combinators —
   and it REFUSES anything else rather than quietly returning `false`. A checker
   that answers "no match" to a selector it cannot parse is a checker that
   reports green for the case it was written to catch.
   ======================================================================== */

interface Compound {
  readonly tag: string | null;
  readonly classes: readonly string[];
  readonly attributes: readonly { name: string; value: string | null }[];
}

const COMPOUND = /^(?:([a-zA-Z][-a-zA-Z0-9]*)|\*)?((?:\.[-_a-zA-Z0-9]+|\[[^\]]+\])*)$/;
const CONDITION = /\[([-a-zA-Z0-9:]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]/g;

function parseCompound(text: string, selector: string): Compound {
  const match = COMPOUND.exec(text);
  if (!match) {
    throw new Error(
      `tests/stroke-space.test.ts cannot read the selector \`${selector}\`. ` +
        `Extend the matcher — never widen the invariant to fit a selector it cannot check.`,
    );
  }
  const rest = match[2] ?? '';
  const classes = [...rest.matchAll(/\.([-_a-zA-Z0-9]+)/g)].map((entry) => entry[1] ?? '');
  const attributes = [...rest.matchAll(CONDITION)].map((entry) => ({
    name: (entry[1] ?? '').toLowerCase(),
    value: entry[2] ?? entry[3] ?? entry[4] ?? null,
  }));
  return { tag: match[1]?.toLowerCase() ?? null, classes, attributes };
}

function parseSelector(selector: string): Compound[] {
  if (/[>+~]|::|:not\(|:is\(|:where\(|:has\(/.test(selector)) {
    throw new Error(
      `tests/stroke-space.test.ts cannot read the selector \`${selector}\`. ` +
        `Extend the matcher — never widen the invariant to fit a selector it cannot check.`,
    );
  }
  return selector
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => parseCompound(part, selector));
}

function matchesCompound(element: Element, compound: Compound): boolean {
  if (compound.tag && compound.tag !== element.tag) return false;
  for (const name of compound.classes) if (!element.classes.has(name)) return false;
  for (const condition of compound.attributes) {
    if (!element.attributes.has(condition.name)) return false;
    if (condition.value !== null && element.attributes.get(condition.name) !== condition.value) return false;
  }
  return true;
}

/** Descendant combinators only, which is all this stylesheet uses. */
function matches(element: Element, compounds: readonly Compound[]): boolean {
  const last = compounds[compounds.length - 1];
  if (!last || !matchesCompound(element, last)) return false;

  let remaining = compounds.slice(0, -1);
  let ancestors = element.ancestors;
  while (remaining.length > 0) {
    const compound = remaining[remaining.length - 1];
    if (!compound) return false;
    const at = ancestors.findIndex((ancestor) => matchesCompound(ancestor, compound));
    if (at === -1) return false;
    ancestors = ancestors.slice(at + 1);
    remaining = remaining.slice(0, -1);
  }
  return true;
}

/* ===========================================================================
   The check
   ======================================================================== */

/** Every stage, rendered both inert and owning the frame. */
async function renderEveryStage(): Promise<Element[]> {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { DomainStage } = await import('../src/components/visuals/worlds/stages/DomainStage');

  const elements: Element[] = [];
  for (const domain of DOMAINS) {
    for (const active of [false, true]) {
      elements.push(...readElements(renderToStaticMarkup(createElement(DomainStage, { domain, active }))));
    }
  }
  return elements;
}

describe('no stroke is measured in two coordinate spaces at once', () => {
  const nonScaling = readStyleRules(builtCss()).filter((rule) =>
    /vector-effect\s*:\s*non-scaling-stroke/.test(rule.declarations),
  );

  it('found the built rules it is supposed to be reading', () => {
    // A parse that silently returned nothing would make every assertion below
    // vacuously true — which is precisely the shape of false green this
    // repository keeps finding. The floor is well under the ~23 rules that
    // exist so ordinary churn does not produce a false red.
    expect(nonScaling.length, 'no `vector-effect: non-scaling-stroke` rule was found in the built CSS').toBeGreaterThan(
      10,
    );
  });

  it('reads every selector it is asked about, or fails', () => {
    // The matcher must never answer "no match" to a selector it does not
    // understand. This is the assertion that keeps that promise honest.
    for (const rule of nonScaling)
      for (const selector of rule.selectors) expect(() => parseSelector(selector)).not.toThrow();
  });

  it('renders enough of the band for the check to mean anything', async () => {
    const elements = await renderEveryStage();
    const normalised = elements.filter((element) => element.attributes.has('pathlength'));
    // Twelve exist in the inert markup alone; the active-only pulses,
    // the ambient scan and the clock marker take it past twenty.
    expect(
      normalised.length,
      'no element declares `pathLength` — the render is not reaching the stages',
    ).toBeGreaterThan(15);
    // Every one of them must be reachable by class, since that is what the
    // stylesheet targets. An unclassed one would be invisible to this check.
    for (const element of normalised) expect(element.classes.size).toBeGreaterThan(0);
  });

  it('never gives a `pathLength` element a non-scaling stroke', async () => {
    const elements = await renderEveryStage();
    const offences: string[] = [];

    for (const element of elements) {
      if (!element.attributes.has('pathlength')) continue;
      for (const rule of nonScaling) {
        for (const selector of rule.selectors) {
          if (!matches(element, parseSelector(selector))) continue;
          offences.push(
            `<${element.tag} class="${[...element.classes].join(' ')}" pathLength> is given ` +
              `vector-effect: non-scaling-stroke by \`${selector}\``,
          );
        }
      }
    }

    expect(
      offences,
      'A `pathLength`-normalised dash is resolved in user space and painted in screen space under ' +
        '`non-scaling-stroke`, so the finished stroke covers 1/scale of its path. Drop one of the two: ' +
        'keep `pathLength` and let the stroke scale, or keep `non-scaling-stroke` and never dash the element.',
    ).toEqual([]);
  });

  it('keeps the waveform on the other side of the same rule', async () => {
    // `.tw-wave` is the one path that must keep `non-scaling-stroke`, so it is
    // the one path that must never gain a `pathLength` or a dash. Asserting it
    // here rather than by grepping its own file states the exemption as what it
    // is — the second branch of one invariant, not a special case.
    const elements = await renderEveryStage();
    const waves = elements.filter((element) => element.classes.has('tw-wave'));
    expect(waves.length, 'no `.tw-wave` in the rendered audio stage').toBeGreaterThan(0);
    for (const wave of waves) {
      expect(wave.attributes.has('pathlength')).toBe(false);
      expect(wave.attributes.has('stroke-dasharray')).toBe(false);
    }
  });
});
