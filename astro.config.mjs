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
  /**
   * Markdown.
   *
   * `syntaxHighlight: 'prism'` is a CSP decision, not a taste one.
   *
   * Astro's default highlighter is Shiki, which resolves every token to a
   * literal colour and emits it as a `style=""` attribute. Under the hash-based
   * policy above there is no `'unsafe-hashes'`, and a hash authorises a
   * `<style>` *element*, never a style *attribute* — so the browser drops every
   * one of them. Astro knows this and says so at build time:
   *
   *   [WARN] Shiki syntax highlighting uses inline styles that are not
   *          compatible with CSP
   *
   * There are zero code fences in the content today, which is the only reason
   * that warning is currently harmless. The moment someone adds one it becomes
   * the same silent failure as the inline-style bug in docs/ARCHITECTURE.md §10:
   * `astro dev` serves no CSP, so the block is perfectly coloured in
   * development and renders as flat unstyled text in production, with no error
   * anywhere.
   *
   * Prism emits class names only (`.token.keyword`, `.token.string`, …) and no
   * inline styles at all, so highlighting survives the policy. `@astrojs/prism`
   * ships with Astro; this adds no dependency.
   *
   * Prism ships colours in a stylesheet rather than in the markup, so the token
   * classes need a Prism theme in the site's CSS to be visible. Without one the
   * classes are present and correct but inherit the surrounding text colour.
   */
  markdown: {
    syntaxHighlight: 'prism',
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
