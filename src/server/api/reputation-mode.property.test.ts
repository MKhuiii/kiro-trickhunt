import fc from "fast-check";
import { describe, it } from "vitest";

import type { ReputationOutcome } from "../../pipeline";
import { deriveReputationMode, type ReputationMode } from "./reputation-mode";
import type { GateOutcome } from "./reputation-gate";

const reputationArb: fc.Arbitrary<ReputationOutcome> = fc.oneof(
  fc.record({
    status: fc.constant("ok" as const),
    checkedCount: fc.integer({ min: 0, max: 20 }),
  }),
  fc.record({
    status: fc.constant("degraded" as const),
    reason: fc.constantFrom(
      "timeout" as const,
      "provider-error" as const,
      "invalid-response" as const,
      "rate-limited" as const,
      "too-many-links" as const,
    ),
    checkedCount: fc.integer({ min: 0, max: 20 }),
  }),
  fc.record({
    status: fc.constant("not-requested" as const),
    checkedCount: fc.integer({ min: 0, max: 20 }),
  }),
);

const inputArb = fc.record({
  checkLinks: fc.boolean(),
  configured: fc.boolean(),
  gate: fc.constantFrom<GateOutcome>("used", "denied", "skipped"),
  urlsAnalyzed: fc.integer({ min: 0, max: 20 }),
  reputation: reputationArb,
});

const MODES: readonly ReputationMode[] = [
  "checked",
  "not-requested",
  "not-configured",
  "budget-exhausted",
  "skipped",
  "failed",
];

/** Reference model: the first match in the order of REQ-LREP-15. */
function expected(i: {
  checkLinks: boolean;
  configured: boolean;
  gate: GateOutcome;
  urlsAnalyzed: number;
  reputation: ReputationOutcome;
}): ReputationMode {
  if (!i.checkLinks) return "not-requested";
  if (!i.configured) return "not-configured";
  if (i.gate === "denied") return "budget-exhausted";
  if (i.urlsAnalyzed === 0 || (i.reputation.status === "ok" && i.reputation.checkedCount === 0)) {
    return "skipped";
  }
  if (i.reputation.status === "degraded") return "failed";
  return "checked";
}

describe("deriveReputationMode properties", () => {
  // Feature: link-reputation-check, Property 123: Reputation mode follows a fixed order
  // **Validates: Requirements REQ-LREP-15, REQ-LREP-18**
  it("is total, returns a closed-set value and follows the fixed precedence", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const mode = deriveReputationMode(input);
        return MODES.includes(mode) && mode === expected(input);
      }),
      { numRuns: 200 },
    );
  });
});
