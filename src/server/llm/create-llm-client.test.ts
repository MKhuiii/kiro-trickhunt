import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createLlmClient } from "./create-llm-client";
import { analyzeSemantic } from "../../analyzers/semantic-analyzer";

const VALID_ENV = {
  LLM_API_KEY: "fake-key-for-tests",
  LLM_MODEL: "fake-model",
  LLM_BASE_URL: "https://llm.example.test/v1",
};

function neverCalledFetch() {
  return vi.fn(async () => {
    throw new Error("fetch must not be called");
  });
}

describe("createLlmClient", () => {
  it("returns null without a key", () => {
    const { LLM_API_KEY: _omit, ...env } = VALID_ENV;
    void _omit;
    expect(createLlmClient(env, neverCalledFetch() as unknown as typeof fetch)).toBeNull();
  });

  it("returns null without a model", () => {
    const { LLM_MODEL: _omit, ...env } = VALID_ENV;
    void _omit;
    expect(createLlmClient(env, neverCalledFetch() as unknown as typeof fetch)).toBeNull();
  });

  it("returns null without a base URL", () => {
    const { LLM_BASE_URL: _omit, ...env } = VALID_ENV;
    void _omit;
    expect(createLlmClient(env, neverCalledFetch() as unknown as typeof fetch)).toBeNull();
  });

  it("returns a client with complete config and does not call fetch at creation", () => {
    const fetchImpl = neverCalledFetch();
    const client = createLlmClient(VALID_ENV, fetchImpl as unknown as typeof fetch);
    expect(client).not.toBeNull();
    expect(typeof client?.complete).toBe("function");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("createLlmClient chained with analyzeSemantic", () => {
  const TEXT = "Your account is locked, act now";

  it("gives status ok for a 200 response with valid signals JSON", async () => {
    const content = JSON.stringify({
      signals: [
        {
          id: "semantic.pressure-escalation",
          severity: 0.4,
          evidence: "act now",
        },
      ],
    });
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const client = createLlmClient(VALID_ENV, fetchImpl as unknown as typeof fetch);
    expect(client).not.toBeNull();
    const result = await analyzeSemantic(TEXT, client!);
    expect(result.status).toBe("ok");
    expect(result.signals.map((s) => s.id)).toEqual([
      "semantic.pressure-escalation",
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("gives degraded/client-error for a 500 response", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("server error", { status: 500 }),
    );
    const client = createLlmClient(VALID_ENV, fetchImpl as unknown as typeof fetch);
    expect(client).not.toBeNull();
    const result = await analyzeSemantic(TEXT, client!);
    expect(result.status).toBe("degraded");
    expect(result.reason).toBe("client-error");
    expect(result.signals).toEqual([]);
  });
});

describe(".env.example", () => {
  const content = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");

  it("defines all six LLM keys", () => {
    const keys = new Set(
      content
        .split(/\r?\n/)
        .map((line) => /^\s*([A-Z][A-Z0-9_]*)\s*=/.exec(line)?.[1])
        .filter((k): k is string => k !== undefined),
    );
    for (const key of [
      "LLM_PROVIDER",
      "LLM_API_KEY",
      "LLM_MODEL",
      "LLM_BASE_URL",
      "LLM_MAX_OUTPUT_TOKENS",
      "LLM_TIMEOUT_MS",
    ]) {
      expect(keys.has(key)).toBe(true);
    }
    expect(keys.size).toBe(6);
  });

  it("never sets a NEXT_PUBLIC_ variable", () => {
    const assigned = content
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("#"));
    expect(assigned.join("\n")).not.toContain("NEXT_PUBLIC_");
  });
});
