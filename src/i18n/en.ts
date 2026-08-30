import type { CredentialTrio, UIStrings } from './types';

/**
 * The three credentials, defined once and referenced from both the Hero strip
 * and `about.facts`, so the two places on the site that carry provenance
 * cannot disagree about what it is.
 *
 * Ordered degree → MicroMasters → certification. `Claude Certified Architect`
 * keeps its issued English name in the Spanish dictionary too: it is a proper
 * noun, and a translated certification name is one nobody can look up.
 */
const CREDENTIALS = [
  'Electronic Engineering · UBA',
  'MITx MicroMasters · Statistics & Data Science',
  'Claude Certified Architect · Foundations',
] as const satisfies CredentialTrio;

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
    contact: 'Contact',
  },

  hero: {
    name: 'Lucas Burdman',
    role: 'Electronic Engineer · AI Engineer',
    positioning:
      'I build across layers — from signals and hardware, through digital logic and computation, to models and intelligent systems.',
    credentials: CREDENTIALS,
    ctaProjects: 'See projects',
    ctaContact: 'Get in touch',
    ctaResume: 'Résumé',
  },

  layers: {
    heading: 'Down to the physics',
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
    subtitle: 'Five areas of work. What each one actually involves.',
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
          'Circuit design and instrumentation: the chain from sensor to processor. The foundation the other four layers rest on, and the subject of the Electronic Engineering degree behind them.',
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
    mediaAlt: {
      'augmenta/trust-boundary':
        "Three versions of the same message as it moves through the privacy layer. From the client: 'Contact me at john.doe@example.com'. Past a marked trust boundary the LLM gateway sees only 'Contact me at [[AUG:EMAIL_ADDRESS:1]]'. Rehydrated, the original address returns. Footnotes cite the two tests asserting no raw PII reaches the gateway and no plaintext is stored.",
      'room-acoustics/modal-distribution':
        'Three rows of vertical hairlines on a shared frequency axis from 50 to 300 Hz, one row per mode class: 13 axial, 42 tangential, 37 oblique. Tick height and darkness encode modal energy weight, so the sparse axial row is tallest and darkest. A dashed marker at 57.17 Hz labels the room\u2019s lowest mode. The axial modes are few and widely spaced; the oblique modes crowd together above roughly 200 Hz.',
      'energy-forecasting/prediction-interval':
        'Line chart of German electricity load over 14 days in August 2019: actual load in black, XGBoost forecast dashed, and a shaded 95% conformal prediction interval around it. The forecast tracks the daily peaks and troughs closely; the interval widens where the model is least certain.',
      'energy-forecasting/backtest-rmse-by-fold':
        'Line chart, RMSE by fold across a rolling-origin backtest, comparing four models over five folds. The naive baseline stays near 8,500 throughout; Ridge sits between 4,400 and 5,500; RandomForest and XGBoost start near 3,400 and fall to roughly 1,200–1,400 by the third fold.',
      // A logistic-regression baseline, not the hybrid quantum model: no
      // confusion matrix for the QNN exists in any notebook, so this must not
      // be worded in a way that reads as a quantum result.
      'quantum-audio/confusion-matrix':
        'Six-by-six confusion matrix for a logistic-regression baseline over the CREMA-D emotion classes HAP, SAD, ANG, DIS, FEA and NEU. The diagonal is the darkest band, anger is the strongest class, and disgust and fear are the most often confused with the rest.',
      'quantum-audio/transpiled-circuit':
        "Two-qubit circuit diagram captioned 'Transpiled for ibm_kingston': a long chain of Rz and square-root-of-X gates on qubits q0 and q1, separated by barriers, with two two-qubit entangling gates and a measurement of each qubit into a 2-bit classical register.",
    },
  },

  about: {
    heading: 'About',
    bio: "I'm an Electronic Engineer from UBA, working on AI systems in production. My background is signals, circuits and digital design; most of my time now goes to machine learning and LLM systems, and to the evaluation work that decides whether they are good enough to ship. I'm a teaching assistant in Digital Systems and in Quantum Computation and Communications at FIUBA.",
    portraitAlt: 'Lucas Burdman, Electronic Engineer and AI Engineer.',
    facts: CREDENTIALS,
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
    clientWorkHeading: 'Client work',
    clientWork: [
      {
        name: 'ByLou Yoga',
        href: 'https://www.bylou.com.ar',
        site: 'bylou.com.ar',
        description:
          'Design and build of the site for a science-based yoga practice in Buenos Aires — a static Next.js export, deployed and in use. Published with the owner\u2019s permission.',
      },
    ],
  },

  contact: {
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
