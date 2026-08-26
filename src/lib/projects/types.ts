/**
 * The joined shape every consumer of project content sees.
 *
 * `project.json` holds shared metadata; `en.md` / `es.md` hold the two
 * localized fields plus the case-study body. `ProjectSource` is that pairing
 * before a locale is chosen; `Project` is one project resolved for one locale.
 */
import type { ProjectContent, ProjectMeta } from '../../content/schema.ts';
import type { Locale } from '../../i18n/types.ts';

export type { ProjectContent, ProjectMeta };

/** A project's shared metadata plus whichever locales exist on disk. */
export interface ProjectSource {
  readonly meta: ProjectMeta;
  readonly locales: Readonly<Partial<Record<Locale, ProjectContent>>>;
}

/** One project resolved for one locale — what pages and cards render. */
export interface Project {
  readonly meta: ProjectMeta;
  /** The locale actually rendered, which may differ from the one requested if a translation is missing. */
  readonly locale: Locale;
  readonly title: string;
  readonly summary: string;
}

/** A localized entry as it comes off the `projectContent` collection. */
export interface ProjectContentEntry {
  readonly slug: string;
  readonly locale: Locale;
  readonly data: ProjectContent;
}
