import { describe, expect, it } from "vitest";
import { SEMANTIC_SIGNALS, SEVERITY_CAP } from "./semantic-analyzer.config";

const EXPECTED_IDS = [
  "semantic.impersonation-tone",
  "semantic.emotional-manipulation",
  "semantic.too-good-to-be-true",
  "semantic.isolation-secrecy",
  "semantic.relationship-or-job-bait",
  "semantic.pressure-escalation",
];

describe("semantic-analyzer.config", () => {
  it("contains exactly the six ids from REQ-SEM-01, with no duplicates", () => {
    const ids = SEMANTIC_SIGNALS.map((s) => s.id);
    expect(ids).toHaveLength(EXPECTED_IDS.length);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it("has a non-empty whyItMatters for every signal (REQ-SEM-02)", () => {
    for (const def of SEMANTIC_SIGNALS) {
      expect(def.whyItMatters.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps every maxSeverity in (0, SEVERITY_CAP] (REQ-SEM-02)", () => {
    for (const def of SEMANTIC_SIGNALS) {
      expect(def.maxSeverity).toBeGreaterThan(0);
      expect(def.maxSeverity).toBeLessThanOrEqual(SEVERITY_CAP);
    }
  });

  it("keeps SEVERITY_CAP strictly below 1 (REQ-SEM-03)", () => {
    expect(SEVERITY_CAP).toBeGreaterThan(0);
    expect(SEVERITY_CAP).toBeLessThan(1);
  });
});
