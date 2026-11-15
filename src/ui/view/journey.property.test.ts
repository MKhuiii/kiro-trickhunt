import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MIN_HUNT_MS } from "../hunt.config";
import type { CheckStatus } from "../run-check";
import { legFor, legsFor, revealWaitMs } from "./journey";

const STATUSES: readonly CheckStatus[] = [
  "preparing",
  "qr",
  "ocr-loading",
  "ocr-recognizing",
  "sending",
];
const statusArb = fc.constantFrom(...STATUSES);
const msArb = fc.oneof(
  fc.integer({ min: 0, max: 60_000 }),
  fc.double({ noNaN: false }),
  fc.constantFrom(Infinity, -Infinity, NaN, -1, 0),
);

describe("journey property tests (PBT-90)", () => {
  /**
   * **Validates: Requirements REQ-HUNT-22, REQ-HUNT-23**
   */
  it("the Leg is always in the allowed list for the image flag", () => {
    fc.assert(
      fc.property(fc.boolean(), statusArb, msArb, msArb, (hasImage, status, elapsedMs, minMs) => {
        const leg = legFor({ hasImage, status, elapsedMs, minMs });
        expect(legsFor(hasImage)).toContain(leg);
        if (!hasImage) expect(["mountain", "swamp"]).not.toContain(leg);
      }),
      { numRuns: 300 },
    );
  });

  /**
   * **Validates: Requirements REQ-HUNT-23**
   */
  it("never goes backwards as elapsed time grows, and never passes ruins", () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        statusArb,
        fc.integer({ min: 0, max: 30_000 }),
        fc.integer({ min: 0, max: 30_000 }),
        (hasImage, status, a, b) => {
          const legs = legsFor(hasImage);
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          const early = legFor({ hasImage, status, elapsedMs: lo, minMs: MIN_HUNT_MS });
          const late = legFor({ hasImage, status, elapsedMs: hi, minMs: MIN_HUNT_MS });
          expect(legs.indexOf(late)).toBeGreaterThanOrEqual(legs.indexOf(early));
          expect(legs.indexOf(late)).toBeLessThanOrEqual(legs.indexOf("ruins"));
          expect(legs.indexOf("ruins")).toBe(legs.length - 1);
        },
      ),
      { numRuns: 300 },
    );
  });

  /**
   * **Validates: Requirements REQ-HUNT-24**
   */
  it("reveal wait is 0 with reduced motion and never above the minimum hunt time", () => {
    fc.assert(
      fc.property(msArb, fc.boolean(), (elapsedMs, reducedMotion) => {
        const wait = revealWaitMs({ elapsedMs, minMs: MIN_HUNT_MS, reducedMotion });
        expect(wait).toBeGreaterThanOrEqual(0);
        expect(wait).toBeLessThanOrEqual(MIN_HUNT_MS);
        if (reducedMotion) expect(wait).toBe(0);
      }),
      { numRuns: 300 },
    );
  });
});
