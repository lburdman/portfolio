# Operational rules for coding agents

These are rules, not explanation. The reasoning lives in the documents below —
read the relevant one before changing anything structural.

| Read                               | Before                                                           |
| ---------------------------------- | ---------------------------------------------------------------- |
| `docs/ARCHITECTURE.md`             | touching routing, i18n, the content model, layouts or deployment |
| `docs/PROJECT_CONTENT_CONTRACT.md` | adding or editing a project or an article, or changing a schema  |
| `docs/MOTION_SYSTEM.md`            | adding animation, scroll behaviour or a visual island            |
| `PORTFOLIO_BRIEF.md`               | product, copy or experience decisions                            |
| `AUDIT.md`                         | the verified defect baseline — do not reintroduce these          |

## Non-negotiable

**Never resolve a failing check by suppressing it.** No `eslint-disable`, no rule
downgraded to `warn` or `off`, no `any`, no type assertion added to silence the
compiler, no deleted assertion or validation. If a rule genuinely cannot be
satisfied, leave it failing and say so. The audit named this pattern in the
repo's own history; it is the one thing that must not recur.

**`npm run verify` must pass before you call anything done.** It is
`astro sync → format:check → lint → type-check → build → test`, the same order as
CI. `astro sync` comes first because `.astro/types.d.ts` does not exist on a fresh
checkout and lint and type-check both need it. The build runs before the tests
because `tests/global-setup.ts` reads `dist/`. A green
result you did not run is not a result.

## Single sources of truth

A value that appears in two places means one of them is a bug.

- `src/config/site.ts` — social links, email, name, résumé path, OG image. Nothing
  else may hardcode a URL, an address or the deployment origin.
- `src/styles/tokens.css` — every colour, spacing step and type size. No hex
  literal anywhere else.
- `src/config/navigation.ts` — navigation entries.
- `src/i18n/routing.ts` — **all** URL construction. Nothing else concatenates a
  base path, a locale prefix and a route.
- `src/content/schema.ts` — the project schema, and the content primitives both
  schemas share (slug pattern, `https://` URL rule, domain id, media path).
  Tests and `project:validate` import this one; never mirror it into a test file.
- `src/content/writing-schema.ts` — the article schema. It imports those
  primitives rather than restating them; tests import this one too, and no test
  may mirror either.

## i18n

Every user-facing string lives in `src/i18n/en.ts` and `src/i18n/es.ts` — page
titles and descriptions, empty states, `alt` text and **`aria-label`s included**.
The type checker enforces EN/ES parity; a string hardcoded in a component escapes
it, and a Spanish page reads an English `aria-label` aloud with Spanish phonemes.

Components never fetch translations. They receive `t` and `locale` as props.

## Content

Adding or editing a normal project or article touches **no application code** —
content files only, plus the `mediaAlt` entry every committed image needs in both
dictionaries, per `docs/PROJECT_CONTENT_CONTRACT.md`. For a project, use
`npm run project:new` to scaffold and `npm run project:validate` to check; the
writing collection has neither script, and is held by its schema, by the
build-time checks in `src/lib/writing/index.ts` and by
`tests/writing.schema.test.ts`. If a content change requires a code change, the
model is wrong: fix the model, not the instance.

`isVisible()` in `src/lib/projects/visibility.ts` is the only definition of which
projects are public, and `isVisible()` in `src/lib/writing/visibility.ts` the
only definition for articles. Every listing, detail route, featured set,
pagination and the sitemap calls one of them. Never re-read `status` to decide
whether something is public.

Logic belongs in `src/lib/**` as plain TypeScript, where it is unit-tested — not
in `.astro` frontmatter, where the audit found four routes that had already
diverged from each other.

## Delegating work

Implementation in this repo is done by subagents with **tightly-scoped,
non-overlapping file ownership**. Assign each agent an explicit list of files it
owns and may write; two agents must never own the same file.

The coordinating agent delegates, keeps only the summaries agents return, and
does not read the full contents of the files they touched. Cross-agent facts —
a renamed export, a changed dictionary key — are relayed as short messages, not
by re-reading the tree.

If work you are given overlaps a file you do not own, stop and report the
overlap rather than editing it.
