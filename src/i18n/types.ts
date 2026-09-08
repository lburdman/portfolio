import type { DomainId } from '../config/domains';
import type { SectionId } from '../config/navigation';
import type { WritingKind } from '../content/writing-schema';

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
 * A value that must be supplied once per article kind.
 *
 * Keyed by `WritingKind` from `src/content/writing-schema.ts`, for exactly the
 * reason `PerDomain` is keyed by `DomainId`: `WRITING_KINDS` is a closed
 * taxonomy, so a fifth kind added to the schema must be a compile error in both
 * dictionaries rather than an article whose label renders as `undefined`.
 *
 * The import is type-only and therefore erased, so this does not drag
 * `astro/zod` into every module that reads a dictionary.
 */
export type PerWritingKind<T> = Record<WritingKind, T>;

/**
 * Exactly three verifiable credentials — no more, and no fewer.
 *
 * A fixed tuple rather than `string[]`, for the same reason `PerDomain` is a
 * `Record<DomainId, T>` and `PerSection` a `Record<SectionId, T>`: the
 * constraint belongs to the type, not to the author's restraint. The Hero
 * carries a name, a role, one sentence and a row of buttons; three lines of
 * credential read as provenance, and a fourth reads as a badge wall. Making
 * the fourth a compile error is the only version of that rule that survives
 * the next person who has something else worth listing.
 *
 * The same trio backs `about.facts`, which previously restated the `<h1>`
 * directly above it.
 */
export type CredentialTrio = readonly [string, string, string];

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
    /**
     * The writing section. Named `writing` and never `notes`: `nav.notes` was a
     * dead key the audit removed (5.4), and `tests/i18n.test.ts` still asserts
     * it never comes back. A live section reusing the dead name would make that
     * guard fail for the wrong reason and then be "fixed" by deleting it.
     */
    writing: string;
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
    /**
     * Three verifiable credentials, rendered between `positioning` and the
     * CTA row. Degree, MicroMasters, certification — in that order, which is
     * the order of how long each took to earn.
     *
     * Proper nouns stay in their issued form in both locales: a translated
     * certification name cannot be looked up, and an unverifiable credential
     * is worse than an absent one.
     */
    credentials: CredentialTrio;
    ctaProjects: string;
    ctaContact: string;
    ctaResume: string;
  };

  /** Section 01 — the descent, from the models down to the physics. */
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
    /**
     * `alt` for the figures committed under each project's own `media/`
     * directory, keyed `<slug>/<file stem>` — e.g.
     * `energy-forecasting/prediction-interval`.
     *
     * Alt is user-facing copy, so it lives here and not in `project.json`
     * (audit 2.8 was 14 strings hardcoded in components). One entry per image
     * rather than one title reused for figures that show different things:
     * `ProjectCard.astro` and the project detail page both fall back to the
     * localized title, which is never *wrong*, only vague — and vague is not
     * what a reader who cannot see the plot is owed.
     *
     * Deliberately an open `Record<string, string>` and **not** a union of the
     * four keys that exist today. Dropping a file into `media/` publishes it,
     * with no schema change and no second place to name it; a closed key type
     * would make adding an image a compile error in both dictionaries, and the
     * consumers already degrade to the title for a key that is missing.
     *
     * Describe what the image *shows* — the series drawn, the axes, the shaded
     * region — never what it is meant to prove.
     */
    mediaAlt: Record<string, string>;
  };

  /**
   * The writing section: field reports on teaching, community, research and
   * study, rendered as a chronology at `/writing/`.
   *
   * It is a standalone route rather than a homepage band, so it has **no entry
   * in `sections`** — `SECTION_IDS` numbers the homepage's figures and adding a
   * sixth would renumber every existing margin annotation for a section that
   * never appears on that page.
   */
  writing: {
    heading: string;
    subtitle: string;
    /** Shown when nothing is public yet. Says what will appear, not "no posts found". */
    empty: string;
    /** The sighted affordance on an index entry. `aria-hidden`; the title is the link. */
    readArticle: string;
    /** One label per `WRITING_KIND` — how the work was done, not what it was about. */
    kinds: PerWritingKind<string>;
    /** Heading over the projects an article bears on. */
    relatedProjects: string;
    backToList: string;
    /**
     * Pagination wording. `older` / `newer` rather than previous / next,
     * matching `articleNeighbours()` in `src/lib/writing/query.ts`: the index
     * runs newest-first, so "next" means opposite things depending on whether
     * you are thinking about the page or about the calendar.
     */
    older: string;
    newer: string;
    /** `aria-label` for the domain list, mirroring `projects.domains`. */
    domains: string;
    /** `aria-label` for the external link list. */
    links: string;
    /**
     * Visible text for each key of `writingLinksSchema`. Typed loosely as four
     * strings here and bound to the schema's own key union at the point of use
     * in the detail route, the same way `projects` does it.
     */
    event: string;
    slides: string;
    paper: string;
    code: string;
    /**
     * `alt` for the photographs committed under each article's `media/`
     * directory, keyed `<slug>/<file stem>` — identical contract to
     * `projects.mediaAlt`, including the open `Record` and the reason for it.
     *
     * These are photographs of rooms full of real people, so they describe what
     * is in the frame — how many, where, what is on the screen behind them —
     * and never what the event is supposed to have proved.
     */
    mediaAlt: Record<string, string>;
  };

  about: {
    heading: string;
    bio: string;
    /** Meaningful `alt` for the portrait — never "Photo coming soon". */
    portraitAlt: string;
    /**
     * The same three credentials the Hero carries. Not a second copy — both
     * dictionaries define the trio once and reference it from both places, so
     * the two cannot drift.
     *
     * These were `Electronic Engineer / FIUBA / Buenos Aires`, two of which
     * restated the `<h1>` a few pixels above them.
     */
    facts: CredentialTrio;
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

  /**
   * The closing section. There is deliberately **no `heading` here.**
   *
   * The section's margin annotation is `sections.contact` like every other
   * section's, and its `<h2>` carries `invitation` — the word "Contact" is
   * never written twice. A `contact.heading` did exist while the section was
   * rendered through `Section`'s escape hatch, and it went dead the moment
   * `'contact'` joined `SECTION_IDS`. It is removed rather than left in place
   * because an unused key looks authoritative: the next person to need a
   * heading here wires up the one in this group, and then the margin word and
   * the visible heading are free to diverge — in one locale only, which is the
   * version nobody notices. The audit already listed dead dictionary keys
   * (`nav.notes`, `NoteFrontmatter`) as a finding for exactly this reason.
   */
  contact: {
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
    /**
     * Accessible names for an article's external destinations, one per key of
     * `writingLinksSchema`. Separate from the `project*Label` family because
     * the sentence differs: a paper *about* a project, but the paper an article
     * *presented*.
     */
    articleEventLabel: (title: string) => string;
    articleSlidesLabel: (title: string) => string;
    articlePaperLabel: (title: string) => string;
    articleCodeLabel: (title: string) => string;
    /** Landmark label for the older/newer pagination at the foot of an article. */
    articleNavigation: string;
    /** Landmark label for the chronology on the writing index. */
    writingTimeline: string;
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
    /** The writing chronology at `/writing/`. */
    writingIndex: { title: string; description: string };
    /**
     * A single article. Same shape and same reasoning as `projects`: the
     * metadata is the article's own title and standfirst, so it interpolates
     * rather than being written a second time in two dictionaries.
     */
    writing: {
      title: (articleTitle: string) => string;
      description: (articleSummary: string) => string;
    };
    about: { title: string; description: string };
    notFound: { title: string; description: string };
  };
}
