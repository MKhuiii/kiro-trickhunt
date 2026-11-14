import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MAX_RETRY_AFTER_SEC } from "../../client/ingest/ingest.config";
import { en } from "./en";
import { vi } from "./vi";
import { analyzeErrorMessage, ingestErrorMessage, noticeMessage } from "./messages";
import type { MessageRef } from "./messages";

const ANALYZE_CODES = [
  "invalid-input",
  "payload-too-large",
  "invalid-content-type",
  "rate-limited",
  "internal-error",
  "network-error",
  "timeout",
  "bad-response",
  "unexpected-status",
];
const INGEST_CODES = [
  "unsupported-type",
  "invalid-size",
  "file-too-large",
  "decode-failed",
  "too-many-pixels",
  "canvas-unavailable",
  "ocr-engine-unavailable",
  "ocr-timeout",
  "ocr-aborted",
  "ocr-failed",
  "qr-engine-unavailable",
  "qr-decode-failed",
  "unexpected",
];
const NOTICE_KINDS = [
  "ocr-skipped",
  "ocr-too-poor",
  "ocr-failed",
  "payment-qr",
  "wifi-qr",
  "no-url",
  "text-truncated",
  "urls-skipped",
];

const NUM_RUNS = 200;

const weirdStrings = fc.constantFrom("constructor", "__proto__", "toString");
const anyInput = fc.oneof(
  fc.anything(),
  fc.string(),
  weirdStrings,
  fc.double(),
  fc.constantFrom(...ANALYZE_CODES, ...INGEST_CODES, ...NOTICE_KINDS),
);

function check(ref: MessageRef, known: readonly string[]): void {
  expect(Object.hasOwn(en, ref.key)).toBe(true);
  expect(Object.hasOwn(vi, ref.key)).toBe(true);
  expect(ref.technicalCode === "unknown" || known.includes(ref.technicalCode)).toBe(true);
  for (const value of Object.values(ref.params)) {
    expect(["string", "number"]).toContain(typeof value);
  }
}

describe("messages mapping properties (PBT-69)", () => {
  it("analyzeErrorMessage always returns an existing key, safe code and valid params", () => {
    // **Validates: Requirements REQ-UI-09, REQ-UI-12, REQ-UI-13**
    fc.assert(
      fc.property(anyInput, anyInput, (code, retry) => {
        check(analyzeErrorMessage(code, retry), ANALYZE_CODES);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("ingestErrorMessage always returns an existing key, safe code and valid params", () => {
    // **Validates: Requirements REQ-UI-09, REQ-UI-12, REQ-UI-13**
    fc.assert(
      fc.property(anyInput, (code) => {
        check(ingestErrorMessage(code), INGEST_CODES);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("noticeMessage always returns an existing key, safe code and valid params", () => {
    // **Validates: Requirements REQ-UI-09, REQ-UI-12, REQ-UI-13**
    fc.assert(
      fc.property(anyInput, fc.option(fc.record({ count: anyInput }), { nil: undefined }), (kind, p) => {
        check(noticeMessage(kind, p as { count?: number } | undefined), NOTICE_KINDS);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("rate-limited seconds is an integer in 1..MAX_RETRY_AFTER_SEC for any retryAfterSec", () => {
    // **Validates: Requirements REQ-UI-09, REQ-UI-12, REQ-UI-13**
    fc.assert(
      fc.property(anyInput, (retry) => {
        const ref = analyzeErrorMessage("rate-limited", retry);
        const seconds = ref.params.seconds;
        expect(typeof seconds).toBe("number");
        expect(Number.isInteger(seconds)).toBe(true);
        expect(seconds as number).toBeGreaterThanOrEqual(1);
        expect(seconds as number).toBeLessThanOrEqual(MAX_RETRY_AFTER_SEC);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
