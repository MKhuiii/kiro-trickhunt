import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { decodeQr, type QrReader } from "./decode-qr";
import { QR_MAX_PAYLOAD_CHARS, QR_MAX_RESULTS } from "./ingest.config";
import type { ImageDataLike } from "./types";

const image: ImageDataLike = {
  data: new Uint8ClampedArray(4),
  width: 1,
  height: 1,
};

const itemArb = fc.oneof(
  fc.anything(),
  fc.record({
    isValid: fc.oneof(fc.boolean(), fc.anything()),
    text: fc.oneof(
      fc.string(),
      fc.string({ minLength: QR_MAX_PAYLOAD_CHARS, maxLength: QR_MAX_PAYLOAD_CHARS + 3 }),
      fc.anything(),
    ),
  }),
);

type Behaviour =
  | { kind: "throw" }
  | { kind: "reject" }
  | { kind: "hang" }
  | { kind: "value"; value: unknown };

const behaviourArb: fc.Arbitrary<Behaviour> = fc.oneof(
  fc.constant<Behaviour>({ kind: "throw" }),
  fc.constant<Behaviour>({ kind: "reject" }),
  fc.constant<Behaviour>({ kind: "hang" }),
  fc.anything().map<Behaviour>((value) => ({ kind: "value", value })),
  fc.array(itemArb, { maxLength: 8 }).map<Behaviour>((value) => ({ kind: "value", value })),
);

function readerFor(b: Behaviour): QrReader {
  return {
    read() {
      switch (b.kind) {
        case "throw":
          throw new Error("sync");
        case "reject":
          return Promise.reject(new Error("async"));
        case "hang":
          return new Promise<unknown>(() => {});
        case "value":
          return Promise.resolve(b.value);
      }
    },
  };
}

describe("decodeQr properties", () => {
  /**
   * PBT-54: decodeQr never rejects and bounds its output.
   * **Validates: Requirements REQ-CI-27, REQ-CI-28, REQ-CI-29**
   */
  it("PBT-54: never rejects; payloads are non-empty strings within limits", async () => {
    await fc.assert(
      fc.asyncProperty(behaviourArb, async (behaviour) => {
        const result = await decodeQr(
          image,
          { loadReader: async () => readerFor(behaviour) },
          { timeoutMs: 1 },
        );
        expect(result.payloads.length).toBeLessThanOrEqual(QR_MAX_RESULTS);
        for (const p of result.payloads) {
          expect(typeof p).toBe("string");
          expect(p.length).toBeGreaterThan(0);
          expect(p.length).toBeLessThanOrEqual(QR_MAX_PAYLOAD_CHARS);
        }
        if (result.errorCode !== undefined) {
          expect(result.payloads).toEqual([]);
        }
      }),
      { numRuns: 100 },
    );
  });
});
