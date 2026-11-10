import { describe, expect, it } from "vitest";
import { LLM_CONFIG_LIMITS, readLlmConfig } from "./llm-config";

const FAKE_KEY = "fake-key-123";

function env(
  overrides: Record<string, string | undefined> = {},
): Record<string, string | undefined> {
  return {
    LLM_API_KEY: FAKE_KEY,
    LLM_MODEL: "fake-model",
    LLM_BASE_URL: "https://llm.example.test/v1",
    ...overrides,
  };
}

describe("readLlmConfig", () => {
  it("returns a config for a valid env with defaults", () => {
    const cfg = readLlmConfig(env());
    expect(cfg).not.toBeNull();
    expect(cfg?.apiKey).toBe(FAKE_KEY);
    expect(cfg?.model).toBe("fake-model");
    expect(cfg?.baseUrl).toBe("https://llm.example.test/v1");
    expect(cfg?.maxOutputTokens).toBe(LLM_CONFIG_LIMITS.maxOutputTokens.default);
    expect(cfg?.timeoutMs).toBe(LLM_CONFIG_LIMITS.timeoutMs.default);
    expect(cfg?.provider).toBeUndefined();
  });

  it("returns null when the key is missing", () => {
    expect(readLlmConfig(env({ LLM_API_KEY: undefined }))).toBeNull();
  });

  it("returns null when the model is missing", () => {
    expect(readLlmConfig(env({ LLM_MODEL: undefined }))).toBeNull();
  });

  it("returns null when the base URL is missing", () => {
    expect(readLlmConfig(env({ LLM_BASE_URL: undefined }))).toBeNull();
  });

  it.each(["LLM_API_KEY", "LLM_MODEL", "LLM_BASE_URL"])(
    "returns null when %s is blank",
    (name) => {
      expect(readLlmConfig(env({ [name]: "   " }))).toBeNull();
      expect(readLlmConfig(env({ [name]: "" }))).toBeNull();
    },
  );

  it("trims surrounding whitespace on required values", () => {
    const cfg = readLlmConfig(
      env({ LLM_API_KEY: ` ${FAKE_KEY} `, LLM_MODEL: " m " }),
    );
    expect(cfg?.apiKey).toBe(FAKE_KEY);
    expect(cfg?.model).toBe("m");
  });

  it.each([
    ["ftp scheme", "ftp://llm.example.test/v1"],
    ["credentials", "https://user:pass@llm.example.test/v1"],
    ["username only", "https://user@llm.example.test/v1"],
    ["plain http remote", "http://llm.example.test/v1"],
    ["query", "https://llm.example.test/v1?x=1"],
    ["empty query", "https://llm.example.test/v1?"],
    ["fragment", "https://llm.example.test/v1#frag"],
    ["not a URL", "not a url"],
  ])("returns null for bad base URL: %s", (_label, url) => {
    expect(readLlmConfig(env({ LLM_BASE_URL: url }))).toBeNull();
  });

  it.each([
    "http://localhost:11434/v1",
    "http://127.0.0.1:8080/v1",
    "http://[::1]:8080/v1",
  ])("accepts local plain http: %s", (url) => {
    const cfg = readLlmConfig(env({ LLM_BASE_URL: url }));
    expect(cfg).not.toBeNull();
    expect(cfg?.baseUrl.startsWith("http://")).toBe(true);
  });

  it("removes trailing slashes from the base URL", () => {
    expect(
      readLlmConfig(env({ LLM_BASE_URL: "https://llm.example.test/v1/" }))
        ?.baseUrl,
    ).toBe("https://llm.example.test/v1");
    expect(
      readLlmConfig(env({ LLM_BASE_URL: "https://llm.example.test///" }))
        ?.baseUrl,
    ).toBe("https://llm.example.test");
  });

  it("keeps apiKey out of JSON.stringify, spread and keys", () => {
    const cfg = readLlmConfig(env());
    expect(cfg).not.toBeNull();
    if (!cfg) return;
    expect(JSON.stringify(cfg)).not.toContain(FAKE_KEY);
    expect(JSON.stringify(cfg)).not.toContain("apiKey");
    expect(Object.keys(cfg)).not.toContain("apiKey");
    expect(JSON.stringify({ ...cfg })).not.toContain(FAKE_KEY);
    expect(cfg.apiKey).toBe(FAKE_KEY);
  });

  it("sets a trimmed, truncated provider label", () => {
    expect(readLlmConfig(env({ LLM_PROVIDER: "  acme  " }))?.provider).toBe(
      "acme",
    );
    const long = "p".repeat(200);
    expect(readLlmConfig(env({ LLM_PROVIDER: long }))?.provider).toHaveLength(
      LLM_CONFIG_LIMITS.providerLabelMaxLength,
    );
    expect(
      readLlmConfig(env({ LLM_PROVIDER: "   " }))?.provider,
    ).toBeUndefined();
  });

  it("returns null for a non-object env without throwing", () => {
    expect(
      readLlmConfig(null as unknown as Record<string, string | undefined>),
    ).toBeNull();
  });

  describe("numeric settings", () => {
    const t = LLM_CONFIG_LIMITS.maxOutputTokens;
    const ms = LLM_CONFIG_LIMITS.timeoutMs;

    it("uses valid in-range values", () => {
      const cfg = readLlmConfig(
        env({ LLM_MAX_OUTPUT_TOKENS: "250", LLM_TIMEOUT_MS: "5000" }),
      );
      expect(cfg?.maxOutputTokens).toBe(250);
      expect(cfg?.timeoutMs).toBe(5000);
    });

    it("clamps to the maximum", () => {
      const cfg = readLlmConfig(
        env({ LLM_MAX_OUTPUT_TOKENS: "999999", LLM_TIMEOUT_MS: "999999" }),
      );
      expect(cfg?.maxOutputTokens).toBe(t.max);
      expect(cfg?.timeoutMs).toBe(ms.max);
    });

    it("clamps to the minimum", () => {
      const cfg = readLlmConfig(
        env({ LLM_MAX_OUTPUT_TOKENS: "0", LLM_TIMEOUT_MS: "1" }),
      );
      expect(cfg?.maxOutputTokens).toBe(t.min);
      expect(cfg?.timeoutMs).toBe(ms.min);
    });

    it.each(["abc", "-5", "1.5", "1e3", "", "  ", "1234567890"])(
      "falls back to defaults for invalid value %j",
      (v) => {
        const cfg = readLlmConfig(
          env({ LLM_MAX_OUTPUT_TOKENS: v, LLM_TIMEOUT_MS: v }),
        );
        expect(cfg?.maxOutputTokens).toBe(t.default);
        expect(cfg?.timeoutMs).toBe(ms.default);
      },
    );
  });
});
