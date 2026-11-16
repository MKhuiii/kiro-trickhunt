import { describe, expect, it } from "vitest";
import { stagePlan } from "../../ui/view/stage-plan";
import type { StagePlan } from "../../ui/view/stage-plan";
import { createStageAdapter } from "./stage-adapter";
import type {
  ApplicationLike,
  DisplayLike,
  PixiLike,
  PointLike,
  SpriteLike,
  StageDeps,
} from "./stage-adapter";
import type { CanvasLike, Context2DLike } from "./light-textures";

class FakePoint implements PointLike {
  x = 0;
  y = 0;
  set(x: number, y: number = x): void {
    this.x = x;
    this.y = y;
  }
}

class FakeNode implements SpriteLike {
  x = 0;
  y = 0;
  alpha = 1;
  rotation = 0;
  visible = true;
  width = 0;
  height = 0;
  tint = 0xffffff;
  texture: unknown = null;
  blendMode = "normal";
  scale = new FakePoint();
  anchor = new FakePoint();
  pivot = new FakePoint();
  children: DisplayLike[] = [];
  destroyed = false;
  addChild(...c: DisplayLike[]): void {
    this.children.push(...c);
  }
  removeChild(...c: DisplayLike[]): void {
    this.children = this.children.filter((x) => !c.includes(x));
  }
  destroy(): void {
    this.destroyed = true;
  }
}

interface Log {
  apps: FakeApp[];
  sprites: FakeNode[];
  textures: unknown[];
}

class FakeApp implements ApplicationLike {
  static failInit = false;
  stage = new FakeNode();
  screen = { width: 800, height: 600 };
  listeners = new Map<string, Set<(e: unknown) => void>>();
  canvas = {
    style: { cssText: "" },
    addEventListener: (type: string, fn: (e: unknown) => void) => {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type)?.add(fn);
    },
    removeEventListener: (type: string, fn: (e: unknown) => void) => {
      this.listeners.get(type)?.delete(fn);
    },
  };
  tickFns = new Set<(t: { deltaMS: number }) => void>();
  started = false;
  maxFPS = 0;
  ticker = {
    get maxFPS(): number {
      return 0;
    },
    set maxFPS(_v: number) {},
    add: (fn: (t: { deltaMS: number }) => void) => {
      this.tickFns.add(fn);
    },
    remove: (fn: (t: { deltaMS: number }) => void) => {
      this.tickFns.delete(fn);
    },
    start: () => {
      this.started = true;
    },
    stop: () => {
      this.started = false;
    },
  };
  renders = 0;
  destroyCalls: unknown[][] = [];
  initOptions: Record<string, unknown> | null = null;
  async init(options: Record<string, unknown>): Promise<void> {
    if (FakeApp.failInit) throw new Error("no webgl");
    this.initOptions = options;
  }
  render(): void {
    this.renders += 1;
  }
  destroy(...args: unknown[]): void {
    this.destroyCalls.push(args);
  }
  tick(deltaMS = 16): void {
    for (const fn of [...this.tickFns]) fn({ deltaMS });
  }
}

function makePixi(log: Log): PixiLike {
  return {
    Application: class extends FakeApp {
      constructor() {
        super();
        log.apps.push(this);
      }
    },
    Container: FakeNode,
    Sprite: class extends FakeNode {
      constructor(texture?: unknown) {
        super();
        void texture;
        log.sprites.push(this);
      }
    },
    Texture: {
      from: (source: unknown) => {
        log.textures.push(source);
        return { source };
      },
    },
  };
}

const ctx: Context2DLike = {
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 1,
  lineCap: "butt",
  globalAlpha: 1,
  createRadialGradient: () => ({ addColorStop() {} }),
  fillRect() {},
  beginPath() {},
  moveTo() {},
  lineTo() {},
  quadraticCurveTo() {},
  closePath() {},
  fill() {},
  stroke() {},
  ellipse() {},
  drawImage() {},
};

function createCanvas(width: number, height: number): CanvasLike {
  return { width, height, getContext: () => ctx };
}

interface Harness {
  deps: StageDeps;
  log: Log;
  host: { children: unknown[]; appendChild(n: unknown): void };
  visible: { hidden: boolean; listeners: Set<() => void> };
  lost: { count: number };
}

function harness(): Harness {
  FakeApp.failInit = false;
  const log: Log = { apps: [], sprites: [], textures: [] };
  const host = {
    children: [] as unknown[],
    appendChild(n: unknown) {
      this.children.push(n);
    },
  };
  const visible = { hidden: false, listeners: new Set<() => void>() };
  const lost = { count: 0 };
  let seed = 0.37;
  const deps: StageDeps = {
    pixi: makePixi(log),
    container: host,
    createCanvas,
    random: () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    },
    resolution: 3,
    maxFps: 30,
    getContainerRect: () => ({ left: 10, top: 20, width: 800, height: 600 }),
    visibility: {
      isHidden: () => visible.hidden,
      onChange: (fn) => {
        visible.listeners.add(fn);
        return () => visible.listeners.delete(fn);
      },
    },
    onLost: () => {
      lost.count += 1;
    },
  };
  return { deps, log, host, visible, lost };
}

const HUNT: StagePlan = stagePlan({ phase: "hunting" }, { reduceMotion: false }, "normal");
const HOME: StagePlan = stagePlan({ phase: "home" }, { reduceMotion: false }, "normal");
const STILL: StagePlan = stagePlan({ phase: "home" }, { reduceMotion: true }, "normal");

describe("createStageAdapter", () => {
  it("adds a pointer-transparent canvas to the host and caps the resolution", async () => {
    const h = harness();
    await createStageAdapter(h.deps);
    const app = h.log.apps[0];
    expect(h.host.children).toHaveLength(1);
    expect(app.canvas.style.cssText).toContain("pointer-events:none");
    expect(app.initOptions?.resolution).toBe(2);
    expect(app.initOptions?.backgroundAlpha).toBe(0);
  });

  it("starts the ticker for a moving plan and shows the planned particles", async () => {
    const h = harness();
    const adapter = await createStageAdapter(h.deps);
    adapter.update(HUNT);
    const app = h.log.apps[0];
    expect(app.started).toBe(true);
    expect(app.tickFns.size).toBe(1);
    const particleCount = HUNT.particles.reduce((n, p) => n + p.count, 0);
    // 3 fog layers x 2 + 2 trees + light + veil + vignette = 11 fixed sprites.
    expect(h.log.sprites.length).toBe(11 + particleCount);
    app.tick();
    app.tick(1000);
  });

  it("renders once and stops the ticker for a still plan", async () => {
    const h = harness();
    const adapter = await createStageAdapter(h.deps);
    adapter.update(STILL);
    const app = h.log.apps[0];
    expect(app.started).toBe(false);
    expect(app.tickFns.size).toBe(0);
    expect(app.renders).toBeGreaterThan(0);
    expect(h.log.sprites.length).toBe(11);
  });

  it("removes particles when the plan has fewer", async () => {
    const h = harness();
    const adapter = await createStageAdapter(h.deps);
    adapter.update(HUNT);
    const before = h.log.sprites.filter((s) => s.destroyed).length;
    adapter.update(HOME);
    const after = h.log.sprites.filter((s) => s.destroyed).length;
    expect(after).toBeGreaterThan(before);
  });

  it("drifts the fog while the ticker runs and survives bad frame times", async () => {
    const h = harness();
    const adapter = await createStageAdapter(h.deps);
    adapter.update(HOME);
    const app = h.log.apps[0];
    const fog = h.log.sprites[0];
    app.tick(16);
    const x1 = fog.x;
    for (let i = 0; i < 50; i += 1) app.tick(100);
    expect(fog.x).not.toBe(x1);
    expect(() => app.tick(Number.NaN)).not.toThrow();
    expect(Number.isFinite(fog.x)).toBe(true);
  });

  it("stops while the tab is hidden and resumes when visible", async () => {
    const h = harness();
    const adapter = await createStageAdapter(h.deps);
    adapter.update(HOME);
    const app = h.log.apps[0];
    expect(app.started).toBe(true);
    h.visible.hidden = true;
    for (const fn of h.visible.listeners) fn();
    expect(app.started).toBe(false);
    h.visible.hidden = false;
    for (const fn of h.visible.listeners) fn();
    expect(app.started).toBe(true);
  });

  it("reports a lost WebGL context to the host", async () => {
    const h = harness();
    await createStageAdapter(h.deps);
    const app = h.log.apps[0];
    for (const fn of app.listeners.get("webglcontextlost") ?? []) fn({});
    expect(h.lost.count).toBe(1);
  });

  it("disposes once: stops the ticker, removes listeners, destroys textures", async () => {
    const h = harness();
    const adapter = await createStageAdapter(h.deps);
    adapter.update(HUNT);
    const app = h.log.apps[0];
    adapter.dispose();
    adapter.dispose();
    expect(app.started).toBe(false);
    expect(app.tickFns.size).toBe(0);
    expect(app.destroyCalls).toHaveLength(1);
    expect(app.destroyCalls[0][1]).toEqual({ children: true, texture: true, textureSource: true });
    expect(app.listeners.get("webglcontextlost")?.size ?? 0).toBe(0);
    expect(h.visible.listeners.size).toBe(0);
    const renders = app.renders;
    adapter.update(HOME);
    expect(app.renders).toBe(renders);
  });

  it("rejects without touching the host when Pixi cannot start", async () => {
    const h = harness();
    FakeApp.failInit = true;
    await expect(createStageAdapter(h.deps)).rejects.toThrow();
    expect(h.host.children).toHaveLength(0);
    FakeApp.failInit = false;
  });

  describe("actors (the drawings painted in the canvas)", () => {
    const canvasA = createCanvas(512, 512);
    const canvasB = createCanvas(512, 512);
    const rectOf = (left: number, top: number, w: number, h: number) => () => ({
      left,
      top,
      width: w,
      height: h,
    });

    it("places an actor over its page rectangle (square fit, container offset)", async () => {
      const h = harness();
      const adapter = await createStageAdapter(h.deps);
      adapter.update(STILL);
      const before = h.log.sprites.length;
      adapter.setActors([
        { id: "hunter", kind: "hunter", texture: canvasA, getRect: rectOf(110, 220, 200, 300) },
      ]);
      const actor = h.log.sprites[before];
      expect(h.log.sprites.length).toBe(before + 1);
      // Center of the rectangle minus the container's own position; the shorter side is the size.
      expect(actor.x).toBe(110 + 100 - 10);
      expect(actor.y).toBe(220 + 150 - 20);
      expect(actor.width).toBe(200);
      expect(actor.height).toBe(200);
      expect(actor.anchor.x).toBe(0.5);
    });

    it("hides an actor whose rectangle is gone or empty", async () => {
      const h = harness();
      const adapter = await createStageAdapter(h.deps);
      adapter.update(STILL);
      const before = h.log.sprites.length;
      adapter.setActors([
        { id: "monster", kind: "monster", texture: canvasA, getRect: () => null },
      ]);
      expect(h.log.sprites[before].visible).toBe(false);
      adapter.setActors([
        { id: "monster", kind: "monster", texture: canvasA, getRect: rectOf(0, 0, 0, 50) },
      ]);
      expect(h.log.sprites[before].visible).toBe(false);
    });

    it("shows a still monster fully with reduced motion and starts it dark when moving", async () => {
      const h = harness();
      const adapter = await createStageAdapter(h.deps);
      adapter.update(STILL);
      let before = h.log.sprites.length;
      adapter.setActors([
        { id: "monster", kind: "monster", texture: canvasA, getRect: rectOf(100, 100, 300, 300) },
      ]);
      let monster = h.log.sprites[before];
      expect(monster.alpha).toBe(1);
      expect(monster.tint).toBe(0xffffff);
      expect(monster.width).toBe(300);

      const h2 = harness();
      const adapter2 = await createStageAdapter(h2.deps);
      adapter2.update(HUNT);
      before = h2.log.sprites.length;
      adapter2.setActors([
        { id: "monster", kind: "monster", texture: canvasA, getRect: rectOf(100, 100, 300, 300) },
      ]);
      h2.log.apps[0].tick(16);
      monster = h2.log.sprites[before];
      expect(monster.alpha).toBeLessThan(0.1);
      expect(monster.tint).not.toBe(0xffffff);
      for (let i = 0; i < 40; i += 1) h2.log.apps[0].tick(100);
      expect(monster.alpha).toBe(1);
      expect(monster.tint).toBe(0xffffff);
    });

    it("keeps an actor's age when its picture changes and removes missing actors", async () => {
      const h = harness();
      const adapter = await createStageAdapter(h.deps);
      adapter.update(HUNT);
      const before = h.log.sprites.length;
      const rect = rectOf(100, 100, 100, 100);
      adapter.setActors([
        { id: "hunter", kind: "hunter", texture: canvasA, getRect: rect },
        { id: "shade", kind: "shade", texture: canvasA, getRect: rect },
      ]);
      expect(h.log.sprites.length).toBe(before + 2);
      const hunter = h.log.sprites[before];
      const first = hunter.texture;
      adapter.setActors([{ id: "hunter", kind: "hunter", texture: canvasB, getRect: rect }]);
      expect(h.log.sprites.length).toBe(before + 2);
      expect(hunter.texture).not.toBe(first);
      expect(hunter.destroyed).toBe(false);
      expect(h.log.sprites[before + 1].destroyed).toBe(true);
    });

    it("keeps the ticker running while actors move, and draws once on refresh when still", async () => {
      const h = harness();
      const adapter = await createStageAdapter(h.deps);
      adapter.update(STILL);
      const app = h.log.apps[0];
      adapter.setActors([
        { id: "hunter", kind: "hunter", texture: canvasA, getRect: rectOf(0, 0, 50, 50) },
      ]);
      expect(app.started).toBe(false);
      const renders = app.renders;
      adapter.refresh();
      expect(app.renders).toBe(renders + 1);
      adapter.update(HUNT);
      expect(app.started).toBe(true);
    });

    it("moves the hunter and the shade a little while the stage runs, never far", async () => {
      const h = harness();
      const adapter = await createStageAdapter(h.deps);
      adapter.update(HUNT);
      const before = h.log.sprites.length;
      adapter.setActors([
        { id: "hunter", kind: "hunter", texture: canvasA, getRect: rectOf(300, 300, 100, 100) },
        { id: "shade", kind: "shade", texture: canvasA, getRect: rectOf(500, 300, 100, 100) },
      ]);
      const xs: number[] = [];
      for (let i = 0; i < 60; i += 1) {
        h.log.apps[0].tick(50);
        xs.push(h.log.sprites[before + 1].x);
      }
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(1);
      expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(30);
    });
  });

  it("treats a disabled plan as an empty stage", async () => {
    const h = harness();
    const adapter = await createStageAdapter(h.deps);
    adapter.update(stagePlan({ phase: "home" }, { reduceMotion: false }, "off"));
    const app = h.log.apps[0];
    expect(app.started).toBe(false);
    expect(h.log.sprites.length).toBe(11);
  });
});
