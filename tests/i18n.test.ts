import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DOMAIN_IDS } from '../src/config/domains';
import { SECTION_IDS } from '../src/config/navigation';
import { projectLinksSchema } from '../src/content/schema';
import { WRITING_KINDS, writingLinksSchema } from '../src/content/writing-schema';
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

/**
 * Every committed figure under a content tree, as `<slug>/<file stem>` keys.
 *
 * Read off the filesystem rather than retyped, so dropping an image into a
 * `media/` directory publishes it AND fails the suite until it has words in
 * both locales. Shared by the projects and writing sweeps below because it is
 * one rule about one directory shape — two copies would be two chances for the
 * newer collection's sweep to be quietly weaker than the older one's.
 */
function mediaKeysUnder(collectionDir: string): string[] {
  return readdirSync(collectionDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((item) => {
      const mediaDir = join(collectionDir, item.name, 'media');
      if (!existsSync(mediaDir)) return [];
      return readdirSync(mediaDir)
        .filter((file) => !file.startsWith('.'))
        .map((file) => `${item.name}/${file.replace(/\.\w+$/, '')}`);
    })
    .sort();
}

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
      for (const key of ['home', 'projects', 'writing', 'about', 'contact'] as const) {
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

describe('the contact group owns no heading', () => {
  it('has no `contact.heading`, in either locale', () => {
    // It went dead when `'contact'` joined `SECTION_IDS`: the margin word is
    // now `sections.contact` and the `<h2>` is `contact.invitation`, so the
    // key was a second, unread source of truth for a heading that already has
    // one. Same shape as the `nav.notes` guard above, and for the same reason.
    for (const locale of LOCALES) {
      expect(Object.keys(DICTIONARIES[locale].contact), `${locale} contact.heading is back`).not.toContain('heading');
    }
  });

  it('names the section from the sections group, which every other section also uses', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      expect(t.sections.contact, `${locale} sections.contact`).toBeTruthy();
      expect(t.contact.invitation, `${locale} contact.invitation`).toBeTruthy();
      // The visible heading is a sentence, not the section word repeated.
      expect(t.contact.invitation, `${locale} contact.invitation restates the margin word`).not.toBe(
        t.sections.contact,
      );
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

  it('includes contact, so the section stops needing an override to render', () => {
    // P0 #7 built the Contact section; it could not join the numbered sequence
    // until `sections.contact` existed, because `UIStrings['sections']` is a
    // `Record<SectionId, string>`. It is last, so its figure number is `04`.
    expect(SECTION_IDS).toContain('contact');
    expect(SECTION_IDS.indexOf('contact')).toBe(SECTION_IDS.length - 1);
    expect(en.sections.contact).toBe('Contact');
    expect(es.sections.contact).toBe('Contacto');
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
  // `writingIndex` joined this list with the writing section. It is the only
  // way the new page's title and description are held to the same 60/160 SERP
  // bounds every other static page is — an unlisted page is an unguarded one.
  const staticPages = ['home', 'projectsIndex', 'writingIndex', 'about', 'notFound'] as const;

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

describe('the thesis is stated once', () => {
  /**
   * REDESIGN_DECISIONS P5 #19: the first two screens said the same thing three
   * times — `hero.positioning`, then `layers.heading` as a *verbatim substring*
   * of it, then `worlds.subtitle` restating it a third time over a list of the
   * same five layers the Hero already names in order.
   *
   * Substring equality alone would not have caught the third telling, so this
   * compares three-word shingles: any phrase of three consecutive words shared
   * by two of the three strings is repetition, whatever the wording around it.
   */
  const shingles = (sentence: string, size = 3): Set<string> => {
    const words = sentence
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean);
    const grams = new Set<string>();
    for (let i = 0; i + size <= words.length; i += 1) grams.add(words.slice(i, i + size).join(' '));
    return grams;
  };

  it('never repeats a three-word phrase across the three opening strings', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      const opening = {
        'hero.positioning': t.hero.positioning,
        'layers.heading': t.layers.heading,
        'worlds.subtitle': t.worlds.subtitle,
      };
      const entries = Object.entries(opening);
      for (const [aKey, a] of entries) {
        for (const [bKey, b] of entries) {
          if (aKey >= bKey) continue;
          const shared = [...shingles(a)].filter((gram) => shingles(b).has(gram));
          expect(shared, `${locale}: ${aKey} and ${bKey} repeat each other`).toEqual([]);
        }
      }
    }
  });

  it('does not carry the layers heading inside the hero sentence', () => {
    // The exact defect: `layers.heading` was "I build across layers", which
    // `hero.positioning` opens with.
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      expect(
        t.hero.positioning.toLowerCase(),
        `${locale} hero.positioning still contains layers.heading`,
      ).not.toContain(t.layers.heading.toLowerCase());
    }
  });

  it('keeps layers.narrative, the one line that advances the argument', () => {
    // Deliberately asserted on content: the heading above it was rewritten and
    // this string was not, and that asymmetry is the decision.
    expect(en.layers.narrative).toContain('two layers down');
    expect(es.layers.narrative).toContain('dos capas más abajo');
  });
});

describe('the credibility strip', () => {
  it('carries exactly three credentials in both locales', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      expect(t.hero.credentials, `${locale} hero.credentials`).toHaveLength(3);
      for (const credential of t.hero.credentials) {
        expect(credential.trim(), `${locale} empty credential`).toBeTruthy();
      }
    }
  });

  it('shows the same three in the Hero and in About, with no second copy to drift', () => {
    // `about.facts` used to be `Electronic Engineer / FIUBA / Buenos Aires`,
    // two of which restated the `<h1>` directly above them.
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      expect(t.about.facts, `${locale} about.facts`).toEqual(t.hero.credentials);
      expect(t.about.facts, `${locale} about.facts is a copy, not the trio`).toBe(t.hero.credentials);
    }
  });

  it('translates the degree and the MicroMasters but not the certification name', () => {
    // A translated certification name cannot be looked up, which defeats the
    // only reason the strip exists.
    expect(es.hero.credentials[0]).not.toBe(en.hero.credentials[0]);
    expect(es.hero.credentials[1]).not.toBe(en.hero.credentials[1]);
    expect(es.hero.credentials[2]).toBe(en.hero.credentials[2]);
  });

  it('names an issuer on every line, so each one is checkable', () => {
    const issuers = [/UBA/, /MITx/i, /Claude/i];
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      issuers.forEach((issuer, index) => {
        expect(t.hero.credentials[index], `${locale} credential ${index} names no issuer`).toMatch(issuer);
      });
    }
  });

  it('stays short enough to render as one mono line, not a paragraph', () => {
    for (const locale of LOCALES) {
      for (const credential of DICTIONARIES[locale].hero.credentials) {
        expect(credential.length, `${locale} credential too long: ${credential}`).toBeLessThanOrEqual(56);
        expect(credential, `${locale} credential is a sentence`).not.toContain('.');
      }
    }
  });
});

describe('project media alt text', () => {
  /**
   * Read off the committed `media/` directories, not a list retyped here.
   *
   * `ProjectCard.astro` and the project detail page both fall back to the
   * localized title when a key is missing, so a figure with no alt text fails
   * nothing at runtime and ships a vague description instead of a real one.
   * Driving the loop from the filesystem is what makes that loud: dropping an
   * image into `media/` publishes it, and now it also fails this test until it
   * has words in both locales.
   */
  const PROJECTS_DIR = fileURLToPath(new URL('../src/content/projects', import.meta.url));

  const mediaKeys = mediaKeysUnder(PROJECTS_DIR);

  it('finds the committed figures it is meant to be describing', () => {
    // Guards the guard: an empty sweep would make every assertion below vacuous.
    expect(mediaKeys.length, 'no project media found — this suite would pass on nothing').toBeGreaterThan(0);
  });

  it('describes every committed figure, in both locales, keyed <slug>/<file stem>', () => {
    for (const locale of LOCALES) {
      const alts = DICTIONARIES[locale].projects.mediaAlt;
      for (const key of mediaKeys) {
        const alt = alts[key];
        expect(alt, `${locale} projects.mediaAlt['${key}'] missing`).toBeTruthy();
        expect(alt?.length ?? 0, `${locale} projects.mediaAlt['${key}'] too terse`).toBeGreaterThan(60);
      }
    }
  });

  it('describes no figure that is not committed', () => {
    // The other direction: an entry left behind after an image was deleted is
    // dead copy that reads as though the figure is still there.
    for (const locale of LOCALES) {
      expect(Object.keys(DICTIONARIES[locale].projects.mediaAlt).sort(), `${locale} orphan mediaAlt keys`).toEqual(
        mediaKeys,
      );
    }
  });

  it('names the series a sighted reader can see in the forecast plot', () => {
    for (const locale of LOCALES) {
      const alt = DICTIONARIES[locale].projects.mediaAlt['energy-forecasting/prediction-interval'];
      expect(alt).toMatch(/XGBoost/);
      expect(alt).toMatch(/95\s?%/);
    }
    expect(en.projects.mediaAlt['energy-forecasting/prediction-interval']).toMatch(/conformal/i);
    expect(es.projects.mediaAlt['energy-forecasting/prediction-interval']).toMatch(/conformal/i);
  });

  it('never calls the forecast band a quantile interval', () => {
    // P0 #3: the repo does conformal prediction; quantile regression is Future
    // Work. The case-study copy was corrected for exactly this claim, and alt
    // text is a technical claim like any other — the same trap, one file over.
    for (const locale of LOCALES) {
      for (const alt of Object.values(DICTIONARIES[locale].projects.mediaAlt)) {
        expect(alt, `${locale} mediaAlt claims quantile`).not.toMatch(/quantile|cuantil/i);
      }
    }
  });

  it('attributes the confusion matrix to the classical baseline, not the hybrid model', () => {
    // No confusion matrix for the QNN exists in any notebook. Alt text that
    // implied one would be a fabricated result, read aloud to the people least
    // able to check it.
    for (const locale of LOCALES) {
      const alt = DICTIONARIES[locale].projects.mediaAlt['quantum-audio/confusion-matrix'];
      expect(alt, `${locale} confusion matrix omits the model`).toMatch(/logistic|logística/i);
      expect(alt, `${locale} confusion matrix implies a quantum result`).not.toMatch(/quantum|cuántic/i);
    }
  });

  it('names the processor the circuit was compiled for, in both locales', () => {
    for (const locale of LOCALES) {
      expect(DICTIONARIES[locale].projects.mediaAlt['quantum-audio/transpiled-circuit']).toContain('ibm_kingston');
    }
  });

  it('is alt text, not a caption arguing a point', () => {
    for (const locale of LOCALES) {
      for (const [key, alt] of Object.entries(DICTIONARIES[locale].projects.mediaAlt)) {
        expect(alt.length, `${locale} projects.mediaAlt['${key}'] too long`).toBeLessThanOrEqual(420);
      }
    }
  });
});

describe('article kind labels', () => {
  it('covers every WRITING_KIND in both locales, and nothing else', () => {
    // `UIStrings['writing']['kinds']` is a `Record<WritingKind, string>`, so a
    // fifth kind added to the schema is already a compile error. This is the
    // runtime half: it also fails if a kind is present but blank.
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      expect(Object.keys(t.writing.kinds).sort()).toEqual([...WRITING_KINDS].sort());
      for (const kind of WRITING_KINDS) {
        expect(t.writing.kinds[kind], `${locale} writing.kinds.${kind}`).toBeTruthy();
      }
    }
  });

  it('gives each kind a distinct label within a locale', () => {
    for (const locale of LOCALES) {
      const labels = WRITING_KINDS.map((kind) => DICTIONARIES[locale].writing.kinds[kind]);
      expect(new Set(labels).size, `${locale} duplicate kind labels`).toBe(WRITING_KINDS.length);
    }
  });

  it('renders as a badge, not a sentence', () => {
    for (const locale of LOCALES) {
      for (const kind of WRITING_KINDS) {
        const label = DICTIONARIES[locale].writing.kinds[kind];
        expect(label.length, `${locale} writing.kinds.${kind} too long`).toBeLessThanOrEqual(24);
        expect(label, `${locale} writing.kinds.${kind} is a sentence`).not.toContain('.');
      }
    }
  });

  it('translates the kinds rather than shipping the English words twice', () => {
    expect(es.writing.kinds.teaching).not.toBe(en.writing.kinds.teaching);
    expect(es.writing.kinds.community).not.toBe(en.writing.kinds.community);
    expect(es.writing.kinds.research).not.toBe(en.writing.kinds.research);
    expect(es.writing.kinds.study).not.toBe(en.writing.kinds.study);
  });
});

describe('article media alt text', () => {
  /**
   * The writing half of the sweep above, driven by the same helper and holding
   * the same contract: every committed photograph described in both locales,
   * no orphans, keyed `<slug>/<file stem>`.
   *
   * It exists separately from the projects sweep because the dictionaries are
   * separate — `writing.mediaAlt` and `projects.mediaAlt` are two open
   * `Record`s, and without this the new collection's images would fall back to
   * the article title with nothing failing anywhere.
   *
   * These are photographs of real rooms, not plots, so the standard the
   * assertions hold them to is the same one the projects sweep holds: describe
   * what is in the frame, never what the event is supposed to have proved.
   */
  const WRITING_DIR = fileURLToPath(new URL('../src/content/writing', import.meta.url));

  const mediaKeys = mediaKeysUnder(WRITING_DIR);

  it('finds the committed photographs it is meant to be describing', () => {
    // Guards the guard: an empty sweep would make every assertion below vacuous.
    expect(mediaKeys.length, 'no writing media found — this suite would pass on nothing').toBeGreaterThan(0);
  });

  it('describes every committed photograph, in both locales, keyed <slug>/<file stem>', () => {
    for (const locale of LOCALES) {
      const alts = DICTIONARIES[locale].writing.mediaAlt;
      for (const key of mediaKeys) {
        const alt = alts[key];
        expect(alt, `${locale} writing.mediaAlt['${key}'] missing`).toBeTruthy();
        expect(alt?.length ?? 0, `${locale} writing.mediaAlt['${key}'] too terse`).toBeGreaterThan(60);
      }
    }
  });

  it('describes no photograph that is not committed', () => {
    for (const locale of LOCALES) {
      expect(Object.keys(DICTIONARIES[locale].writing.mediaAlt).sort(), `${locale} orphan mediaAlt keys`).toEqual(
        mediaKeys,
      );
    }
  });

  it('is alt text, not a caption arguing a point', () => {
    for (const locale of LOCALES) {
      for (const [key, alt] of Object.entries(DICTIONARIES[locale].writing.mediaAlt)) {
        expect(alt.length, `${locale} writing.mediaAlt['${key}'] too long`).toBeLessThanOrEqual(420);
      }
    }
  });

  it('reads the credential printed on the IBM Quantum badge, verbatim, in both locales', () => {
    // The badge is a verifiable credential. Paraphrasing the text on it — or
    // dropping the level — turns something a reader could look up into a claim
    // they have to take on trust.
    for (const locale of LOCALES) {
      const alt = DICTIONARIES[locale].writing.mediaAlt['qiskit-fall-fest-fiuba-2025/ibm-quantum-mentor-badge'];
      expect(alt, `${locale} badge alt`).toContain('IBM Quantum');
      expect(alt, `${locale} badge alt omits the wording on the badge`).toContain('2025 Qiskit Fall Fest Mentor');
      expect(alt, `${locale} badge alt omits the level`).toContain('Advanced');
    }
  });

  it('quotes the poster title as printed, in Spanish, in both locales', () => {
    // The poster is in Spanish. Translating its title into the English alt text
    // would describe a poster that does not exist.
    for (const locale of LOCALES) {
      const alt = DICTIONARIES[locale].writing.mediaAlt['lanet-2025-complex-networks/poster-transfer-learning-quantum'];
      expect(alt, `${locale} poster alt`).toContain('Transfer Learning para Redes Neuronales');
    }
  });

  it('translates the descriptions rather than shipping the English twice', () => {
    for (const key of mediaKeys) {
      expect(es.writing.mediaAlt[key], `es writing.mediaAlt['${key}'] is the English string`).not.toBe(
        en.writing.mediaAlt[key],
      );
    }
  });
});

describe('Spanish is a translation, not a copy', () => {
  it('differs from English on the strings a machine copy would leave identical', () => {
    expect(es.nav.projects).not.toBe(en.nav.projects);
    expect(es.nav.writing).not.toBe(en.nav.writing);
    expect(es.nav.about).not.toBe(en.nav.about);
    expect(es.writing.heading).not.toBe(en.writing.heading);
    expect(es.writing.subtitle).not.toBe(en.writing.subtitle);
    expect(es.writing.empty).not.toBe(en.writing.empty);
    expect(es.seo.writingIndex.title).not.toBe(en.seo.writingIndex.title);
    expect(es.a11y.articleNavigation).not.toBe(en.a11y.articleNavigation);
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

describe('article link labels', () => {
  /**
   * The writing twin of the projects sweep above, and it exists for the same
   * reason that one does: `writingLinksSchema` accepts four external
   * destinations, and a type the dictionaries cannot name is a link the page
   * renders as nothing while nothing fails. Driven by the schema's own shape,
   * so a fifth link type added there fails here until it has words in both
   * locales.
   */
  const linkTypes = Object.keys(writingLinksSchema.shape);

  const a11yKeyFor = (type: string) =>
    `article${type.replace(/^./, (c) => c.toUpperCase())}Label` as keyof UIStrings['a11y'];

  it('names every link type the schema accepts, visibly and accessibly, in both locales', () => {
    expect(linkTypes.length).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      const visibleLabels = t.writing as unknown as Record<string, string | undefined>;
      const a11yLabels = t.a11y as unknown as Record<string, ((title: string) => string) | undefined>;
      for (const type of linkTypes) {
        expect(visibleLabels[type], `${locale} writing.${type}`).toBeTruthy();
        const accessible = a11yLabels[a11yKeyFor(type)];
        expect(accessible, `${locale} a11y.${a11yKeyFor(type)}`).toBeTypeOf('function');
        expect(accessible?.('Qiskit Fall Fest'), `${locale} a11y.${a11yKeyFor(type)}`).toContain('Qiskit Fall Fest');
      }
    }
  });

  it('gives each link type a distinct label and a distinct accessible name', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      const visibleLabels = t.writing as unknown as Record<string, string | undefined>;
      const a11yLabels = t.a11y as unknown as Record<string, ((title: string) => string) | undefined>;
      const visible = linkTypes.map((type) => visibleLabels[type]);
      const accessible = linkTypes.map((type) => a11yLabels[a11yKeyFor(type)]?.('Qiskit Fall Fest'));
      expect(new Set(visible).size, `${locale} duplicate link labels`).toBe(linkTypes.length);
      expect(new Set(accessible).size, `${locale} duplicate link a11y names`).toBe(linkTypes.length);
    }
  });

  it('does not reuse the project link accessible names, which say a different thing', () => {
    // "Paper about X" is a paper *about* a project; "Paper presented in X" is
    // the paper an article presented. Same word, different sentence.
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      expect(t.a11y.articlePaperLabel('X')).not.toBe(t.a11y.projectPaperLabel('X'));
    }
  });
});

describe('the writing section is not the dead notes key', () => {
  it('routes and labels itself as writing, in both locales', () => {
    // AUDIT.md 5.4 removed a dead `nav.notes`; the guard above still asserts it
    // never comes back. A live section reusing that name would make the guard
    // fail for the wrong reason and then be "fixed" by deleting it.
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      expect(Object.keys(t.nav)).toContain('writing');
      expect(t.nav.writing, `${locale} nav.writing`).toBeTruthy();
      expect(t.writing.heading, `${locale} writing.heading`).toBeTruthy();
      expect(t.writing.empty, `${locale} writing.empty`).toBeTruthy();
    }
  });

  it('says what will appear in the empty state rather than that nothing was found', () => {
    // Design decision, asserted because it is the kind of copy that gets
    // replaced with "No posts found" by the next person in a hurry.
    for (const locale of LOCALES) {
      const empty = DICTIONARIES[locale].writing.empty;
      expect(empty.length, `${locale} writing.empty is a stub`).toBeGreaterThan(30);
    }
  });

  it('gives the writing section its own words, not the projects section reworded', () => {
    for (const locale of LOCALES) {
      const t = DICTIONARIES[locale];
      expect(t.writing.heading).not.toBe(t.projects.heading);
      expect(t.writing.subtitle).not.toBe(t.projects.subtitle);
      expect(t.writing.empty).not.toBe(t.projects.empty);
      expect(t.writing.backToList).not.toBe(t.projects.backToList);
    }
  });
});
