# Redesign decisions — pass 2

**Date:** 2026-08-27 · **Status: implemented** (`0b05cf2`, `005924d`)
**Method:** five parallel reviews — live UX (real Chrome + Playwright), motion semantics, content, GitHub evidence, performance — then three implementation waves.

Every figure below was measured. Nothing here is an impression.

---

## What shipped

|                                              | Before     | After                       |
| -------------------------------------------- | ---------- | --------------------------- |
| GitHub links that resolve                    | 1 of 4     | **4 of 4**                  |
| Case-study claims contradicted by their repo | 16         | **0**                       |
| `#contact` anchors with a target             | 0 of 4     | **4 of 4**                  |
| JS on the mobile / reduced-motion path       | 67.2 KB gz | **0 B**                     |
| Hero field contrast                          | 1.32:1     | **3.85:1** (4.74:1 darkest) |
| Hero pointer response, peak                  | 30/255     | **120/255**                 |
| Electronics world, arrival                   | 0.18%      | **6.51%**                   |
| FPGA world, arrival                          | 0.29%      | **2.64%**                   |
| Pinned traverse, share of document           | 43.1%      | **30.4%**                   |
| Audio (finale) dwell at centre               | 0          | **755** — the longest       |
| Project media on the site                    | none       | **4 committed assets**      |
| Tests                                        | 288        | **370**                     |

**Budget after all of it:** critical path 0 blocking bytes · desktop traverse
109.5 KB of 115 · CSS 14.62 KB of 15 — **0.38 KB of headroom left, so the next
addition has to buy its way in.**

### Still open

- **Confirm with Lucas** — the list at the end of this document. Five credential
  facts are live on the site as claims and none are verified.
- **`augmenta` was demoted on legibility, not merit.** It is the strongest
  engineering of the four (four services, two languages, AES-GCM envelope
  encryption, a typed fail-closed error taxonomy) and the only one a reader
  cannot check. One architecture diagram or a tokenize→echo→rehydrate
  transcript earns position 20 back.
- **`leaderPruebaTecnica`** — the support-classifier link now resolves, but the
  repo name announces a technical test. Unfeaturing does not help (the listing
  renders the same link); renaming the repo does.
- **The forecast plot is a matplotlib export on an editorial page.** White
  ground, matplotlib blue, foreign to the paper/ink system. Shipping it is the
  right trade — real evidence beats palette harmony, and restyling someone's
  chart risks misrepresenting it — but it wants a more deliberate frame.
- **Not verified anywhere in this pass:** frame rate (pixel diffing measures
  amount of change, not jank), real touch gestures, and appearance on a
  physical display. All contrast figures are headless sRGB.

### The pattern worth keeping

Every serious defect found in this pass was in something already green. Three
404 links passed a schema that validated URL _shape_. A primary CTA pointed at
nothing through 288 tests. A link test validated **7 of 266** internal links
while reporting success. Sixteen false claims survived a migration verified
byte-for-byte against `git show HEAD:` — fidelity to a source nobody had
checked. The spine's progress marker was measured as "static" and read as
intentional; it was a zero-duration animation sitting at progress 0.

None of these were caught by running the checks. They were caught by asking
what the checks actually prove.

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

---

# Redesign decisions — pass 3 (motion recovery)

Pass 2 shipped real correctness wins and one large regression. This pass repairs
the regression without giving the wins back, then layers two signature
interactions on the repaired base.

Deployment was verified current before any diagnosis: CI on `3ebd5eb` succeeded,
and `origin/main` matches the deployed build. Every measurement below came from
the live site, not from reading source.

## What actually regressed, with numbers

Measured on the deployed build at 1440x900. Pin runs 1913 -> 4438 (2525px);
track is 5 panels x 1156px inside a 1344px `overflow:hidden` viewport.

| #   | Defect                                                                             | Measurement                                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | No world ever holds at centre                                                      | Track moves 2.14px per 1px scrolled, linear, no plateau. Each world is within 60px of centre for 50-75px of scroll (0.5-0.75 wheel ticks).                                       |
| D2  | World 0 (AI/ML) can never centre                                                   | Closest approach 95px, reached at the instant the pin engages, then only worsens. Gets 300px active vs 525-550px for the others.                                                 |
| D2b | AI/ML's entry animation fires at page load                                         | `getAnimations()` running count goes 3 -> 9 at t=672ms **at scrollY=0**, ~1900px above the fold, back to 3 by 1.8s. Scrolling to the section later triggers zero new animations. |
| D3  | Neighbouring panel text hard-cut mid-word                                          | 2125px of 3400px scrolled (**63%**) has at least one `h3`/`p` crossing the clip edge. At the Quantum panel the visitor reads `Computac`, `clasi`, `co`, `n`.                     |
| D4  | A frozen tail before release                                                       | 350px (3.5 wheel ticks) where the transform is saturated at -4623 but the pin has not released.                                                                                  |
| D5  | World 4 (Audio) also never centres                                                 | Passes through centre at y~4030, overshoots to -94px, freezes there.                                                                                                             |
| D6  | Fast scroll skips a world                                                          | 800px jumps yield active sequence `[0,1,3,4]` — FPGA is never marked current. 100px and 20px steps are fine.                                                                     |
| D7  | Hero pointer response is imperceptible (**not** absent — see the correction below) | With the rAF clock frozen: 6604 changed pixels, peak luminance delta 123/255, up to 30.5px of vertex displacement. Unfrozen, the metric inverts and reads as dead.               |
| D8  | Project card hover is a 2px nudge                                                  | `translateY(-2px)`, no shadow/border/background change. The inner `a.card__link` has `transition: all` and **no hover state at all** — 0% pixels changed.                        |

Reverse scroll was clean and left no stale transform. Console was silent at every
viewport: zero errors, zero CSP violations. Mobile and reduced-motion both
correctly decline to hydrate and show complete content.

### This closes an open question from pass 2

Pass 2 left "whether the orphan text fragments are a bug or intended" unresolved.
They are a bug, and the figure is 63% of the traverse. The `::after` spacer added
in `0b05cf2` fixed the _registration_ error (fragments landing at the wrong
offset) but not the _chop_ — a 1156px panel inside a 1344px clip lets the
neighbour intrude 188px with no mask.

## Root causes, mapped to commits

`0b05cf2` changed the pin end from `+=${distance()}` (travel and scroll cost were
the same number, ratio 1.0) to `+=${2.8 * innerHeight}`. Travel did not shrink —
it grew from 330% to 344% of the viewport with the new spacer. Per-world dwell
fell from ~1109px to ~540px. The stated goal was pass 2's own item #14, "The
pinned traverse is 4500px — 47% ... Shorten." The traverse got shorter on paper
and worse in the hand. **This is the lesson of the pass: a page-share percentage
is not a pacing metric.**

Compounding it, in the same commit:

- `--tw-settle: 800ms` gates ambient motion whose first cycle needs 3-7.5s —
  routinely longer than a world stays active, so the meaningful phase is never
  seen. `tw-wave-travel` runs at 7.5s inside a sub-second-of-attention window.
- The negative `animation-delay` values were deleted (`.tw-bar` had
  -0.43s..-2.16s; edges -0.68s..-4.08s), so every world now arrives frozen at
  keyframe 0. The one stage that still reads as continuous, `.tw-ripple circle`,
  is exactly the one that kept its negative delays.

Two causes predate pass 2 and were merely made visible by it: there is **no
`snap`** anywhere in the repo, and `setActiveIndex` is called inside ScrollTrigger
`onUpdate`, re-rendering five panels and five stages every tick.

### The geometry bug behind "never centres"

The track carried a single **trailing** 188px spacer. With a 1156px pitch in a
1344px viewport, panel 0's centre sits 94px right of viewport centre at
`translateX: 0` — centring world 0 was structurally impossible, and world 4
overshot by the same 94px at the far end.

Fix: **symmetric** leading and trailing spacers of `(100% - pitch)/2` each.
Centring world _i_ then becomes exactly `tx = -i * pitch`, both ends land dead
centre, and total travel is unchanged.

## Kept from pass 2 — do not regress these

The `::after` spacer's whole-pitch registration fix; `travelProgress` /
`TRAVEL_SHARE`; the `clampIndex(-0)` fix; the `useSyncExternalStore` media hook;
the `client:media` hydration gate (0 KB on mobile); the `LayerSpine`
`animation-duration: auto` fix; and every hero contrast change in `005924d`,
which took the field from 1.32:1 to 3.85:1.

## Pacing model

The single linear tween is replaced by an alternating segment timeline:

```
hold(0)  move(0->1)  hold(1)  move(1->2)  hold(2)  move(2->3)  hold(3)  move(3->4)  hold(4)
```

Five real dwells at exact centre, four eased moves. `hold(4)` **is** the finale
dwell, so the dead tail (D4) is deleted rather than tuned.

Active index is derived from **which segment the timeline is in**, not from
`Math.round(progress * (count-1))`. Index _i_ becomes active at the start of
`hold(i)` — exactly when the panel reaches centre — so every arrival animation
starts on a centred panel and runs during a real dwell. The outgoing world stays
active through the move so its ambient keeps running as it slides out.

### On the budget test

`tests/worlds.test.ts` asserted `pin/(rest+pin) < 1/3` against a hardcoded
`rest = 5750`, capping the per-step scroll at 0.698 and thereby **enforcing the
bad pacing**. The bound was retuned, not deleted: a real assertion still fails if
someone makes the traverse absurdly long, and the test carries a comment saying
what it now protects and why 1/3 was wrong. Arbitrary round numbers do not
outrank correct pacing — but they are replaced by a justified number, never by
nothing.

## Local progress channel

Stages previously received a boolean `active` and nothing else. They now also
receive a continuous local progress `p` in [0,1] spanning each world's full
ownership window, with **p = 0.5 falling exactly at the centred dwell**. This is
a hard requirement, not a convenience: the Bloch sphere keys its `|+>` midpoint
to it.

`p` is delivered by CSSOM custom-property writes plus a ref-based subscription —
never React state per frame.

## Quantum — scroll-driven Bloch sphere

Replaces the interference visual. User direction, not up for relitigation.

`|psi(theta)> = cos(theta/2)|0> + e^{i phi} sin(theta/2)|1>`, with
`theta = p * pi`, so p=0 -> `|0>` at +Z, p=0.5 -> `|+>` at +X, p=1 -> `|1>` at -Z.

- **SVG, not canvas** — and the reason is CSP. Every colour must come from a
  stylesheet rule; SVG reads `--tw-accent` natively, canvas would need
  `getComputedStyle` to launder tokens through JS. SVG also server-renders a
  correct picture for the no-JS and reduced-motion cases.
- **Orthographic projection**, camera at elevation 20 degrees, azimuth 62. Under
  orthographic every great circle projects to an ellipse centred on the sphere's
  screen centre with semi-major axis exactly `R`, so the equator and meridians
  are closed-form half-ellipses with no runtime sampling. Verified to 1.8e-15.
- **phi_max = 16 degrees, not 35.** Measured: at 35 the equatorial vector's depth
  goes negative, so `|+>` would pass _behind_ the sphere at the story's midpoint;
  and because +x is foreshortened to depth 0.44, a 35-degree phi shortens the
  on-screen vector from 0.897R to 0.547R, which reads as _theta changed_ — the one
  thing the mapping must never suggest.
- **A latitude ring at the current theta** was added beyond the brief and is the
  element that makes the piece feel like an instrument rather than a diagram. It
  collapses to a point at both poles and is widest at `|+>`, so it is a picture of
  how much superposition there is, and it makes pointer-driven phi read as sliding
  along a drawn circle.
- **The vector is never split.** Depth is linear and zero at the origin, so one
  sign test decides the whole arrow. Two identical copies are authored, one in the
  back group and one in the front, crossfaded on `smoothstep` of depth — true
  z-order with no DOM reparenting and no flicker.
- **No jump at activation is structurally impossible**: scroll owns the geometry
  from frame zero and the entry animation only multiplies group opacity. There is
  no moment where a transition and the scroll write the same attribute.
- **Review rule:** no CSS `transition` may ever be declared on the vector's `d`,
  `x2` or `transform`, or on the latitude ring's `d`. A transition there breaks
  the 1:1 monotonic contract and fights reverse scroll.
- Reduced motion and mobile render the static `|+>` frame — both probability bars
  equal, latitude ring at its widest, vector on the equator. Superposition stated
  in one picture.

## Hero — Magnet Lines, rewritten not installed

The React Bits `MagnetLines-TS-TW` registry component **would ship completely
invisible in production**, and would look perfect in `astro dev` while doing it.

The emitted policy is `style-src 'self'` plus six sha256 hashes, with no
`unsafe-inline`, no `unsafe-hashes` and no `style-src-attr`. A hash authorises a
`<style>` _element_, never a `style` _attribute_. So the container loses its
`grid-template-columns/rows` and its size, and each of the 81 spans loses its
background, width, height, the `--rotate` initialisation, and — decisively — the
`transform: rotate(var(--rotate))` declaration itself. Result: 81 zero-size
invisible spans in one collapsed column, with no console error.

The component's JS write, `item.style.setProperty('--rotate', ...)`, is CSSOM and
is **not** blocked. The driver runs perfectly; it just sets a custom property
nothing reads. **Moving `transform: rotate(var(--rotate))` into the stylesheet is
the entire unlock.**

That CSSOM exemption is already load-bearing here: GSAP animates the traverse
exclusively through `element.style`, so if `style-src` blocked CSSOM writes the
existing site would already be dead. In-repo proof, not inference.

Do **not** "fix" this by switching the island to `client:only`. Astro
server-renders every other directive, `renderToString` serialises `style={{}}`
into a literal attribute, and hydration does not rewrite it — `client:only` would
trade a CSP bug for a blank-until-JS hole and lose the SSR markup.

Other required departures from the registry source: it ships a `//@ts-ignore`
(forbidden outright by CLAUDE.md's suppression rule) and a `#efefef` hex literal
(forbidden outside `tokens.css`). It has no reduced-motion handling.

### And it thrashes layout

One `pointermove` listener on `window` — firing while the hero is fully offscreen
— with no rAF and a read/write interleave: `getBoundingClientRect()` then
`setProperty()` per item, which is **81 forced synchronous reflows per pointer
event**. Because rotation is about `transform-origin: center`, the centres never
move, so caching them on mount and resize is exactly correct rather than an
approximation. Steady state becomes 81 pure writes behind a single rAF.

## Project cards — custom, no registry component

Every React Bits card effect encodes its dynamics in inline styles, which is the
one thing this CSP forbids. `SpotlightCard-TS-TW` is the closest fit and still
fails; `TiltedCard-TS-TW` adds a `motion@12` dependency _and_ fails the same way.
Adoption means a rewrite in every case, so a custom implementation against
`tokens.css` is cleaner than one laundered through a registry file.

## Correction — the hero pointer path was never broken

An early pixel-diff measurement concluded the hero canvas ignored the pointer
entirely, because the pointer-left/pointer-right diff (1.57-1.64% of pixels
changed) was consistently _smaller_ than a stationary control (1.61-1.67%). That
conclusion was wrong, and the method that produced it is a trap worth naming.

Re-measured with `requestAnimationFrame`'s timestamp frozen so the ambient wave
holds still, the noise floor is **0 pixels** and the pointer's contribution is
unambiguous: 6604 changed pixels (0.62% of the hero), peak luminance delta
123/255, and up to **30.5px of vertical vertex displacement** against 7.5px of
ambient drift per 700ms. 42 of 42 `pointermove` events reach the handler; a
500ms flick emits 6 wavepackets past the 90ms rate limit. The deployed script is
byte-identical to the local build.

**Why the metric lied:** changed-pixel fraction measures _area touched_, not
_displacement_. Within 700ms the ambient loop has already repainted every carrier
stroke, so superimposing a localised gain on strokes already counted as "changed"
adds almost no new pixels. The metric saturates, and the sign of the difference
between treatment and control becomes pure phase noise.

**QA rule going forward:** never validate a pointer-driven effect with a
whole-region changed-pixel diff. Freeze the animation clock first, then diff
pointer-on against pointer-off.

### Why it still felt dead — the real, more useful diagnosis

1. **No coupling cue.** The pointer term is a symmetric Gaussian _amplitude
   gain_. Nothing in the picture points at the cursor, has an edge at it, or
   moves with it.
2. **It lags past the gesture.** Ease 0.08 per frame is ~200ms to 63% and ~600ms
   to settle, so the swell arrives after the hand has stopped.
3. **Ambient camouflage.** The traces drift 3.5-7.5px per 700ms unprompted — the
   same order as the visitor's own contribution over a short move. There is no
   still state to perceive a change against.
4. **It is quietest where the cursor lives.** The `QUIET` legibility damping
   covers x 144-1296 — **80% of the canvas width** — rendering carriers there at
   roughly 1.47:1. The strong response survives only in two ~120px margins.

### Requirements this imposes on the Magnet Lines replacement

Magnet Lines is structurally the right answer here, not merely a prettier one: it
is _still_ at rest and responds _in position_.

- Bind the pointer to something with no ambient motion of its own, or make the
  pointer term at least 3x the ambient amplitude. A visitor cannot attribute a
  change to their own hand when the thing already moves that much by itself.
- Respond in **position, not gain**. Rotation toward the cursor is self-evidently
  caused; an amplitude swell is not.
- Keep latency under ~100ms: ease per frame >= 0.25, or none at all.
- Never attenuate the response in the region the cursor occupies. Damp the
  _ambient_ and keep the _response_ at full contrast, or move the response to
  where the type is not.

Two latent bugs found in passing, neither causal: `packets.length > PACKET_LIMIT`
allows 5 alive rather than 4, and `onPointerMove` writes `pointerX/Y` before the
`shouldRun()` guard.

## AI/ML — replace the forecast stage with a nonlinear decision landscape

Three concepts were built as real prototypes at the true 320x200 frame and judged
side by side: (A) classification / nonlinear decision landscape, (B) embedding /
cluster organisation, (C) the current forecasting + uncertainty visual.

**Chosen: A.** Three reasons, all visible in the contact sheet.

1. **C does not use scroll progress at all.** Its frames at p=0.15, 0.50 and 0.88
   are _pixel-identical_ — verified by eye, not merely reported. The current
   stage's only variable is the pointer horizon, so a visitor who scrolls through
   the dwell without moving the mouse sees a still image. Now that a local
   progress channel exists, that is disqualifying.
2. **C does not read as machine learning.** At 320x200 the confidence band hugs a
   wiggly curve, so its actual claim (uncertainty grows with horizon) is masked by
   the signal's own amplitude. It reads as "a chart with an envelope" — equally
   econometrics, equally finance. A reads as supervised learning in under two
   seconds: labelled classes, a decision surface, margin contours.
3. **Composition of the set.** Electronics is a left-to-right chain and Audio is a
   left-to-right waveform. Keeping C makes three of five stages a horizontal line
   crossing the frame. A is a 2-D field, which is what Quantum's sphere and FPGA's
   lattice are — a sibling instrument rather than a third copy of one.

A's activation carries real meaning: a straight-line nearest-centroid partition
bends into a curved kernel boundary while ringed misclassified points extinguish
one by one and the fit bar fills (84.7% -> 100%). **The scroll is the fit.**

### On the earlier rejection of "a decision boundary"

`ForecastStage.tsx` records that "a decision boundary over two blobs was rejected
— it is the scikit-learn illustration the brief forbids." That rejection was
correct for what it described and does not reach this. This is not two blobs and
a static boundary; it is a three-class margin field whose boundary is
scroll-driven and whose training error is visibly falling. The earlier note's own
test — "nothing had been learned, so nothing was being shown" — is the test A
passes and the node graph failed.

### What is given up

The one-to-one tie to `energy-demand-forecast` and its split-conformal band. A
makes a statement about classification on synthetic data and does not point at a
named repo. Accepted: the section's job is Lucas's ML _identity_, and forecasting
is one project, not the identity.

B is rejected outright — its meaning lives entirely in the transition, its
reduced-motion frame is three dot clumps in dashed polygons, and its only accent
object is a point joined by hairlines to its neighbours, which is literally the
connected-dots idiom the brief forbids by name.

### Two required corrections to A before it ships

Both came from inspecting the prototype at true size rather than from the
comparison itself.

1. **Widen the glyph size separation.** At true 320px the filled dot (r=1.9), open
   ring (r=2.1) and diamond (r=2.6) collapse toward "same grey speck", and the
   picture degrades into _dots on either side of a curve_ — precisely the sklearn
   illustration being avoided. The ordering is right; the separation is too narrow
   to carry it. Must be verified at true rendered size and at low DPI, not at
   contact-sheet scale.
2. **Break the symmetry of the initial linear partition.** At p=0.15 the
   piecewise-linear boundary forms a near-symmetric "Y" that reads as a logo mark
   rather than a partition. Adjust the seeded blob positions so the opening state
   is asymmetric.

Known weakness, accepted: this is the densest stage in the set and the only one
whose reading depends on distinguishing marks rather than following a single line.

### Data discipline

The landscape is generated at build time into a constant module, never solved at
runtime — consistent with pass 2's rule 4. Boundaries are extracted per class
pair by marching squares, arc-length-resampled to a fixed vertex count, and
interpolated between a small number of baked frames. Resampling is not optional:
the unoptimised prototype is 76 KB against ~5 KB gzip for the resampled form.
