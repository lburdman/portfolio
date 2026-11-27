#!/usr/bin/env node
/**
 * Scaffolds a new project directory.
 *
 *   npm run project:new -- my-project
 *
 * What it writes passes `npm run project:validate` and `astro sync`
 * immediately, so the first thing an author does is replace TODO text rather
 * than debug a schema error. It is scaffolded as `status: "draft"`, which means
 * it is invisible everywhere until someone deliberately publishes it — a
 * half-written project can never leak into a build.
 *
 * It refuses to overwrite anything.
 *
 * The slug is validated with `SLUG_PATTERN` imported from the production
 * schema, so the scaffolder and the validator can never disagree about what a
 * legal slug is.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectSchema } from './schema-bridge.mjs';
import { scaffoldBody, scaffoldMeta } from './project-scaffold.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PROJECTS_DIR = path.join(ROOT, 'src/content/projects');

const { SLUG_PATTERN } = await loadProjectSchema(import.meta.url);

const [slug] = process.argv.slice(2);

if (!slug) {
  console.error('Usage: npm run project:new -- <slug>\n\nExample: npm run project:new -- fpga-fft-core');
  process.exit(1);
}

if (!SLUG_PATTERN.test(slug)) {
  console.error(
    `"${slug}" is not a valid slug.\n\n` +
      'A slug is lowercase alphanumeric words separated by single hyphens, e.g. "fpga-fft-core".\n' +
      'It becomes the directory name and the URL segment.',
  );
  process.exit(1);
}

const dir = path.join(PROJECTS_DIR, slug);

if (existsSync(dir)) {
  console.error(
    `src/content/projects/${slug}/ already exists.\n\n` +
      'Edit it in place, or choose a different slug. This script never overwrites content.',
  );
  process.exit(1);
}

const meta = scaffoldMeta(slug);
const body = scaffoldBody;

await mkdir(dir);
await writeFile(path.join(dir, 'project.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
await writeFile(path.join(dir, 'en.md'), body('en'), 'utf8');
await writeFile(path.join(dir, 'es.md'), body('es'), 'utf8');

console.log(`Created src/content/projects/${slug}/
  project.json   shared metadata — set domains, stack, links, order
  en.md          English title, summary and case study
  es.md          Spanish title, summary and case study

Next:
  1. Replace every TODO in all three files.
  2. Set "domains" to real values: ai, quantum, fpga, electronics, audio.
  3. Set "status" to "published" (or "wip") when it is ready to be public.
  4. Run: npm run project:validate

The full contract is in docs/PROJECT_CONTENT_CONTRACT.md.`);
