/**
 * Lets plain Node load the production TypeScript schema.
 *
 * `scripts/project-validate.mjs` and `scripts/project-new.mjs` must validate
 * against the *same* schema object `src/content.config.ts` gives Astro. The
 * audit's finding was a test that revalidated its own copy of the schema and
 * stayed green while the real one changed; keeping one object is the whole
 * point of `src/content/schema.ts` not importing `astro:content`.
 *
 * Node cannot execute TypeScript by itself, so the choice is a build step, a
 * transpiler dependency, or Node's built-in type stripping. Type stripping
 * wins: no dependency, no generated artefact, nothing to keep in sync.
 *
 * The catch is the version. It is on by default from Node 22.18, but this repo
 * pins Node 22.12 in `.nvmrc` (and CI reads that file), where it exists only
 * behind `--experimental-strip-types`. So: if the running Node has not got type
 * stripping enabled, re-exec the calling script once with the flag. On Node
 * 22.18+ that branch never runs.
 *
 * This is also why `src/content/schema.ts` writes `../config/domains.ts` with
 * the extension — type stripping does no extension guessing, and TypeScript
 * accepts it because `astro/tsconfigs/base` sets `allowImportingTsExtensions`.
 */
import { spawnSync } from 'node:child_process';

const SCHEMA_URL = new URL('../src/content/schema.ts', import.meta.url).href;

/**
 * Re-runs `scriptUrl` with type stripping enabled and exits with its status.
 * Returns only when no re-exec is needed.
 */
function reexecWithTypeStripping(scriptUrl) {
  if (process.features.typescript) return;

  const result = spawnSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--disable-warning=ExperimentalWarning',
      new URL(scriptUrl).pathname,
      ...process.argv.slice(2),
    ],
    { stdio: 'inherit' },
  );

  if (result.error) {
    console.error(
      `This script needs TypeScript type stripping, which Node ${process.versions.node} does not\n` +
        'provide by default. Re-running it with --experimental-strip-types failed:\n' +
        `  ${result.error.message}\n\n` +
        'Use Node >= 22.18, where type stripping is enabled out of the box.',
    );
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

/**
 * Loads `src/content/schema.ts`, re-executing the calling script with type
 * stripping first if this Node needs it.
 *
 * @param {string} scriptUrl the caller's `import.meta.url`
 */
export async function loadProjectSchema(scriptUrl) {
  reexecWithTypeStripping(scriptUrl);

  try {
    return await import(SCHEMA_URL);
  } catch (error) {
    console.error(
      `Could not load src/content/schema.ts with Node ${process.versions.node}.\n` +
        'This script imports the production TypeScript schema directly, using native\n' +
        'type stripping. Use Node >= 22.18, or run with --experimental-strip-types.\n',
    );
    throw error;
  }
}
