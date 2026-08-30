# Motion system

**Status:** decided · **Date:** 2026-08-26

Read `docs/ARCHITECTURE.md` first for the island strategy this depends on.

---

## 1. The test every animation must pass

Motion exists to do one of these. If it does none, delete it.

1. Reveal information
2. Give feedback on an action
3. Communicate hierarchy
4. **Explain a technical concept**
5. Connect two sections spatially
6. Reinforce personality

Item 4 is the one this site leans on. The subject builds across engineering
layers, so the motion vocabulary is drawn from instrumentation: signals,
propagation, interference, routing, waveforms. An animation that could be
dropped onto any other portfolio unchanged is decoration, not motion.

Motion is punctuation, not wallpaper.

---

## 2. The one signature element

**The layer spine.** A single hairline runs down the left margin of the
homepage for its full height, and its geometry changes as you descend:

```
  models        ·  ·  ·      discrete nodes
  computation   ~~~~~~~      probability / phase
  digital logic ⌐_⌐_⌐_       clock edges
  hardware      ├──┬──┤      routed traces
  signals       ∿∿∿∿∿∿∿      continuous wave
```

It is one inline SVG plus CSS. No canvas, no library, no per-frame JavaScript —
only a scroll-linked progress indicator moves. It is the site's thesis rendered
as a single line, it costs almost nothing, and under reduced motion it stays
exactly as it is minus the indicator.

Boldness is spent here. Everything else stays quiet.

---

## 3. The one large motion moment

**Technical Worlds** is the only pinned/horizontal sequence on the site. It
appears once and is never repeated (brief §5).

- Owned by GSAP + ScrollTrigger, inside the single React island.
- The user scrolls **normally**. Vertical scroll drives horizontal traverse.
  No scroll-jacking, no hijacked trackpad, no custom wheel handler, no
  momentum simulation. Browser back/forward and touch scroll behave normally.
- The five domains are real DOM in document order. The traverse moves them;
  it does not create them. With JavaScript off, all five are readable.
- The band inverts to the ink ground. That inversion is the concept — you have
  descended out of the notebook and into the instrument — and it is the only
  place on the site that inverts.

---

## 4. Visual stages: one at a time

At most **one** expensive visual is rendering at any moment. This is enforced,
not hoped for.

| Stage                | Technology                                           | Lifecycle                                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opening magnet field | DOM spans + CSS `transform`, no framework, no canvas | Spans the Hero **and** the descent beneath it — `FieldBand.astro` is the box, since an absolutely-positioned field cannot cover two sibling sections without an ancestor holding both. Attaches after first paint, and only when a fine pointer is present and motion is not reduced. **Stops** when the band leaves the viewport and when Technical Worlds enters. |
| Domain stage         | SVG / DOM                                            | Only the active domain animates. The other four are static.                                                                                                                                                                                                                                                                                                         |

Every stage must:

- pause on `IntersectionObserver` leave, resume on enter;
- pause on `document.visibilitychange` when the tab is hidden;
- cap `devicePixelRatio` at 2 for canvas;
- cancel its `requestAnimationFrame` loop on teardown.

**No WebGL anywhere.** No Three.js, no shaders. Every visual in this design is
achievable in Canvas 2D, SVG or DOM at a fraction of the cost, and the brief's
performance contract (§30) forbids a GPU dependency for meaningful content.

### Two rendering traps, both of which shipped

Neither is visible in source review and neither raises a console error. Both were
found in pass 3 by measuring the rendered output, and both had been live.

**1. A presentation attribute loses to a CSS rule.** Any property a stage writes
per frame through `setAttribute` must **not** also be set for that element in the
stylesheet. If it is, the CSS wins and the writes silently do nothing.

The Bloch sphere hit this in reverse and it is worth stating both ways: its
arrival animated `opacity: 0 → 1` on a group whose glass veil rested at
`opacity: 0.1`, and the animation replaced the resting value rather than
multiplying it, leaving an opaque disc over the whole sphere. The fix was to move
the resting value to a `fill-opacity` attribute so the two compose.

Practical rule: for anything animated by CSS **and** written by script, keep the
two on different properties — one on the element as an attribute, one in the
rule — and add a guard test.

**2. `pathLength` and `vector-effect: non-scaling-stroke` must never meet on one
element.** `pathLength="100"` normalises the path's length in _user_ space, so a
dash value of `100` resolves to `userLength / 100` user units. `non-scaling-stroke`
moves the whole stroke — width, dash array and dash offset — into _screen_ space,
where the same path is `scale × userLength` long. Under both, the dash is
authored against one length and painted against another, and the two disagree by
exactly the viewport scale. `tw-draw`'s finished `stroke-dasharray: 100 100` —
the definition of "solid" everywhere this band draws a line — then paints
`1 / scale` of its path.

An earlier pass diagnosed this as a property of the audio stage's _element_
transform and fixed only that. It is not: the stage SVGs are
`viewBox="0 0 320 200"` rendered at `min(100%, 34rem)`, so the plain viewport
scale — no group transform anywhere near it — is enough. Measured on the
production build, 800 samples per path, browser hit-testing:

| viewport | stage width | scale | painted |
| -------- | ----------- | ----- | ------- |
| 1440×900 | 544px       | 1.700 | 58.6 %  |
| 1280×800 | 507px       | 1.584 | 63.2 %  |
| 1040×800 | 300px       | 0.939 | 100.0 % |

Six elements shipped this way. The Bloch rim was a broken circle, the FPGA route
stopped short of the block it routes to, all five chain traces were cut off, and
both travelling pulses appeared twice because their 100-unit pattern tiled 1.7
times along the path. The last row of that table is why this is a rule and not a
number: below `scale = 1` the defect is invisible, so a fixture at one window
size proves nothing about any other.

**Which one to drop.** Keep `pathLength` and let the stroke scale wherever the
element's _length_ carries meaning — an accent line, a signal, a pulse, anything
drawn with `tw-draw` or `tw-energise`. That is exact rather than tuned: with both
quantities in user space, `100 100` over `pathLength="100"` is the whole path by
definition at every scale, and `17 83` is one sixth of a six-cell route rather
than 1.7 tilings of a pattern meant to appear once. The ground — grid, rules,
ticks, cell and block outlines, the frame — keeps its constant pen.

Keep `non-scaling-stroke` only where the element is genuinely under an
anisotropic transform, and then never dash it. `.tw-wave` is the one such path:
the excitation scales it horizontally between 1× and 2.6×, so without the effect
the hairline goes elliptical. It declares no `pathLength`, is never dashed, and
arrives on a clip wipe instead.

**The related, simpler defect in the same family:** every user of a
`pathLength`-normalised dash keyframe must itself declare `pathLength`. The FPGA
route did not. Its real length was 290 units, so the shared keyframe's finished
`100 100` rendered 100 on / 100 off / 90 on — a third of the net invisible, and
its two ends reading as unconnected. It had shipped that way.

`tests/stroke-space.test.ts` enforces the rule structurally: it reads the built
stylesheet, resolves every `non-scaling-stroke` selector against the rendered
markup of all five stages in both `active` states, and fails if any element
carrying `pathLength` is reached by one. Its selector matcher throws rather than
returning "no match" for a selector it cannot parse.

---

## 5. Technology ownership

One library per responsibility. No overlap.

| Concern                               | Owner                                  |
| ------------------------------------- | -------------------------------------- |
| Hover, focus, small state transitions | CSS transitions                        |
| Entrance reveals                      | CSS animation + `IntersectionObserver` |
| The pinned Technical Worlds sequence  | GSAP ScrollTrigger                     |
| Route transitions                     | Native CSS View Transitions            |

Motion/Framer Motion is deliberately **not installed**. GSAP already owns scroll
choreography and CSS covers everything else; a second animation runtime for the
same job is the overlap the dependency policy forbids.

---

## 6. Reduced motion

`prefers-reduced-motion: reduce` is a first-class variant, not a degradation.
The reduced-motion site must feel deliberate — same content, same hierarchy,
same visual quality, less movement.

- Long pinned and parallax sequences: **removed**. Technical Worlds becomes a
  vertical stack of five domain panels, fully readable, in document order.
- Continuous decorative animation: **stopped**. The magnet field stands at
  its resting rake and attaches no listener at all — a deliberate static hatch,
  not a degraded one, and not an empty box.
- Entrance animations: content is visible immediately.
- `scroll-behavior: smooth`: off.
- Navigation, focus order and every interactive affordance: unchanged.

**The ordering trap.** The audit (2.3, 2.4) found `.animate-in { animation: …;
opacity: 0 }` — where `opacity: 0` was the _resting_ state, so visibility
depended entirely on an animation running. A naive reduced-motion rule that
disables animation would have hidden the entire hero from exactly the users it
was meant to help. The fix is structural: the hidden state lives **inside** the
keyframe, so no animation ⇒ visible. Never reintroduce a resting `opacity: 0`.

Query it in JavaScript too, not only CSS — a `matchMedia` check gates whether
the GSAP timeline and the hero field's pointer loop are ever created, and it
listens for changes so toggling the OS setting takes effect without a reload.

---

## 7. Mobile

Mobile is a deliberate composition, not a squeezed desktop (brief §33).

- Primarily vertical. The pinned horizontal traverse does **not** run below the
  tablet breakpoint; the domains stack.
- No hover dependency anywhere. Anything a pointer reveals must also be
  reachable by tap and by keyboard — if information is hover-only, it is a bug.
- The magnet field ships fewer lines at narrower breakpoints, and renders as a
  static hatch wherever the pointer is coarse. Prefer static over janky.
- Project cards get stronger, not weaker: the card itself is the affordance.

---

## 8. Performance budget

Measured on a production build (`npm run build`), not in dev.

The budget is **per path**, not a single number, because three different
visitors download three different amounts. A single ceiling would either be so
loose it permits a bloated critical path, or so tight it forbids the one
animation the design is built around.

| Path                              | What loads it                            | Limit    | Measured  |
| --------------------------------- | ---------------------------------------- | -------- | --------- |
| **Critical**                      | Every visitor, before first paint        | **0 KB** | **0 KB**  |
| **Stack**                         | Mobile, reduced motion, narrow window    | ≤ 4 KB   | 1.88 KB   |
| **Desktop traverse**              | Desktop pointer user with motion enabled | ≤ 120 KB | 117.68 KB |
| — of which **framework**          | React + GSAP + ScrollTrigger             | fixed    | 102.02 KB |
| — of which **the island**         | Everything this repo actually writes     | ≤ 18 KB  | 15.66 KB  |
| CSS, gzipped                      | The heaviest page, not a convenient one  | < 15 KB  | 13.57 KB  |
| Blocking third-party requests     | —                                        | **0**    | **0**     |
| Preloader / loading screen        | —                                        | **none** | none      |
| WebGL contexts                    | —                                        | **0**    | **0**     |
| Simultaneously animating canvases | —                                        | **1**    | **0**     |

**Why the ceiling is split in two (pass 3).** The old row was a single ≤ 115 KB,
which was "109 measured, rounded up". It had the same defect as the pinned
band's old page-share target: it measured a total the authors mostly do not
control, so the only lever it ever pulled was against the work. 102 KB of that
number is React plus GSAP plus ScrollTrigger — a fixed floor that no amount of
care in this repo moves. The ~14 KB of island is the part that is actually
authored, and it is the part a budget should govern.

So the traverse ceiling is now ≤ 120 KB with an explicit **≤ 18 KB island
allowance** inside it. Adding a signature visual is charged against the number
it genuinely affects, and shaving the framework floor stops counting as a win
that was never available. The total moved 109 → 116.28 KB across this pass, and
what bought it was a mathematically correct Bloch sphere (+2.0 KB) and a baked
decision landscape (+3.0 KB of data) replacing two visuals that did less — while
the hero went **down** 0.64 KB by replacing a canvas with DOM and CSS.

**Justification for the framework floor.** This document originally set a flat
90 KB. React and ReactDOM are 58.7 KB, GSAP with ScrollTrigger 43.4 KB. That is
a real overrun against the old number and it is accepted deliberately, on four
grounds:

1. **The critical path is 0 KB and stays 0 KB.** No `<script src>`, no
   modulepreload, no render-blocking JavaScript. The semantic hero never waits
   on any of this. That is the number the brief's performance contract (§30) is
   actually protecting, and it is not merely met but at zero.
2. **The users most likely to be constrained never download it.** The island is
   `client:media`, so mobile, reduced-motion and short-window visitors fetch
   none of it: their whole JavaScript payload is the hero controller, **1.88 KB**
   — not the 65.6 KB this line used to claim, which predated the hydration gate.
   GSAP is dynamically imported and loads only when a desktop user with motion
   enabled engages the traverse.
3. **GSAP's cost is irreducible here.** Importing `gsap/gsap-core` plus
   CSSPlugin explicitly rather than the full bundle saves 27 bytes. There is no
   cheaper configuration of this dependency.
4. **The alternative is worse.** Replacing ScrollTrigger with `position: sticky`
   plus a hand-rolled scroll handler saves ~44 KB, but contradicts §5's
   ownership table and reintroduces exactly the imperative scroll code this
   architecture exists to avoid. Buying 44 KB with a hand-maintained scroll
   handler is a bad trade for a site whose critical path is already zero.

If the traverse ever moves to CSS scroll-driven animations
(`animation-timeline: scroll()`, as the layer spine already uses), GSAP leaves
the bundle entirely and this ceiling should drop back to the stack figure.
That is the intended long-term direction once browser support is broad enough
to carry the primary interaction rather than a progressive enhancement.

Hard rules, from brief §30:

- The hero's semantic content renders immediately. It never waits on a canvas,
  a font, or a script.
- Expensive effects are dynamically imported.
- Offscreen animation is paused, not throttled.
- Images ship through `astro:assets` with explicit dimensions. No raw `<img>`
  without width/height — the audit flagged that as a latent CLS source.

A significant regression against these numbers needs a written justification,
not a shrug.

---

## 9. Hover and pointer discipline

Allowed, because each communicates something true:

- a project card lifting slightly and revealing metadata;
- a routing path illuminating through the FPGA grid;
- a waveform responding to pointer position;
- a domain label previewing its visual language.

Not allowed:

- every button jumping;
- text scramble;
- universal glow;
- cursor trails;
- anything that hides information until hover.

Maximum tilt on a card is 2–3°. One effect per element — subtle depth **or**
spotlight, not both stacked.
