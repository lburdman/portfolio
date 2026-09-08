/**
 * The Astro-facing edge of the writing content layer.
 *
 * This is the *only* module in `src/lib/writing/` that imports
 * `astro:content`. It reads the two collections, flattens them into plain
 * objects, validates what the filesystem cannot, and hands the result to the
 * pure functions in `./query.ts`. Pages import from here; tests import
 * `./query.ts` and `./visibility.ts` directly.
 *
 * Pages must never call `getCollection('writing')` themselves and must never
 * re-implement a status filter. `isVisible()` is the single definition of
 * public — see `./visibility.ts`.
 */
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import type { WritingKind } from '../../content/writing-schema.ts';
import type { Locale } from '../../i18n/types.ts';
import { parseContentId } from '../content/id.ts';
import { getProjectSources } from '../projects/index.ts';
import {
  articleBySlug,
  articleNeighbours,
  articlesByKind,
  joinWriting,
  visibleArticles,
  visibleKinds,
  visibleSlugs,
} from './query.ts';
import type { Article, WritingContentEntry, WritingSource } from './types.ts';

export * from './query.ts';
export * from './visibility.ts';
export type { Article, WritingMeta, WritingContent, WritingSource } from './types.ts';

/**
 * Built once per process. Astro renders every page in a single build, so
 * re-reading and re-joining the collections for each of them is pure waste.
 */
let cache: Promise<WritingSource[]> | undefined;

async function readSources(): Promise<WritingSource[]> {
  const [metaEntries, contentEntries, projectSources] = await Promise.all([
    getCollection('writing'),
    getCollection('writingContent'),
    // The projects layer already reads, validates and caches its own
    // collection. Re-reading it here would be a second definition of what a
    // project is; asking it is a question.
    getProjectSources(),
  ]);

  const knownProjects = new Set(projectSources.map((source) => source.meta.slug));

  const metas = metaEntries.map((entry) => {
    // The id is the directory name; `slug` is what the file claims to be.
    // They must agree, or links and lookups silently point at nothing.
    if (entry.id !== entry.data.slug) {
      throw new Error(`Article directory "${entry.id}" declares slug "${entry.data.slug}". They must match.`);
    }

    // A `relatedProjects` entry naming a project that does not exist renders as
    // a link to a 404. Failing the build is the only way the reader never sees
    // it; the schema cannot check this because it validates one file at a time.
    for (const related of entry.data.relatedProjects ?? []) {
      if (!knownProjects.has(related)) {
        throw new Error(
          `Article "${entry.id}" lists relatedProjects entry "${related}", ` +
            `which is not a project in src/content/projects/. ` +
            `Known projects: ${[...knownProjects].sort().join(', ') || '(none)'}.`,
        );
      }
    }

    return entry.data;
  });

  const entries: WritingContentEntry[] = contentEntries.map((entry) => {
    const parsed = parseContentId(entry.id);
    if (!parsed) {
      throw new Error(`Unrecognised article content id "${entry.id}". Expected "<slug>:<locale>".`);
    }
    return { slug: parsed.slug, locale: parsed.locale, data: entry.data };
  });

  return joinWriting(metas, entries);
}

/** All articles with their localized content attached, public and draft alike. */
export function getWritingSources(): Promise<WritingSource[]> {
  cache ??= readSources();
  return cache;
}

/** Every public article for a locale, newest first. */
export async function getVisibleArticles(locale: Locale): Promise<Article[]> {
  return visibleArticles(await getWritingSources(), locale);
}

/** One public article, or `undefined` — the same set the index shows. */
export async function getArticleBySlug(slug: string, locale: Locale): Promise<Article | undefined> {
  return articleBySlug(await getWritingSources(), slug, locale);
}

/** Public articles of one kind, newest first. */
export async function getArticlesByKind(kind: WritingKind, locale: Locale): Promise<Article[]> {
  return articlesByKind(await getWritingSources(), kind, locale);
}

/** The kinds present in public content, for the filter UI. */
export async function getVisibleKinds(locale: Locale): Promise<WritingKind[]> {
  return visibleKinds(await getWritingSources(), locale);
}

/** Slugs for `getStaticPaths`. Exactly the set the index renders. */
export async function getVisibleWritingSlugs(): Promise<string[]> {
  return visibleSlugs(await getWritingSources());
}

/** The public articles either side of this one in time, for detail-page pagination. */
export async function getArticleNeighbours(
  slug: string,
  locale: Locale,
): Promise<ReturnType<typeof articleNeighbours>> {
  return articleNeighbours(await getWritingSources(), slug, locale);
}

/**
 * The raw collection entry for an article's body, for `render(entry)`. Returns
 * `undefined` when the translation does not exist, so a caller can fall back
 * rather than crash — the same contract as `getProjectBodyEntry`.
 */
export async function getArticleBodyEntry(
  slug: string,
  locale: Locale,
): Promise<CollectionEntry<'writingContent'> | undefined> {
  const entries = await getCollection('writingContent');
  return entries.find((entry) => {
    const parsed = parseContentId(entry.id);
    return parsed?.slug === slug && parsed.locale === locale;
  });
}
