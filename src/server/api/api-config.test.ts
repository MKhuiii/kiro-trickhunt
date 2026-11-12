import { describe, expect, it } from "vitest";

import {
  MAX_BODY_BYTES,
  MAX_TEXT_CHARS,
  MAX_URLS_IN,
  MAX_URL_CHARS,
} from "./api-limits.config";
import { API_CONFIG_LIMITS, readApiConfig } from "./api-config";
import {
  MAX_TEXT_CHARS as PIPELINE_MAX_TEXT_CHARS,
  MAX_URL_CHARS as PIPELINE_MAX_URL_CHARS,
} from "../../pipeline/pipeline.config";

const DEFAULTS = {
  ratePerMinute: API_CONFIG_LIMITS.ratePerMinute.default,
  llmCallsPerMinute: API_CONFIG_LIMITS.llmCallsPerMinute.default,
  llmCallsPerDay: API_CONFIG_LIMITS.llmCallsPerDay.default,
};

describe("readApiConfig", () => {
  it("returns defaults on an empty env", () => {
    expect(readApiConfig({})).toEqual(DEFAULTS);
  });

  it("reads valid decimal values", () => {
    expect(
      readApiConfig({
        RATE_LIMIT_PER_MINUTE: "20",
        LLM_CALLS_PER_MINUTE: "5",
        LLM_CALLS_PER_DAY: "300",
      }),
    ).toEqual({ ratePerMinute: 20, llmCallsPerMinute: 5, llmCallsPerDay: 300 });
  });

  it("gives defaults for blank and non-decimal values", () => {
    for (const bad of ["", "   ", "abc", "1.5", "-3", "0x10", "1e3", "+5", "NaN"]) {
      expect(
        readApiConfig({
          RATE_LIMIT_PER_MINUTE: bad,
          LLM_CALLS_PER_MINUTE: bad,
          LLM_CALLS_PER_DAY: bad,
        }),
      ).toEqual(DEFAULTS);
    }
  });

  it("gives defaults for non-string values and a non-object env", () => {
    const weird = { RATE_LIMIT_PER_MINUTE: 5, LLM_CALLS_PER_MINUTE: null };
    expect(
      readApiConfig(weird as unknown as Record<string, string | undefined>),
    ).toEqual(DEFAULTS);
    expect(
      readApiConfig(null as unknown as Record<string, string | undefined>),
    ).toEqual(DEFAULTS);
  });

  it("clamps huge values to the max", () => {
    expect(
      readApiConfig({
        RATE_LIMIT_PER_MINUTE: "999999999",
        LLM_CALLS_PER_MINUTE: "999999",
        LLM_CALLS_PER_DAY: "123456789",
      }),
    ).toEqual({
      ratePerMinute: API_CONFIG_LIMITS.ratePerMinute.max,
      llmCallsPerMinute: API_CONFIG_LIMITS.llmCallsPerMinute.max,
      llmCallsPerDay: API_CONFIG_LIMITS.llmCallsPerDay.max,
    });
  });

  it("gives defaults for values with more than 9 digits", () => {
    const huge = "9".repeat(50);
    expect(
      readApiConfig({
        RATE_LIMIT_PER_MINUTE: huge,
        LLM_CALLS_PER_MINUTE: huge,
        LLM_CALLS_PER_DAY: huge,
      }),
    ).toEqual(DEFAULTS);
  });

  it("clamps the rate limit up to its minimum of 1", () => {
    expect(readApiConfig({ RATE_LIMIT_PER_MINUTE: "0" }).ratePerMinute).toBe(
      API_CONFIG_LIMITS.ratePerMinute.min,
    );
  });

  it("allows a zero LLM limit", () => {
    const cfg = readApiConfig({
      LLM_CALLS_PER_MINUTE: "0",
      LLM_CALLS_PER_DAY: "0",
    });
    expect(cfg.llmCallsPerMinute).toBe(0);
    expect(cfg.llmCallsPerDay).toBe(0);
  });

  it("trims surrounding whitespace", () => {
    expect(readApiConfig({ RATE_LIMIT_PER_MINUTE: " 7 " }).ratePerMinute).toBe(7);
  });
});

describe("api limits", () => {
  it("MAX_BODY_BYTES covers the worst-case JSON-encoded body", () => {
    expect(MAX_BODY_BYTES).toBeGreaterThanOrEqual(
      6 * (MAX_TEXT_CHARS + MAX_URLS_IN * MAX_URL_CHARS) + 1024,
    );
  });

  it("text and URL limits equal the pipeline values", () => {
    expect(MAX_TEXT_CHARS).toBe(PIPELINE_MAX_TEXT_CHARS);
    expect(MAX_URL_CHARS).toBe(PIPELINE_MAX_URL_CHARS);
  });
});
