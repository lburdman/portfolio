import type { UIStrings } from './types';

export const en: UIStrings = {
  nav: {
    home: 'Home',
    projects: 'Projects',
    about: 'About',
    contact: 'Contact',
  },

  sections: {
    hero: 'Intro',
    layers: 'Layers',
    worlds: 'Technical worlds',
    projects: 'Selected projects',
  },

  hero: {
    name: 'Lucas Burdman',
    role: 'Electronic Engineer · AI Engineer',
    positioning:
      'I build across layers — from signals and hardware, through digital logic and computation, to models and intelligent systems.',
    ctaProjects: 'See projects',
    ctaContact: 'Get in touch',
    ctaResume: 'Résumé',
  },

  layers: {
    heading: 'I build across layers',
    narrative:
      'Each layer sets the limits of the one above it. Knowing what happens two layers down changes the decisions you make at the top.',
    items: {
      ai: {
        layer: 'MODELS',
        description:
          'Machine learning and LLM systems, and the evaluation discipline that says whether they actually work.',
      },
      quantum: {
        layer: 'COMPUTATION',
        description: 'Quantum circuits and hybrid models, studied at the scale real hardware can run today.',
      },
      fpga: {
        layer: 'DIGITAL LOGIC',
        description:
          'Deterministic logic, timing and routing — where an algorithm stops being code and becomes a circuit.',
      },
      electronics: {
        layer: 'HARDWARE',
        description:
          'The physical signal chain: filters, conversion and the path a measurement takes before anything can compute on it.',
      },
      audio: {
        layer: 'SIGNALS',
        description: 'Sound treated as a measurable signal — spectra, resonance and the processing that shapes them.',
      },
    },
  },

  worlds: {
    heading: 'Technical Worlds',
    subtitle: 'One system seen from five layers, from the models on top to the physics underneath.',
    items: {
      ai: {
        name: 'AI & Machine Learning',
        summary:
          'Applied ML and LLM systems: privacy tooling, demand forecasting and structured model outputs, built to survive contact with production.',
      },
      quantum: {
        name: 'Quantum Computing',
        summary:
          'Hybrid classical–quantum models and quantum information — taught at FIUBA, and tested on IBM Quantum hardware rather than only in simulation.',
      },
      fpga: {
        name: 'FPGA & Digital Design',
        summary:
          'Digital systems, HDL and synthesis: the layer where a specification becomes deterministic hardware. Also the course I assist at FIUBA.',
      },
      electronics: {
        name: 'Electronics',
        summary:
          'Circuit design and instrumentation — the sensor-to-processor chain, read the way engineering documentation reads.',
      },
      audio: {
        name: 'Audio & Acoustics',
        summary:
          'Signal processing for sound: spectrogram representations, feature extraction and emotion classification from speech.',
      },
    },
  },

  projects: {
    heading: 'Selected Projects',
    subtitle: 'The work that shows most clearly how these layers connect.',
    viewAll: 'All projects',
    viewProject: 'View project',
    filterAll: 'All',
    workInProgress: 'In progress',
    empty: 'No projects to show here yet.',
    stack: 'Stack',
    links: 'Links',
    domains: 'Domains',
    github: 'GitHub',
    demo: 'Live demo',
    paper: 'Paper',
    article: 'Article',
    relatedWork: 'Related work',
    backToList: 'Back to projects',
  },

  about: {
    heading: 'About',
    bio: "I'm an Electronic Engineer with a foundation in mathematics, physics and computational thinking, working across AI systems, automation, data workflows and software products. My work combines experimentation, technical rigor and a production-minded approach to implementation.",
    portraitAlt: 'Lucas Burdman, Electronic Engineer and AI Engineer.',
    facts: ['Electronic Engineer', 'FIUBA', 'Buenos Aires'],
    currentlyHeading: 'Currently exploring',
    interests: [
      'LLM systems in production',
      'Quantum ML at realistic hardware constraints',
      'Time series forecasting pipelines',
      'Privacy-preserving AI architectures',
    ],
    teachingHeading: 'Teaching & community',
    roles: {
      qiskit: {
        role: 'Lead Organizer',
        org: 'Qiskit Fall Fest FIUBA',
        period: '2023 – Present',
        description:
          'Led end-to-end delivery of an IBM-supported annual quantum computing event — 30+ talks, hybrid sessions, a closing hackathon, and 500+ attendees. Responsible for program design, speaker coordination, logistics, and community engagement.',
      },
      digitalSystems: {
        role: 'Teaching Assistant',
        org: 'Digital Systems — FIUBA',
        period: '2022 – Present',
        description:
          'Teaching assistant for Digital Systems at the School of Engineering of the University of Buenos Aires. Supporting practical labs, student guidance, and assessment.',
      },
      quantumComms: {
        role: 'Teaching Assistant',
        org: 'Quantum Computation and Communications — FIUBA',
        period: '2023 – Present',
        description:
          'Teaching assistant for Quantum Computation and Communications. Covering quantum circuit fundamentals, quantum information theory, and their relationship to modern cryptographic and communication systems.',
      },
    },
  },

  contact: {
    heading: 'Contact',
    invitation: "Let's build something interesting.",
    note: 'Email is the fastest way to reach me. GitHub and LinkedIn are below.',
    emailLabel: 'Email',
    githubLabel: 'GitHub',
    linkedinLabel: 'LinkedIn',
    resumeLabel: 'Résumé',
  },

  footer: {
    tagline: 'Built across layers.',
    rights: 'All rights reserved.',
    builtWith: 'Built with Astro and Tailwind CSS.',
  },

  lang: {
    name: 'English',
    short: 'EN',
    switchTo: 'Español',
    switchToShort: 'ES',
  },

  notFound: {
    heading: 'Page not found',
    message: "This page doesn't exist — it may have moved, or the link may be incomplete.",
    backHome: 'Back to home',
  },

  a11y: {
    primaryNavigation: 'Primary navigation',
    mobileNavigation: 'Mobile navigation',
    footerNavigation: 'Footer navigation',
    toggleMenu: 'Open menu',
    closeMenu: 'Close menu',
    homeLink: 'Lucas Burdman — home',
    skipToContent: 'Skip to content',
    languageSwitcher: 'Change language',
    currentLanguage: 'Current language: English',
    projectGithubLabel: (title: string) => `${title} on GitHub`,
    projectDemoLabel: (title: string) => `Live demo of ${title}`,
    projectPaperLabel: (title: string) => `Paper about ${title}`,
    projectArticleLabel: (title: string) => `Article about ${title}`,
    decorativeVisual: 'Decorative visual',
    worldsInstructions:
      'Use the left and right arrow keys to move between technical worlds, or Tab to reach each one in turn.',
  },

  seo: {
    ogImageAlt:
      'Share card with the name Lucas Burdman, the role Electronic Engineer and AI Engineer, and a faint signal-trace motif.',
    home: {
      title: 'Lucas Burdman — Electronic Engineer & AI Engineer',
      description:
        'Portfolio of Lucas Burdman: machine learning and LLM systems, quantum computing, digital design, electronics and audio signal processing.',
    },
    projectsIndex: {
      title: 'Projects — Lucas Burdman',
      description:
        'Selected engineering projects across applied AI, forecasting, quantum machine learning and signal processing.',
    },
    projects: {
      title: (projectTitle: string) => `${projectTitle} — Lucas Burdman`,
      description: (projectSummary: string) => projectSummary,
    },
    about: {
      title: 'About — Lucas Burdman',
      description:
        'Electronic Engineer and AI Engineer based in Buenos Aires. Teaching assistant at FIUBA and lead organizer of Qiskit Fall Fest FIUBA.',
    },
    notFound: {
      title: 'Page not found — Lucas Burdman',
      description: 'This page does not exist.',
    },
  },
};
