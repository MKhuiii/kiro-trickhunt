import { describe, expect, it } from "vitest";
import { classifyQrPayload } from "./qr-payload";
import { MAX_URL_CHARS } from "./ingest.config";

describe("classifyQrPayload", () => {
  it("returns url for a valid https link (REQ-CI-08)", () => {
    const r = classifyQrPayload("https://a.example/x");
    expect(r).toEqual({ kind: "url", url: "https://a.example/x" });
    expect(Object.keys(r).sort()).toEqual(["kind", "url"]);
  });

  it("trims the payload before returning the url", () => {
    expect(classifyQrPayload("  https://a.example/x \n")).toEqual({
      kind: "url",
      url: "https://a.example/x",
    });
  });

  it("returns other for http:// with no host (REQ-CI-09)", () => {
    expect(classifyQrPayload("http://")).toEqual({ kind: "other" });
  });

  it("returns other for javascript: and ftp: schemes", () => {
    expect(classifyQrPayload("javascript:alert(1)")).toEqual({ kind: "other" });
    expect(classifyQrPayload("ftp://h/x")).toEqual({ kind: "other" });
  });

  it("returns other for a URL containing a space", () => {
    expect(classifyQrPayload("https://a.example/x y")).toEqual({ kind: "other" });
  });

  it("returns other for a URL over MAX_URL_CHARS", () => {
    const long = "https://a.example/" + "a".repeat(MAX_URL_CHARS);
    expect(classifyQrPayload(long)).toEqual({ kind: "other" });
  });

  it("accepts a URL of exactly MAX_URL_CHARS", () => {
    const prefix = "https://a.example/";
    const exact = prefix + "a".repeat(MAX_URL_CHARS - prefix.length);
    expect(classifyQrPayload(exact)).toEqual({ kind: "url", url: exact });
  });

  it("returns wifi without leaking content, in two cases (REQ-CI-07, REQ-CI-10)", () => {
    for (const p of ["WIFI:T:WPA;S:n;P:p;;", "wifi:T:WPA;S:n;P:p;;"]) {
      const r = classifyQrPayload(p);
      expect(r).toEqual({ kind: "wifi" });
      expect(JSON.stringify(r)).not.toContain("WPA");
    }
  });

  it("returns payment for the EMVCo prefix", () => {
    expect(classifyQrPayload("00020101021226...")).toEqual({ kind: "payment" });
  });

  it("returns contact for vcard, mailto, tel and sms", () => {
    for (const p of [
      "BEGIN:VCARD\nFN:X",
      "mailto:a@b.example",
      "tel:+123456",
      "sms:+123456",
    ]) {
      expect(classifyQrPayload(p)).toEqual({ kind: "contact" });
    }
  });

  it("returns text for plain words", () => {
    expect(classifyQrPayload("hello world")).toEqual({ kind: "text" });
  });

  it("returns other for empty, blank and non-string input (REQ-CI-06)", () => {
    expect(classifyQrPayload("")).toEqual({ kind: "other" });
    expect(classifyQrPayload("   \n\t")).toEqual({ kind: "other" });
    for (const v of [undefined, null, 42, {}, []]) {
      expect(classifyQrPayload(v as unknown as string)).toEqual({ kind: "other" });
    }
  });

  it("returns frozen objects (REQ-CI-10)", () => {
    expect(Object.isFrozen(classifyQrPayload("https://a.example/x"))).toBe(true);
    expect(Object.isFrozen(classifyQrPayload("hello"))).toBe(true);
    expect(Object.isFrozen(classifyQrPayload(""))).toBe(true);
  });
});
