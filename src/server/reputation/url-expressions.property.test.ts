/**
 * url-expressions.property.test.ts — expression and prefix invariants.
 *
 * Feature: link-reputation-check, Property 2: expression and prefix invariants (supports PBT-117, PBT-120)
 *
 * **Validates: Requirements REQ-LREP-04, REQ-LREP-20**
 */

import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import {
  expressionsOf,
  prefixOf,
  sha256,
  toBase64Url,
  toLookupUrl,
} from "./url-expressions";

const NUM_RUNS = 100;

const USERINFO_MARK = "USERMARK7";
const FRAGMENT_MARK = "FRAGMARK7";

const lower = "abcdefghijklmnopqrstuvwxyz0123456789";
const labelArb = fc.string({ unit: fc.constantFrom(...lower), minLength: 1, maxLength: 8 });
const hostArb = fc
  .array(labelArb, { minLength: 1, maxLength: 7 })
  .map((labels) => `${labels.join(".")}.com`);
const segmentArb = fc.string({ unit: fc.constantFrom(..."abcdefghijklmnop"), minLength: 1, maxLength: 6 });
const pathArb = fc
  .array(segmentArb, { minLength: 0, maxLength: 8 })
  .chain((segments) =>
    fc.boolean().map((slash) => `/${segments.join("/")}${slash && segments.length > 0 ? "/" : ""}`),
  );
const queryArb = fc.option(
  fc.string({ unit: fc.constantFrom(..."abcdefghij=&"), minLength: 1, maxLength: 12 }),
  { nil: null },
);

const urlArb = fc
  .record({
    scheme: fc.constantFrom("http", "https"),
    withUserinfo: fc.boolean(),
    host: hostArb,
    port: fc.option(fc.integer({ min: 1, max: 65535 }), { nil: null }),
    path: pathArb,
    query: queryArb,
    withFragment: fc.boolean(),
  })
  .map((p) => {
    const userinfo = p.withUserinfo ? `${USERINFO_MARK}:${USERINFO_MARK}@` : "";
    const port = p.port === null ? "" : `:${p.port}`;
    const query = p.query === null ? "" : `?${p.query}`;
    const fragment = p.withFragment ? `#${FRAGMENT_MARK}` : "";
    return `${p.scheme}://${userinfo}${p.host}${port}${p.path}${query}${fragment}`;
  });

describe("Feature: link-reputation-check, Property 2: expression and prefix invariants", () => {
  it("expressions are deterministic, distinct, at most 30 and free of userinfo, port, fragment and scheme", () => {
    fc.assert(
      fc.property(urlArb, (input) => {
        const url = toLookupUrl(input);
        expect(url).not.toBeNull();
        if (url === null) return;
        const first = expressionsOf(url);
        const second = expressionsOf(toLookupUrl(input) ?? url);

        expect(second).toEqual(first);
        expect(first.length).toBeGreaterThan(0);
        expect(first.length).toBeLessThanOrEqual(30);
        expect(new Set(first).size).toBe(first.length);

        for (const expression of first) {
          expect(expression).not.toContain(USERINFO_MARK);
          expect(expression).not.toContain(FRAGMENT_MARK);
          expect(expression).not.toContain("@");
          expect(expression).not.toContain("#");
          expect(expression).not.toContain("://");
          expect(expression).not.toMatch(/^https?:/iu);
          const slash = expression.indexOf("/");
          expect(slash).toBeGreaterThan(0);
          // Host part: no port separator.
          expect(expression.slice(0, slash)).not.toContain(":");
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("prefixes are exactly 4 bytes, match the hash head and encode to 6 unpadded base64url characters", () => {
    fc.assert(
      fc.property(urlArb, (input) => {
        const url = toLookupUrl(input);
        if (url === null) return;
        for (const expression of expressionsOf(url)) {
          const hash = sha256(expression);
          expect(hash.length).toBe(32);
          const prefix = prefixOf(hash);
          expect(prefix.length).toBe(4);
          expect(Array.from(prefix)).toEqual(Array.from(hash.slice(0, 4)));
          const encoded = toBase64Url(prefix);
          expect(encoded).toMatch(/^[A-Za-z0-9_-]{6}$/u);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
