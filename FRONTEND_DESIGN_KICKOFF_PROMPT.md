# /frontend-design kickoff prompt

Read `PORTFOLIO_BRIEF.md` and `AUDIT.md` completely before changing code.

Then inspect the full repository, its content, package/config files, current build/deploy setup, and existing project data.

Use `/frontend-design` as the design authority for this task, but treat `PORTFOLIO_BRIEF.md` as the persistent product/design/architecture contract and `AUDIT.md` as the verified baseline of existing technical defects.

## Goal

Turn this repository into a scalable, highly crafted personal engineering portfolio for Lucas Burdman.

The portfolio must communicate one coherent idea:

**Lucas is an Electronic Engineer and AI Engineer who builds across layers — from signals and hardware, through digital logic and computation, to models and intelligent systems.**

The final experience should be warm, technical, editorial, interactive, human, and memorable without becoming a heavy effects demo.

Projects are the primary evidence of ability.

The repository must also become extremely easy for future coding agents to understand and maintain.

---

## Important: framework is open

Do not assume Astro must stay.

Do not assume Next.js is automatically better.

Before broad implementation, make a formal architecture decision between:

1. Astro + selective React islands
2. Next.js App Router + React
3. React/Vite only if it has a real advantage over both

Migration effort itself is not a major constraint.

Optimize for the final system:

- interaction architecture;
- shared client state;
- React Bits / motion integration;
- client JavaScript footprint;
- performance;
- static generation / SEO;
- bilingual routing;
- project content management;
- image/media handling;
- deployment;
- maintainability;
- clarity for future coding agents.

Inspect the approved motion/design system in `PORTFOLIO_BRIEF.md` and determine how much of the actual site benefits from a React-first tree versus selective islands.

Choose ONE architecture.

Do not preserve Astro because it already exists.
Do not migrate because migration is easy.

---

## Architecture gate

Before making broad visual changes:

1. inspect the existing implementation;
2. run the current quality/build checks;
3. identify architecture worth preserving;
4. identify architecture that should disappear;
5. compare the three framework options;
6. choose one;
7. create/update `docs/ARCHITECTURE.md` explaining:
   - decision;
   - reasons;
   - rendering model;
   - route/i18n model;
   - project-content model;
   - state ownership;
   - motion stack;
   - dependency responsibilities;
   - deployment;
   - migration implications.

Once the decision is documented, proceed with the implementation. Do not wait for confirmation unless there is a genuine blocker that cannot be resolved from the repository or brief.

If migrating, perform a clean migration rather than maintaining two competing architectures.

---

## Repository goals

The final repo should have obvious separation between:

- product/content;
- UI primitives;
- homepage sections;
- project components;
- interactive visuals;
- motion utilities;
- SEO;
- i18n;
- site config;
- project queries/schema;
- agent documentation;
- project tooling.

Centralize:

- site/social configuration;
- design tokens;
- project visibility rules;
- project schema;
- SEO URL helpers;
- translation/accessibility strings.

Remove:

- duplicated EN/ES page bodies where avoidable;
- duplicated metadata;
- dead config;
- obsolete migration code;
- abandoned visual experiments;
- redundant dependencies.

Do not leave temporary adapters unless absolutely required.

---

## Git as CMS — core requirement

Adding or editing a normal project must require **zero application-code changes**.

Lucas must be able to manage projects through Claude Code, Codex, Cursor, another agent, or direct Git edits.

Create a clean project content architecture with:

- one source of truth for shared metadata;
- separate EN/ES narrative content;
- centralized project status/visibility behavior;
- media support;
- featured/order support;
- GitHub/demo/paper links;
- related work where useful.

Use the real production schema everywhere.

Do not duplicate the schema in tests.

Create:

`docs/PROJECT_CONTENT_CONTRACT.md`

It must be sufficient for a new coding agent to safely create/edit projects without understanding the frontend.

If useful, add:

```bash
npm run project:new -- project-slug
npm run project:validate
```

These commands must use the real production content contract/schema.

---

## Design direction

Follow `PORTFOLIO_BRIEF.md`.

Do not generate five alternative styles.

Choose one coherent system.

The main homepage sequence is:

1. Hero
2. “I build across layers”
3. Technical Worlds
4. Selected Projects
5. later: Lab
6. later: About
7. later: Contact

### Hero

Immediate semantic content.
Restrained signal/dither/generative visual.
No mandatory loader.
No heavy shader on the critical path.

### “I build across layers”

Typography-led conceptual bridge:
models → computation → digital logic → hardware → signals, or a stronger equivalent.

### Technical Worlds

The major motion moment.

One controlled vertical-scroll-driven horizontal journey through:

- AI / ML
- Quantum
- FPGA
- Electronics
- Audio

Use one coherent visual stage with domain-specific behavior.

Do not run five heavy canvases simultaneously.

Preferred conceptual language:

- AI → nodes / relations / representation spaces
- Quantum → waves / phase / interference
- FPGA → grids / routing / logic paths
- Electronics → PCB traces / signal flow / diagrams
- Audio → waveform / spectrum / resonance

Use the simplest suitable technology for each visual.

### Selected Projects

Reduce intensity.
Editorial, readable, strong project cards.
Subtle depth/tilt + spotlight + optional media preview.
No hover-only critical information.

---

## Component/effect sources

You may inspect and adapt components/patterns from:

Primary:

- React Bits
- 21st.dev
- Motion / Motion Primitives

Secondary:

- Aceternity
- Magic UI
- Hover.dev
- Fancy Components
- SmoothUI
- Codrops

Animation:

- CSS
- Motion
- GSAP / ScrollTrigger

Heavy visuals:

- canvas
- Three.js
- shaders

Do not install every library.

Every dependency must have a clear responsibility.

Prefer adapted/owned code over a permanent pile of overlapping UI libraries.

---

## Performance contract

The current site is very lean. Preserve that engineering mindset even if the experience becomes richer.

Required:

- no mandatory preloader;
- Hero content visible immediately;
- no WebGL dependency for first meaningful content;
- dynamic import expensive effects;
- pause offscreen animation;
- at most one heavy visual stage rendering at once;
- CSS/SVG/DOM before WebGL when equivalent;
- capped DPR for heavy graphics;
- mobile quality adaptation;
- static fallback;
- optimized media;
- minimized layout shift;
- self-hosted fonts where practical;
- production measurement after framework selection.

`shader.se` is a creative ceiling, not an architecture or loading-time target.

---

## Accessibility / responsive

The redesign must improve the issues documented in `AUDIT.md`.

Required:

- semantic HTML;
- heading hierarchy;
- skip link;
- keyboard navigation;
- visible focus;
- accessible mobile navigation;
- correct contrast;
- no hover-only content;
- localized accessibility labels;
- intentional `prefers-reduced-motion`;
- decorative visual effects excluded from the accessibility tree;
- mobile-specific composition rather than scaled-down desktop.

Reduced-motion mode must remain visually complete.

---

## SEO / i18n

EN and ES are first-class.

Resolve or preserve fixes for:

- absolute/canonical-consistent hreflang;
- sitemap;
- OG image;
- localized metadata;
- Spanish navigation/CTA routing;
- favicon/base paths;
- résumé asset/link;
- production URLs.

Avoid duplicated page implementations that can drift between languages.

---

## Quality / audit

Treat every verified finding in `AUDIT.md` seriously.

Do not hide failing checks.

Fix root causes for issues that intersect with the work.

Ensure the final quality pipeline has real:

- formatting;
- type checking;
- lint;
- tests;
- production build.

Tests must exercise production schema/logic rather than copied versions.

---

## Implementation sequence

Work in this order:

### 1. Baseline

Inspect repo, audit, content, build, deployment and runtime footprint.

### 2. Architecture

Choose Astro / Next / Vite.
Write `docs/ARCHITECTURE.md`.

### 3. Foundation

Clean architecture needed for the chosen framework.
Establish:

- repo structure;
- design tokens;
- typography;
- i18n;
- accessibility foundation;
- centralized config;
- project schema/content architecture;
- agent documentation;
- quality gates.

### 4. Experience prototype

Implement the first coherent visual slice:

- navigation;
- Hero;
- “I build across layers”;
- Technical Worlds;
- Selected Projects using real existing project data;
- mobile;
- reduced motion.

### 5. Verify

Run all quality gates and production build.

Inspect:

- desktop;
- mobile;
- EN;
- ES;
- keyboard;
- reduced motion;
- real deployment/base-path behavior.

### 6. Documentation cleanup

Ensure:

- `docs/ARCHITECTURE.md`
- `docs/PROJECT_CONTENT_CONTRACT.md`
- `docs/MOTION_SYSTEM.md`
- project-level agent instructions such as `CLAUDE.md`

accurately describe the resulting repository and reference `PORTFOLIO_BRIEF.md` instead of duplicating it.

---

## Scope control

Do not redesign every secondary page before the core design language works.

The first visual pass should prove:

- identity;
- layout;
- motion system;
- Technical Worlds;
- project cards;
- responsive behavior;
- project content architecture.

Then deeper project detail pages, Lab, About, Contact and additional polish can follow.

However, do not knowingly leave broken production links, routing, SEO, accessibility, or CI issues in code you touch.

---

## Final standard

The final repo should look deliberate, not generated.

The design should be memorable because the interaction, content and engineering identity are coherent — not because it contains the maximum number of effects.

The architecture should be simple enough that a future coding agent can understand where a change belongs without reverse-engineering the whole site.

Start now by reading both source-of-truth files, inspecting the repository and running the baseline checks. Then make the framework decision, document it, and proceed through the implementation sequence above.
