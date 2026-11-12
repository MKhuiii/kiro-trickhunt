import { describe, expect, it } from "vitest";
import { QR_MAX_RESULTS } from "./ingest.config";
import type { ImageDataLike } from "./types";
import { createZxingReader } from "./zxing-reader";

const image: ImageDataLike = {
  data: new Uint8ClampedArray(4),
  width: 1,
  height: 1,
};

describe("createZxingReader", () => {
  it("calls readBarcodes with the image and exactly the three options", async () => {
    const calls: Array<{ input: unknown; options: unknown }> = [];
    const result = [{ isValid: true, text: "hi" }];
    const reader = createZxingReader({
      readBarcodes: async (input, options) => {
        calls.push({ input, options });
        return result;
      },
    });

    const output = await reader.read(image);

    expect(output).toBe(result);
    expect(calls).toHaveLength(1);
    expect(calls[0].input).toBe(image);
    expect(calls[0].options).toEqual({
      formats: ["QRCode"],
      maxNumberOfSymbols: QR_MAX_RESULTS,
      textMode: "Plain",
    });
    expect(Object.keys(calls[0].options as object).sort()).toEqual([
      "formats",
      "maxNumberOfSymbols",
      "textMode",
    ]);
  });

  it("propagates a library rejection", async () => {
    const reader = createZxingReader({
      readBarcodes: () => Promise.reject(new Error("lib")),
    });
    await expect(reader.read(image)).rejects.toThrow("lib");
  });
});
