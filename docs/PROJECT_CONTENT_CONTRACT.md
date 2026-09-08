# Content contract

This is the complete reference for adding, editing and publishing content. The
site holds two kinds, and they are two schemas rather than one wider one because
they are not the same kind of thing: a project has a repository, a stack and
evidence; an article has a date, a body and a photograph.

- **A project** — §1–§14. Read, write the files, run `npm run project:validate`.
- **An article** in the writing section — §15–§24. Read, write the files, run
  `npm run verify`. There is no scaffolding or validation script for writing;
  §23 says exactly what does hold that collection to account.

**Adding or editing normal content requires zero application-code changes.**
Everything below happens inside `src/content/projects/` or
`src/content/writing/`, plus the alt-text entries in the dictionaries. If you
find yourself editing a component, a route or a schema to add a project or an
article, stop — either it needs something genuinely new, or you are doing it the
hard way. §12 draws that line precisely.

---

# Projects

## 1. Directory layout

One directory per project. The directory name is the slug and the URL segment.

```
src/content/projects/
  quantum-audio/
    project.json      required — shared, locale-independent metadata
    en.md             required — English title, summary, case-study body
    es.md             required — Spanish title, summary, case-study body
    media/            optional — images referenced from project.json
      cover.webp
```

Nothing else belongs in a project directory. `project:validate` reports any
other file.

Both `en.md` and `es.md` are required. A project that exists in only one
language is a validation error, not a feature.

Scaffold a new one rather than copying an existing directory:

```bash
npm run project:new -- my-project
```

It writes all three files with TODO placeholders that already pass validation,
and it refuses to overwrite an existing project.

---

## 2. `project.json` — shared metadata

Everything that is _not_ translated lives here, exactly once. Do not repeat any
of it in `en.md` or `es.md`; the schema rejects unknown keys in both files, so a
misplaced field fails the build rather than being silently ignored.

| Field      | Required | Type                                  | Default   | Notes                                                                                                  |
| ---------- | -------- | ------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------ |
| `slug`     | yes      | string                                | —         | Must equal the directory name. Lowercase alphanumeric words joined by single hyphens: `quantum-audio`. |
| `status`   | no       | `"published"` \| `"wip"` \| `"draft"` | `"draft"` | See §4.                                                                                                |
| `featured` | no       | boolean                               | `false`   | Promotes the project into the homepage's selected set.                                                 |
| `domains`  | yes      | array of domain id, min 1             | —         | See §5. An unknown id fails the build.                                                                 |
| `stack`    | yes      | array of non-empty strings, min 1     | —         | Technologies and concepts, shown as tags. Not translated — see §6.                                     |
| `year`     | no       | integer 1970–2100                     | —         | Four-digit year, e.g. `2024`. Omit it rather than guessing.                                            |
| `role`     | no       | non-empty string                      | —         | Only when it says something a reader cannot infer.                                                     |
| `links`    | no       | object                                | —         | `github`, `demo`, `paper`, `article`. All optional, all `https://`. See §7.                            |
| `cover`    | no       | string                                | —         | Path inside this project, e.g. `"media/cover.webp"`. The file must exist.                              |
| `order`    | no       | integer ≥ 0                           | `99`      | Ascending. See §8.                                                                                     |
| `related`  | no       | array of slugs                        | —         | Must resolve to real projects. See §9.                                                                 |

Why `year` is an integer and not a date string: the site never renders a month
or a day, integers sort and compare without parsing, and there is no timezone to
get wrong. It is optional because inventing a date for existing work would be a
lie — leave it out if you do not know it.

The schema is `src/content/schema.ts`. It is the single source of truth: Astro,
the test suite and `project:validate` all use that same object. There is no
copy anywhere.

---

## 3. `en.md` and `es.md` — localized content

Only two frontmatter fields, because only two things are genuinely translated:

| Field     | Required | Type                 | Notes                                                                     |
| --------- | -------- | -------------------- | ------------------------------------------------------------------------- |
| `title`   | yes      | non-empty string     | The project's name in this language.                                      |
| `summary` | yes      | string, min 10 chars | One or two sentences. Used on cards and as the page `<meta description>`. |

Both must be **single-line quoted strings**. Multi-line and folded YAML scalars
are not supported. Escape a literal apostrophe by doubling it (`don''t`).

Everything after the frontmatter is the case-study body: plain Markdown, `##`
headings, no imports, no components. Suggested sections, none of them mandatory:
Overview, Problem, Approach / Architecture, Key Design Decisions, Results, Key
Learnings. The template adapts; write what the project actually has.

The two bodies are independent. The Spanish version does not need to be a
sentence-for-sentence translation, and section counts may differ.

---

## 4. Status semantics

There is exactly **one** definition of "public", in
`src/lib/projects/visibility.ts`. Never re-implement a status filter in a page,
a component or a route.

| `status`    | Listed | Detail page built | In sitemap | Featured eligible |
| ----------- | ------ | ----------------- | ---------- | ----------------- |
| `published` | yes    | yes               | yes        | yes               |
| `wip`       | yes    | yes               | yes        | yes               |
| `draft`     | no     | no                | no         | no                |

- **`published`** — finished, public.
- **`wip`** — public, and labelled as work in progress. Use it for work you want
  visible before it is polished.
- **`draft`** — not public anywhere. This is the _only_ non-public state, and it
  is the default, so an incomplete project cannot leak into a build.

Visible means `status !== 'draft'`. Visibility is not prominence: a surface that
wants only finished work filters on `status` on top of `isVisible()` rather than
inventing a second definition of public.

To publish: change `"status": "draft"` to `"status": "published"`. That is the
whole operation. To unpublish: change it back.

---

## 5. Domains

`domains` says which technical layers a project belongs to. The valid ids are
fixed by `src/config/domains.ts`:

```
ai · quantum · fpga · electronics · audio
```

Rules:

- At least one. List the most central domain first.
- A project may carry several: `["quantum", "ai", "audio"]`.
- An id outside that list **fails the build**. Do not invent one, and do not add
  a sixth domain to make a project fit — that is an application change, not a
  content change (see §12).

Domains drive accent colours, the projects filter and grouping. `stack` is free
text; `domains` is not.

---

## 6. Localization rules

- Shared metadata is stored **once**, in `project.json`. Never duplicate it per
  language. That duplication is exactly how tags, links and `featured` flags
  drifted apart in the previous model.
- `stack` values are **not** translated. Technology names are proper nouns
  (`PyTorch`, `FastAPI`), and one canonical list keeps EN and ES filtering
  identical. Write them in English.
- `title` and `summary` **are** translated, in `en.md` and `es.md`.
- English is the default locale. If a Spanish translation is missing the site
  falls back to English rather than hiding the project — but
  `project:validate` still fails, because both files are required.

---

## 7. Links

All four link kinds are optional and live under `links`:

```json
"links": {
  "github": "https://github.com/lburdman/qnn-speech-recognition",
  "demo": "https://example.com/demo",
  "paper": "https://arxiv.org/abs/0000.00000",
  "article": "https://example.com/write-up"
}
```

Every URL **must start with `https://`**. This is enforced, and it is not
pedantry: link values are written straight into `href` attributes, and a plain
URL validator accepts `javascript:alert(1)` and `data:text/html,…` as valid
URLs. `http://` is rejected too.

Omit a link you do not have. Do not write `""`, `null` or a placeholder.

---

## 8. Ordering and featuring

- `order` sorts ascending; lower comes first. Ties break on the localized title,
  then on the slug, so the build is deterministic.
- The default is `99`, which sends unordered projects to the end.
- Use small integers with gaps (`10`, `20`, `30`) if you expect to reorder often.
- Reordering is a one-line edit to `order` in the projects concerned. Nothing
  else changes.
- `featured: true` promotes a project into the homepage's selected set. A
  `draft` project is never featured, whatever the flag says.

---

## 9. Related projects

```json
"related": ["augmenta", "support-classifier"]
```

- Slugs only, in the order you want them rendered.
- Every slug must resolve to a real project. `project:validate` fails on one
  that does not.
- A project may not list itself.
- Related entries that are `draft` are dropped at render time rather than shown
  as dead links.
- `related` is one-directional. If you want the link both ways, add it to both
  files.

---

## 10. Media

- Images live in the project's own `media/` directory.
- `cover` is a path relative to the project directory: `"media/cover.webp"`.
  Absolute paths and `../` are rejected — a project cannot reference another
  project's files.
- The file must actually exist; `project:validate` checks.
- Prefer `.webp` for photographs and screenshots, `.svg` for diagrams.
- Images have no `alt` field in `project.json`, and must never grow one. Alt is
  user-facing copy like every other string on this site, so it lives in the
  dictionaries under `projects.mediaAlt`, keyed `<slug>/<file stem>` — e.g.
  `"energy-forecasting/prediction-interval"`. A string written once in English
  is read aloud on the Spanish page with Spanish phonemes, so every figure
  needs both locales.
- Describe what the image **shows** — the series drawn, the axes, the shaded
  region — never what it proves. And describe what it _actually_ shows: if a
  confusion matrix came from a classical baseline, the alt text says
  "logistic-regression baseline". A reader who cannot see the figure is owed
  the same evidence as one who can, not a conclusion drawn on their behalf.
- A missing key is not a crash. `ProjectCard.astro` and the project detail page
  fall back to the localized project title, which is vague rather than wrong —
  which is exactly why nothing would tell you. `tests/i18n.test.ts` sweeps the
  real `media/` directories instead: it fails on any committed figure without
  an entry in **both** locales, and on any entry left behind after its image
  was deleted.

---

## 11. Validation

Run this after any content change:

```bash
npm run project:validate
```

It checks every project against the production schema and reports **every**
problem it finds, grouped by file, then exits non-zero if there was at least
one. It verifies:

- `project.json` is valid JSON and satisfies the schema;
- `slug` equals the directory name;
- both `en.md` and `es.md` exist and their frontmatter is valid;
- every link is `https://`;
- `cover` points at a file that exists;
- every `related` slug resolves, and nothing lists itself;
- no stray files at the top level or inside a project directory;
- **every external link resolves over the network** — see below.

### The link check, and why it is on by default

`project:validate` requests every external URL in every `project.json` and
fails on one that does not resolve. This is **on by default**. To skip only the
network pass:

```bash
npm run project:validate:offline   # or: node scripts/project-validate.mjs --offline
```

`--offline` skips the network pass and nothing else: schema validation, slug
and file checks, `cover` existence and `related` resolution all still run, and
the summary line ends `links not checked (--offline)`, so a passing offline run
can never be mistaken for a passing full one.

The direction of the flag is deliberate. Three of the four "View on GitHub"
links shipped pointing at repositories that do not exist —
`energy-demand-forecasting`, `qnn-speech-recognition` and
`support-ticket-classifier` — because the schema validated that a URL was
_well-formed_ and never asked whether anything was there. Every gate was green
while a recruiter clicking three of four projects got a 404. A check that is
off by default is a check nobody runs, so the flag opts _out_ rather than in.

Use `--offline` on a plane or behind a proxy. Do not use it to turn a red run
green: if a link fails, fix the link.

### It runs in CI

`.github/workflows/deploy.yml` runs `npm run project:validate` — the full
check, network pass included — as its own step, alongside format, lint,
type-check, build and test. A dead project link now fails the pipeline instead
of reaching production.

If GitHub ever rate-limits a run, switch that one step to
`npm run project:validate:offline` and fix the cause. Deleting the step
restores exactly the blind spot it was added for.

The wider gates, unchanged:

```bash
npm run test      # schema and query tests, over the real content
npm run build     # the real check that the whole content layer loads
```

`npm run build` (and `npx astro sync`) will refuse to build on an invalid
domain, a bad URL or an unknown field. `project:validate` exists to tell you
_all_ of what is wrong, in one pass, with a clearer message.

### How the scripts read a TypeScript schema

`scripts/project-validate.mjs` and `scripts/project-new.mjs` are plain Node, and
they import `src/content/schema.ts` **directly**, using Node's built-in
TypeScript type stripping — no build step, no transpiler, no generated copy.
`scripts/schema-bridge.mjs` handles the one wrinkle: type stripping is on by
default from Node 22.18, and this repo pins Node 22.12 in `.nvmrc`, so on an
older Node the bridge re-executes the script once with
`--experimental-strip-types`.

This is why `src/content/schema.ts` imports `../config/domains.ts` with the file
extension, and why it must never import `astro:content`: that is a virtual
module which only exists inside a running Astro build, and importing it would
force the tests and the scripts back onto a copy of the schema.

---

## 12. What you may and may not change

For a **content-only** change — adding, editing, reordering, featuring,
publishing, unpublishing, marking WIP, attaching media, adding links, editing
EN/ES copy — you may modify:

- `src/content/projects/<slug>/project.json`
- `src/content/projects/<slug>/en.md`
- `src/content/projects/<slug>/es.md`
- `src/content/projects/<slug>/media/**`

For an article the list is the same shape, one directory over:

- `src/content/writing/<slug>/article.json`
- `src/content/writing/<slug>/en.md`
- `src/content/writing/<slug>/es.md`
- `src/content/writing/<slug>/media/**`

There is exactly one exception, and it is alt text. Alt is user-facing copy like
every other string on this site, so it lives in the dictionaries and never in
JSON (§10, §22). Committing or deleting an image therefore also touches
`src/i18n/en.ts` and `src/i18n/es.ts`, under `projects.mediaAlt` or
`writing.mediaAlt` and nowhere else in those files.

You must **not** modify, for a content-only change:

- `src/content/schema.ts` and `src/content/writing-schema.ts` — the schemas.
  Changing either changes the contract.
- `src/content.config.ts` — the collection definitions and loaders.
- `src/config/domains.ts` — the five domains. Adding one is an application
  change touching tokens, i18n dictionaries and the Technical Worlds stage.
- `src/lib/projects/**`, `src/lib/writing/**` — visibility, queries, the join.
- `src/pages/**`, `src/components/**`, `src/styles/**`, and `src/i18n/**`
  beyond the `mediaAlt` entries named above.
- `scripts/**`, `tests/**`, config files.

If a project seems to need one of those, it is not a normal project. Say so
rather than widening the schema to fit one case. The rule runs in both
directions and both collections: an article that needs a fifth `kind`, a sixth
domain or a new link type is asking for an application change, not a content
change. The writing collection is itself the answer that rule already produced
once — the material did not fit `project.json`, so it got a schema of its own
instead of `project.json` getting looser.

---

## 13. Complete example

`src/content/projects/quantum-audio/project.json`:

```json
{
  "slug": "quantum-audio",
  "status": "published",
  "featured": true,
  "domains": ["quantum", "ai", "audio"],
  "stack": ["Quantum ML", "PyTorch", "PennyLane", "Speech Processing", "Deep Learning", "CREMA-D"],
  "year": 2024,
  "role": "Sole author",
  "links": {
    "github": "https://github.com/lburdman/qnn-speech-recognition"
  },
  "cover": "media/cover.webp",
  "order": 3,
  "related": ["augmenta"]
}
```

`src/content/projects/quantum-audio/en.md`:

```markdown
---
title: 'Hybrid Classical–Quantum Neural Networks for Audio Emotion Classification'
summary: 'An end-to-end speech emotion recognition pipeline on CREMA-D using mel-spectrograms, transfer learning, and hybrid quantum/classical heads.'
---

## Overview

An end-to-end research pipeline for speech emotion recognition using the
CREMA-D dataset.

## Problem

Quantum machine learning has significant theoretical promise but limited
empirical validation under realistic constraints.

## Key Learnings

The limiting factor is not algorithmic — it is hardware noise and limited qubit
counts.
```

`src/content/projects/quantum-audio/es.md`:

```markdown
---
title: 'Redes Neuronales Clásico-Cuánticas Híbridas para Clasificación de Emociones en Audio'
summary: 'Un pipeline de reconocimiento de emociones en voz sobre CREMA-D usando mel-spectrogramas, transfer learning y cabezas cuánticas/clásicas híbridas.'
---

## Descripción General

Un pipeline de investigación de extremo a extremo para el reconocimiento de
emociones en voz usando el dataset CREMA-D.

## Problema

El machine learning cuántico es un campo con una promesa teórica significativa
pero con validación empírica limitada bajo restricciones realistas.

## Lecciones Clave

El factor limitante no es algorítmico — es el ruido del hardware y el número
limitado de qubits.
```

Then:

```bash
npm run project:validate
```

---

## 14. Reading projects from application code

Pages never call `getCollection('projects')` and never filter on `status`.
Everything comes from `src/lib/projects/`:

```ts
import {
  getVisibleProjects,
  getFeaturedProjects,
  getProjectBySlug,
  getVisibleSlugs,
  getVisibleDomains,
  getRelatedProjects,
  getProjectBodyEntry,
  isWorkInProgress,
} from '@/lib/projects';
import { render } from 'astro:content';

const projects = await getVisibleProjects('en');
const entry = await getProjectBodyEntry('quantum-audio', 'en');
const { Content } = await render(entry!);
```

Each returns a `Project`: `{ meta, locale, title, summary }`, where `meta` is the
parsed `project.json`. Listings, detail routes, both locales and the sitemap all
draw from the same predicate, so they cannot disagree about which projects are
public.

See `docs/ARCHITECTURE.md` §4 for why the model is shaped this way.

---

# Writing

The writing section is a **chronology**: field reports on teaching, community
work, research and study, at `/writing/` and `/es/writing/`. An article is a
date, a title, a standfirst, a body and usually a photograph of a room with
people in it.

Adding one touches no application code. Unlike projects, there is no scaffolding
script and no validation script — §23 says what stands in their place, and what
genuinely is not checked.

---

## 15. Directory layout

One directory per article. The directory name is the slug and the URL segment,
`/writing/<slug>/`.

```
src/content/writing/
  qiskit-fall-fest-fiuba-2025/
    article.json      required — shared, locale-independent metadata
    en.md             required — English title, summary and body
    es.md             required — Spanish title, summary and body
    media/            optional — the cover and any figures
      kickoff-lecture-hall-audience.webp
```

The `slug` inside `article.json` must equal the directory name.
`src/lib/writing/index.ts` throws on a disagreement rather than letting every
link and lookup point at nothing.

Both `en.md` and `es.md` are required. A missing `es.md` does not make the
article vanish from half the site — `resolveArticle` falls back to English,
because a missing translation should read as English rather than as a 404 — but
the result is an English page under a Spanish URL, which the fallback contains
rather than excuses. `tests/writing.schema.test.ts` fails any committed article
missing either file. If even `en.md` is absent the build throws: at that point
the content is broken and the build should say so loudly rather than emit an
empty page.

A directory holding `en.md` or `es.md` and **no** `article.json` is an orphan.
The join drops it, so it would render nowhere at all, silently — that is also a
test failure. A directory holding only `media/` is not an orphan; it is an
article in flight.

---

## 16. `article.json` — shared metadata

Everything that is _not_ translated lives here, exactly once, so an article's
date cannot say November in English and October in Spanish. The schema is
`.strict()`: a misspelled key fails the build rather than silently vanishing
from the rendered page.

| Field             | Required | Type                       | Default   | Notes                                                                                 |
| ----------------- | -------- | -------------------------- | --------- | ------------------------------------------------------------------------------------- |
| `slug`            | yes      | string                     | —         | Must equal the directory name. Lowercase alphanumeric words joined by single hyphens. |
| `status`          | no       | `"published"` \| `"draft"` | `"draft"` | See §18.                                                                              |
| `date`            | **yes**  | `YYYY-MM-DD` or `YYYY-MM`  | —         | The one field that cannot be omitted. See §19.                                        |
| `kind`            | yes      | one of four ids            | —         | How the work was done. See §20.                                                       |
| `domains`         | yes      | array of domain id, min 1  | —         | The same five ids projects use (§5). An unknown id fails the build.                   |
| `cover`           | no       | string                     | —         | Path inside this article, e.g. `"media/cover.webp"`. See §22.                         |
| `links`           | no       | object                     | —         | `event`, `slides`, `paper`, `code`. All optional, all `https://`. See §21.            |
| `relatedProjects` | no       | array of project slugs     | —         | Must resolve to real projects. See below.                                             |

The schema is `src/content/writing-schema.ts`. It is the single source of truth:
Astro and the test suite use that same object, and there is no copy anywhere.
What it shares with `src/content/schema.ts` — the slug pattern, the `https://`
URL rule, the domain id guard, the media path pattern — it shares by import, not
by copy, because a second copy of any of them would be a second chance to weaken
one.

**There is no `featured` and no `order`, and there will not be.** The index is
sorted by `date`, newest first. Giving an article an `order` would ask the author
to restate their own dates by hand, which is two places for one fact; the
projects shelf is curated and has an `order` for exactly the reason writing does
not.

`relatedProjects` points an article at the work it bears on, so a reader who
finishes a conference write-up can reach the project it describes:

```json
"relatedProjects": ["quantum-audio"]
```

- Project slugs, in the order you want them rendered.
- A slug that names no project **fails the build**, in `src/lib/writing/index.ts`
  — the schema cannot catch it, because it validates one file at a time.
- A slug that names a project which exists but is not public is dropped at render
  time rather than shown as a dead link. Resolution goes through the projects
  layer's own visibility predicate, so this file never learns what a project
  status is.
- The relation is one-directional. A project does not gain a link back.

---

## 17. `en.md` and `es.md` — localized content

Two frontmatter fields, because two things are genuinely translated:

| Field     | Required | Type                 | Notes                                                      |
| --------- | -------- | -------------------- | ---------------------------------------------------------- |
| `title`   | yes      | non-empty string     | The article's title in this language.                      |
| `summary` | yes      | string, min 10 chars | The standfirst. One or two sentences saying what happened. |

Both must be **single-line quoted strings**. Multi-line and folded YAML scalars
are not supported — the schema has exactly two flat fields and both the loader
and `tests/writing.schema.test.ts` read them as flat scalars. Escape a literal
apostrophe by doubling it (`don''t`).

`summary` is written once and read three times: under the title on the article,
as the entry's line on the index, and as the page's `<meta description>`. The
ten-character floor exists because a two-word summary produces a useless search
result.

Anything shared belongs in `article.json`, and the schema rejects unknown keys in
both files — a `date` in the frontmatter fails the build rather than becoming a
second, drifting copy of the real one.

Everything after the frontmatter is the body: plain Markdown, `##` headings, no
imports, no components. **No images in the body** — see §22. The two bodies are
independent; the Spanish version is not required to be a sentence-for-sentence
translation.

---

## 18. Status semantics

There is exactly **one** definition of "public", in
`src/lib/writing/visibility.ts`. Never re-implement a status filter in a page, a
component or a route.

| `status`    | Listed | Article page built | In sitemap |
| ----------- | ------ | ------------------ | ---------- |
| `published` | yes    | yes                | yes        |
| `draft`     | no     | no                 | no         |

**Visible means `status !== 'draft'`.** Written as an inequality rather than as
`status === 'published'` so that a status added later would be public by default
and would have to argue for hiding itself — the same shape as the projects
predicate, which is what stops the two collections drifting apart in form.

`draft` is the default, so an article that is still being written cannot leak by
omission. Publishing is a deliberate edit: change `"status": "draft"` to
`"status": "published"`. That is the whole operation.

There are **two** statuses here where a project has three. A project can honestly
be `wip` — shipped, incomplete, labelled as such. An article cannot: it is either
finished and readable or it is not, and a half-written article shown with a "work
in progress" badge is just an unfinished article.

---

## 19. `date`, and why month precision exists

`date` is the only field with no default and no way around it. This section is a
chronology, and an article with no position in time has nowhere to stand on it.

Two forms are accepted, both zero-padded:

```json
"date": "2025-11-08"     // the day it happened
"date": "2025-11"        // only the month is known
```

**Month precision is a real state, not a shortcut.** Some of this material has a
date printed on a slide; some of it is "the end of that semester". The honest
record of the second kind is the month. The alternative — picking a plausible day
— writes a fact into the site that nobody can vouch for, which is the exact class
of failure `AUDIT.md` exists to prevent. So the schema accepts both, and the
renderer says only as much as it knows: a `YYYY-MM` date renders as a month and a
year, and the `<time datetime>` attribute carries the same `YYYY-MM`.

A regex alone would accept `2025-13-45`, so the value is round-tripped through
`Date` and compared against the text it came from. Rejected, with the reason:

| Value        | Why it fails                                             |
| ------------ | -------------------------------------------------------- |
| `2025`       | A year alone is not a position in the chronology.        |
| `2025-13-01` | There is no thirteenth month.                            |
| `2025-02-30` | February has no thirtieth. `2024-02-29` is accepted.     |
| `08-11-2025` | Day-first would silently read as a different day.        |
| `2025-1-8`   | Unpadded. Fixed width is what makes string sorting work. |
| `20251108`   | Not a string in the accepted shape.                      |

Ordering, so you know where an article will land:

- The index is **reverse chronological, newest first**.
- A month-precision date sorts as the **first** of that month — the earliest
  thing that could have happened in it. Inventing the 15th, or the end of the
  month, would put a fabricated day into the ordering of a section whose entire
  subject is what actually happened when.
- Ties break on the localized title, then on the slug, so two articles dated the
  same month cannot swap places between builds.

The date is stored as a string, never as a `Date`. Collection metadata is
serialised to JSON, and a `Date` that survives the round-trip in dev but not in a
build is the class of bug this repo's audit is made of.

---

## 20. Kinds

`kind` says **how the work was done**. What it was _about_ is `domains`, which is
the site-wide vocabulary shared with projects. Exactly one kind per article, from
a closed list:

| `kind`      | What it means                                     |
| ----------- | ------------------------------------------------- |
| `teaching`  | A course, a class, a student cohort.              |
| `community` | Organising, outreach, an event open to outsiders. |
| `research`  | A paper, a poster, a conference.                  |
| `study`     | The author on the other side of the desk.         |

The list is closed on purpose. Four kinds describe how a piece of work happened;
a fifth almost always turns out to be a subject, and subjects are `domains`.

The rendered label is a dictionary string, `writing.kinds.<kind>` in `en.ts` and
`es.ts`, and `UIStrings` types it as a `Record` over the four ids — so adding a
kind is a compile error until both dictionaries have a word for it. That is an
application change (§12), not a content change.

`kind` is a label on the index and on the article page. It does not filter the
index: with a kind selected, the gaps between the surviving entries would no
longer measure the time between them, and the axis would keep drawing a scale it
was no longer honouring. The projects index filters because a shelf has no scale
to break.

---

## 21. Links

Four link kinds, all optional, all under `links`:

```json
"links": {
  "event": "https://qiskitfallfest.org/",
  "slides": "https://example.com/poster.pdf",
  "paper": "https://arxiv.org/abs/0000.00000",
  "code": "https://github.com/lburdman/example"
}
```

- `event` — the event's own page, registration or programme.
- `slides` — slides, a poster PDF, or other material presented.
- `paper` — a paper or published abstract.
- `code` — code written for, or shown at, whatever the article describes.

They render in that order. The renderer derives its list from the schema's own
keys, so a fifth link type added to the schema is a compile error on the article
page until it is named in both dictionaries — rather than a link the schema
happily accepts and the page silently never renders.

Every URL **must start with `https://`**, for the same reason as §7: these values
go straight into `href` attributes, and a plain URL validator accepts
`javascript:alert(1)` and `data:text/html,…` as valid URLs. `http://` is rejected
too.

The object is `.strict()`, so `"twitter"` or a misspelled `"slide"` fails the
build instead of disappearing from the page.

Omit a link you do not have. Do not write `""`, `null` or a placeholder.

Note what is _not_ done here: article links are **not** checked over the network.
`project:validate` requests every project URL and runs in CI (§11); nothing does
that for writing. An article link that rots stays green until someone clicks it.

---

## 22. Media

- Images live in the article's own `media/` directory.
- `cover` is a path relative to the article directory: `"media/cover.webp"`.
  A bare filename, an absolute path and anything containing `../` are all
  rejected, so an article can never reference another article's files.
- `cover` is the only image named in `article.json`, and the only one the index
  ever shows. **Every other image in `media/` is rendered automatically** on the
  article page, after the body, in filename order.

That asymmetry is deliberate. `cover` is a _choice_ — which photograph
represents the article in a listing — and it earns a schema field. "The other
images in `media/`" is not a choice, it is the contents of a folder; a second
array in `article.json` would mean every added file had to be named twice and
could silently disagree with itself.

**Images never go in the Markdown body.** Figures are discovered with
`import.meta.glob` and rendered by the route, outside the body, and this is not a
style preference: `.prose` carries no `img` or `figure` rule, and a
Markdown-embedded image gets no `astro:assets` processing at all — no `srcset`,
no intrinsic `width`/`height`, so no reserved box and a layout-shift cost on
every one. Put the photograph in `media/` and it is processed, sized and
responsive; write it into the body and it is none of those things.

**Format: WebP.** There is **no image-conversion tooling in this repository** —
no script, no build step, nothing that will turn a JPEG you commit into anything
else on your behalf. The committed `.webp` files were produced with `cwebp` on
the command line, outside the build, and that is the expected workflow. Convert
before you commit.

Sizing, so you can choose a photograph that survives its two contexts:

- The **index** crops covers into one wide plate, because a chronology cannot
  hold five different image heights and still read as a ledger. A cover whose
  subject sits at the very top or bottom of the frame will lose it.
- The **article page** gives every image its natural aspect ratio and never
  crops. Portrait is fine there — cropping a research poster to a wide band
  removes the poster.
- Both cap at the reading measure and never upscale: the responsive widths are
  intersected with the source's own resolution, so a small image is served
  small rather than blown up.

**Alt text lives in the dictionaries, never in JSON**, and `article.json` has no
`alt` field and must never grow one. Alt is user-facing copy like every other
string on this site, so it goes in `src/i18n/en.ts` and `src/i18n/es.ts` under
`writing.mediaAlt`, keyed `<slug>/<file stem>`:

```ts
'qiskit-fall-fest-fiuba-2025/kickoff-lecture-hall-audience':
  'A tiered lecture hall with wooden bench rows, roughly sixty people seated and facing forward under long fluorescent ceiling tubes.',
```

- Both locales, always. A string written once in English is read aloud on the
  Spanish page with Spanish phonemes.
- Describe what the photograph **shows** — how many people, where, what is on
  the screen behind them — never what the event is supposed to have proved.
  These are pictures of rooms full of real people; `alt=""` would announce them
  as decoration.
- A missing key is not a crash. The page falls back to the localized article
  title, which is vague rather than wrong — which is exactly why nothing would
  tell you. So `tests/i18n.test.ts` sweeps the real `media/` directories
  instead: committing an image both publishes it **and** fails the build until
  it has an entry in both locales, and deleting an image fails the build until
  its now-orphaned entries are removed too.

---

## 23. What holds this collection to account

There is **no `writing:new` and no `writing:validate`**. Projects have both, and
`project:validate` additionally runs in CI with a live network link check (§11).
Writing has neither script. This is the current state, stated plainly so nobody
goes looking for a command that does not exist.

What does hold it to account:

- **The Zod schema, at build time.** `src/content/writing-schema.ts` is what
  Astro validates every `article.json` and every frontmatter block against.
  `npx astro sync` and `npm run build` refuse an unknown key, an unknown domain,
  a bad URL, an impossible date or a missing `date`.
- **`src/lib/writing/index.ts`, at build time**, for the two things a
  file-at-a-time schema cannot see: a `slug` that disagrees with its directory
  name, and a `relatedProjects` entry naming a project that does not exist.
- **`tests/writing.schema.test.ts`**, which imports the production schema — no
  mirror, no copy — and sweeps the real directories on disk. It checks that
  every `article.json` satisfies the schema, that `slug` equals the directory
  name, that both locales exist with valid frontmatter, that domains are known,
  that links are `https://`, that slugs are distinct, and that no localized file
  is orphaned.
- **`tests/i18n.test.ts`**, for alt text in both locales (§22) and for the kind
  labels.
- **`tests/writing-routes.test.ts`**, which renders the routes and guards the
  route-layer rules: no inline `style` attribute (§10 of `ARCHITECTURE.md`), both
  surfaces agreeing on view-transition names, and every schema link type actually
  being rendered.

So the loop after a content change is:

```bash
npm run verify
```

What is **not** checked, and is worth knowing before you rely on it:

- External links are never requested. See §21.
- A `cover` naming a file that does not exist does not fail anything. The image
  simply does not render — the article page and the index both resolve the cover
  through a glob and fall through when the path misses. Check the filename.
- Stray files inside an article directory are not reported. `project:validate`
  does that for projects; nothing does it here.

---

## 24. Reading writing from application code

Pages never call `getCollection('writing')` and never filter on `status`.
Everything comes from `src/lib/writing/`:

```ts
import {
  getVisibleArticles,
  getArticleBySlug,
  getVisibleWritingSlugs,
  getArticlesByKind,
  getVisibleKinds,
  getArticleNeighbours,
  getArticleBodyEntry,
} from '@/lib/writing';
import { render } from 'astro:content';

const articles = await getVisibleArticles('en');
const entry = await getArticleBodyEntry('qiskit-fall-fest-fiuba-2025', 'en');
const { Content } = await render(entry!);
```

Each returns an `Article`: `{ meta, locale, title, summary }`, where `meta` is
the parsed `article.json` and `locale` is the locale actually rendered, which may
differ from the one requested when a translation is missing.

`getArticleNeighbours` returns `{ older, newer }` rather than
`{ previous, next }`: the index runs newest-first, so "next" means the opposite
thing depending on whether you are thinking about the page or about the calendar.

`src/lib/writing/index.ts` is the only module in that directory that imports
`astro:content`. Everything else — the join, the sort, the visibility predicate,
the date helpers — is plain TypeScript in `query.ts` and `visibility.ts`, which
is what lets the tests exercise the functions the pages actually call without
booting Astro.

See `docs/ARCHITECTURE.md` §4 for why the model is shaped this way.
