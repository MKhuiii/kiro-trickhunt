import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";
import {
  DECLARED_PAIRS,
  HIGH_CONTRAST_TEXT_THRESHOLD,
  PAIR_THRESHOLDS,
} from "./pairs";
import { COLOR_TOKENS, HIGH_CONTRAST_PALETTE, NORMAL_PALETTE } from "./palettes";

describe("declared pairs", () => {
  it("is not empty", () => {
    expect(DECLARED_PAIRS.length).toBeGreaterThan(0);
  });

  it.each(DECLARED_PAIRS.map((p) => [`${p.fg} on ${p.bg} (${p.use})`, p] as const))(
    "normal palette meets threshold: %s",
    (_name, p) => {
      const ratio = contrastRatio(NORMAL_PALETTE[p.fg], NORMAL_PALETTE[p.bg]);
      expect(ratio).toBeGreaterThanOrEqual(PAIR_THRESHOLDS[p.use]);
    },
  );

  it.each(DECLARED_PAIRS.map((p) => [`${p.fg} on ${p.bg} (${p.use})`, p] as const))(
    "high-contrast palette meets threshold: %s",
    (_name, p) => {
      const min =
        p.use === "text"
          ? HIGH_CONTRAST_TEXT_THRESHOLD
          : PAIR_THRESHOLDS[p.use];
      const ratio = contrastRatio(
        HIGH_CONTRAST_PALETTE[p.fg],
        HIGH_CONTRAST_PALETTE[p.bg],
      );
      expect(ratio).toBeGreaterThanOrEqual(min);
    },
  );

  it("uses 7:1 for text in high contrast", () => {
    expect(HIGH_CONTRAST_TEXT_THRESHOLD).toBe(7);
  });
});

describe("palettes", () => {
  it("define the same token names", () => {
    expect(Object.keys(HIGH_CONTRAST_PALETTE).sort()).toEqual(
      Object.keys(NORMAL_PALETTE).sort(),
    );
    expect(Object.keys(NORMAL_PALETTE).sort()).toEqual([...COLOR_TOKENS].sort());
  });

  it("use valid #RRGGBB values", () => {
    for (const palette of [NORMAL_PALETTE, HIGH_CONTRAST_PALETTE]) {
      for (const token of COLOR_TOKENS) {
        expect(palette[token]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });

  it("differ per palette for the core tokens", () => {
    for (const token of ["bg", "surface", "text", "focus", "border"] as const) {
      expect(HIGH_CONTRAST_PALETTE[token]).not.toBe(NORMAL_PALETTE[token]);
    }
  });
});
