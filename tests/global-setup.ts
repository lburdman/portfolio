import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * Builds `dist/` exactly once, before any suite runs.
 *
 * Two suites read the built site — `tests/links.test.ts` and
 * `tests/anchors.test.ts` — and neither may build it itself. This file exists
 * because both defects that produces are real and both were observed here.
 *
 * ── 1. The race ────────────────────────────────────────────────────────────
 *
 * When each suite built `dist/` on demand in its own `beforeAll`, a clean
 * checkout meant both saw it missing and both started a build into the same
 * directory. `.github/workflows/deploy.yml` makes that certain rather than
 * theoretical: the `ci` job runs the tests, `build` is a separate job, so
 * `dist/` genuinely does not exist when the tests start. It was invisible
 * locally only because `npm run verify` builds before it tests.
 *
 * A `globalSetup` runs once, in the Vitest node process, before any worker.
 * There is no second builder to race with.
 *
 * ── 2. The base-less build ─────────────────────────────────────────────────
 *
 * Vitest exports Astro's own env surface into `process.env` — measured in this
 * repo as `BASE_URL=/`, `MODE=test`, `DEV=1`, `PROD=''`, `NODE_ENV=test`. A
 * build spawned from inside that environment inherits it, and
 * `import.meta.env.BASE_URL` wins over `base` in `astro.config.mjs` for every
 * link built through `src/config/site.ts`.
 *
 * The result is a site with NO deployment base on its internal links —
 * `href="/about/"` instead of `href="/portfolio/about/"` — while `_astro`
 * asset URLs keep it, so the output looks superficially fine. Locale paths
 * come out mangled (`/es/portfolio/` rather than `/portfolio/es/`) and the
 * canonical tags follow.
 *
 * Measured cost of not fixing it: the link suite checked 86 hrefs against that
 * document instead of 359, and only 7 of those were real internal page links.
 * It passed. That is a false green of exactly the kind this repo keeps finding.
 *
 * So the child gets a sanitised environment: every Vite/Vitest-injected
 * variable is deleted so `astro.config.mjs` is once again the only source of
 * `site` and `base`, and `NODE_ENV` is pinned to `production` to match the
 * `Build site` step in the deploy workflow. The suites then read output shaped
 * exactly like what ships.
 *
 * Building unconditionally rather than "only if `dist/` is missing" is
 * deliberate: a stale `dist/` is a false green too, and it is the one this
 * setup could not otherwise rule out. `npm run verify` and the `ci` job both
 * build before testing anyway, so the repeated work is a few seconds against a
 * whole class of silently-wrong runs.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Variables Vitest injects that Astro or Vite would read back during a build.
 * `SITE` and `BASE_URL` are the load-bearing pair; the rest are removed so the
 * child cannot be told it is a test/dev build in any other way either.
 */
const VITE_ENV_KEYS = ['BASE_URL', 'SITE', 'MODE', 'DEV', 'PROD', 'SSR', 'ASSETS_PREFIX'];

export default function setup(): void {
  const env: NodeJS.ProcessEnv = { ...process.env };

  for (const key of VITE_ENV_KEYS) delete env[key];
  for (const key of Object.keys(env)) {
    if (key.startsWith('VITEST')) delete env[key];
  }
  env.NODE_ENV = 'production';

  execFileSync('npx', ['astro', 'build'], { cwd: ROOT, stdio: 'inherit', env });
}
