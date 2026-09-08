# Architecture

**Status:** decided · **Date:** 2026-08-26
**Applies to:** the whole repository. Read this before changing anything structural.

Companion documents:

- `PORTFOLIO_BRIEF.md` — product, design and experience target (source of truth)
- `AUDIT.md` — verified defect baseline this redesign resolves
- `docs/PROJECT_CONTENT_CONTRACT.md` — how to add and edit projects and articles
- `docs/MOTION_SYSTEM.md` — motion principles, budgets and fallbacks

---

## 1. Framework decision

**Selected: Astro 7, static output, with selective React islands.**

Astro was already in use. That is explicitly _not_ the reason it was selected — the
gate below was run against the real deployment constraints, and Astro won on them.

### The deciding constraint

The site deploys to **GitHub Pages** (`https://lburdman.github.io/portfolio/`).
Static hosting, no Node runtime, no image service, served from a subpath.

### Option A — Astro + selective React islands (selected)

| Criterion                     | Result                                                                                                                      |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Homepage needing client React | Two surfaces: the Technical Worlds stage and project card pointer affordances. Everything else is static HTML.              |
| First-load JavaScript         | 0 KB on the critical path. React loads only for islands, all of which are below the fold and hydrate with `client:visible`. |
| Shared client state           | Confined inside single islands. No cross-island coordination is required, which removes Astro's main structural weakness.   |
| Content ergonomics            | Content Layer + Zod is a direct fit for "adding a project requires zero application-code changes".                          |
| Bilingual routing             | One `[...locale]` catch-all renders both locales from a single file per route. Zero duplication.                            |
| SEO / static generation       | Per-route HTML by default. Canonical, hreflang and sitemap generated from one helper.                                       |
| Image handling                | `astro:assets` optimises at build time — works on fully static output.                                                      |
| Deployment                    | First-class. `astro build` produces exactly what Pages serves.                                                              |

### Option B — Next.js App Router + React (rejected)

Under GitHub Pages, Next.js must run `output: 'export'`. That disables
`next/image` optimisation, middleware-based i18n, RSC streaming and ISR — every
capability that would justify choosing it. What remains is a React runtime
shipped to **every** page, including project case studies that are pure prose.

The brief's own performance contract (§30) says "avoid unnecessary framework
runtimes". Choosing Next here would mean paying React's cost on ~85% of the site
that has no interactivity, in exchange for features the host cannot run.

Content is the second strike: Next has no first-party equivalent of content
collections. Contentlayer is unmaintained; hand-rolled MDX loading would be
application code that a content-only change could break — directly against the
"zero application-code changes" requirement.

### Option C — React + Vite (rejected)

An SPA produces no per-route HTML without bolting on an SSG plugin. Canonical
URLs, hreflang, per-page metadata and the sitemap would all become hand-built
infrastructure that Astro provides. It offers no advantage over A or B here.

### What this decision costs

Astro's genuine weakness is coordination _between_ islands. This design avoids
paying it: the one stateful, coordinated surface (Technical Worlds) is a **single**
island that owns all of its state internally. If a future feature needs two
islands to share state, revisit this document rather than reaching for a global store.

---

## 2. Rendering and route model

- `output: 'static'` — every route is prerendered at build time.
- `trailingSlash: 'always'` with `build.format: 'directory'`.
  This is load-bearing. The audit found canonical URLs ending in `/` while
  hreflang alternates did not, which silently invalidates the locale pairing.
  With one global slash policy and one URL helper, the two cannot diverge.
- `base: '/portfolio'` — the site is served from a subpath. **Never** write a
  bare absolute path like `/projects` in a template; always route through the
  helpers in `src/i18n/routing.ts`.

### Routes

Both locales are produced from one file each via a `[...locale]` catch-all:

```
src/pages/
  [...locale]/
    index.astro            →  /              and  /es/
    about.astro            →  /about/        and  /es/about/
    projects/index.astro   →  /projects/     and  /es/projects/
    projects/[slug].astro  →  /projects/x/   and  /es/projects/x/
    writing/index.astro    →  /writing/      and  /es/writing/
    writing/[slug].astro   →  /writing/x/    and  /es/writing/x/
  404.astro
```

`getStaticPaths` emits `{ locale: undefined }` for English (no prefix) and
`{ locale: 'es' }` for Spanish, passing the resolved `locale` through as a prop.

The audit measured the previous physical `src/pages/es/` tree at **86% duplicated
lines**, with real drift already present between the two copies. The catch-all
makes that class of bug structurally impossible rather than merely fixed.

### Navigation

`src/config/navigation.ts` is the single source of navigation structure — data
only, no logic and no URL construction; consumers resolve the href through
`localizePath` and the label through `t.nav[item.labelKey]`. `PRIMARY_NAV` is
Projects → Writing → About → Contact, which is the order of evidence: what was
built, then what was taught and organised, then who did it.

Writing is a **page**, not a homepage band, so it appears in `PRIMARY_NAV` and
deliberately **not** in `SECTION_IDS`. That array numbers the homepage's figure
annotations (`00`…`04`) and doubles as the union `UIStrings['sections']` is keyed
by; a sixth entry there would renumber every existing annotation for a band that
does not exist on that page.

---

## 3. Internationalisation

Astro's built-in `i18n` config block is **deliberately not used**. The audit found
it declared but consumed by nothing — no `astro:i18n` import, no
`Astro.currentLocale` — while looking authoritative. Rather than adopt a second
routing authority, locale handling is one small, fully tested module.

- `src/i18n/types.ts` — `Locale`, `UIStrings` (the shape both dictionaries must satisfy)
- `src/i18n/en.ts`, `src/i18n/es.ts` — the dictionaries; the type checker enforces parity
- `src/i18n/routing.ts` — every URL helper: `localizePath`, `absoluteURL`, `alternates`
- `src/i18n/index.ts` — public surface

Rules:

1. Components never fetch translations. They receive `t` and `locale` as props.
   This discipline already existed and is preserved.
2. **Every** user-facing string lives in `UIStrings`, including `aria-label`s,
   `alt` text, empty states and page metadata. The audit found 14 strings bypassing
   the dictionaries, concentrated exactly where translation review never looks.
3. URL construction goes through `src/i18n/routing.ts`. Nothing else concatenates
   `base`, a locale prefix and a path.

---

## 4. Content architecture

Projects are the product; writing is the evidence of the work around them. The
model is designed so that **adding or editing normal content touches no
application code at all**.

```
src/content/projects/
  <slug>/
    project.json      shared, locale-independent metadata
    en.md             English title, summary and case-study body
    es.md             Spanish title, summary and case-study body
    media/            optional images referenced from project.json

src/content/writing/
  <slug>/
    article.json      shared, locale-independent metadata
    en.md             English title, summary and body
    es.md             Spanish title, summary and body
    media/            optional cover and figures
```

**Four collections, two pairs.** Each pair splits shared metadata from what is
genuinely translated, and each is joined in exactly one place:

| Collection       | Over             | Schema                          | Owns                                                |
| ---------------- | ---------------- | ------------------------------- | --------------------------------------------------- |
| `projects`       | `*/project.json` | `src/content/schema.ts`         | Status, domains, stack, links, ordering, media      |
| `projectContent` | `*/{en,es}.md`   | `src/content/schema.ts`         | `title`, `summary`, the case-study body             |
| `writing`        | `*/article.json` | `src/content/writing-schema.ts` | Date, kind, domains, links, cover, related projects |
| `writingContent` | `*/{en,es}.md`   | `src/content/writing-schema.ts` | `title`, `summary`, the body                        |

Shared metadata is therefore stored exactly once per entry — a project's tags
cannot drift between EN and ES, and an article's date cannot say November in
English and October in Spanish. The joins, the visibility rules and every query
live in `src/lib/projects/` and `src/lib/writing/`, which are plain TypeScript
and directly unit-tested — not `.astro` files, where the audit found logic that
had already diverged between routes. `src/lib/content/id.ts` holds the id
helpers both pairs use, because `<slug>/<locale>.md` is one id format, not two.

**Why writing is a second schema and not a wider first one.** A project has a
repository, a stack and evidence; an article has a date, a body and a
photograph. `PROJECT_CONTENT_CONTRACT.md` §12 says that content which seems to
need the project schema widened is not a project — the writing collection is
that answer taken rather than avoided. What the two schemas share they share by
**import**: the slug pattern, the `https://` URL rule, the domain id guard and
the media path pattern all come from `src/content/schema.ts`, because a second
copy of any of them would be a second chance to weaken one.

**One visibility predicate per collection.** `isVisible()` in
`src/lib/projects/visibility.ts` and `isVisible()` in
`src/lib/writing/visibility.ts` are the only definitions of what is public in
their collections. Listings, detail pages, the featured set, article pagination,
both locales and the sitemap all call them. The audit found the projects listing
and detail routes disagreeing (`status === 'published'` versus
`status !== 'draft'`), which would have published unlisted `wip` pages; both
predicates are now written as the same inequality, so a status added later is
public by default and has to argue for hiding itself.

The statuses themselves differ, and that is the point of two predicates rather
than one shared one: a project can honestly be `wip`, an article cannot — it is
either finished and readable or it is a `draft`.

Neither schema imports `astro:content`, so tests, and for projects the
`project:validate` script, exercise the **production** schemas rather than a copy
of them. The audit found the previous test mirroring the schema into its own
file, with fixtures that had already drifted from the real markdown.

Writing has no equivalent of `project:new` or `project:validate`. Its guarantees
come from the schema at build time, from the two build-time checks in
`src/lib/writing/index.ts` (slug agrees with directory name, `relatedProjects`
resolves) and from `tests/writing.schema.test.ts`, which sweeps the real
directories.

See `docs/PROJECT_CONTENT_CONTRACT.md` for the field-by-field contract of both.

---

## 5. Visual island strategy

The homepage is static HTML with three progressive enhancements. In load order:

| Surface           | Technology                            | Hydration               | Cost                     |
| ----------------- | ------------------------------------- | ----------------------- | ------------------------ |
| Hero signal field | Framework-free canvas module          | `<script>`, after paint | ~1.5 KB, no React        |
| Layers sequence   | CSS + `IntersectionObserver`          | inline script           | negligible               |
| Technical Worlds  | **React island** + GSAP ScrollTrigger | `client:visible`        | React + GSAP, below fold |

**React never touches the critical rendering path.** The Hero visual is
deliberately _not_ a React component: it is a plain TypeScript canvas module, so
the above-the-fold experience costs zero framework runtime. React is introduced
only where it earns its weight — the Technical Worlds stage is genuinely
stateful (active domain, keyboard traverse, live region, mobile and
reduced-motion variants) and would otherwise be imperative DOM code that a future
agent has to reverse-engineer.

**At most one expensive visual is active at a time.** Every stage pauses when
offscreen. The Hero field stops when Technical Worlds enters the viewport.

State ownership: each island owns its own state. There is no global store, no
cross-island event bus, and no shared client context. If that stops being true,
the framework decision in §1 needs revisiting.

---

## 6. Design tokens

One authoritative token system, defined in `src/styles/tokens.css` using
Tailwind 4's `@theme`. This is the reason for the Tailwind 3 → 4 migration:
`@theme` emits CSS custom properties **and** Tailwind utilities from the same
declaration, so a colour cannot be defined twice. The audit found every hex in
`tailwind.config.ts` restated in `global.css`, with two names for one value and
a hardcoded `#0a0a0f` four lines below the token holding it.

No file other than `tokens.css` may contain a raw colour value.

---

## 7. Dependency roles

Each dependency owns exactly one responsibility. Nothing overlaps.

| Dependency                                                  | Owns                                                      |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| `astro`                                                     | Routing, static generation, content layer, image pipeline |
| `@astrojs/react`, `react(-dom)`                             | The Technical Worlds island only                          |
| `@astrojs/sitemap`                                          | Sitemap with hreflang annotations                         |
| `tailwindcss`, `@tailwindcss/vite`                          | Design tokens and utility styling                         |
| `gsap`                                                      | The single pinned scroll sequence. Nothing else.          |
| `@fontsource-variable/archivo`, `@fontsource/ibm-plex-mono` | Self-hosted fonts                                         |

**Deliberately not installed**

- **Motion / Framer Motion** — GSAP already owns scroll choreography, and every
  remaining interaction is a CSS transition. Two animation libraries for one job
  is the overlap the brief's dependency policy (§37) forbids.
- **Three.js / any WebGL** — no visual in this design needs a GPU. Canvas 2D,
  SVG and DOM cover the entire visual system at a fraction of the cost.
- **React Bits as a package** — its primitives are adapted into
  `src/components/visuals/` and owned outright, so the site ships the two effects
  it uses rather than a library it mostly does not.
- **`eslint-plugin-jsx-a11y`** — its latest release (6.10.2) declares support only
  up to ESLint 9, which transitively caps `eslint-plugin-astro` at a version that
  cannot resolve against ESLint 10. `eslint-plugin-astro` is pinned to `^1.7.0`,
  the newest line with a satisfiable peer graph. Revisit when jsx-a11y ships
  ESLint 10 support.

---

## 8. Repository shape

```
src/
  components/
    ui/            primitives: Section, Container, Prose, Tag, ActionLink, SkipLink
    navigation/    Navbar, MobileMenu, LanguageSwitcher, Footer
    home/          Hero, LayersSequence, TechnicalWorlds, SelectedProjects
    projects/      ProjectCard, ProjectGrid, ProjectMeta
    writing/       WritingTimeline, ArticleDate, ArticleNeighbours
    visuals/
      hero/        signal-field canvas module (framework-free)
      worlds/      the React island and its five domain stages
  config/          site.ts, navigation.ts, domains.ts — no logic, only values
  content/         schema.ts, writing-schema.ts, projects/<slug>/, writing/<slug>/
  content.config.ts  the four collection definitions and their loaders
  i18n/            types.ts, en.ts, es.ts, routing.ts, index.ts
  layouts/         BaseLayout.astro, PageLayout.astro
  lib/
    content/       id helpers shared by both content pairs
    projects/      query, join, visibility — plain TS, unit tested
    writing/       query, join, visibility — plain TS, unit tested
  pages/           [...locale]/ catch-all + 404
  styles/          tokens.css, global.css
docs/              ARCHITECTURE, PROJECT_CONTENT_CONTRACT, MOTION_SYSTEM
scripts/           project-new.mjs, project-validate.mjs
tests/             mirrors src/lib and src/i18n
```

`src/content.config.ts` sits at the `src/` root, not inside `src/content/`:
Astro 5+ looks for it there, and the old `src/content/config.ts` location is
deprecated.

`BaseLayout` lives in `src/layouts/`, not `src/components/` — the audit flagged
it as a layout filed as a component.

Component naming: no `Section` suffix. The audit found
`AboutSection`/`ContactSection` alongside `Hero`/`TechnicalAreas`; the convention
is now the plain noun.

---

## 9. Quality gates

`npm run verify` runs the full gate locally, in the same order as CI:

```
astro sync → format:check → lint → type-check → build → test
```

Two orderings in that chain are load-bearing rather than arbitrary. `astro sync`
runs first because `.astro/types.d.ts` does not exist on a fresh checkout, and
both `lint` and `type-check` resolve `astro:content` through it — CI hit this
before the step was added. The build runs _before_ the tests because
`tests/global-setup.ts` reads `dist/`: the anchor and link suites assert against
built HTML, not against source.

All of them run in CI on every push and pull request, with `test:coverage` in
place of `test` so the thresholds actually gate. The audit found `lint`
advertised in the README as an active gate while failing with 26 errors and
never running in CI. The gate now genuinely gates.

Lint configuration notes:

- `projectService: true` is unsupported by `astro-eslint-parser` and silently
  degrades, resolving `Astro.props` as `error` — which produced 18 of the 26
  failures. `.astro` files therefore get an explicit `parserOptions.project`,
  while `.ts`/`.tsx` keep `projectService`.
- The `--ext` flag is a no-op under flat config and is removed; file selection
  comes from `files` globs.
- `coverage/`, `dist/`, `.astro/` are ignored by both ESLint and Prettier.

---

## 10. Content Security Policy — and the rule it imposes on every component

`security.csp` is enabled in `astro.config.mjs`. GitHub Pages cannot set
response headers, so the policy travels in a `<meta http-equiv>` tag that Astro
generates at build time, hashing each inline block. The result is a real
hash-based `script-src`/`style-src` with **no `unsafe-inline`**.

Verified in build output: 4 inline scripts on the homepage, 4 matching hashes,
`unsafe-inline` absent, all 7 self-hosted font files resolving same-origin.

### The rule: never write an inline `style` attribute

> **`style="..."` on an element does not work in production.**

Astro emits `style-src 'self' <hashes>` and does **not** emit `style-src-attr`
or `'unsafe-hashes'`. Per the CSP spec `style-src-attr` falls back to
`style-src`, and a hash authorises a `<style>` **element** — never a `style`
**attribute**. So the browser drops every inline style attribute on the page.

This failure mode is genuinely nasty and worth understanding rather than just
obeying:

- it **works in `astro dev`** and fails only in the production build;
- there is no build warning and no obvious console error;
- the element simply renders unstyled, so it looks like a CSS bug.

It was found by measuring the built HTML, not by review. Three separate
components had shipped inline custom properties (`--domain-accent`, `--vt-title`)
that would have silently stopped applying on the live site.

**Do not fix a CSP violation by loosening the policy.** Adding `'unsafe-hashes'`
or `style-src-attr 'unsafe-inline'` re-opens exactly the hole the policy exists
to close.

**Write it in CSS instead.** Proven alternatives already used in this repo:

| Instead of                        | Use                                                   |
| --------------------------------- | ----------------------------------------------------- |
| `style="--domain-accent: …"`      | a `[data-domain="ai"]` rule in the component's styles |
| `style="--delay: …"` for staggers | `:nth-child()`                                        |
| computed SVG dash geometry        | `pathLength="100"` + presentation attributes          |
| a per-instance unique ident       | a scoped `<style>` **element** (hashed, so allowed)   |

SVG **presentation attributes** (`fill`, `stroke`, `d`, `pathLength`) are not
styles and are unaffected. So is GSAP writing through the CSSOM at runtime —
CSP governs markup, not scripted style mutation.

Components that render domain accents or view-transition names carry a test
that fails if an inline `style=` attribute reappears. Keep those tests.

---

## 11. Deployment

GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`).

- `ci` runs all five gates. `build` runs after it. `deploy` runs only on `main`.
- Permissions are `contents: read` at workflow level; `pages: write` and
  `id-token: write` are granted **only** on the `deploy` job. The audit found PR
  jobs inheriting deploy credentials while running untrusted lifecycle scripts.
- Concurrency is keyed per ref so pull requests no longer serialise behind
  deploys; only `deploy` uses the shared `pages` group.
- Node is pinned via `.nvmrc`, read by both the workflow and local tooling.
