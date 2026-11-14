import { describe, it } from "vitest";
import * as fc from "fast-check";
import { contrastRatio } from "./contrast";
import {
  DECLARED_PAIRS,
  HIGH_CONTRAST_TEXT_THRESHOLD,
  PAIR_THRESHOLDS,
} from "./pairs";
import { HIGH_CONTRAST_PALETTE, NORMAL_PALETTE } from "./palettes";

// PBT-72: Contrast
// **Validates: Requirements REQ-UI-33, REQ-UI-35**

const NUM_RUNS = 100;

const hexColor = fc
  .integer({ min: 0, max: 0xffffff })
  .map((n) => `#${n.toString(16).padStart(6, "0").toUpperCase()}`);

const HEX_VALID = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const invalidColor = fc.string().filter((s) => !HEX_VALID.test(s));

describe("PBT-72: contrast", () => {
  it("every declared pair meets its threshold in both palettes", () => {
    fc.assert(
      fc.property(fc.constantFrom(...DECLARED_PAIRS), (pair) => {
        const normal = contrastRatio(
          NORMAL_PALETTE[pair.fg],
          NORMAL_PALETTE[pair.bg],
        );
        const high = contrastRatio(
          HIGH_CONTRAST_PALETTE[pair.fg],
          HIGH_CONTRAST_PALETTE[pair.bg],
        );
        const highMin =
          pair.use === "text"
            ? HIGH_CONTRAST_TEXT_THRESHOLD
            : PAIR_THRESHOLDS[pair.use];
        return normal >= PAIR_THRESHOLDS[pair.use] && high >= highMin;
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("is symmetric and within 1..21 for valid colors", () => {
    fc.assert(
      fc.property(hexColor, hexColor, (a, b) => {
        const ab = contrastRatio(a, b);
        const ba = contrastRatio(b, a);
        return ab === ba && ab >= 1 && ab <= 21;
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("returns 1 when either input is invalid", () => {
    fc.assert(
      fc.property(invalidColor, hexColor, (bad, good) => {
        return (
          contrastRatio(bad, good) === 1 &&
          contrastRatio(good, bad) === 1 &&
          contrastRatio(bad, bad) === 1
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
