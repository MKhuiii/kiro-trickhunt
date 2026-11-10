import { describe, it, expect, vi } from "vitest";
import { createOpenAiCompatibleClient } from "./openai-compatible-client";
import { LlmClientError } from "./llm-client-error";
import type { LlmConfig } from "./llm-config";

const FAKE_KEY = "fake-key-1234567890";

const config: LlmConfig = {
  apiKey: FAKE_KEY,
  model: "fake-model",
  baseUrl: "https://llm.example.test/v1",
  maxOutputTokens: 123,
  timeoutMs: 50,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function validBody(content: string): unknown {
  return { choices: [{ message: { content } }] };
}

function fakeFetch(
  impl: (url: string, init: RequestInit) => Promise<Response>,
): ReturnType<typeof vi.fn> & typeof fetch {
  return vi.fn(impl) as unknown as ReturnType<typeof vi.fn> & typeof fetch;
}

async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(LlmClientError);
    return (e as LlmClientError).code;
  }
  throw new Error("expected rejection");
}

const req = { system: "SYS prompt", user: "USER text" };

describe("createOpenAiCompatibleClient", () => {
  it("returns trimmed text on 200", async () => {
    const f = fakeFetch(async () => jsonResponse(validBody("  hello \n")));
    const client = createOpenAiCompatibleClient(config, f);
    await expect(client.complete(req)).resolves.toBe("hello");
  });

  it("maps 401 to http-status", async () => {
    const f = fakeFetch(async () => jsonResponse({ error: "no" }, 401));
    const client = createOpenAiCompatibleClient(config, f);
    expect(await codeOf(client.complete(req))).toBe("http-status");
  });

  it.each([
    ["wrong shape", {}],
    ["empty choices", { choices: [] }],
    ["empty content", validBody("")],
    ["whitespace content", validBody("   ")],
    ["non-string content", { choices: [{ message: { content: 5 } }] }],
  ])("maps %s to bad-shape", async (_name, body) => {
    const f = fakeFetch(async () => jsonResponse(body));
    const client = createOpenAiCompatibleClient(config, f);
    expect(await codeOf(client.complete(req))).toBe("bad-shape");
  });

  it("maps a non-JSON body to bad-shape", async () => {
    const f = fakeFetch(async () => new Response("<html>nope</html>", { status: 200 }));
    const client = createOpenAiCompatibleClient(config, f);
    expect(await codeOf(client.complete(req))).toBe("bad-shape");
  });

  it("maps a fetch rejection to network", async () => {
    const f = fakeFetch(async () => {
      throw new TypeError("boom");
    });
    const client = createOpenAiCompatibleClient(config, f);
    expect(await codeOf(client.complete(req))).toBe("network");
  });

  it("maps a never-resolving fetch to timeout", async () => {
    const f = fakeFetch(() => new Promise<Response>(() => undefined));
    const client = createOpenAiCompatibleClient({ ...config, timeoutMs: 20 }, f);
    expect(await codeOf(client.complete(req))).toBe("timeout");
  });

  it("maps a caller abort to network", async () => {
    const f = fakeFetch(() => new Promise<Response>(() => undefined));
    const client = createOpenAiCompatibleClient({ ...config, timeoutMs: 5000 }, f);
    const ac = new AbortController();
    const p = client.complete({ ...req, signal: ac.signal });
    setTimeout(() => ac.abort(), 10);
    expect(await codeOf(p)).toBe("network");
  });

  it("does not call fetch when the signal is already aborted", async () => {
    const f = fakeFetch(async () => jsonResponse(validBody("x")));
    const client = createOpenAiCompatibleClient(config, f);
    const ac = new AbortController();
    ac.abort();
    expect(await codeOf(client.complete({ ...req, signal: ac.signal }))).toBe("network");
    expect(f).not.toHaveBeenCalled();
  });

  it("sends the expected request", async () => {
    const f = fakeFetch(async () => jsonResponse(validBody("ok")));
    const client = createOpenAiCompatibleClient(config, f);
    await client.complete(req);

    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://llm.example.test/v1/chat/completions");
    expect(url).not.toContain(FAKE_KEY);
    expect(init.method).toBe("POST");

    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(`Bearer ${FAKE_KEY}`);
    expect(headers["Content-Type"]).toBe("application/json");

    const rawBody = init.body as string;
    expect(rawBody).not.toContain(FAKE_KEY);
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    expect(body.model).toBe("fake-model");
    expect(body.messages).toEqual([
      { role: "system", content: "SYS prompt" },
      { role: "user", content: "USER text" },
    ]);
    expect(body.temperature).toBe(0);
    expect(body.max_tokens).toBe(123);
    expect(body.stream).toBe(false);
    expect("response_format" in body).toBe(false);
  });
});
