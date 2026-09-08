/**
 * The joined shape every consumer of writing content sees.
 *
 * `article.json` holds shared metadata; `en.md` / `es.md` hold the two
 * localized fields plus the article body. `WritingSource` is that pairing
 * before a locale is chosen; `Article` is one article resolved for one locale.
 *
 * The shapes mirror `src/lib/projects/types.ts` exactly, including the
 * `readonly` discipline: these objects are read by every surface and written by
 * none, and a mutable `locales` record would let one page's filter quietly
 * rewrite the cache another page reads.
 */
import type { WritingContent, WritingMeta } from '../../content/writing-schema.ts';
import type { Locale } from '../../i18n/types.ts';

export type { WritingContent, WritingMeta };

/** An article's shared metadata plus whichever locales exist on disk. */
export interface WritingSource {
  readonly meta: WritingMeta;
  readonly locales: Readonly<Partial<Record<Locale, WritingContent>>>;
}

/** One article resolved for one locale — what the index and the detail page render. */
export interface Article {
  readonly meta: WritingMeta;
  /** The locale actually rendered, which may differ from the one requested if a translation is missing. */
  readonly locale: Locale;
  readonly title: string;
  readonly summary: string;
}

/** A localized entry as it comes off the `writingContent` collection. */
export interface WritingContentEntry {
  readonly slug: string;
  readonly locale: Locale;
  readonly data: WritingContent;
}
