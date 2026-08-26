// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/**
 * Static site deployed to GitHub Pages under a project subpath.
 *
 * `site` and `base` are declared here because Astro needs them at config time.
 * Everything downstream reads them back through `src/config/site.ts`
 * (`import.meta.env.SITE` / `import.meta.env.BASE_URL`) so they have exactly
 * one source of truth.
 *
 * `trailingSlash: 'always'` is load-bearing: canonical URLs, hreflang
 * alternates and internal links are all generated from the same helper, and a
 * canonical/alternate slash mismatch silently invalidates the locale pairing.
 *
 * See docs/ARCHITECTURE.md for the framework decision and the island strategy.
 */
export default defineConfig({
  site: 'https://lburdman.github.io',
  base: '/portfolio',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  /**
   * Content Security Policy.
   *
   * GitHub Pages cannot set response headers, so the policy has to travel in a
   * `<meta http-equiv>` tag. Writing that tag by hand is not good enough here:
   * every client script this site ships is emitted as an INLINE
   * `<script type="module">` with no `src`, so a hand-written `script-src 'self'`
   * would silently break the mobile menu, the layers reveal and the hero
   * visual — and the only way to make it "work" by hand is `unsafe-inline`,
   * which is a policy that looks like a control without being one.
   *
   * Astro computes a SHA-256 hash for each inline block at build time and emits
   * a hash-based `script-src`/`style-src`. No `unsafe-inline`, nothing broken.
   *
   * Note `frame-ancestors` is deliberately absent: it is not expressible in
   * meta form, and a directive that silently does nothing is worse than none.
   */
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },
  integrations: [
    react(),
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', es: 'es' },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
