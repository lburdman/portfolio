# Lucas Burdman — Portfolio

Bilingual (EN/ES) portfolio for an electronic engineer working across machine
learning, applied AI, quantum computing, FPGA/digital design and audio.

Live at **https://lburdman.github.io/portfolio/**

---

## Stack

Astro 7 (static output) · React 19 islands · Tailwind CSS 4 (CSS-first) ·
TypeScript 6 · Vitest 4 · GitHub Pages.

Pages ship as static HTML with no framework runtime; React is loaded only by the
handful of components that genuinely need it. The reasoning behind each of those
choices — and what they cost — is in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.
Motion rules and budgets are in **[docs/MOTION_SYSTEM.md](docs/MOTION_SYSTEM.md)**.

---

## Running it

Node **22.23.2** — `.nvmrc` pins it, `nvm use` picks it up, and CI reads the same
file. `package.json` declares a floor of `>=22.12.0`, but the content scripts
import the production Zod schema from `src/content/schema.ts` directly, which
needs Node's unflagged TypeScript type stripping (22.18+). Below that,
`scripts/schema-bridge.mjs` re-execs the process with
`--experimental-strip-types` and everything still works, just slower.

```bash
npm install
npm run dev        # http://localhost:4321/portfolio/
npm run build      # → ./dist
npm run preview    # serve the production build
```

---

## Quality gates

```bash
npm run verify
```

runs, in order and stopping at the first failure:

| Step           | Command                       | Checks                                        |
| -------------- | ----------------------------- | --------------------------------------------- |
| `format:check` | `prettier --check .`          | formatting                                    |
| `lint`         | `eslint .`                    | ESLint 10, type-aware, `--max-warnings 0`     |
| `type-check`   | `astro check && tsc --noEmit` | `.astro` templates and all TypeScript         |
| `test`         | `vitest run`                  | unit tests over `src/lib`, `src/i18n`, schema |
| `build`        | `astro build`                 | the real production build                     |

CI runs the same five, in the same order, on every push and pull request
(`.github/workflows/deploy.yml`). `build` is gated on the gates; `deploy` runs
only on `main`.

`npm run test:coverage` reports coverage and enforces the thresholds in
`vitest.config.ts`.

**Never make a failing gate pass by suppressing it** — no `eslint-disable`, no
rule downgraded to `warn`, no `any`, no deleted assertion. See `CLAUDE.md`.

---

## Adding or editing a project

Adding a normal project **touches no application code**:

```bash
npm run project:new -- my-project   # scaffolds src/content/projects/my-project/
npm run project:validate            # validates real content against the real schema
```

The field-by-field contract — required frontmatter, statuses, domains, media,
which fields are localized and which are not — is
**[docs/PROJECT_CONTENT_CONTRACT.md](docs/PROJECT_CONTENT_CONTRACT.md)**.

---

## Where things live

| Change this                                 | Edit only                           |
| ------------------------------------------- | ----------------------------------- |
| Social links, email, name, résumé           | `src/config/site.ts`                |
| Colours, spacing, type scale                | `src/styles/tokens.css`             |
| Any user-facing string (incl. `aria-label`) | `src/i18n/en.ts` + `src/i18n/es.ts` |
| Navigation entries                          | `src/config/navigation.ts`          |
| URL construction                            | `src/i18n/routing.ts`               |

Each of these is the _only_ place its value may appear. If a value shows up
twice, one of the two is a bug.

The full repository layout is in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §8.

---

## Documents

| File                               | What it is                                           |
| ---------------------------------- | ---------------------------------------------------- |
| `PORTFOLIO_BRIEF.md`               | product, design and experience target                |
| `docs/ARCHITECTURE.md`             | framework, routing, i18n, content model, deployment  |
| `docs/PROJECT_CONTENT_CONTRACT.md` | how to add and edit projects                         |
| `docs/MOTION_SYSTEM.md`            | motion principles, budgets, reduced-motion fallbacks |
| `AUDIT.md`                         | the verified defect baseline this redesign resolves  |
| `CLAUDE.md`                        | operational rules for coding agents                  |
