/**
 * aggregator.property.test.ts — Property-based tests for aggregate()
 *
 * **Validates: Requirements PBT-01, PBT-02, PBT-04**
 *
 * PBT-01: For any list of valid signals, score ∈ [0, 100].
 * PBT-02: For any valid signal list L and any signal s with severity > 0,
 *         aggregate([...L, s]).score >= aggregate(L).score  (monotonicity).
 * PBT-04: For any valid signal list, level matches the score-to-level mapping
 *         in §2.3 exactly.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { aggregate } from "./aggregator";
import { createSignal, type Signal } from "./signal";

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generates a severity value uniformly from [0, 1]. */
const severityArb = fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true })
  .filter((n) => n >= 0 && n <= 1);

/** Generates a unique-enough id string. */
const signalIdArb = fc.string({ minLength: 1, maxLength: 40 })
  .filter((s) => s.trim().length > 0);

/** Generates a single valid Signal. */
const signalArb: fc.Arbitrary<Signal> = fc
  .record({
    id: signalIdArb,
    source: fc.constantFrom("url", "text", "image", "qr" as const),
    severity: severityArb,
    evidence: fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0),
    whyItMatters: fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0),
  })
  .map((input) => createSignal(input as Signal));

/** Generates a list of 0–10 valid Signals. */
const signalListArb = fc.array(signalArb, { minLength: 0, maxLength: 10 });

// ---------------------------------------------------------------------------
// PBT-01 — score is always in [0, 100]
// ---------------------------------------------------------------------------

describe("PBT-01 — score is always in [0, 100]", () => {
  it("holds for any list of valid signals", () => {
    fc.assert(
      fc.property(signalListArb, (signals) => {
        const { score } = aggregate(signals);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
        expect(Number.isInteger(score)).toBe(true);
      }),
      { numRuns: 1000 }
    );
  });
});

// ---------------------------------------------------------------------------
// PBT-02 — monotonicity: adding a signal with severity > 0 never decreases score
// ---------------------------------------------------------------------------

describe("PBT-02 — monotonicity (adding severity > 0 never decreases score)", () => {
  /** A signal with severity strictly greater than 0. */
  const positiveSignalArb: fc.Arbitrary<Signal> = fc
    .record({
      id: signalIdArb,
      source: fc.constantFrom("url", "text", "image", "qr" as const),
      severity: fc.double({ min: 1e-10, max: 1, noNaN: true, noDefaultInfinity: true })
        .filter((n) => n > 0 && n <= 1),
      evidence: fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0),
      whyItMatters: fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0),
    })
    .map((input) => createSignal(input as Signal));

  it("score does not decrease when a positive-severity signal is added", () => {
    fc.assert(
      fc.property(signalListArb, positiveSignalArb, (signals, extra) => {
        const before = aggregate(signals).score;
        const after = aggregate([...signals, extra]).score;
        expect(after).toBeGreaterThanOrEqual(before);
      }),
      { numRuns: 1000 }
    );
  });
});

// ---------------------------------------------------------------------------
// PBT-04 — level matches the score-to-level mapping exactly
// ---------------------------------------------------------------------------

describe("PBT-04 — level always matches score-to-level mapping (§2.3)", () => {
  it("level is correct for any valid signal list", () => {
    fc.assert(
      fc.property(signalListArb, (signals) => {
        const { score, level } = aggregate(signals);

        if (score === 0 && signals.length === 0) {
          expect(level).toBe("no_signals");
        } else if (score <= 49) {
          expect(level).toBe("suspicious");
        } else if (score <= 79) {
          expect(level).toBe("high");
        } else {
          expect(level).toBe("critical");
        }
      }),
      { numRuns: 1000 }
    );
  });
});
