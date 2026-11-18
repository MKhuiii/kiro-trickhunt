/**
 * reputation-gate.property.test.ts
 *
 * Feature: link-reputation-check, Property 124: The budget is bounded, lazy and once per request (PBT-124)
 * **Validates: Requirements REQ-LREP-14, REQ-LREP-16, REQ-LREP-17, REQ-LREP-28**
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createLlmBudget } from "./llm-budget";
import { createReputationGate } from "./reputation-gate";
import { LLM_DAY_WINDOW_MS, LLM_MINUTE_WINDOW_MS } from "./api-limits.config";

const NUM_RUNS = 100;

describe("PBT-124: budget bounds", () => {
  it("Feature: link-reputation-check, Property 124: grants never exceed the minute and day limits and denied attempts are not counted", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 6 }),
        fc.integer({ min: 0, max: 12 }),
        fc.array(
          fc.oneof(
            fc.integer({ min: 0, max: 5_000 }),
            fc.integer({ min: 0, max: 120_000 }),
            fc.integer({ min: 0, max: 100_000_000 }),
          ),
          { minLength: 1, maxLength: 60 },
        ),
        (callsPerMinute, callsPerDay, deltas) => {
          let clock = 1_000_000;
          const budget = createLlmBudget({
            callsPerMinute,
            callsPerDay,
            now: () => clock,
          });
          const granted: number[] = [];
          for (const delta of deltas) {
            clock += delta;
            // Independent model: only granted times count.
            const inMinute = granted.filter((t) => t > clock - LLM_MINUTE_WINDOW_MS).length;
            const inDay = granted.filter((t) => t > clock - LLM_DAY_WINDOW_MS).length;
            const expected = inMinute < callsPerMinute && inDay < callsPerDay;
            const actual = budget.tryAcquire();
            expect(actual).toBe(expected);
            if (actual) granted.push(clock);
          }
          // Bounds over every window ending at a grant.
          for (const end of granted) {
            expect(
              granted.filter((t) => t <= end && t > end - LLM_MINUTE_WINDOW_MS).length,
            ).toBeLessThanOrEqual(callsPerMinute);
            expect(
              granted.filter((t) => t <= end && t > end - LLM_DAY_WINDOW_MS).length,
            ).toBeLessThanOrEqual(callsPerDay);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("PBT-124: the gate is lazy and acquires once per request", () => {
  it("Feature: link-reputation-check, Property 124: zero acquisitions without a call, one with any number of calls, same answer every time", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("grant", "deny", "throw"),
        fc.integer({ min: 0, max: 10 }),
        (kind, calls) => {
          let acquired = 0;
          const gate = createReputationGate({
            tryAcquire: () => {
              acquired += 1;
              if (kind === "throw") throw new Error("budget failure");
              return kind === "grant";
            },
          });
          expect(acquired).toBe(0);
          expect(gate.outcome()).toBe("skipped");

          const answers: boolean[] = [];
          for (let i = 0; i < calls; i += 1) answers.push(gate.gate());

          expect(acquired).toBe(calls === 0 ? 0 : 1);
          expect(new Set(answers).size).toBeLessThanOrEqual(1);
          if (calls > 0) {
            expect(answers[0]).toBe(kind === "grant");
            expect(gate.outcome()).toBe(kind === "grant" ? "used" : "denied");
          } else {
            expect(gate.outcome()).toBe("skipped");
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
