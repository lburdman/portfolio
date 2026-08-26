/**
 * Every query the site makes against project content, as plain functions over
 * plain objects.
 *
 * Nothing here imports `astro:content`. That is the point: the audit found this
 * logic living inside `.astro` files, where no test could reach it and where it
 * had *already* diverged between the listing and the detail route. Keeping it
 * pure means `tests/projects.test.ts` exercises the real functions the pages
 * call, without booting Astro.
 *
 * `src/lib/projects/index.ts` is the thin Astro-facing edge that feeds these
 * functions with `getCollection()` output.
 */
import { DOMAIN_IDS } from '../../config/domains.ts';
import type { DomainId } from '../../config/domains.ts';
import { DEFAULT_LOCALE } from '../../i18n/types.ts';
import type { Locale } from '../../i18n/types.ts';
import type { Project, ProjectContentEntry, ProjectMeta, ProjectSource } from './types.ts';
import { isFeatured, isVisible } from './visibility.ts';

/**
 * Pairs shared metadata with its localized entries.
 *
 * A localized entry whose slug has no `project.json` is a content error, not
 * something to render, so it is dropped here and reported by
 * `scripts/project-validate.mjs`, which can name the offending file.
 */
export function joinProjects(metas: readonly ProjectMeta[], entries: readonly ProjectContentEntry[]): ProjectSource[] {
  const byslug = new Map<string, Partial<Record<Locale, ProjectContentEntry['data']>>>();

  for (const entry of entries) {
    const locales = byslug.get(entry.slug) ?? {};
    locales[entry.locale] = entry.data;
    byslug.set(entry.slug, locales);
  }

  return metas.map((meta) => ({ meta, locales: byslug.get(meta.slug) ?? {} }));
}

/**
 * Resolves one project for one locale.
 *
 * A missing translation falls back to the default locale rather than making the
 * project vanish from one half of the site — a missing `es.md` should read as
 * English, not as a 404. If even the default locale is missing the project
 * cannot be rendered at all, and that throws: `project:validate` guarantees
 * both files exist, so reaching this means the content is broken and the build
 * should say so loudly.
 */
export function resolveProject(source: ProjectSource, locale: Locale): Project {
  const requested = source.locales[locale];
  if (requested) {
    return { meta: source.meta, locale, title: requested.title, summary: requested.summary };
  }

  const fallback = source.locales[DEFAULT_LOCALE];
  if (fallback) {
    return {
      meta: source.meta,
      locale: DEFAULT_LOCALE,
      title: fallback.title,
      summary: fallback.summary,
    };
  }

  throw new Error(
    `Project "${source.meta.slug}" has no ${locale}.md and no ${DEFAULT_LOCALE}.md. ` +
      `Run "npm run project:validate" to see every content problem.`,
  );
}

/**
 * Listing order: `order` ascending, then title, compared in the locale being
 * rendered so accented Spanish titles sort where a Spanish reader expects.
 * Slug breaks the final tie so the order is total and the build is
 * deterministic.
 */
export function compareProjects(a: Project, b: Project, locale: Locale): number {
  if (a.meta.order !== b.meta.order) return a.meta.order - b.meta.order;
  const byTitle = a.title.localeCompare(b.title, locale);
  if (byTitle !== 0) return byTitle;
  return a.meta.slug.localeCompare(b.meta.slug);
}

function sorted(projects: Project[], locale: Locale): Project[] {
  return [...projects].sort((a, b) => compareProjects(a, b, locale));
}

/** Every public project for a locale, in listing order. */
export function visibleProjects(sources: readonly ProjectSource[], locale: Locale): Project[] {
  return sorted(
    sources.filter(isVisible).map((source) => resolveProject(source, locale)),
    locale,
  );
}

/** The public, promoted subset, in listing order. */
export function featuredProjects(sources: readonly ProjectSource[], locale: Locale): Project[] {
  return sorted(
    sources.filter(isFeatured).map((source) => resolveProject(source, locale)),
    locale,
  );
}

/**
 * One public project by slug, or `undefined`.
 *
 * Detail routes and listings therefore agree by construction: a project that is
 * absent from `visibleProjects` cannot be found here either.
 */
export function projectBySlug(sources: readonly ProjectSource[], slug: string, locale: Locale): Project | undefined {
  const source = sources.find((candidate) => candidate.meta.slug === slug);
  if (!source || !isVisible(source)) return undefined;
  return resolveProject(source, locale);
}

/**
 * The domains that actually occur in public content, in the canonical
 * `DOMAIN_IDS` order. The filter UI is built from this, so it never offers a
 * domain that would return nothing.
 */
export function visibleDomains(sources: readonly ProjectSource[], locale: Locale): DomainId[] {
  const present = new Set<DomainId>();
  for (const project of visibleProjects(sources, locale)) {
    for (const domain of project.meta.domains) present.add(domain);
  }
  return DOMAIN_IDS.filter((domain) => present.has(domain));
}

/** Public projects in a single domain, in listing order. */
export function projectsByDomain(sources: readonly ProjectSource[], domain: DomainId, locale: Locale): Project[] {
  return visibleProjects(sources, locale).filter((project) => project.meta.domains.includes(domain));
}

/**
 * The `related` projects of a project, resolved and filtered to public ones,
 * in the order the author listed them. Unknown or non-public slugs are dropped
 * rather than rendered as dead links; `project:validate` fails on unknown ones.
 */
export function relatedProjects(sources: readonly ProjectSource[], slug: string, locale: Locale): Project[] {
  const source = sources.find((candidate) => candidate.meta.slug === slug);
  if (!source?.meta.related) return [];

  return source.meta.related
    .filter((related) => related !== slug)
    .map((related) => projectBySlug(sources, related, locale))
    .filter((project): project is Project => project !== undefined);
}

/** Slugs for `getStaticPaths`. Identical to what the listing renders. */
export function visibleSlugs(sources: readonly ProjectSource[]): string[] {
  return sources.filter(isVisible).map((source) => source.meta.slug);
}
