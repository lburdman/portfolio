/**
 * Entry-id encoding shared by every localized content collection.
 *
 * A localized entry lives at `<slug>/<locale>.md`, so its identity is a pair,
 * not a single string. The loaders in `src/content.config.ts` and every
 * consumer in `src/lib/projects/` and `src/lib/writing/` build and read that id
 * through the functions below, so the format is defined exactly once. `:` is
 * used as the separator because the slug grammar (`SLUG_PATTERN`) forbids it,
 * which makes parsing unambiguous.
 *
 * These functions live here, above the two collections, rather than beside
 * either of them. Nothing in them was ever project-specific:
 * `metaIdFromEntryPath` takes the first path segment and `contentIdFromEntryPath`
 * accepts any `<dir>/<locale>.md`, whatever the metadata file inside the
 * directory happens to be called. Copying them next to a second collection
 * would put one format in two places, which is the failure mode this repo's
 * architecture exists to prevent. `src/lib/projects/id.ts` is a re-export of
 * this module, kept so existing imports read naturally from a project context.
 *
 * The error messages must not claim "project" when the caller is the writing
 * collection, but a message that only said "<slug>/<metadata file>.json" would
 * be harder to act on than the one it replaced. So the metadata filename is a
 * parameter: each collection names its own file, and the message stays exactly
 * as specific as it was. The offending path is quoted in full either way, which
 * is the part that actually locates the file on disk.
 */
import { isLocale } from '../../i18n/types.ts';
import type { Locale } from '../../i18n/types.ts';

/** Builds the localized-entry id for a slug/locale pair. */
export function contentId(slug: string, locale: Locale): string {
  return `${slug}:${locale}`;
}

/**
 * Parses a localized-entry id back into its slug and locale.
 * Returns `undefined` for anything that is not a well-formed id, so callers
 * decide whether an unrecognised entry is skipped or fatal.
 */
export function parseContentId(id: string): { slug: string; locale: Locale } | undefined {
  const separator = id.lastIndexOf(':');
  if (separator <= 0) return undefined;

  const slug = id.slice(0, separator);
  const locale = id.slice(separator + 1);
  if (!isLocale(locale)) return undefined;

  return { slug, locale };
}

/**
 * Derives a localized-entry id from a glob entry path such as `augmenta/en.md`
 * or `qiskit-fall-fest-fiuba-2025/es.md`. Used by the loaders' `generateId`.
 *
 * The path is relative to the collection's own `base`, so it carries no
 * collection name and the message below cannot name one either.
 */
export function contentIdFromEntryPath(entry: string): string {
  const normalized = entry.replace(/\\/g, '/');
  const match = /^(.+)\/([^/]+)\.[^./]+$/.exec(normalized);
  if (!match) {
    throw new Error(`Unexpected localized content path "${entry}". Expected "<slug>/<locale>.md".`);
  }
  const [, slug, locale] = match as unknown as [string, string, string];
  if (!isLocale(locale)) {
    throw new Error(`Unexpected locale "${locale}" in "${entry}". Expected "en.md" or "es.md".`);
  }
  return contentId(slug, locale);
}

/**
 * Derives a metadata-collection id from a glob entry path such as
 * `augmenta/project.json` or `lanet-2025-complex-networks/article.json`. The id
 * is the directory name, so the filesystem — not a field inside the file —
 * decides an entry's identity.
 *
 * `metaFile` only ever appears in the error message: the function reads the
 * first path segment and never looks at the filename, because the glob pattern
 * has already selected it. Callers pass their own (`project.json`,
 * `article.json`) so a broken path is reported in the vocabulary of the
 * collection that broke. The default is the honest generic form for a caller
 * that has none.
 */
export function metaIdFromEntryPath(entry: string, metaFile = '<metadata file>.json'): string {
  const normalized = entry.replace(/\\/g, '/');
  const slug = normalized.split('/')[0];
  if (!slug || slug === normalized) {
    throw new Error(`Unexpected entry metadata path "${entry}". Expected "<slug>/${metaFile}".`);
  }
  return slug;
}
