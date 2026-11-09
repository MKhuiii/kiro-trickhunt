/**
 * url-analyzer.property.test.ts â€” Property-based tests for the URL Analyzer
 *
 * **Validates: Requirements PBT-06, PBT-07, PBT-08, PBT-09**
 *
 * PBT-06: normalizeUrl(normalizeUrl(s)) === normalizeUrl(s) for all strings
 *         (idempotency â€” REQ-URL-01)
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { createSignal } from "../core/signal";
import { normalizeUrl, UrlAnalyzer } from "./url-analyzer";

// ---------------------------------------------------------------------------
// PBT-06 â€” normalizeUrl is idempotent for any string input
// ---------------------------------------------------------------------------

describe("PBT-06 â€” normalizeUrl idempotency (REQ-URL-01)", () => {
  it("normalizeUrl(normalizeUrl(s)) === normalizeUrl(s) for any string", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const once = normalizeUrl(s);
        if (once === null) {
          // If the first call returns null, idempotency holds trivially.
          // (We cannot call normalizeUrl(null) â€” the function takes string â€”
          //  so we just assert once is null.)
          return once === null;
        }
        // First call returned a string: applying it again must produce the same string.
        const twice = normalizeUrl(once);
        return twice === once;
      }),
      { numRuns: 1000 }
    );
  });
});

// ---------------------------------------------------------------------------
// PBT-07 — analyze never rejects
// ---------------------------------------------------------------------------

describe("PBT-07 — UrlAnalyzer.analyze never rejects (REQ-URL-28)", () => {
  const analyzer = new UrlAnalyzer();

  it("resolves for any string", async () => {
    await fc.assert(
      fc.asyncProperty(fc.string(), async (s) => {
        const result = await analyzer.analyze(s);
        return Array.isArray(result);
      }),
      { numRuns: 500 }
    );
  });

  it("resolves for any value coerced to string", async () => {
    await fc.assert(
      fc.asyncProperty(fc.anything(), async (v) => {
        let s: string;
        try {
          s = String(v);
        } catch {
          return true; // value can't be coerced; nothing to pass to analyze
        }
        const result = await analyzer.analyze(s);
        return Array.isArray(result);
      }),
      { numRuns: 500 }
    );
  });
});

// ---------------------------------------------------------------------------
// PBT-08 — every returned signal is valid
// ---------------------------------------------------------------------------

describe("PBT-08 — signals pass createSignal (REQ-URL-27)", () => {
  const analyzer = new UrlAnalyzer();

  const allValid = async (s: string): Promise<boolean> => {
    const signals = await analyzer.analyze(s);
    for (const sig of signals) {
      createSignal({ ...sig }); // throws if invalid
    }
    return true;
  };

  it("holds for fc.webUrl()", async () => {
    await fc.assert(fc.asyncProperty(fc.webUrl(), allValid), { numRuns: 500 });
  });

  it("holds for fc.string()", async () => {
    await fc.assert(fc.asyncProperty(fc.string(), allValid), { numRuns: 500 });
  });
});

// ---------------------------------------------------------------------------
// PBT-09 — non-http/https input yields no signals
// ---------------------------------------------------------------------------

describe("PBT-09 — non-http/https input returns [] (REQ-URL-29)", () => {
  const analyzer = new UrlAnalyzer();
  const scheme = fc.constantFrom("ftp", "file", "javascript", "data", "mailto", "ws", "ssh");

  it("returns [] for strings starting with a non-http scheme", async () => {
    await fc.assert(
      fc.asyncProperty(scheme, fc.string(), async (sch, rest) => {
        const result = await analyzer.analyze(`${sch}://${rest}`);
        return result.length === 0;
      }),
      { numRuns: 500 }
    );
  });
});

