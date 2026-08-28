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

| Stage             | Technology                                           | Lifecycle                                                                                                                                                                    |
| ----------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero magnet field | DOM spans + CSS `transform`, no framework, no canvas | Attaches after first paint, and only when a fine pointer is present and motion is not reduced. **Stops** when the hero leaves the viewport and when Technical Worlds enters. |
| Domain stage      | SVG / DOM                                            | Only the active domain animates. The other four are static.                                                                                                                  |

Every stage must:

- pause on `IntersectionObserver` leave, resume on enter;
- pause on `document.visibilitychange` when the tab is hidden;
- cap `devicePixelRatio` at 2 for canvas;
- cancel its `requestAnimationFrame` loop on teardown.

**No WebGL anywhere.** No Three.js, no shaders. Every visual in this design is
achievable in Canvas 2D, SVG or DOM at a fraction of the cost, and the brief's
performance contract (§30) forbids a GPU dependency for meaningful content.

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
- Continuous decorative animation: **stopped**. The hero magnet field stands at
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
- The hero magnet field ships fewer lines at narrower breakpoints, and renders
  as a static hatch wherever the pointer is coarse. Prefer static over janky.
- Project cards get stronger, not weaker: the card itself is the affordance.

---

## 8. Performance budget

Measured on a production build (`npm run build`), not in dev.

The budget is **per path**, not a single number, because three different
visitors download three different amounts. A single ceiling would either be so
loose it permits a bloated critical path, or so tight it forbids the one
animation the design is built around.

| Path                              | What loads it                            | Limit    | Measured |
| --------------------------------- | ---------------------------------------- | -------- | -------- |
| **Critical**                      | Every visitor, before first paint        | **0 KB** | **0 KB** |
| **Stack**                         | Mobile, reduced motion, narrow window    | ≤ 70 KB  | 65.6 KB  |
| **Desktop traverse**              | Desktop pointer user with motion enabled | ≤ 115 KB | 109 KB   |
| CSS, gzipped                      | Every visitor                            | < 15 KB  | 11.5 KB  |
| Blocking third-party requests     | —                                        | **0**    | **0**    |
| Preloader / loading screen        | —                                        | **none** | none     |
| WebGL contexts                    | —                                        | **0**    | **0**    |
| Simultaneously animating canvases | —                                        | **1**    | **0**    |

**Justification for the desktop traverse ceiling.** This document originally set
a flat 90 KB. The Technical Worlds island measured 109 KB on the desktop motion
path — React and ReactDOM at 60 KB, the island itself at 7 KB, and GSAP with
ScrollTrigger at 44 KB. That is a real 19 KB overrun against the old number and
it is accepted deliberately, on four grounds:

1. **The critical path is 0 KB and stays 0 KB.** No `<script src>`, no
   modulepreload, no render-blocking JavaScript. The semantic hero never waits
   on any of this. That is the number the brief's performance contract (§30) is
   actually protecting, and it is not merely met but at zero.
2. **The users most likely to be constrained never download it.** Mobile,
   reduced-motion and short-window visitors get the stack path at 65.6 KB —
   inside the original budget. GSAP is dynamically imported and loads only when
   a desktop user with motion enabled engages the traverse.
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
