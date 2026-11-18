/**
 * reputation-checker.privacy.property.test.ts — privacy of the outbound request.
 *
 * Feature: link-reputation-check, Property 117: privacy of the outbound request (PBT-117)
 *
 * **Validates: Requirements REQ-LREP-04, REQ-LREP-05, REQ-LREP-20**
 */

import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { fakeFetchCapturing } from "./fake-reputation-provider";
import { createReputationChecker } from "./reputation-checker";
import { createSafeBrowsingProvider } from "./safe-browsing-provider";
import {
  expressionsOf,
  prefixOf,
  sha256,
  toBase64Url,
  toLookupUrl,
} from "./url-expressions";

const NUM_RUNS = 100;
const API_KEY = "apikeymark9";

const MARKERS = {
  userinfo: "usermark7",
  host: "hostmark7",
  path: "pathmark7",
  query: "querymark7",
  fragment: "fragmark7",
  text: "textmark7",
} as const;

const segmentArb = fc.string({
  unit: fc.constantFrom(..."abcdefghijklmnop"),
  minLength: 0,
  maxLength: 6,
});

const urlArb = fc
  .record({
    scheme: fc.constantFrom("http", "https"),
    withUserinfo: fc.boolean(),
    withHostMarker: fc.boolean(),
    sub: fc.array(
      fc.string({ unit: fc.constantFrom(..."abcdefghij"), minLength: 1, maxLength: 5 }),
      { minLength: 0, maxLength: 3 },
    ),
    port: fc.option(fc.integer({ min: 1, max: 65535 }), { nil: null }),
    pathSegments: fc.array(segmentArb, { minLength: 0, maxLength: 4 }),
    withPathMarker: fc.boolean(),
    withQuery: fc.boolean(),
    withFragment: fc.boolean(),
  })
  .map((p) => {
    const userinfo = p.withUserinfo ? `${MARKERS.userinfo}:${MARKERS.userinfo}@` : "";
    const labels = [...p.sub, ...(p.withHostMarker ? [MARKERS.host] : []), "example"];
    const host = `${labels.join(".")}.com`;
    const port = p.port === null ? "" : `:${p.port}`;
    const segments = p.withPathMarker ? [...p.pathSegments, MARKERS.path] : p.pathSegments;
    const path = `/${segments.join("/")}`;
    const query = p.withQuery ? `?k=${MARKERS.query}&text=${MARKERS.text}` : "";
    const fragment = p.withFragment ? `#${MARKERS.fragment}` : "";
    return `${p.scheme}://${userinfo}${host}${port}${path}${query}${fragment}`;
  });

const urlsArb = fc.array(urlArb, { minLength: 1, maxLength: 6 });

function expectedPrefixes(urls: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const url of urls) {
    const lookup = toLookupUrl(url);
    if (lookup === null) continue;
    for (const expression of expressionsOf(lookup)) {
      out.add(toBase64Url(prefixOf(sha256(expression))));
    }
  }
  return out;
}

describe("Feature: link-reputation-check, Property 117: privacy of the outbound request (PBT-117)", () => {
  it("the only outbound request is one GET to the provider host carrying only sorted 4-byte hash prefixes and the API key header", async () => {
    await fc.assert(
      fc.asyncProperty(urlsArb, async (urls) => {
        const { fetchImpl, calls } = fakeFetchCapturing(
          () => new Response("{}", { status: 200 }),
        );
        const checker = createReputationChecker({
          provider: createSafeBrowsingProvider({
            apiKey: API_KEY,
            timeoutMs: 1000,
            fetchImpl,
          }),
          gate: () => true,
        });

        await checker.check(urls);

        // Exactly one request.
        expect(calls).toHaveLength(1);
        const call = calls[0];
        expect(call.init.method).toBe("GET");
        expect(call.init.body ?? null).toBeNull();

        // Host and shape of the URL.
        const url = new URL(call.url);
        expect(url.protocol).toBe("https:");
        expect(url.host).toBe("safebrowsing.googleapis.com");
        expect(url.username).toBe("");
        expect(url.password).toBe("");
        expect(url.hash).toBe("");

        // Query carries only hashPrefixes, sorted, 4 bytes, unpadded web-safe.
        const entries = [...url.searchParams.entries()];
        expect(entries.length).toBeGreaterThan(0);
        const values: string[] = [];
        for (const [name, value] of entries) {
          expect(name).toBe("hashPrefixes");
          expect(value).toMatch(/^[A-Za-z0-9_-]{6}$/u);
          expect(Buffer.from(value, "base64url")).toHaveLength(4);
          values.push(value);
        }
        expect(values).toEqual([...values].sort());
        const allowed = expectedPrefixes(urls);
        for (const value of values) expect(allowed.has(value)).toBe(true);

        // Headers: the key (plus the benign Accept), nothing else.
        expect(call.headers["x-goog-api-key"]).toBe(API_KEY);
        for (const name of Object.keys(call.headers)) {
          expect(["x-goog-api-key", "accept"]).toContain(name);
        }
        expect(call.headers["accept"] ?? "application/json").toBe("application/json");

        // No input text, host, path, query or key anywhere in the URL or body.
        const visible = `${call.url}\n${String(call.init.body ?? "")}`.toLowerCase();
        for (const marker of Object.values(MARKERS)) {
          expect(visible).not.toContain(marker);
        }
        expect(visible).not.toContain("example");
        expect(visible).not.toContain(API_KEY);
        expect(visible).not.toContain("http://");
        expect(visible.match(/https:\/\//gu)).toHaveLength(1);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
