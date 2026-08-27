/**
 * The hero's plotted signal field.
 *
 * An instrument trace on the paper ground: a few carriers at real contrast,
 * each sitting on its own dashed zero-rule with a tick axis, surrounded by a
 * family of whisper traces. The pointer excites the medium — it raises the
 * local amplitude and emits wavepackets that propagate outward and decay.
 *
 * Framework-free Canvas 2D on purpose (docs/ARCHITECTURE.md §5): the hero is
 * above the fold, and the performance contract puts 0 KB of framework on the
 * critical path. No React, no WebGL, no library.
 *
 * ── What the pass-2 review changed, and why ────────────────────────────────
 *
 * The previous field measured **1.2:1** against the paper and its dominant
 * component completed **less than one cycle across 1440px**. Twenty-six
 * near-parallel undulations at 5–14% alpha is woodgrain, not signal. Four
 * things fix that, and none of them is "raise the global opacity" — which was
 * measured, rejected, and only makes the noise louder:
 *
 * 1. **Periodicity.** Spatial frequency is declared in CYCLES ACROSS THE
 *    CANVAS, not in radians per pixel, so the dominant component completes a
 *    fixed 4 cycles at every viewport width instead of 0.96 at 1440px and less
 *    on anything narrower. A wave that does not repeat inside the frame cannot
 *    be read as a wave.
 * 2. **An amplitude reference.** Each carrier gets a dashed zero-rule and a
 *    tick axis. A signal without a baseline is a squiggle; with one, the eye
 *    can measure the excursion and the thing becomes a plot.
 * 3. **Line-density hierarchy.** Four carriers at `ALPHA_CARRIER`, everything
 *    else whispering, instead of twenty-six equal strands.
 * 4. **Propagation.** The pointer no longer presses a static Gaussian dimple
 *    into the field — that reads as a lens, which is different physics. It
 *    deposits energy: a local amplitude gain, plus travelling wavepackets that
 *    move outward at `PACKET_SPEED` and decay over `PACKET_LIFE`.
 *
 * ── How the type stays dominant ────────────────────────────────────────────
 *
 * Contrast that makes a decorative field visible would also make it fight the
 * `<h1>`. So the field is not uniform: it is attenuated to `QUIET` inside the
 * box of `quietTarget` (the hero's content measure) and runs at full strength
 * outside it. The composition is deliberate — the instrument reads in the
 * margins the live review measured as dead space, and whispers behind the
 * words. That attenuation is baked into a per-row horizontal gradient at
 * layout time, so it costs nothing per frame.
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
 * `tokens.css` remains the only file holding a colour value. The RGB triple is
 * *parsed* out of that computed value so a per-row alpha ramp can be built —
 * derived from the token, never authored beside it.
 */

export interface SignalFieldOptions {
  /** Element whose pointer position drives the field. Defaults to the canvas. */
  pointerTarget?: HTMLElement | null;
  /**
   * Element whose box the field keeps quiet inside, so the type stays
   * dominant. Normally the hero's content measure. `null` runs the field at
   * full strength everywhere.
   */
  quietTarget?: HTMLElement | null;
}

export interface SignalFieldHandle {
  /** Requests the loop. Actually runs only when visible, focused and unreduced. */
  start(): void;
  /** Suspends the loop. The last frame stays on screen. */
  stop(): void;
  /** Cancels the loop and removes every listener. Not restartable. */
  destroy(): void;
}

const MAX_DPR = 2;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Three sine components per trace. `cycles` is the number of full periods the
 * component completes ACROSS THE CANVAS WIDTH — the review's prescription was
 * 3–6 visible cycles for the dominant one, and the two above it are chosen
 * incommensurate with it so the interference pattern never visibly repeats.
 * `w` is temporal, in radians per second.
 */
const COMPONENTS = [
  { amp: 1, cycles: 4, w: 0.115, phase: 0.31 },
  { amp: 0.36, cycles: 7.3, w: -0.19, phase: 1.7 },
  { amp: 0.15, cycles: 14.9, w: 0.31, phase: 3.9 },
] as const;

/** Sum of `COMPONENTS[].amp`, used to normalise the excursion to ±1. */
const AMP_TOTAL = COMPONENTS.reduce((sum, c) => sum + c.amp, 0);

/**
 * `cycles` above is quoted at a 1440px reference width. A phone would otherwise
 * get the same four periods inside 390px — a 98px wavelength that a 20px trace
 * amplitude turns into a zigzag rather than a wave. Scaling keeps the dominant
 * component inside the prescribed 3–6 cycles at every width: 3.2 at 390px, 4.0
 * at 1440px and above.
 */
const REFERENCE_WIDTH = 1440;
const CYCLE_FLOOR = 0.72;

/** Samples per period held on the FINEST component, which sets the step size. */
const SAMPLES_PER_PERIOD = 9;
const STEP_MIN = 3;
const STEP_MAX = 8;

/**
 * Row geometry. The trace count follows the canvas HEIGHT rather than a fixed
 * number, so a tall mobile hero is not eighteen traces stretched 90px apart.
 * Amplitude is capped against the wavelength as well as the row pitch: an
 * excursion much past a sixth of a wavelength stops reading as a wave and
 * starts reading as a scribble, which is what the first mobile pass produced.
 */
const ROW_PITCH = 44;
const ROWS_MIN = 8;
const ROWS_MAX = 20;
const MAX_CARRIERS = 4;
const CARRIER_AMP_OF_PITCH = 1.35;
const CARRIER_AMP_OF_WAVELENGTH = 0.16;
const WHISPER_AMP_OF_PITCH = 0.75;
const WHISPER_AMP_OF_WAVELENGTH = 0.09;

const clamp = (value: number, low: number, high: number): number => (value < low ? low : value > high ? high : value);

/* --- Alpha budget ----------------------------------------------------------
   Measured, not eyeballed. The paper ground composites to L 230 and the ink
   stroke to L 23, both as 0.2126R+0.7152G+0.0722B over 8-bit channels, so a
   stroke drawn at alpha `a` lands at L = 230 - 207·a. WCAG 2.1 needs L ≈ 132
   for 3:1 against the ground, i.e. a ≈ 0.474. `ALPHA_CARRIER` clears that with
   headroom for antialiasing, which never gives a 1px line full coverage.

     ALPHA_CARRIER 0.56  ->  L 114  ->  3.85:1 on paper   (visible, the point)
     ALPHA_RULE    0.30  ->  L 168  ->  2.02:1            (reference, subordinate)
     ALPHA_WHISPER 0.085 ->  L 212  ->  1.29:1            (texture, as before)

   Inside `quietTarget` every one of those is multiplied by QUIET, so the
   carrier reads 1.47:1 behind the words and cannot compete with 14.38:1 type.
   -------------------------------------------------------------------------- */
const ALPHA_CARRIER = 0.56;
const ALPHA_RULE = 0.3;
const ALPHA_WHISPER = 0.085;

/** Attenuation applied inside `quietTarget`, and the feather width in CSS px. */
const QUIET = 0.32;
const FEATHER = 72;

/** Gradient stops per row. Built once per layout, never per frame. */
const RAMP_STOPS = 32;

/* --- The pointer wavepacket ------------------------------------------------
   Energy deposited into the medium, not a lens pressed against it. A packet is
   a Gaussian envelope travelling outward from the emission point at
   PACKET_SPEED, carrying PACKET_CYCLES oscillations, decaying with an e-fold
   time of PACKET_LIFE. Emissions are rate-limited so a fast flick leaves a
   wake of a few packets rather than a smear of hundreds.
   -------------------------------------------------------------------------- */
const PACKET_LIMIT = 4;
/** Minimum milliseconds between emissions. */
const PACKET_INTERVAL = 90;
/** CSS px per second. */
const PACKET_SPEED = 620;
/** Gaussian half-width of the envelope, and its vertical reach, in CSS px. */
const PACKET_WIDTH = 115;
const PACKET_SPREAD = 165;
/** e-fold decay time, in seconds. Packets are dropped past 3x this. */
const PACKET_LIFE = 1.25;
/** Oscillations inside one envelope, and its peak height as a share of row amplitude. */
const PACKET_CYCLES = 2.4;
const PACKET_AMP = 0.85;

/**
 * Standing local excitation around a resting pointer: the field carries more
 * amplitude where energy was last deposited. This is a gain on the wave, not a
 * displacement of it, which is why it does not reintroduce the lens.
 */
const EXCITE_GAIN = 0.6;
const EXCITE_RADIUS = 260;

interface Packet {
  x: number;
  y: number;
  /** `performance.now()` at emission, in ms. */
  at: number;
}

/**
 * One trace: its baseline, its excursion, its phase offset, and the horizontal
 * alpha ramp that fades it out behind the type. `paint` is null only when the
 * computed colour could not be parsed into channels, in which case `alpha` is
 * used flat.
 */
interface Row {
  baseY: number;
  amp: number;
  phase: number;
  carrier: boolean;
  paint: CanvasGradient | null;
  alpha: number;
}

/** A zero-rule: the amplitude reference under one carrier. */
interface Rule {
  y: number;
  paint: CanvasGradient | null;
}

export function createSignalField(canvas: HTMLCanvasElement, options: SignalFieldOptions = {}): SignalFieldHandle {
  const context = canvas.getContext('2d');
  // A no-op handle, when there is no 2D context to draw into.
  if (!context) return { start() {}, stop() {}, destroy() {} };

  // Rebound to a non-nullable const: the hoisted `function` declarations below
  // would otherwise lose the null check that already guards them.
  const ctx: CanvasRenderingContext2D = context;

  const pointerTarget = options.pointerTarget ?? canvas;
  const quietTarget = options.quietTarget ?? null;

  const reduced = window.matchMedia(REDUCED_MOTION);

  let width = 0;
  let height = 0;
  let stroke = '';
  /**
   * The three channels of `stroke`, as `"21,23,27"`, ready to be spliced into
   * an `rgba()` with a per-stop alpha. Parsed out of the computed colour so no
   * colour value is authored here; null if the computed form was not `rgb()`,
   * in which case every row falls back to one flat alpha.
   */
  let rgb: string | null = null;

  /** `quietTarget`'s box in canvas-local CSS pixels, or null. */
  let quiet: { x0: number; y0: number; x1: number; y1: number } | null = null;

  /** Spatial frequencies in rad/px, derived from `COMPONENTS[].cycles` and `width`. */
  let wavenumbers: number[] = [];
  let rows: Row[] = [];
  /** One zero-rule under each carrier, and the tick spacing along it. */
  let rules: Rule[] = [];
  let tickStep = 96;
  /** Horizontal sampling step, in CSS pixels. Follows the finest component. */
  let step = STEP_MAX;

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
  let lastEmitAt = 0;
  let packets: Packet[] = [];

  /**
   * Openness at a point: 1 in the open margin, `QUIET` deep inside the type
   * box, smoothly feathered (Hermite) across `FEATHER` either side of its edge.
   */
  function openness(x: number, y: number): number {
    if (!quiet) return 1;
    const outside = Math.max(quiet.x0 - x, x - quiet.x1, quiet.y0 - y, y - quiet.y1);
    const t = clamp((outside + FEATHER) / (2 * FEATHER), 0, 1);
    return QUIET + (1 - QUIET) * t * t * (3 - 2 * t);
  }

  /** The horizontal alpha ramp for one row, baked once per layout. */
  function buildRamp(baseY: number, alpha: number): CanvasGradient | null {
    if (!rgb) return null;
    const ramp = ctx.createLinearGradient(0, 0, width, 0);
    for (let i = 0; i <= RAMP_STOPS; i += 1) {
      const t = i / RAMP_STOPS;
      ramp.addColorStop(t, `rgba(${rgb},${alpha * openness(width * t, baseY)})`);
    }
    return ramp;
  }

  function measure(): void {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = rect.width;
    height = rect.height;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    stroke = window.getComputedStyle(canvas).color;
    const channels = stroke.match(/\d+/g);
    rgb = channels && channels.length > 2 ? channels.slice(0, 3).join(',') : null;

    const quietRect = quietTarget?.getBoundingClientRect() ?? null;
    quiet =
      quietRect && quietRect.width > 0
        ? {
            x0: quietRect.left - rect.left,
            y0: quietRect.top - rect.top,
            x1: quietRect.right - rect.left,
            y1: quietRect.bottom - rect.top,
          }
        : null;

    const cycleScale = Math.min(1, CYCLE_FLOOR + (1 - CYCLE_FLOOR) * (width / REFERENCE_WIDTH));
    wavenumbers = COMPONENTS.map((c) => (Math.PI * 2 * c.cycles * cycleScale) / width);

    const finest = (COMPONENTS[COMPONENTS.length - 1] as (typeof COMPONENTS)[number]).cycles * cycleScale;
    step = clamp(width / (finest * SAMPLES_PER_PERIOD), STEP_MIN, STEP_MAX);

    /** Wavelength of the dominant component, which caps the excursion. */
    const wavelength = width / ((COMPONENTS[0] as (typeof COMPONENTS)[number]).cycles * cycleScale);

    // Mobile is a deliberate composition, not a squeezed desktop: the trace
    // count follows the height, so the pitch is the same everywhere and a tall
    // hero gets more traces rather than the same traces further apart.
    const total = Math.round(clamp(height / ROW_PITCH, ROWS_MIN, ROWS_MAX));
    const carriers = Math.round(clamp(total / 4.5, 2, MAX_CARRIERS));
    const spacing = height / (total + 1);
    tickStep = Math.max(56, Math.round(width / 14));

    const carrierAmp = Math.min(spacing * CARRIER_AMP_OF_PITCH, wavelength * CARRIER_AMP_OF_WAVELENGTH);
    const whisperAmp = Math.min(spacing * WHISPER_AMP_OF_PITCH, wavelength * WHISPER_AMP_OF_WAVELENGTH);

    // Carriers are spread evenly through the stack so the hierarchy reads as
    // "a few strong traces among many faint ones", not as two separate fields.
    const every = total / carriers;
    rows = [];
    rules = [];
    for (let i = 0; i < total; i += 1) {
      const baseY = spacing * (i + 1);
      const carrier = Math.floor(i / every) !== Math.floor((i + 1) / every);
      const alpha = carrier ? ALPHA_CARRIER : ALPHA_WHISPER;
      rows.push({
        baseY,
        amp: carrier ? carrierAmp : whisperAmp,
        phase: i * 0.55,
        carrier,
        paint: buildRamp(baseY, alpha),
        alpha,
      });
      if (carrier) rules.push({ y: baseY, paint: buildRamp(baseY, ALPHA_RULE) });
    }
  }

  /** Vertical displacement contributed by every live packet at (x, baseY). */
  function packetOffset(x: number, baseY: number, now: number, amp: number): number {
    let offset = 0;
    for (const p of packets) {
      const age = (now - p.at) / 1000;
      if (age < 0) continue;
      const front = Math.abs(x - p.x) - PACKET_SPEED * age;
      const envelope = Math.exp(-(front * front) / (2 * PACKET_WIDTH * PACKET_WIDTH));
      if (envelope < 0.002) continue;
      const dy = baseY - p.y;
      const across = Math.exp(-(dy * dy) / (2 * PACKET_SPREAD * PACKET_SPREAD));
      const decay = Math.exp(-age / PACKET_LIFE);
      offset -= Math.cos((front / PACKET_WIDTH) * PACKET_CYCLES) * envelope * across * decay * amp * PACKET_AMP;
    }
    return offset;
  }

  /** The dashed zero-rules and their tick axes. Static: they are the reference. */
  function drawGraticule(): void {
    for (const rule of rules) {
      ctx.strokeStyle = rule.paint ?? stroke;
      ctx.globalAlpha = rule.paint ? 1 : ALPHA_RULE;

      ctx.setLineDash([2, 7]);
      ctx.beginPath();
      ctx.moveTo(0, rule.y);
      ctx.lineTo(width, rule.y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.beginPath();
      for (let x = tickStep / 2; x < width; x += tickStep) {
        ctx.moveTo(x, rule.y - 3);
        ctx.lineTo(x, rule.y + 3);
      }
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  function draw(seconds: number, now: number): void {
    if (width === 0 || height === 0 || rows.length === 0) return;

    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineWidth = 1;
    drawGraticule();

    const excited = easedX >= 0 && easedY >= 0;
    const live = packets.length > 0;

    for (const row of rows) {
      ctx.lineWidth = row.carrier ? 1.4 : 1;
      ctx.strokeStyle = row.paint ?? stroke;
      ctx.globalAlpha = row.paint ? 1 : row.alpha;

      // Local excitation: more amplitude where the pointer last deposited
      // energy. A gain on the wave, never an offset — an offset is a lens.
      const dyExcite = row.baseY - easedY;
      const acrossExcite = excited
        ? Math.exp(-(dyExcite * dyExcite) / (2 * EXCITE_RADIUS * EXCITE_RADIUS)) * EXCITE_GAIN
        : 0;

      ctx.beginPath();
      for (let x = 0; x <= width + step; x += step) {
        let wave = 0;
        for (let c = 0; c < COMPONENTS.length; c += 1) {
          const component = COMPONENTS[c] as (typeof COMPONENTS)[number];
          wave +=
            component.amp *
            Math.sin(x * (wavenumbers[c] as number) + seconds * component.w + row.phase * component.phase);
        }
        wave /= AMP_TOTAL;

        let gain = 1;
        if (acrossExcite > 0) {
          const dx = x - easedX;
          gain += acrossExcite * Math.exp(-(dx * dx) / (2 * EXCITE_RADIUS * EXCITE_RADIUS));
        }

        let y = row.baseY + wave * row.amp * gain;
        if (live) y += packetOffset(x, row.baseY, now, row.amp);

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
    packets = [];
    draw(0, 0);
  }

  function tick(now: number): void {
    if (startedAt === 0) startedAt = now;

    // Ease the pointer so a fast flick does not snap the field.
    if (pointerX >= 0) {
      easedX = easedX < 0 ? pointerX : easedX + (pointerX - easedX) * 0.08;
      easedY = easedY < 0 ? pointerY : easedY + (pointerY - easedY) * 0.08;
    }

    if (packets.length > 0) {
      const cutoff = now - PACKET_LIFE * 3000;
      packets = packets.filter((p) => p.at > cutoff);
    }

    draw((now - startedAt) / 1000, now);
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
      packets = [];
    }
  }

  // --- listeners -----------------------------------------------------------

  const onResize = (): void => {
    measure();
    if (!shouldRun()) draw(0, 0);
  };

  const onVisibility = (): void => {
    pageVisible = document.visibilityState !== 'hidden';
    sync();
  };

  const onPointerMove = (event: PointerEvent): void => {
    const rect = canvas.getBoundingClientRect();
    pointerX = event.clientX - rect.left;
    pointerY = event.clientY - rect.top;

    if (!shouldRun()) return;

    const now = performance.now();
    if (now - lastEmitAt < PACKET_INTERVAL) return;

    lastEmitAt = now;
    packets.push({ x: pointerX, y: pointerY, at: now });
    if (packets.length > PACKET_LIMIT) packets.shift();
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
