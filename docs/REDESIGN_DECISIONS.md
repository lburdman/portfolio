# Redesign decisions — pass 2

**Date:** 2026-08-27 · **Status:** reviewed, not yet implemented
**Method:** five parallel reviews — live UX (real Chrome + Playwright), motion semantics, content, GitHub evidence, performance.

Every figure below was measured. Nothing here is an impression.

---

## The finding that reorders the brief

The brief asked for a more memorable site. The reviews found the site is **not yet true**.

Three of the four "View on GitHub" links are 404s, and four claims in the case studies are
contradicted by the repositories they describe. On a portfolio whose entire purpose is
evidence, that outranks every visual upgrade in the brief. Fix truth first, then wow.

Worth naming precisely: the previous pass migrated all four case studies **byte-for-byte**
and verified them against `git show HEAD:`. That verification was correct and worthless —
it proved fidelity to a source nobody had checked against reality. _The content did not
change_ and _the content is true_ are different claims, and only the second one matters here.

---

## P0 — Correctness. Nothing ships before these.

| #   | Observation                                                                                                                                                                          | Decision                                                                                  | Rationale                                                                                 | Owner      | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------- | ------ |
| 1   | `energy-demand-forecasting`, `qnn-speech-recognition`, `support-ticket-classifier` all **404**. Real repos: `energy-demand-forecast`, `qnn-transfer-learning`, `leaderPruebaTecnica` | Correct all three URLs in `project.json`                                                  | A recruiter clicking three of four projects hits a 404                                    | content    | open   |
| 2   | Add a link-liveness check                                                                                                                                                            | `project:validate` resolves every external URL over the network (opt-in flag for offline) | The schema validates URL _shape_; it never checked the target exists                      | tooling    | open   |
| 3   | `energy-forecasting` claims **quantile regression**; repo uses **conformal prediction** (quantile is Future Work)                                                                    | Correct the copy                                                                          | False technical claim                                                                     | content    | open   |
| 4   | Same file claims **LightGBM** and **weather-derived signals**; `model_metrics.csv` has only Naive/Ridge/RandomForest/XGBoost, weather is Future Work                                 | Remove both                                                                               | False technical claim                                                                     | content    | open   |
| 5   | `augmenta` stack listed **Python/FastAPI/Docker**; repo is majority **Go** (only the Presidio service is FastAPI)                                                                    | Correct the stack                                                                         | False technical claim                                                                     | content    | open   |
| 6   | `augmenta` claims **deterministic pseudonyms with referential integrity across turns**; shipped operator is a flat `replace` with `<REDACTED>`                                       | Correct or remove                                                                         | Overstates the system                                                                     | content    | open   |
| 7   | **No `id="contact"` exists on any page**, but nav, mobile menu, footer and the Hero CTA all link to `#contact` — 4 dead anchors, both locales                                        | Build the Contact section. Strings already exist in both dictionaries, rendered nowhere   | Brief §12 requires it. Five gates and 288 tests passed with the primary CTA going nowhere | components | open   |
| 8   | Nothing asserts in-page anchors resolve                                                                                                                                              | Add a test: every internal `href="#…"` has a matching `id` in the built HTML              | This is exactly how #7 shipped                                                            | tooling    | open   |
| 9   | 3 of 4 **ES case studies are missing their closing section** (EN ends "Key Learnings"; ES stops a section early)                                                                     | Author the missing sections                                                               | Markdown is untyped, so dictionary parity does not reach it                               | content    | open   |
| 10  | Shiki emits a CSP inline-style warning                                                                                                                                               | Switch `markdown.syntaxHighlight` to `prism`                                              | Zero code fences today; the first one added renders unstyled in production, silently      | config     | open   |

---

## P1 — The change that funds everything else

| #   | Observation                                                                                                                                         | Decision                                     | Rationale                                                                                                                    | Owner   | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------- | ------ |
| 11  | Mobile and reduced-motion visitors download **65.7 KB gz of React** to render a static stack — the island hydrates `client:visible` unconditionally | Gate it: `client:media="(min-width: 48rem)"` | Mobile path drops toward 0 KB. Every upgrade below costs +2.7 KB total; this one change pays for all of them many times over | visuals | open   |

---

## P2 — Motion semantics matrix

Verdicts reconcile the semantics review (does it _communicate_?) with the live review
(is it _perceptible_?). Ambient figures are % of pixels changed over 800 ms.

| Element           | Communicates?                             | Measured                                                                    | Verdict                     | Decision                                                                                                                                                                                                   |
| ----------------- | ----------------------------------------- | --------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero signal field | **no** — "woodgrain, not signal"          | **1.2:1** contrast; dominant component completes **<1 cycle across 1440px** | **TUNE**                    | Raise to 3–6 visible cycles; add a zero-rule/graticule; split into 3–4 real carriers + whisper traces; pointer emits a _propagating wavepacket_, not a static dimple. **Do not just raise global opacity** |
| Layer spine       | partly                                    | **0px change over 1.2s**; 99% at ≥207 L                                     | **TUNE — highest leverage** | It maps to page-height fifths, so "computation" can sit beside Projects. **Bind each band to the section it annotates.** Widen amplitude, darken                                                           |
| Layers sequence   | partly                                    | headline is a verbatim substring of the Hero; hover = **0px**               | **TUNE**                    | Retitle to the _destination_ of the descent. Promote `layers.narrative` (the one string that advances the argument). Put each layer's spine glyph in the ordinal column                                    |
| **AI / ML**       | **no**                                    | ambient **0.046%** — frozen; pointer ~0.01%                                 | **REPLACE**                 | Not for the cliché — _"adjacency is a property of any point set; nothing was learned, so nothing is shown."_ Replace with a **forecast + uncertainty fan** (see below)                                     |
| Quantum           | partly                                    | ambient **0.41%**, pointer **1.1%** — best on the site                      | **KEEP + TUNE**             | Terminate wavefronts on the detection line so a crest visibly lands on a bright fringe                                                                                                                     |
| FPGA              | **yes** — strongest concept               | ambient **0.012%** — frozen                                                 | **KEEP + TUNE**             | Tie the pulse to the clock column (one cell per tick) so it reads as synchronous logic, not flow                                                                                                           |
| Electronics       | partly                                    | ambient **0.005%** — frozen                                                 | **KEEP + TUNE**             | Make the trace carry state: sine → smoothed → quantised → pulse train → driven                                                                                                                             |
| Audio             | **yes** — best coupling                   | ambient 0.60%, **but reaches centre exactly as the pin releases**           | **KEEP + fix**              | The finale gets ~zero dwell. Extend the traverse end. Drop the per-bar opacity breathe                                                                                                                     |
| Project cards     | n/a (feedback, not explanation) — correct | settles at **230 ms**; blue CTA carries it                                  | **KEEP + TUNE**             | Add tilt/spotlight via one delegated `pointermove` + `setProperty`                                                                                                                                         |

### Rejected hypotheses, with reasons

- **AI → classification/decision boundary: REJECTED.** A boundary over blobs _is_ the
  scikit-learn chart the brief forbids, and it depicts the most generic possible ML task.
- **Quantum → Bloch sphere: REJECTED on merits, not cost.** A Bloch sphere shows one
  qubit's pure state and can say nothing about parameters, training, or hybridness — so it
  cannot represent PennyLane variational circuits, which is the actual work. Ranking:
  circuit > interference > Bloch. Since Quantum already measures best on the live site,
  **keep and tune**. (Cost was never the objection: the SVG route is ~1.2 KB, because under
  orthographic projection every meridian projects to an exact ellipse.)
- **Three.js: REFUSED, measured.** A minimal Bloch sphere bundles at **129.0 KB gz**
  against **5.8 KB** of headroom — 15–22× the entire remaining budget. `WebGLRenderer`
  drags the whole shader-chunk library; there is no smaller configuration.

### The AI replacement, and why it matters more than it looks

A series runs left to right; at a "now" rule the solid line stops and a **quantile fan**
opens rightward, widening with horizon. Pointer moves the horizon — further ahead, wider
band. Let the realised path continue faintly through the fan and _rolling-origin validation
is drawn without a caption._

The convergence that decides it: the strongest real asset found in Lucas's repositories is
`prediction_interval_plot.png` — a 14-day actual-vs-forecast with a **95% conformal band**.
The visual and the evidence are the same idea. The homepage animation becomes a diagram of
work he actually shipped, and the project card proves it. A node graph could never do that.

**Honesty constraint:** the band is **conformal**, not quantile (see P0 #3). Whatever the
visual implies must match what the repo does.

---

## P3 — Activation grammar (0 JS, largest perceptual gain per byte)

| #   | Observation                                                                                                                                               | Decision                                                                                                                                                     | Rationale                                                                                                             | Owner   | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------- | ------ |
| 12  | **No world has an activation event.** Every stage animation is `infinite` and opacity-based under `[data-active]`; the transition _is_ "breathing starts" | Shared one-shot grammar on the same flag: each stage draws its own primitive in over ~600 ms, then settles to ambient. Outgoing world drops its accent first | The largest doc-to-build gap in the repo — `MOTION_SYSTEM.md` §3 specifies a 400–1000 ms arrival that was never built | visuals | open   |
| 13  | CSS already has `--duration-deliberate: 720ms` and `StageFrame` already emits `data-active`                                                               | **CSS only. Do not add GSAP.** ScrollTrigger owns scroll _position_, not state transitions                                                                   | +0.5 KB CSS, 0 JS                                                                                                     | visuals | open   |

---

## P4 — Structural defects found live

| #   | Observation                                                                                                                                        | Decision                                                                  | Rationale                            | Owner      | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------ | ---------- | ------ |
| 14  | The pinned traverse is **4500px — 47% of the entire 9507px document**                                                                              | Shorten                                                                   | Half the page is one section         | visuals    | open   |
| 15  | Mid-slide **orphaned text fragments** ("ing", "tas/das") clipped at the viewport edge, persisting 700 ms after scroll stops                        | Investigate and fix                                                       | Looks broken                         | visuals    | open   |
| 16  | Card→detail view transition renders as a **~500 ms full-page cross-fade with ghosting** — the dark Worlds band bleeding over the light detail page | Scope the transition to the paired elements; suppress the root cross-fade | Reads as a flash, not a spatial link | components | open   |
| 17  | **92% of the first viewport is empty**; dead bands at y 80–220 and y 740–900                                                                       | Tighten Hero vertical rhythm                                              | The first second is a static poster  | components | open   |
| 18  | `loading="lazy"` is hardcoded on project images                                                                                                    | Lead card must be `eager` + `fetchpriority="high"`                        | LCP regression once real media lands | components | open   |

---

## P5 — Content and positioning

| #   | Observation                                                                                                                                                                                       | Decision                                                                                                                                                                       | Rationale                                                                                                                  | Owner   | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ------- | ------ |
| 19  | **The thesis is told three times** in the first two screens: `hero.positioning`, `layers.heading` (a verbatim substring), `worlds.subtitle`                                                       | Retitle `layers.heading` to the destination of the descent; rewrite `worlds.subtitle`. **Keep `layers.narrative` unchanged** — it is the one string that advances the argument | Repetition reads as thin, not emphatic                                                                                     | content | open   |
| 20  | **Zero credibility anywhere.** MITx MicroMasters, Claude Certified Architect, the UBA degree and the thesis appear in no string in either locale. About's chips restate its own `<h1>`            | Add a credibility strip in the Hero, between positioning and CTAs. **Hard cap of three**, typed as a 3-tuple so a fourth is a compile error                                    | Not clutter — the Hero currently has a name, a role, one sentence and buttons. It becomes a badge wall only if it can grow | content | open   |
| 21  | `worlds.items.electronics.summary` is the only domain with no project or role behind it, and ends on "read the way engineering documentation reads"                                               | Rewrite to make the honesty explicit rather than dressing it up                                                                                                                | A clause about _how it reads_ is the one piece of true filler on the page                                                  | content | open   |
| 22  | ES **dictionary** is genuinely well written (impersonal _se_, restructured not word-tracked). ES **case-study markdown** is the weak half — bare English nouns, at least one calqued participial  | Revise the ES markdown                                                                                                                                                         | Two quality levels in one language                                                                                         | content | open   |
| 23  | `uma-duplicados` is not on the site: 8 ADRs, ports/adapters, HMAC-salted correlation, PII-leak tests, precision/recall eval CLI — _"the only README written in Lucas's own evidence-first voice"_ | Evaluate for flagship                                                                                                                                                          | Stronger evidence than one currently-featured project                                                                      | content | open   |

---

## What must come from Lucas — do not invent

- **MITx MicroMasters**: completed or in progress, and the year (the strip must not overstate)
- **Claude Certified Architect – Foundations**: issue date and credential URL
- **Résumé PDF** — `SITE.resumePath` is `null`, so the CTA is coded and never renders
- **The quantum/audio thesis**: title, year, public link — and whether it _is_ `quantum-audio`, which currently reads as a side project rather than a thesis
- **Professional AI work**: what can be said without naming the employer
- **Electronics**: any real circuit/instrumentation work
- **About**: a portrait (`about.portraitAlt` exists, rendered nowhere) and 2–3 non-technical interests

---

## Confirmed good — do not regress

- **Keyboard**: focus ring 2px `rgb(30,63,216)` at 3px offset, always in viewport, skip link first. Mobile menu opens on Enter, focus enters the panel, **Escape closes and returns focus to the toggle** — verified by actually pressing the keys. This closes the item carried as unverified through the entire previous pass.
- **Reduced motion**: the pinned traverse is removed entirely (document 9507→6946px), worlds become a static vertical stack. Intentional, not broken.
- **Mobile**: genuinely re-authored, not reflowed — type rescales, spine hidden, per-world coloured left rule.
- **The Worlds frame as a system**: shared bracket frame, per-world accent, progress ticks. It does read as one instrument changing modes. _The problem is the amplitude inside it, not the concept._
- **Typography**: expanded Archivo + IBM Plex Mono on paper. Distinctive, not templated, and not any of the three AI-default looks.

---

## Performance envelope

Measured `dist/`, gzip: React+RD 57.2 · GSAP 27.1 · ScrollTrigger 17.4 · island 7.1 · CSS 11.7.

| Path                | Limit | Now      | After all upgrades |
| ------------------- | ----- | -------- | ------------------ |
| Critical (blocking) | 0 KB  | **0 KB** | 0 KB               |
| Stack               | ≤70   | 65.7     | → ~0 with #11      |
| Desktop traverse    | ≤115  | 109.2    | **111.9**          |
| CSS                 | <15   | 11.7     | ~12.8              |

Rules for implementers:

1. **No WebGL, no Three.js.** 129.0 KB gz against 5.8 KB headroom.
2. **Never write `style=""` in markup** — including React `style={{}}` in the SSR'd island; it serialises to an attribute and CSP drops it. Runtime `element.style.setProperty()` is CSSOM and **is** allowed — that is the unlock for pointer-driven card effects.
3. **At most one animating canvas.** The new ML and Quantum visuals must be SVG.
4. **Compute at build time what can be**: decision boundaries, sphere wireframes, cluster layouts. Bake them; do not solve them per frame.
5. **Project media is committed locally** — `img-src 'self' data:` blocks remote GitHub image URLs at runtime.
6. **Re-measure `dist/` after every upgrade.** ~3 KB of headroom remains after all six.

---

## Open questions the reviews could not close

- **The view-transition title morph.** Names pair correctly on both sides and Chrome supports the typed `attr()` syntax, but across 24 screencast frames only a full-page cross-fade was observed — the H1 was never seen travelling. Frame pacing may have missed it. **Not confirmed visible.**
- **Discrete per-world activation.** Before/after diffs are dominated by the horizontal slide, so "a thing fired" cannot be separated from "the panel moved." Only steady-state ambient and pointer figures are clean.
- **Whether the orphan text fragments are a bug or intended.** Observed 700 ms after scroll stopped, so they persist.
- **Real touch gestures.** Viewport and touch flags were emulated and scrolling was programmatic; no swipe was performed.
- **Frame rate.** Pixel diffing measures _amount_ of change, not jank. Nothing here claims 60fps.
- **Appearance on a real display.** All contrast figures are headless sRGB. 1.2:1 is far enough below the ~3:1 visibility threshold that the conclusion holds regardless.
