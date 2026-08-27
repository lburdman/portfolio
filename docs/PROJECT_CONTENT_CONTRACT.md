# Project content contract

This is the complete reference for adding, editing and publishing a project.

**Adding or editing a normal project requires zero application-code changes.**
Everything below happens inside `src/content/projects/`. If you find yourself
editing a component, a route or a schema to add a project, stop — either the
project needs something genuinely new, or you are doing it the hard way.

Read this file, do the work, run `npm run project:validate`. That is the loop.

---

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
- Cover images have no `alt` field: the alt text is derived from the localized
  title, which is already translated.

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
- no stray files at the top level or inside a project directory.

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

You must **not** modify, for a content-only change:

- `src/content/schema.ts` — the schema. Changing it changes the contract.
- `src/content.config.ts` — the collection definitions and loaders.
- `src/config/domains.ts` — the five domains. Adding one is an application
  change touching tokens, i18n dictionaries and the Technical Worlds stage.
- `src/lib/projects/**` — visibility, queries, the join.
- `src/pages/**`, `src/components/**`, `src/styles/**`, `src/i18n/**`
- `scripts/**`, `tests/**`, config files.

If a project seems to need one of those, it is not a normal project. Say so
rather than widening the schema to fit one case.

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
