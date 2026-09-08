import type { UIStrings } from '../i18n/types';

/**
 * The single source of truth for navigation structure.
 *
 * Data only — no logic, no JSX, no URL construction. Consumers resolve the
 * href with `localizePath(item.path, locale, base)` from `src/i18n/routing.ts`
 * and the label with `t.nav[item.labelKey]`, so structure, wording and URL
 * shape each have exactly one owner.
 *
 * This list is the brief's navigation floor (§32): from any page a visitor can
 * reach Projects, About and Contact, change language, and return Home. The
 * language switcher and the home link are not entries here — the switcher is
 * its own control, and Home is the wordmark — but both are covered by
 * `HOME_PATH` and the `nav.home` / `a11y.homeLink` strings.
 */

export type NavItemId = 'projects' | 'writing' | 'about' | 'contact';

export interface NavItem {
  readonly id: NavItemId;
  /**
   * Locale-independent route, always leading-slash, never carrying the base or
   * a locale prefix. Pass it through `localizePath` before rendering.
   */
  readonly path: string;
  /**
   * Fragment appended after the localized path, for destinations that are a
   * section of a page rather than a page of their own. The consumer joins them
   * as `` `${localizePath(path, locale, base)}#${hash}` `` — appending after
   * the trailing slash keeps the URL valid under `trailingSlash: 'always'`.
   */
  readonly hash?: string;
  readonly labelKey: keyof UIStrings['nav'];
}

/** Route of the home page, in locale-independent form. */
export const HOME_PATH = '/';

/**
 * `id` of the `<main>` element, shared by the skip link's `href` and the
 * landmark's own attribute. The audit found the target present and the link
 * missing; one constant makes them impossible to separate.
 */
export const MAIN_CONTENT_ID = 'main-content';

/**
 * Anchor for the contact block, which lives at the foot of the home page.
 *
 * `satisfies SectionId` is the whole point of the annotation: this constant is
 * what four links (`PRIMARY_NAV`, the mobile menu, the footer and the Hero CTA)
 * point at, and it is also the section's own `id`. Now that `'contact'` is a
 * member of `SECTION_IDS`, renaming one without the other is a type error
 * rather than four dead anchors — which is exactly how P0 #7 shipped.
 */
export const CONTACT_SECTION_ID = 'contact' satisfies SectionId;

/**
 * The homepage sections, in the order they appear.
 *
 * The array order is the numbering: index 0 renders as `00`, index 1 as `01`,
 * and so on. Renumbering the datasheet-style figure annotations means
 * reordering this array, not editing four literals in four components.
 *
 * These ids are also the `id` attributes the sections carry, so an in-page
 * anchor, a section's own `id` and its margin label all resolve from one list.
 * `UIStrings['sections']` is a `Record` over this union, which is what stops a
 * section rendering the label belonging to a different section — and what
 * makes adding an id here a compile error until both dictionaries have words
 * for it.
 *
 * `'contact'` is last because the page order is Hero → Layers → Technical
 * Worlds → Projects → Contact, so Contact is figure `04`. It joined the list
 * only once `sections.contact` existed in `en.ts` and `es.ts`; until then the
 * Contact section rendered through `Section`'s explicit-`id`/`index` escape
 * hatch, which it no longer needs.
 */
export const SECTION_IDS = ['hero', 'layers', 'worlds', 'projects', 'contact'] as const;

export type SectionId = (typeof SECTION_IDS)[number];

/**
 * `writing` sits between `projects` and `about` because that is the order of
 * evidence: what was built, then what was taught and organised, then who did
 * it. It is a page of its own rather than a homepage section, so it appears
 * here and **not** in `SECTION_IDS` — the section list numbers the homepage's
 * figure annotations, and a sixth entry there would renumber every existing one
 * for a band that does not exist on that page.
 */
export const PRIMARY_NAV = [
  { id: 'projects', path: '/projects', labelKey: 'projects' },
  { id: 'writing', path: '/writing', labelKey: 'writing' },
  { id: 'about', path: '/about', labelKey: 'about' },
  { id: 'contact', path: HOME_PATH, hash: CONTACT_SECTION_ID, labelKey: 'contact' },
] as const satisfies readonly NavItem[];
