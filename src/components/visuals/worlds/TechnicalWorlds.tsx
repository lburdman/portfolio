import { useCallback, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { domainOrdinal, type Domain } from '../../../config/domains';
import type { UIStrings } from '../../../i18n/types';
import { DomainStage } from './stages/DomainStage';
import {
  activeIndexFromProgress,
  clampIndex,
  FINALE_DWELL,
  nextIndexForKey,
  pinnedScrollLength,
  scrollTargetForIndex,
  SCROLL_PER_STEP,
  TRAVEL_SHARE,
  travelProgress,
  TRAVERSE_LENGTH,
  TRAVERSE_SEQUENCE,
} from './traverse';
import { REDUCED_MOTION_QUERY, TRAVERSE_QUERY, useMediaQuery } from './useMediaQuery';

/**
 * Technical Worlds — the site's single React island and its one large motion
 * moment (docs/ARCHITECTURE.md §5, docs/MOTION_SYSTEM.md §3).
 *
 * ── WHAT IS AND IS NOT STATE ───────────────────────────────────────────────
 * Everything this component knows stays inside this component: the active
 * index, whether the traverse is engaged, whether the tab is visible, which
 * panel is on screen when stacked. There is no store, no context, no event bus
 * and no import from another island. ARCHITECTURE §1 selected Astro on the
 * basis that no two islands need to share state, and this island is the reason
 * that has to stay true.
 *
 * ── TWO CONTRACTS WITH THE REST OF THE PAGE ────────────────────────────────
 * Both are plain HTML attributes on markup this component already renders, so
 * neither creates a runtime dependency in either direction.
 *
 * 1. `data-stops-hero-visual` on `.tw-band`, this island's root and the only
 *    child of `<section id="worlds">`. The hero's canvas module observes
 *    whatever carries that attribute and stops its loop while it is on screen,
 *    which is what enforces "at most one expensive visual at a time"
 *    (MOTION_SYSTEM §4). It is server-rendered, and that is the point: this
 *    island hydrates on `client:media`, so on a phone, a short window or with
 *    reduced motion it never hydrates at all. An attribute added at hydration
 *    time would simply not exist for those visitors, and the hero's canvas
 *    would keep running behind this band with nothing reporting the problem.
 *    It sits here rather than on the `<section>` only because
 *    `ui/Section.astro` does not spread undeclared props — see the note in
 *    `home/TechnicalWorlds.astro`. This island never reads it back and never
 *    knows whether anyone is listening.
 *
 * 2. `id="world-<domain id>"` on each panel. The hero renders keyboard-reachable
 *    links to those anchors. While the band is pinned those fragments cannot be
 *    reached by scrolling alone, so the `hashchange` effect below drives the
 *    traverse to the requested domain instead.
 *
 * ── CONTENT SECURITY POLICY ────────────────────────────────────────────────
 * The site ships a hash-based CSP with no `'unsafe-inline'` and — because Astro
 * emits no `style-src-attr` — no `'unsafe-hashes'` either. Under that policy
 * every inline `style=""` attribute is dropped, hashed or not. Nothing in this
 * island writes one: accents come from `[data-domain]` rules, animation
 * staggers from `:nth-child()`, and dash geometry from SVG `pathLength` and
 * presentation attributes. GSAP's own CSSOM writes are unaffected, and this
 * island injects no `<script>` or `<style>` element at runtime.
 *
 * ── PROGRESSIVE ENHANCEMENT ────────────────────────────────────────────────
 * The first render — the one Astro runs at build time and the one React
 * hydrates against — is the *stack*: five panels, in document order, with real
 * headings and real prose, no transforms and no `tabindex`. That is what a
 * reader with JavaScript disabled gets, and it is also the reduced-motion and
 * the mobile composition. The traverse is an attribute set on the root by an
 * effect after mount. It moves DOM that already exists; it never creates it.
 *
 * Since the wrapper moved to `client:media`, three of those four cases never
 * receive this file at all — the stack is not a fallback they degrade to, it
 * is the whole of what they were sent. Nothing below may become load-bearing
 * for content.
 *
 * ── NO SCROLL-JACKING ──────────────────────────────────────────────────────
 * There is no wheel handler, no touch handler and no momentum. ScrollTrigger
 * reads the document's own scroll position and nothing else, so the trackpad,
 * the scrollbar, browser back/forward and touch scrolling all behave exactly as
 * they do everywhere else on the site (brief §4).
 */

export interface TechnicalWorldsProps {
  readonly t: UIStrings;
}

/** Anchor id for a domain panel. The hero links to exactly these. */
export function worldAnchorId(domainId: string): string {
  return `world-${domainId}`;
}

interface StageHandle {
  kill: () => void;
}

export default function TechnicalWorlds({ t }: TechnicalWorldsProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const panelRefs = useRef<(HTMLElement | null)[]>([]);
  /** Set by the GSAP effect; read by the keyboard handler to convert an index into a scroll position. */
  const rangeRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const wideEnough = useMediaQuery(TRAVERSE_QUERY);

  const [engaged, setEngaged] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [stackIndex, setStackIndex] = useState(-1);
  const [tabVisible, setTabVisible] = useState(true);

  /* ── Tab visibility ─────────────────────────────────────────────────────
     MOTION_SYSTEM §8: offscreen and background animation is *paused*, not
     throttled. One listener at the island root switches every stage off at
     once rather than each stage owning a copy of this. */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const update = () => setTabVisible(document.visibilityState !== 'hidden');
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  /* ── The pinned traverse ────────────────────────────────────────────────
     GSAP is imported dynamically, so a phone and a reduced-motion visitor
     never download it at all — the brief's "dynamically import expensive
     effects" (§30) applied to the largest dependency on the page. */
  useEffect(() => {
    const root = rootRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!root || !viewport || !track) return;
    if (!wideEnough || reducedMotion) return;

    /* The element that gets pinned is the `<section id="worlds">` that
       `ui/Section.astro` renders around this island, not the island's own root.
       Pinning the section keeps the `02 / TECHNICAL WORLDS` margin annotation
       on screen for the whole traverse; pinning the root would leave the
       annotation to scroll away and orphan it from the heading directly below.

       `.tw-band` is a different class token from `.tw`, so `closest` cannot
       match this element itself and always walks up to the section. If the
       island is ever rendered outside that wrapper there is nothing to pin, and
       falling back to the root means the `.tw[data-traverse]` rules never match
       and the band simply stays the readable stack — a safe degradation rather
       than a half-applied horizontal layout. */
    const band = root.closest<HTMLElement>('.tw') ?? root;

    // Belt and braces against the ordering trap (MOTION_SYSTEM §6): even if a
    // render ever reached here with a stale value, the timeline is not built.
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
    }

    let cancelled = false;
    let handle: StageHandle | null = null;

    /* How far the track travels. The `.tw-track::after` spacer makes this
       exactly `(TRAVERSE_LENGTH - 1)` panel pitches rather than the ~3.5%-per-
       step short measure it used to be — see the long note beside that rule in
       `home/TechnicalWorlds.astro` for what that mis-registration produced. */
    const distance = () => Math.max(0, track.scrollWidth - viewport.clientWidth);

    /* How much scrolling that travel costs, which is now a separate question
       (see the budget block in `traverse.ts`). `window.innerHeight` rather
       than the band's own height: the band IS the viewport height while
       pinned, so reading it back would be circular. */
    const scrollLength = () => pinnedScrollLength(window.innerHeight);

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
      if (cancelled) return;

      // Switched on only now, after the library has actually arrived. Applying
      // it before the await would show an unpinned horizontal strip for as long
      // as the download took. Reading `scrollWidth` below forces the layout
      // flush, so the measurement sees the composition it is measuring.
      //
      // It is set imperatively rather than rendered: React never owns this
      // attribute, so no later re-render can clobber it mid-traverse.
      band.dataset.traverse = 'true';

      gsap.registerPlugin(ScrollTrigger);

      /* A timeline rather than a single tween, because the pinned range now has
         two parts and only the first of them moves.

           [ travel: the track slides (TRAVERSE_LENGTH - 1) panels ][ hold ]

         The hold is an empty tween on a throwaway object — GSAP's own idiom for
         reserving time — and with `scrub: true` reserving timeline time is
         reserving *scroll distance*. So the last world stays parked at the
         viewport's left edge for `FINALE_DWELL` screens of scrolling before the
         pin lets go, instead of arriving on the frame the pin released.

         The two durations are in the same units as the budget in `traverse.ts`
         (viewport heights), so the timeline's shape and the scroll length it is
         mapped onto are derived from one pair of numbers. */
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: band,
          start: 'top top',
          // Not `distance()`. How far the track moves and how much scrolling
          // that should cost are different questions; this answers the second.
          end: () => `+=${scrollLength()}`,
          pin: band,
          pinSpacing: true,
          anticipatePin: 1,
          // `true`, never a number. A numeric scrub lags the scroll position
          // deliberately, which is a soft form of the momentum simulation the
          // brief forbids; `true` locks the traverse to the scrollbar 1:1.
          scrub: true,
          invalidateOnRefresh: true,
          onRefresh: (self) => {
            rangeRef.current = { start: self.start, end: self.end };
          },
          onUpdate: (self) => {
            rangeRef.current = { start: self.start, end: self.end };
            // Through `travelProgress` first: during the hold, scroll progress
            // keeps advancing and the track does not, so raw progress would
            // report a sixth stop that does not exist.
            setActiveIndex(activeIndexFromProgress(travelProgress(self.progress), TRAVERSE_LENGTH));
          },
        },
      });

      timeline
        .to(track, {
          x: () => -distance(),
          ease: 'none',
          duration: (TRAVERSE_LENGTH - 1) * SCROLL_PER_STEP,
        })
        .to({}, { duration: FINALE_DWELL });

      const trigger = timeline.scrollTrigger;
      if (trigger) rangeRef.current = { start: trigger.start, end: trigger.end };

      handle = {
        kill: () => {
          trigger?.kill(true);
          timeline.kill();
        },
      };
      setEngaged(true);
    })();

    return () => {
      cancelled = true;
      handle?.kill();
      handle = null;
      band.dataset.traverse = 'false';
      // GSAP writes an inline transform onto the track; without this the
      // stacked layout would inherit a leftover horizontal offset.
      track.style.removeProperty('transform');
      track.style.removeProperty('translate');
      setEngaged(false);
      setActiveIndex(0);
    };
  }, [wideEnough, reducedMotion]);

  /* ── Stacked composition: which panel is on screen ──────────────────────
     Mobile, and any desktop window too small to pin, still honours "one stage
     at a time" — the panel nearest the middle of the viewport is the one that
     animates, and the other four are inert. */
  useEffect(() => {
    if (engaged || reducedMotion) {
      setStackIndex(-1);
      return;
    }
    if (typeof IntersectionObserver === 'undefined') return;

    const panels = panelRefs.current.slice(0, TRAVERSE_LENGTH);
    const ratios = new Array<number>(TRAVERSE_LENGTH).fill(0);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = panels.indexOf(entry.target as HTMLElement);
          if (index >= 0) ratios[index] = entry.isIntersecting ? entry.intersectionRatio : 0;
        }
        let best = -1;
        let bestRatio = 0;
        ratios.forEach((ratio, index) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = index;
          }
        });
        setStackIndex(best);
      },
      { threshold: [0, 0.2, 0.4, 0.6, 0.8, 1], rootMargin: '-15% 0px -15% 0px' },
    );

    for (const panel of panels) if (panel) observer.observe(panel);
    return () => {
      observer.disconnect();
      setStackIndex(-1);
    };
  }, [engaged, reducedMotion]);

  /* ── Keyboard traverse ──────────────────────────────────────────────────
     Left/Right step, Home/End jump, both ends clamp. The handler moves the
     *document scroll position*, which is the same thing the pointer does — so
     the keyboard and the scrollbar drive one mechanism rather than two, and
     the two can never disagree about where the traverse is. */
  const goTo = useCallback((index: number) => {
    const { start, end } = rangeRef.current;
    // `TRAVEL_SHARE` because the stops all live in the travelling part of the
    // range. Without it, End would land in the middle of the finale's hold and
    // Home would still be correct, which is the worst kind of half-right.
    const target = scrollTargetForIndex(index, TRAVERSE_LENGTH, start, end, TRAVEL_SHARE);
    window.scrollTo({ top: target, behavior: 'smooth' });
    setActiveIndex(clampIndex(index, TRAVERSE_LENGTH));
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!engaged) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const next = nextIndexForKey(event.key, activeIndex, TRAVERSE_LENGTH);
      // `null` is "not our key"; an unchanged index is an end stop. Neither is
      // preventDefault'ed, so the browser keeps its own behaviour in both cases.
      if (next === null || next === activeIndex) return;
      event.preventDefault();
      goTo(next);
    },
    [activeIndex, engaged, goTo],
  );

  /* ── Focus safety ───────────────────────────────────────────────────────
     The viewport clips horizontally. If anything inside a panel is ever
     focused while offscreen, the browser scrolls the clipping box to reveal
     it, which silently desynchronises the container from GSAP's transform.
     Reset it and drive the traverse instead. */
  const handleFocus = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const viewport = viewportRef.current;
      if (viewport) {
        viewport.scrollLeft = 0;
        viewport.scrollTop = 0;
      }
      if (!engaged) return;
      const index = panelRefs.current.findIndex((panel) => panel?.contains(event.target));
      if (index >= 0 && index !== activeIndex) goTo(index);
    },
    [activeIndex, engaged, goTo],
  );

  /* ── Fragment links from the hero ───────────────────────────────────────
     The hero links to `#world-<domain id>`. Unpinned — no JavaScript, reduced
     motion, mobile — those are ordinary anchors and the browser handles them.

     While the band is pinned the panels are inside a `position: fixed` element
     translated horizontally by GSAP, so the browser's own fragment scroll
     cannot reach them: the target's position in the document no longer means
     what the browser assumes. The link still fires `hashchange`, and this
     converts it into a traverse, which lands on the right domain.

     Deliberately not a click handler on the hero's links: this island does not
     know they exist, and a `hashchange` listener also covers a pasted URL, a
     bookmark and the back button. */
  useEffect(() => {
    if (!engaged || typeof window === 'undefined') return;

    const apply = () => {
      const id = window.location.hash.replace(/^#/, '');
      if (!id) return;
      const index = TRAVERSE_SEQUENCE.findIndex((domain) => worldAnchorId(domain.id) === id);
      if (index >= 0) goTo(index);
    };

    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, [engaged, goTo]);

  /* ── Which stage may animate ────────────────────────────────────────────
     Exactly one, or none. Reduced motion means none: every stage then renders
     its static representative frame (MOTION_SYSTEM §6). */
  const animatingIndex = reducedMotion || !tabVisible ? -1 : engaged ? activeIndex : stackIndex;

  const current: Domain | undefined = TRAVERSE_SEQUENCE[activeIndex];
  const liveMessage = engaged && current ? t.worlds.items[current.id].name : '';

  return (
    // Not a <section>: `ui/Section.astro` renders that, and with it the
    // `02 / TECHNICAL WORLDS` annotation, the `id="worlds"` anchor and the
    // `.tw on-ink` classes. This is the band's contents, and `.tw-band` is the
    // handle the pinning effect walks up from.
    <div ref={rootRef} className="tw-band" data-stops-hero-visual>
      <header className="tw-header">
        <h2 id="tw-heading" className="tw-header__title">
          {t.worlds.heading}
        </h2>
        <p className="tw-header__subtitle">{t.worlds.subtitle}</p>
      </header>

      <div
        ref={viewportRef}
        className="tw-viewport"
        tabIndex={engaged ? 0 : undefined}
        role={engaged ? 'group' : undefined}
        aria-labelledby={engaged ? 'tw-heading' : undefined}
        aria-describedby={engaged ? 'tw-instructions' : undefined}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
      >
        <div ref={trackRef} className="tw-track">
          {TRAVERSE_SEQUENCE.map((domain, index) => {
            const item = t.worlds.items[domain.id];
            const anchor = worldAnchorId(domain.id);
            return (
              <article
                key={domain.id}
                ref={(node) => {
                  panelRefs.current[index] = node;
                }}
                id={anchor}
                className="tw-panel"
                data-domain={domain.id}
                data-current={index === activeIndex ? 'true' : 'false'}
                aria-labelledby={`${anchor}-name`}
              >
                <div className="tw-panel__text">
                  <p className="tw-panel__meta eyebrow">
                    <span aria-hidden="true">{domainOrdinal(domain)}</span>
                    <span className="tw-panel__layer">{t.layers.items[domain.id].layer}</span>
                  </p>
                  <h3 id={`${anchor}-name`} className="tw-panel__name">
                    {item.name}
                  </h3>
                  <p className="tw-panel__summary">{item.summary}</p>
                </div>
                <div className="tw-panel__stage">
                  <DomainStage domain={domain} active={index === animatingIndex} />
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="tw-footer">
        <ol className="tw-rail" aria-hidden="true">
          {TRAVERSE_SEQUENCE.map((domain, index) => (
            <li
              key={domain.id}
              className="tw-rail__stop"
              data-domain={domain.id}
              data-current={engaged && index === activeIndex ? 'true' : 'false'}
            />
          ))}
        </ol>
        <p id="tw-instructions" className="tw-hint">
          {t.a11y.worldsInstructions}
        </p>
      </div>

      {/* Announces the domain the traverse has arrived at. Empty while
          stacked, where the heading order already does that job. */}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </p>
    </div>
  );
}
