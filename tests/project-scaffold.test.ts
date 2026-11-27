import { describe, expect, it } from 'vitest';
import { projectContentSchema, projectMetaSchema } from '../src/content/schema';
import { scaffoldBody, scaffoldMeta } from '../scripts/project-scaffold.mjs';

/**
 * `scripts/project-new.mjs` promises that what it scaffolds passes
 * `npm run project:validate` immediately. These tests hold it to that against
 * the *production* schema, without touching the filesystem.
 */

const LOCALES = ['en', 'es'] as const;

/**
 * Minimal frontmatter reader: `key: 'single quoted value'` lines between the
 * leading `---` fences. Strict on purpose — a duplicate key, or any line it
 * does not understand, throws, because YAML mappings need unique keys and a
 * scaffold the parser cannot read is not one an author can trust.
 */
function parseFrontmatter(markdown: string): Record<string, string> {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(markdown);
  if (!match) throw new Error('No frontmatter block');
  const data: Record<string, string> = {};
  for (const line of (match[1] ?? '').split('\n')) {
    const entry = /^(\w+): '((?:[^']|'')*)'$/.exec(line);
    const key = entry?.[1];
    const raw = entry?.[2];
    if (key === undefined || raw === undefined) throw new Error(`Unparseable frontmatter line: ${line}`);
    if (Object.prototype.hasOwnProperty.call(data, key)) throw new Error(`Duplicate frontmatter key: ${key}`);
    data[key] = raw.replace(/''/g, "'");
  }
  return data;
}

describe('frontmatter parser', () => {
  it('reads quoted values', () => {
    expect(parseFrontmatter("---\ntitle: 'It''s'\n---\nbody\n")).toEqual({ title: "It's" });
  });

  it('rejects duplicate keys', () => {
    expect(() => parseFrontmatter("---\ntitle: 'A'\ntitle: 'B'\n---\n")).toThrow(/Duplicate/);
  });

  it('rejects a missing block', () => {
    expect(() => parseFrontmatter('no frontmatter')).toThrow();
  });
});

describe('project:new scaffold', () => {
  it('scaffolds meta that the production schema accepts, as a draft', () => {
    const meta = scaffoldMeta('fpga-fft-core');
    const parsed = projectMetaSchema.safeParse(meta);
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues)).toBe(true);
    expect(meta.status).toBe('draft');
    expect(meta.slug).toBe('fpga-fft-core');
  });

  it.each(LOCALES)('scaffolds %s frontmatter that the production schema accepts', (locale) => {
    const data = parseFrontmatter(scaffoldBody(locale));
    expect(Object.keys(data).sort()).toEqual(['summary', 'title']);
    const parsed = projectContentSchema.safeParse(data);
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues)).toBe(true);
  });

  it('keeps the same structure in both locales and tells authors what to replace', () => {
    const headings = (text: string) => text.match(/^## /gm)?.length ?? 0;
    const en = scaffoldBody('en');
    const es = scaffoldBody('es');
    expect(headings(en)).toBeGreaterThan(0);
    expect(headings(es)).toBe(headings(en));
    for (const text of [en, es]) {
      expect(text).toContain('TODO:');
      expect(parseFrontmatter(text).title).toContain('TODO');
      expect(parseFrontmatter(text).summary).toContain('TODO');
    }
  });
});
