import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { classifyQrPayload } from "./qr-payload";
import { MAX_URL_CHARS } from "./ingest.config";

const KINDS = ["url", "payment", "wifi", "contact", "text", "other"];

const payloadArb = fc.oneof(
  fc.string(),
  fc.anything().map((v) => v as unknown as string),
  fc
    .string({ maxLength: MAX_URL_CHARS + 50 })
    .map((s) => "https://a.example/" + s.replace(/\s/g, "a")),
  fc.string({ minLength: 2100, maxLength: 2300 }).map((s) => "http://h.example/" + s),
  fc
    .tuple(
      fc.constantFrom("WIFI:", "wifi:", "000201", "mailto:", "tel:", "sms:", "BEGIN:VCARD", "http://", "https://", "ftp://", "javascript:"),
      fc.string(),
    )
    .map(([p, s]) => p + s),
);

describe("classifyQrPayload properties", () => {
  /**
   * PBT-47: classification is total and closed.
   * **Validates: Requirements REQ-CI-06, REQ-CI-07, REQ-CI-08, REQ-CI-09, REQ-CI-10**
   */
  it("PBT-47: never throws, kind is closed, keys are only kind/url, url only for valid http(s)", () => {
    fc.assert(
      fc.property(payloadArb, (payload) => {
        const r = classifyQrPayload(payload);
        expect(KINDS).toContain(r.kind);
        const keys = Object.keys(r);
        if (r.kind === "url") {
          expect(keys.sort()).toEqual(["kind", "url"]);
          expect(typeof r.url).toBe("string");
          const url = r.url as string;
          expect(url.length).toBeLessThanOrEqual(MAX_URL_CHARS);
          const parsed = new URL(url);
          expect(["http:", "https:"]).toContain(parsed.protocol);
          expect(parsed.hostname.length).toBeGreaterThan(0);
        } else {
          expect(keys).toEqual(["kind"]);
          expect("url" in r).toBe(false);
        }
        expect(Object.isFrozen(r)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});
