import { describe, expect, it } from "vitest";
import { buildAnalyzeRequest } from "./analyze-input";
import { MAX_TEXT_CHARS, MAX_URLS_IN } from "./ingest.config";

describe("buildAnalyzeRequest", () => {
  it("gives text and urls for screenshot text plus one URL", () => {
    const r = buildAnalyzeRequest({
      ocrText: "  Your account is locked  ",
      qrResults: [{ kind: "url", url: "https://login.example/verify" }],
    });
    expect(r.request).toEqual({
      text: "Your account is locked",
      urls: ["https://login.example/verify"],
    });
    expect(r.notices).toEqual([]);
  });

  it("joins user and OCR text with a blank line", () => {
    const r = buildAnalyzeRequest({ userText: "a", ocrText: "b", qrResults: [] });
    expect(r.request).toEqual({ text: "a\n\nb" });
  });

  it("Wi-Fi only gives null request with wifi-qr", () => {
    const r = buildAnalyzeRequest({ qrResults: [{ kind: "wifi" }] });
    expect(r.request).toBeNull();
    expect(r.notices).toEqual([{ kind: "wifi-qr" }]);
  });

  it("payment gives payment-qr", () => {
    const r = buildAnalyzeRequest({ qrResults: [{ kind: "payment" }] });
    expect(r.request).toBeNull();
    expect(r.notices).toEqual([{ kind: "payment-qr" }]);
  });

  it("contact only gives no-url", () => {
    const r = buildAnalyzeRequest({ qrResults: [{ kind: "contact" }] });
    expect(r.request).toBeNull();
    expect(r.notices).toEqual([{ kind: "no-url" }]);
  });

  it("orders notices payment, wifi, no-url, truncated", () => {
    const r = buildAnalyzeRequest({
      userText: "x".repeat(MAX_TEXT_CHARS + 5),
      qrResults: [{ kind: "other" }, { kind: "wifi" }, { kind: "payment" }],
    });
    expect(r.notices.map((n) => n.kind)).toEqual(["payment-qr", "wifi-qr", "no-url", "text-truncated"]);
  });

  it("truncates text over the limit and adds text-truncated", () => {
    const r = buildAnalyzeRequest({ userText: "x".repeat(MAX_TEXT_CHARS + 100), qrResults: [] });
    expect(r.request?.text).toHaveLength(MAX_TEXT_CHARS);
    expect(r.notices).toEqual([{ kind: "text-truncated" }]);
  });

  it("leaves no lone surrogate when an emoji sits at the cut point", () => {
    const r = buildAnalyzeRequest({ userText: "x".repeat(MAX_TEXT_CHARS - 1) + "😀" + "tail", qrResults: [] });
    const text = r.request?.text ?? "";
    expect(text.length).toBeLessThanOrEqual(MAX_TEXT_CHARS);
    const last = text.charCodeAt(text.length - 1);
    expect(last >= 0xd800 && last <= 0xdbff).toBe(false);
    expect(text).toBe("x".repeat(MAX_TEXT_CHARS - 1));
  });

  it("collapses duplicate URLs", () => {
    const u = { kind: "url", url: "https://a.example/" };
    const r = buildAnalyzeRequest({ qrResults: [u, { ...u }] });
    expect(r.request?.urls).toEqual(["https://a.example/"]);
  });

  it("keeps 10 of 11 distinct URLs in order", () => {
    const qrResults = Array.from({ length: MAX_URLS_IN + 1 }, (_, i) => ({
      kind: "url",
      url: `https://h${i}.example/`,
    }));
    const r = buildAnalyzeRequest({ qrResults });
    expect(r.request?.urls).toHaveLength(MAX_URLS_IN);
    expect(r.request?.urls?.[0]).toBe("https://h0.example/");
    expect(r.request?.urls?.[MAX_URLS_IN - 1]).toBe(`https://h${MAX_URLS_IN - 1}.example/`);
  });

  it("ignores malformed entries and non-http urls, and never throws", () => {
    const r = buildAnalyzeRequest({
      qrResults: [null, 5, "x", { kind: "url", url: "javascript:alert(1)" }, { kind: "bogus" }, { kind: "url" }],
    });
    expect(r.request).toBeNull();
    expect(() => buildAnalyzeRequest(undefined)).not.toThrow();
    expect(buildAnalyzeRequest(null)).toEqual({ request: null, notices: [] });
  });
});
