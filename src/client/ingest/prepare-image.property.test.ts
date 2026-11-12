import fc from "fast-check";
import { describe, it } from "vitest";
import { MAX_IMAGE_DIMENSION, MAX_SOURCE_PIXELS } from "./ingest.config";
import { prepareImage } from "./prepare-image";
import type { DecodedImage, PrepareImageDeps } from "./prepare-image";
import type { CanvasLike, Context2DLike } from "./types";

type DecodeOutcome =
  | "throw-sync"
  | "reject"
  | "never"
  | "late"
  | "bad-size"
  | "oversized"
  | "valid";
type CanvasOutcome =
  | "ok"
  | "null"
  | "create-throws"
  | "context-null"
  | "context-throws"
  | "draw-throws"
  | "getimagedata-throws"
  | "getimagedata-malformed";

const decodeArb = fc.constantFrom<DecodeOutcome>(
  "throw-sync", "reject", "never", "late", "bad-size", "oversized", "valid",
);
const canvasArb = fc.constantFrom<CanvasOutcome>(
  "ok", "null", "create-throws", "context-null", "context-throws",
  "draw-throws", "getimagedata-throws", "getimagedata-malformed",
);
const badSizeArb = fc.constantFrom(0, -5, NaN, Infinity, -Infinity);
const sideArb = fc.integer({ min: 1, max: 20000 });

function buildContext(outcome: CanvasOutcome): Context2DLike | null {
  switch (outcome) {
    case "context-null":
      return null;
    case "draw-throws":
      return {
        drawImage: () => { throw new Error("draw"); },
        getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray(0), width: w, height: h }),
      };
    case "getimagedata-throws":
      return { drawImage: () => undefined, getImageData: () => { throw new Error("gid"); } };
    case "getimagedata-malformed":
      return {
        drawImage: () => undefined,
        getImageData: () => ({ data: new Uint8ClampedArray(0), width: -1, height: -1 }),
      };
    default:
      return {
        drawImage: () => undefined,
        getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray(0), width: w, height: h }),
      };
  }
}

describe("prepareImage property tests", () => {
  /** **Validates: Requirements REQ-CI-20, REQ-CI-21, REQ-CI-22, REQ-CI-23, REQ-CI-24, REQ-CI-25** */
  it("PBT-53: never rejects, closes every decoded bitmap exactly once, successes are bounded", async () => {
    await fc.assert(
      fc.asyncProperty(
        decodeArb,
        canvasArb,
        badSizeArb,
        sideArb,
        sideArb,
        async (decodeOutcome, canvasOutcome, badSize, w, h) => {
          const timeoutMs = 15;
          const bitmaps: { closes: number }[] = [];
          const canvases: CanvasLike[] = [];

          const makeBitmap = (width: number, height: number): DecodedImage => {
            const record = { closes: 0 };
            bitmaps.push(record);
            return { width, height, source: {}, close: () => { record.closes += 1; } };
          };

          const decode = (): Promise<DecodedImage> => {
            switch (decodeOutcome) {
              case "throw-sync":
                throw new Error("sync");
              case "reject":
                return Promise.reject(new Error("reject"));
              case "never":
                return new Promise(() => undefined);
              case "late":
                return new Promise((resolve) => setTimeout(() => resolve(makeBitmap(w, h)), timeoutMs * 3));
              case "bad-size":
                return Promise.resolve(makeBitmap(badSize, h));
              case "oversized":
                return Promise.resolve(makeBitmap(MAX_SOURCE_PIXELS, 2 + (w % 5)));
              default:
                return Promise.resolve(makeBitmap(Math.min(w, 7000), Math.min(h, 7000)));
            }
          };

          const createCanvas = (cw: number, ch: number): CanvasLike | null => {
            if (canvasOutcome === "null") return null;
            if (canvasOutcome === "create-throws") throw new Error("create");
            const canvas: CanvasLike = {
              width: cw,
              height: ch,
              getContext: () => {
                if (canvasOutcome === "context-throws") throw new Error("ctx");
                return buildContext(canvasOutcome);
              },
            };
            canvases.push(canvas);
            return canvas;
          };

          const deps: PrepareImageDeps = { decode, createCanvas };
          const result = await prepareImage({ type: "image/png", size: 1000 }, deps, { timeoutMs });
          // Let late bitmaps arrive and be closed.
          await new Promise((r) => setTimeout(r, timeoutMs * 4));

          for (const record of bitmaps) {
            if (record.closes !== 1) return false;
          }
          if (result.ok) {
            const { width, height } = result.image;
            if (!Number.isInteger(width) || !Number.isInteger(height)) return false;
            if (width < 1 || height < 1) return false;
            if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) return false;
          } else {
            if (typeof result.code !== "string") return false;
            for (const canvas of canvases) {
              if (canvas.width !== 0 || canvas.height !== 0) return false;
            }
          }
          return true;
        },
      ),
      { numRuns: 100 },
    );
  }, 60_000);
});
