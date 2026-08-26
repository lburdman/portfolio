# Lucas Burdman Portfolio — Product, Design & Architecture Brief

**Status:** v0.2  
**Date:** 2026-08-26  
**Purpose:** persistent source of truth for `/frontend-design`, Claude Code, Codex, Cursor, and any future coding agent working on this repository.

This document defines **what the portfolio should become**, the architectural principles it must preserve, the interaction system, the content model, and the rules for keeping the repository scalable and agent-friendly.

It does **not** preselect Astro, Next.js, React/Vite, or any other framework. Framework choice is an explicit architecture decision.

---

# 0. Mandatory context

Before making broad changes, every agent must:

1. Read this file completely.
2. Read `AUDIT.md` completely.
3. Inspect the actual repository.
4. Run or inspect the current quality gates.
5. Understand the current content model and deployment.
6. Separate:
   - product requirements;
   - visual requirements;
   - architecture constraints;
   - existing defects.
7. Never “fix” audit findings by hiding errors, weakening checks, adding casts, deleting validations, or duplicating logic.

`AUDIT.md` is the verified technical baseline for the current repository.

This file is the product/design/architecture target.

If they conflict, stop and explain the conflict before implementing a workaround.

---

# 1. Product goal

This is not a conventional developer portfolio and not an online CV with animations.

The site must communicate that Lucas Burdman is an **Electronic Engineer and AI Engineer who builds across technical layers**.

Core areas:

- AI / Machine Learning
- Quantum Computing
- FPGA / Digital Design / Embedded
- Electronics / Circuit Design
- Audio / Acoustics / Signal Processing
- Experiments / R&D / Work in progress

The breadth must feel intentional, not scattered.

Central narrative:

> **I build across layers — from signals and hardware, through digital logic and computation, to models and intelligent systems.**

The portfolio must work at two depths:

### Fast professional read

A recruiter, hiring manager, founder, or collaborator should understand within roughly 30 seconds:

- who Lucas is;
- his current professional identity;
- strongest technical areas;
- strongest projects;
- how to contact him;
- where to see GitHub / LinkedIn / CV.

### Deep technical exploration

A technical visitor should be able to explore:

- detailed case studies;
- project architecture;
- technical tradeoffs;
- current experiments;
- cross-domain work;
- technical evolution over time.

---

# 2. Desired personality

The experience should feel:

- warm
- technical
- precise
- editorial
- curious
- playful in controlled doses
- highly crafted
- intelligent
- experimental
- human

It should NOT feel like:

- a generic AI startup;
- a SaaS landing page;
- a cyberpunk hacker portfolio;
- a crypto website;
- a gaming portfolio;
- a component-library demo;
- a WebGL demo with a CV attached;
- a corporate consulting site.

---

# 3. Design philosophy

The visual system should rely on:

- strong typography;
- generous whitespace;
- disciplined grid;
- high contrast;
- warm or neutral tones;
- selective technical diagrams;
- strong visual hierarchy;
- subtle texture/noise where useful;
- motion with conceptual purpose;
- custom-feeling composition even when reusable components are used.

Avoid by default:

- purple AI gradients;
- neon cyan everywhere;
- excessive glow;
- glassmorphism everywhere;
- giant SaaS cards;
- gratuitous terminal windows;
- random particles;
- glitch text;
- pointless 3D objects;
- persistent cursor trails;
- visual effects with no conceptual relationship to the content.

---

# 4. Core UX principle

The portfolio should behave like a **guided engineering journey** rather than a stack of unrelated landing-page sections.

The user's controls remain conventional:

- normal vertical scroll;
- normal trackpad behavior;
- normal touch scroll;
- normal browser navigation;
- obvious clickable elements.

The content may visually move:

- vertically;
- horizontally;
- diagonally;
- in depth;

but the interaction must remain understandable and controllable.

Avoid confusing scroll-jacking.

---

# 5. Homepage experience

## 00 — Hero

Purpose:
Establish identity immediately.

Content:

- Lucas Burdman
- Electronic Engineer / AI Engineer
- concise positioning statement
- GitHub / LinkedIn / CV / Contact access
- subtle access to technical areas

Preferred visual direction:
A restrained generative signal field, dither field, wave field, or equivalent.

React Bits can be used as a reference or implementation source, especially for effects such as:

- Dither Wave
- subtle signal fields
- interactive background primitives

Rules:

- low opacity;
- slow movement;
- restrained color;
- mild pointer response;
- semantic HTML content above the effect;
- content visible immediately;
- no loading screen;
- no giant 3D centerpiece;
- no shader in the critical rendering path.

Possible technical-area labels:

`AI`
`ML`
`QUANTUM`
`FPGA`
`ELECTRONICS`
`AUDIO`

Hover/focus may preview each area's visual language.

---

## 01 — “I build across layers”

Purpose:
Explain why multiple technical domains belong in one portfolio.

Possible conceptual sequence:

`MODELS`
`COMPUTATION`
`DIGITAL LOGIC`
`HARDWARE`
`SIGNALS`

or an improved equivalent.

Motion:

- typography-led;
- restrained;
- readable;
- no glitch;
- no terminal effect;
- no unnecessary WebGL.

This section is a conceptual bridge, not a visual spectacle.

---

## 02 — Technical Worlds

This is the primary motion moment.

The user scrolls vertically.

A controlled pinned sequence may translate the experience horizontally through:

1. AI & Machine Learning
2. Quantum Computing
3. FPGA / Digital Design
4. Electronics
5. Audio / Acoustics

This should feel like traveling through layers of engineering, not like a carousel.

Preferred orchestration:

- GSAP + ScrollTrigger or an equally suitable alternative;
- semantic HTML remains accessible;
- progressive enhancement;
- reduced-motion fallback;
- mobile-specific composition.

Use this major horizontal/pinned interaction **once**.

Do not repeat it across the site.

---

# 6. Technical-world visual system

All technical domains belong to one design system.

They may have different visual behaviors but must not look like five unrelated microsites.

Prefer one conceptual:

`TechnicalWorld`
→ `ActiveDomain`
→ `VisualStage`

rather than five heavy effects running simultaneously.

At most one expensive visual/canvas experience should be actively rendering at a time.

---

## AI / Machine Learning

Visual vocabulary:

- representations;
- nodes;
- relations;
- embeddings / spaces;
- organization;
- soft network behavior.

Possible references:

- React Bits Neural Float
- Synaptic Shift
- lightweight SVG/canvas networks

Avoid:

- glowing brain;
- AI robot;
- generic neon neural-network cliché.

---

## Quantum Computing

Visual vocabulary:

- waves;
- phase;
- interference;
- probability;
- propagation;
- superposition.

Possible interaction:
a point disturbance produces subtle overlapping ripple/interference behavior.

Avoid:

- atom icon;
- electrons orbiting a nucleus;
- decorative Bloch sphere;
- generic sci-fi neon.

---

## FPGA / Digital Design

This should be one of the strongest domain identities.

Visual vocabulary:

- grids;
- logic cells;
- routing;
- clock/signal paths;
- deterministic blocks.

Pointer/focus behavior:
routes illuminate through a grid.

Preferred technology order:

1. CSS/DOM
2. SVG
3. lightweight canvas
4. WebGL only if clearly justified

Possible React Bits references:

- Grid Rise
- Square Matrix

---

## Electronics

Prefer SVG / DOM.

Visual vocabulary:

- PCB traces;
- signal paths;
- block diagrams;
- engineering annotations;
- instrumentation.

Possible interaction:
hover/focus over blocks highlights the signal path.

Conceptual example:

`INPUT → FILTER → ADC → MCU → OUTPUT`

The visual language should feel like engineering documentation refined into an interface.

---

## Audio / Acoustics

Visual vocabulary:

- waveform;
- frequency;
- spectrum;
- resonance;
- amplitude;
- propagation.

Possible effects:

- Grain Wave-inspired behavior;
- waveform deformation;
- subtle pointer-controlled amplitude or phase.

The interaction should communicate sound/signal concepts.

---

# 7. Selected Projects

After Technical Worlds, reduce motion intensity.

Projects are the primary evidence of ability.

Project cards must be:

- highly scannable;
- visually strong;
- editorial;
- easy to open;
- useful without hover.

Default content:

- project media;
- title;
- domain tags;
- short summary;
- role/date where useful;
- obvious action.

Potential hover/focus treatment:

- subtle 2–3° tilt;
- mild spotlight;
- small media scale;
- metadata reveal;
- optional demo/video preview;
- `View case study →`

Possible references:

- React Bits Tilted Card
- Spotlight Card
- Glare Hover
- Depth Card

Do not stack several effects without purpose.

Preferred baseline:
**subtle depth + spotlight + optional media preview.**

---

# 8. Project transition

Opening a project should feel spatially connected to its card.

Preferred direction:
shared-element / View Transition style expansion.

Possible technologies:

- native View Transitions;
- Astro transitions if Astro remains;
- Next-compatible transition architecture if Next is selected;
- CSS clip/mask transitions;
- lightweight custom solution.

Do not turn the entire portfolio into an SPA only for this transition.

---

# 9. Project detail experience

Project detail pages should be calmer than the homepage.

They are technical case studies.

Suggested information model:

- title
- concise statement
- context / motivation
- problem
- approach
- architecture / methodology
- Lucas's contribution
- stack
- constraints
- results
- what was learned
- diagrams/media
- GitHub / demo / paper / article
- related work

Not every project requires every section.

The template must adapt gracefully.

---

# 10. Lab / Current Experiments

Purpose:
show work before it becomes a polished flagship project.

Suitable content:

- experiments;
- prototypes;
- research;
- current learning;
- small technical builds;
- WIP.

Possible user-facing states:

- Exploring
- Building
- Prototype
- Working
- Completed
- Archived

Desktop may use:

- card spread;
- layered cards;
- restrained interactive stack;
- optional drag only if intuitive.

Mobile:
simple vertical cards.

---

# 11. About / Human layer

Motion intensity should decrease.

Purpose:
show Lucas as a person, not just a stack of technologies.

Use:

- photography;
- concise writing;
- whitespace;
- personal interests;
- humor where natural;
- curiosity.

Optional engineering-grid easter egg:

`12 COL GRID`
`BASELINE 8PX`
`VIEWPORT ...`
`FPS ...`

It must be optional and never interfere with normal navigation.

---

# 12. Contact

Return to visual calm.

Possible direction:

> Let’s build something interesting.

Provide clear links to:

- email;
- GitHub;
- LinkedIn;
- CV.

Subtle magnetic interaction is acceptable.

Avoid:

- particles;
- giant shaders;
- unnecessary contact form unless a real need exists.

---

# 13. Motion system

Motion must do at least one of the following:

1. reveal information;
2. provide feedback;
3. communicate hierarchy;
4. explain a technical concept;
5. connect sections spatially;
6. reinforce personality.

If it does none of these, remove it.

The site must remain excellent when motion is disabled.

Use motion as punctuation, not wallpaper.

---

# 14. Hover / pointer system

Hover is welcome, but must be disciplined.

Good:

- project preview;
- route illumination;
- waveform response;
- metadata reveal;
- technical-area preview;
- subtle depth feedback.

Bad:

- every button jumping;
- random text scramble;
- universal glow;
- constant trails;
- hidden critical information.

Anything revealed by hover must remain available through keyboard/touch.

---

# 15. Component / effect ecosystem

Preferred sources:

### Primary exploration

- React Bits
- 21st.dev
- Motion / Motion Primitives

### Secondary inspiration

- Aceternity
- Magic UI
- Hover.dev
- Fancy Components
- SmoothUI
- Codrops

### Animation engines

- CSS
- Motion
- GSAP / ScrollTrigger

### Heavy graphics

- Canvas
- Three.js
- shaders

Rules:

- use the simplest adequate tool;
- do not combine libraries merely because they exist;
- adapt sourced components to the design system;
- avoid shipping five UI/motion ecosystems in production;
- consolidate or own final code where practical.

---

# 16. Framework Architecture Gate

**Framework choice is intentionally open.**

The existing project uses Astro, but this is still an acceptable time to migrate.

Migration effort is NOT a major negative factor because coding agents can perform much of the mechanical work.

The decision must optimize the resulting system, not the amount of work required to get there.

Before major redesign implementation, compare:

## Option A — Astro + selective React islands

Evaluate:

- static/semantic output;
- current content collections;
- bilingual routing;
- React Bits through isolated React islands;
- Hero visual;
- Technical Worlds;
- GSAP choreography;
- shared state needs;
- cross-island coordination;
- View Transitions;
- resulting client JS;
- deployment.

## Option B — Next.js App Router + React

Evaluate:

- React-first component architecture;
- React Bits integration;
- Motion/GSAP integration;
- shared state;
- Technical Worlds;
- route transitions;
- static generation;
- project-content architecture;
- i18n;
- metadata/SEO;
- image optimization;
- deployment;
- resulting client JS.

## Option C — React + Vite

Evaluate only if it has a real advantage over A and B.

Do not select it merely because it is easy to scaffold.

---

# 17. Architecture decision criteria

Compare options based on:

1. percentage of homepage that truly needs client-side React;
2. amount of shared client state;
3. cross-section coordination;
4. expected first-load JavaScript;
5. motion orchestration complexity;
6. route/project transition architecture;
7. project-content ergonomics;
8. bilingual routing;
9. SEO/static generation;
10. image/media handling;
11. accessibility;
12. mobile/reduced-motion fallback complexity;
13. deployment;
14. long-term maintainability;
15. clarity for future coding agents;
16. dependency footprint.

Do not choose Astro simply because it already exists.

Do not choose Next simply because React Bits is React-native.

Recommend **one** architecture with explicit reasoning.

---

# 18. Migration rule

If migration is selected:

- migrate intentionally;
- do not perform a blind file-for-file translation;
- use the migration to simplify duplicated architecture;
- preserve content and URLs where sensible;
- preserve bilingual functionality;
- preserve Git-based project management;
- preserve or improve SEO;
- preserve redirects/canonicals when URLs change;
- keep commits/stages reviewable;
- remove obsolete framework/config files after validation;
- do not leave a hybrid half-migration.

The final repository must look as if the selected architecture was chosen deliberately from the start.

---

# 19. Repository design principles

The repository should optimize for:

- obvious ownership of concerns;
- minimal duplicated logic;
- predictable naming;
- explicit configuration;
- data-driven projects;
- agent-friendly documentation;
- strong types/schema;
- clean CI;
- small number of libraries;
- modular visual effects;
- easy deletion/replacement of experiments.

Avoid:

- giant components;
- scattered constants;
- duplicate locale pages;
- metadata duplicated in markdown;
- project-specific code in page components;
- effect configuration mixed into content;
- unexplained global state;
- dead experimental dependencies.

---

# 20. Target repository shape

The final exact structure depends on the chosen framework, but aim for conceptual separation like:

```text
/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── navigation/
│   │   ├── home/
│   │   ├── projects/
│   │   └── visuals/
│   │       ├── hero/
│   │       └── technical-worlds/
│   │
│   ├── content/
│   │   └── projects/
│   │
│   ├── config/
│   │   ├── site.*
│   │   └── navigation.*
│   │
│   ├── i18n/
│   ├── lib/
│   │   ├── projects/
│   │   ├── motion/
│   │   └── seo/
│   │
│   ├── styles/
│   └── routes-or-pages/
│
├── docs/
│   ├── PROJECT_CONTENT_CONTRACT.md
│   ├── ARCHITECTURE.md
│   └── MOTION_SYSTEM.md
│
├── scripts/
│   └── project tooling
│
├── AUDIT.md
├── PORTFOLIO_BRIEF.md
└── agent/framework config files
```

Do not follow this mechanically when the chosen framework has a clearer convention.

The principle matters more than exact folders.

---

# 21. Git as CMS

This is a core product requirement.

Lucas must be able to manage projects through:

- Claude Code;
- Codex;
- Cursor;
- another coding agent;
- direct Git edits.

No external CMS is required for v1.

**Adding a normal project must require zero application-code changes.**

An agent should be able to:

- create;
- edit;
- reorder;
- feature;
- publish;
- unpublish;
- mark WIP;
- attach media;
- add GitHub/demo/paper links;
- edit EN/ES copy;

without changing page components or routes.

---

# 22. Project content model

Shared metadata must have one source of truth.

Conceptual structure:

```text
src/content/projects/
  project-slug/
    project.json
    en.md
    es.md
    media/
      cover.webp
      architecture.svg
      demo.mp4
```

If the selected framework/content system has a cleaner equivalent, use it.

Preserve these goals:

### Shared metadata

Possible fields:

- slug
- status
- featured
- domains
- tags
- year/date
- role
- stack
- GitHub URL
- demo URL
- paper/article URL
- cover/media references
- order
- related projects
- optional visual accent/config

### Localized content

- title
- summary
- narrative/case-study text
- content-specific labels if needed

Do not duplicate shared metadata in EN and ES.

---

# 23. Project visibility

The current audit identified inconsistent status filtering.

Create one authoritative status/visibility model.

Do not independently redefine project visibility in:

- homepage;
- project listing;
- project detail;
- EN routes;
- ES routes;
- featured lists;
- sitemap.

Use a central helper/content query/schema rule.

Test it.

---

# 24. Agent-facing content contract

Create:

`docs/PROJECT_CONTENT_CONTRACT.md`

It should explain:

- project directory/file format;
- schema;
- required fields;
- optional fields;
- status semantics;
- valid domains;
- localization;
- media handling;
- publication behavior;
- featured behavior;
- ordering;
- link validation;
- related projects;
- validation commands;
- what an agent may modify;
- what an agent must not modify for content-only changes.

A new agent should be able to safely add a project after reading this single document.

---

# 25. Project tooling

If useful, provide:

```bash
npm run project:new -- my-project
npm run project:validate
```

`project:new` should scaffold valid content.

`project:validate` should validate actual production project content using the same schema used by the application.

Do not maintain a separate test-only copy of the schema.

---

# 26. Agent documentation

After framework selection, create/update:

### `docs/ARCHITECTURE.md`

Explain:

- framework choice;
- rendering model;
- route model;
- i18n;
- content architecture;
- visual-island strategy;
- state ownership;
- dependency roles;
- deployment.

### `docs/MOTION_SYSTEM.md`

Explain:

- global motion principles;
- allowed libraries;
- major scroll sequence;
- visual stage;
- reduced motion;
- mobile fallbacks;
- performance constraints.

### Framework agent instructions

Use the appropriate project-level agent instruction file (for example `CLAUDE.md`) to contain concise operational rules, not the entire design brief.

It should reference these docs rather than duplicating them.

---

# 27. Internationalization

EN and ES remain first-class.

Goals:

- shared page/component logic;
- minimal route duplication;
- localized SEO;
- localized accessibility strings;
- shared project metadata;
- localized project narrative;
- canonical URL consistency;
- correct hreflang;
- language-safe navigation.

Do not allow visual or functional drift between locales.

---

# 28. SEO

The redesign must resolve or preserve fixes for audit findings including:

- absolute `hreflang`;
- canonical consistency;
- sitemap;
- default OG image;
- localized page metadata;
- correct production/base URLs;
- working favicon;
- working CV links.

Project pages should expose strong metadata based on project content.

---

# 29. Accessibility

Required:

- semantic document structure;
- meaningful `<h1>`;
- heading hierarchy;
- skip link;
- keyboard navigation;
- visible focus;
- correct mobile-menu focus behavior;
- sufficient text contrast;
- sufficient interactive-boundary contrast;
- no essential hidden text waiting on animation;
- no hover-only information;
- reduced-motion support;
- meaningful alt text;
- decorative canvas/SVG hidden appropriately;
- localized ARIA/accessibility strings.

The reduced-motion version must feel intentional, not broken.

---

# 30. Performance contract

Performance is a product feature.

Do not reproduce the heavy loading behavior of experimental references.

Hard principles:

- no mandatory preloader;
- semantic Hero visible immediately;
- no WebGL dependency for first meaningful content;
- dynamic import expensive effects;
- pause offscreen animations;
- only one heavy visual stage active at once;
- prefer CSS/SVG/DOM over WebGL when comparable;
- cap DPR for expensive graphics;
- mobile quality adaptation;
- static fallbacks;
- lazy-load noncritical media;
- optimize images/video;
- avoid excessive autoplay;
- avoid unnecessary framework runtimes;
- self-host fonts where practical;
- minimize layout shift.

Set explicit performance budgets after framework choice and measure them in production builds.

Do not optimize solely for Lighthouse scores at the expense of experience, but significant regressions require justification.

---

# 31. Design tokens

Create one authoritative token system.

Cover:

- background;
- surfaces;
- text;
- muted text;
- borders;
- accent;
- focus;
- spacing;
- radius;
- typography;
- motion duration;
- easing;
- domain accents where required.

Avoid duplicated hex values across unrelated files.

Domain personality must emerge from the common system.

---

# 32. Navigation

Navigation must remain obvious during experimental sections.

Possible desktop progress/navigation model:

`00 Intro`
`01 AI`
`02 Quantum`
`03 FPGA`
`04 Electronics`
`05 Audio`
`06 Lab`
`07 Me`

Use only if it improves the experience.

At minimum, users must always be able to:

- reach Projects;
- reach About;
- reach Contact;
- change language;
- return Home.

Mobile can simplify substantially.

---

# 33. Mobile

Mobile is a deliberate composition.

Desktop:

- richer pointer behavior;
- Technical Worlds horizontal/pinned sequence;
- more depth.

Tablet:

- reduced complexity.

Mobile:

- primarily vertical;
- no hover dependency;
- simplified visual stage;
- reduced or removed expensive shaders;
- strong project cards;
- conventional fast navigation.

Do not force desktop novelty into mobile.

---

# 34. Reduced motion

When `prefers-reduced-motion: reduce`:

- remove long pinned/parallax sequences;
- stop continuous decorative animation;
- avoid aggressive transforms;
- show content immediately;
- maintain section hierarchy;
- preserve all navigation;
- preserve visual quality.

Test explicitly.

---

# 35. Existing audit requirements

Read `AUDIT.md` for the verified details.

The redesign must account for:

### Tooling / CI

- broken ESLint configuration;
- lint missing from CI;
- machine-specific Vitest alias;
- weak/mirrored schema tests;
- generated-file ignores;
- CI hygiene.

### SEO / production

- broken hreflang;
- missing sitemap;
- missing OG image;
- broken Spanish Hero CTAs;
- missing résumé asset.

### Accessibility

- missing H1s;
- no reduced-motion handling;
- contrast failures;
- missing skip link;
- mobile-menu focus behavior;
- hardcoded untranslated a11y strings.

### Content correctness

- inconsistent project visibility;
- schema/test drift.

### Structure

- duplicated EN/ES page bodies;
- dead config/code;
- social/config duplication;
- i18n inconsistencies.

### Performance

- render-blocking Google Fonts;
- unoptimized project media path.

Do not suppress these issues.

---

# 36. Testing philosophy

Tests must exercise production behavior, not copies of production logic.

Prioritize:

- content schema;
- project visibility;
- project queries;
- locale URL behavior;
- project content validation;
- important rendering/build behavior where practical.

Quality gates should include:

- format;
- type check;
- lint;
- tests;
- production build.

Framework migration must not be considered complete until all selected gates pass.

---

# 37. Dependency policy

Before adding a dependency, answer:

1. what exact responsibility does it own?
2. why is native/CSS/current stack insufficient?
3. will it be used in more than one meaningful place?
4. what is its client/runtime cost?
5. does it overlap another installed library?

Avoid multiple libraries owning the same responsibility.

Examples:

- GSAP can own global scroll choreography.
- Motion can own local React interactions if React architecture warrants it.
- React Bits can supply/adapt selected visual primitives.
- Three.js should exist only if there is a justified 3D/shader requirement.

---

# 38. Implementation strategy

Do not redesign the entire site in one uncontrolled pass.

Use architecture gates.

## Gate 1 — Baseline

Understand:

- repository;
- audit;
- current build;
- current content;
- runtime;
- deployment.

## Gate 2 — Architecture decision

Compare Astro vs Next.js vs Vite/React if warranted.

Choose one.

Document the decision.

## Gate 3 — Foundation

Implement:

- repo cleanup required by architecture;
- design tokens;
- typography;
- layout;
- i18n foundation;
- accessibility foundation;
- content model;
- project-agent contract;
- CI/quality gates.

## Gate 4 — Experience prototype

Implement:

- navigation;
- Hero;
- “I build across layers”;
- Technical Worlds;
- Selected Projects;
- desktop/mobile/reduced-motion variants.

Evaluate quality/performance before expanding.

## Gate 5 — Full portfolio

Then implement:

- project detail redesign;
- Lab;
- About;
- Contact;
- deeper motion/polish.

---

# 39. Migration acceptance criteria

If the framework changes, migration is complete only when:

- old framework runtime/config is removed;
- old dead components are removed;
- URLs are intentional;
- EN/ES work;
- content survives correctly;
- project management works;
- SEO metadata works;
- production build works;
- deployment works;
- quality gates pass;
- no duplicate old/new architectures remain;
- documentation reflects the final system.

Avoid permanent “temporary adapters.”

---

# 40. First implementation scope

The first visual implementation should prove the system, not finish every page.

Priority:

1. architecture selected;
2. core repo structure;
3. tokens / typography;
4. navigation;
5. Hero;
6. “I build across layers”;
7. Technical Worlds prototype;
8. Selected Projects using real content;
9. mobile;
10. reduced motion;
11. project content contract;
12. quality gates.

Only after this looks and behaves correctly should deeper pages be redesigned.

---

# 41. Reference interpretation

Creative ceiling:

- shader.se

Take:

- worlds;
- continuity;
- bold transitions;
- interaction as identity.

Do not take:

- heavy initial load;
- UI trapped in canvas;
- accessibility compromises;
- GPU dependence as a goal.

Other useful reference directions:

- Corentin Bernadou — editorial structure + visual layer
- Arnaud Rocca — systematic motion
- Jonas Reymondin — technical/system personality
- Thibault Guignand — coordinated GSAP/shader motion
- Codrops — implementation research
- React Bits — reusable effects
- 21st.dev — agent/component discovery

References are inspiration, not templates.

---

# 42. Agent behavior

Agents working on this repo must:

- inspect before replacing;
- make explicit architecture decisions;
- prefer root-cause fixes;
- avoid dependency bloat;
- preserve semantic content;
- preserve or improve SEO/i18n/a11y;
- keep changes reviewable;
- document non-obvious architecture;
- avoid inventing project facts;
- keep project additions data-driven;
- remove abandoned experiments;
- leave the repository cleaner than they found it.

If content is missing, create structured placeholders rather than fictional achievements.

---

# 43. Success criteria

The project succeeds when:

1. Lucas's professional identity is understandable immediately.
2. His technical breadth feels coherent.
3. The portfolio is memorable but not exhausting.
4. Interactions reinforce engineering concepts.
5. Projects remain the strongest evidence.
6. Project additions require zero application-code edits.
7. Coding agents can safely manage projects.
8. EN/ES are first-class.
9. Mobile is excellent.
10. Reduced-motion is excellent.
11. Accessibility is strong.
12. SEO is correct.
13. Initial content loads quickly.
14. The repo has a clean architectural story.
15. Dependencies have clear responsibilities.
16. The selected framework genuinely fits the experience.
17. The implementation itself demonstrates engineering judgment.

---

# 44. Final principle

Choose **coherence, maintainability and engineering judgment** over novelty.

Use complex effects only where complexity buys a genuinely better experience.

The goal is not to prove that the frontend can do everything.

The goal is to make the visitor understand that Lucas can.
