/**
 * Entry-id encoding for the `projects` and `projectContent` collections.
 *
 * The implementation moved to `src/lib/content/id.ts` when the `writing`
 * collection arrived: nothing in these four functions was ever
 * project-specific, and a second copy beside the second collection would have
 * been a second definition of the id format. This module keeps the
 * project-facing names so every existing import reads and works unchanged.
 *
 * The one function that is not a bare re-export is `metaIdFromEntryPath`, and
 * only because its error message names the metadata file. It supplies
 * `project.json` here; the writing loader supplies `article.json`.
 */
import { metaIdFromEntryPath as entryIdFromMetaPath } from '../content/id.ts';

export { contentId, contentIdFromEntryPath, parseContentId } from '../content/id.ts';

/**
 * Derives a `projects` id from a glob entry path such as
 * `augmenta/project.json`. The id is the directory name, so the filesystem —
 * not a field inside the file — decides a project's identity.
 */
export function metaIdFromEntryPath(entry: string): string {
  return entryIdFromMetaPath(entry, 'project.json');
}
