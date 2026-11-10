/**
 * combine.property.test.ts — Property-based tests for applyRules
 *
 * **Validates: Requirements PBT-31**
 *
 * PBT-31: combination rules never lower the aggregate:
 *         riskScore >= aggregate(reduced).score and level rank is not lower.
 *         The output score is an integer in [0, 100].
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

import { aggregate, createSignal } from "../core";
import type { RiskLevel, Signal } from "../core";

import { applyRules } from "./combine";
import { reduceForScoring } from "./reduce";
import { COMBINATION_RULES } from "./rules.config";

const LEVEL_RANK: Record<RiskLevel, number> = {
  no_signals: 0,
  suspicious: 1,
  high: 2,
  critical: 3,
};

/** Ids named in COMBINATION_RULES, with "url.*" expanded to a real url id. */
const ruleIds: string[] = [
  ...new Set(
    COMBINATION_RULES.flatMap((r) =>
      r.allOf.flat().map((id) => (id.endsWith(".*") ? "url.brand-lookalike" : id)),
    ),
  ),
];
const otherIds = ["text.other", "url.ip-host", "semantic.other", "text.urgency"];

const idArb = fc.oneof(
  { weight: 4, arbitrary: fc.constantFrom(...ruleIds) },
  { weight: 1, arbitrary: fc.constantFrom(...otherIds) },
);

const signalArb: fc.Arbitrary<Signal> = fc
  .tuple(idArb, fc.double({ min: 0, max: 1, noNaN: true }))
  .map(([id, severity]) =>
    createSignal({
      id,
      source: id.startsWith("url.") ? "url" : id.startsWith("semantic.") ? "semantic" : "text",
      severity,
      evidence: "ev",
      whyItMatters: "because",
    }),
  );

describe("PBT-31 — combination rules never lower the aggregate", () => {
  it("riskScore >= aggregate score, level rank not lower, score is integer in [0,100]", () => {
    fc.assert(
      fc.property(fc.array(signalArb, { maxLength: 12 }), (signals) => {
        const reduced = reduceForScoring(signals);
        const agg = aggregate(reduced);
        const out = applyRules(agg, reduced);
        expect(out.score).toBeGreaterThanOrEqual(agg.score);
        expect(LEVEL_RANK[out.level]).toBeGreaterThanOrEqual(LEVEL_RANK[agg.level]);
        expect(Number.isInteger(out.score)).toBe(true);
        expect(out.score).toBeGreaterThanOrEqual(0);
        expect(out.score).toBeLessThanOrEqual(100);
      }),
    );
  });
});
