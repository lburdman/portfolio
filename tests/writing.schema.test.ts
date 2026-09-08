import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DOMAIN_IDS } from '../src/config/domains';
import {
  WRITING_KINDS,
  WRITING_STATUSES,
  contentDateSchema,
  writingContentSchema,
  writingMetaSchema,
} from '../src/content/writing-schema';

/**
 * These tests import the *production* schema — the same object
 * `src/content.config.ts` hands to Astro — and, where the content exists, run
 * it over the *real* files on disk.
 *
 * No copy of the schema is declared here. The suite this pattern replaced for
 * projects re-declared one under a comment reading "Mirror the project schema",
 * which meant the schema itself had 0% coverage and every test would have
 * stayed green through any schema change (AUDIT.md 3.1). There is nothing here
 * left to drift from.
 *
 * The on-disk sweep is written to survive an empty collection: the articles are
 * authored separately from this layer, and a suite that failed until someone
 * else's files landed would be reporting a schedule, not a defect.
 */
const WRITING_DIR = fileURLToPath(new URL('../src/content/writing', import.meta.url));

/** Every directory under the collection root, whether or not it holds an article yet. */
function directories(): string[] {
  if (!existsSync(WRITING_DIR)) return [];
  return readdirSync(WRITING_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * A directory counts as a committed article once it has an `article.json`.
 * A directory holding only `media/` is work in flight, not a broken article.
 */
function articleSlugs(): string[] {
  return directories().filter((slug) => existsSync(path.join(WRITING_DIR, slug, 'article.json')));
}

function readMeta(slug: string): unknown {
  return JSON.parse(readFileSync(path.join(WRITING_DIR, slug, 'article.json'), 'utf8'));
}

function unquote(value: string): string {
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"');
  }
  return value;
}

/**
 * Reads the YAML frontmatter of a content file as flat string fields.
 *
 * Deliberately minimal: `writingContentSchema` has exactly two fields, both
 * single-line scalars, so a full YAML parser would be a dependency bought to
 * check two strings. A file that does not match this shape fails loudly here,
 * which is the correct outcome — the loader would reject it too.
 */
function frontmatter(file: string): Record<string, unknown> {
  const raw = readFileSync(file, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!match || match[1] === undefined) {
    throw new Error(`${file} has no YAML frontmatter block.`);
  }

  const fields: Record<string, unknown> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!pair) continue;
    const [, key, value] = pair;
    if (key === undefined || value === undefined) continue;
    fields[key] = unquote(value.trim());
  }
  return fields;
}

const DIRECTORIES = directories();
const SLUGS = articleSlugs();

describe('the writing collection on disk', () => {
  it('never leaves a localized file without the article.json that gives it a date', () => {
    // An `en.md` with no `article.json` is an orphan: `joinWriting` drops it, so
    // it would silently render nowhere. A directory with neither is simply an
    // article that has not been written yet, which is fine.
    const orphans = DIRECTORIES.filter((slug) => {
      if (existsSync(path.join(WRITING_DIR, slug, 'article.json'))) return false;
      const files = readdirSync(path.join(WRITING_DIR, slug));
      return files.includes('en.md') || files.includes('es.md');
    });
    expect(orphans).toEqual([]);
  });

  it('reports whether there is anything to sweep', () => {
    if (SLUGS.length === 0) {
      // Not a failure: this layer ships before the articles do. The rejection
      // suites below still hold the schema to account.
      console.info(
        `No article.json found under ${WRITING_DIR} — the on-disk sweep has nothing to validate yet. ` +
          `Directories present: ${DIRECTORIES.join(', ') || '(none)'}.`,
      );
    }
    expect(SLUGS.every((slug) => DIRECTORIES.includes(slug))).toBe(true);
  });
});

// `it.each([])` declares no test at all, so the sweep is guarded rather than
// left to produce an empty, silently-passing suite.
const describeCommitted = SLUGS.length > 0 ? describe : describe.skip;

describeCommitted('committed articles', () => {
  it.each(SLUGS)('%s/article.json satisfies the production schema', (slug) => {
    const result = writingMetaSchema.safeParse(readMeta(slug));
    const problems = result.success
      ? ''
      : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
    expect(problems).toBe('');
  });

  it.each(SLUGS)('%s declares a slug equal to its directory name', (slug) => {
    expect(writingMetaSchema.parse(readMeta(slug)).slug).toBe(slug);
  });

  it.each(SLUGS)('%s has both an en.md and an es.md', (slug) => {
    const files = readdirSync(path.join(WRITING_DIR, slug));
    expect(files).toContain('en.md');
    expect(files).toContain('es.md');
  });

  it.each(SLUGS)('%s has frontmatter satisfying writingContentSchema in both locales', (slug) => {
    for (const locale of ['en', 'es']) {
      const file = path.join(WRITING_DIR, slug, `${locale}.md`);
      const result = writingContentSchema.safeParse(frontmatter(file));
      const problems = result.success
        ? ''
        : result.error.issues.map((issue) => `${locale}.md ${issue.path.join('.')}: ${issue.message}`).join('\n');
      expect(problems).toBe('');
    }
  });

  it.each(SLUGS)('%s uses only known domain ids', (slug) => {
    const { domains } = writingMetaSchema.parse(readMeta(slug));
    expect(domains.length).toBeGreaterThan(0);
    for (const domain of domains) expect(DOMAIN_IDS).toContain(domain);
  });

  it.each(SLUGS)('%s publishes only https links', (slug) => {
    const { links } = writingMetaSchema.parse(readMeta(slug));
    for (const url of Object.values(links ?? {})) expect(url?.startsWith('https://')).toBe(true);
  });

  it('gives every article a distinct slug', () => {
    const slugs = SLUGS.map((slug) => writingMetaSchema.parse(readMeta(slug)).slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

/**
 * A valid article, declared once and mutated per case, so each rejection proves
 * the schema refuses *one* change to something otherwise acceptable. This is a
 * fixture, not a mirror of the schema: it names values, never rules.
 */
const BASE: Record<string, unknown> = {
  slug: 'qiskit-fall-fest-fiuba-2025',
  status: 'published',
  date: '2025-11-08',
  kind: 'community',
  domains: ['quantum'],
  cover: 'media/kickoff-lecture-hall-audience.webp',
  links: { event: 'https://qiskitfallfest.org/' },
  relatedProjects: ['quantum-audio'],
};

function withField(overrides: Record<string, unknown>): unknown {
  return { ...BASE, ...overrides };
}

describe('writingMetaSchema', () => {
  it('round-trips a complete, valid article', () => {
    const result = writingMetaSchema.safeParse(BASE);
    expect(result.success).toBe(true);
    expect(writingMetaSchema.parse(BASE)).toEqual(BASE);
  });

  it('defaults status to draft when it is omitted, so nothing leaks by omission', () => {
    const { slug, date, kind, domains } = BASE;
    expect(writingMetaSchema.parse({ slug, date, kind, domains }).status).toBe('draft');
  });

  it('accepts every declared status and rejects any other', () => {
    for (const status of WRITING_STATUSES) {
      expect(writingMetaSchema.safeParse(withField({ status })).success).toBe(true);
    }
    expect(writingMetaSchema.safeParse(withField({ status: 'wip' })).success).toBe(false);
  });

  it('rejects a misspelled key instead of silently dropping it', () => {
    // `.strict()`: `relatedProject` must fail, not quietly render no related work.
    expect(writingMetaSchema.safeParse(withField({ relatedProject: ['quantum-audio'] })).success).toBe(false);
    expect(writingMetaSchema.safeParse(withField({ featured: true })).success).toBe(false);
  });

  it('rejects an unknown key inside links', () => {
    expect(writingMetaSchema.safeParse(withField({ links: { twitter: 'https://x.com' } })).success).toBe(false);
  });

  it('rejects a malformed slug', () => {
    for (const slug of ['My_Article', 'my article', '-leading', 'trailing-', 'double--hyphen', '']) {
      expect(writingMetaSchema.safeParse(withField({ slug })).success).toBe(false);
    }
  });

  it('accepts every declared kind and rejects one that is not', () => {
    for (const kind of WRITING_KINDS) {
      expect(writingMetaSchema.safeParse(withField({ kind })).success).toBe(true);
    }
    expect(writingMetaSchema.safeParse(withField({ kind: 'blogging' })).success).toBe(false);
    expect(writingMetaSchema.safeParse(withField({ kind: undefined })).success).toBe(false);
  });

  it('rejects an unknown domain and an empty domain list', () => {
    expect(writingMetaSchema.safeParse(withField({ domains: ['blockchain'] })).success).toBe(false);
    expect(writingMetaSchema.safeParse(withField({ domains: ['quantum', 'blockchain'] })).success).toBe(false);
    expect(writingMetaSchema.safeParse(withField({ domains: [] })).success).toBe(false);
  });

  it('rejects an http link, and a javascript: or data: URL with it', () => {
    expect(writingMetaSchema.safeParse(withField({ links: { event: 'http://example.com' } })).success).toBe(false);
    expect(writingMetaSchema.safeParse(withField({ links: { paper: 'javascript:alert(1)' } })).success).toBe(false);
    expect(writingMetaSchema.safeParse(withField({ links: { slides: 'data:text/html,x' } })).success).toBe(false);
    expect(writingMetaSchema.safeParse(withField({ links: { code: 'https://github.com/x/y' } })).success).toBe(true);
  });

  it('rejects a cover that escapes the article directory', () => {
    for (const cover of ['../other/cover.webp', '/media/cover.webp', 'cover.webp', 'media/../../secret.webp']) {
      expect(writingMetaSchema.safeParse(withField({ cover })).success).toBe(false);
    }
    expect(writingMetaSchema.safeParse(withField({ cover: 'media/cover.webp' })).success).toBe(true);
  });

  it('rejects a relatedProjects entry that is not a slug', () => {
    expect(writingMetaSchema.safeParse(withField({ relatedProjects: ['Not A Slug'] })).success).toBe(false);
    expect(writingMetaSchema.safeParse(withField({ relatedProjects: [] })).success).toBe(true);
  });

  it('requires a date, because the section is a chronology', () => {
    const { slug, kind, domains } = BASE;
    expect(writingMetaSchema.safeParse({ slug, kind, domains }).success).toBe(false);
  });
});

/**
 * True when the schema would let this date into the site.
 *
 * The `try`/`catch` is deliberately kept even though the schema no longer
 * throws. It was added when `contentDateSchema`'s refinement called
 * `new Date(...).toISOString()` unguarded: for a value whose month or day is out
 * of range — `2025-13-01`, `08-11-2025` — the `Date` is invalid and
 * `toISOString()` raises `RangeError: Invalid time value` from inside the
 * refinement, which escapes `safeParse` entirely. Impossible dates were still
 * refused, but by crashing the build with "Invalid time value" and no filename
 * instead of the schema's own message naming the offending file.
 *
 * That guard now exists (`Number.isNaN(parsed.getTime())`, in
 * `src/content/writing-schema.ts`), so every case below returns cleanly. The
 * wrapper stays because these assertions are written against the contract that
 * actually matters — "this value never reaches a page" — and that contract is
 * satisfied by a rejection *or* a throw. Written this way, the suite proves the
 * guarantee holds regardless of which mechanism enforces it, and it would not
 * quietly start passing for the wrong reason if the guard were ever removed.
 */
function accepts(value: unknown): boolean {
  try {
    return contentDateSchema.safeParse(value).success;
  } catch {
    return false;
  }
}

describe('contentDateSchema', () => {
  it('accepts a day-precision date', () => {
    expect(accepts('2025-11-08')).toBe(true);
    expect(writingMetaSchema.safeParse(withField({ date: '2025-11-08' })).success).toBe(true);
  });

  it('accepts a month-precision date, which is a supported state and not a shortcut', () => {
    expect(accepts('2025-11')).toBe(true);
    expect(writingMetaSchema.safeParse(withField({ date: '2025-11' })).success).toBe(true);
  });

  it('never accepts an impossible month', () => {
    expect(accepts('2025-13-01')).toBe(false);
    expect(accepts('2025-13')).toBe(false);
    expect(accepts('2025-00-01')).toBe(false);
  });

  it('never accepts a day that does not exist in its month', () => {
    expect(accepts('2025-02-30')).toBe(false);
    expect(accepts('2025-02-29')).toBe(false);
    expect(accepts('2024-02-29')).toBe(true);
  });

  it('never accepts a year alone', () => {
    expect(accepts('2025')).toBe(false);
  });

  it('never accepts a day-first date, which would otherwise read as a different day', () => {
    expect(accepts('08-11-2025')).toBe(false);
  });

  it('never accepts an unpadded or non-string value', () => {
    expect(accepts('2025-1-8')).toBe(false);
    expect(accepts(20251108)).toBe(false);
  });
});

describe('writingContentSchema', () => {
  it('accepts a localized frontmatter pair', () => {
    expect(
      writingContentSchema.safeParse({
        title: 'Qiskit Fall Fest at FIUBA',
        summary: 'Mentoring a hackathon cohort through their first quantum circuits.',
      }).success,
    ).toBe(true);
  });

  it('rejects an empty title', () => {
    expect(writingContentSchema.safeParse({ title: '', summary: 'Long enough summary.' }).success).toBe(false);
  });

  it('rejects a summary too short to be a summary', () => {
    expect(writingContentSchema.safeParse({ title: 'A', summary: 'short' }).success).toBe(false);
  });

  it('rejects shared metadata leaking back into a localized file', () => {
    // The whole point of the split: `date` lives in article.json, once.
    expect(
      writingContentSchema.safeParse({
        title: 'Qiskit Fall Fest at FIUBA',
        summary: 'Mentoring a hackathon cohort through their first quantum circuits.',
        date: '2025-11-08',
      }).success,
    ).toBe(false);
  });
});
