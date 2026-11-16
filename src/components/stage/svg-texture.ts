/**
 * Turns one of the page's own SVG drawings into a canvas the Pixi stage can use
 * as a texture (spec hunter-ui, task 22). The drawing is serialized, its theme
 * colors are inlined, and it is loaded as an image from a same-origin `blob:`
 * address that is revoked at once. No network request is made.
 */

import { prepareSvgMarkup } from "./svg-markup";
import type { CanvasFactory, CanvasLike } from "./light-textures";

export interface ImageLike {
  readonly width: number;
  readonly height: number;
}

export interface RasterDeps {
  serialize(node: unknown): string;
  /** Current value of a CSS custom property such as `--th-ink`. */
  resolveVar(name: string): string;
  createBlobUrl(markup: string): string;
  revokeBlobUrl(url: string): void;
  loadImage(url: string): Promise<ImageLike>;
  createCanvas: CanvasFactory;
}

export interface RasterOptions {
  /** Side of the square canvas in pixels. */
  readonly size: number;
  /** Hide the fine-detail groups (high contrast). */
  readonly highContrast: boolean;
}

/**
 * Rasterizes an SVG element. Rejects when the markup is not plain art or the
 * image fails to load; the caller keeps the SVG on the page in that case.
 */
export async function rasterizeSvg(
  svg: unknown,
  options: RasterOptions,
  deps: RasterDeps,
): Promise<CanvasLike> {
  const markup = prepareSvgMarkup(deps.serialize(svg), {
    size: options.size,
    hideDetail: options.highContrast,
    resolve: deps.resolveVar,
  });
  const url = deps.createBlobUrl(markup);
  try {
    const image = await deps.loadImage(url);
    const canvas = deps.createCanvas(options.size, options.size);
    const ctx = canvas.getContext("2d");
    if (ctx === null) throw new Error("no 2d context");
    ctx.drawImage(image, 0, 0, options.size, options.size);
    return canvas;
  } finally {
    deps.revokeBlobUrl(url);
  }
}

/** The real browser dependencies. Only used from the client. */
export function browserRasterDeps(createCanvas: CanvasFactory): RasterDeps {
  const root = document.documentElement;
  return {
    serialize: (node) => new XMLSerializer().serializeToString(node as Node),
    resolveVar: (name) => getComputedStyle(root).getPropertyValue(name),
    createBlobUrl: (markup) =>
      URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" })),
    revokeBlobUrl: (url) => URL.revokeObjectURL(url),
    loadImage: (url) =>
      new Promise<ImageLike>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("svg image failed to load"));
        img.src = url;
      }),
    createCanvas,
  };
}
