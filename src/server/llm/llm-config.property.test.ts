import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { readLlmConfig, LLM_CONFIG_LIMITS } from "./llm-config";

type Env = Record<string, string | undefined>;

const FAKE_KEY = "fake-key-not-real";
const FAKE_MODEL = "fake-model";
const FAKE_URL = "https://llm.example.test/v1";

const blank = fc.constantFrom("", " ", "   ", "\t", "\n", " \t\n ");

const numericish = fc.oneof(
  fc.string(),
  fc.string({ minLength: 1000, maxLength: 3000 }),
  fc.integer().map(String),
  fc.constantFrom(
    "abc",
    "NaN",
    "Infinity",
    "-5",
    "0",
    "1e9",
    "1.5",
    "0x10",
    "99999999999999999999",
    "",
    "  ",
  ),
  fc.constant(undefined),
);

const llmKeys = [
  "LLM_PROVIDER",
  "LLM_API_KEY",
  "LLM_MODEL",
  "LLM_BASE_URL",
  "LLM_MAX_OUTPUT_TOKENS",
  "LLM_TIMEOUT_MS",
] as const;

function validEnv(extra: Env = {}): Env {
  return {
    LLM_API_KEY: FAKE_KEY,
    LLM_MODEL: FAKE_MODEL,
    LLM_BASE_URL: FAKE_URL,
    ...extra,
  };
}

describe("readLlmConfig properties (PBT-26)", () => {
  /** **Validates: Requirements 7 (PBT-26)** */
  it("never throws for arbitrary dictionaries", () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.constant(undefined))),
        (env) => {
          const result = readLlmConfig(env);
          expect(result === null || typeof result === "object").toBe(true);
        },
      ),
    );
  });

  it("never throws for fc.anything() and LLM-keyed arbitrary values", () => {
    fc.assert(
      fc.property(
        fc.anything(),
        fc.dictionary(fc.constantFrom(...llmKeys), fc.anything()),
        (anything, keyed) => {
          expect(() =>
            readLlmConfig(anything as unknown as Env),
          ).not.toThrow();
          expect(() => readLlmConfig(keyed as unknown as Env)).not.toThrow();
        },
      ),
    );
  });

  it("never throws for huge or non-numeric strings in every field", () => {
    const huge = fc.string({ minLength: 5000, maxLength: 20000 });
    fc.assert(
      fc.property(
        fc.record({
          LLM_PROVIDER: huge,
          LLM_API_KEY: fc.oneof(huge, fc.string()),
          LLM_MODEL: fc.oneof(huge, fc.string()),
          LLM_BASE_URL: fc.oneof(huge, fc.string()),
          LLM_MAX_OUTPUT_TOKENS: numericish,
          LLM_TIMEOUT_MS: numericish,
        }),
        (env) => {
          expect(() => readLlmConfig(env)).not.toThrow();
        },
      ),
      { numRuns: 50 },
    );
  });

  it("missing or blank key gives null", () => {
    fc.assert(
      fc.property(fc.option(blank, { nil: undefined }), (key) => {
        expect(readLlmConfig(validEnv({ LLM_API_KEY: key }))).toBeNull();
      }),
    );
  });

  it("missing or blank model gives null", () => {
    fc.assert(
      fc.property(fc.option(blank, { nil: undefined }), (model) => {
        expect(readLlmConfig(validEnv({ LLM_MODEL: model }))).toBeNull();
      }),
    );
  });

  it("numeric values are within bounds or defaulted", () => {
    const { maxOutputTokens: mo, timeoutMs: to } = LLM_CONFIG_LIMITS;
    fc.assert(
      fc.property(numericish, numericish, (tokens, timeout) => {
        const cfg = readLlmConfig(
          validEnv({
            LLM_MAX_OUTPUT_TOKENS: tokens,
            LLM_TIMEOUT_MS: timeout,
          }),
        );
        expect(cfg).not.toBeNull();
        if (cfg === null) return;
        expect(Number.isInteger(cfg.maxOutputTokens)).toBe(true);
        expect(Number.isInteger(cfg.timeoutMs)).toBe(true);
        expect(cfg.maxOutputTokens).toBeGreaterThanOrEqual(mo.min);
        expect(cfg.maxOutputTokens).toBeLessThanOrEqual(mo.max);
        expect(cfg.timeoutMs).toBeGreaterThanOrEqual(to.min);
        expect(cfg.timeoutMs).toBeLessThanOrEqual(to.max);
        if (tokens === undefined || !/^\s*\d{1,9}\s*$/.test(tokens)) {
          expect(cfg.maxOutputTokens).toBe(mo.default);
        }
        if (timeout === undefined || !/^\s*\d{1,9}\s*$/.test(timeout)) {
          expect(cfg.timeoutMs).toBe(to.default);
        }
      }),
    );
  });
});
