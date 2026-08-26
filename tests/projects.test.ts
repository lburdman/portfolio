import { describe, expect, it } from 'vitest';
import { projectMetaSchema } from '../src/content/schema';
import { contentId, contentIdFromEntryPath, metaIdFromEntryPath, parseContentId } from '../src/lib/projects/id';
import {
  compareProjects,
  featuredProjects,
  joinProjects,
  projectBySlug,
  projectsByDomain,
  relatedProjects,
  resolveProject,
  visibleDomains,
  visibleProjects,
  visibleSlugs,
} from '../src/lib/projects/query';
import type { ProjectContentEntry, ProjectMeta } from '../src/lib/projects/types';
import { isFeatured, isVisible, isWorkInProgress } from '../src/lib/projects/visibility';

/**
 * The join, the sort, the visibility rule and the filters, tested as plain
 * functions over plain objects.
 *
 * The audit found this logic inside `.astro` files, where no test could reach
 * it — and where it had already diverged: the listing filtered
 * `status === 'published'` while the detail route filtered `status !== 'draft'`,
 * so a `wip` project would have had a live, sitemap-eligible URL that appeared
 * in no listing. `src/lib/projects/` exists so that divergence is not
 * expressible, and the "wip" block below is the regression test for it.
 */

/** Built through the production schema, so a fixture cannot describe a shape the schema forbids. */
function meta(overrides: Partial<ProjectMeta> & { slug: string }): ProjectMeta {
  return projectMetaSchema.parse({
    domains: ['ai'],
    stack: ['Python'],
    ...overrides,
  });
}

function entry(slug: string, locale: 'en' | 'es', title: string, summary: string): ProjectContentEntry {
  return { slug, locale, data: { title, summary } };
}

/** Both locales for a slug, with the locale visible in the title so fallbacks are detectable. */
function bothLocales(slug: string, enTitle: string, esTitle: string): ProjectContentEntry[] {
  return [
    entry(slug, 'en', enTitle, `English summary for ${slug}.`),
    entry(slug, 'es', esTitle, `Resumen en español de ${slug}.`),
  ];
}

const METAS: ProjectMeta[] = [
  meta({ slug: 'alpha', status: 'published', featured: true, order: 2, domains: ['ai'] }),
  meta({ slug: 'beta', status: 'published', featured: false, order: 1, domains: ['audio', 'ai'] }),
  meta({ slug: 'gamma', status: 'wip', featured: true, order: 3, domains: ['fpga'] }),
  meta({ slug: 'delta', status: 'draft', featured: true, order: 0, domains: ['quantum'] }),
];

const ENTRIES: ProjectContentEntry[] = [
  ...bothLocales('alpha', 'Alpha', 'Alfa'),
  ...bothLocales('beta', 'Beta', 'Beta ES'),
  ...bothLocales('gamma', 'Gamma', 'Gama'),
  ...bothLocales('delta', 'Delta', 'Delta ES'),
];

const SOURCES = joinProjects(METAS, ENTRIES);

describe('joinProjects', () => {
  it('attaches both locales to every project', () => {
    expect(SOURCES).toHaveLength(4);
    for (const source of SOURCES) {
      expect(Object.keys(source.locales).sort()).toEqual(['en', 'es']);
    }
  });

  it('keeps a project whose Spanish translation has not been written yet', () => {
    const partial = joinProjects([meta({ slug: 'alpha' })], [entry('alpha', 'en', 'Alpha', 'Only English.')]);
    expect(partial).toHaveLength(1);
    expect(Object.keys(partial[0]!.locales)).toEqual(['en']);
  });

  it('drops a localized file whose project.json does not exist', () => {
    // An orphan en.md is a content error, reported by project:validate — not
    // something to render as a project with no metadata.
    const orphaned = joinProjects([], [entry('ghost', 'en', 'Ghost', 'No metadata exists.')]);
    expect(orphaned).toEqual([]);
  });
});

describe('resolveProject', () => {
  it('returns the requested locale when it exists', () => {
    const source = SOURCES.find((candidate) => candidate.meta.slug === 'alpha')!;
    expect(resolveProject(source, 'es')).toMatchObject({ locale: 'es', title: 'Alfa' });
    expect(resolveProject(source, 'en')).toMatchObject({ locale: 'en', title: 'Alpha' });
  });

  it('falls back to English rather than dropping an untranslated project', () => {
    const source = joinProjects([meta({ slug: 'alpha' })], [entry('alpha', 'en', 'Alpha', 'Only English.')])[0]!;
    const resolved = resolveProject(source, 'es');
    expect(resolved.title).toBe('Alpha');
    // The caller can tell it is reading a fallback, e.g. to set `lang` correctly.
    expect(resolved.locale).toBe('en');
  });

  it('throws when a project has no localized content at all', () => {
    const source = joinProjects([meta({ slug: 'alpha' })], [])[0]!;
    expect(() => resolveProject(source, 'en')).toThrow(/no en\.md/);
  });
});

describe('visibility', () => {
  it('treats published and wip as public and draft as not', () => {
    expect(isVisible(meta({ slug: 'a', status: 'published' }))).toBe(true);
    expect(isVisible(meta({ slug: 'a', status: 'wip' }))).toBe(true);
    expect(isVisible(meta({ slug: 'a', status: 'draft' }))).toBe(false);
  });

  it('never features a draft, however it is flagged', () => {
    expect(isFeatured(meta({ slug: 'a', status: 'draft', featured: true }))).toBe(false);
    expect(isFeatured(meta({ slug: 'a', status: 'published', featured: true }))).toBe(true);
    expect(isFeatured(meta({ slug: 'a', status: 'wip', featured: true }))).toBe(true);
    expect(isFeatured(meta({ slug: 'a', status: 'published', featured: false }))).toBe(false);
  });

  it('flags wip so a surface can label it without redefining visibility', () => {
    expect(isWorkInProgress(meta({ slug: 'a', status: 'wip' }))).toBe(true);
    expect(isWorkInProgress(meta({ slug: 'a', status: 'published' }))).toBe(false);
  });

  it('accepts a raw meta, a source and a resolved project alike', () => {
    const source = SOURCES.find((candidate) => candidate.meta.slug === 'gamma')!;
    expect(isVisible(source.meta)).toBe(true);
    expect(isVisible(source)).toBe(true);
    expect(isVisible(resolveProject(source, 'en'))).toBe(true);
  });
});

/**
 * The exact defect from AUDIT.md 2.1, as a regression test. `gamma` is `wip`:
 * under the old split rules it was absent from the listing
 * (`status === 'published'`) and present on the detail route
 * (`status !== 'draft'`).
 */
describe('a wip project is treated identically by every consumer', () => {
  it('appears in the listing', () => {
    expect(visibleProjects(SOURCES, 'en').map((project) => project.meta.slug)).toContain('gamma');
  });

  it('is reachable by slug', () => {
    expect(projectBySlug(SOURCES, 'gamma', 'en')?.meta.slug).toBe('gamma');
  });

  it('gets a static path built for it', () => {
    expect(visibleSlugs(SOURCES)).toContain('gamma');
  });

  it('appears in the featured set, since it is flagged featured', () => {
    expect(featuredProjects(SOURCES, 'en').map((project) => project.meta.slug)).toContain('gamma');
  });

  it('is offered by the domain filter', () => {
    expect(visibleDomains(SOURCES, 'en')).toContain('fpga');
    expect(projectsByDomain(SOURCES, 'fpga', 'en').map((project) => project.meta.slug)).toEqual(['gamma']);
  });

  it('agrees across listing, detail and static paths for every project', () => {
    // The property the audit's bug violated: one set, not three.
    const listed = new Set(visibleProjects(SOURCES, 'en').map((project) => project.meta.slug));
    const paths = new Set(visibleSlugs(SOURCES));
    const reachable = new Set(
      METAS.map((candidate) => candidate.slug).filter((slug) => projectBySlug(SOURCES, slug, 'en') !== undefined),
    );
    expect(paths).toEqual(listed);
    expect(reachable).toEqual(listed);
  });

  it('holds in Spanish exactly as it does in English', () => {
    expect(visibleProjects(SOURCES, 'es').map((project) => project.meta.slug)).toEqual(
      visibleProjects(SOURCES, 'en').map((project) => project.meta.slug),
    );
  });
});

describe('a draft project is invisible everywhere', () => {
  it('is absent from the listing, the featured set and the static paths', () => {
    expect(visibleProjects(SOURCES, 'en').map((project) => project.meta.slug)).not.toContain('delta');
    expect(featuredProjects(SOURCES, 'en').map((project) => project.meta.slug)).not.toContain('delta');
    expect(visibleSlugs(SOURCES)).not.toContain('delta');
  });

  it('is not reachable by slug', () => {
    expect(projectBySlug(SOURCES, 'delta', 'en')).toBeUndefined();
  });

  it('does not contribute its domain to the filter', () => {
    // `quantum` occurs only on the draft, so offering it would produce an empty filter.
    expect(visibleDomains(SOURCES, 'en')).not.toContain('quantum');
  });
});

describe('ordering', () => {
  it('sorts by order ascending', () => {
    expect(visibleProjects(SOURCES, 'en').map((project) => project.meta.slug)).toEqual(['beta', 'alpha', 'gamma']);
  });

  it('breaks an order tie on the localized title, so ES and EN can differ', () => {
    const metas = [meta({ slug: 'zulu', status: 'published' }), meta({ slug: 'kilo', status: 'published' })];
    const sources = joinProjects(metas, [
      ...bothLocales('zulu', 'Aardvark', 'Zorro'),
      ...bothLocales('kilo', 'Zebra', 'Ardilla'),
    ]);
    expect(visibleProjects(sources, 'en').map((project) => project.meta.slug)).toEqual(['zulu', 'kilo']);
    expect(visibleProjects(sources, 'es').map((project) => project.meta.slug)).toEqual(['kilo', 'zulu']);
  });

  it('breaks a title tie on the slug, so the build is deterministic', () => {
    const metas = [meta({ slug: 'second', status: 'published' }), meta({ slug: 'first', status: 'published' })];
    const sources = joinProjects(metas, [
      ...bothLocales('second', 'Same', 'Same'),
      ...bothLocales('first', 'Same', 'Same'),
    ]);
    expect(visibleProjects(sources, 'en').map((project) => project.meta.slug)).toEqual(['first', 'second']);
  });

  it('is a total order: comparing a project with itself is zero', () => {
    const [project] = visibleProjects(SOURCES, 'en');
    expect(compareProjects(project!, project!, 'en')).toBe(0);
  });

  it('does not mutate the array it is given', () => {
    const before = SOURCES.map((source) => source.meta.slug);
    visibleProjects(SOURCES, 'en');
    expect(SOURCES.map((source) => source.meta.slug)).toEqual(before);
  });
});

describe('visibleDomains', () => {
  it('returns the domains present in public content, in canonical order', () => {
    // Declared order across the fixtures is ai, audio, fpga — the canonical
    // DOMAIN_IDS order is ai, quantum, fpga, electronics, audio.
    expect(visibleDomains(SOURCES, 'en')).toEqual(['ai', 'fpga', 'audio']);
  });

  it('lists a domain once however many projects carry it', () => {
    expect(visibleDomains(SOURCES, 'en').filter((domain) => domain === 'ai')).toHaveLength(1);
  });
});

describe('projectsByDomain', () => {
  it('returns public projects carrying the domain, in listing order', () => {
    expect(projectsByDomain(SOURCES, 'ai', 'en').map((project) => project.meta.slug)).toEqual(['beta', 'alpha']);
  });

  it('matches a secondary domain, not only the first one listed', () => {
    expect(projectsByDomain(SOURCES, 'audio', 'en').map((project) => project.meta.slug)).toEqual(['beta']);
  });

  it('returns nothing for a domain only a draft carries', () => {
    expect(projectsByDomain(SOURCES, 'quantum', 'en')).toEqual([]);
  });
});

describe('relatedProjects', () => {
  const metas = [
    meta({ slug: 'alpha', status: 'published', related: ['gamma', 'delta', 'ghost', 'alpha'] }),
    meta({ slug: 'gamma', status: 'wip' }),
    meta({ slug: 'delta', status: 'draft' }),
  ];
  const sources = joinProjects(metas, [
    ...bothLocales('alpha', 'Alpha', 'Alfa'),
    ...bothLocales('gamma', 'Gamma', 'Gama'),
    ...bothLocales('delta', 'Delta', 'Delta ES'),
  ]);

  it('keeps the authored order and drops drafts, unknown slugs and self-references', () => {
    expect(relatedProjects(sources, 'alpha', 'en').map((project) => project.meta.slug)).toEqual(['gamma']);
  });

  it('returns nothing when a project declares no related work', () => {
    expect(relatedProjects(sources, 'gamma', 'en')).toEqual([]);
  });

  it('returns nothing for a slug that does not exist', () => {
    expect(relatedProjects(sources, 'ghost', 'en')).toEqual([]);
  });

  it('resolves related projects in the requested locale', () => {
    expect(relatedProjects(sources, 'alpha', 'es')[0]?.title).toBe('Gama');
  });
});

describe('content entry ids', () => {
  it('round-trips a slug and locale', () => {
    expect(parseContentId(contentId('quantum-audio', 'es'))).toEqual({
      slug: 'quantum-audio',
      locale: 'es',
    });
  });

  it('derives an id from the file path the loader sees', () => {
    expect(contentIdFromEntryPath('quantum-audio/en.md')).toBe('quantum-audio:en');
    expect(contentIdFromEntryPath('quantum-audio\\es.md')).toBe('quantum-audio:es');
  });

  it('refuses a path that is not <slug>/<locale>.md', () => {
    expect(() => contentIdFromEntryPath('en.md')).toThrow(/Expected "<slug>\/<locale>\.md"/);
    expect(() => contentIdFromEntryPath('quantum-audio/fr.md')).toThrow(/Unexpected locale "fr"/);
  });

  it('derives a project id from the directory, not the filename', () => {
    expect(metaIdFromEntryPath('quantum-audio/project.json')).toBe('quantum-audio');
    expect(() => metaIdFromEntryPath('project.json')).toThrow(/Expected "<slug>\/project\.json"/);
  });

  it('rejects an id with no locale or an unknown one', () => {
    expect(parseContentId('quantum-audio')).toBeUndefined();
    expect(parseContentId('quantum-audio:fr')).toBeUndefined();
    expect(parseContentId(':en')).toBeUndefined();
  });
});
