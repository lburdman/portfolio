export type Locale = 'en' | 'es';
export const LOCALES: readonly Locale[] = ['en', 'es'] as const;
export const DEFAULT_LOCALE: Locale = 'en';

export interface UIStrings {
  // Navigation
  nav: {
    home: string;
    projects: string;
    about: string;
    notes: string;
    contact: string;
  };
  // Hero
  hero: {
    name: string;
    tagline: string;
    intro: string;
    ctaProjects: string;
    ctaNotes: string;
    ctaContact: string;
    ctaResume: string;
  };
  // Technical Areas section
  areas: {
    heading: string;
    subtitle: string;
    items: {
      ml: string;
      appliedAI: string;
      forecasting: string;
      privacyLLM: string;
      quantumML: string;
      backend: string;
    };
  };
  // Projects section
  projects: {
    heading: string;
    subtitle: string;
    viewAll: string;
    viewProject: string;
    github: string;
    demo: string;
    filterAll: string;
  };
  // Leadership section
  leadership: {
    heading: string;
    subtitle: string;
    items: {
      qiskit: {
        role: string;
        org: string;
        period: string;
        description: string;
      };
      digitalSystems: {
        role: string;
        org: string;
        period: string;
        description: string;
      };
      quantumComms: {
        role: string;
        org: string;
        period: string;
        description: string;
      };
    };
  };
  // Notes / Writing section
  notes: {
    heading: string;
    subtitle: string;
    placeholder: string;
    comingSoon: string;
  };
  // About section
  about: {
    heading: string;
    bio: string;
    currently: string;
    interests: string[];
  };
  // Contact section
  contact: {
    heading: string;
    subtitle: string;
    email: string;
    github: string;
    linkedin: string;
    resume: string;
  };
  // Footer
  footer: {
    tagline: string;
    madeWith: string;
  };
  // Language switcher
  lang: {
    switchTo: string;
    current: string;
  };
  // Project detail page
  projectDetail: {
    backToProjects: string;
    viewOnGithub: string;
    viewDemo: string;
    technologies: string;
  };
  // 404
  notFound: {
    heading: string;
    message: string;
    backHome: string;
  };
}
