import { describe, expect, it } from "vitest";
import { buildNotices } from "./notices";

describe("buildNotices", () => {
  it("returns nothing for an empty verdict and no extras", () => {
    expect(buildNotices({ inputTruncated: false, urlsSkipped: 0 })).toEqual([]);
    expect(buildNotices(null, null)).toEqual([]);
  });

  it("hides ocr-too-poor when QR results exist and there is no text", () => {
    const out = buildNotices(
      { inputTruncated: false, urlsSkipped: 0 },
      { ingestNotices: [{ kind: "ocr-too-poor" }], qrResults: [{ kind: "url" }] },
    );
    expect(out).toEqual([]);
  });

  it("hides ocr-too-poor when the user typed text", () => {
    const out = buildNotices(
      {},
      { ingestNotices: [{ kind: "ocr-too-poor" }], userText: "hello" },
    );
    expect(out).toEqual([]);
  });

  it("shows ocr-too-poor with no QR and no user text", () => {
    const out = buildNotices(
      {},
      { ingestNotices: [{ kind: "ocr-too-poor" }], qrResults: [], userText: "   " },
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      kind: "ocr-too-poor",
      key: "notice.ocr-too-poor",
      tone: "warning",
    });
  });

  it("orders ingest, build, then verdict-derived notices", () => {
    const out = buildNotices(
      { inputTruncated: true, urlsSkipped: 3 },
      {
        ingestNotices: [{ kind: "ocr-skipped" }],
        buildNotices: [{ kind: "no-url" }],
      },
    );
    expect(out.map((n) => n.kind)).toEqual([
      "ocr-skipped",
      "no-url",
      "text-truncated",
      "urls-skipped",
    ]);
  });

  it("derives text-truncated and urls-skipped from the verdict", () => {
    const out = buildNotices({ inputTruncated: true, urlsSkipped: 5 });
    expect(out).toEqual([
      { kind: "text-truncated", key: "notice.text-truncated", params: {}, tone: "warning" },
      { kind: "urls-skipped", key: "notice.urls-skipped", params: { count: 5 }, tone: "warning" },
    ]);
  });

  it("does not derive urls-skipped for zero or non-finite counts", () => {
    expect(buildNotices({ urlsSkipped: 0 })).toEqual([]);
    expect(buildNotices({ urlsSkipped: Number.NaN })).toEqual([]);
  });

  it("de-duplicates by kind, keeping the first", () => {
    const out = buildNotices(
      { inputTruncated: true },
      {
        ingestNotices: [{ kind: "payment-qr" }, { kind: "payment-qr" }, { kind: "text-truncated" }],
        buildNotices: [{ kind: "payment-qr" }],
      },
    );
    expect(out.map((n) => n.kind)).toEqual(["payment-qr", "text-truncated"]);
  });

  it("maps unknown kinds to notice.generic with info tone", () => {
    const out = buildNotices({}, { ingestNotices: [{ kind: "mystery" }, { kind: "" }] });
    expect(out.map((n) => n.key)).toEqual(["notice.generic", "notice.generic"]);
    expect(out.every((n) => n.tone === "info")).toBe(true);
    expect(out.map((n) => n.kind)).toEqual(["mystery", ""]);
  });

  it("uses info tone for informational kinds", () => {
    const out = buildNotices({}, { ingestNotices: [{ kind: "wifi-qr" }, { kind: "no-url" }] });
    expect(out.map((n) => n.tone)).toEqual(["info", "info"]);
  });

  it("tolerates malformed notice lists", () => {
    const out = buildNotices(
      {},
      { ingestNotices: [null, 3, { kind: 7 }] as unknown as { kind: string }[] },
    );
    expect(out.every((n) => n.key === "notice.generic")).toBe(true);
  });
});
