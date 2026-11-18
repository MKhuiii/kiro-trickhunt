import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { contrastRatio } from "./contrast";
import {
  DECLARED_PAIRS,
  HIGH_CONTRAST_TEXT_THRESHOLD,
  LINK_TOKENS,
  PAIR_THRESHOLDS,
} from "./pairs";
import {
  COLOR_TOKENS,
  HIGH_CONTRAST_PALETTE,
  NORMAL_PALETTE,
} from "./palettes";

// PBT-109: Link creature colors
// **Validates: Requirements REQ-LINK-15, REQ-LINK-16, REQ-LINK-17**

const NUM_RUNS = 100;
const CARDS = ["surface", "raised"] as const;

describe("PBT-109: link creature contrast", () => {
  it("declares 16 text pairs for the eight link tokens on surface and raised", () => {
    expect(LINK_TOKENS).toHaveLength(8);
    expect(LINK_TOKENS).toContain("link-plague-mark");
    for (const token of LINK_TOKENS) {
      expect(COLOR_TOKENS).toContain(token);
      for (const bg of CARDS) {
        expect(
          DECLARED_PAIRS.some(
            (p) => p.fg === token && p.bg === bg && p.use === "text",
          ),
        ).toBe(true);
      }
    }
    const linkPairs = DECLARED_PAIRS.filter((p) =>
      (LINK_TOKENS as readonly string[]).includes(p.fg),
    );
    expect(linkPairs.filter((p) => p.use === "text")).toHaveLength(16);
    // Badge art (REQ-PAGE-46): 16 more declared as `ui`.
    expect(linkPairs.filter((p) => p.use === "ui")).toHaveLength(16);
  });

  it("every link token meets 4.5 (normal) and 7 (high contrast) on surface and raised", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...LINK_TOKENS),
        fc.constantFrom(...CARDS),
        (token, bg) => {
          const normal = contrastRatio(NORMAL_PALETTE[token], NORMAL_PALETTE[bg]);
          const high = contrastRatio(
            HIGH_CONTRAST_PALETTE[token],
            HIGH_CONTRAST_PALETTE[bg],
          );
          return (
            normal >= PAIR_THRESHOLDS.text && high >= HIGH_CONTRAST_TEXT_THRESHOLD
          );
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("both palettes define every link token as #RRGGBB, distinct within a palette", () => {
    fc.assert(
      fc.property(fc.constantFrom(NORMAL_PALETTE, HIGH_CONTRAST_PALETTE), (pal) => {
        const values = LINK_TOKENS.map((t) => pal[t]);
        return (
          values.every((v) => /^#[0-9A-F]{6}$/.test(v)) &&
          new Set(values).size === values.length
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
