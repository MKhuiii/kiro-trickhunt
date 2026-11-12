import { describe, expect, it } from "vitest";
import { decodeQr, type QrReader } from "./decode-qr";
import { QR_MAX_PAYLOAD_CHARS, QR_MAX_RESULTS } from "./ingest.config";
import type { ImageDataLike } from "./types";

const image: ImageDataLike = {
  data: new Uint8ClampedArray(4),
  width: 1,
  height: 1,
};

function depsFor(reader: QrReader) {
  return { loadReader: async () => reader };
}

function readerReturning(output: unknown): QrReader {
  return { read: async () => output };
}

describe("decodeQr", () => {
  it("returns the payload of a valid item", async () => {
    const result = await decodeQr(
      image,
      depsFor(readerReturning([{ isValid: true, text: "https://a.example" }])),
    );
    expect(result.payloads).toEqual(["https://a.example"]);
    expect(result.errorCode).toBeUndefined();
  });

  it("maps a throwing loader to qr-engine-unavailable", async () => {
    const result = await decodeQr(image, {
      loadReader: async () => {
        throw new Error("no wasm");
      },
    });
    expect(result.payloads).toEqual([]);
    expect(result.errorCode).toBe("qr-engine-unavailable");
  });

  it("maps a loader that returns a non-reader to qr-engine-unavailable", async () => {
    const result = await decodeQr(image, {
      loadReader: async () => ({}) as unknown as QrReader,
    });
    expect(result.errorCode).toBe("qr-engine-unavailable");
  });

  it("maps a rejecting reader to qr-decode-failed", async () => {
    const result = await decodeQr(
      image,
      depsFor({ read: () => Promise.reject(new Error("boom")) }),
    );
    expect(result.payloads).toEqual([]);
    expect(result.errorCode).toBe("qr-decode-failed");
  });

  it("maps a synchronously throwing reader to qr-decode-failed", async () => {
    const result = await decodeQr(
      image,
      depsFor({
        read: () => {
          throw new Error("sync");
        },
      }),
    );
    expect(result.errorCode).toBe("qr-decode-failed");
  });

  it("maps a hanging reader to qr-decode-failed after the timeout", async () => {
    const result = await decodeQr(
      image,
      depsFor({ read: () => new Promise<unknown>(() => {}) }),
      { timeoutMs: 20 },
    );
    expect(result.payloads).toEqual([]);
    expect(result.errorCode).toBe("qr-decode-failed");
  });

  it("returns no payloads and no error for non-array output", async () => {
    for (const output of [undefined, null, "x", 5, { text: "a" }]) {
      const result = await decodeQr(image, depsFor(readerReturning(output)));
      expect(result.payloads).toEqual([]);
      expect(result.errorCode).toBeUndefined();
    }
  });

  it("ignores invalid, empty, over-long and wrongly typed items", async () => {
    const output = [
      { isValid: false, text: "invalid" },
      { isValid: true, text: "" },
      { isValid: true, text: "x".repeat(QR_MAX_PAYLOAD_CHARS + 1) },
      { isValid: true, text: 42 },
      { isValid: true },
      null,
      undefined,
      "string",
      7,
      { isValid: true, text: "good" },
    ];
    const result = await decodeQr(image, depsFor(readerReturning(output)));
    expect(result.payloads).toEqual(["good"]);
  });

  it("accepts a payload of exactly the maximum length", async () => {
    const text = "y".repeat(QR_MAX_PAYLOAD_CHARS);
    const result = await decodeQr(image, depsFor(readerReturning([{ text }])));
    expect(result.payloads).toEqual([text]);
  });

  it("returns only the first valid items up to QR_MAX_RESULTS", async () => {
    const output = [
      { isValid: false, text: "skip" },
      { isValid: true, text: "first" },
      { isValid: true, text: "second" },
      { isValid: true, text: "third" },
    ];
    const result = await decodeQr(image, depsFor(readerReturning(output)));
    expect(result.payloads).toEqual(["first", "second", "third"].slice(0, QR_MAX_RESULTS));
    expect(result.payloads.length).toBeLessThanOrEqual(QR_MAX_RESULTS);
  });
});
