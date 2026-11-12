import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { fitWithin } from "./fit-within";

const side = fc.integer({ min: 1, max: 100000 });
const limit = fc.integer({ min: 1, max: 8000 });

describe("fitWithin properties", () => {
  /**
   * Property PBT-51: fitWithin bounds and ratio
   * **Validates: Requirements REQ-CI-03**
   */
  it("PBT-51: stays within limit and input, at least 1, ratio within one pixel", () => {
    fc.assert(
      fc.property(side, side, limit, (w, h, max) => {
        const out = fitWithin(w, h, max);
        expect(Number.isInteger(out.width)).toBe(true);
        expect(Number.isInteger(out.height)).toBe(true);
        expect(out.width).toBeGreaterThanOrEqual(1);
        expect(out.height).toBeGreaterThanOrEqual(1);
        expect(out.width).toBeLessThanOrEqual(w);
        expect(out.height).toBeLessThanOrEqual(h);

        if (Math.max(w, h) <= max) {
          expect(out).toEqual({ width: w, height: h });
          return;
        }
        expect(out.width).toBeLessThanOrEqual(max);
        expect(out.height).toBeLessThanOrEqual(max);
        const scale = max / Math.max(w, h);
        expect(Math.abs(out.width - w * scale)).toBeLessThanOrEqual(1);
        expect(Math.abs(out.height - h * scale)).toBeLessThanOrEqual(1);
      }),
      { numRuns: 200 },
    );
  });
});
