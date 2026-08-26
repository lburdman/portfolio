import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DOMAIN_IDS } from '../src/config/domains';
import { PROJECT_STATUSES, externalUrlSchema, projectContentSchema, projectMetaSchema } from '../src/content/schema';

/**
 * These tests import the *production* schema — the same object
 * `src/content.config.ts` hands to Astro and `scripts/project-validate.mjs`
 * validates against — and run it over the *real* files on disk.
 *
 * The suite this replaces did neither. It re-declared the schema under a
 * comment reading "Mirror the project schema from content/config.ts", so
 * `src/content/config.ts` had 0% coverage and every one of its 17 tests would
 * have stayed green through any schema change. Its fixtures had already
 * drifted from the content they claimed to describe: five tags listed for
 * `quantum-audio` where the file had six.
 *
 * Reading the real files makes that class of drift impossible: there is
 * nothing left to drift from.
 */
const PROJECTS_DIR = fileURLToPath(new URL('../src/content/projects', import.meta.url));

function projectSlugs(): string[] {
  return readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readMeta(slug: string): unknown {
  return JSON.parse(readFileSync(path.join(PROJECTS_DIR, slug, 'project.json'), 'utf8'));
}

const SLUGS = projectSlugs();

describe('real project content', () => {
  it('finds project directories to validate', () => {
    // Guards the tests below: a bad glob that found nothing would otherwise
    // make every `it.each` vacuously pass.
    expect(SLUGS.length).toBeGreaterThan(0);
  });

  it.each(SLUGS)('%s/project.json satisfies the production schema', (slug) => {
    const result = projectMetaSchema.safeParse(readMeta(slug));
    const problems = result.success
      ? ''
      : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
    expect(problems).toBe('');
  });

  it.each(SLUGS)('%s declares a slug equal to its directory name', (slug) => {
    expect(projectMetaSchema.parse(readMeta(slug)).slug).toBe(slug);
  });

  it.each(SLUGS)('%s has both an en.md and an es.md', (slug) => {
    const files = readdirSync(path.join(PROJECTS_DIR, slug));
    expect(files).toContain('en.md');
    expect(files).toContain('es.md');
  });

  it.each(SLUGS)('%s uses only known domain ids', (slug) => {
    const { domains } = projectMetaSchema.parse(readMeta(slug));
    expect(domains.length).toBeGreaterThan(0);
    for (const domain of domains) expect(DOMAIN_IDS).toContain(domain);
  });

  it.each(SLUGS)('%s publishes only https links', (slug) => {
    const { links } = projectMetaSchema.parse(readMeta(slug));
    for (const url of Object.values(links ?? {})) expect(url?.startsWith('https://')).toBe(true);
  });

  it('gives every project a distinct slug', () => {
    const slugs = SLUGS.map((slug) => projectMetaSchema.parse(readMeta(slug)).slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('resolves every `related` slug to a project that exists', () => {
    const known = new Set(SLUGS);
    const dangling: string[] = [];
    for (const slug of SLUGS) {
      for (const related of projectMetaSchema.parse(readMeta(slug)).related ?? []) {
        if (!known.has(related)) dangling.push(`${slug} -> ${related}`);
      }
    }
    expect(dangling).toEqual([]);
  });
});

/**
 * Rejection cases are built by mutating a real project rather than a literal
 * declared alongside the assertion, so each one proves the schema rejects a
 * change to content that is otherwise valid today.
 */
const BASE = readMeta(SLUGS[0] as string) as Record<string, unknown>;

function withField(overrides: Record<string, unknown>): unknown {
  return { ...BASE, ...overrides };
}

describe('projectMetaSchema rejections', () => {
  it('accepts the unmodified real project it mutates', () => {
    expect(projectMetaSchema.safeParse(withField({})).success).toBe(true);
  });

  it('rejects an empty domains array', () => {
    expect(projectMetaSchema.safeParse(withField({ domains: [] })).success).toBe(false);
  });

  it('rejects a domain id that is not one of DOMAIN_IDS', () => {
    expect(projectMetaSchema.safeParse(withField({ domains: ['blockchain'] })).success).toBe(false);
  });

  it('rejects an unknown domain hidden among valid ones', () => {
    expect(projectMetaSchema.safeParse(withField({ domains: ['ai', 'blockchain'] })).success).toBe(false);
  });

  it('rejects a slug with uppercase or underscores', () => {
    expect(projectMetaSchema.safeParse(withField({ slug: 'My_Project' })).success).toBe(false);
  });

  it('rejects a slug with spaces or leading and trailing hyphens', () => {
    for (const slug of ['my project', '-leading', 'trailing-', 'double--hyphen', '']) {
      expect(projectMetaSchema.safeParse(withField({ slug })).success).toBe(false);
    }
  });

  it('rejects a negative order', () => {
    expect(projectMetaSchema.safeParse(withField({ order: -1 })).success).toBe(false);
  });

  it('rejects a fractional order', () => {
    expect(projectMetaSchema.safeParse(withField({ order: 1.5 })).success).toBe(false);
  });

  it('rejects an empty stack', () => {
    expect(projectMetaSchema.safeParse(withField({ stack: [] })).success).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(projectMetaSchema.safeParse(withField({ status: 'archived' })).success).toBe(false);
    for (const status of PROJECT_STATUSES) {
      expect(projectMetaSchema.safeParse(withField({ status })).success).toBe(true);
    }
  });

  it('rejects a misspelled field instead of silently dropping it', () => {
    // `feautred: true` must not parse into a quietly unfeatured project.
    expect(projectMetaSchema.safeParse(withField({ feautred: true })).success).toBe(false);
  });

  it('rejects a cover that escapes the project directory', () => {
    for (const cover of ['../other/cover.webp', '/media/cover.webp', 'cover.webp']) {
      expect(projectMetaSchema.safeParse(withField({ cover })).success).toBe(false);
    }
    expect(projectMetaSchema.safeParse(withField({ cover: 'media/cover.webp' })).success).toBe(true);
  });

  it('rejects an implausible year and accepts a real one', () => {
    expect(projectMetaSchema.safeParse(withField({ year: 20024 })).success).toBe(false);
    expect(projectMetaSchema.safeParse(withField({ year: '2024' })).success).toBe(false);
    expect(projectMetaSchema.safeParse(withField({ year: 2024 })).success).toBe(true);
  });

  it('applies the safe defaults when status, featured and order are omitted', () => {
    const { slug, domains, stack } = projectMetaSchema.parse(BASE);
    const parsed = projectMetaSchema.parse({ slug, domains, stack });
    // Defaulting to `draft` means a half-written project cannot leak into a build.
    expect(parsed.status).toBe('draft');
    expect(parsed.featured).toBe(false);
    expect(parsed.order).toBe(99);
  });
});

/**
 * The audit's LOW-severity finding, reproduced as a test: `z.url()` is backed
 * by `new URL()`, which accepts `javascript:` and `data:` — and these values are
 * written straight into `href`. It must not be enough on its own.
 */
describe('link URLs', () => {
  it('rejects a javascript: URL', () => {
    expect(externalUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
    expect(projectMetaSchema.safeParse(withField({ links: { github: 'javascript:alert(1)' } })).success).toBe(false);
  });

  it('rejects a data: URL', () => {
    expect(externalUrlSchema.safeParse('data:text/html,<script>alert(1)</script>').success).toBe(false);
  });

  it('rejects plain http', () => {
    expect(externalUrlSchema.safeParse('http://example.com').success).toBe(false);
  });

  it('accepts https', () => {
    expect(externalUrlSchema.safeParse('https://github.com/lburdman/augmenta').success).toBe(true);
  });

  it('rejects an unknown link kind', () => {
    expect(projectMetaSchema.safeParse(withField({ links: { twitter: 'https://x.com' } })).success).toBe(false);
  });
});

describe('projectContentSchema', () => {
  it('accepts a localized frontmatter pair', () => {
    expect(
      projectContentSchema.safeParse({
        title: 'Augmenta',
        summary: 'A privacy layer for LLM workflows with PII detection and anonymization.',
      }).success,
    ).toBe(true);
  });

  it('rejects an empty title', () => {
    expect(projectContentSchema.safeParse({ title: '', summary: 'Long enough summary.' }).success).toBe(false);
  });

  it('rejects a summary that is too short to be a summary', () => {
    expect(projectContentSchema.safeParse({ title: 'A', summary: 'short' }).success).toBe(false);
  });

  it('rejects shared metadata leaking back into a localized file', () => {
    // The whole point of the split: `stack` lives in project.json, once.
    expect(
      projectContentSchema.safeParse({
        title: 'Augmenta',
        summary: 'A privacy layer for LLM workflows.',
        stack: ['Python'],
      }).success,
    ).toBe(false);
  });
});
