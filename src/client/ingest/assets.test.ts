import { describe, expect, it } from "vitest";
import manifest from "./assets.manifest.json";
import { ASSET_PATHS, OCR_LANGUAGES } from "./ingest.config";

const targets = new Set(manifest.map((entry) => entry.to.replace(/^public/, "")));

const CORE_FILES = [
  "tesseract-core-lstm.wasm.js",
  "tesseract-core-simd-lstm.wasm.js",
  "tesseract-core-relaxedsimd-lstm.wasm.js",
];

describe("asset paths match the manifest (REQ-CI-54)", () => {
  it("ocrWorker is in the manifest", () => {
    expect(targets.has(ASSET_PATHS.ocrWorker)).toBe(true);
  });

  it("zxingWasm is in the manifest", () => {
    expect(targets.has(ASSET_PATHS.zxingWasm)).toBe(true);
  });

  it.each(CORE_FILES)("core file %s is in the manifest", (name) => {
    expect(targets.has(`${ASSET_PATHS.ocrCoreDir}/${name}`)).toBe(true);
  });

  it.each([...OCR_LANGUAGES])("language data for %s is in the manifest", (lang) => {
    expect(targets.has(`${ASSET_PATHS.ocrLangDir}/${lang}.traineddata.gz`)).toBe(true);
  });

  it("every entry has positive bytes and a 64-char hex sha256", () => {
    expect(manifest.length).toBeGreaterThan(0);
    for (const entry of manifest) {
      expect(entry.bytes).toBeGreaterThan(0);
      expect(entry.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
