import { ASSET_PATHS } from "./ingest.config";
import type { IngestDeps } from "./ingest-image";
import type { DecodedImage } from "./prepare-image";
import type { OcrEngine, OcrWorkerLike, OcrWorkerOptions } from "./run-ocr";
import type { CanvasLike, ImageFileLike } from "./types";
import { createZxingReader } from "./zxing-reader";
import type { QrReader, ZxingLibLike } from "./zxing-reader";

// The only file that touches browser globals. Every global is read inside a
// function, never at module top level, so the module imports fine under Node/SSR.
// tesseract.js and zxing-wasm appear only inside import() calls in functions.

interface ZxingModuleShape extends ZxingLibLike {
  prepareZXingModule(options: {
    overrides: { locateFile(path: string, prefix: string): string };
  }): unknown;
}

interface TesseractModuleShape {
  createWorker?: unknown;
  default?: { createWorker?: unknown };
}

type CreateWorkerFn = (
  langs: readonly string[],
  oem: number,
  options: OcrWorkerOptions,
) => Promise<OcrWorkerLike>;

export function createBrowserIngestDeps(): IngestDeps {
  let readerPromise: Promise<QrReader> | undefined;
  let enginePromise: Promise<OcrEngine> | undefined;

  return {
    prepare: {
      async decode(file: ImageFileLike): Promise<DecodedImage> {
        const bitmap = await createImageBitmap(file as Blob);
        return {
          width: bitmap.width,
          height: bitmap.height,
          source: bitmap,
          close(): void {
            bitmap.close();
          },
        };
      },
      createCanvas(width: number, height: number): CanvasLike | null {
        if (typeof document === "undefined") return null;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas as unknown as CanvasLike;
      },
    },
    qr: {
      loadReader(): Promise<QrReader> {
        if (readerPromise === undefined) {
          readerPromise = (async (): Promise<QrReader> => {
            const lib = (await import("zxing-wasm/reader")) as unknown as ZxingModuleShape;
            const wasmUrl = location.origin + ASSET_PATHS.zxingWasm;
            // `overrides` replaces the defaults atomically, so locateFile is always set.
            lib.prepareZXingModule({
              overrides: {
                locateFile: (path: string, prefix: string): string =>
                  path.endsWith(".wasm") ? wasmUrl : prefix + path,
              },
            });
            return createZxingReader(lib);
          })();
          // Allow a retry after a failed load.
          readerPromise.catch(() => {
            readerPromise = undefined;
          });
        }
        return readerPromise;
      },
    },
    ocr: {
      loadEngine(): Promise<OcrEngine> {
        if (enginePromise === undefined) {
          enginePromise = (async (): Promise<OcrEngine> => {
            const mod = (await import("tesseract.js")) as unknown as TesseractModuleShape;
            const fn = mod.createWorker ?? mod.default?.createWorker;
            if (typeof fn !== "function") throw new Error("tesseract createWorker missing");
            const createWorker = fn as CreateWorkerFn;
            return {
              createWorker: (langs, oem, options) => createWorker(langs, oem, options),
            };
          })();
          enginePromise.catch(() => {
            enginePromise = undefined;
          });
        }
        return enginePromise;
      },
      get assetBaseUrl(): string {
        return location.origin;
      },
    },
  };
}
