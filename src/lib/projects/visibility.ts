/**
 * The one and only definition of "is this project public?".
 *
 * The audit found the listing route filtering on `status === 'published'` while
 * the detail route filtered on `status !== 'draft'`. A `wip` project would
 * therefore get a fully built, publicly reachable, sitemap-eligible detail page
 * that appeared in no listing — an unlisted live URL. Nothing was broken only
 * because every project happened to be `published`.
 *
 * The rule, decided once:
 *
 *   published — public. The finished state.
 *   wip       — public, and labelled as work in progress. The brief wants an
 *               agent to be able to "mark WIP" as an operation distinct from
 *               "unpublish", and the Lab section exists to show work before it
 *               is polished. A state that hid the project would just be a
 *               second name for `draft`.
 *   draft     — not public. Never listed, never built, never linked, never in
 *               the sitemap. This is the single "not ready" state, and it is
 *               the schema default so an incomplete project cannot leak.
 *
 * So: **visible means `status !== 'draft'`.** Visibility is not prominence —
 * a surface that wants only finished work filters on `status` itself, on top of
 * this predicate, rather than inventing a second definition of public.
 */
import type { ProjectMeta } from '../../content/schema.ts';
import type { Project, ProjectSource } from './types.ts';

/** Anything carrying project metadata: a raw meta object, a source, or a resolved project. */
export type HasMeta = ProjectMeta | ProjectSource | Project;

function metaOf(value: HasMeta): ProjectMeta {
  return 'meta' in value ? value.meta : value;
}

/**
 * True when a project may appear anywhere public: listings, detail routes,
 * featured sets, both locales, and the sitemap.
 */
export function isVisible(value: HasMeta): boolean {
  return metaOf(value).status !== 'draft';
}

/** True when a project is visible *and* promoted into the selected set. */
export function isFeatured(value: HasMeta): boolean {
  const meta = metaOf(value);
  return isVisible(meta) && meta.featured;
}

/** True when a project should carry a "work in progress" label. */
export function isWorkInProgress(value: HasMeta): boolean {
  return metaOf(value).status === 'wip';
}
