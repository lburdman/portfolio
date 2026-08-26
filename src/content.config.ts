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
 * Both schemas come from `src/content/schema.ts`, which imports no Astro
 * virtual module and is therefore the same object the tests and
 * `scripts/project-validate.mjs` validate against. There is no second copy.
 *
 * See docs/PROJECT_CONTENT_CONTRACT.md.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { projectContentSchema, projectMetaSchema } from './content/schema.ts';
import { contentIdFromEntryPath, metaIdFromEntryPath } from './lib/projects/id.ts';

const PROJECTS_BASE = './src/content/projects';

const projects = defineCollection({
  loader: glob({
    pattern: '*/project.json',
    base: PROJECTS_BASE,
    // Without this the id would be `augmenta/project`. The id is the project's
    // identity everywhere, so it must be the bare directory name.
    generateId: ({ entry }) => metaIdFromEntryPath(entry),
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

export const collections = { projects, projectContent };
