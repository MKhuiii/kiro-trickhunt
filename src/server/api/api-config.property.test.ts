/**
 * api-config.property.test.ts — Property-based tests for readApiConfig
 *
 * Feature: analyze-api, Property 9: Config total and clamped (PBT-46)
 * **Validates: Requirements REQ-API-34, REQ-API-35**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { API_CONFIG_LIMITS, readApiConfig } from "./api-config";

const KEYS = [
  "RATE_LIMIT_PER_MINUTE",
  "LLM_CALLS_PER_MINUTE",
  "LLM_CALLS_PER_DAY",
] as const;

// Arbitrary values: strings (incl. numeric-looking and huge), plus non-strings.
const valueArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.string(),
  fc.integer().map(String),
  fc.nat({ max: 99_999_999_999 }).map(String),
  fc.constantFrom("", " ", " 5 ", "-1", "1.5", "1e3", "0x10", "NaN", "Infinity"),
  fc.integer(),
  fc.double({ noNaN: false }),
  fc.constantFrom(undefined, null, true, {}, []),
);

const envArb: fc.Arbitrary<Record<string, unknown>> = fc.oneof(
  fc.dictionary(fc.string(), valueArb),
  fc.record(
    { RATE_LIMIT_PER_MINUTE: valueArb, LLM_CALLS_PER_MINUTE: valueArb, LLM_CALLS_PER_DAY: valueArb },
    { requiredKeys: [] },
  ),
);

describe("Feature: analyze-api, Property 9 — Config total and clamped (PBT-46)", () => {
  it("never throws and every value is an integer within bounds", () => {
    fc.assert(
      fc.property(envArb, (env) => {
        const cfg = readApiConfig(env as Record<string, string | undefined>);
        const pairs = [
          [cfg.ratePerMinute, API_CONFIG_LIMITS.ratePerMinute],
          [cfg.llmCallsPerMinute, API_CONFIG_LIMITS.llmCallsPerMinute],
          [cfg.llmCallsPerDay, API_CONFIG_LIMITS.llmCallsPerDay],
        ] as const;
        for (const [value, limits] of pairs) {
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(limits.min);
          expect(value).toBeLessThanOrEqual(limits.max);
        }
      }),
      { numRuns: 200 },
    );
  });

  it("does not throw for non-object env values", () => {
    fc.assert(
      fc.property(fc.anything(), (anything) => {
        const cfg = readApiConfig(anything as Record<string, string | undefined>);
        for (const key of KEYS) void key;
        expect(Number.isInteger(cfg.ratePerMinute)).toBe(true);
        expect(Number.isInteger(cfg.llmCallsPerMinute)).toBe(true);
        expect(Number.isInteger(cfg.llmCallsPerDay)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
