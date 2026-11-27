/**
 * Pure content for `scripts/project-new.mjs`. No filesystem access, no
 * top-level side effects, so tests can import it and check that what the
 * scaffolder writes passes the production schema.
 */

/**
 * Only the fields the schema requires, plus the explicit defaults worth seeing.
 * Optional fields are left out rather than stubbed: an empty `role` or an
 * invented `year` is worse than no field at all.
 */
export const scaffoldMeta = (slug) => ({
  slug,
  status: 'draft',
  featured: false,
  domains: ['ai'],
  stack: ['TODO: technology'],
  order: 99,
});

export const scaffoldBody = (locale) => {
  const en = locale === 'en';
  return `---
title: 'TODO: ${en ? 'project title' : 'título del proyecto'}'
summary: 'TODO: ${en ? 'one or two sentences describing what this project is and why it exists.' : 'una o dos oraciones que describan qué es este proyecto y por qué existe.'}'
---

## ${en ? 'Overview' : 'Descripción General'}

TODO: ${en ? 'What is this, in two or three sentences?' : '¿Qué es esto, en dos o tres oraciones?'}

## ${en ? 'Problem' : 'Problema'}

TODO: ${en ? 'What problem does it solve, and why is it hard?' : '¿Qué problema resuelve y por qué es difícil?'}

## ${en ? 'Approach' : 'Enfoque'}

TODO: ${en ? 'How is it built? Architecture, methodology, key decisions.' : '¿Cómo está construido? Arquitectura, metodología, decisiones clave.'}

## ${en ? 'Key Learnings' : 'Lecciones Clave'}

TODO: ${en ? 'What did building this teach you?' : '¿Qué te enseñó construir esto?'}
`;
};
