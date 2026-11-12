/**
 * llm-budget.property.test.ts — Property-based tests for createLlmBudget
 *
 * Feature: analyze-api, Property 4: Budget windows (PBT-41)
 * **Validates: Requirements REQ-API-27**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createLlmBudget } from "./llm-budget";
import { LLM_DAY_WINDOW_MS, LLM_MINUTE_WINDOW_MS } from "./api-limits.config";

// Gaps between attempts: bursts, around the minute edge, and around the day edge.
const gapArb = fc.oneof(
  { weight: 4, arbitrary: fc.integer({ min: 0, max: 5_000 }) },
  { weight: 2, arbitrary: fc.integer({ min: 55_000, max: 65_000 }) },
  { weight: 1, arbitrary: fc.integer({ min: 0, max: 3_600_000 }) },
  { weight: 1, arbitrary: fc.integer({ min: LLM_DAY_WINDOW_MS - 5_000, max: LLM_DAY_WINDOW_MS + 5_000 }) },
);

const scenarioArb = fc.record({
  callsPerMinute: fc.integer({ min: 0, max: 10 }),
  callsPerDay: fc.integer({ min: 0, max: 30 }),
  start: fc.integer({ min: 0, max: 1_000_000_000 }),
  gaps: fc.array(gapArb, { minLength: 0, maxLength: 120 }),
});

function countInWindow(successes: readonly number[], end: number, windowMs: number): number {
  return successes.filter((ts) => ts <= end && ts > end - windowMs).length;
}

describe("Feature: analyze-api, Property 4 — Budget windows (PBT-41)", () => {
  it("successes never exceed callsPerMinute in 60 s or callsPerDay in 24 h", () => {
    fc.assert(
      fc.property(scenarioArb, ({ callsPerMinute, callsPerDay, start, gaps }) => {
        let clock = start;
        const budget = createLlmBudget({ callsPerMinute, callsPerDay, now: () => clock });

        const successes: number[] = [];
        for (const gap of gaps) {
          clock += gap;
          if (budget.tryAcquire()) successes.push(clock);
        }

        for (const end of successes) {
          expect(countInWindow(successes, end, LLM_MINUTE_WINDOW_MS)).toBeLessThanOrEqual(callsPerMinute);
          expect(countInWindow(successes, end, LLM_DAY_WINDOW_MS)).toBeLessThanOrEqual(callsPerDay);
        }
        if (callsPerMinute === 0 || callsPerDay === 0) expect(successes).toHaveLength(0);
      }),
      { numRuns: 200 },
    );
  });
});
