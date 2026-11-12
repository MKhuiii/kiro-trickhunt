/**
 * lazy-llm-client.property.test.ts — Property-based tests for createLazyLlmClient
 *
 * Feature: analyze-api-locale-budget, Property 62: Acquisition accounting (PBT-62)
 * **Validates: Requirements REQ-API-53**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createLazyLlmClient } from "./lazy-llm-client";
import type { LlmBudget } from "./llm-budget";
import { FakeLlmClient } from "../../analyzers/fake-llm-client";

type Decision = "allow" | "deny" | "throw";

const decisionsArb = fc.array(fc.constantFrom<Decision>("allow", "deny", "throw"), {
  maxLength: 8,
});

describe("PBT-62: acquisitions equal Real_Calls; attempts equal Real_Calls plus Denials", () => {
  it("holds for arbitrary budget decisions (including a throwing budget) and 0..N calls", async () => {
    await fc.assert(
      fc.asyncProperty(decisionsArb, fc.nat({ max: 5 }), async (decisions, calls) => {
        let attempts = 0;
        let acquisitions = 0;
        const budget: LlmBudget = {
          tryAcquire() {
            const decision = decisions[attempts] ?? "deny";
            attempts += 1;
            if (decision === "throw") throw new Error("budget failure");
            if (decision === "allow") {
              acquisitions += 1;
              return true;
            }
            return false;
          },
        };
        const real = FakeLlmClient.responding("ok");
        const lazy = createLazyLlmClient(real, budget);

        // No acquisition at construction.
        expect(attempts).toBe(0);

        let denials = 0;
        for (let i = 0; i < calls; i += 1) {
          try {
            await lazy.client.complete({ system: "s", user: "u" } as never);
          } catch {
            denials += 1;
          }
        }

        const realCalls = real.callCount;
        expect(acquisitions).toBe(realCalls);
        expect(attempts).toBe(realCalls + denials);
        expect(attempts).toBe(calls);
      }),
      { numRuns: 100 },
    );
  });
});
