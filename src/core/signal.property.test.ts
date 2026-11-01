/**
 * signal.property.test.ts — Property-based tests for createSignal
 *
 * **Validates: Requirements PBT-05 / REQ-SIG-01**
 *
 * PBT-05: Signal construction with `severity` outside [0, 1] always results
 *         in an error, for any arbitrary float outside that range.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createSignal } from "./signal";

// ---------------------------------------------------------------------------
// Shared fixture — all fields valid except the one under test
// ---------------------------------------------------------------------------

const BASE = {
  id: "test.signal",
  source: "text" as const,
  evidence: "Test evidence string",
  whyItMatters: "Explains why this matters to the user.",
};

// ---------------------------------------------------------------------------
// PBT-05 — severity outside [0, 1] always throws
// ---------------------------------------------------------------------------

describe("PBT-05 — createSignal throws for any severity outside [0, 1]", () => {
  it("throws for any float strictly less than 0", () => {
    // Generator: finite floats in (-MAX_VALUE, 0)
    const negativeFloat = fc
      .float({ min: -3.4028234663852886e38, max: -1.1754943508222875e-38, noNaN: true })
      .filter((n) => n < 0);

    fc.assert(
      fc.property(negativeFloat, (severity) => {
        expect(() => createSignal({ ...BASE, severity })).toThrow(TypeError);
      })
    );
  });

  it("throws for any float strictly greater than 1", () => {
    // Generator: finite floats in (1, MAX_VALUE)
    const aboveOneFloat = fc
      .float({ min: 1.0000001192092896, max: 3.4028234663852886e38, noNaN: true })
      .filter((n) => n > 1);

    fc.assert(
      fc.property(aboveOneFloat, (severity) => {
        expect(() => createSignal({ ...BASE, severity })).toThrow(TypeError);
      })
    );
  });

  it("throws for any value in (-∞, 0) ∪ (1, +∞) generated via double()", () => {
    // Use fc.double for a wider range including large magnitudes.
    // Filter to values strictly outside [0, 1] and exclude NaN/Infinity
    // (those are already covered by the unit tests and the isFinite check).
    const outOfRange = fc
      .double({ noNaN: true, noDefaultInfinity: true })
      .filter((n) => Number.isFinite(n) && (n < 0 || n > 1));

    fc.assert(
      fc.property(outOfRange, (severity) => {
        expect(() => createSignal({ ...BASE, severity })).toThrow(TypeError);
      }),
      { numRuns: 1000 }
    );
  });
});
