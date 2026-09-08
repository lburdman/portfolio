import { describe, expect, it } from 'vitest';
import { WRITING_KINDS, writingMetaSchema } from '../src/content/writing-schema';
import {
  articleBySlug,
  articleNeighbours,
  articlesByKind,
  compareArticles,
  dateSortKey,
  hasDayPrecision,
  joinWriting,
  resolveArticle,
  visibleArticles,
  visibleKinds,
  visibleSlugs,
} from '../src/lib/writing/query';
import type { WritingContentEntry, WritingMeta } from '../src/lib/writing/types';
import { isVisible } from '../src/lib/writing/visibility';

/**
 * The join, the chronological sort, the visibility rule and the kind filter,
 * tested as plain functions over plain objects — the same discipline
 * `tests/projects.test.ts` applies to the projects layer, and for the same
 * reason: the audit found this class of logic inside `.astro` frontmatter,
 * where no test could reach it and where two routes had already diverged about
 * what "public" meant (AUDIT.md 2.1).
 *
 * Fixtures are built here rather than read from `src/content/writing/`. The
 * real articles are content and will change; these assertions are about
 * behaviour, and a suite that had to be edited every time an article was
 * published would stop being a check.
 */

/** Built through the production schema, so a fixture cannot describe a shape the schema forbids. */
function meta(overrides: Partial<WritingMeta> & { slug: string; date: string }): WritingMeta {
  return writingMetaSchema.parse({
    kind: 'teaching',
    domains: ['quantum'],
    status: 'published',
    ...overrides,
  });
}

function entry(slug: string, locale: 'en' | 'es', title: string, summary: string): WritingContentEntry {
  return { slug, locale, data: { title, summary } };
}

/** Both locales for a slug, with the locale visible in the title so fallbacks are detectable. */
function bothLocales(slug: string, enTitle: string, esTitle: string): WritingContentEntry[] {
  return [
    entry(slug, 'en', enTitle, `English summary for ${slug}.`),
    entry(slug, 'es', esTitle, `Resumen en español de ${slug}.`),
  ];
}

const METAS: WritingMeta[] = [
  // Day precision, and the newest *public* article.
  meta({ slug: 'fall-fest', date: '2025-11-08', kind: 'community', domains: ['quantum'] }),
  // Month precision. `2025-11` reads as `2025-11-01`, so it sorts below `2025-11-08`.
  meta({ slug: 'course', date: '2025-11', kind: 'teaching', domains: ['quantum', 'ai'] }),
  meta({ slug: 'lanet', date: '2024-03-15', kind: 'research', domains: ['ai'] }),
  // Newer than everything above, and invisible anyway.
  meta({ slug: 'thesis', date: '2026-01-20', kind: 'study', status: 'draft', domains: ['audio'] }),
];

const ENTRIES: WritingContentEntry[] = [
  ...bothLocales('fall-fest', 'Fall Fest', 'Fall Fest ES'),
  ...bothLocales('course', 'Course', 'Curso'),
  ...bothLocales('lanet', 'LANET', 'LANET ES'),
  ...bothLocales('thesis', 'Thesis', 'Tesis'),
];

const SOURCES = joinWriting(METAS, ENTRIES);

describe('joinWriting', () => {
  it('attaches both locales to every article', () => {
    expect(SOURCES).toHaveLength(4);
    for (const source of SOURCES) {
      expect(Object.keys(source.locales).sort()).toEqual(['en', 'es']);
    }
  });

  it('keeps an article whose Spanish translation has not been written yet', () => {
    const partial = joinWriting(
      [meta({ slug: 'course', date: '2025-11' })],
      [entry('course', 'en', 'Course', 'Only English.')],
    );
    expect(partial).toHaveLength(1);
    expect(Object.keys(partial[0]!.locales)).toEqual(['en']);
  });

  it('drops a localized file whose article.json does not exist', () => {
    const orphaned = joinWriting([], [entry('ghost', 'en', 'Ghost', 'No metadata exists.')]);
    expect(orphaned).toEqual([]);
  });
});

describe('resolveArticle', () => {
  it('returns the requested locale when it exists', () => {
    const source = SOURCES.find((candidate) => candidate.meta.slug === 'course')!;
    expect(resolveArticle(source, 'es')).toMatchObject({ locale: 'es', title: 'Curso' });
    expect(resolveArticle(source, 'en')).toMatchObject({ locale: 'en', title: 'Course' });
  });

  it('falls back to English rather than dropping an untranslated article', () => {
    const source = joinWriting(
      [meta({ slug: 'course', date: '2025-11' })],
      [entry('course', 'en', 'Course', 'Only English.')],
    )[0]!;
    const resolved = resolveArticle(source, 'es');
    expect(resolved.title).toBe('Course');
    // The caller can tell it is reading a fallback, e.g. to set `lang` correctly.
    expect(resolved.locale).toBe('en');
  });

  it('throws when an article has no localized content at all', () => {
    const source = joinWriting([meta({ slug: 'course', date: '2025-11' })], [])[0]!;
    expect(() => resolveArticle(source, 'en')).toThrow(/no en\.md/);
  });
});

describe('visibility', () => {
  it('treats published as public and draft as not', () => {
    expect(isVisible(meta({ slug: 'a', date: '2025-01-01', status: 'published' }))).toBe(true);
    expect(isVisible(meta({ slug: 'a', date: '2025-01-01', status: 'draft' }))).toBe(false);
  });

  it('hides an article that omits status, because the schema default is draft', () => {
    const scaffolded = writingMetaSchema.parse({
      slug: 'scaffolded',
      date: '2025-01-01',
      kind: 'study',
      domains: ['ai'],
    });
    expect(scaffolded.status).toBe('draft');
    expect(isVisible(scaffolded)).toBe(false);
  });

  it('accepts a raw meta, a source and a resolved article alike', () => {
    const source = SOURCES.find((candidate) => candidate.meta.slug === 'lanet')!;
    expect(isVisible(source.meta)).toBe(true);
    expect(isVisible(source)).toBe(true);
    expect(isVisible(resolveArticle(source, 'en'))).toBe(true);
  });
});

describe('date keys', () => {
  it('reads a month-precision date as the first of that month', () => {
    expect(dateSortKey('2025-11')).toBe('2025-11-01');
  });

  it('leaves a day-precision date alone', () => {
    expect(dateSortKey('2025-11-08')).toBe('2025-11-08');
  });

  it('reports which precision a date carries, so a renderer can say only what it knows', () => {
    expect(hasDayPrecision('2025-11-08')).toBe(true);
    expect(hasDayPrecision('2025-11')).toBe(false);
  });
});

describe('compareArticles', () => {
  const en = 'en' as const;

  function article(slug: string, date: string, title: string) {
    return resolveArticle(
      joinWriting([meta({ slug, date })], [entry(slug, 'en', title, `Summary for ${slug}.`)])[0]!,
      en,
    );
  }

  it('sorts newest first — the opposite direction from compareProjects', () => {
    const older = article('older', '2024-03-15', 'Older');
    const newer = article('newer', '2025-11-08', 'Newer');
    expect(compareArticles(newer, older, en)).toBeLessThan(0);
    expect(compareArticles(older, newer, en)).toBeGreaterThan(0);
  });

  it('places a month-precision date before a day in the same month', () => {
    // `2025-11` is the first of November, so `2025-11-08` is newer and sorts above it.
    const month = article('month', '2025-11', 'Month');
    const day = article('day', '2025-11-08', 'Day');
    expect(compareArticles(day, month, en)).toBeLessThan(0);
  });

  it('breaks a same-date tie by title, in the rendered locale', () => {
    const zulu = article('one', '2025-05-01', 'Zulu');
    const alpha = article('two', '2025-05-01', 'Alpha');
    expect(compareArticles(alpha, zulu, en)).toBeLessThan(0);
  });

  it('breaks a same-date, same-title tie by slug, so the build output is stable', () => {
    const first = article('aaa', '2025-05-01', 'Same');
    const second = article('bbb', '2025-05-01', 'Same');
    expect(compareArticles(first, second, en)).toBeLessThan(0);
    expect(compareArticles(first, first, en)).toBe(0);
  });
});

describe('visibleArticles', () => {
  it('returns every published article, newest first', () => {
    expect(visibleArticles(SOURCES, 'en').map((article) => article.meta.slug)).toEqual([
      'fall-fest',
      'course',
      'lanet',
    ]);
  });

  it('excludes a draft even when it is the newest thing written', () => {
    expect(visibleArticles(SOURCES, 'en').some((article) => article.meta.slug === 'thesis')).toBe(false);
  });

  it('renders the requested locale', () => {
    expect(visibleArticles(SOURCES, 'es').map((article) => article.title)).toEqual([
      'Fall Fest ES',
      'Curso',
      'LANET ES',
    ]);
  });

  it('does not mutate the sources it was given', () => {
    const before = SOURCES.map((source) => source.meta.slug);
    visibleArticles(SOURCES, 'en');
    expect(SOURCES.map((source) => source.meta.slug)).toEqual(before);
  });
});

describe('articleBySlug', () => {
  it('finds a published article', () => {
    expect(articleBySlug(SOURCES, 'lanet', 'en')?.title).toBe('LANET');
  });

  it('refuses a draft, so the detail route cannot outrun the index', () => {
    // The exact shape of AUDIT.md 2.1: an unlisted but publicly reachable URL.
    expect(articleBySlug(SOURCES, 'thesis', 'en')).toBeUndefined();
  });

  it('returns undefined for a slug that does not exist', () => {
    expect(articleBySlug(SOURCES, 'nope', 'en')).toBeUndefined();
  });
});

describe('visibleSlugs', () => {
  it('lists exactly what the index renders', () => {
    expect(visibleSlugs(SOURCES).sort()).toEqual(['course', 'fall-fest', 'lanet']);
  });
});

describe('articlesByKind', () => {
  it('returns only articles of that kind, newest first', () => {
    expect(articlesByKind(SOURCES, 'teaching', 'en').map((article) => article.meta.slug)).toEqual(['course']);
  });

  it('returns nothing for a kind only a draft uses', () => {
    expect(articlesByKind(SOURCES, 'study', 'en')).toEqual([]);
  });
});

describe('visibleKinds', () => {
  it('lists only kinds with a public article, in WRITING_KINDS order', () => {
    expect(visibleKinds(SOURCES, 'en')).toEqual(['teaching', 'community', 'research']);
  });

  it('never offers a kind whose only article is a draft', () => {
    expect(visibleKinds(SOURCES, 'en')).not.toContain('study');
  });

  it('returns a subsequence of the canonical order rather than order of appearance', () => {
    const kinds = visibleKinds(SOURCES, 'en');
    const positions = kinds.map((kind) => WRITING_KINDS.indexOf(kind));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('returns nothing when no article is public', () => {
    const drafts = joinWriting([meta({ slug: 'a', date: '2025-01-01', status: 'draft' })], []);
    expect(visibleKinds(drafts, 'en')).toEqual([]);
  });
});

describe('articleNeighbours', () => {
  it('walks the chronology in both directions', () => {
    const { older, newer } = articleNeighbours(SOURCES, 'course', 'en');
    expect(older?.meta.slug).toBe('lanet');
    expect(newer?.meta.slug).toBe('fall-fest');
  });

  it('has no newer neighbour at the top of the chronology', () => {
    expect(articleNeighbours(SOURCES, 'fall-fest', 'en').newer).toBeUndefined();
  });

  it('has no older neighbour at the bottom of the chronology', () => {
    expect(articleNeighbours(SOURCES, 'lanet', 'en').older).toBeUndefined();
  });

  it('never paginates into a draft', () => {
    expect(articleNeighbours(SOURCES, 'thesis', 'en')).toEqual({ older: undefined, newer: undefined });
  });

  it('returns nothing for an unknown slug', () => {
    expect(articleNeighbours(SOURCES, 'nope', 'en')).toEqual({ older: undefined, newer: undefined });
  });
});
