/**
 * url-analyzer.property.test.ts — Property-based tests for the URL Analyzer
 *
 * **Validates: Requirements PBT-06**
 *
 * PBT-06: normalizeUrl(normalizeUrl(s)) === normalizeUrl(s) for all strings
 *         (idempotency — REQ-URL-01)
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { normalizeUrl } from "./url-analyzer";

// ---------------------------------------------------------------------------
// PBT-06 — normalizeUrl is idempotent for any string input
// ---------------------------------------------------------------------------

describe("PBT-06 — normalizeUrl idempotency (REQ-URL-01)", () => {
  it("normalizeUrl(normalizeUrl(s)) === normalizeUrl(s) for any string", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const once = normalizeUrl(s);
        if (once === null) {
          // If the first call returns null, idempotency holds trivially.
          // (We cannot call normalizeUrl(null) — the function takes string —
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
