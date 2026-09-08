import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Flat config for ESLint 10.
 *
 * Two defects in the previous config produced most of the 26 errors the audit
 * recorded (AUDIT.md 1.1), and both are fixed structurally here:
 *
 *  1. `projectService: true` was applied to every file, including `.astro`.
 *     `astro-eslint-parser` does not support the project service — it silently
 *     degrades, so `Astro.props` and every `astro:content` type resolved as
 *     `error`, which is what generated the 18 `no-unsafe-return` failures.
 *     Fix: `.ts`/`.tsx` keep `projectService`; `.astro` gets an explicit
 *     `parserOptions.project` plus `extraFileExtensions`, which is the only
 *     shape `astro-eslint-parser` understands.
 *
 *  2. File selection came from a `--ext` flag, which is a no-op under flat
 *     config, so ESLint also walked `coverage/` and the root config files with
 *     type-aware rules enabled. Fix: selection comes from `files` globs, and
 *     generated output is listed in `ignores`.
 *
 * Type-aware rule sets are attached per file group rather than globally. That
 * matters for more than tidiness: `eslint-plugin-astro` synthesises virtual
 * files for client-side `<script>` blocks (`**\/*.astro/*.ts`) which have no
 * TS program behind them, so a globally-applied `recommendedTypeChecked`
 * fails on them.
 */
export default tseslint.config(
  // ── Ignores ───────────────────────────────────────────────────────────────
  // Build output, coverage reports and Astro's generated types are not source.
  // Linting them is what produced 6 of the audit's 26 errors.
  //
  // `.claude/` is agent state, and `.claude/worktrees/` holds entire checkouts
  // of this same repository, `node_modules` included. Without this entry
  // `npm run lint` walks them and dies with a V8 out-of-memory before reporting
  // a single result — a failure that looks like a lint error in your own code
  // and is not one. These are copies of source, not source.
  {
    ignores: ['dist/', 'coverage/', '.astro/', 'node_modules/', 'public/', '.claude/', '**/*.tmp.*'],
  },

  // ── Plain ESM tooling: config files and content scripts ───────────────────
  // Deliberately NOT type-checked. `astro.config.mjs`, `eslint.config.mjs` and
  // `scripts/*.mjs` are Node ESM run by tooling, not application source. Making
  // them type-aware would require `checkJs` in `tsconfig.json`, which changes
  // what `tsc --noEmit` verifies for the whole project in order to lint four
  // files. Syntax and correctness rules are the proportionate check here.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [eslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: globals.nodeBuiltin,
    },
  },

  // ── TypeScript sources and React islands ─────────────────────────────────
  // `projectService` is supported here and is the fastest correct option.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [eslint.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ── React islands ─────────────────────────────────────────────────────────
  // React 19 with the automatic JSX runtime (`jsx: 'react-jsx'` in
  // tsconfig.json): components do not import `React`, so a rule such as
  // `react/react-in-jsx-scope` would be actively wrong here.
  //
  // The islands own imperative resources — GSAP timelines, ScrollTrigger
  // instances, rAF loops, `matchMedia` listeners — where a stale closure or a
  // missed cleanup is a leak rather than a visible bug. That is what these two
  // rules catch, and it is why they are `error` rather than the plugin's
  // default `warn` for `exhaustive-deps`: `--max-warnings 0` would fail the
  // build anyway, so `warn` would only disguise a failure as advice.
  //
  // NOTE on scope: `recommended-latest` also enables the React Compiler rule
  // set (`purity`, `immutability`, `static-components`, `use-memo`, …). Those
  // are not enabled here because this project does not run the React Compiler —
  // there is no `babel-plugin-react-compiler` in the build. Turning them on
  // would report patterns that are correct for this build. Enable them in the
  // same change that adopts the compiler, not before.
  //
  // NOTE on gaps: `eslint-plugin-react` is not installed, and
  // `eslint-plugin-jsx-a11y` cannot be — its current release caps ESLint at 9,
  // which is also why `eslint-plugin-astro` is pinned to ^1.7.0. Island
  // accessibility is therefore reviewed, not linted.
  {
    files: ['**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // Hook and event-handler props are `void`-returning by contract; an
      // async handler passed to one is a genuine unhandled-rejection bug.
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },

  // ── Astro components ──────────────────────────────────────────────────────
  // Order matters. `recommendedTypeChecked` carries `typescript-eslint`'s base
  // config, which sets `languageOptions.parser` to the TS parser — applied to
  // `.astro` that produces "Parsing error: Expression expected" on the opening
  // `---`. The plugin's config is therefore spread *after* this block so
  // `astro-eslint-parser` is the parser that ends up in effect, while the
  // `parserOptions` declared here (deep-merged by ESLint) still supply the
  // type information.
  //
  // `project` rather than `projectService`: `astro-eslint-parser` has no
  // project-service support. It silently degrades, which resolved `Astro.props`
  // and every `astro:content` type as `error` and produced the 18
  // `no-unsafe-return` failures the audit recorded (AUDIT.md 1.1).
  {
    files: ['**/*.astro'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        project: './tsconfig.json',
        extraFileExtensions: ['.astro'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...eslintPluginAstro.configs['flat/recommended'],

  // ── Client-side <script> blocks inside .astro files ──────────────────────
  // `eslint-plugin-astro` extracts these into virtual files that exist on no
  // disk and belong to no TS program. Both the project service and an explicit
  // `project` fail on them by construction, so type information is switched off
  // and the type-aware rules with it. Syntax rules still apply.
  {
    files: ['**/*.astro/*.ts', '**/*.astro/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: null,
      },
    },
  },

  // ── Ambient declaration files ─────────────────────────────────────────────
  // `src/env.d.ts` is `/// <reference path="../.astro/types.d.ts" />`, the glue
  // Astro generates and requires. A `path` reference has no import-based
  // equivalent, so `triple-slash-reference` is not satisfiable in a `.d.ts` —
  // it is scoped off where it cannot apply, not turned off globally.
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },

  // ── Project rules ─────────────────────────────────────────────────────────
  // Applied last so they win over any preset above. `error` everywhere: the
  // lint script runs with `--max-warnings 0`, so a warning would be a failure
  // wearing a softer label.
  {
    files: ['**/*.{ts,tsx,astro}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      // Inferred return types are idiomatic in both Astro frontmatter and
      // React components; the type checker verifies them either way.
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
);
