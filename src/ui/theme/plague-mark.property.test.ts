import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { LINK_CREATURES } from "../link-creatures";
import { contrastRatio } from "./contrast";
import {
  DECLARED_PAIRS,
  HIGH_CONTRAST_TEXT_THRESHOLD,
  LINK_TOKENS,
  PAIR_THRESHOLDS,
} from "./pairs";
import { HIGH_CONTRAST_PALETTE, NORMAL_PALETTE } from "./palettes";

// Feature: link-reputation-check, Property 130: Contrast and creature table
// **Validates: Requirements REQ-LREP-50, REQ-LREP-51**

const NUM_RUNS = 100;
const CARDS = ["surface", "raised"] as const;

/** Ids emitted by UrlAnalyzer (src/analyzers/url-analyzer.ts). */
const URL_ANALYZER_SIGNAL_IDS = [
  "url.punycode-host",
  "url.at-in-authority",
  "url.ip-address-host",
  "url.excessive-subdomains",
  "url.known-shortener",
  "url.brand-lookalike",
  "url.credential-keywords",
];

const PLAGUE_TEXT_PAIRS = DECLARED_PAIRS.filter(
  (p) => p.fg === "link-plague-mark" && p.use === "text",
);

describe("PBT-130: plague-mark contrast and creature table", () => {
  it("declares the two text pairs for link-plague-mark", () => {
    expect(PLAGUE_TEXT_PAIRS.map((p) => p.bg).sort()).toEqual(["raised", "surface"]);
  });

  it("plague-mark text pairs meet 4.5 (normal) and 7 (high contrast)", () => {
    fc.assert(
      fc.property(fc.constantFrom(...PLAGUE_TEXT_PAIRS), (pair) => {
        const normal = contrastRatio(NORMAL_PALETTE[pair.fg], NORMAL_PALETTE[pair.bg]);
        const high = contrastRatio(
          HIGH_CONTRAST_PALETTE[pair.fg],
          HIGH_CONTRAST_PALETTE[pair.bg],
        );
        return normal >= PAIR_THRESHOLDS.text && high >= HIGH_CONTRAST_TEXT_THRESHOLD;
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("the eight link tokens are pairwise different in each palette", () => {
    expect(LINK_TOKENS).toHaveLength(8);
    fc.assert(
      fc.property(
        fc.constantFrom(NORMAL_PALETTE, HIGH_CONTRAST_PALETTE),
        fc.constantFrom(...LINK_TOKENS.slice(0, 7)),
        (palette, other) =>
          palette["link-plague-mark"].toUpperCase() !== palette[other].toUpperCase(),
      ),
      { numRuns: NUM_RUNS },
    );
    for (const palette of [NORMAL_PALETTE, HIGH_CONTRAST_PALETTE]) {
      const values = LINK_TOKENS.map((t) => palette[t].toUpperCase());
      expect(new Set(values).size).toBe(8);
    }
  });

  it("creature signalIds equal the UrlAnalyzer ids plus url.reputation-listed", () => {
    const ids = LINK_CREATURES.map((c) => c.signalId);
    expect(ids).toHaveLength(8);
    expect([...ids].sort()).toEqual(
      [...URL_ANALYZER_SIGNAL_IDS, "url.reputation-listed"].sort(),
    );
    const last = LINK_CREATURES[7];
    expect(last.id).toBe("plague-mark");
    expect(last.colorToken).toBe("link-plague-mark");
  });
});
