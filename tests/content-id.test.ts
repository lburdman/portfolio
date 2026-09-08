import { describe, expect, it } from 'vitest';
import { contentId, contentIdFromEntryPath, metaIdFromEntryPath, parseContentId } from '../src/lib/content/id';
import { metaIdFromEntryPath as projectMetaId } from '../src/lib/projects/id';

/**
 * The id format, tested where it now lives.
 *
 * `tests/projects.test.ts` already exercises these functions through
 * `src/lib/projects/id.ts`, which is what proves the move to
 * `src/lib/content/id.ts` broke no existing caller. This suite covers what that
 * one cannot: the same functions used from the writing collection, whose
 * metadata file is `article.json` rather than `project.json`.
 *
 * There is deliberately no second copy of these helpers under
 * `src/lib/writing/`. Two implementations of one id format would be two chances
 * for a loader and a consumer to disagree about what an entry is called.
 */
describe('localized entry ids', () => {
  it('round-trips a slug and locale, whichever collection they belong to', () => {
    expect(parseContentId(contentId('qiskit-fall-fest-fiuba-2025', 'es'))).toEqual({
      slug: 'qiskit-fall-fest-fiuba-2025',
      locale: 'es',
    });
  });

  it('derives an id from an article path, including a Windows separator', () => {
    expect(contentIdFromEntryPath('lanet-2025-complex-networks/en.md')).toBe('lanet-2025-complex-networks:en');
    expect(contentIdFromEntryPath('lanet-2025-complex-networks\\es.md')).toBe('lanet-2025-complex-networks:es');
  });

  it('rejects a path that is not <slug>/<locale>.md', () => {
    expect(() => contentIdFromEntryPath('en.md')).toThrow(/Expected "<slug>\/<locale>\.md"/);
  });

  it('rejects a locale the site does not publish', () => {
    expect(() => contentIdFromEntryPath('lanet-2025-complex-networks/fr.md')).toThrow(/Unexpected locale "fr"/);
  });
});

describe('metadata ids', () => {
  it('takes the directory name, whatever the metadata file is called', () => {
    expect(metaIdFromEntryPath('lanet-2025-complex-networks/article.json')).toBe('lanet-2025-complex-networks');
    expect(metaIdFromEntryPath('augmenta/project.json')).toBe('augmenta');
  });

  it('names the caller’s own metadata file when the path is wrong', () => {
    // The message must not claim "project" when the writing loader is the one
    // that failed, and must not go so generic that it stops being actionable.
    expect(() => metaIdFromEntryPath('article.json', 'article.json')).toThrow(/Expected "<slug>\/article\.json"/);
    expect(() => projectMetaId('project.json')).toThrow(/Expected "<slug>\/project\.json"/);
  });

  it('falls back to a generic shape when no metadata file is named', () => {
    expect(() => metaIdFromEntryPath('article.json')).toThrow(/Expected "<slug>\/<metadata file>\.json"/);
  });

  it('quotes the offending path, which is what actually locates the file', () => {
    expect(() => metaIdFromEntryPath('article.json', 'article.json')).toThrow(/"article\.json"/);
  });
});
