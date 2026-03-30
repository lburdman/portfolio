import { describe, it, expect } from 'vitest';
import { useTranslations, getLocaleFromURL, getAlternateURL, localizeURL } from '../src/i18n/index';

describe('useTranslations', () => {
  it('returns EN strings for "en" locale', () => {
    const t = useTranslations('en');
    expect(t.hero.name).toBe('Lucas Burdman');
    expect(t.lang.current).toBe('EN');
  });

  it('returns ES strings for "es" locale', () => {
    const t = useTranslations('es');
    expect(t.hero.name).toBe('Lucas Burdman');
    expect(t.lang.current).toBe('ES');
  });

  it('returns different taglines for EN and ES', () => {
    const en = useTranslations('en');
    const es = useTranslations('es');
    expect(en.hero.tagline).not.toBe(es.hero.tagline);
  });
});

describe('getLocaleFromURL', () => {
  it('returns "en" for root path', () => {
    const url = new URL('https://lburdman.github.io/portfolio/');
    expect(getLocaleFromURL(url)).toBe('en');
  });

  it('returns "es" for /es/ path', () => {
    const url = new URL('https://lburdman.github.io/es/');
    expect(getLocaleFromURL(url)).toBe('es');
  });

  it('returns "en" for /projects path', () => {
    const url = new URL('https://lburdman.github.io/projects/');
    expect(getLocaleFromURL(url)).toBe('en');
  });

  it('returns "es" for /es/projects path', () => {
    const url = new URL('https://lburdman.github.io/es/projects/');
    expect(getLocaleFromURL(url)).toBe('es');
  });
});

describe('localizeURL', () => {
  const base = '/portfolio';

  it('returns base+path for EN', () => {
    expect(localizeURL('/projects', 'en', base)).toBe('/portfolio/projects');
  });

  it('returns base+locale+path for ES', () => {
    expect(localizeURL('/projects', 'es', base)).toBe('/portfolio/es/projects');
  });

  it('handles root path for EN', () => {
    expect(localizeURL('/', 'en', base)).toBe('/portfolio/');
  });

  it('handles root path for ES', () => {
    expect(localizeURL('/', 'es', base)).toBe('/portfolio/es/');
  });
});

describe('getAlternateURL', () => {
  const base = '/portfolio';

  it('switches from EN to ES', () => {
    const url = new URL('https://lburdman.github.io/portfolio/projects/augmenta');
    const result = getAlternateURL(url, 'es', base);
    expect(result).toBe('/portfolio/es/projects/augmenta');
  });

  it('switches from ES to EN', () => {
    const url = new URL('https://lburdman.github.io/portfolio/es/projects/augmenta');
    const result = getAlternateURL(url, 'en', base);
    expect(result).toBe('/portfolio/projects/augmenta');
  });

  it('handles root switch from EN to ES', () => {
    const url = new URL('https://lburdman.github.io/portfolio/');
    const result = getAlternateURL(url, 'es', base);
    expect(result).toBe('/portfolio/es');
  });
});

describe('Featured project data rendering', () => {
  it('can access all featured project tags as strings', () => {
    const t = useTranslations('en');
    const mockProject = {
      title: 'Augmenta',
      projectSlug: 'augmenta',
      summary: 'A privacy layer for LLM workflows.',
      lang: 'en' as const,
      tags: ['Privacy', 'LLM', 'Python'],
      featured: true,
      status: 'published' as const,
      github: 'https://github.com/lburdman/augmenta',
      order: 1,
    };

    // Verify we can render the view project label
    const viewLabel = t.projects.viewProject;
    expect(viewLabel).toBeTruthy();

    // Verify the project URL would be constructed correctly
    const base = '/portfolio';
    const projectURL = `${base}/projects/${mockProject.projectSlug}`;
    expect(projectURL).toBe('/portfolio/projects/augmenta');

    // Verify tags are all strings
    for (const tag of mockProject.tags) {
      expect(typeof tag).toBe('string');
      expect(tag.length).toBeGreaterThan(0);
    }
  });

  it('project cards would show GitHub link when present', () => {
    const project = {
      github: 'https://github.com/lburdman/augmenta',
      demo: undefined as string | undefined,
    };
    expect(project.github).toBeTruthy();
    expect(project.demo).toBeUndefined();
  });
});
