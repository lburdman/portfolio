/**
 * Every query the site makes against writing content, as plain functions over
 * plain objects.
 *
 * Nothing here imports `astro:content`. That is the point, and it is the same
 * point `src/lib/projects/query.ts` makes: the audit found this class of logic
 * living inside `.astro` frontmatter, where no test could reach it and where it
 * had already diverged between two routes. Keeping it pure means
 * `tests/writing.test.ts` exercises the real functions the pages call, without
 * booting Astro.
 *
 * `src/lib/writing/index.ts` is the thin Astro-facing edge that feeds these
 * functions with `getCollection()` output.
 */
import { WRITING_KINDS } from '../../content/writing-schema.ts';
import type { WritingKind } from '../../content/writing-schema.ts';
import { DEFAULT_LOCALE } from '../../i18n/types.ts';
import type { Locale } from '../../i18n/types.ts';
import type { Article, WritingContentEntry, WritingMeta, WritingSource } from './types.ts';
import { isVisible } from './visibility.ts';

/**
 * Pairs shared metadata with its localized entries.
 *
 * A localized entry whose slug has no `article.json` is a content error, not
 * something to render, so it is dropped here rather than surfacing as an
 * article with no date, no kind and no domains.
 */
export function joinWriting(metas: readonly WritingMeta[], entries: readonly WritingContentEntry[]): WritingSource[] {
  const bySlug = new Map<string, Partial<Record<Locale, WritingContentEntry['data']>>>();

  for (const entry of entries) {
    const locales = bySlug.get(entry.slug) ?? {};
    locales[entry.locale] = entry.data;
    bySlug.set(entry.slug, locales);
  }

  return metas.map((meta) => ({ meta, locales: bySlug.get(meta.slug) ?? {} }));
}

/**
 * Resolves one article for one locale.
 *
 * A missing translation falls back to the default locale rather than making the
 * article vanish from one half of the site — a missing `es.md` should read as
 * English, not as a 404. If even the default locale is missing the article
 * cannot be rendered at all, and that throws: the content contract requires
 * both files, so reaching this means the content is broken and the build should
 * say so loudly rather than emit an empty page.
 */
export function resolveArticle(source: WritingSource, locale: Locale): Article {
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
    `Article "${source.meta.slug}" has no ${locale}.md and no ${DEFAULT_LOCALE}.md. ` +
      `Every article directory must contain both locales.`,
  );
}

/**
 * Normalizes a `YYYY-MM-DD` or `YYYY-MM` date into a sortable `YYYY-MM-DD`
 * string, treating month precision as the first of that month.
 *
 * A string key rather than a `Date`: both forms are zero-padded and
 * fixed-width, so lexicographic order *is* chronological order, and there is no
 * timezone to get wrong. `contentDateSchema` has already proved the value is a
 * real calendar date by the time it reaches here.
 *
 * Treating `2025-11` as `2025-11-01` is a decision, not an accident: an article
 * known only to the month sorts *before* one dated the 8th of that month, i.e.
 * it reads as the earliest thing that could have happened in that month. The
 * alternative — inventing the 15th, or the end of the month — would put a
 * fabricated day into the ordering of a section whose whole subject is what
 * actually happened when.
 */
export function dateSortKey(date: string): string {
  return date.length === 7 ? `${date}-01` : date;
}

/**
 * True when a date names a specific day, false when it names only a month.
 *
 * Month precision is a supported state (see `contentDateSchema`), so a renderer
 * has to be able to ask, and ask through one function rather than by
 * re-measuring the string's length in three components.
 */
export function hasDayPrecision(date: string): boolean {
  return date.length > 7;
}

/**
 * Index order: **reverse chronological, newest first.**
 *
 * This is the opposite direction from `compareProjects`, deliberately. A
 * project's position is editorial — `order` is a number the author sets, and
 * the projects listing is a curated shelf. Writing is a chronology: the reader
 * arriving at the index wants the most recent field report, and no author
 * judgement is involved in deciding which that is. Giving articles an `order`
 * field would be asking the author to restate their own dates by hand, which is
 * two places for one fact.
 *
 * Ties are broken by title in the rendered locale (so accented Spanish titles
 * sort where a Spanish reader expects) and then by slug, which makes the order
 * total: two articles dated the same month cannot swap places between builds
 * and produce a spurious diff in the generated HTML.
 */
export function compareArticles(a: Article, b: Article, locale: Locale): number {
  const byDate = dateSortKey(b.meta.date).localeCompare(dateSortKey(a.meta.date));
  if (byDate !== 0) return byDate;
  const byTitle = a.title.localeCompare(b.title, locale);
  if (byTitle !== 0) return byTitle;
  return a.meta.slug.localeCompare(b.meta.slug);
}

function sorted(articles: Article[], locale: Locale): Article[] {
  return [...articles].sort((a, b) => compareArticles(a, b, locale));
}

/** Every public article for a locale, newest first. */
export function visibleArticles(sources: readonly WritingSource[], locale: Locale): Article[] {
  return sorted(
    sources.filter(isVisible).map((source) => resolveArticle(source, locale)),
    locale,
  );
}

/**
 * One public article by slug, or `undefined`.
 *
 * The detail route and the index therefore agree by construction: an article
 * absent from `visibleArticles` cannot be found here either.
 */
export function articleBySlug(sources: readonly WritingSource[], slug: string, locale: Locale): Article | undefined {
  const source = sources.find((candidate) => candidate.meta.slug === slug);
  if (!source || !isVisible(source)) return undefined;
  return resolveArticle(source, locale);
}

/** Slugs for `getStaticPaths`. Identical to what the index renders. */
export function visibleSlugs(sources: readonly WritingSource[]): string[] {
  return sources.filter(isVisible).map((source) => source.meta.slug);
}

/** Public articles of one kind, newest first. */
export function articlesByKind(sources: readonly WritingSource[], kind: WritingKind, locale: Locale): Article[] {
  return visibleArticles(sources, locale).filter((article) => article.meta.kind === kind);
}

/**
 * The kinds that actually occur in public content, in the canonical
 * `WRITING_KINDS` order. A filter UI built from this never offers a kind that
 * would return an empty list.
 */
export function visibleKinds(sources: readonly WritingSource[], locale: Locale): WritingKind[] {
  const present = new Set<WritingKind>();
  for (const article of visibleArticles(sources, locale)) present.add(article.meta.kind);
  return WRITING_KINDS.filter((kind) => present.has(kind));
}

/**
 * The articles immediately before and after this one *in time*, for the
 * detail page's pagination.
 *
 * Named `older`/`newer` rather than `previous`/`next` on purpose: the list is
 * rendered newest-first, so "next" means the opposite thing depending on
 * whether you are thinking about the page or about the calendar. Both are
 * `undefined` at the ends of the chronology, and all three lookups run over the
 * same `visibleArticles` sequence the index renders, so the pagination cannot
 * walk into a draft.
 */
export function articleNeighbours(
  sources: readonly WritingSource[],
  slug: string,
  locale: Locale,
): { older: Article | undefined; newer: Article | undefined } {
  const articles = visibleArticles(sources, locale);
  const index = articles.findIndex((article) => article.meta.slug === slug);
  if (index === -1) return { older: undefined, newer: undefined };
  // The list runs newest → oldest, so the *previous* element is the newer one.
  return { older: articles[index + 1], newer: articles[index - 1] };
}
