import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { readReputationConfig } from "./reputation-config";
import { REPUTATION_CONFIG_LIMITS } from "./reputation.config";

// Feature: link-reputation-check, Property 126: config is total and bounded
// **Validates: Requirements REQ-LREP-59, REQ-LREP-60, REQ-LREP-61, REQ-LREP-62, REQ-LREP-63**

const L = REPUTATION_CONFIG_LIMITS;
const NUMERIC_KEYS = [
  ["LINK_REPUTATION_TIMEOUT_MS", "timeoutMs"],
  ["LINK_REPUTATION_CALLS_PER_MINUTE", "callsPerMinute"],
  ["LINK_REPUTATION_CALLS_PER_DAY", "callsPerDay"],
] as const;

const RUNS = { numRuns: 200 };

function expectedNumber(
  value: unknown,
  limits: { readonly default: number; readonly min: number; readonly max: number },
): number {
  if (typeof value !== "string") return limits.default;
  const trimmed = value.trim();
  if (!/^[0-9]+$/.test(trimmed)) return limits.default;
  const n = BigInt(trimmed);
  if (n < BigInt(limits.min)) return limits.min;
  if (n > BigInt(limits.max)) return limits.max;
  return Number(n);
}

const digitsArb = fc
  .array(fc.constantFrom(..."0123456789".split("")), { minLength: 1, maxLength: 40 })
  .map((a) => a.join(""));
const spaceArb = fc.constantFrom("", " ", "\t", "  ", "\n");
const decimalArb = fc
  .tuple(spaceArb, digitsArb, spaceArb)
  .map(([a, d, b]) => `${a}${d}${b}`);
const blankArb = fc.constantFrom("", " ", "   ", "\t", "\n ");
const settingValueArb: fc.Arbitrary<unknown> = fc.oneof(
  decimalArb,
  blankArb,
  fc.string(),
  fc.constantFrom("-5", "1.5", "1e3", "0x10", "+7", "٣", "NaN", "Infinity"),
  fc.integer(),
  fc.constant(undefined),
  fc.constant(null),
  fc.anything(),
);

const envArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.record(
    {
      LINK_REPUTATION_API_KEY: settingValueArb,
      LINK_REPUTATION_TIMEOUT_MS: settingValueArb,
      LINK_REPUTATION_CALLS_PER_MINUTE: settingValueArb,
      LINK_REPUTATION_CALLS_PER_DAY: settingValueArb,
    },
    { requiredKeys: [] },
  ),
  fc.dictionary(fc.string(), fc.anything()),
  fc.anything(),
  fc.constantFrom(undefined, null, 0, "text", [] as unknown[]),
);

describe("Feature: link-reputation-check, Property 126: config is total and bounded", () => {
  it("never throws and returns integers within bounds for arbitrary env input", () => {
    fc.assert(
      fc.property(envArb, (env) => {
        const config = readReputationConfig(env as Record<string, string | undefined>);
        for (const [, field] of NUMERIC_KEYS) {
          const v = config[field];
          expect(Number.isInteger(v)).toBe(true);
          expect(v).toBeGreaterThanOrEqual(L[field].min);
          expect(v).toBeLessThanOrEqual(L[field].max);
        }
        expect(["ready", "not-configured", "off"]).toContain(config.state);
      }),
      RUNS,
    );
  });

  it("uses the default for non-decimal input and clamps valid decimals, including huge ones", () => {
    fc.assert(
      fc.property(
        settingValueArb,
        settingValueArb,
        settingValueArb,
        (timeout, perMinute, perDay) => {
          const config = readReputationConfig({
            LINK_REPUTATION_API_KEY: "key",
            LINK_REPUTATION_TIMEOUT_MS: timeout,
            LINK_REPUTATION_CALLS_PER_MINUTE: perMinute,
            LINK_REPUTATION_CALLS_PER_DAY: perDay,
          } as unknown as Record<string, string | undefined>);
          expect(config.timeoutMs).toBe(expectedNumber(timeout, L.timeoutMs));
          expect(config.callsPerMinute).toBe(expectedNumber(perMinute, L.callsPerMinute));
          expect(config.callsPerDay).toBe(expectedNumber(perDay, L.callsPerDay));
        },
      ),
      RUNS,
    );
  });

  it("missing, blank or non-string key means not-configured; a real key never does", () => {
    const badKeyArb: fc.Arbitrary<unknown> = fc.oneof(
      blankArb,
      fc.constant(undefined),
      fc.constant(null),
      fc.integer(),
      fc.boolean(),
      fc.array(fc.string()),
    );
    fc.assert(
      fc.property(badKeyArb, settingValueArb, (key, num) => {
        const config = readReputationConfig({
          LINK_REPUTATION_API_KEY: key,
          LINK_REPUTATION_CALLS_PER_MINUTE: num,
        } as unknown as Record<string, string | undefined>);
        expect(config.state).toBe("not-configured");
        expect(config.apiKey).toBe("");
      }),
      RUNS,
    );
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim() !== ""),
        settingValueArb,
        settingValueArb,
        (key, perMinute, perDay) => {
          const config = readReputationConfig({
            LINK_REPUTATION_API_KEY: key,
            LINK_REPUTATION_CALLS_PER_MINUTE: perMinute,
            LINK_REPUTATION_CALLS_PER_DAY: perDay,
          } as unknown as Record<string, string | undefined>);
          expect(config.state).not.toBe("not-configured");
          const zero = config.callsPerMinute === 0 || config.callsPerDay === 0;
          expect(config.state).toBe(zero ? "off" : "ready");
        },
      ),
      RUNS,
    );
  });
});
