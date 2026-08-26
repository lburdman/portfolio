/**
 * Prettier configuration.
 *
 * This was a `.prettierrc` until the `tailwindStylesheet` caveat below needed a
 * comment next to it. `.prettierrc` cannot carry one: Prettier parses that file
 * as JSON *or YAML*, and a `//` comment makes the YAML branch win, which turns
 * the whole file into one nonsense key and silently discards every real option.
 * Verified — it does not error, it just stops configuring anything. A `.mjs`
 * config is the format that can explain itself.
 *
 * @type {import('prettier').Config}
 */
export default {
  semi: true,
  singleQuote: true,
  printWidth: 120,
  tabWidth: 2,
  trailingComma: 'all',
  bracketSpacing: true,

  // `prettier-plugin-tailwindcss` must be LAST — it rewrites the output of every
  // other plugin, so anything after it would not see the sorted classes.
  plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],

  // ⚠ Tailwind 4 is CSS-first, so there is no `tailwind.config.ts` to point at;
  // the plugin reads the stylesheet that imports Tailwind instead.
  //
  // THIS PATH MUST EXIST. If `src/styles/global.css` is renamed or moved and
  // this line is not updated in the same commit, `npm run format:check` does not
  // report a formatting diff — it dies with
  //     Error: ENOENT: no such file or directory, open '.../global.css'
  // and takes CI down at step 1, on every file, for a reason that has nothing to
  // do with formatting.
  tailwindStylesheet: './src/styles/global.css',

  // Class sorting also applies to classes passed through these helpers.
  tailwindFunctions: ['clsx', 'cn', 'cva'],

  overrides: [
    {
      files: '*.astro',
      options: { parser: 'astro' },
    },
  ],
};
