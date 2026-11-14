import { describe, expect, it } from "vitest";
import {
  DEFAULT_RETRY_AFTER_SEC,
  MAX_IMAGE_BYTES,
  MAX_RETRY_AFTER_SEC,
} from "../../client/ingest/ingest.config";
import { en } from "./en";
import { vi } from "./vi";
import { analyzeErrorMessage, ingestErrorMessage, noticeMessage } from "./messages";

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
] as const;

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
] as const;

const NOTICE_KINDS = [
  "ocr-skipped",
  "ocr-too-poor",
  "ocr-failed",
  "payment-qr",
  "wifi-qr",
  "no-url",
  "text-truncated",
  "urls-skipped",
] as const;

const BAD_INPUTS: unknown[] = [
  "nope",
  "",
  "constructor",
  "__proto__",
  "toString",
  "hasOwnProperty",
  null,
  undefined,
  42,
  {},
  { code: "timeout" },
  [],
];

function inBoth(key: string): boolean {
  return Object.hasOwn(en, key) && Object.hasOwn(vi, key);
}

describe("code lists", () => {
  it("have the expected sizes", () => {
    expect(ANALYZE_CODES).toHaveLength(9);
    expect(INGEST_CODES).toHaveLength(13);
    expect(NOTICE_KINDS).toHaveLength(8);
  });
});

describe("analyzeErrorMessage", () => {
  it.each(ANALYZE_CODES)("maps %s to a key in en and vi", (code) => {
    const ref = analyzeErrorMessage(code);
    expect(ref.key).toBe(`error.analyze.${code}`);
    expect(inBoth(ref.key)).toBe(true);
    expect(ref.technicalCode).toBe(code);
  });

  it("rate-limited carries seconds 42", () => {
    expect(analyzeErrorMessage("rate-limited", 42).params).toEqual({ seconds: 42 });
  });

  it("rate-limited defaults to 30 when absent", () => {
    expect(DEFAULT_RETRY_AFTER_SEC).toBe(30);
    expect(analyzeErrorMessage("rate-limited").params).toEqual({ seconds: 30 });
    expect(analyzeErrorMessage("rate-limited", undefined).params).toEqual({ seconds: 30 });
  });

  it("rate-limited clamps and rounds up", () => {
    expect(analyzeErrorMessage("rate-limited", 0).params.seconds).toBe(1);
    expect(analyzeErrorMessage("rate-limited", -5).params.seconds).toBe(1);
    expect(analyzeErrorMessage("rate-limited", 99999).params.seconds).toBe(MAX_RETRY_AFTER_SEC);
    expect(analyzeErrorMessage("rate-limited", Number.NaN).params.seconds).toBe(30);
    expect(analyzeErrorMessage("rate-limited", Infinity).params.seconds).toBe(30);
    expect(analyzeErrorMessage("rate-limited", "42").params.seconds).toBe(30);
    expect(analyzeErrorMessage("rate-limited", 41.2).params.seconds).toBe(42);
  });

  it("other codes have no params", () => {
    expect(analyzeErrorMessage("timeout", 42).params).toEqual({});
  });

  it.each(BAD_INPUTS.map((v) => [v]))("maps %o to generic", (bad) => {
    const ref = analyzeErrorMessage(bad);
    expect(ref).toEqual({ key: "error.generic", params: {}, technicalCode: "unknown" });
  });
});

describe("ingestErrorMessage", () => {
  it.each(INGEST_CODES)("maps %s to a key in en and vi", (code) => {
    const ref = ingestErrorMessage(code);
    expect(ref.key).toBe(`error.ingest.${code}`);
    expect(inBoth(ref.key)).toBe(true);
    expect(ref.technicalCode).toBe(code);
  });

  it("file-too-large has maxMb", () => {
    expect(ingestErrorMessage("file-too-large").params).toEqual({
      maxMb: MAX_IMAGE_BYTES / (1024 * 1024),
    });
  });

  it("other codes have no params", () => {
    expect(ingestErrorMessage("decode-failed").params).toEqual({});
  });

  it.each(BAD_INPUTS.map((v) => [v]))("maps %o to generic", (bad) => {
    expect(ingestErrorMessage(bad)).toEqual({
      key: "error.generic",
      params: {},
      technicalCode: "unknown",
    });
  });
});

describe("noticeMessage", () => {
  it.each(NOTICE_KINDS)("maps %s to a key in en and vi", (kind) => {
    const ref = noticeMessage(kind);
    expect(ref.key).toBe(`notice.${kind}`);
    expect(inBoth(ref.key)).toBe(true);
    expect(ref.technicalCode).toBe(kind);
  });

  it("urls-skipped carries count", () => {
    expect(noticeMessage("urls-skipped", { count: 7 }).params).toEqual({ count: 7 });
    expect(noticeMessage("urls-skipped").params).toEqual({ count: 0 });
    expect(noticeMessage("urls-skipped", { count: Number.NaN }).params).toEqual({ count: 0 });
  });

  it("other kinds have no params", () => {
    expect(noticeMessage("no-url", { count: 3 }).params).toEqual({});
  });

  it.each(BAD_INPUTS.map((v) => [v]))("maps %o to generic notice", (bad) => {
    const ref = noticeMessage(bad);
    expect(ref).toEqual({ key: "notice.generic", params: {}, technicalCode: "unknown" });
    expect(inBoth(ref.key)).toBe(true);
  });
});
