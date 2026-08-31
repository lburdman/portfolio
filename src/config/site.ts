/**
 * Single source of truth for site-level identity, URLs and external profiles.
 *
 * Nothing else in the codebase may hardcode a social URL, an email address or
 * the deployment origin. If a value appears twice, one of the two is a bug.
 *
 * `origin` and `basePath` are read back from Astro's own config so the
 * deployment target is declared exactly once (in `astro.config.mjs`).
 */

/** Deployment origin, e.g. `https://lburdman.github.io`. No trailing slash. */
export const ORIGIN: string = import.meta.env.SITE ?? 'https://lburdman.github.io';

/**
 * Base path Astro serves the site from, normalised to have no trailing slash
 * so it can be concatenated with paths that always start with `/`.
 *
 * Astro reports `/portfolio/` (with slash) for `base: '/portfolio'`, and `/`
 * for a root deployment — both normalise to `''` or `'/portfolio'`.
 */
export const BASE_PATH: string = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '');

export interface SocialLink {
  /** Stable key used for icons and translation lookups. */
  readonly id: 'github' | 'linkedin' | 'email';
  /** Fully-qualified href, including the `mailto:` scheme where relevant. */
  readonly href: string;
  /** Human-readable form shown in the UI (never a raw URL with scheme). */
  readonly display: string;
}

/**
 * The address, written once.
 *
 * It used to appear three times in this file — as `email`, and again as the
 * `href` and `display` of the email social entry. Three copies of one fact in
 * the file whose own header forbids that elsewhere; a change to one of them was
 * a silent mismatch between the visible address and the one a click actually
 * sends to. There is now one literal and two derivations.
 */
const EMAIL = 'lucasburdman@gmail.com';

export const SITE = {
  origin: ORIGIN,
  basePath: BASE_PATH,

  /** Used for `<meta name="author">`, JSON-LD and the copyright line. */
  author: 'Lucas Burdman',

  /**
   * Locale-independent professional identity. The localized elaboration of
   * this lives in the i18n dictionaries; this is the untranslatable core.
   */
  role: 'Electronic Engineer · AI Engineer',

  email: EMAIL,

  social: [
    {
      id: 'github',
      href: 'https://github.com/lburdman',
      display: 'github.com/lburdman',
    },
    {
      id: 'linkedin',
      href: 'https://www.linkedin.com/in/lucasburdman',
      display: 'linkedin.com/in/lucasburdman',
    },
    {
      id: 'email',
      href: `mailto:${EMAIL}`,
      display: EMAIL,
    },
  ] as const satisfies readonly SocialLink[],

  /**
   * Path to the résumé PDF inside `public/`, or `null` when it is not shipped.
   *
   * The audit found two prominent CTAs pointing at a file that does not exist
   * in `public/assets/`. Rather than ship a dead link, résumé CTAs render only
   * when this is non-null. Drop the PDF in `public/assets/` and set the path.
   */
  resumePath: null as string | null,

  /**
   * Default social share card, relative to `public/`.
   *
   * Must be the PNG, not the SVG. The card is *authored* as
   * `public/og-default.svg` (editable and reviewable in version control) but
   * LinkedIn, Slack and WhatsApp all reject an SVG `og:image`. Regenerate the
   * PNG with `node scripts/og-generate.mjs` after editing the SVG.
   */
  ogImage: '/og-default.png',
  ogImageWidth: 1200,
  ogImageHeight: 630,
} as const;

export type Site = typeof SITE;
