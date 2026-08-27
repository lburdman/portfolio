# /frontend-design — Coordinated Live Redesign Review

You are the **lead coordinator** for a second-pass redesign of Lucas Burdman's existing portfolio.

This is NOT a greenfield design task.

The portfolio already has a coherent concept and implementation. Your job is to inspect the live experience critically, delegate focused reviews to keep context under control, decide what should remain, and make the existing concept land much harder.

The desired outcome is:

- more memorable;
- more perceptible;
- more interactive;
- more technically meaningful;
- more “wow” in selected moments;
- still elegant, fast, accessible and professional.

Do not equate “wow” with more effects everywhere.

The core idea remains:

> Lucas builds across layers — from signals and hardware, through digital logic and computation, to models and intelligent systems.

---

# 0. COORDINATOR BEHAVIOR — MANDATORY DELEGATION

You are the coordinator. **Do not personally absorb the entire repo and attempt every review in one context.**

Delegate focused tasks to subagents/subsessions wherever the environment allows it.

At minimum delegate these workstreams:

### Agent A — Live UX & Motion Reviewer

Scope:

- deployed homepage;
- desktop + mobile;
- normal scroll + slow scroll;
- hover/focus;
- Technical Worlds traversal;
- project-card interactions;
- perceptibility and page rhythm.

Deliverable:
a short section-by-section report with screenshots/state descriptions where possible.

### Agent B — Motion Semantics Specialist

Scope:

- Hero visual;
- Layers;
- all five Technical Worlds;
- project-card interactions.

Question:
Does each animation visually communicate the technical concept it represents?

Deliverable:
KEEP / TUNE / REPLACE recommendation for each effect, with no code unless necessary.

### Agent C — Content & Positioning Reviewer

Scope:

- Hero;
- About;
- credentials;
- experience;
- projects;
- ES/EN copy;
- current profile facts already documented in the repo and review brief.

Deliverable:
specific content problems and recommended information hierarchy.

### Agent D — GitHub / Project Evidence Reviewer

Scope:

- relevant public Lucas Burdman repositories;
- project quality;
- supporting assets/plots/diagrams;
- which repos/projects should be flagship vs Lab vs omitted.

Deliverable:
project-evidence map.

### Agent E — Frontend / Performance Reviewer

Scope:

- current implementation architecture;
- motion runtime;
- bundle/performance implications;
- reduced motion/mobile;
- whether proposed upgrades can reuse SVG/Canvas/CSS/GSAP before adding heavy dependencies.

Deliverable:
implementation constraints and recommended technology per upgrade.

The coordinator should receive **concise findings**, not full code dumps.

Do not ask subagents to duplicate the whole review.

Maintain one decision log rather than keeping all investigative context active.

If useful create/update:

`docs/REDESIGN_DECISIONS.md`

with:

- observation;
- decision;
- rationale;
- owner/component;
- status.

---

# 1. REQUIRED SOURCE CONTEXT

Before coordinating implementation, read:

- `PORTFOLIO_BRIEF.md`
- `AUDIT.md`
- `CLAUDE.md`
- `docs/ARCHITECTURE.md`
- `docs/MOTION_SYSTEM.md`
- `docs/PROJECT_CONTENT_CONTRACT.md`
- any current content strategy document
- current EN/ES dictionaries

Use the existing repo and deployed site as source of truth for current implementation.

Live site:

`https://lburdman.github.io/portfolio/es/`

Also inspect the English version.

---

# 2. ACTUALLY NAVIGATE THE LIVE SITE

This step is mandatory.

Do not review motion only by reading source.

Use browser tooling available to you and experience the site as a visitor.

Desktop:

1. open the Spanish homepage;
2. do not inspect source yet;
3. spend a few seconds on the Hero;
4. move the pointer across the Hero;
5. scroll top-to-bottom at a normal browsing speed;
6. repeat slowly;
7. traverse every Technical World;
8. deliberately move the pointer within every visual;
9. hover every project card;
10. open at least two project pages;
11. visit About;
12. use navigation back to Home.

Repeat important states in English.

Then inspect:

- mobile viewport;
- keyboard;
- reduced-motion.

Record what was actually noticeable before looking at exact animation parameters.

The distinction matters:

**an effect existing in code is not the same as an effect existing in the user's experience.**

---

# 3. CURRENT EXPERIENCE — DO NOT THROW IT AWAY

The existing homepage already has:

1. Hero
2. “Construyo a través de capas”
3. Technical Worlds
4. Selected Projects

This is a good conceptual foundation.

Do not replace it with a standard portfolio template.

The main goal is to make the current narrative:

- clearer;
- less repetitive;
- more evidence-backed;
- more visually impactful.

---

# 4. CURRENT CONTENT/RHYTHM HYPOTHESES TO VERIFY

Do not blindly accept these. Verify them live.

### Hypothesis A — Hero is too visually quiet

The signal field may technically animate but remain too background-like.

### Hypothesis B — “layers” repeats the Hero concept

The Hero already says “Construyo a través de capas” and the next section repeats the same phrase/idea.

Look for a better narrative progression rather than repeating the thesis.

### Hypothesis C — Technical Worlds carries too much of the wow-factor

If the worlds are understated, the overall homepage feels much flatter than intended.

### Hypothesis D — project cards are too passive

Current cards may read as high-quality editorial layouts but not as tactile interactive objects.

### Hypothesis E — the page needs stronger rhythm

It should alternate:
calm → build-up → signature moment → calm evidence → tactile exploration.

---

# 5. MOTION INTENSITY MODEL

Use three explicit intensity classes.

## AMBIENT

Continuous or idle visual atmosphere.

Examples:

- Hero signal field;
- low-level waveform movement;
- subtle texture.

Ambient may be restrained.

## SIGNATURE

Moments a visitor should remember.

Examples:

- entering Technical Worlds;
- activating each domain;
- transitions between domains.

Signature motion must be unmistakable during normal browsing.

## TACTILE

Immediate response to input.

Examples:

- project cards;
- CTAs;
- technical-area links;
- pointer interaction inside world visualizations.

Tactile feedback should be obvious within ~100–250 ms.

---

# 6. PERCEPTIBILITY RULE

Use this test:

> If a deliberate interaction cannot be noticed by a normal visitor during ordinary browsing unless somebody tells them where to look, it is too subtle.

This does NOT mean everything should constantly move.

It means intentional feedback should actually register.

---

# 7. HERO — KEEP THE IDEA, RETUNE THE EXPERIENCE

The current signal-field idea is good because it relates to engineering/signals and is lightweight.

Before replacing it, test whether it can be improved through:

- stronger local pointer deformation;
- slightly higher visible contrast;
- clearer depth;
- line-density hierarchy;
- faster response;
- occasional localized interference/convergence;
- restrained use of accent near pointer influence.

Do not just increase global opacity.

Success criteria:

- the page loads immediately;
- Lucas's name remains dominant;
- within ~1 second a visitor notices the visual is alive;
- moving the pointer produces an unmistakable but refined response.

WebGL is not automatically needed.

---

# 8. LAYERS — MAKE IT A TRANSITION, NOT A SECOND INTRODUCTION

Current concept:
models → computation → digital logic → hardware → signals.

Keep the conceptual purpose but review the presentation.

Possible directions:

- stronger typographic scroll progression;
- visual descent through abstraction;
- a single evolving technical motif;
- words entering/leaving with more spatial purpose;
- each layer activating as the user crosses it.

Do not simply animate five list rows upward.

The visitor should feel:
“I am moving through abstraction levels.”

Avoid repeating the exact Hero thesis copy.

---

# 9. TECHNICAL WORLDS — THE SIGNATURE EXPERIENCE

This must become the strongest visual interaction on the homepage.

Keep the idea of one horizontal journey controlled by vertical scroll unless the live review finds a serious UX issue.

Improve:

- world activation;
- transitions;
- visual scale;
- pointer responsiveness;
- conceptual clarity.

Every world needs:

### Activation event

400–1000 ms.
Clearly visible.

### Ambient state

Calmer motion after activation.

### Pointer interaction

Immediate and meaningful.

The current system should not rely primarily on slow opacity breathing.

---

# 10. AI / MACHINE LEARNING — RECONSIDER CURRENT VISUAL

The current implementation is based on:

- projected points;
- nearest-neighbour edges;
- pointer-selected representation relationships.

This is technically defensible.

However, Lucas feels it reads too much like a generic node/network visualization rather than clearly communicating Machine Learning.

Evaluate alternatives.

Strong candidate direction:

## Interactive classification / embedding landscape

Resting:

- a set of points in a 2D feature/embedding space;
- classes are initially partially mixed or minimally encoded.

Activation:

- points organize into meaningful clusters;
- a decision boundary / class region appears;
- or a latent projection resolves from noisy space into separable structure.

Pointer:

- nearest points reveal class membership;
- points of the selected class become colored/emphasized;
- decision region under pointer becomes visible;
- local neighbours can remain as secondary information.

Potential visual structures:

- 2–3 clusters;
- soft Voronoi/decision regions;
- nonlinear classification boundary;
- confidence contour;
- selected datapoint + local neighbourhood.

The goal is to communicate:

**data → representation → structure → classification**

not:

**AI = connected circles.**

Do not create a textbook-looking scikit-learn chart.
Keep it editorial and elegant.

The motion-semantics specialist should choose the best variant after seeing the live layout.

---

# 11. QUANTUM — CONSIDER AN INTERACTIVE BLOCH-SPHERE VISUAL

The current interference concept is legitimate and technically meaningful:
two coherent sources influence an interference distribution.

Do NOT replace it merely because a Bloch sphere is more recognizable.

Evaluate which communicates Lucas's quantum work better.

However, a **minimal interactive Bloch-sphere-inspired visualization is explicitly encouraged as a candidate**.

Possible high-quality direction:

### Bloch/state visual

Show:

- subtle wireframe sphere;
- X/Y/Z or |0〉 / |1〉 orientation;
- state vector;
- phase/equator hint.

Activation:

- vector begins at |0〉;
- a gate-like transformation moves it into a superposition state;
- perhaps a restrained trace/orbit shows the rotation.

Pointer:

- pointer movement or drag changes θ / φ;
- state vector follows;
- tiny probability readout or bar pair updates:
  `P(0)`
  `P(1)`

Optional:

- click/tap can perform a measurement/collapse event if that interaction remains intuitive.

Do not:

- show orbiting electrons;
- use neon atom clichés;
- make a huge 3D globe;
- add a full quantum-computing simulator.

Implementation should first consider:

- SVG + mathematical projection;
- lightweight canvas;
  before Three.js/WebGL.

A hybrid concept is also possible:
Bloch state as the main interactive visual + very restrained interference/probability trace.

Do not use two competing visual metaphors unless the composition remains clear.

---

# 12. FPGA / DIGITAL DESIGN — CURRENT CONCEPT IS STRONG

The current visual uses:

- logic-cell grid;
- Manhattan routing;
- selectable nets;
- propagating pulse;
- clock reference.

This is strongly aligned with FPGA/place-and-route.

Bias toward KEEP + TUNE rather than replacement.

Possible improvements:

- activation clears/assembles the route;
- cells latch visibly as path resolves;
- propagation pulse has stronger contrast;
- pointer selection of alternate routes feels quicker;
- brief timing/clock accent makes deterministic behavior more obvious.

Do not replace a technically strong visual with generic circuitry.

---

# 13. ELECTRONICS — CURRENT CONCEPT IS STRONG, MAKE THE SIGNAL TRANSFORMATION CLEARER

The current visual represents:
source → filter → conversion → processing → output.

That concept is aligned.

Potential upgrade:
make each stage visibly alter the signal.

For example:

- source: analog waveform;
- filter: smoothed/attenuated representation;
- ADC: quantized steps;
- processing: digital pulse/data state;
- output: final driven signal.

Activation:
a pulse travels through the entire chain.

Pointer:
selecting a block pauses/highlights the signal at that transformation.

Consider small localized labels if they improve comprehension:
`SENSOR`
`FILTER`
`ADC`
`MCU`
`OUT`

Use the existing i18n system if labels are rendered.

Do not stay so abstract that only the author understands the glyphs.

---

# 14. AUDIO / ACOUSTICS — CURRENT CONCEPT IS GOOD

The existing time-domain waveform + frequency-domain spectrum concept is aligned and technically meaningful.

Bias toward KEEP + TUNE.

Improve:

- pointer response;
- visual amplitude;
- activation impulse;
- relationship between waveform and spectrum;
- maybe one clear resonant peak behavior.

Because Lucas has an acoustics room-mode project in progress, a very subtle resonance/modal hint may be appropriate later.

Do not convert the section into the WIP project itself.

---

# 15. WORLD-TO-WORLD TRANSITIONS

Current horizontal translation alone is not enough to create five memorable worlds.

Evaluate a shared transition grammar.

Possible pattern:

1. outgoing visualization decays/loses energy;
2. typography/domain accent changes;
3. incoming world performs its activation event.

Keep transition duration controlled.

Avoid crossfading entire pages.

The site should feel like one instrument changing modes, not five unrelated slides.

---

# 16. PROJECT CARDS — MAKE INTERACTION TACTILE

Current card interaction is deliberately very restrained.

The new pass may use stronger pointer-specific physical feedback on desktop.

Candidates:

- ~2–4° max perspective tilt;
- pointer-aware spotlight;
- slightly stronger lift;
- channel/accent bars reacting;
- image/parallax when real media exists;
- CTA arrow response;
- preview transition where a real demo/video exists.

Do NOT stack all of these automatically.

Choose a coherent interaction.

Keyboard focus does not need to reproduce literal mouse tilt.
It needs equivalent clarity and emphasis.

Touch should remain complete without hover.

---

# 17. USE REAL PROJECT MEDIA

The current homepage is heavily typographic.

Where repositories contain useful:

- plots;
- architecture diagrams;
- screenshots;
- model diagrams;
- demo frames;

use real assets selectively.

Prioritize:

- QNN thesis visual evidence;
- energy forecast plots/dashboard;
- Augmenta architecture/privacy pipeline.

Do not fill the site with stock graphics or AI-generated fake project screenshots.

Project evidence itself can provide wow.

---

# 18. CONTENT POSITIONING

The visual redesign must support, not obscure, the profile.

Primary identity:

- Electronic Engineer
- AI Engineer

Important credibility:

- Claude Certified Architect – Foundations
- MITx MicroMasters in Statistics and Data Science
- professional AI systems work
- quantum/audio thesis
- teaching

Do not anchor the whole identity to the current employer.

Use employer experience as evidence, not identity.

---

# 19. HOME INFORMATION HIERARCHY — REVIEW THIS SPECIFIC ISSUE

The current Home has:
Hero → Layers → Technical Worlds → Projects.

Evaluate whether there is enough professional proof above the fold / early in the page.

A small, elegant credibility strip may help.

Example concept only:

- Electronic Engineering · UBA
- MITx MicroMasters · Statistics & Data Science
- Claude Certified Architect · Foundations

Do not create a badge wall.

The coordinator should decide whether this improves first impression.

---

# 20. PAGE RHYTHM

Aim for something closer to:

### Hero

Calm but visibly alive.

### Layers

Build-up / conceptual movement.

### Technical Worlds

Major signature sequence.

### Projects

Visual calm returns, but cards are tactile.

### Lab / About

Human and exploratory.

### Contact

Quiet ending.

The page should not remain at one motion intensity.

---

# 21. DO NOT OVERPRESCRIBE BEFORE LIVE REVIEW

The AI classification concept and Bloch sphere are **design hypotheses**, not mandatory implementations.

The specialist reviewers should challenge them if they find a stronger idea that:

- maps better to Lucas's actual work;
- is more visually effective in the current layout;
- is cheaper/performs better;
- remains accessible.

But a replacement must be justified.

Do not keep a weaker existing animation only because it already exists.

---

# 22. FIRST COORDINATOR OUTPUT

Before broad edits, return one synthesized review.

Use this structure:

## 1. Live experience

What actually happens while browsing the current site.

## 2. Current strengths

What must not be lost.

## 3. Current weaknesses

Specific and prioritized.

## 4. Motion semantics matrix

For:

- Hero
- Layers
- AI/ML
- Quantum
- FPGA
- Electronics
- Audio
- Project cards

Give:
`KEEP / TUNE / REPLACE` +
why.

## 5. Wow-factor plan

Only 3–5 highest-value upgrades.

## 6. Content hierarchy changes

Only changes with meaningful professional impact.

## 7. Implementation plan

Small, reviewable stages.

## 8. Performance risks

Explicit.

Then implement.

---

# 23. IMPLEMENTATION SEQUENCE

Recommended order:

### Pass 1

AI/ML prototype + Quantum prototype in isolation.

Do not immediately commit both to the production composition.

Compare them visually in the actual Technical Worlds frame.

### Pass 2

Retune FPGA/Electronics/Audio and shared activation grammar.

### Pass 3

Improve world-to-world transition.

### Pass 4

Hero retune + Layers refinement.

### Pass 5

Project-card tactility + real project media.

### Pass 6

Content/credibility refinements.

### Pass 7

Mobile / keyboard / reduced-motion.

### Pass 8

Performance validation + production build.

---

# 24. CONTEXT CONTROL DURING IMPLEMENTATION

The coordinator must keep the session focused.

Rules:

- delegate repository exploration;
- delegate project-content inspection;
- ask agents for concise summaries;
- do not paste entire files back into coordinator context;
- do not re-read unrelated directories every pass;
- record decisions persistently in docs;
- give implementation agents exact file/component scope;
- verify each pass before starting the next;
- kill abandoned prototypes and dependencies.

When delegating, specify:

- objective;
- files/area;
- constraints;
- required output format.

Do not tell every agent the entire history of the portfolio.

Give each agent only the context it needs.

---

# 25. FINAL DESIGN STANDARD

The portfolio should not look like a template.

It should not look like an effect library.

It should feel like an engineer designed a visual system around the concepts he actually works with.

The stronger experience should come from:

- meaningful interactive models;
- better activation;
- stronger rhythm;
- real technical evidence;
- tactile feedback;
- controlled surprise.

Not from decorative excess.

The ultimate test:

A visitor should remember at least one interaction after closing the tab, while still remembering that Lucas is an engineer — not merely that the website had animations.
