# Lucas Burdman — Portfolio

> **Building Intelligent Systems**

Personal portfolio website for [Lucas Burdman](https://lburdman.github.io/portfolio) — an Electronic Engineer working across machine learning, applied AI, data workflows, and intelligent systems.

Built with [Astro](https://astro.build), [Tailwind CSS](https://tailwindcss.com), and TypeScript. Deployed to GitHub Pages via GitHub Actions.

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- npm ≥ 9

### Install

```bash
git clone https://github.com/lburdman/portfolio.git
cd portfolio
npm install
```

### Develop

```bash
npm run dev
# → http://localhost:4321/portfolio/
```

### Build

```bash
npm run build
# Output: ./dist/
```

### Preview

```bash
npm run preview
# → http://localhost:4321/portfolio/ (production build preview)
```

---

## Scripts

| Script                  | Description                   |
| ----------------------- | ----------------------------- |
| `npm run dev`           | Start local dev server        |
| `npm run build`         | Build for production          |
| `npm run preview`       | Preview production build      |
| `npm run type-check`    | Run TypeScript type checks    |
| `npm run lint`          | ESLint (zero warnings policy) |
| `npm run lint:fix`      | ESLint with auto-fix          |
| `npm run format`        | Prettier format all files     |
| `npm run format:check`  | Prettier check (used in CI)   |
| `npm run test`          | Run Vitest test suite         |
| `npm run test:watch`    | Vitest in watch mode          |
| `npm run test:coverage` | Test coverage report          |

---

## Project Structure

```
portfolio/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI + GitHub Pages deployment
├── public/
│   ├── favicon.svg
│   └── assets/
│       ├── resume.pdf          # ← ADD: your resume here
│       └── images/             # ← ADD: project screenshots and portrait
├── src/
│   ├── components/
│   │   ├── BaseLayout.astro    # HTML shell, SEO, fonts
│   │   ├── Navbar.astro        # Navigation with mobile menu
│   │   ├── Footer.astro        # Footer with social links
│   │   ├── LanguageSwitcher.astro
│   │   ├── Hero.astro
│   │   ├── TechnicalAreas.astro
│   │   ├── FeaturedProjects.astro
│   │   ├── ProjectCard.astro
│   │   ├── LeadershipSection.astro
│   │   ├── NotesPlaceholder.astro
│   │   ├── AboutSection.astro
│   │   └── ContactSection.astro
│   ├── content/
│   │   ├── config.ts           # Zod schemas, collection definitions
│   │   ├── projects/           # Project Markdown files (EN + ES)
│   │   │   ├── augmenta.en.md
│   │   │   ├── augmenta.es.md
│   │   │   ├── energy-forecasting.en.md
│   │   │   ├── energy-forecasting.es.md
│   │   │   ├── quantum-audio.en.md
│   │   │   ├── quantum-audio.es.md
│   │   │   ├── support-classifier.en.md
│   │   │   └── support-classifier.es.md
│   │   └── notes/              # Future engineering notes
│   ├── i18n/
│   │   ├── types.ts            # UIStrings interface
│   │   ├── en.ts               # English strings
│   │   ├── es.ts               # Spanish strings
│   │   └── index.ts            # useTranslations, URL helpers
│   ├── pages/
│   │   ├── index.astro         # EN home
│   │   ├── about.astro         # EN about
│   │   ├── notes.astro         # EN notes (placeholder)
│   │   ├── 404.astro
│   │   ├── projects/
│   │   │   ├── index.astro     # EN projects list
│   │   │   └── [slug].astro    # EN project detail
│   │   └── es/                 # Spanish pages (mirrors EN structure)
│   │       ├── index.astro
│   │       ├── about.astro
│   │       ├── notes.astro
│   │       └── projects/
│   │           ├── index.astro
│   │           └── [slug].astro
│   └── styles/
│       └── global.css          # Design system, Tailwind base
├── tests/
│   ├── content.schema.test.ts  # Zod schema validation
│   ├── i18n.test.ts            # Translation key parity + integrity
│   └── projects.render.test.ts # URL helpers, project data rendering
├── astro.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.mjs
└── .prettierrc
```

---

## Bilingual Support

The site is fully bilingual (English / Spanish):

- **English** is the default — served at `/portfolio/`
- **Spanish** is served at `/portfolio/es/`
- A language switcher in the navbar links to the alternate locale of the current page
- All UI strings live in `src/i18n/en.ts` and `src/i18n/es.ts`
- Project content is authored separately per language in `src/content/projects/*.{en,es}.md`
- Tests verify key parity between EN and ES (no missing translations)

To add a new translatable string:

1. Add the key to `src/i18n/types.ts` (UIStrings interface)
2. Add the English value in `src/i18n/en.ts`
3. Add the Spanish value in `src/i18n/es.ts`
4. TypeScript will fail at compile time if either is missing

---

## Content Model

Projects are defined in `src/content/projects/` and validated by Zod:

```typescript
{
  title: string;           // Required
  slug: string;            // Required, lowercase-hyphen format
  summary: string;         // Required, min 10 chars
  lang: 'en' | 'es';      // Required
  tags: string[];          // Required, min 1
  featured: boolean;       // Default: false
  status: 'published' | 'draft' | 'wip'; // Default: 'published'
  github?: string;         // Optional, must be valid URL
  demo?: string;           // Optional, must be valid URL
  coverImage?: string;     // Optional, path to image
  order: number;           // Default: 99 (controls sort order)
}
```

To add a new project:

1. Create `src/content/projects/your-project.en.md` with the required frontmatter
2. Create `src/content/projects/your-project.es.md` with Spanish translation
3. Set `featured: true` to include it on the home page
4. The build will fail if required fields are missing or malformed

---

## Adding Notes (Future)

Create `.md` files in `src/content/notes/`. The schema expects:

- `title`, `lang`, and optional `publishedAt`, `tags`, `summary`, `status`
- Update `src/pages/notes.astro` to render the collection

---

## Deployment

### GitHub Pages (automatic)

Push to `main` → GitHub Actions runs CI → builds → deploys to GitHub Pages.

**Required GitHub repo settings:**

1. Go to **Settings → Pages**
2. Set source to **GitHub Actions**
3. Ensure the repo is named `portfolio` (or update `base` in `astro.config.mjs`)

### Manual deployment

```bash
npm run build
# Upload ./dist/ to any static host
```

---

## Configuration

| Setting       | Location                                              | Value                        |
| ------------- | ----------------------------------------------------- | ---------------------------- |
| Site URL      | `astro.config.mjs`                                    | `https://lburdman.github.io` |
| Base path     | `astro.config.mjs`                                    | `/portfolio`                 |
| Contact email | `src/i18n/en.ts`, `src/i18n/es.ts`                    | Update `contact.email`       |
| LinkedIn URL  | `src/components/Footer.astro`, `ContactSection.astro` | Update href                  |
| GitHub URL    | Same as above                                         | Update href                  |

---

## Testing

```bash
npm run test              # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
```

**Test suites:**

| File                            | What it tests                                           |
| ------------------------------- | ------------------------------------------------------- |
| `tests/content.schema.test.ts`  | Zod schema validation for project data                  |
| `tests/i18n.test.ts`            | EN/ES key parity, empty string checks, type conformance |
| `tests/projects.render.test.ts` | i18n utilities, URL helpers, featured project logic     |

---

## Linting & Formatting

```bash
npm run lint              # ESLint (strict, zero warnings)
npm run lint:fix          # ESLint with auto-fix
npm run format            # Prettier format
npm run format:check      # Check formatting (CI)
```

---

## Recommended Assets to Add Later

The site is designed to look polished without images, but add these when available:

| Asset                                            | Suggested filename               | Location                                              |
| ------------------------------------------------ | -------------------------------- | ----------------------------------------------------- |
| Professional headshot or portrait                | `portrait.jpg`                   | `public/assets/images/portrait.jpg`                   |
| Resume / CV (PDF)                                | `resume.pdf`                     | `public/assets/resume.pdf`                            |
| Augmenta — architecture diagram or UI screenshot | `augmenta-preview.png`           | `public/assets/images/augmenta-preview.png`           |
| Energy Forecasting — dashboard or results chart  | `energy-forecasting-preview.png` | `public/assets/images/energy-forecasting-preview.png` |
| Quantum Audio — model pipeline diagram           | `quantum-audio-preview.png`      | `public/assets/images/quantum-audio-preview.png`      |
| Support Classifier — UI screenshot               | `support-classifier-preview.png` | `public/assets/images/support-classifier-preview.png` |
| Qiskit Fall Fest — event photo or banner         | `qiskit-fallFest-banner.jpg`     | `public/assets/images/qiskit-fallFest-banner.jpg`     |

To use a project image, add `coverImage: "/portfolio/assets/images/your-image.png"` to the project frontmatter.

---

## Design System

The palette and typography are defined in `tailwind.config.ts` and `src/styles/global.css`.

| Token          | Value              |
| -------------- | ------------------ |
| Background     | `#0a0a0f`          |
| Surface        | `#12121a`          |
| Border         | `#1e1e2e`          |
| Text primary   | `#e8e8f0`          |
| Text secondary | `#8888a0`          |
| Accent         | `#6366f1` (indigo) |
| Font           | Inter (variable)   |

---

## Future Roadmap

- [ ] Add professional portrait to About section
- [ ] Add project screenshots to detail pages
- [ ] Add resume PDF to public assets
- [ ] Implement Notes section with first engineering note
- [ ] Add LinkedIn URL (confirm correct slug)
- [ ] Add OG image for social sharing
- [ ] Add LinkedIn post summaries / professional reflections section

---

## License

MIT — see [LICENSE](LICENSE) for details.
