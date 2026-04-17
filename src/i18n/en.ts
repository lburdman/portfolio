import type { UIStrings } from './types';

export const en: UIStrings = {
  nav: {
    home: 'Home',
    projects: 'Projects',
    about: 'About',
    notes: 'Notes',
    contact: 'Contact',
  },
  hero: {
    name: 'Lucas Burdman',
    tagline: 'Building Intelligent Systems',
    intro:
      'Electronic Engineer focused on AI systems, automation, and production-minded software — bridging research rigor with practical delivery.',
    ctaProjects: 'View Projects',
    ctaNotes: 'Notes',
    ctaContact: 'Contact',
    ctaResume: 'Resume',
  },
  areas: {
    heading: 'Technical Focus',
    subtitle: 'Areas of depth and active exploration.',
    items: {
      ml: 'Machine Learning',
      appliedAI: 'Applied AI',
      forecasting: 'Forecasting',
      privacyLLM: 'Privacy for LLM Systems',
      quantumML: 'Quantum ML',
      backend: 'Backend & Intelligent Systems',
    },
  },
  projects: {
    heading: 'Selected Projects',
    subtitle: 'A focused set of projects that show how I approach machine learning, applied AI, and systems work.',
    viewAll: 'All Projects',
    viewProject: 'View Project',
    github: 'GitHub',
    demo: 'Demo',
    filterAll: 'All',
  },
  leadership: {
    heading: 'Leadership & Teaching',
    subtitle: 'Academic engagement, technical communication, and community building.',
    items: {
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
  notes: {
    heading: 'Notes & Writing',
    subtitle: 'Engineering notes, case studies, and technical reflections.',
    placeholder:
      "This section will hold engineering notes, short case studies, and the trade-offs behind real systems decisions.",
    comingSoon: 'Coming soon',
  },
  about: {
    heading: 'About',
    bio: "I'm an Electronic Engineer with a strong foundation in mathematics, physics, and computational thinking, building practical experience across AI systems, automation, data workflows, and software products. My work combines experimentation, technical rigor, and a production-minded approach to implementation.",
    currently: 'Currently exploring',
    interests: [
      'LLM systems in production',
      'Quantum ML at realistic hardware constraints',
      'Time series forecasting pipelines',
      'Privacy-preserving AI architectures',
    ],
  },
  contact: {
    heading: 'Contact',
    subtitle: "Let's connect.",
    email: 'lucas.burdman@gmail.com',
    github: 'github.com/lburdman',
    linkedin: 'linkedin.com/in/lucasburdman',
    resume: 'Resume / CV',
  },
  footer: {
    tagline: 'Building Intelligent Systems',
    madeWith: 'Built with Astro & Tailwind CSS',
  },
  lang: {
    switchTo: 'Español',
    current: 'EN',
  },
  projectDetail: {
    backToProjects: '← Back to Projects',
    viewOnGithub: 'View on GitHub',
    viewDemo: 'Live Demo',
    technologies: 'Technologies',
  },
  notFound: {
    heading: '404',
    message: "The page you're looking for doesn't exist.",
    backHome: 'Back to Home',
  },
};
