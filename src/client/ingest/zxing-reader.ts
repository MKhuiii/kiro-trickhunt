import { QR_MAX_RESULTS } from "./ingest.config";
import type { ImageDataLike } from "./types";

/**
 * Minimal structural view of the `zxing-wasm/reader` module. The module is
 * never imported statically; the caller passes the dynamically imported lib.
 * Option names match `ReaderOptions` in zxing-wasm's type declarations.
 */
export interface ZxingLibLike {
  readBarcodes(
    input: ImageDataLike,
    options: {
      formats: string[];
      maxNumberOfSymbols: number;
      textMode: string;
    },
  ): Promise<unknown>;
}

export interface QrReader {
  read(imageData: ImageDataLike): Promise<unknown>;
}

export function createZxingReader(lib: ZxingLibLike): QrReader {
  return {
    read(imageData: ImageDataLike): Promise<unknown> {
      return lib.readBarcodes(imageData, {
        formats: ["QRCode"],
        maxNumberOfSymbols: QR_MAX_RESULTS,
        textMode: "Plain",
      });
    },
  };
}
