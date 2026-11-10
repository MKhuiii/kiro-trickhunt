import { describe, expect, it } from "vitest";

import { prepareInput } from "./input";
import { MAX_TEXT_CHARS, MAX_URLS, MAX_URL_CHARS } from "./pipeline.config";

describe("prepareInput", () => {
  describe("truncation flag", () => {
    it("is false at exactly MAX_TEXT_CHARS", () => {
      const r = prepareInput({ text: "a".repeat(MAX_TEXT_CHARS) });
      expect(r.inputTruncated).toBe(false);
      expect(r.text.length).toBe(MAX_TEXT_CHARS);
    });

    it("is true and cuts text when over MAX_TEXT_CHARS", () => {
      const r = prepareInput({ text: "a".repeat(MAX_TEXT_CHARS + 1) });
      expect(r.inputTruncated).toBe(true);
      expect(r.text.length).toBe(MAX_TEXT_CHARS);
    });

    it("is false for short text", () => {
      expect(prepareInput({ text: "hello" }).inputTruncated).toBe(false);
    });
  });

  describe("URL order and de-duplication", () => {
    it("puts provided URLs before extracted ones", () => {
      const r = prepareInput({
        text: "visit https://extracted.example.com now",
        urls: ["https://provided.example.com"],
      });
      expect(r.urls[0]).toBe("https://provided.example.com");
      expect(r.urls.some((u) => u.includes("extracted.example.com"))).toBe(true);
      expect(r.urls.indexOf("https://provided.example.com")).toBeLessThan(
        r.urls.findIndex((u) => u.includes("extracted.example.com")),
      );
    });

    it("collapses normalized duplicates, first original winning", () => {
      const r = prepareInput({
        urls: ["HTTPS://Example.COM:443/", "https://example.com"],
      });
      expect(r.urls).toEqual(["HTTPS://Example.COM:443/"]);
      expect(r.urlsSkipped).toBe(0);
    });

    it("collapses a provided URL repeated in text, keeping the provided one", () => {
      const r = prepareInput({
        text: "go to https://example.com",
        urls: ["https://EXAMPLE.com"],
      });
      expect(r.urls).toEqual(["https://EXAMPLE.com"]);
    });

    it("preserves input order of distinct URLs", () => {
      const r = prepareInput({
        urls: ["https://c.example", "https://a.example", "https://b.example"],
      });
      expect(r.urls).toEqual([
        "https://c.example",
        "https://a.example",
        "https://b.example",
      ]);
    });
  });

  describe("cap and urlsSkipped", () => {
    it("keeps MAX_URLS and counts the rest as skipped", () => {
      const urls = Array.from(
        { length: MAX_URLS + 3 },
        (_, i) => `https://site${i}.example.com`,
      );
      const r = prepareInput({ urls });
      expect(r.urls).toEqual(urls.slice(0, MAX_URLS));
      expect(r.urlsSkipped).toBe(3);
    });

    it("does not count duplicates as skipped", () => {
      const urls = Array.from(
        { length: MAX_URLS },
        (_, i) => `https://site${i}.example.com`,
      );
      const r = prepareInput({ urls: [...urls, ...urls] });
      expect(r.urls.length).toBe(MAX_URLS);
      expect(r.urlsSkipped).toBe(0);
    });

    it("skips an over-long URL and counts it", () => {
      const long = "https://example.com/" + "a".repeat(MAX_URL_CHARS);
      const r = prepareInput({ urls: [long, "https://ok.example.com"] });
      expect(r.urls).toEqual(["https://ok.example.com"]);
      expect(r.urlsSkipped).toBe(1);
    });

    it("does not consume a slot with an over-long URL", () => {
      const long = "https://example.com/" + "a".repeat(MAX_URL_CHARS);
      const ok = Array.from(
        { length: MAX_URLS },
        (_, i) => `https://site${i}.example.com`,
      );
      const r = prepareInput({ urls: [long, ...ok] });
      expect(r.urls).toEqual(ok);
      expect(r.urlsSkipped).toBe(1);
    });
  });

  describe("blank input and empty flag", () => {
    it("is empty for blank text and no URLs", () => {
      const r = prepareInput({ text: "   \n\t " });
      expect(r.empty).toBe(true);
      expect(r.urls).toEqual([]);
      expect(r.urlsSkipped).toBe(0);
      expect(r.inputTruncated).toBe(false);
    });

    it("is empty for an empty object", () => {
      expect(prepareInput({}).empty).toBe(true);
    });

    it("is not empty when text is non-blank", () => {
      expect(prepareInput({ text: "hi" }).empty).toBe(false);
    });

    it("is not empty when blank text has a URL candidate", () => {
      const r = prepareInput({ text: " ", urls: ["https://example.com"] });
      expect(r.empty).toBe(false);
    });

    it("is not empty when the only URL candidate was skipped", () => {
      const long = "https://example.com/" + "a".repeat(MAX_URL_CHARS);
      const r = prepareInput({ urls: [long] });
      expect(r.urls).toEqual([]);
      expect(r.urlsSkipped).toBe(1);
      expect(r.empty).toBe(false);
    });
  });

  describe("non-string and malformed values", () => {
    it("ignores non-string and blank entries in urls", () => {
      const r = prepareInput({
        urls: [42, null, undefined, {}, [], "", "   ", "https://ok.example.com"],
      });
      expect(r.urls).toEqual(["https://ok.example.com"]);
      expect(r.urlsSkipped).toBe(0);
    });

    it("treats non-array urls as no URLs", () => {
      const r = prepareInput({ text: "x", urls: "https://example.com" });
      expect(r.urls).toEqual([]);
    });

    it.each([null, undefined, 42, "text", true, [], Symbol("s")])(
      "returns an empty result for non-object input %s",
      (value) => {
        const r = prepareInput(value);
        expect(r.empty).toBe(true);
        expect(r.text).toBe("");
        expect(r.urls).toEqual([]);
        expect(r.urlsSkipped).toBe(0);
        expect(r.inputTruncated).toBe(false);
      },
    );

    it.each([42, null, undefined, {}, ["a"], true])(
      "treats non-string text %j as empty text",
      (text) => {
        const r = prepareInput({ text });
        expect(r.text).toBe("");
        expect(r.inputTruncated).toBe(false);
        expect(r.empty).toBe(true);
      },
    );

    it("never throws on hostile getters", () => {
      const hostile = {
        get text(): string {
          throw new Error("boom");
        },
        get urls(): string[] {
          throw new Error("boom");
        },
      };
      expect(() => prepareInput(hostile)).not.toThrow();
      expect(prepareInput(hostile).empty).toBe(true);
    });
  });
});
