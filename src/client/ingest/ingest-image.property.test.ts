import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ingestImage } from "./ingest-image";
import type { IngestDeps } from "./ingest-image";
import type { CanvasLike } from "./types";

const NUM_RUNS = 100;

type PrepareMode = "ok" | "decode-throws" | "canvas-null" | "no-context" | "bad-size";
type QrMode = "ok" | "loader-throws" | "read-throws" | "garbage";
type OcrMode = "ok" | "engine-throws" | "create-throws" | "recognize-throws" | "bad-output" | "terminate-throws";

interface Scenario {
  prepare: PrepareMode;
  qr: QrMode;
  ocr: OcrMode;
  payloads: string[];
  ocrText: string;
  confidence: number;
  skip: boolean;
}

const MARKER_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const markerArb = fc
  .array(fc.constantFrom(...MARKER_CHARS.split("")), { minLength: 12, maxLength: 20 })
  .map((chars) => "ZQX" + chars.join(""));

const lowerText = fc.stringMatching(/^[a-z0-9 ]{0,60}$/);

function nonUrlPayload(marker: string): fc.Arbitrary<string> {
  return fc.constantFrom(
    `WIFI:T:WPA;S:net;P:${marker};;`,
    `wifi:T:WPA;S:${marker};P:x;;`,
    `000201010212${marker}`,
    `upi:pay?pa=${marker}`,
    `bitcoin:${marker}`,
    `BEGIN:VCARD\nFN:${marker}\nEND:VCARD`,
    `mailto:${marker}@x.example`,
    `tel:${marker}`,
    `plain text ${marker}`,
    `ftp://host.example/${marker}`,
    `javascript:alert('${marker}')`,
  );
}

function makeDeps(s: Scenario, counters: { zeroWrites: number }): IngestDeps {
  return {
    prepare: {
      async decode() {
        if (s.prepare === "decode-throws") throw new Error("decode");
        return { width: 64, height: 32, source: {}, close() {} };
      },
      createCanvas(width, height) {
        if (s.prepare === "canvas-null") return null;
        let w = width;
        const canvas: CanvasLike = {
          get width() {
            return w;
          },
          set width(v: number) {
            if (v === 0) counters.zeroWrites += 1;
            w = v;
          },
          height,
          getContext() {
            if (s.prepare === "no-context") return null;
            return {
              drawImage() {},
              getImageData: (_x, _y, sw, sh) => ({
                data: new Uint8ClampedArray(sw * sh * 4),
                width: s.prepare === "bad-size" ? sw + 1 : sw,
                height: sh,
              }),
            };
          },
        };
        return canvas;
      },
    },
    qr: {
      async loadReader() {
        if (s.qr === "loader-throws") throw new Error("load");
        return {
          async read() {
            if (s.qr === "read-throws") throw new Error("read");
            if (s.qr === "garbage") return [null, 5, { text: 7 }, { isValid: false, text: "x" }] as never;
            return s.payloads.map((text) => ({ text, isValid: true }));
          },
        };
      },
    },
    ocr: {
      assetBaseUrl: "http://localhost",
      async loadEngine() {
        if (s.ocr === "engine-throws") throw new Error("engine");
        return {
          async createWorker() {
            if (s.ocr === "create-throws") throw new Error("create");
            return {
              recognize: async () => {
                if (s.ocr === "recognize-throws") throw new Error("recognize");
                if (s.ocr === "bad-output") return { data: { text: 5 } };
                return { data: { text: s.ocrText, confidence: s.confidence } };
              },
              terminate: () => {
                if (s.ocr === "terminate-throws") throw new Error("terminate");
              },
            };
          },
        };
      },
    },
  };
}

const scenarioArb = (marker: string): fc.Arbitrary<Scenario> =>
  fc.record({
    prepare: fc.constantFrom<PrepareMode>("ok", "ok", "ok", "decode-throws", "canvas-null", "no-context", "bad-size"),
    qr: fc.constantFrom<QrMode>("ok", "ok", "loader-throws", "read-throws", "garbage"),
    ocr: fc.constantFrom<OcrMode>(
      "ok",
      "ok",
      "engine-throws",
      "create-throws",
      "recognize-throws",
      "bad-output",
      "terminate-throws",
    ),
    payloads: fc.array(nonUrlPayload(marker), { maxLength: 3 }),
    ocrText: lowerText,
    confidence: fc.oneof(fc.double({ min: 0, max: 100, noNaN: true }), fc.constant(Number.NaN)),
    skip: fc.boolean(),
  });

describe("ingest-image properties", () => {
  /**
   * Feature: client-ingest, Property 57: ingestImage total, disposes once, no payload leak
   * **Validates: Requirements REQ-CI-38, REQ-CI-39, REQ-CI-40, REQ-CI-41, REQ-CI-42, REQ-CI-43**
   */
  it("PBT-57: never rejects, disposes once when prepared, never leaks non-url payloads", async () => {
    await fc.assert(
      fc.asyncProperty(
        markerArb.chain((marker) => scenarioArb(marker).map((s) => ({ marker, s }))),
        async ({ marker, s }) => {
          const counters = { zeroWrites: 0 };
          const result = await ingestImage({ type: "image/png", size: 1000 }, makeDeps(s, counters), {
            skipOcrWhenQrFound: s.skip,
          });

          // Total: always a well-formed result.
          expect(Array.isArray(result.qrResults)).toBe(true);
          expect(Array.isArray(result.notices)).toBe(true);

          // Dispose exactly once when preparation succeeded, never otherwise.
          // (On preparation failure prepareImage itself zeroes a created canvas at most once.)
          if (s.prepare === "ok") expect(counters.zeroWrites).toBe(1);
          else expect(counters.zeroWrites).toBeLessThanOrEqual(1);

          // No non-url payload content anywhere in the result.
          expect(JSON.stringify(result)).not.toContain(marker);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
