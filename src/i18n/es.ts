import type { CredentialTrio, UIStrings } from './types';

/**
 * Las tres credenciales, definidas una sola vez y referenciadas desde la
 * franja del Hero y desde `about.facts`, para que los dos lugares del sitio
 * que muestran respaldo no puedan contradecirse.
 *
 * `Claude Certified Architect · Foundations` conserva su nombre en inglés a
 * propósito: es un nombre propio, y una certificación traducida es una
 * certificación que nadie puede verificar.
 */
const CREDENTIALS = [
  'Ingeniería Electrónica · UBA',
  'MicroMasters MITx · Estadística y Ciencia de Datos',
  'Claude Certified Architect · Foundations',
] as const satisfies CredentialTrio;

export const es: UIStrings = {
  nav: {
    home: 'Inicio',
    projects: 'Proyectos',
    writing: 'Artículos',
    about: 'Sobre mí',
    contact: 'Contacto',
  },

  sections: {
    hero: 'Introducción',
    layers: 'Capas',
    worlds: 'Mundos técnicos',
    projects: 'Proyectos seleccionados',
    contact: 'Contacto',
  },

  hero: {
    name: 'Lucas Burdman',
    role: 'Ingeniero Electrónico · AI Engineer',
    positioning:
      'Construyo a través de capas: de las señales y el hardware, pasando por la lógica digital y el cómputo, hasta los modelos y los sistemas inteligentes.',
    credentials: CREDENTIALS,
    ctaProjects: 'Ver proyectos',
    ctaContact: 'Hablemos',
    ctaResume: 'Currículum',
  },

  layers: {
    heading: 'Hasta la física',
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
    subtitle: 'Cinco áreas de trabajo. En qué consiste cada una.',
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
          'Diseño de circuitos e instrumentación: la cadena que va del sensor al procesador. Es la base sobre la que se apoyan las otras cuatro capas y el eje de la carrera de Ingeniería Electrónica que está detrás de todas ellas.',
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
    mediaAlt: {
      'energy-forecasting/prediction-interval':
        'Gráfico de líneas de la demanda eléctrica alemana durante 14 días de agosto de 2019: la carga real en negro, la predicción de XGBoost en línea discontinua y un intervalo de predicción conformal del 95 % sombreado a su alrededor. La predicción sigue de cerca los picos y valles diarios; el intervalo se ensancha donde el modelo tiene menos certeza.',
      'energy-forecasting/backtest-rmse-by-fold':
        'Gráfico de líneas del RMSE por fold en un backtest de origen deslizante, comparando cuatro modelos a lo largo de cinco folds. La línea base naive se mantiene cerca de 8.500 en todos; Ridge queda entre 4.400 y 5.500; RandomForest y XGBoost parten de unos 3.400 y bajan hasta unos 1.200–1.400 en el tercer fold.',
      // Una línea base de regresión logística, no el modelo cuántico híbrido:
      // no existe ninguna matriz de confusión de la QNN en los notebooks, así
      // que esto no puede redactarse de forma que suene a resultado cuántico.
      'quantum-audio/confusion-matrix':
        'Matriz de confusión de seis por seis de una línea base de regresión logística sobre las clases de emoción de CREMA-D HAP, SAD, ANG, DIS, FEA y NEU. La diagonal es la banda más oscura, enfado es la clase más fuerte, y asco y miedo son las que más se confunden con el resto.',
      'quantum-audio/transpiled-circuit':
        'Diagrama de un circuito cuántico de dos qubits rotulado «Transpiled for ibm_kingston»: una cadena larga de puertas Rz y raíz de X sobre los qubits q0 y q1, separadas por barreras, con dos puertas de entrelazamiento de dos qubits y una medición de cada qubit sobre un registro clásico de 2 bits.',
    },
  },

  writing: {
    heading: 'Artículos',
    subtitle:
      'Crónicas de dar computación cuántica en la FIUBA, sostener la comunidad estudiantil que se armó alrededor y los congresos y cursos que hubo en el medio.',
    empty: 'Acá van a ir apareciendo las crónicas de docencia, organización y estudio a medida que se escriban.',
    readArticle: 'Leer artículo',
    kinds: {
      teaching: 'Docencia',
      community: 'Comunidad',
      research: 'Investigación',
      study: 'Estudio',
    },
    relatedProjects: 'Proyectos relacionados',
    backToList: 'Volver a artículos',
    older: 'Antes',
    newer: 'Después',
    domains: 'Áreas',
    links: 'Enlaces',
    event: 'Evento',
    slides: 'Diapositivas',
    paper: 'Publicación',
    code: 'Código',
    mediaAlt: {
      'lanet-2025-complex-networks/lanet-conference-group-photo':
        'Alrededor de sesenta asistentes a un congreso, con credenciales de cordón azul, posan en escalinatas exteriores frente a un edificio moderno bajo sol intenso.',
      'lanet-2025-complex-networks/poster-transfer-learning-quantum':
        'Dos hombres de pie a ambos lados de un póster de investigación titulado "Transfer Learning para Redes Neuronales Híbridas Clásico-Cuánticas".',
      'noche-de-los-museos-fiuba/spinq-desktop-quantum-computer':
        'Una computadora cuántica de escritorio SpinQ con la tapa abierta y su tablet mostrando un circuito de dos qubits y un gráfico de barras de probabilidad.',
      'qiskit-fall-fest-fiuba-2025/hackathon-group-library':
        'Unos veinticinco participantes con credenciales colgadas posan juntos en la sala de lectura de una biblioteca universitaria con paneles de madera.',
      'qiskit-fall-fest-fiuba-2025/ibm-quantum-mentor-badge':
        'Insignia digital de IBM Quantum sobre un cuadrado azul intenso con el texto "2025 Qiskit Fall Fest Mentor", nivel Advanced.',
      'qiskit-fall-fest-fiuba-2025/kickoff-lecture-hall-audience':
        'Un aula magna en gradas con bancos de madera y unas sesenta personas sentadas mirando al frente bajo largos tubos fluorescentes.',
      'qiskit-fall-fest-fiuba-2025/opening-talk-quantum-utility':
        'Un joven con remera color crema habla por micrófono de mano frente a una diapositiva proyectada del evento Qiskit Fall Fest ARG 2025.',
      'quantum-computing-course-fiuba/course-closing-group-classroom':
        'Unas quince personas posan en un aula frente a una pizarra blanca, junto a un pequeño equipo de escritorio con la pantalla encendida sobre el pupitre.',
    },
  },

  about: {
    heading: 'Sobre mí',
    bio: 'Soy Ingeniero Electrónico por la UBA y trabajo en sistemas de IA en producción. Mi formación viene de las señales, los circuitos y el diseño digital; hoy la mayor parte de mi tiempo va al machine learning y a los sistemas con LLM, y al trabajo de evaluación que decide si un modelo está listo para salir. Soy ayudante de cátedra en Sistemas Digitales y en Computación y Comunicaciones Cuánticas, en la FIUBA.',
    portraitAlt: 'Lucas Burdman, Ingeniero Electrónico y AI Engineer.',
    facts: CREDENTIALS,
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
    articleEventLabel: (title: string) => `Página del evento de ${title}`,
    articleSlidesLabel: (title: string) => `Diapositivas de ${title}`,
    articlePaperLabel: (title: string) => `Publicación presentada en ${title}`,
    articleCodeLabel: (title: string) => `Código de ${title}`,
    articleNavigation: 'Artículos cercanos en el tiempo',
    writingTimeline: 'Artículos, del más reciente al más antiguo',
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
    writingIndex: {
      title: 'Artículos — Lucas Burdman',
      description:
        'Crónicas sobre dar computación cuántica en la FIUBA, sostener una comunidad cuántica estudiantil y los congresos y cursos del medio.',
    },
    writing: {
      title: (articleTitle: string) => `${articleTitle} — Lucas Burdman`,
      description: (articleSummary: string) => articleSummary,
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
