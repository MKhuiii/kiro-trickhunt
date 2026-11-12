import { describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_BYTES, MAX_IMAGE_DIMENSION, MAX_SOURCE_PIXELS } from "./ingest.config";
import { fitWithin } from "./fit-within";
import { prepareImage } from "./prepare-image";
import type { DecodedImage, PrepareImageDeps } from "./prepare-image";
import type { CanvasLike, Context2DLike, ImageFileLike } from "./types";

const FILE: ImageFileLike = { type: "image/png", size: 1000 };

function makeBitmap(width: number, height: number) {
  const close = vi.fn();
  const bitmap: DecodedImage = { width, height, source: { tag: "src" }, close };
  return { bitmap, close };
}

function makeCanvas(opts: { context?: Context2DLike | null } = {}) {
  const drawImage = vi.fn();
  const context: Context2DLike | null =
    opts.context === undefined
      ? {
          drawImage,
          getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray(0), width: w, height: h }),
        }
      : opts.context;
  const canvas: CanvasLike = { width: 0, height: 0, getContext: () => context };
  return { canvas, drawImage };
}

function makeDeps(bitmap: DecodedImage, canvas: CanvasLike | null) {
  const createCanvas = vi.fn((w: number, h: number) => {
    if (canvas !== null) {
      canvas.width = w;
      canvas.height = h;
    }
    return canvas;
  });
  const decode = vi.fn(async () => bitmap);
  const deps: PrepareImageDeps = { decode, createCanvas };
  return { deps, decode, createCanvas };
}

describe("prepareImage", () => {
  it("never calls the decoder for a too-large file", async () => {
    const { bitmap } = makeBitmap(10, 10);
    const { deps, decode } = makeDeps(bitmap, makeCanvas().canvas);
    const result = await prepareImage({ type: "image/png", size: MAX_IMAGE_BYTES + 1 }, deps);
    expect(result).toEqual({ ok: false, code: "file-too-large" });
    expect(decode).not.toHaveBeenCalled();
  });

  it("returns decode-failed when the decoder throws", async () => {
    const deps: PrepareImageDeps = {
      decode: () => {
        throw new Error("boom");
      },
      createCanvas: () => null,
    };
    expect(await prepareImage(FILE, deps)).toEqual({ ok: false, code: "decode-failed" });
  });

  it("returns decode-failed when the decoder never settles", async () => {
    const deps: PrepareImageDeps = { decode: () => new Promise(() => undefined), createCanvas: () => null };
    expect(await prepareImage(FILE, deps, { timeoutMs: 10 })).toEqual({ ok: false, code: "decode-failed" });
  });

  it("closes a bitmap that resolves after the timeout", async () => {
    const { bitmap, close } = makeBitmap(10, 10);
    const deps: PrepareImageDeps = {
      decode: () => new Promise((resolve) => setTimeout(() => resolve(bitmap), 40)),
      createCanvas: () => null,
    };
    expect(await prepareImage(FILE, deps, { timeoutMs: 10 })).toEqual({ ok: false, code: "decode-failed" });
    await new Promise((r) => setTimeout(r, 80));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("returns decode-failed for zero size and closes once", async () => {
    const { bitmap, close } = makeBitmap(0, 10);
    const { deps, createCanvas } = makeDeps(bitmap, makeCanvas().canvas);
    expect(await prepareImage(FILE, deps)).toEqual({ ok: false, code: "decode-failed" });
    expect(createCanvas).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("returns too-many-pixels and closes once", async () => {
    const { bitmap, close } = makeBitmap(MAX_SOURCE_PIXELS, 2);
    const { deps, createCanvas } = makeDeps(bitmap, makeCanvas().canvas);
    expect(await prepareImage(FILE, deps)).toEqual({ ok: false, code: "too-many-pixels" });
    expect(createCanvas).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("returns canvas-unavailable when createCanvas returns null", async () => {
    const { bitmap, close } = makeBitmap(10, 10);
    const { deps } = makeDeps(bitmap, null);
    expect(await prepareImage(FILE, deps)).toEqual({ ok: false, code: "canvas-unavailable" });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("returns canvas-unavailable when getContext returns null and zeroes the canvas", async () => {
    const { bitmap, close } = makeBitmap(10, 10);
    const { canvas } = makeCanvas({ context: null });
    const { deps } = makeDeps(bitmap, canvas);
    expect(await prepareImage(FILE, deps)).toEqual({ ok: false, code: "canvas-unavailable" });
    expect(close).toHaveBeenCalledTimes(1);
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it("draws a large image once at the fitted size and closes once on success", async () => {
    const { bitmap, close } = makeBitmap(6000, 3000);
    const { canvas, drawImage } = makeCanvas();
    const { deps, createCanvas } = makeDeps(bitmap, canvas);
    const fitted = fitWithin(6000, 3000, MAX_IMAGE_DIMENSION);
    const result = await prepareImage(FILE, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(createCanvas).toHaveBeenCalledWith(fitted.width, fitted.height);
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(drawImage).toHaveBeenCalledWith(bitmap.source, 0, 0, fitted.width, fitted.height);
    expect(result.image.width).toBe(fitted.width);
    expect(result.image.height).toBe(fitted.height);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("zeroes the canvas and closes once when drawImage throws", async () => {
    const { bitmap, close } = makeBitmap(10, 10);
    const { canvas } = makeCanvas({
      context: {
        drawImage: () => {
          throw new Error("draw");
        },
        getImageData: () => {
          throw new Error("unused");
        },
      },
    });
    const { deps } = makeDeps(bitmap, canvas);
    expect(await prepareImage(FILE, deps)).toEqual({ ok: false, code: "decode-failed" });
    expect(close).toHaveBeenCalledTimes(1);
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it("dispose zeroes the canvas and is safe to call twice", async () => {
    const { bitmap } = makeBitmap(10, 10);
    const { canvas } = makeCanvas();
    const { deps } = makeDeps(bitmap, canvas);
    const result = await prepareImage(FILE, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(canvas.width).toBe(10);
    result.image.dispose();
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
    expect(() => result.image.dispose()).not.toThrow();
    expect(canvas.width).toBe(0);
  });
});
