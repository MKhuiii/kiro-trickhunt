/**
 * Unit tests for text-analyzer.config.ts (REQ-TXT-01, REQ-TXT-02, REQ-TXT-05).
 */

import { describe, it, expect } from "vitest";
import {
  MAX_EVIDENCE_CHARS,
  MAX_INPUT_CHARS,
  TEXT_PATTERNS,
} from "./text-analyzer.config";

const EXPECTED_IDS = [
  "text.otp-request",
  "text.urgency",
  "text.threat",
  "text.prize-reward",
  "text.payment-request",
  "text.authority-impersonation",
  "text.off-platform",
  "text.sensitive-data-request",
];

describe("TEXT_PATTERNS", () => {
  it("contains exactly the 8 expected ids", () => {
    const ids = TEXT_PATTERNS.map((p) => p.id);
    for (const id of EXPECTED_IDS) {
      expect(ids).toContain(id);
    }
    expect(TEXT_PATTERNS).toHaveLength(EXPECTED_IDS.length);
  });

  it("has unique ids", () => {
    const ids = TEXT_PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe.each(TEXT_PATTERNS.map((p) => [p.id, p] as const))("%s", (_id, pattern) => {
    it("has weight in [0, 1]", () => {
      expect(pattern.weight).toBeGreaterThanOrEqual(0);
      expect(pattern.weight).toBeLessThanOrEqual(1);
    });

    it("has non-empty whyItMatters", () => {
      expect(pattern.whyItMatters.trim().length).toBeGreaterThan(0);
    });

    it("has non-empty en and vi phrase lists", () => {
      expect(pattern.phrases.en.length).toBeGreaterThan(0);
      expect(pattern.phrases.vi.length).toBeGreaterThan(0);
    });

    it("has no blank phrases", () => {
      for (const phrase of [...pattern.phrases.en, ...pattern.phrases.vi]) {
        expect(phrase.trim().length).toBeGreaterThan(0);
      }
    });
  });
});

describe("limits", () => {
  it("MAX_EVIDENCE_CHARS is positive", () => {
    expect(MAX_EVIDENCE_CHARS).toBeGreaterThan(0);
  });

  it("MAX_INPUT_CHARS is positive", () => {
    expect(MAX_INPUT_CHARS).toBeGreaterThan(0);
  });
});
