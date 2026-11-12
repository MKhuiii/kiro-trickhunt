import { fitWithin } from "./fit-within";
import { MAX_IMAGE_DIMENSION, MAX_SOURCE_PIXELS, PREPARE_TIMEOUT_MS } from "./ingest.config";
import type { CanvasLike, ImageDataLike, ImageFileLike } from "./types";
import { validateImageFile } from "./validate-image-file";
import type { ImageFileErrorCode } from "./validate-image-file";

export type PrepareErrorCode =
  | ImageFileErrorCode
  | "decode-failed"
  | "too-many-pixels"
  | "canvas-unavailable";

export interface DecodedImage {
  readonly width: number;
  readonly height: number;
  readonly source: unknown;
  close(): void;
}

export interface PrepareImageDeps {
  decode(file: ImageFileLike): Promise<DecodedImage>;
  createCanvas(width: number, height: number): CanvasLike | null;
}

export interface PreparedImage {
  readonly canvas: CanvasLike;
  readonly imageData: ImageDataLike;
  readonly width: number;
  readonly height: number;
  /** Idempotent. Sets the canvas size to 0 to release its pixel buffer. */
  dispose(): void;
}

export type PrepareImageResult =
  | { readonly ok: true; readonly image: PreparedImage }
  | { readonly ok: false; readonly code: PrepareErrorCode };

export interface PrepareImageOptions {
  readonly timeoutMs?: number;
}

function fail(code: PrepareErrorCode): PrepareImageResult {
  return { ok: false, code };
}

function zeroCanvas(canvas: CanvasLike | null): void {
  if (canvas === null) return;
  try {
    canvas.width = 0;
    canvas.height = 0;
  } catch {
    // Nothing more can be done.
  }
}

/** Wraps `close()` so it runs at most once and never throws. */
function onceCloser(image: unknown): () => void {
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    try {
      (image as { close?: () => void }).close?.();
    } catch {
      // Ignore close failures.
    }
  };
}

function isPositiveFinite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Validates, decodes, downscales and redraws an image onto a canvas, keeping
 * only pixels (metadata is dropped). Never rejects: every failure is a code.
 * Uses no object URLs, network or storage.
 */
export async function prepareImage(
  file: ImageFileLike,
  deps: PrepareImageDeps,
  options?: PrepareImageOptions,
): Promise<PrepareImageResult> {
  let canvas: CanvasLike | null = null;
  let closeBitmap: (() => void) | null = null;
  let succeeded = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const validation = validateImageFile(file);
    if (!validation.ok) return fail(validation.code);

    const requested = options?.timeoutMs;
    const timeoutMs = isPositiveFinite(requested) ? requested : PREPARE_TIMEOUT_MS;

    let timedOut = false;
    const decodePromise: Promise<DecodedImage> = (async () => deps.decode(file))();
    // A bitmap that resolves after the timeout won is closed here, never leaked.
    decodePromise.then(
      (late) => {
        if (timedOut) onceCloser(late)();
      },
      () => undefined,
    );
    const timeoutPromise = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => {
        timedOut = true;
        resolve("timeout");
      }, timeoutMs);
    });
    const raced = await Promise.race([
      decodePromise.then(
        (value) => ({ value }),
        () => null,
      ),
      timeoutPromise,
    ]);
    if (raced === "timeout" || raced === null) return fail("decode-failed");
    const decoded = raced.value;
    closeBitmap = onceCloser(decoded);

    const width = decoded?.width;
    const height = decoded?.height;
    if (!isPositiveFinite(width) || !isPositiveFinite(height)) return fail("decode-failed");
    if (width * height > MAX_SOURCE_PIXELS) return fail("too-many-pixels");

    const fitted = fitWithin(width, height, MAX_IMAGE_DIMENSION);
    if (fitted.width < 1 || fitted.height < 1) return fail("decode-failed");

    canvas = deps.createCanvas(fitted.width, fitted.height);
    if (canvas === null || canvas === undefined) {
      canvas = null;
      return fail("canvas-unavailable");
    }
    const context = canvas.getContext("2d");
    if (context === null || context === undefined) return fail("canvas-unavailable");

    context.drawImage(decoded.source, 0, 0, fitted.width, fitted.height);
    const imageData = context.getImageData(0, 0, fitted.width, fitted.height);
    if (
      imageData === null ||
      typeof imageData !== "object" ||
      imageData.width !== fitted.width ||
      imageData.height !== fitted.height
    ) {
      return fail("decode-failed");
    }

    const readyCanvas = canvas;
    let disposed = false;
    const image: PreparedImage = {
      canvas: readyCanvas,
      imageData,
      width: fitted.width,
      height: fitted.height,
      dispose() {
        if (disposed) return;
        disposed = true;
        zeroCanvas(readyCanvas);
      },
    };
    succeeded = true;
    return { ok: true, image };
  } catch {
    return fail("decode-failed");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (closeBitmap !== null) closeBitmap();
    if (!succeeded) zeroCanvas(canvas);
  }
}
