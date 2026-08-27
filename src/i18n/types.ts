import type { DomainId } from '../config/domains';
import type { SectionId } from '../config/navigation';

/** The two first-class locales. English is the unprefixed default. */
export type Locale = 'en' | 'es';

export const LOCALES = ['en', 'es'] as const satisfies readonly Locale[];

export const DEFAULT_LOCALE: Locale = 'en';

/** Runtime guard, used by routing when reading a locale out of a URL. */
export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/**
 * A value that must be supplied once per technical domain.
 *
 * Keyed by `DomainId` from `src/config/domains.ts`, so adding a sixth domain
 * is a type error in both dictionaries rather than a silently missing label.
 */
export type PerDomain<T> = Record<DomainId, T>;

/**
 * A value that must be supplied once per homepage section.
 *
 * Keyed by `SectionId` from `src/config/navigation.ts`, for the same reason
 * `PerDomain` is keyed by `DomainId`: a section cannot render the label
 * belonging to a different section, and adding a fifth section is a type error
 * in both dictionaries rather than a silently missing annotation.
 *
 * Both imports here are type-only and therefore erased at compile time, so the
 * navigation ↔ i18n reference is not a runtime cycle.
 */
export type PerSection<T> = Record<SectionId, T>;

/**
 * Every user-facing string in the site.
 *
 * This includes `aria-label`s, `alt` text, empty states and page metadata —
 * not just visible body copy. The audit found 14 strings hardcoded in
 * components, read aloud on Spanish pages with Spanish phonemes because
 * `<html lang="es">` was already set. The `a11y` and `seo` groups exist so the
 * type checker refuses a dictionary that forgets them.
 *
 * Strings that interpolate are typed as functions rather than as templates the
 * caller has to `.replace()` — the substitution point is then part of the
 * contract both locales must satisfy.
 */
export interface UIStrings {
  /**
   * The links the brief (§32) requires to be reachable at all times.
   * Structure lives in `src/config/navigation.ts`; this is only the wording.
   */
  nav: {
    home: string;
    projects: string;
    about: string;
    contact: string;
  };

  /**
   * Datasheet-style figure annotations rendered in the margin of each
   * homepage section, e.g. `00 / INTRO`. The number comes from the section's
   * position in `SECTION_IDS`; this supplies the words after it.
   *
   * Authored in normal case and uppercased by the stylesheet — do not shout
   * here, or a future non-uppercased usage inherits the shouting.
   */
  sections: PerSection<string>;

  hero: {
    name: string;
    /** Localized professional identity line, e.g. "Electronic Engineer · AI Engineer". */
    role: string;
    /** The central narrative sentence of the whole portfolio. */
    positioning: string;
    ctaProjects: string;
    ctaContact: string;
    ctaResume: string;
  };

  /** Section 01 — "I build across layers". */
  layers: {
    heading: string;
    /** One line explaining why five domains belong in one portfolio. */
    narrative: string;
    items: PerDomain<{
      /** The engineering layer name: MODELS / COMPUTATION / DIGITAL LOGIC / HARDWARE / SIGNALS. */
      layer: string;
      description: string;
    }>;
  };

  /** Section 02 — the Technical Worlds traverse. */
  worlds: {
    heading: string;
    subtitle: string;
    items: PerDomain<{
      name: string;
      summary: string;
    }>;
  };

  projects: {
    heading: string;
    subtitle: string;
    viewAll: string;
    viewProject: string;
    filterAll: string;
    /** Short status badge on a card whose project is `status: 'wip'` — see src/lib/projects/visibility.ts. */
    workInProgress: string;
    /** Shown when a filter or the featured query returns nothing. */
    empty: string;
    stack: string;
    links: string;
    domains: string;
    github: string;
    demo: string;
    paper: string;
    article: string;
    relatedWork: string;
    backToList: string;
  };

  about: {
    heading: string;
    bio: string;
    /** Meaningful `alt` for the portrait — never "Photo coming soon". */
    portraitAlt: string;
    /** Short factual chips: profession, university, city. */
    facts: string[];
    currentlyHeading: string;
    interests: string[];
    teachingHeading: string;
    roles: Record<
      'qiskit' | 'digitalSystems' | 'quantumComms',
      {
        role: string;
        org: string;
        period: string;
        description: string;
      }
    >;
  };

  contact: {
    heading: string;
    invitation: string;
    note: string;
    emailLabel: string;
    githubLabel: string;
    linkedinLabel: string;
    resumeLabel: string;
  };

  footer: {
    tagline: string;
    rights: string;
    builtWith: string;
  };

  /** Visible language-switcher wording. Accessible framing lives in `a11y`. */
  lang: {
    /** Full name of the current language, e.g. "English". */
    name: string;
    /** Two-letter badge for the current language, e.g. "EN". */
    short: string;
    /** Full name of the *other* language, in that language. */
    switchTo: string;
    /** Two-letter badge for the other language. */
    switchToShort: string;
  };

  notFound: {
    heading: string;
    message: string;
    backHome: string;
  };

  /**
   * Accessibility strings: landmark labels, control labels, live-region hints
   * and alt text. Every one of these is announced by a screen reader using the
   * phonemes of `<html lang>`, so an English literal on a Spanish page is
   * read as noise.
   */
  a11y: {
    primaryNavigation: string;
    mobileNavigation: string;
    footerNavigation: string;
    toggleMenu: string;
    closeMenu: string;
    homeLink: string;
    skipToContent: string;
    languageSwitcher: string;
    currentLanguage: string;
    projectGithubLabel: (title: string) => string;
    projectDemoLabel: (title: string) => string;
    projectPaperLabel: (title: string) => string;
    projectArticleLabel: (title: string) => string;
    /** Label for canvas/SVG visuals that carry no information. */
    decorativeVisual: string;
    /** Keyboard hint for traversing the Technical Worlds sequence. */
    worldsInstructions: string;
  };

  /**
   * Per-page `<title>` and `<meta name="description">`.
   *
   * `projectsIndex` is the listing page; `projects` is a single project's
   * detail page, whose metadata is derived from the project's own content and
   * therefore interpolates.
   */
  seo: {
    /**
     * `og:image:alt` for the default share card. Describes what the card
     * actually shows, which is not what any page title says.
     */
    ogImageAlt: string;
    home: { title: string; description: string };
    projectsIndex: { title: string; description: string };
    projects: {
      title: (projectTitle: string) => string;
      description: (projectSummary: string) => string;
    };
    about: { title: string; description: string };
    notFound: { title: string; description: string };
  };
}
