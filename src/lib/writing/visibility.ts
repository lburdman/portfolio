/**
 * The one and only definition of "is this article public?".
 *
 * `AUDIT.md` finding 2.1 is what this file exists to prevent. In the projects
 * collection the listing route filtered on `status === 'published'` while the
 * detail route filtered on `status !== 'draft'`, so a `wip` project got a
 * fully built, publicly reachable, sitemap-eligible detail page that appeared
 * in no listing — an unlisted live URL. The two routes were each individually
 * reasonable; the defect was that there were two of them.
 *
 * So the rule is decided once, here:
 *
 *   published — public. Listed, built, linked, in the sitemap.
 *   draft     — not public. Never listed, never built, never linked, never in
 *               the sitemap. It is the schema default, so an article that is
 *               still being written cannot leak by omission.
 *
 * **Visible means `status !== 'draft'`.** Written as an inequality rather than
 * `status === 'published'` so that a third status added later is public by
 * default and has to argue for hiding itself — the same shape as the projects
 * predicate, and the reason the two collections cannot drift apart in *form*
 * even though `WRITING_STATUSES` is deliberately shorter.
 *
 * The index route, the detail route's `getStaticPaths`, the sitemap and every
 * card must call this function. Anything that re-reads `meta.status` to decide
 * whether something is public is reintroducing the audit's defect.
 */
import type { WritingMeta } from '../../content/writing-schema.ts';
import type { Article, WritingSource } from './types.ts';

/** Anything carrying article metadata: a raw meta object, a source, or a resolved article. */
export type HasMeta = WritingMeta | WritingSource | Article;

function metaOf(value: HasMeta): WritingMeta {
  return 'meta' in value ? value.meta : value;
}

/**
 * True when an article may appear anywhere public: the index, its detail route,
 * both locales, and the sitemap.
 */
export function isVisible(value: HasMeta): boolean {
  return metaOf(value).status !== 'draft';
}
