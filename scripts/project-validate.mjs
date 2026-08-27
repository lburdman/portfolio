#!/usr/bin/env node
/**
 * Validates every real project in `src/content/projects/` against the
 * production schema.
 *
 *   npm run project:validate
 *
 * "The production schema" is literal: this script imports
 * `src/content/schema.ts` — the same object `src/content.config.ts` hands to
 * Astro. There is no test-only copy to drift out of sync, which is the exact
 * defect the audit found in the previous test suite.
 *
 * Node loads that TypeScript module through `./schema-bridge.mjs`, which uses
 * Node's built-in type stripping. No build step, no transpiler, no duplicated
 * schema.
 *
 * Every problem found is reported, not just the first, and the exit code is 1
 * if there is at least one.
 *
 * ── Link liveness ──────────────────────────────────────────────────────────
 *
 * On top of the schema, every external URL under `links` is resolved over the
 * network. This exists because the schema validates URL *shape* and nothing
 * else: three "View on GitHub" links pointed at repositories that had been
 * renamed, every one of them was a perfectly-formed `https://github.com/...`
 * string, and all three shipped through a full green pipeline to a live site.
 * A URL that parses is not a URL that resolves.
 *
 *   node scripts/project-validate.mjs             # schema + link liveness
 *   node scripts/project-validate.mjs --offline   # schema only, no network
 *   node scripts/project-validate.mjs --help
 *
 * Checking is ON by default and opted OUT of with `--offline`, deliberately in
 * that direction: a default-off check is a check nobody runs. `--offline` is
 * for a plane, a captive portal, or a CI job that must not depend on
 * github.com being reachable — it is an explicit statement that this run
 * proves less, not a quiet degradation.
 *
 * Requests are HEAD first, falling back to GET for hosts that refuse HEAD;
 * redirects are followed and a final status under 400 is alive. At most
 * `LINK_CONCURRENCY` are in flight and each has a `LINK_TIMEOUT_MS` budget.
 * Identical URLs are fetched once and reported at every place they appear.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectSchema } from './schema-bridge.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PROJECTS_DIR = path.join(ROOT, 'src/content/projects');
const REQUIRED_LOCALES = ['en', 'es'];
const ALLOWED_ENTRIES = new Set(['project.json', 'en.md', 'es.md', 'media']);

/** Per-request budget. Long enough for a slow host, short enough to fail fast. */
const LINK_TIMEOUT_MS = 8000;
/** In-flight request cap. Four is polite to a single host and still quick. */
const LINK_CONCURRENCY = 4;
/**
 * A plain browser-ish UA. GitHub answers Node's default `undici` UA fine, but
 * some hosts answer an unrecognised agent with a 403 that means "no" to the
 * crawler and nothing at all about whether the page exists.
 */
const LINK_USER_AGENT = 'Mozilla/5.0 (compatible; portfolio-project-validate/1.0)';

const USAGE = `Usage: node scripts/project-validate.mjs [options]

Validates every project in src/content/projects/ against the production
content schema, and resolves every external URL in \`links\` over the network.

Options:
  --offline   Skip the network link check. Schema validation still runs.
  --help      Show this message.

Exits 1 if any project fails the schema or any checked link is not reachable.
Every problem found is reported, not just the first.`;

/** Collected as `{ file, message }` so the report can be grouped and complete. */
const problems = [];

/**
 * Every external link found, as `{ file, slug, name, url }`. Gathered during
 * the local pass and resolved afterwards in one batch, so the network work
 * happens once, with a known total, rather than serially inside the walk.
 */
const linkTargets = [];

function fail(file, message) {
  problems.push({ file: path.relative(ROOT, file), message });
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads the `---` frontmatter of a localized markdown file.
 *
 * `projectContentSchema` allows exactly two string fields, so only single-line
 * scalars are supported here — which is what the contract requires and what
 * `project:new` scaffolds. Anything else is reported rather than guessed at.
 */
function parseFrontmatter(raw, file) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
  if (!match) {
    fail(file, 'Missing YAML frontmatter. The file must start with a `---` block.');
    return undefined;
  }

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;

    const field = /^([A-Za-z][\w-]*):[ \t]*(.*)$/.exec(line);
    if (!field) {
      fail(file, `Frontmatter line is not a simple \`key: value\` pair: ${line.trim()}`);
      return undefined;
    }

    const [, key, rawValue] = field;
    const value = rawValue.trim();
    if (value === '') {
      fail(
        file,
        `\`${key}\` must be a single-line quoted string. Multi-line and folded YAML scalars are not allowed here.`,
      );
      return undefined;
    }

    if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
      data[key] = value.slice(1, -1).replaceAll("''", "'");
    } else if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      data[key] = value.slice(1, -1).replaceAll('\\"', '"');
    } else {
      data[key] = value;
    }
  }
  return data;
}

/** Renders Zod issues as one line per issue, with the field path. */
function reportZod(file, error, label) {
  for (const issue of error.issues) {
    const at = issue.path.length > 0 ? issue.path.join('.') : label;
    fail(file, `${at}: ${issue.message}`);
  }
}

async function validateProject(schema, slug) {
  const dir = path.join(PROJECTS_DIR, slug);
  const metaFile = path.join(dir, 'project.json');

  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (!ALLOWED_ENTRIES.has(entry.name) && !entry.name.startsWith('.')) {
      fail(
        path.join(dir, entry.name),
        'Unexpected entry. A project directory holds project.json, en.md, es.md and an optional media/ directory.',
      );
    }
  }

  if (!(await exists(metaFile))) {
    fail(metaFile, 'Missing project.json. Every project needs its shared metadata file.');
    return undefined;
  }

  let raw;
  try {
    raw = JSON.parse(await readFile(metaFile, 'utf8'));
  } catch (error) {
    fail(metaFile, `Invalid JSON: ${error.message}`);
    return undefined;
  }

  // Checked against the raw value, before schema validation, so that a
  // slug/directory mismatch is still reported when some other field is also
  // wrong. A file gets one full report, not one problem per run.
  if (raw?.slug !== slug) {
    fail(metaFile, `slug is ${JSON.stringify(raw?.slug)} but the directory is "${slug}". They must be identical.`);
  }

  const parsed = schema.projectMetaSchema.safeParse(raw);
  if (!parsed.success) {
    reportZod(metaFile, parsed.error, 'project.json');
    return undefined;
  }

  const meta = parsed.data;

  // The schema already rejects non-https URLs; checking again here turns a
  // build-time Zod issue into a message that names the link and the file.
  for (const [name, url] of Object.entries(meta.links ?? {})) {
    if (!url.startsWith('https://')) {
      fail(metaFile, `links.${name} is not an https:// URL: ${url}`);
      continue;
    }
    linkTargets.push({ file: metaFile, slug, name, url });
  }

  if (meta.cover && !(await exists(path.join(dir, meta.cover)))) {
    fail(metaFile, `cover points at "${meta.cover}", which does not exist in this project.`);
  }

  for (const locale of REQUIRED_LOCALES) {
    const file = path.join(dir, `${locale}.md`);
    if (!(await exists(file))) {
      fail(file, `Missing ${locale}.md. Every project must exist in both English and Spanish.`);
      continue;
    }

    const frontmatter = parseFrontmatter(await readFile(file, 'utf8'), file);
    if (!frontmatter) continue;

    const content = schema.projectContentSchema.safeParse(frontmatter);
    if (!content.success) reportZod(file, content.error, 'frontmatter');
  }

  return meta;
}

/**
 * Resolves one URL.
 *
 * HEAD first because it is the cheapest question that answers "does this
 * exist". Not every host answers it honestly — some return 403/405/501 for a
 * method they simply do not implement — so anything that is not a clean
 * verdict is retried once with GET before it is called dead. Redirects are
 * followed, so `status` is the status of the final hop; GitHub's rename
 * redirect is therefore alive, and a deleted repository's 404 is not.
 *
 * Returns `{ ok }` or `{ ok: false, reason }`. It never throws: a transport
 * error is a result, not a crash, so one unreachable host cannot hide the
 * verdict on every other link.
 */
async function resolveLink(url) {
  const request = async (method) => {
    try {
      const response = await fetch(url, {
        method,
        redirect: 'follow',
        headers: { 'user-agent': LINK_USER_AGENT, accept: '*/*' },
        signal: AbortSignal.timeout(LINK_TIMEOUT_MS),
      });
      return { status: response.status };
    } catch (error) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'TimeoutError' || name === 'AbortError') {
        return { error: `no response within ${LINK_TIMEOUT_MS}ms` };
      }
      return { error: error instanceof Error ? (error.cause?.message ?? error.message) : String(error) };
    }
  };

  let result = await request('HEAD');
  // 403/405/501 from a HEAD are far more often "method not implemented" than
  // "gone", and a transport error can be the host closing on an empty body.
  if (result.error !== undefined || (result.status !== undefined && [403, 405, 501].includes(result.status))) {
    result = await request('GET');
  }

  if (result.error !== undefined) return { ok: false, reason: result.error };
  return result.status < 400 ? { ok: true } : { ok: false, reason: `HTTP ${result.status}` };
}

/**
 * Resolves every collected link with at most `LINK_CONCURRENCY` in flight, and
 * records a problem for each dead one — all of them, named by project, field,
 * URL and status. The same URL is fetched once however many projects use it.
 */
async function checkLinkLiveness() {
  const unique = [...new Set(linkTargets.map((target) => target.url))];
  const verdicts = new Map();

  const queue = unique[Symbol.iterator]();
  const worker = async () => {
    for (const url of queue) verdicts.set(url, await resolveLink(url));
  };
  await Promise.all(Array.from({ length: Math.min(LINK_CONCURRENCY, unique.length) }, worker));

  for (const { file, slug, name, url } of linkTargets) {
    const verdict = verdicts.get(url);
    if (verdict && !verdict.ok) {
      fail(file, `links.${name} does not resolve — ${verdict.reason}: ${url} (project "${slug}")`);
    }
  }

  return unique.length;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE);
    return;
  }

  const checkLinks = !args.includes('--offline');
  const unknown = args.filter((arg) => arg !== '--offline');
  if (unknown.length > 0) {
    console.error(`Unknown option${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}\n`);
    console.error(USAGE);
    process.exit(1);
  }

  const schema = await loadProjectSchema(import.meta.url);

  if (!(await exists(PROJECTS_DIR))) {
    console.error(`No project directory at ${path.relative(ROOT, PROJECTS_DIR)}`);
    process.exit(1);
  }

  const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.name.startsWith('.')) {
      fail(
        path.join(PROJECTS_DIR, entry.name),
        'Loose file. Project content lives in a per-slug directory, not at the top level.',
      );
    }
  }

  const slugs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (slugs.length === 0) {
    console.error('No projects found in src/content/projects/.');
    process.exit(1);
  }

  const metas = new Map();
  for (const slug of slugs) {
    if (!schema.SLUG_PATTERN.test(slug)) {
      fail(
        path.join(PROJECTS_DIR, slug),
        'Directory name is not a valid slug (lowercase alphanumeric words separated by single hyphens).',
      );
    }
    const meta = await validateProject(schema, slug);
    if (meta) metas.set(slug, meta);
  }

  // Cross-project checks, once every project is known.
  for (const [slug, meta] of metas) {
    for (const related of meta.related ?? []) {
      const file = path.join(PROJECTS_DIR, slug, 'project.json');
      if (related === slug) {
        fail(file, `related lists "${related}", which is this project itself.`);
      } else if (!metas.has(related)) {
        fail(file, `related lists "${related}", which is not a project in src/content/projects/.`);
      }
    }
  }

  // Network last, and unconditionally — not "only if the local pass was
  // clean". A schema problem in one project must not hide a dead link in
  // another; this script reports everything it can see in a single run.
  let checkedLinks = 0;
  if (checkLinks) {
    checkedLinks = await checkLinkLiveness();
  }

  if (problems.length > 0) {
    const byFile = new Map();
    for (const problem of problems) {
      byFile.set(problem.file, [...(byFile.get(problem.file) ?? []), problem.message]);
    }

    console.error(`project:validate found ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n`);
    for (const [file, messages] of [...byFile].sort()) {
      console.error(`  ${file}`);
      for (const message of messages) console.error(`    - ${message}`);
      console.error('');
    }
    console.error('See docs/PROJECT_CONTENT_CONTRACT.md for the field-by-field contract.');
    process.exit(1);
  }

  const links = checkLinks
    ? `, ${checkedLinks} link${checkedLinks === 1 ? '' : 's'} live`
    : ', links not checked (--offline)';
  console.log(
    `project:validate — ${slugs.length} project${slugs.length === 1 ? '' : 's'} valid${links}: ${slugs.join(', ')}`,
  );
}

await main();
