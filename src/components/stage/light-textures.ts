/**
 * Procedural textures for the stage (design R2-B). Everything is drawn on a
 * 2D canvas created through an injected factory, so tests can use a fake.
 * No image is loaded and nothing touches the network.
 */

export interface GradientLike {
  addColorStop(offset: number, color: string): void;
}

export interface Context2DLike {
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  lineCap: string;
  globalAlpha: number;
  createRadialGradient(
    x0: number,
    y0: number,
    r0: number,
    x1: number,
    y1: number,
    r1: number,
  ): GradientLike;
  fillRect(x: number, y: number, w: number, h: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void;
  closePath(): void;
  fill(): void;
  stroke(): void;
  ellipse(x: number, y: number, rx: number, ry: number, rot: number, a0: number, a1: number): void;
  drawImage(image: unknown, dx: number, dy: number, dw: number, dh: number): void;
}

export interface CanvasLike {
  width: number;
  height: number;
  getContext(type: "2d"): Context2DLike | null;
}

export type CanvasFactory = (width: number, height: number) => CanvasLike;

function draw(
  create: CanvasFactory,
  width: number,
  height: number,
  paint: (ctx: Context2DLike, w: number, h: number) => void,
): CanvasLike {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  const canvas = create(w, h);
  const ctx = canvas.getContext("2d");
  if (ctx !== null) paint(ctx, w, h);
  return canvas;
}

function radial(
  ctx: Context2DLike,
  x: number,
  y: number,
  r: number,
  stops: readonly (readonly [number, string])[],
): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  for (const [offset, color] of stops) g.addColorStop(offset, color);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

/** Warm light pool: bright center that fades to nothing. Used with additive blend. */
export function lightCanvas(create: CanvasFactory, size = 256): CanvasLike {
  return draw(create, size, size, (ctx, w) => {
    radial(ctx, w / 2, w / 2, w / 2, [
      [0, "rgba(255,196,110,0.95)"],
      [0.25, "rgba(255,160,70,0.55)"],
      [0.6, "rgba(200,90,30,0.18)"],
      [1, "rgba(120,40,10,0)"],
    ]);
  });
}

/** Vignette: clear in the middle, near-black at the edges. Stretched over the view. */
export function vignetteCanvas(create: CanvasFactory, size = 256): CanvasLike {
  return draw(create, size, size, (ctx, w) => {
    radial(ctx, w / 2, w / 2, w * 0.72, [
      [0, "rgba(6,2,12,0)"],
      [0.5, "rgba(6,2,12,0)"],
      [0.82, "rgba(6,2,12,0.7)"],
      [1, "rgba(4,0,8,0.97)"],
    ]);
  });
}

/** Soft blobs of fog that tile horizontally (each blob is also drawn one width away). */
export function fogCanvas(create: CanvasFactory, random: () => number, blobs = 7): CanvasLike {
  return draw(create, 512, 256, (ctx, w, h) => {
    for (let i = 0; i < blobs; i += 1) {
      const x = random() * w;
      const y = h * (0.35 + random() * 0.4);
      const r = h * (0.35 + random() * 0.3);
      for (const dx of [-w, 0, w]) {
        const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r);
        g.addColorStop(0, "rgba(190,170,225,0.55)");
        g.addColorStop(0.55, "rgba(150,130,190,0.22)");
        g.addColorStop(1, "rgba(120,100,160,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x + dx - r, y - r, r * 2, r * 2);
      }
    }
  });
}

/** Small round glow for fireflies. */
export function glowDotCanvas(create: CanvasFactory, size = 64): CanvasLike {
  return draw(create, size, size, (ctx, w) => {
    radial(ctx, w / 2, w / 2, w / 2, [
      [0, "rgba(235,255,150,1)"],
      [0.3, "rgba(200,255,100,0.55)"],
      [1, "rgba(160,220,60,0)"],
    ]);
  });
}

/** Two glowing eyes in the dark. */
export function eyesCanvas(create: CanvasFactory): CanvasLike {
  return draw(create, 96, 48, (ctx, w, h) => {
    for (const cx of [w * 0.3, w * 0.7]) {
      radial(ctx, cx, h / 2, h * 0.5, [
        [0, "rgba(255,225,150,1)"],
        [0.35, "rgba(235,90,50,0.8)"],
        [1, "rgba(150,20,20,0)"],
      ]);
    }
  });
}

/** Bat silhouette with wings spread. */
export function batCanvas(create: CanvasFactory): CanvasLike {
  return draw(create, 96, 48, (ctx, w, h) => {
    ctx.fillStyle = "rgba(8,4,16,1)";
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.3);
    ctx.quadraticCurveTo(w * 0.35, h * 0.05, 4, h * 0.25);
    ctx.quadraticCurveTo(w * 0.25, h * 0.55, w * 0.4, h * 0.5);
    ctx.quadraticCurveTo(w * 0.45, h * 0.8, w / 2, h * 0.65);
    ctx.quadraticCurveTo(w * 0.55, h * 0.8, w * 0.6, h * 0.5);
    ctx.quadraticCurveTo(w * 0.75, h * 0.55, w - 4, h * 0.25);
    ctx.quadraticCurveTo(w * 0.65, h * 0.05, w / 2, h * 0.3);
    ctx.closePath();
    ctx.fill();
  });
}

/** Crow silhouette gliding. */
export function crowCanvas(create: CanvasFactory): CanvasLike {
  return draw(create, 128, 56, (ctx, w, h) => {
    ctx.fillStyle = "rgba(6,3,12,1)";
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.55);
    ctx.quadraticCurveTo(w * 0.3, h * 0.05, w * 0.5, h * 0.4);
    ctx.quadraticCurveTo(w * 0.7, h * 0.05, w * 0.9, h * 0.55);
    ctx.quadraticCurveTo(w * 0.7, h * 0.35, w * 0.55, h * 0.6);
    ctx.lineTo(w * 0.62, h * 0.75);
    ctx.lineTo(w * 0.45, h * 0.62);
    ctx.quadraticCurveTo(w * 0.3, h * 0.35, w * 0.1, h * 0.55);
    ctx.closePath();
    ctx.fill();
  });
}

/** A bare, crooked tree drawn with branching lines (dark, thin, for the screen edges). */
export function treeCanvas(create: CanvasFactory, random: () => number): CanvasLike {
  return draw(create, 512, 512, (ctx, w, h) => {
    ctx.strokeStyle = "rgba(6,3,12,1)";
    ctx.lineCap = "round";
    const branch = (x: number, y: number, angle: number, len: number, width: number, depth: number): void => {
      if (depth === 0 || len < 6) return;
      const x2 = x + Math.sin(angle) * len;
      const y2 = y - Math.cos(angle) * len;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      const spread = 0.35 + random() * 0.35;
      branch(x2, y2, angle - spread, len * (0.68 + random() * 0.1), width * 0.7, depth - 1);
      branch(x2, y2, angle + spread * (0.6 + random() * 0.6), len * (0.66 + random() * 0.1), width * 0.7, depth - 1);
    };
    branch(w / 2, h, (random() - 0.5) * 0.2, h * 0.22, 14, 7);
  });
}
