/**
 * Content collections.
 *
 * Astro 5+ looks for this file at `src/content.config.ts` (the old
 * `src/content/config.ts` location is deprecated), and collections are defined
 * with the Content Layer API: a `loader` plus a schema.
 *
 * Projects are split across two collections that are joined in
 * `src/lib/projects/`:
 *
 *   projects        `<slug>/project.json` — shared, locale-independent metadata.
 *                   Stored once, so tags/status/links cannot drift between EN
 *                   and ES the way they did in the previous flat model.
 *   projectContent  `<slug>/{en,es}.md` — only `title`, `summary` and the
 *                   case-study body, i.e. the fields that are genuinely
 *                   translated.
 *
 * Writing — articles and field reports — is split the same way, and joined in
 * `src/lib/writing/`:
 *
 *   writing         `<slug>/article.json` — shared, locale-independent
 *                   metadata: the date, the kind, the domains, the cover and
 *                   the related projects. One file per article, so an article's
 *                   date cannot say November in English and October in Spanish.
 *   writingContent  `<slug>/{en,es}.md` — `title`, `summary` and the body.
 *
 * The two pairs are deliberately four collections rather than two wider ones.
 * A project has a repository, a stack and evidence; an article has a date and a
 * photograph. `docs/PROJECT_CONTENT_CONTRACT.md` §12 says that content which
 * seems to need the project schema widened is not a project — this is that
 * answer, spelled out at the loader.
 *
 * All four schemas come from `src/content/schema.ts` and
 * `src/content/writing-schema.ts`, neither of which imports an Astro virtual
 * module. They are therefore the same objects the tests and
 * `scripts/project-validate.mjs` validate against. There is no second copy.
 *
 * The id helpers are shared by both pairs and live in `src/lib/content/id.ts`,
 * for the same reason: `<slug>/<locale>.md` is one id format, not two.
 *
 * See docs/PROJECT_CONTENT_CONTRACT.md.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { projectContentSchema, projectMetaSchema } from './content/schema.ts';
import { writingContentSchema, writingMetaSchema } from './content/writing-schema.ts';
import { contentIdFromEntryPath, metaIdFromEntryPath } from './lib/content/id.ts';

const PROJECTS_BASE = './src/content/projects';
const WRITING_BASE = './src/content/writing';

const projects = defineCollection({
  loader: glob({
    pattern: '*/project.json',
    base: PROJECTS_BASE,
    // Without this the id would be `augmenta/project`. The id is the project's
    // identity everywhere, so it must be the bare directory name.
    generateId: ({ entry }) => metaIdFromEntryPath(entry, 'project.json'),
  }),
  schema: projectMetaSchema,
});

const projectContent = defineCollection({
  loader: glob({
    pattern: '*/{en,es}.md',
    base: PROJECTS_BASE,
    // `augmenta:en` — a stable id encoding both halves of the entry's identity.
    generateId: ({ entry }) => contentIdFromEntryPath(entry),
  }),
  schema: projectContentSchema,
});

const writing = defineCollection({
  loader: glob({
    pattern: '*/article.json',
    base: WRITING_BASE,
    // Same rule as `projects`: the directory name is the article's identity,
    // and `src/lib/writing/index.ts` refuses a `slug` field that disagrees.
    // The second argument only names the file in the error message.
    generateId: ({ entry }) => metaIdFromEntryPath(entry, 'article.json'),
  }),
  schema: writingMetaSchema,
});

const writingContent = defineCollection({
  loader: glob({
    pattern: '*/{en,es}.md',
    base: WRITING_BASE,
    // `qiskit-fall-fest-fiuba-2025:es` — the same id format as projectContent,
    // built by the same function.
    generateId: ({ entry }) => contentIdFromEntryPath(entry),
  }),
  schema: writingContentSchema,
});

export const collections = { projects, projectContent, writing, writingContent };
