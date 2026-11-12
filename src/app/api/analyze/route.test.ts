import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const LLM_ENV_KEYS = [
  "LLM_PROVIDER",
  "LLM_API_KEY",
  "LLM_MODEL",
  "LLM_BASE_URL",
  "LLM_MAX_OUTPUT_TOKENS",
  "LLM_TIMEOUT_MS",
] as const;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Blank values are treated as missing, so no LLM client is created.
  for (const key of LLM_ENV_KEYS) vi.stubEnv(key, "");
  fetchMock = vi.fn(() => {
    throw new Error("network must not be used");
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("route module wiring", () => {
  // Validates: REQ-API-02, REQ-API-06
  it("exports exactly POST, runtime, dynamic and maxDuration with expected values", async () => {
    const mod = await import("./route");

    expect(Object.keys(mod).sort()).toEqual(
      ["POST", "dynamic", "maxDuration", "runtime"].sort(),
    );
    expect(typeof mod.POST).toBe("function");
    expect(mod.runtime).toBe("nodejs");
    expect(mod.dynamic).toBe("force-dynamic");
    expect(mod.maxDuration).toBe(15);
  });
});

describe("createDefaultAnalyzeHandler", () => {
  // Validates: REQ-API-02, REQ-API-30
  it("returns 200 with semanticMode not-configured when no LLM env is set", async () => {
    const { createDefaultAnalyzeHandler } = await import("../../../server/api");
    const handler = createDefaultAnalyzeHandler();

    const res = await handler(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: "Your bank account is locked. Click the link to verify now.",
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      verdict?: unknown;
      meta?: { semanticMode: string };
    };
    expect(body.verdict).toBeDefined();
    expect(body.meta).toEqual({ semanticMode: "not-configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
