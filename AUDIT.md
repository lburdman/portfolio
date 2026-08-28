# Portfolio Audit

**Date:** 2026-08-26
**Commit:** `7db8f3e`
**Scope:** full repository (60 files, Astro 4.16 static site, bilingual EN/ES, deployed to GitHub Pages)
**Method:** five parallel specialized audits — security & supply chain, architecture & i18n, testing & CI, accessibility/SEO/performance, code quality & tooling. Every finding below was verified by reading source, running the real command, or inspecting a real `npm run build` output. Nothing here is inferred.

---

## Executive summary

The foundation is genuinely good. Type-checking is clean (`astro check`: 33 files, 0 errors), formatting is clean, the component boundary discipline is real (every component takes `t`/`locale`/`base` as props and fetches nothing), the i18n dictionaries are at perfect 83/83 key parity enforced by the type system, and deploy gating is correctly ordered. There is no XSS vector, no committed secret, and almost no client JS (~1 KB total).

The problems are concentrated in three places:

1. **A quality gate that exists but never runs.** `npm run lint` fails with 26 errors and is not in CI. The green badge is measuring three of four gates.
2. **Bilingual plumbing that is broken in production right now.** `hreflang` alternates are emitted as relative URLs (ignored by search engines), the Spanish homepage's primary CTAs link to English pages, and no sitemap is generated despite the integration being installed.
3. **Tests that test copies of the code instead of the code.** The content schema is mirrored into its own test file, and its fixtures have already drifted from the real markdown.

Underneath all three is one pattern worth naming: the last few commits made errors _disappear_ rather than _resolve_ — a `as { project: ... }` cast, a deleted destructure, a narrowed `types` array. Each one worked. None of them fixed anything.

**Counts:** 12 HIGH · 17 MEDIUM · 22 LOW.

---

## Priority 1 — Fix this week

### 1.1 `npm run lint` fails with 26 errors and is not wired into CI

`package.json:15` · `.github/workflows/deploy.yml:37-46`

CI runs `format:check`, `type-check`, `test`, `build`. It has **never** run `lint` — confirmed in the workflow's introducing commit. Meanwhile `README.md:293-296` advertises "ESLint (strict, zero warnings)" as an active gate.

Verified locally: `✖ 26 problems (26 errors, 0 warnings)` — 18 × `no-unsafe-return`, 6 × parsing errors, 3 × `no-unused-vars`, 1 × `triple-slash-reference`, 1 × `no-unnecessary-type-assertion`.

Two config defects cause most of them:

- **`projectService: true` is unsupported by `astro-eslint-parser`** (`eslint.config.mjs:12`). It emits 23 warnings and silently degrades to `project: true`, so `Astro.props` and collection types resolve as `error` — which is what produces all 18 `no-unsafe-return` errors. `.astro` files are being linted, but their type-aware rules are broken.
- **`--ext .ts,.tsx,.astro` is a no-op under ESLint 10 flat config** (`package.json:15-16`). File selection comes from `files` globs, so ESLint is also parsing `astro.config.mjs`, `vitest.config.ts`, and generated `coverage/*.js` — 6 of the 26 errors are pure config noise.

**Fix, in order:** split the ESLint config so `**/*.ts` keeps `projectService: true` and `**/*.astro` gets `parserOptions: { project: './tsconfig.json' }` → drop `--ext` and add `coverage/`, `.atl/` to `ignores` → add `astro.config.mjs`/`vitest.config.ts` to `tsconfig.json` `include` → add a `Lint` step to the `ci` job. Fixing the parser first makes most of the 26 evaporate.

### 1.2 `hreflang` alternates are relative — the EN↔ES pairing does not exist

`src/components/BaseLayout.astro:38,40` ← `src/i18n/index.ts:26-42`

From the real build output (`dist/about/index.html`):

```html
<link rel="canonical" href="https://lburdman.github.io/portfolio/about/" />
<link rel="alternate" hreflang="es" href="/portfolio/es/about" />
<!-- relative -->
<link rel="alternate" hreflang="x-default" href="/portfolio/" />
<!-- relative -->
```

Google requires fully-qualified absolute URLs in `hreflang`; relative values are discarded outright. The self-referencing `en` alternate works only by accident, because it reuses the already-absolute `canonicalURL`. Net effect: the two locales compete as near-duplicate content instead of being served by language.

There is a second defect layered on top — the alternates emit `/portfolio/es/about` (no trailing slash) while that page's own canonical is `.../es/about/` (with slash). Even after the URLs are made absolute, a mismatched canonical makes the pair unconfirmed and dropped.

**Fix:** `getAlternateURL` returns `new URL(path, Astro.site).href`, and generate canonical + alternates from one helper so the trailing slash cannot diverge.

### 1.3 Spanish homepage CTAs send users to English pages

`src/components/Hero.astro:50,67`

```astro
<a href={`${base}/projects`} class="btn-primary" id="hero-cta-projects">
  <a href={`${base}/notes`} class="btn-ghost" id="hero-cta-notes"></a></a
>
```

`Hero` receives `{ t, base }` but no `locale`, so it cannot localize. Confirmed in `dist/es/index.html`: both render as `/portfolio/projects` and `/portfolio/notes`. The primary conversion path on the Spanish homepage drops the visitor out of Spanish.

`Navbar.astro` and `Footer.astro` both call `localizeURL` correctly — Hero is the only offender.

**Fix:** add `locale: Locale` to `Hero`'s `Props`, pass it from both index pages, use `localizeURL('/projects', locale, base)`.

### 1.4 No `og:image` on any page

`src/components/BaseLayout.astro:13,16,48,54`

`ogImage` is an optional prop passed by **zero** pages. `dist/index.html` contains 0 occurrences of `og:image`. Worse, `BaseLayout.astro:51` unconditionally declares `twitter:card = summary_large_image` — a card type that promises a large image that does not exist.

Every share of this portfolio on LinkedIn, Slack, or WhatsApp currently renders as a bare text link. For a portfolio whose purpose is being sent to recruiters, this is the highest-leverage single fix in the document.

**Fix:** add a 1200×630 `public/og-default.png`, default the prop to it, make the URL absolute via `new URL(ogImage, Astro.site).href`, add `og:image:width`/`height`/`alt`.

### 1.5 Résumé links 404 in production

`src/components/Hero.astro:74` · `src/components/ContactSection.astro:40`

Both point at `${base}/assets/resume.pdf`. `public/assets/` contains only `.gitkeep`; `dist/assets/` after a full build contains only `.gitkeep`. Two prominent CTAs are dead links today.

**Fix:** ship the PDF, or gate both links behind a config flag until it exists.

### 1.6 `vitest.config.ts` hardcodes an absolute machine path

`vitest.config.ts:14-16`

```ts
alias: { '@': '/Users/marioburdman/Documents/portfolio/src' }
```

Resolves on exactly one machine. It is inert today only because all three test files import via relative `../src/...` — so the alias is simultaneously **broken and dead**. The first test that follows the codebase's own convention (67 `@/` imports in `src/`) breaks CI.

**Fix:** `'@': fileURLToPath(new URL('./src', import.meta.url))`, then migrate test imports to `@/`.

### 1.7 `@astrojs/sitemap` is installed but never registered

`package.json:22` · `astro.config.mjs:8-14`

The dependency is declared, `site` is set (its one prerequisite), and `integrations` lists only `tailwind()`. `fd 'sitemap' dist` after a full build returns nothing. A 17-page bilingual site ships with no sitemap — and forfeits the `xhtml:link` hreflang annotations that would give the locale pairing a second independent signal.

**Fix:** one line — `sitemap({ i18n: { defaultLocale: 'en', locales: { en: 'en', es: 'es' } } })`.

---

## Priority 2 — Correctness and accessibility

### 2.1 Listing and detail routes disagree on which projects are visible

`src/pages/projects/index.astro:12` vs `src/pages/projects/[slug].astro:8` (mirrored in both ES routes)

```ts
.filter((p) => p.data.status === 'published')  // listing
getCollection('projects', (p) => p.data.status !== 'draft')  // detail
```

The schema permits three states (`src/content/config.ts:16`: `published | draft | wip`). A `wip` project gets a fully built, publicly reachable, sitemap-eligible detail page that appears in no listing. Not triggered today — all 8 files are `published` — which is exactly why it will slip through when the first WIP project lands.

**Fix:** export one `isVisible` predicate from `src/content/` and use it in all four routes. That also creates a testable seam where none exists.

### 2.2 `/about` and `/es/about` have no `<h1>`

`src/pages/about.astro:17-21` · `src/pages/es/about.astro:17-21`

Both render `AboutSection` → `LeadershipSection` → `ContactSection`, all of which start at `<h2>`. Confirmed in `dist/about/index.html`: zero `<h1>`, first heading is `<h2 id="about-heading">`. WCAG 2.4.6 / 1.3.1 — the page's primary topic is missing from the accessibility tree and from search snippets.

Related, LOW: the Projects index skips `<h1>` → `<h3>` (`projects/index.astro:28` → `ProjectCard.astro:20`), confirmed in the build output.

### 2.3 The Hero's `<h1>` is `opacity: 0` unless an animation runs

`src/styles/global.css:301-304`, applied at `Hero.astro:32-33,39,44,49`

```css
.animate-in {
  animation: fadeUp 0.6s ease-out both;
  opacity: 0;
}
```

`opacity: 0` is the _resting_ state — visibility depends entirely on the animation's fill mode. If animation is ever suppressed (browser setting, extension, or a naively-written reduced-motion override), the entire above-the-fold content stays permanently invisible. It also guarantees an empty LCP element for the first 600 ms.

**Fix:** move the hidden state into the keyframe (`@keyframes fadeUp { from { opacity: 0 } }`) and delete the standalone declaration, so absent animation degrades to _visible_.

### 2.4 No `prefers-reduced-motion` handling anywhere

`src/styles/global.css:31,92,210,232,254,301-322` · `tailwind.config.ts:41-53`

Zero matches repo-wide. Users get unrequested `scroll-behavior: smooth` on every in-page anchor plus translate-based entrance animations. **Note the ordering dependency:** any reduced-motion block must include `.animate-in { opacity: 1 !important }` or it will trigger 2.3 for exactly the users it is meant to help.

### 2.5 `text-muted` fails WCAG AA and is used for real links

`src/styles/global.css:15` (`--color-text-muted: #55556a`)

Measured contrast:

| Against                               | Ratio    | AA 4.5:1 |
| ------------------------------------- | -------- | -------- |
| `--color-bg` `#0a0a0f`                | **2.72** | fail     |
| `--color-surface` `#12121a`           | **2.57** | fail     |
| `--color-surface-highlight` `#252535` | **2.07** | fail     |

Applied to non-decorative text at `Footer.astro:22,49,56,63,70,126,131` (tagline + all four nav links + copyright), `ContactSection.astro:80`, `AboutSection.astro:27`, `projects/[slug].astro:31,169`, `global.css:181`. Five navigational links sit below half the required ratio.

**Fix:** raise to ≈`#7a7a92` (≈4.6:1), or switch every link/label above to `text-secondary` (`#8888a0`, measured 5.71:1 — passes).

Separately, `--color-border: #1e1e2e` measures **1.14:1** against surface. It is the sole visual boundary of `.card`, `.btn-ghost`, and the sticky header — WCAG 1.4.11 requires 3:1 for UI component boundaries. `.btn-ghost` is a button whose only affordance is a border nobody can see.

### 2.6 Skip-link target exists, skip link does not

`src/components/BaseLayout.astro:70`

`<main id="main-content" tabindex="-1">` was written as a skip destination, but no `<a href="#main-content">` exists anywhere. Keyboard users tab through the logo, 4 nav links, the switcher, and the menu button on every page before reaching content (WCAG 2.4.1).

### 2.7 Mobile menu: no Escape, no focus management, static icon

`src/components/Navbar.astro:68-96,126-133`

The control is correctly a `<button>` with `aria-expanded` and `aria-controls` — that part is right. But the script only toggles `hidden`. No Escape handler, focus never moves into the menu, it never closes on outside click or navigation, and the hamburger never becomes an X. A keyboard user who opens it has no way to dismiss it (WCAG 2.1.2).

### 2.8 Fourteen user-facing strings bypass the i18n layer

Concentrated exactly where a translation review never looks — a11y labels and empty states:

| Location                        | String                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `Navbar.astro:26,31,74,100`     | `Primary navigation`, `Lucas Burdman — Home`, `Toggle menu`, `Mobile navigation` |
| `Footer.astro:37,110`           | `Footer navigation`, `All rights reserved.`                                      |
| `ProjectCard.astro:29,44,60`    | `Technologies`, `${title} on GitHub`, `Live demo for ${title}`                   |
| `Hero.astro:12,27`              | `Hero`, `Electronic Engineer · ML · Applied AI`                                  |
| `AboutSection.astro:58,65`      | `Photo coming soon`, `['Electronic Engineer','FIUBA','Buenos Aires']`            |
| `LeadershipSection.astro:14`    | `500+ attendees`                                                                 |
| `FeaturedProjects.astro:45`     | `No featured projects available.`                                                |
| `ContactSection.astro:14,22,30` | `GitHub`, `LinkedIn`, `Email` (should be `Correo`)                               |
| `LanguageSwitcher.astro:19`     | `Switch language to ${t.lang.switchTo}` — translated value, untranslated frame   |
| `projects/[slug].astro:107`     | `Project details`                                                                |

Because `<html lang="es">` tells the screen reader to apply Spanish phonemes, these are read aloud as gibberish. That `es/projects/index.astro:34` _did_ localize its `aria-label` proves the inconsistency is unintentional.

Page `title`/`description` have the same problem (`index.astro:20-21` and five siblings) — hardcoded per file, outside the parity test that the whole i18n design exists to provide.

**Fix:** add `a11y` and `seo` groups to `UIStrings`; the type checker then forces both locales to supply them.

---

## Priority 3 — Tests that do not test

Real results: **50 tests pass in 956 ms**, `type-check` exits 0, coverage is **13.54% statements / 29.26% branches**.

The valuable third is real: `tests/projects.render.test.ts:4-86` exercises `useTranslations`, `localizeURL`, and `getAlternateURL` through their public contract with a bidirectional EN↔ES round trip, which is why `src/i18n/index.ts` sits at 100% statements. The recursive key-parity walk (`i18n.test.ts:91-118`) would genuinely catch a missing translation.

Against that:

### 3.1 The schema test validates a copy of the schema

`tests/content.schema.test.ts:4-20` re-declares `projectSchema` verbatim, under a comment that admits it: _"Mirror the project schema from content/config.ts"_. `src/content/config.ts` has **0% coverage** — the production schema never executes. Change it and all 17 tests stay green.

The fixtures have already drifted: `:143` lists 5 tags for `quantum-audio` where the real file has 6 (`CREMA-D` missing), and every fixture `summary` differs from the real frontmatter. So the tests validate a stale copy of content that no longer exists.

**Fix:** extract the bare Zod object to `src/content/schemas.ts` (no `astro:content` import — that is the real reason for the mirror), have `config.ts` wrap it, import the real object in the test, and parse the real markdown frontmatter.

### 3.2 Three test blocks cannot fail

- `content.schema.test.ts:163,176,182` assert properties of literals declared five lines above. `:182` sorts a fixture's own `order: 1,2,3,4` and checks it is 1,2,3,4.
- `projects.render.test.ts:88-124` is named "rendering" and renders nothing — zero of `ProjectCard.astro`'s 79 lines execute. `:119` is titled _"would show GitHub link when present"_; the word _would_ is the tell.
- `i18n.test.ts:120-129` writes `const check: UIStrings = en` then asserts `toBeDefined()` — a compile-time check restated as a runtime test that always passes.

### 3.3 The highest-risk behavior is untested

No `.astro` file has a single line covered. That is _partly_ defensible — Astro has no first-party component runner, and `experimental_AstroContainer` is the only option. What is not defensible is that the untested surface holds logic that has **already diverged**: the `status` predicates (2.1), the `[...new Set()]` tag aggregation, and the client filter script. Those belong in plain `.ts` helpers where the existing Vitest setup covers them for free.

The real safety net is `npm run build` — but it runs in a separate job _after_ the gates, so it protects deploys without ever blocking a bad merge earlier.

### 3.4 CI serializes every PR behind deploys

`.github/workflows/deploy.yml:16-18` sets a workflow-level `concurrency: { group: 'pages', cancel-in-progress: false }`, which applies to `pull_request` too. Push three times to a PR and all three full cycles run to completion in series.

**Fix:** `group: ${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress` on PRs, and a job-level `concurrency: pages` on `deploy` only.

### 3.5 No coverage gate, and the number is inflated

`vitest.config.ts:8-11` sets reporters but no `thresholds` and no `exclude`, so `astro.config.mjs` and `tailwind.config.ts` count as 0%-covered source. `test:coverage` runs in no CI job.

---

## Priority 4 — Security & supply chain

No live vulnerability. The static output, absence of forms, and lack of any server runtime structurally eliminate most of the attack surface. Both `set:html` sites (`TechnicalAreas.astro:58`, `ContactSection.astro:67`) render static SVG literals from the same file — correctly safe. All three inline scripts write only to `classList` and `style.display`. All 9 `target="_blank"` links carry `rel="noopener noreferrer"`. No secrets in source or in the 16-commit history. `pull_request_target` is correctly not used.

Real advisory counts (`node_modules` present, 682 deps):

| Severity | Prod only | Full tree |
| -------- | --------- | --------- |
| Critical | 0         | 2         |
| High     | 7         | 9         |
| Moderate | 1         | 7         |
| Low      | 1         | 1         |

**HIGH — `astro@4.16.19` carries 15 advisories.** Nearly all require SSR, middleware, server islands, or an adapter, none of which this repo uses (verified: no `define:vars`, no spread props, no named slots, no `Astro.request`). The one that genuinely applies is **GHSA-x3h8-62x9-952g, arbitrary local file read in the dev server** — exploitable against a developer running `npm run dev` who visits a malicious page. `npm audit fix` (non-forced) clears `@babel/core`, `devalue`, `js-yaml`, `nanoid`, and `postcss` today with no breaking change; the Astro major is a separate migration.

**MEDIUM — both criticals are `vitest`/`@vitest/coverage-v8`**, requiring `--ui`, which no script passes. Real advisory, not reachable as configured.

**MEDIUM — CI grants deploy permissions to PR jobs.** `deploy.yml:12-15` sets `pages: write` and `id-token: write` at workflow level, so `ci` and `build` inherit them while running untrusted PR code via `npm ci` lifecycle scripts. Fork PRs are protected by GitHub's read-only default, so this is a same-repo-branch and dependency-compromise vector. Fix: top-level `contents: read`, grant the rest on `deploy` only.

**MEDIUM — no CSP.** GitHub Pages cannot set headers, so a `<meta http-equiv>` in `BaseLayout.astro` is the available option (`frame-ancestors` will not apply in meta form).

**LOW — `z.string().url()` accepts `javascript:` and `data:`.** Verified against the installed zod. `github`/`demo` flow straight into `href` at `[slug].astro:94,117`. Latent only — the sole content authors have commit access — but it becomes real the day content arrives from a PR or a CMS. Fix: `.refine((u) => u.startsWith('https://'))`.

**LOW — Actions pinned to mutable tags** (`@v4`, `@v3`) rather than commit SHAs.

---

## Priority 5 — Structure and hygiene

### 5.1 86% of the EN/ES page pairs is copy-paste, and it has already drifted

| Pair                    | EN lines | Differing | Identical     |
| ----------------------- | -------- | --------- | ------------- |
| `index.astro`           | 31       | 3         | 28            |
| `about.astro`           | 21       | 3         | 18            |
| `notes.astro`           | 21       | 3         | 18            |
| `projects/index.astro`  | 87       | 20        | 67            |
| `projects/[slug].astro` | 140      | 13        | 127           |
| **Total**               | **300**  | **42**    | **258 (86%)** |

For three of the five pairs the entire delta is `locale`, `title`, `description`. And the drift is not hypothetical: `projects/index.astro:36` carries `hover:bg-accent/20 transition-colors` on the filter buttons that `es/projects/index.astro:31` lacks — **the Spanish filter chips are visually dead on hover.** The two inline filter scripts are re-implementations of the same handler with different formatting, and the ES copy dropped every section comment.

**Fix:** extract each pair's body into one component taking `locale`, leaving three-line page shells. `projects/[slug].astro` collapses best — a `ProjectDetail.astro` removes ~250 duplicated lines and makes this class of drift structurally impossible.

### 5.2 Astro's i18n config is declared but consumed by nothing

`astro.config.mjs:13-19` declares `i18n: { defaultLocale, locales, routing }`, but `src/` contains zero imports of `astro:i18n` and zero uses of `Astro.currentLocale` or `getRelativeLocaleUrl`. Routing is entirely hand-rolled: a physical `src/pages/es/` tree plus a bespoke `localizeURL`/`getAlternateURL` pair.

The config currently buys locale validation and nothing else, while _looking_ authoritative. Given 5.1, the honest options are to adopt it properly with a `[...locale]` catch-all, or delete the block so it stops implying behavior that does not exist. The current middle state is the worst of the two.

### 5.3 `getLocaleFromURL` is broken under `base: '/portfolio'`, and its tests hide it

`src/i18n/index.ts:15-19` splits the pathname and checks the first segment — which under the deployed base is `'portfolio'`, so it returns `'en'` for every Spanish page. It is unused in `src/` today, so nothing is broken; it is a loaded gun. The tests pass only because `tests/projects.render.test.ts:31` feeds base-less URLs, while the sibling `getAlternateURL` tests correctly include `/portfolio`.

**Fix:** give it the `base` parameter its two siblings take, correct the test URLs — or delete it.

### 5.4 Dead and unused

| Item                               | Location                           | Status                                                                      |
| ---------------------------------- | ---------------------------------- | --------------------------------------------------------------------------- |
| `nav.home` key                     | `types.ts:8`, `en.ts:5`, `es.ts:5` | Zero references in `src/`                                                   |
| `Props.base` on `NotesPlaceholder` | `NotesPlaceholder.astro:6`         | Declared, never destructured, still passed by 4 callers                     |
| `LOCALES` export                   | `types.ts:2`                       | Zero references                                                             |
| `NoteFrontmatter`                  | `config.ts:43`                     | Zero references                                                             |
| `--ext` flag                       | `package.json:15,16`               | No-op under flat config                                                     |
| `@` alias                          | `vitest.config.ts:14-16`           | Dead _and_ machine-absolute                                                 |
| `globals: true`                    | `vitest.config.ts:6`               | All tests import explicitly; types not loaded                               |
| `darkMode: 'class'`                | `tailwind.config.ts:7`             | Zero `dark:` variants exist site-wide                                       |
| `animation-delay`                  | `TechnicalAreas.astro:54`          | Applied to elements with no `animation` — 6 no-op inline styles per page    |
| `favicon.ico`                      | `public/`                          | Shipped but never linked; the implicit root request 404s under `/portfolio` |
| JetBrains Mono / Fira Code         | `global.css:96-99,161-162`         | Declared, never loaded — all code blocks fall back to system mono           |
| `notes` collection                 | `config.ts:22-29,37-39`            | Schema'd, zero content, zero `getCollection('notes')` calls                 |
| `LICENSE`                          | referenced `README.md:309`         | File does not exist                                                         |

**Disproved:** `NotesPlaceholder`, `LeadershipSection`, and `TechnicalAreas` are all genuinely imported and rendered. All 12 components have importers — there are no orphaned components.

### 5.5 Config hygiene

| File                | Issue                                                                                                                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.gitignore`        | Missing `coverage/` and `.atl/` — both currently show as `??`. `.atl/skill-registry.md` is the _sole_ current `format:check` failure; committing it breaks CI at step 1.                                                                              |
| `.prettierignore`   | Does not exist. Nothing excludes `dist/`, `coverage/`, `.astro/` from `prettier --write .` — after `test:coverage`, `format:check` reports issues in 46 generated files.                                                                              |
| `tsconfig.json:4-9` | Good flags, but `noUncheckedIndexedAccess` is absent and `astro/tsconfigs/strict` does not supply it. `content.schema.test.ts:186` writes `orders[i-1]!` assuming it _is_ on — ESLint flags the `!` as unnecessary.                                   |
| `deploy.yml:26,60`  | Node pinned to floating `'24'`; `engines` says `>=20`; local is v25. No `.nvmrc`, and nothing tests the declared floor.                                                                                                                               |
| `BaseLayout.astro`  | Lives in `src/components/` but is a layout (owns `<html>`/`<head>`, wraps `<slot/>`). Convention is `src/layouts/`.                                                                                                                                   |
| Naming              | `AboutSection`/`ContactSection`/`LeadershipSection` carry the suffix; `Hero`/`TechnicalAreas`/`FeaturedProjects` do not. Pick one.                                                                                                                    |
| Palette             | Every hex in `tailwind.config.ts:12-22` is restated in `global.css:9-17` with no link, and `global.css:33,37` hardcodes `#0a0a0f` four lines below the `--color-bg` that holds it. `surface` and `surface-elevated` are the same hex under two names. |
| Social links        | `github.com/lburdman` appears in `Footer.astro:16` and `ContactSection.astro:16`; LinkedIn likewise; display forms duplicated again in both dictionaries. `README.md:274-276` documents three files to edit. Needs one `src/config/site.ts`.          |

---

## Performance

Genuinely lean and mostly correct. Total client JS is ~1 KB across three inline scripts (217 B menu toggle, 404/408 B filters), all `type="module"` and therefore deferred. No framework runtime, no hydration, no analytics, no CDN JS. Tailwind purge works — 19 KB uncompressed CSS, ~4–5 KB gzipped.

**HIGH — render-blocking Google Fonts.** `BaseLayout.astro:57-62`. The comment says `<!-- Preload Inter font -->`; there is no preload — it is a plain blocking stylesheet on a third-party origin, creating a serial dependency (CSS must parse before font files are even discovered) on the critical path. It requests five weights; `300` is used exactly once (`Hero.astro:38`). Chrome's cache partitioning means there is no longer any shared-cache upside. **Fix:** self-host Inter as woff2, `@font-face` with `font-display: swap`, preload only above-the-fold weights.

**MEDIUM — raw `<img>` instead of `astro:assets`.** `projects/[slug].astro:53`. No `width`/`height` (CLS), no AVIF/WebP, no `srcset`. Currently latent — no project sets `coverImage`, so only the placeholder branch has ever rendered. Fix before the first real image lands.

**Alt text is otherwise sound** — every decorative SVG carries `aria-hidden="true"`, verified across all 10 sites.

---

## Suggested order of work

1. ESLint parser + `--ext` + CI lint step (1.1) — unblocks everything else and stops the "make it disappear" pattern at the gate.
2. `hreflang` absolute URLs + sitemap registration + `og:image` (1.2, 1.7, 1.4) — three small changes, the largest external impact.
3. Hero locale + résumé asset (1.3, 1.5) — two broken user paths, minutes of work.
4. `vitest` alias, `isVisible` predicate, schema test importing the real schema (1.6, 2.1, 3.1).
5. A11y pass: About `<h1>`, skip link, reduced-motion (with the `.animate-in` override), contrast tokens, menu Escape handling (2.2–2.7).
6. Collapse the EN/ES page pairs and move the remaining hardcoded strings into `UIStrings` (5.1, 2.8) — after which most of this class of bug cannot recur.
7. Hygiene: `.gitignore`, `.prettierignore`, `npm audit fix`, `.nvmrc` (4, 5.5).

---

## Priority 6 — Defects found live in pass 3 (2026-08-28)

Added to the do-not-reintroduce baseline. All four had **shipped to production**.
None raised a console error, none was visible in source review, and none would
have been caught by the existing test suite. Every one was found by measuring
rendered output in a real browser against the production build.

The common thread is worth more than the individual fixes: `astro dev` serves no
CSP, and an SVG that computes to nothing still renders as valid, silent markup.
"It looks right in dev" and "the tests pass" were both true the whole time.

### 6.1 A shared dash keyframe used without `pathLength`

`.tw-route` (FPGA) animated with `tw-draw`, whose finished state is
`stroke-dasharray: 100 100` — solid only in the `pathLength="100"` space that
every _other_ user of that keyframe declares. This path declared none. Its real
length was 290 units, so it rendered 100 on / 100 off / 90 on: **a third of the
routed net was invisible at rest, and its two ends read as unconnected.**

Do not use a `pathLength`-normalised dash keyframe on an element that does not
declare `pathLength`.

### 6.2 A dashed stroke under a scaled group with `non-scaling-stroke`

`.tw-wave` (audio) sat under a group the scroll scales _and_ carried
`vector-effect: non-scaling-stroke`. Under both, the dash pattern and
`pathLength`'s normalisation are measured in different spaces, so `tw-draw`'s
finished state is not a solid stroke: **a third to a half of the waveform was
unpainted at rest.**

Isolated: `vector-effect: none` renders solid, `stroke-dasharray: none` renders
solid, both together do not. Before adding any `stroke-dasharray` animation,
check all three conditions.

### 6.3 An arrival animation replacing a resting value instead of composing with it

The Bloch sphere's entry animated `opacity: 0 → 1` on a group whose glass veil
rested at `opacity: 0.1`. The animation replaced that value rather than
multiplying it, leaving **an opaque disc over the whole sphere**. Fixed by moving
the resting value to a `fill-opacity` attribute so the two compose.

General form: a property written per frame by script must not also be set for
that element in the stylesheet, and a property animated by CSS must not be the
same one a resting value depends on. Keep them on different properties and add a
guard test.

### 6.4 A test whose scope silently widened when a section was renamed

`tests/decision-landscape.test.ts` scoped itself with
`slice(indexOf(start), indexOf(end))`. When the Bloch sphere renamed the end
marker, `indexOf` returned `-1` and `slice(start, -1)` ran to the end of the
file, so an "exactly one accent object" assertion began silently inspecting every
other stage's rules. It passed for the wrong reason.

Any `indexOf`-delimited slice in a test must assert that **both** markers were
found. This is 3.2's pattern — a test block that cannot fail — in a new costume.
