/**
 * Pixi stage adapter (design R2-B, REQ-HUNT-52 to REQ-HUNT-58).
 *
 * It draws the atmosphere (fog, trees, light, vignette, fireflies, bats, crows,
 * eyes) from a `StagePlan`. It does not import `pixi.js`: the module, the
 * container, the canvas factory and the page-visibility hook are parameters, so
 * tests can pass fakes. No filters, no network, no stored content.
 */

import type { ParticleKind, StageLayer, StagePlan } from "../../ui/view/stage-plan";
import { MAX_FLICKER_HZ } from "../../ui/view/stage-plan";
import {
  batCanvas,
  crowCanvas,
  eyesCanvas,
  fogCanvas,
  glowDotCanvas,
  lightCanvas,
  treeCanvas,
  vignetteCanvas,
} from "./light-textures";
import type { CanvasFactory, CanvasLike } from "./light-textures";

/* ---------- The small part of Pixi the adapter uses ---------- */

export interface PointLike {
  x: number;
  y: number;
  set(x: number, y?: number): void;
}

export interface DisplayLike {
  x: number;
  y: number;
  alpha: number;
  rotation: number;
  visible: boolean;
  scale: PointLike;
  destroy(options?: unknown): void;
}

export interface SpriteLike extends DisplayLike {
  anchor: PointLike;
  width: number;
  height: number;
  tint: number;
  blendMode: string;
  texture: unknown;
}

export interface ContainerLike extends DisplayLike {
  pivot: PointLike;
  addChild(...children: DisplayLike[]): unknown;
  removeChild(...children: DisplayLike[]): unknown;
}

export interface TickerLike {
  maxFPS: number;
  add(fn: (ticker: { deltaMS: number }) => void): unknown;
  remove(fn: (ticker: { deltaMS: number }) => void): unknown;
  start(): void;
  stop(): void;
}

export interface CanvasElementLike {
  style: { cssText: string };
  addEventListener(type: string, listener: (event: unknown) => void): void;
  removeEventListener(type: string, listener: (event: unknown) => void): void;
  remove?(): void;
}

export interface ApplicationLike {
  init(options: Record<string, unknown>): Promise<void>;
  readonly canvas: CanvasElementLike;
  readonly stage: ContainerLike;
  readonly screen: { width: number; height: number };
  readonly ticker: TickerLike;
  render(): void;
  destroy(rendererOptions?: unknown, options?: unknown): void;
}

export interface PixiLike {
  Application: new () => ApplicationLike;
  Container: new () => ContainerLike;
  Sprite: new (texture?: unknown) => SpriteLike;
  Texture: { from(source: unknown): unknown };
}

export interface HostLike {
  appendChild(node: unknown): unknown;
  removeChild?(node: unknown): unknown;
}

export interface VisibilityLike {
  isHidden(): boolean;
  /** Returns a function that removes the listener. */
  onChange(listener: () => void): () => void;
}

export interface StageDeps {
  readonly pixi: PixiLike;
  readonly container: HostLike;
  readonly createCanvas: CanvasFactory;
  readonly random: () => number;
  readonly resolution: number;
  readonly maxFps: number;
  readonly visibility: VisibilityLike;
  /** The canvas host's rectangle in viewport pixels, to place actors. */
  readonly getContainerRect: () => RectLike;
  /** Called when the WebGL context is lost; the host should fall back to the SVG scene. */
  readonly onLost?: () => void;
}

export interface RectLike {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export type ActorKind = "hunter" | "shade" | "monster";

/** One drawing the stage paints in place of the page's SVG (task 22). */
export interface ActorSpec {
  readonly id: string;
  readonly kind: ActorKind;
  /** The rasterized drawing. A new object means a new picture (for example a new pose). */
  readonly texture: CanvasLike;
  /** Where the drawing sits on the page, in viewport pixels. `null` hides it. */
  readonly getRect: () => RectLike | null;
}

export interface StageAdapter {
  update(plan: StagePlan): void;
  /** The actors drawn in the canvas. Missing ids are removed. */
  setActors(specs: readonly ActorSpec[]): void;
  /** Draws one frame now (after a resize, when no ticker is running). */
  refresh(): void;
  dispose(): void;
}

/* ---------- Tunables ---------- */

const TWO_PI = Math.PI * 2;
const FOG_TINT = 0xb9a8d8;
const FOG_Y: Readonly<Record<string, number>> = { "fog-far": 0.3, "fog-mid": 0.5, "fog-near": 0.66 };
const SWEEP_SECONDS = 2.4;
const MAX_FRAME_S = 0.1;
/** The monster starts as a dark silhouette and takes its colors as it steps forward. */
const MONSTER_START_TINT = 0x120c1c;

function lerpTint(from: number, to: number, t: number): number {
  const k = clamp(t, 0, 1);
  const mix = (shift: number): number => {
    const a = (from >> shift) & 0xff;
    const b = (to >> shift) & 0xff;
    return Math.round(a + (b - a) * k);
  };
  return (mix(16) << 16) | (mix(8) << 8) | mix(0);
}

interface Particle {
  readonly kind: ParticleKind;
  readonly sprite: SpriteLike;
  readonly seed: number;
  readonly x0: number;
  readonly y0: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function smooth(t: number): number {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

const EMPTY_PLAN: StagePlan = {
  enabled: false,
  layers: [],
  particles: [],
  darkness: 0,
  cameraDrift: 0,
  heartbeat: false,
  lightSweep: false,
  animateActors: false,
};

/**
 * Builds the stage. Rejects when Pixi cannot start (for example no WebGL); the
 * caller keeps the SVG scene. Everything created is destroyed on failure.
 */
export async function createStageAdapter(deps: StageDeps): Promise<StageAdapter> {
  const { pixi, container, createCanvas, random } = deps;
  const app = new pixi.Application();
  let disposed = false;
  let appReady = false;

  try {
    await app.init({
      backgroundAlpha: 0,
      antialias: false,
      autoDensity: true,
      resolution: clamp(deps.resolution, 1, 2),
      resizeTo: container,
      powerPreference: "low-power",
    });
    appReady = true;
    if (disposed) throw new Error("disposed");

    app.canvas.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block;";
    container.appendChild(app.canvas);
    app.ticker.maxFPS = clamp(deps.maxFps, 10, 60);

    const tex = (canvas: CanvasLike): unknown => pixi.Texture.from(canvas);
    const sprite = (texture: unknown): SpriteLike => new pixi.Sprite(texture);

    const lightTex = tex(lightCanvas(createCanvas));
    const vignetteTex = tex(vignetteCanvas(createCanvas));
    const fogTex = tex(fogCanvas(createCanvas, random));
    const glowTex = tex(glowDotCanvas(createCanvas));
    const eyesTex = tex(eyesCanvas(createCanvas));
    const batTex = tex(batCanvas(createCanvas));
    const crowTex = tex(crowCanvas(createCanvas));
    const treeTexA = tex(treeCanvas(createCanvas, random));
    const treeTexB = tex(treeCanvas(createCanvas, random));
    const whiteCanvas = createCanvas(4, 4);
    const whiteCtx = whiteCanvas.getContext("2d");
    if (whiteCtx !== null) {
      whiteCtx.fillStyle = "#ffffff";
      whiteCtx.fillRect(0, 0, 4, 4);
    }
    const whiteTex = tex(whiteCanvas);

    const world = new pixi.Container();
    app.stage.addChild(world);

    const fog = (["fog-far", "fog-mid", "fog-near"] as const).map((id) => {
      const a = sprite(fogTex);
      const b = sprite(fogTex);
      a.tint = FOG_TINT;
      b.tint = FOG_TINT;
      return { id, a, b };
    });
    // Back to front: far fog, middle fog, trees, the actors, near fog (so mist drifts in front of them).
    world.addChild(fog[0].a, fog[0].b, fog[1].a, fog[1].b);
    const treeLeft = sprite(treeTexA);
    const treeRight = sprite(treeTexB);
    for (const tree of [treeLeft, treeRight]) {
      tree.anchor.set(0.5, 1);
      world.addChild(tree);
    }
    const actorLayer = new pixi.Container();
    world.addChild(actorLayer);
    world.addChild(fog[2].a, fog[2].b);
    const particleLayer = new pixi.Container();
    world.addChild(particleLayer);
    const light = sprite(lightTex);
    light.anchor.set(0.5, 0.5);
    light.blendMode = "add";
    world.addChild(light);
    const veil = sprite(whiteTex);
    veil.tint = 0x05020b;
    world.addChild(veil);
    const vignette = sprite(vignetteTex);
    world.addChild(vignette);

    let plan: StagePlan = EMPTY_PLAN;
    let time = 0;
    let dark = 0;
    let camera = 1;
    let sweepT = SWEEP_SECONDS;
    let wasSweeping = false;
    let looping = false;
    const particles: Particle[] = [];

    const layer = (id: StageLayer["id"]): StageLayer | undefined =>
      plan.layers.find((l) => l.id === id);

    const makeParticle = (kind: ParticleKind): Particle => {
      const texture =
        kind === "firefly" ? glowTex : kind === "eyes" ? eyesTex : kind === "bat" ? batTex : crowTex;
      const s = sprite(texture);
      s.anchor.set(0.5, 0.5);
      if (kind === "firefly") s.blendMode = "add";
      particleLayer.addChild(s);
      return { kind, sprite: s, seed: random() * 100, x0: random(), y0: 0.2 + random() * 0.6 };
    };

    const reconcileParticles = (): void => {
      const want = new Map<ParticleKind, number>();
      for (const p of plan.particles) want.set(p.kind, (want.get(p.kind) ?? 0) + p.count);
      for (const kind of ["firefly", "bat", "crow", "eyes"] as const) {
        const have = particles.filter((p) => p.kind === kind);
        const need = want.get(kind) ?? 0;
        for (let i = have.length; i < need; i += 1) particles.push(makeParticle(kind));
        for (let i = have.length - 1; i >= need; i -= 1) {
          const gone = have[i];
          particleLayer.removeChild(gone.sprite);
          gone.sprite.destroy();
          particles.splice(particles.indexOf(gone), 1);
        }
      }
    };

    interface ActorState {
      spec: ActorSpec;
      readonly sprite: SpriteLike;
      texture: unknown;
      readonly bornAt: number;
    }
    const actors = new Map<string, ActorState>();

    const destroyTexture = (texture: unknown): void => {
      try {
        (texture as { destroy?: (all?: boolean) => void }).destroy?.(true);
      } catch {
        // Already destroyed.
      }
    };

    const applyActors = (specs: readonly ActorSpec[]): void => {
      const wanted = new Set(specs.map((s) => s.id));
      for (const [id, a] of [...actors]) {
        if (wanted.has(id)) continue;
        actorLayer.removeChild(a.sprite);
        a.sprite.destroy();
        destroyTexture(a.texture);
        actors.delete(id);
      }
      for (const spec of specs) {
        const have = actors.get(spec.id);
        if (have !== undefined) {
          if (have.spec.texture !== spec.texture) {
            // A new picture for the same actor (for example a new pose): keep its age.
            const next = tex(spec.texture);
            have.sprite.texture = next;
            destroyTexture(have.texture);
            have.texture = next;
          }
          have.spec = spec;
          continue;
        }
        const texture = tex(spec.texture);
        const s = sprite(texture);
        s.anchor.set(0.5, 0.5);
        actorLayer.addChild(s);
        actors.set(spec.id, { spec, sprite: s, texture, bornAt: time });
      }
    };

    const updateActors = (): void => {
      if (actors.size === 0) return;
      const cr = deps.getContainerRect();
      for (const a of actors.values()) {
        const r = a.spec.getRect();
        const s = a.sprite;
        if (r === null || !(r.width > 0) || !(r.height > 0)) {
          s.visible = false;
          continue;
        }
        s.visible = true;
        const size = Math.min(r.width, r.height);
        const age = Math.max(0, time - a.bornAt);
        let x = r.left + r.width / 2 - cr.left;
        let y = r.top + r.height / 2 - cr.top;
        let scale = 1;
        let alpha = 1;
        let tint = 0xffffff;
        if (plan.animateActors) {
          if (a.spec.kind === "hunter") {
            y += Math.sin(TWO_PI * 0.9 * time) * size * 0.012;
            x += Math.sin(TWO_PI * 0.45 * time) * size * 0.008;
          } else if (a.spec.kind === "shade") {
            x += Math.sin(TWO_PI * 0.35 * time) * size * 0.08;
            y += Math.sin(TWO_PI * 0.8 * time + 1) * size * 0.02;
          } else {
            // The monster steps out of the shade: dark and faint at first, then its colors.
            const rise = smooth(age / 1.8);
            alpha = rise;
            scale = (0.93 + 0.07 * rise) * (1 + 0.012 * Math.sin(TWO_PI * 0.22 * age));
            tint = lerpTint(MONSTER_START_TINT, 0xffffff, smooth(age / 1.4));
          }
        }
        s.x = x;
        s.y = y;
        s.width = size * scale;
        s.height = size * scale;
        s.alpha = alpha;
        s.tint = tint;
      }
    };

    const place = (w: number, h: number): void => {
      world.pivot.set(w / 2, h / 2);
      world.x = w / 2;
      world.y = h / 2;
      world.scale.set(camera);
      veil.width = w;
      veil.height = h;
      veil.alpha = clamp(dark * 0.3, 0, 0.4);
      vignette.width = w;
      vignette.height = h;
    };

    const frame = (dt: number, snap: boolean): void => {
      const w = app.screen.width;
      const h = app.screen.height;
      time += dt;
      const ease = snap ? 1 : 1 - Math.exp(-dt / 0.7);
      dark += (plan.darkness - dark) * ease;
      camera += (1 + plan.cameraDrift - camera) * (snap ? 1 : 1 - Math.exp(-dt / 3));
      place(w, h);

      const vig = layer("vignette");
      const pulse =
        vig !== undefined && vig.motion === "pulse"
          ? 0.82 + 0.18 * (0.5 + 0.5 * Math.sin(TWO_PI * vig.hz * time))
          : 1;
      vignette.visible = vig !== undefined;
      vignette.alpha = clamp((vig?.alpha ?? 0) * pulse, 0, 1);

      const lamp = layer("lantern-light");
      light.visible = lamp !== undefined;
      if (lamp !== undefined) {
        let flick = 1;
        if (lamp.motion === "flicker") {
          const f2 = Math.min(lamp.hz * 1.7, MAX_FLICKER_HZ);
          flick =
            0.88 +
            0.12 * (0.6 * Math.sin(TWO_PI * lamp.hz * time) + 0.4 * Math.sin(TWO_PI * f2 * time + 1.3));
        }
        let cx = w * 0.5;
        if (plan.lightSweep) {
          if (!wasSweeping) sweepT = 0;
          sweepT = Math.min(SWEEP_SECONDS, sweepT + dt);
          cx = w * (0.5 + 0.3 * Math.sin(Math.PI * smooth(sweepT / SWEEP_SECONDS)));
        }
        wasSweeping = plan.lightSweep;
        const size = Math.min(w, h) * 1.05;
        light.x = cx;
        light.y = h * 0.62;
        light.width = size;
        light.height = size;
        light.alpha = clamp(lamp.alpha * flick, 0, 1);
      } else {
        wasSweeping = false;
      }

      for (const f of fog) {
        const l = layer(f.id);
        f.a.visible = l !== undefined;
        f.b.visible = l !== undefined;
        if (l === undefined) continue;
        const offset = l.motion === "drift" ? ((time * l.hz) % 1) * w : 0;
        const fh = h * 0.55;
        const y = h * (FOG_Y[f.id] ?? 0.5) - fh / 2;
        f.a.width = w;
        f.b.width = w;
        f.a.height = fh;
        f.b.height = fh;
        f.a.x = -offset;
        f.b.x = -offset + w;
        f.a.y = y;
        f.b.y = y;
        f.a.alpha = l.alpha;
        f.b.alpha = l.alpha;
      }

      const trees = layer("trees");
      for (const [tree, side] of [
        [treeLeft, 0.03],
        [treeRight, 0.97],
      ] as const) {
        tree.visible = trees !== undefined;
        if (trees === undefined) continue;
        const th = Math.min(h * 0.72, w * 0.6);
        tree.height = th;
        tree.width = th * 0.8;
        tree.x = w * side;
        tree.y = h * 1.02;
        tree.alpha = trees.alpha;
        tree.rotation =
          trees.motion === "sway" ? Math.sin(TWO_PI * trees.hz * time + side * 7) * 0.015 : 0;
      }

      updateActors();

      for (const p of particles) {
        const s = p.sprite;
        const t = time + p.seed;
        if (p.kind === "firefly") {
          s.x = w * p.x0 + Math.sin(t * 0.37) * w * 0.05;
          s.y = h * p.y0 + Math.cos(t * 0.29) * h * 0.04;
          s.alpha = 0.2 + 0.55 * (0.5 + 0.5 * Math.sin(TWO_PI * 0.2 * t));
          s.width = 18;
          s.height = 18;
        } else if (p.kind === "eyes") {
          const cycle = (t % 9) / 9;
          const up = smooth(cycle / 0.18) * (1 - smooth((cycle - 0.45) / 0.18));
          s.x = w * (p.x0 < 0.5 ? 0.04 + p.x0 * 0.2 : 0.96 - (1 - p.x0) * 0.2);
          s.y = h * (0.35 + p.y0 * 0.45);
          s.alpha = 0.85 * up;
          s.width = 30;
          s.height = 15;
        } else if (p.kind === "bat") {
          const period = 16;
          const cycle = (t % period) / period;
          const run = clamp(cycle / 0.4, 0, 1);
          s.visible = cycle < 0.4;
          s.x = w * (-0.1 + 1.2 * run);
          s.y = h * (0.12 + p.y0 * 0.3) + Math.sin(TWO_PI * 0.5 * t) * h * 0.03;
          s.alpha = 0.9;
          s.width = 36;
          s.height = 18 * (0.55 + 0.45 * Math.abs(Math.sin(TWO_PI * 0.9 * t)));
        } else {
          const period = 24;
          const cycle = (t % period) / period;
          const run = clamp(cycle / 0.5, 0, 1);
          s.visible = cycle < 0.5;
          s.x = w * (1.1 - 1.2 * run);
          s.y = h * (0.1 + p.y0 * 0.25) + Math.sin(TWO_PI * 0.15 * t) * h * 0.02;
          s.alpha = 0.95;
          s.width = 56;
          s.height = 24;
        }
      }
    };

    const tick = (ticker: { deltaMS: number }): void => {
      if (disposed) return;
      const dt = clamp((Number.isFinite(ticker.deltaMS) ? ticker.deltaMS : 16) / 1000, 0, MAX_FRAME_S);
      frame(dt, false);
    };

    const needsLoop = (): boolean =>
      plan.layers.some((l) => l.motion !== "still") ||
      plan.particles.length > 0 ||
      plan.lightSweep ||
      (plan.animateActors && actors.size > 0) ||
      Math.abs(dark - plan.darkness) > 0.002 ||
      Math.abs(camera - (1 + plan.cameraDrift)) > 0.0005;

    const setLoop = (): void => {
      if (disposed) return;
      const run = needsLoop() && !deps.visibility.isHidden();
      if (run && !looping) {
        app.ticker.add(tick);
        app.ticker.start();
        looping = true;
      } else if (!run && looping) {
        app.ticker.remove(tick);
        app.ticker.stop();
        looping = false;
      }
      if (!run) {
        frame(0, true);
        app.render();
      }
    };

    const stopWatching = deps.visibility.onChange(setLoop);
    const onContextLost = (): void => {
      deps.onLost?.();
    };
    app.canvas.addEventListener("webglcontextlost", onContextLost);

    const adapter: StageAdapter = {
      update(next: StagePlan): void {
        if (disposed) return;
        plan = next.enabled ? next : EMPTY_PLAN;
        reconcileParticles();
        if (!plan.lightSweep) wasSweeping = false;
        // A still plan (reduced motion, or an empty stage) is drawn at once, without easing.
        const moving =
          plan.layers.some((l) => l.motion !== "still") ||
          plan.particles.length > 0 ||
          plan.lightSweep;
        if (!moving) {
          dark = plan.darkness;
          camera = 1 + plan.cameraDrift;
        }
        setLoop();
      },
      setActors(specs: readonly ActorSpec[]): void {
        if (disposed) return;
        applyActors(specs);
        setLoop();
      },
      refresh(): void {
        if (disposed) return;
        frame(0, true);
        app.render();
      },
      dispose(): void {
        if (disposed) return;
        disposed = true;
        stopWatching();
        app.canvas.removeEventListener("webglcontextlost", onContextLost);
        if (looping) {
          app.ticker.remove(tick);
          app.ticker.stop();
          looping = false;
        }
        for (const p of particles) p.sprite.destroy();
        particles.length = 0;
        actors.clear();
        try {
          app.destroy(
            { removeView: true },
            { children: true, texture: true, textureSource: true },
          );
        } catch {
          // Destroying twice or during a lost context must not break the page.
        }
      },
    };
    return adapter;
  } catch (error) {
    disposed = true;
    if (appReady) {
      try {
        app.destroy({ removeView: true }, { children: true, texture: true, textureSource: true });
      } catch {
        // Nothing more to clean up.
      }
    }
    throw error;
  }
}
