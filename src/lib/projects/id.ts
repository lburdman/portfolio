/**
 * Entry-id encoding for the `projectContent` collection.
 *
 * A content entry lives at `<slug>/<locale>.md`, so its identity is a pair, not
 * a single string. The loader in `src/content.config.ts` and every consumer in
 * this directory build and read that id through the two functions below, so the
 * format is defined exactly once. `:` is used as the separator because the slug
 * grammar (`SLUG_PATTERN`) forbids it, which makes parsing unambiguous.
 */
import { isLocale } from '../../i18n/types.ts';
import type { Locale } from '../../i18n/types.ts';

/** Builds the `projectContent` entry id for a slug/locale pair. */
export function contentId(slug: string, locale: Locale): string {
  return `${slug}:${locale}`;
}

/**
 * Parses a `projectContent` entry id back into its slug and locale.
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
 * Derives a `projectContent` id from a glob entry path such as
 * `augmenta/en.md`. Used by the loader's `generateId`.
 */
export function contentIdFromEntryPath(entry: string): string {
  const normalized = entry.replace(/\\/g, '/');
  const match = /^(.+)\/([^/]+)\.[^./]+$/.exec(normalized);
  if (!match) {
    throw new Error(`Unexpected project content path "${entry}". Expected "<slug>/<locale>.md".`);
  }
  const [, slug, locale] = match as unknown as [string, string, string];
  if (!isLocale(locale)) {
    throw new Error(`Unexpected locale "${locale}" in "${entry}". Expected "en.md" or "es.md".`);
  }
  return contentId(slug, locale);
}

/**
 * Derives a `projects` id from a glob entry path such as
 * `augmenta/project.json`. The id is the directory name, so the filesystem —
 * not a field inside the file — decides a project's identity.
 */
export function metaIdFromEntryPath(entry: string): string {
  const normalized = entry.replace(/\\/g, '/');
  const slug = normalized.split('/')[0];
  if (!slug || slug === normalized) {
    throw new Error(`Unexpected project metadata path "${entry}". Expected "<slug>/project.json".`);
  }
  return slug;
}
