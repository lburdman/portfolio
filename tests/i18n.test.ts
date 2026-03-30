import { describe, it, expect } from 'vitest';
import { en } from '../src/i18n/en';
import { es } from '../src/i18n/es';
import type { UIStrings } from '../src/i18n/types';

/**
 * Recursively collect all leaf-level string keys from an object.
 */
function collectKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    collectKeys(value, prefix ? `${prefix}.${key}` : key),
  );
}

/**
 * Recursively collect all leaf-level values from an object.
 */
function collectValues(obj: unknown): unknown[] {
  if (typeof obj !== 'object' || obj === null) return [obj];
  if (Array.isArray(obj)) return obj.flatMap((item) => collectValues(item));
  return Object.values(obj as Record<string, unknown>).flatMap((v) => collectValues(v));
}

describe('i18n — EN strings', () => {
  it('has no empty string values', () => {
    const values = collectValues(en);
    const emptyStrings = values.filter((v) => v === '');
    expect(emptyStrings).toHaveLength(0);
  });

  it('has non-empty nav labels', () => {
    for (const [key, value] of Object.entries(en.nav)) {
      expect(value, `nav.${key} is empty`).toBeTruthy();
    }
  });

  it('has hero section with required fields', () => {
    expect(en.hero.name).toBe('Lucas Burdman');
    expect(en.hero.tagline).toBeTruthy();
    expect(en.hero.intro).toBeTruthy();
    expect(en.hero.ctaProjects).toBeTruthy();
    expect(en.hero.ctaResume).toBeTruthy();
  });

  it('has leadership items with all required fields', () => {
    for (const [key, item] of Object.entries(en.leadership.items)) {
      expect(item.role, `leadership.${key}.role`).toBeTruthy();
      expect(item.org, `leadership.${key}.org`).toBeTruthy();
      expect(item.period, `leadership.${key}.period`).toBeTruthy();
      expect(item.description, `leadership.${key}.description`).toBeTruthy();
    }
  });

  it('has at least one interest item', () => {
    expect(en.about.interests.length).toBeGreaterThan(0);
  });
});

describe('i18n — ES strings', () => {
  it('has no empty string values', () => {
    const values = collectValues(es);
    const emptyStrings = values.filter((v) => v === '');
    expect(emptyStrings).toHaveLength(0);
  });

  it('has non-empty nav labels', () => {
    for (const [key, value] of Object.entries(es.nav)) {
      expect(value, `nav.${key} (ES) is empty`).toBeTruthy();
    }
  });

  it('has correct language switcher labels', () => {
    expect(en.lang.current).toBe('EN');
    expect(en.lang.switchTo).toBe('Español');
    expect(es.lang.current).toBe('ES');
    expect(es.lang.switchTo).toBe('English');
  });

  it('has same number of interest items as EN', () => {
    expect(es.about.interests.length).toBe(en.about.interests.length);
  });

  it('has same number of leadership items as EN', () => {
    const enKeys = Object.keys(en.leadership.items);
    const esKeys = Object.keys(es.leadership.items);
    expect(esKeys).toEqual(enKeys);
  });
});

describe('i18n — Key parity between EN and ES', () => {
  it('ES has all the same top-level keys as EN', () => {
    // Cast through unknown to avoid direct UIStrings → Record incompatibility
    const enKeys = Object.keys(en as unknown as Record<string, unknown>);
    const esKeys = Object.keys(es as unknown as Record<string, unknown>);
    expect(esKeys.sort()).toEqual(enKeys.sort());
  });

  it('ES has all the same nested keys as EN', () => {
    const enKeys = collectKeys(en as unknown).sort();
    const esKeys = collectKeys(es as unknown).sort();
    expect(esKeys).toEqual(enKeys);
  });

  it('EN and ES hero have same set of keys', () => {
    const enHeroKeys = Object.keys(en.hero).sort();
    const esHeroKeys = Object.keys(es.hero).sort();
    expect(esHeroKeys).toEqual(enHeroKeys);
  });

  it('EN and ES contact have same email', () => {
    expect(en.contact.email).toBe(es.contact.email);
  });

  it('EN and ES contact have same github', () => {
    expect(en.contact.github).toBe(es.contact.github);
  });
});

describe('UIStrings type coverage', () => {
  it('EN satisfies UIStrings type', () => {
    const check: UIStrings = en;
    expect(check).toBeDefined();
  });

  it('ES satisfies UIStrings type', () => {
    const check: UIStrings = es;
    expect(check).toBeDefined();
  });
});
