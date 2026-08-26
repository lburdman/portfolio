import { describe, expect, it } from 'vitest';
import { DOMAIN_IDS } from '../src/config/domains';
import { SECTION_IDS } from '../src/config/navigation';
import { projectLinksSchema } from '../src/content/schema';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';
import { LOCALES, type Locale, type UIStrings } from '../src/i18n/types';

const DICTIONARIES: Record<Locale, UIStrings> = { en, es };

type LeafKind = 'string' | 'function' | 'other';

interface Leaf {
  path: string;
  kind: LeafKind;
  value: unknown;
}

/**
 * Walks a dictionary down to its leaves, recording each leaf's dotted path and
 * its kind. Arrays are walked too, so `about.interests.0` is a leaf and a
 * dropped list item shows up as a missing key rather than passing silently.
 *
 * Interpolating strings are functions, and `typeof fn !== 'object'`, so they
 * terminate the walk as leaves of kind `'function'`.
 */
function collectLeaves(node: unknown, prefix = ''): Leaf[] {
  if (typeof node === 'object' && node !== null) {
    return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
      collectLeaves(value, prefix ? `${prefix}.${key}` : key),
    );
  }
  const kind: LeafKind = typeof node === 'string' ? 'string' : typeof node === 'function' ? 'function' : 'other';
  return [{ path: prefix, kind, value: node }];
}

const LEAVES: Record<Locale, Leaf[]> = {
  en: collectLeaves(en),
  es: collectLeaves(es),
};

describe('EN ↔ ES parity', () => {
  it('has the same top-level groups', () => {
    const enKeys = Object.keys(en as unknown as Record<string, unknown>).sort();
    const esKeys = Object.keys(es as unknown as Record<string, unknown>).sort();
    expect(esKeys).toEqual(enKeys);
  });

  it('has the same leaf keys, recursively and including arrays', () => {
    const enPaths = LEAVES.en.map((leaf) => leaf.path).sort();
    const esPaths = LEAVES.es.map((leaf) => leaf.path).sort();
    expect(esPaths).toEqual(enPaths);
  });

  it('has the same kind of value at every key', () => {
    const enKinds = Object.fromEntries(LEAVES.en.map((leaf) => [leaf.path, leaf.kind]));
    const esKinds = Object.fromEntries(LEAVES.es.map((leaf) => [leaf.path, leaf.kind]));
    expect(esKinds).toEqual(enKinds);
  });

  it('has no leaf that is neither a string nor an interpolating function', () => {
    for (const locale of LOCALES) {
      const strays = LEAVES[locale].filter((leaf) => leaf.kind === 'other');
      expect(
        strays.map((leaf) => leaf.path),
        `${locale} has non-string leaves`,
      ).toEqual([]);
    }
  });
});

describe('string hygiene', () => {
  it('has no empty strings in either locale', () => {
    for (const locale of LOCALES) {
      const empty = LEAVES[locale]
        .filter((leaf) => leaf.kind === 'string' && leaf.value === '')
        .map((leaf) => leaf.path);
      expect(empty, `${locale} has empty strings`).toEqual([]);
    }
  });

  it('has no leading or trailing whitespace in either locale', () => {
    for (const locale of LOCALES) {
      const untrimmed = LEAVES[locale]
        .filter((leaf) => leaf.kind === 'string' && (leaf.value as string) !== (leaf.value as string).trim())
        .map((leaf) => leaf.path);
      expect(untrimmed, `${locale} has untrimmed strings`).toEqual([]);
    }
  });
});

describe('interpolating strings', () => {
  it('substitutes the project title into the GitHub and demo a11y labels', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      expect(t.a11y.projectGithubLabel('Augmenta')).toContain('Augmenta');
      expect(t.a11y.projectDemoLabel('Augmenta')).toContain('Augmenta');
      expect(t.a11y.projectGithubLabel('Augmenta')).not.toBe(t.a11y.projectDemoLabel('Augmenta'));
    }
  });

  it('builds project page metadata from the project own content', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      const title = t.seo.projects.title('Energy Demand Forecasting');
      expect(title).toContain('Energy Demand Forecasting');
      expect(title).toContain('Lucas Burdman');
      expect(t.seo.projects.description('A 24-hour ahead forecasting pipeline.')).toContain('24-hour ahead');
    }
  });
});

describe('domain coverage', () => {
  it('covers every DOMAIN_ID in layers.items, in both locales', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      expect(Object.keys(t.layers.items).sort()).toEqual([...DOMAIN_IDS].sort());
      for (const id of DOMAIN_IDS) {
        expect(t.layers.items[id].layer, `${locale} layers.items.${id}.layer`).toBeTruthy();
        expect(t.layers.items[id].description, `${locale} layers.items.${id}.description`).toBeTruthy();
      }
    }
  });

  it('covers every DOMAIN_ID in worlds.items, in both locales', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      expect(Object.keys(t.worlds.items).sort()).toEqual([...DOMAIN_IDS].sort());
      for (const id of DOMAIN_IDS) {
        expect(t.worlds.items[id].name, `${locale} worlds.items.${id}.name`).toBeTruthy();
        expect(t.worlds.items[id].summary, `${locale} worlds.items.${id}.summary`).toBeTruthy();
      }
    }
  });

  it('gives each domain a distinct layer label and world name', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      const layers = DOMAIN_IDS.map((id) => t.layers.items[id].layer);
      const names = DOMAIN_IDS.map((id) => t.worlds.items[id].name);
      expect(new Set(layers).size, `${locale} duplicate layer labels`).toBe(DOMAIN_IDS.length);
      expect(new Set(names).size, `${locale} duplicate world names`).toBe(DOMAIN_IDS.length);
    }
  });
});

describe('navigation strings', () => {
  it('provides a label for every link the brief requires to be always reachable', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      for (const key of ['home', 'projects', 'about', 'contact'] as const) {
        expect(t.nav[key], `${locale} nav.${key}`).toBeTruthy();
      }
    }
  });

  it("no longer carries the dead 'notes' key", () => {
    for (const locale of LOCALES) {
      expect(Object.keys(DICTIONARIES[locale].nav)).not.toContain('notes');
    }
  });
});

describe('accessibility strings', () => {
  it('supplies every a11y key in both locales', () => {
    const required = [
      'primaryNavigation',
      'mobileNavigation',
      'footerNavigation',
      'toggleMenu',
      'closeMenu',
      'homeLink',
      'skipToContent',
      'languageSwitcher',
      'currentLanguage',
      'decorativeVisual',
      'worldsInstructions',
    ] as const;
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      for (const key of required) {
        expect(t.a11y[key], `${locale} a11y.${key}`).toBeTruthy();
      }
    }
  });

  it('translates the a11y strings rather than reusing the English literals', () => {
    // Audit 2.8: these were hardcoded in components and read aloud on Spanish
    // pages with Spanish phonemes.
    expect(es.a11y.primaryNavigation).not.toBe(en.a11y.primaryNavigation);
    expect(es.a11y.mobileNavigation).not.toBe(en.a11y.mobileNavigation);
    expect(es.a11y.footerNavigation).not.toBe(en.a11y.footerNavigation);
    expect(es.a11y.toggleMenu).not.toBe(en.a11y.toggleMenu);
    expect(es.a11y.skipToContent).not.toBe(en.a11y.skipToContent);
    expect(es.a11y.projectDemoLabel('X')).not.toBe(en.a11y.projectDemoLabel('X'));
  });
});

describe('section labels', () => {
  it('covers every SECTION_ID in both locales, and nothing else', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      expect(Object.keys(t.sections).sort()).toEqual([...SECTION_IDS].sort());
      for (const id of SECTION_IDS) {
        expect(t.sections[id], ` sections.`).toBeTruthy();
      }
    }
  });

  it('authors them in normal case and leaves the shouting to CSS', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      for (const id of SECTION_IDS) {
        const label = t.sections[id];
        expect(label, ` sections. is pre-uppercased`).not.toBe(label.toUpperCase());
      }
    }
  });

  it('keeps them short enough for a narrow margin', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      for (const id of SECTION_IDS) {
        expect(t.sections[id].length, ` sections. too long`).toBeLessThanOrEqual(24);
        expect(t.sections[id].split(' ').length, ` sections. too wordy`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('gives each section a distinct label within a locale', () => {
    for (const locale of LOCALES) {
      const labels = SECTION_IDS.map((id) => DICTIONARIES[locale].sections[id]);
      expect(new Set(labels).size, ` duplicate section labels`).toBe(SECTION_IDS.length);
    }
  });

  it('translates the section names rather than transliterating them', () => {
    expect(es.sections.layers).not.toBe(en.sections.layers);
    expect(es.sections.worlds).not.toBe(en.sections.worlds);
    expect(es.sections.projects).not.toBe(en.sections.projects);
  });
});

describe('SEO metadata', () => {
  const staticPages = ['home', 'projectsIndex', 'about', 'notFound'] as const;

  it('supplies a title and description for every static page in both locales', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      for (const page of staticPages) {
        expect(t.seo[page].title, `${locale} seo.${page}.title`).toBeTruthy();
        expect(t.seo[page].description, `${locale} seo.${page}.description`).toBeTruthy();
      }
    }
  });

  it('keeps titles and descriptions inside the length search engines display', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      for (const page of staticPages) {
        expect(t.seo[page].title.length, `${locale} seo.${page}.title too long`).toBeLessThanOrEqual(60);
        expect(t.seo[page].description.length, `${locale} seo.${page}.description too long`).toBeLessThanOrEqual(160);
      }
    }
  });

  it('gives every static page a distinct title within a locale', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      const titles = staticPages.map((page) => t.seo[page].title);
      expect(new Set(titles).size, `${locale} duplicate page titles`).toBe(staticPages.length);
    }
  });
});

describe('default share card alt text', () => {
  it('describes the card in both locales', () => {
    for (const locale of LOCALES) {
      const alt = DICTIONARIES[locale].seo.ogImageAlt;
      expect(alt, ` seo.ogImageAlt`).toBeTruthy();
      expect(alt, ` names the person on the card`).toContain('Lucas Burdman');
    }
  });

  it('is a single sentence', () => {
    for (const locale of LOCALES) {
      const alt = DICTIONARIES[locale].seo.ogImageAlt;
      expect(alt.endsWith('.'), ` seo.ogImageAlt is unpunctuated`).toBe(true);
      expect((alt.match(/\./g) ?? []).length, ` seo.ogImageAlt is multi-sentence`).toBe(1);
    }
  });

  it('stays inside the length social platforms render', () => {
    // Deliberately not the 60/160 SERP bounds used for titles and
    // descriptions: this is alt text, never a search result. X truncates
    // image alt at 420 characters; 200 keeps it well inside that and inside
    // what a screen reader will read out without fatigue.
    for (const locale of LOCALES) {
      const alt = DICTIONARIES[locale].seo.ogImageAlt;
      expect(alt.length, ` seo.ogImageAlt too long`).toBeLessThanOrEqual(200);
    }
  });

  it('describes the image, not the page — it is not a page title', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      const pageTitles = [t.seo.home.title, t.seo.projectsIndex.title, t.seo.about.title];
      expect(pageTitles, ` ogImageAlt reuses a page title`).not.toContain(t.seo.ogImageAlt);
    }
  });
});

describe('Spanish is a translation, not a copy', () => {
  it('differs from English on the strings a machine copy would leave identical', () => {
    expect(es.nav.projects).not.toBe(en.nav.projects);
    expect(es.nav.about).not.toBe(en.nav.about);
    expect(es.hero.positioning).not.toBe(en.hero.positioning);
    expect(es.layers.heading).not.toBe(en.layers.heading);
    expect(es.worlds.heading).not.toBe(en.worlds.heading);
    expect(es.seo.home.title).not.toBe(en.seo.home.title);
    expect(es.about.bio).not.toBe(en.about.bio);
  });

  it('uses "Correo" rather than the English "Email" for the contact label', () => {
    // Audit 2.8 called this one out by name.
    expect(en.contact.emailLabel).toBe('Email');
    expect(es.contact.emailLabel).toBe('Correo');
  });

  it('keeps the language switcher self-consistent across the two dictionaries', () => {
    expect(en.lang.switchTo).toBe(es.lang.name);
    expect(es.lang.switchTo).toBe(en.lang.name);
    expect(en.lang.switchToShort).toBe(es.lang.short);
    expect(es.lang.switchToShort).toBe(en.lang.short);
  });
});

describe('preserved biographical content', () => {
  it('keeps the three real teaching and community roles in both locales', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      expect(Object.keys(t.about.roles).sort()).toEqual(['digitalSystems', 'qiskit', 'quantumComms']);
      for (const [key, entry] of Object.entries(t.about.roles)) {
        expect(entry.role, `${locale} about.roles.${key}.role`).toBeTruthy();
        expect(entry.org, `${locale} about.roles.${key}.org`).toBeTruthy();
        expect(entry.period, `${locale} about.roles.${key}.period`).toBeTruthy();
        expect(entry.description, `${locale} about.roles.${key}.description`).toBeTruthy();
      }
    }
  });

  it('keeps the organisation names, which are proper nouns and untranslated', () => {
    expect(en.about.roles.qiskit.org).toBe('Qiskit Fall Fest FIUBA');
    expect(es.about.roles.qiskit.org).toBe('Qiskit Fall Fest FIUBA');
  });

  it('keeps the 500+ attendee figure in the Qiskit description', () => {
    expect(en.about.roles.qiskit.description).toContain('500+');
    expect(es.about.roles.qiskit.description).toContain('500');
  });
});

describe('project status labels', () => {
  it('labels a work-in-progress project with a short, translated badge', () => {
    // `isVisible` publishes `wip` projects alongside `published` ones, so the
    // card needs a label a visitor can read — in their own language.
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      expect(t.projects.workInProgress, `${locale} projects.workInProgress`).toBeTruthy();
      // It renders as a badge on a card, not as a sentence.
      expect(t.projects.workInProgress.length, `${locale} badge too long`).toBeLessThanOrEqual(24);
      expect(t.projects.workInProgress).not.toContain('.');
    }
    expect(es.projects.workInProgress).not.toBe(en.projects.workInProgress);
  });
});

describe('project link labels', () => {
  /**
   * Read off the production schema object, not a list retyped here. The schema
   * accepts four external link types; the dictionaries named only two, so a
   * project declaring a paper or article link rendered nothing and nothing
   * failed. Driving the loop from `projectLinksSchema.shape` means a fifth link
   * type added to the schema fails here until it has words in both locales.
   */
  const linkTypes = Object.keys(projectLinksSchema.shape);

  const a11yKeyFor = (type: string) =>
    `project${type.replace(/^./, (c) => c.toUpperCase())}Label` as keyof UIStrings['a11y'];

  it('names every link type the schema accepts, visibly and accessibly, in both locales', () => {
    expect(linkTypes.length).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      const visibleLabels = t.projects as unknown as Record<string, string | undefined>;
      const a11yLabels = t.a11y as unknown as Record<string, ((title: string) => string) | undefined>;
      for (const type of linkTypes) {
        expect(visibleLabels[type], `${locale} projects.${type}`).toBeTruthy();
        const accessible = a11yLabels[a11yKeyFor(type)];
        expect(accessible, `${locale} a11y.${a11yKeyFor(type)}`).toBeTypeOf('function');
        expect(accessible?.('Augmenta'), `${locale} a11y.${a11yKeyFor(type)}`).toContain('Augmenta');
      }
    }
  });

  it('gives each link type a distinct label and a distinct accessible name', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      const visibleLabels = t.projects as unknown as Record<string, string | undefined>;
      const a11yLabels = t.a11y as unknown as Record<string, ((title: string) => string) | undefined>;
      const visible = linkTypes.map((type) => visibleLabels[type]);
      const accessible = linkTypes.map((type) => a11yLabels[a11yKeyFor(type)]?.('Augmenta'));
      expect(new Set(visible).size, `${locale} duplicate link labels`).toBe(linkTypes.length);
      expect(new Set(accessible).size, `${locale} duplicate link a11y names`).toBe(linkTypes.length);
    }
  });

  it('gives the related-work heading its own words, not the section heading it borrowed', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      expect(t.projects.relatedWork, `${locale} projects.relatedWork`).toBeTruthy();
      expect(t.projects.relatedWork, `${locale} still borrows projects.heading`).not.toBe(t.projects.heading);
    }
  });
});
