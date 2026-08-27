/**
 * The Astro-facing edge of the project content layer.
 *
 * This is the *only* module in `src/lib/projects/` that imports
 * `astro:content`. It reads the two collections, flattens them into plain
 * objects, and hands them to the pure functions in `./query.ts`. Pages import
 * from here; tests import `./query.ts` and `./visibility.ts` directly.
 *
 * Pages must never call `getCollection('projects')` themselves and must never
 * re-implement a status filter. `isVisible()` is the single definition of
 * public — see `./visibility.ts`.
 */
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import type { Locale } from '../../i18n/types.ts';
import { parseContentId } from './id.ts';
import {
  featuredProjects,
  joinProjects,
  projectBySlug,
  projectsByDomain,
  relatedProjects,
  visibleDomains,
  visibleProjects,
  visibleSlugs,
} from './query.ts';
import type { Project, ProjectContentEntry, ProjectSource } from './types.ts';

export * from './query.ts';
export * from './visibility.ts';
export type { Project, ProjectMeta, ProjectContent, ProjectSource } from './types.ts';

/**
 * Built once per process. Astro renders every page in a single build, so
 * re-reading and re-joining the collections for each of them is pure waste.
 */
let cache: Promise<ProjectSource[]> | undefined;

async function readSources(): Promise<ProjectSource[]> {
  const [metaEntries, contentEntries] = await Promise.all([getCollection('projects'), getCollection('projectContent')]);

  const metas = metaEntries.map((entry) => {
    // The id is the directory name; `slug` is what the file claims to be.
    // They must agree, or links and lookups silently point at nothing.
    if (entry.id !== entry.data.slug) {
      throw new Error(
        `Project directory "${entry.id}" declares slug "${entry.data.slug}". ` +
          `They must match. Run "npm run project:validate".`,
      );
    }
    return entry.data;
  });

  const entries: ProjectContentEntry[] = contentEntries.map((entry) => {
    const parsed = parseContentId(entry.id);
    if (!parsed) {
      throw new Error(`Unrecognised project content id "${entry.id}". Expected "<slug>:<locale>".`);
    }
    return { slug: parsed.slug, locale: parsed.locale, data: entry.data };
  });

  return joinProjects(metas, entries);
}

/** All projects with their localized content attached, public and draft alike. */
export function getProjectSources(): Promise<ProjectSource[]> {
  cache ??= readSources();
  return cache;
}

/** Every public project for a locale, in listing order. */
export async function getVisibleProjects(locale: Locale): Promise<Project[]> {
  return visibleProjects(await getProjectSources(), locale);
}

/** The public, promoted subset, in listing order. */
export async function getFeaturedProjects(locale: Locale): Promise<Project[]> {
  return featuredProjects(await getProjectSources(), locale);
}

/** One public project, or `undefined` — the same set the listing shows. */
export async function getProjectBySlug(slug: string, locale: Locale): Promise<Project | undefined> {
  return projectBySlug(await getProjectSources(), slug, locale);
}

/** Public projects in one domain, in listing order. */
export async function getProjectsByDomain(
  domain: Parameters<typeof projectsByDomain>[1],
  locale: Locale,
): Promise<Project[]> {
  return projectsByDomain(await getProjectSources(), domain, locale);
}

/** The domains present in public content, for the filter UI. */
export async function getVisibleDomains(locale: Locale): Promise<ReturnType<typeof visibleDomains>> {
  return visibleDomains(await getProjectSources(), locale);
}

/** A project's public `related` entries, in the authored order. */
export async function getRelatedProjects(slug: string, locale: Locale): Promise<Project[]> {
  return relatedProjects(await getProjectSources(), slug, locale);
}

/** Slugs for `getStaticPaths`. Exactly the set the listing renders. */
export async function getVisibleSlugs(): Promise<string[]> {
  return visibleSlugs(await getProjectSources());
}

/**
 * The raw collection entry for a project's case-study body, for
 * `render(entry)`. Returns `undefined` when the translation does not exist, so
 * a caller can fall back rather than crash.
 */
export async function getProjectBodyEntry(
  slug: string,
  locale: Locale,
): Promise<CollectionEntry<'projectContent'> | undefined> {
  const entries = await getCollection('projectContent');
  return entries.find((entry) => {
    const parsed = parseContentId(entry.id);
    return parsed?.slug === slug && parsed.locale === locale;
  });
}
