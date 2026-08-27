/**
 * The hero's plotted signal field.
 *
 * A pen plotter tracing a few interfering sine components as thin ink strokes
 * on the paper ground. Slow, low-contrast, barely there — it is the texture of
 * the page, not an event on it.
 *
 * Framework-free Canvas 2D on purpose (docs/ARCHITECTURE.md §5): the hero is
 * above the fold, and the performance contract puts 0 KB of framework on the
 * critical path. No React, no WebGL, no library.
 *
 * Contract this module keeps (docs/MOTION_SYSTEM.md §4):
 *   - `devicePixelRatio` capped at 2;
 *   - paused when offscreen (`IntersectionObserver`) and when the tab is
 *     hidden (`visibilitychange`);
 *   - the `requestAnimationFrame` loop is cancelled on teardown;
 *   - under `prefers-reduced-motion` it renders exactly ONE static frame and
 *     never starts the loop — a blank canvas would be a downgrade, not a
 *     variant — and it re-evaluates when the OS setting changes, with no
 *     reload;
 *   - reduced trace density on narrow viewports; a static frame is preferred
 *     over a janky one.
 *
 * Colour is never named here. The canvas inherits `color` from CSS (the hero
 * sets it to a token) and the stroke is read back from the computed style, so
 * `tokens.css` remains the only file holding a colour value.
 */

export interface SignalFieldOptions {
  /** Trace count at full desktop density. Scaled down on narrow viewports. */
  traces?: number;
  /** Multiplier on every temporal frequency. 1 is the tuned default. */
  speed?: number;
  /** Element whose pointer position drives the field. Defaults to the canvas. */
  pointerTarget?: HTMLElement | null;
}

export interface SignalFieldHandle {
  /** Requests the loop. Actually runs only when visible, focused and unreduced. */
  start(): void;
  /** Suspends the loop. The last frame stays on screen. */
  stop(): void;
  /** Cancels the loop and removes every listener. Not restartable. */
  destroy(): void;
}

/** A no-op handle, returned when there is no 2D context to draw into. */
const INERT: SignalFieldHandle = {
  start() {},
  stop() {},
  destroy() {},
};

const MAX_DPR = 2;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** Horizontal sampling step, in CSS pixels. Coarse enough to be cheap. */
const STEP = 7;

/**
 * Three sine components per trace, at incommensurate spatial and temporal
 * frequencies so the interference pattern never visibly repeats.
 * `k` is spatial (radians per CSS pixel), `w` is temporal (radians per second).
 */
const COMPONENTS = [
  { amp: 0.42, k: 0.0042, w: 0.11, phase: 0.35 },
  { amp: 0.31, k: 0.0091, w: -0.17, phase: 1.9 },
  { amp: 0.19, k: 0.019, w: 0.23, phase: 4.1 },
] as const;

export function createSignalField(canvas: HTMLCanvasElement, options: SignalFieldOptions = {}): SignalFieldHandle {
  const context = canvas.getContext('2d');
  if (!context) return INERT;

  // Rebound to a non-nullable const: the hoisted `function` declarations below
  // would otherwise lose the null check that already guards them.
  const ctx: CanvasRenderingContext2D = context;

  const baseTraces = options.traces ?? 26;
  const speed = options.speed ?? 1;
  const pointerTarget = options.pointerTarget ?? canvas;

  const reduced = window.matchMedia(REDUCED_MOTION);

  let width = 0;
  let height = 0;
  let traces = baseTraces;
  let stroke = '';

  let wanted = false;
  let inView = true;
  let pageVisible = document.visibilityState !== 'hidden';
  let destroyed = false;
  let frame = 0;
  let startedAt = 0;

  /** Pointer position in CSS pixels, and the eased value actually drawn. */
  let pointerX = -1;
  let pointerY = -1;
  let easedX = -1;
  let easedY = -1;

  function measure(): void {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = rect.width;
    height = rect.height;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Mobile is a deliberate composition, not a squeezed desktop: fewer traces
    // rather than the same traces drawn worse.
    const density = width < 640 ? 0.45 : width < 1024 ? 0.7 : 1;
    traces = Math.max(6, Math.round(baseTraces * density));

    stroke = window.getComputedStyle(canvas).color;
  }

  function draw(seconds: number): void {
    if (width === 0 || height === 0) return;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';

    const spacing = height / (traces + 1);
    // Amplitude is a fraction of the gap between traces, so they interfere
    // without ever crossing into a scribble.
    const scale = spacing * 0.9;

    const hasPointer = easedX >= 0 && easedY >= 0;
    const influence = Math.max(width, height) * 0.28;

    for (let row = 0; row < traces; row += 1) {
      const baseY = spacing * (row + 1);
      const rowPhase = row * 0.7;

      // The field fades out top and bottom so it never fights the type.
      const depth = Math.sin(((row + 1) / (traces + 1)) * Math.PI);
      ctx.globalAlpha = 0.05 + depth * 0.09;

      ctx.beginPath();

      for (let x = 0; x <= width + STEP; x += STEP) {
        let offset = 0;
        for (const c of COMPONENTS) {
          offset += c.amp * Math.sin(x * c.k + seconds * c.w * speed + rowPhase * c.phase);
        }

        let y = baseY + offset * scale;

        if (hasPointer) {
          // A single soft lens around the pointer. Mild by contract (brief §5):
          // it responds, it does not perform.
          const dx = x - easedX;
          const dy = baseY - easedY;
          const falloff = Math.exp(-(dx * dx + dy * dy) / (influence * influence));
          y -= falloff * spacing * 1.1;
        }

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  function renderStatic(): void {
    measure();
    easedX = -1;
    easedY = -1;
    draw(0);
  }

  function tick(now: number): void {
    if (startedAt === 0) startedAt = now;

    // Ease the pointer so a fast flick does not snap the field.
    if (pointerX >= 0) {
      easedX = easedX < 0 ? pointerX : easedX + (pointerX - easedX) * 0.06;
      easedY = easedY < 0 ? pointerY : easedY + (pointerY - easedY) * 0.06;
    }

    draw((now - startedAt) / 1000);
    frame = window.requestAnimationFrame(tick);
  }

  function shouldRun(): boolean {
    return wanted && inView && pageVisible && !destroyed && !reduced.matches;
  }

  function sync(): void {
    if (shouldRun()) {
      if (frame === 0) frame = window.requestAnimationFrame(tick);
      return;
    }

    if (frame !== 0) {
      window.cancelAnimationFrame(frame);
      frame = 0;
      // Time is measured from the first frame after each resume, so a long
      // pause does not produce a jump when the field comes back.
      startedAt = 0;
    }
  }

  // --- listeners -----------------------------------------------------------

  const onResize = (): void => {
    measure();
    if (!shouldRun()) draw(0);
  };

  const onVisibility = (): void => {
    pageVisible = document.visibilityState !== 'hidden';
    sync();
  };

  const onPointerMove = (event: PointerEvent): void => {
    const rect = canvas.getBoundingClientRect();
    pointerX = event.clientX - rect.left;
    pointerY = event.clientY - rect.top;
  };

  const onPointerLeave = (): void => {
    pointerX = -1;
    pointerY = -1;
    easedX = -1;
    easedY = -1;
  };

  const onReducedChange = (): void => {
    if (reduced.matches) {
      sync(); // cancels the loop
      renderStatic();
    } else {
      sync();
    }
  };

  const resizeObserver =
    typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(() => {
          onResize();
        });

  const intersectionObserver =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(
          (entries) => {
            for (const entry of entries) inView = entry.isIntersecting;
            sync();
          },
          { threshold: 0 },
        );

  resizeObserver?.observe(canvas);
  intersectionObserver?.observe(canvas);
  if (!resizeObserver) window.addEventListener('resize', onResize, { passive: true });

  document.addEventListener('visibilitychange', onVisibility);
  reduced.addEventListener('change', onReducedChange);
  pointerTarget.addEventListener('pointermove', onPointerMove, { passive: true });
  pointerTarget.addEventListener('pointerleave', onPointerLeave, { passive: true });

  // One frame is drawn immediately, before anything is started. Reduced motion
  // therefore gets a real picture rather than an empty rectangle.
  renderStatic();

  return {
    start() {
      if (destroyed) return;
      wanted = true;
      sync();
    },
    stop() {
      wanted = false;
      sync();
    },
    destroy() {
      destroyed = true;
      wanted = false;
      sync();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      reduced.removeEventListener('change', onReducedChange);
      pointerTarget.removeEventListener('pointermove', onPointerMove);
      pointerTarget.removeEventListener('pointerleave', onPointerLeave);
    },
  };
}
