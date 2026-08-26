import type { UIStrings } from './types';

export const es: UIStrings = {
  nav: {
    home: 'Inicio',
    projects: 'Proyectos',
    about: 'Sobre mí',
    contact: 'Contacto',
  },

  sections: {
    hero: 'Introducción',
    layers: 'Capas',
    worlds: 'Mundos técnicos',
    projects: 'Proyectos seleccionados',
  },

  hero: {
    name: 'Lucas Burdman',
    role: 'Ingeniero Electrónico · AI Engineer',
    positioning:
      'Construyo a través de capas: de las señales y el hardware, pasando por la lógica digital y el cómputo, hasta los modelos y los sistemas inteligentes.',
    ctaProjects: 'Ver proyectos',
    ctaContact: 'Hablemos',
    ctaResume: 'Currículum',
  },

  layers: {
    heading: 'Construyo a través de capas',
    narrative:
      'Cada capa define los límites de la que tiene encima. Saber qué ocurre dos capas más abajo cambia las decisiones que se toman arriba.',
    items: {
      ai: {
        layer: 'MODELOS',
        description:
          'Sistemas de machine learning y de LLM, junto con la disciplina de evaluación que dice si realmente funcionan.',
      },
      quantum: {
        layer: 'CÓMPUTO',
        description: 'Circuitos cuánticos y modelos híbridos, estudiados a la escala que el hardware real permite hoy.',
      },
      fpga: {
        layer: 'LÓGICA DIGITAL',
        description:
          'Lógica determinista, temporizado y ruteo: donde un algoritmo deja de ser código y pasa a ser un circuito.',
      },
      electronics: {
        layer: 'HARDWARE',
        description:
          'La cadena física de señal: filtrado, conversión y el camino que recorre una medición antes de que algo pueda calcular con ella.',
      },
      audio: {
        layer: 'SEÑALES',
        description: 'El sonido tratado como señal medible: espectro, resonancia y el procesamiento que les da forma.',
      },
    },
  },

  worlds: {
    heading: 'Mundos técnicos',
    subtitle: 'Un mismo sistema visto desde cinco capas, desde los modelos hasta la física que los sostiene.',
    items: {
      ai: {
        name: 'IA y Machine Learning',
        summary:
          'ML aplicado y sistemas con LLM: herramientas de privacidad, pronóstico de demanda y salidas estructuradas de modelos, pensados para sostenerse en producción.',
      },
      quantum: {
        name: 'Computación cuántica',
        summary:
          'Modelos híbridos clásico-cuánticos e información cuántica: materia en la que soy ayudante en FIUBA, con experimentos ejecutados en hardware de IBM Quantum y no solo en simulación.',
      },
      fpga: {
        name: 'FPGA y diseño digital',
        summary:
          'Sistemas digitales, HDL y síntesis: la capa donde una especificación se convierte en hardware determinista. También la materia en la que soy ayudante en FIUBA.',
      },
      electronics: {
        name: 'Electrónica',
        summary:
          'Diseño de circuitos e instrumentación: la cadena que va del sensor al procesador, leída como se lee la documentación de ingeniería.',
      },
      audio: {
        name: 'Audio y acústica',
        summary:
          'Procesamiento de señales para sonido: representaciones espectrales, extracción de características y clasificación de emociones a partir del habla.',
      },
    },
  },

  projects: {
    heading: 'Proyectos seleccionados',
    subtitle: 'El trabajo donde mejor se ve cómo se conectan estas capas.',
    viewAll: 'Todos los proyectos',
    viewProject: 'Ver proyecto',
    filterAll: 'Todos',
    workInProgress: 'En curso',
    empty: 'Todavía no hay proyectos para mostrar aquí.',
    stack: 'Stack',
    links: 'Enlaces',
    domains: 'Áreas',
    github: 'GitHub',
    demo: 'Demo en vivo',
    paper: 'Publicación',
    article: 'Artículo',
    relatedWork: 'Trabajo relacionado',
    backToList: 'Volver a proyectos',
  },

  about: {
    heading: 'Sobre mí',
    bio: 'Soy Ingeniero Electrónico, con base en matemática, física y pensamiento computacional, y trabajo en machine learning, aplicaciones con IA, flujos de datos y sistemas de software. Mi trabajo combina experimentación, rigor técnico y una implementación pensada para producción.',
    portraitAlt: 'Lucas Burdman, Ingeniero Electrónico y AI Engineer.',
    facts: ['Ingeniero Electrónico', 'FIUBA', 'Buenos Aires'],
    currentlyHeading: 'Explorando ahora',
    interests: [
      'Sistemas con LLM en producción',
      'Quantum ML con restricciones de hardware reales',
      'Pipelines de pronóstico de series temporales',
      'Arquitecturas de IA que preservan la privacidad',
    ],
    teachingHeading: 'Docencia y comunidad',
    roles: {
      qiskit: {
        role: 'Organizador principal',
        org: 'Qiskit Fall Fest FIUBA',
        period: '2023 – Actualidad',
        description:
          'Dirigí de punta a punta un evento anual de computación cuántica con apoyo de IBM: más de 30 charlas, sesiones híbridas, un hackathon de cierre y más de 500 asistentes. A cargo del diseño del programa, la coordinación de oradores, la logística y la relación con la comunidad.',
      },
      digitalSystems: {
        role: 'Ayudante de cátedra',
        org: 'Sistemas Digitales — FIUBA',
        period: '2022 – Actualidad',
        description:
          'Ayudante de cátedra en Sistemas Digitales, en la Facultad de Ingeniería de la Universidad de Buenos Aires. Acompañamiento en laboratorios prácticos, orientación a estudiantes y evaluación.',
      },
      quantumComms: {
        role: 'Ayudante de cátedra',
        org: 'Computación y Comunicaciones Cuánticas — FIUBA',
        period: '2023 – Actualidad',
        description:
          'Ayudante de cátedra en Computación y Comunicaciones Cuánticas. Fundamentos de circuitos cuánticos, teoría de la información cuántica y su relación con los sistemas criptográficos y de comunicaciones actuales.',
      },
    },
  },

  contact: {
    heading: 'Contacto',
    invitation: 'Construyamos algo interesante.',
    note: 'El correo es la vía más rápida para llegar a mí. Abajo están GitHub y LinkedIn.',
    emailLabel: 'Correo',
    githubLabel: 'GitHub',
    linkedinLabel: 'LinkedIn',
    resumeLabel: 'Currículum',
  },

  footer: {
    tagline: 'Construido por capas.',
    rights: 'Todos los derechos reservados.',
    builtWith: 'Hecho con Astro y Tailwind CSS.',
  },

  lang: {
    name: 'Español',
    short: 'ES',
    switchTo: 'English',
    switchToShort: 'EN',
  },

  notFound: {
    heading: 'Página no encontrada',
    message: 'Esta página no existe: puede haberse movido o el enlace puede estar incompleto.',
    backHome: 'Volver al inicio',
  },

  a11y: {
    primaryNavigation: 'Navegación principal',
    mobileNavigation: 'Navegación móvil',
    footerNavigation: 'Navegación del pie de página',
    toggleMenu: 'Abrir menú',
    closeMenu: 'Cerrar menú',
    homeLink: 'Lucas Burdman — inicio',
    skipToContent: 'Ir al contenido',
    languageSwitcher: 'Cambiar idioma',
    currentLanguage: 'Idioma actual: español',
    projectGithubLabel: (title: string) => `${title} en GitHub`,
    projectDemoLabel: (title: string) => `Demo en vivo de ${title}`,
    projectPaperLabel: (title: string) => `Publicación sobre ${title}`,
    projectArticleLabel: (title: string) => `Artículo sobre ${title}`,
    decorativeVisual: 'Elemento visual decorativo',
    worldsInstructions:
      'Usa las flechas izquierda y derecha para recorrer los mundos técnicos, o Tab para llegar a cada uno por turno.',
  },

  seo: {
    ogImageAlt:
      'Tarjeta para compartir con el nombre Lucas Burdman, el rol de Ingeniero Electrónico y AI Engineer, y un motivo tenue de trazas de señal.',
    home: {
      title: 'Lucas Burdman — Ingeniero Electrónico y AI Engineer',
      description:
        'Portfolio de Lucas Burdman: machine learning y sistemas con LLM, computación cuántica, diseño digital, electrónica y procesamiento de señales de audio.',
    },
    projectsIndex: {
      title: 'Proyectos — Lucas Burdman',
      description:
        'Proyectos de ingeniería seleccionados en IA aplicada, pronóstico, machine learning cuántico y procesamiento de señales.',
    },
    projects: {
      title: (projectTitle: string) => `${projectTitle} — Lucas Burdman`,
      description: (projectSummary: string) => projectSummary,
    },
    about: {
      title: 'Sobre mí — Lucas Burdman',
      description:
        'Ingeniero Electrónico y AI Engineer en Buenos Aires. Ayudante de cátedra en FIUBA y organizador principal del Qiskit Fall Fest FIUBA.',
    },
    notFound: {
      title: 'Página no encontrada — Lucas Burdman',
      description: 'Esta página no existe.',
    },
  },
};
