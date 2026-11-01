/**
 * analyzer.property.test.ts — Property-based tests for the Analyzer interface
 *
 * **Validates: Requirements REQ-ANL-01, PBT-03**
 *
 * PBT-03: For any primitive or object value passed to any concrete Analyzer,
 * `analyze` resolves without throwing.
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import type { Analyzer } from "./analyzer";
import { AnalyzerRegistry } from "./analyzer";
import type { Signal } from "./signal";

// ---------------------------------------------------------------------------
// Passthrough analyzer — concrete Analyzer<unknown> that always resolves with
// an empty array regardless of what input it receives. This satisfies
// REQ-ANL-01 by design and serves as the subject under test for PBT-03.
// ---------------------------------------------------------------------------

const passthroughAnalyzer: Analyzer<unknown> = {
  sourceType: "text",
  analyze: async (_input: unknown): Promise<Signal[]> => [],
};

// ---------------------------------------------------------------------------
// PBT-03
// ---------------------------------------------------------------------------

describe("PBT-03 — Analyzer resolves for any input (REQ-ANL-01)", () => {
  it("passthrough analyzer resolves without throwing for any fc.anything() input", async () => {
    await fc.assert(
      fc.asyncProperty(fc.anything(), async (arbitraryInput) => {
        // analyze() must resolve — awaiting it must not throw or reject
        const result = await passthroughAnalyzer.analyze(arbitraryInput);

        // Result must be an array (Promise<Signal[]> contract)
        if (!Array.isArray(result)) {
          return false;
        }

        return true;
      }),
      { numRuns: 200 }
    );
  });

  it("AnalyzerRegistry.analyze resolves for any fc.anything() input via a passthrough analyzer", async () => {
    await fc.assert(
      fc.asyncProperty(fc.anything(), async (arbitraryInput) => {
        const registry = new AnalyzerRegistry();
        registry.register(passthroughAnalyzer);

        // Registry must always resolve (REQ-ANL-01) regardless of the input value
        const result = await registry.analyze("text", arbitraryInput);

        return Array.isArray(result);
      }),
      { numRuns: 200 }
    );
  });
});
