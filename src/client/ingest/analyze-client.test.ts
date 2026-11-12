import { describe, expect, it } from "vitest";
import { analyzeRequest, type AnalyzeClientDeps, type ResponseLike } from "./analyze-client";
import { DEFAULT_RETRY_AFTER_SEC, MAX_RETRY_AFTER_SEC } from "./ingest.config";
import type { AnalyzeRequest } from "./types";

const VERDICT = { riskScore: 0.5, level: "suspicious", signals: [] };
const OK_BODY = { verdict: VERDICT, meta: { semanticMode: "used" } };

function response(status: number, body: unknown, retryAfter?: string): ResponseLike {
  return {
    status,
    headers: { get: (n) => (n.toLowerCase() === "retry-after" ? (retryAfter ?? null) : null) },
    json: async () => body,
  };
}

function depsFor(res: ResponseLike): AnalyzeClientDeps {
  return { fetch: async () => res };
}

const REQ: AnalyzeRequest = { text: "hello", urls: ["https://a.example"] };

describe("analyzeRequest", () => {
  it("returns verdict and semanticMode on success", async () => {
    const r = await analyzeRequest(REQ, depsFor(response(200, OK_BODY)));
    expect(r).toEqual({ ok: true, verdict: VERDICT, semanticMode: "used" });
  });

  it.each([
    [400, "invalid-input"],
    [413, "payload-too-large"],
    [415, "invalid-content-type"],
    [500, "internal-error"],
  ])("maps status %i to %s", async (status, code) => {
    const r = await analyzeRequest(REQ, depsFor(response(status, null)));
    expect(r).toEqual({ ok: false, code });
  });

  it.each([
    ["12", 12],
    [undefined, DEFAULT_RETRY_AFTER_SEC],
    ["abc", DEFAULT_RETRY_AFTER_SEC],
    ["99999", MAX_RETRY_AFTER_SEC],
  ])("429 with Retry-After %s gives %i", async (header, expected) => {
    const r = await analyzeRequest(REQ, depsFor(response(429, null, header)));
    expect(r).toEqual({ ok: false, code: "rate-limited", retryAfterSec: expected });
  });

  it("uses the body error code when it is a known code", async () => {
    const r = await analyzeRequest(REQ, depsFor(response(400, { error: { code: "payload-too-large" } })));
    expect(r).toEqual({ ok: false, code: "payload-too-large" });
  });

  it("falls back to the status for an unknown body code", async () => {
    const r = await analyzeRequest(REQ, depsFor(response(400, { error: { code: "weird" } })));
    expect(r).toEqual({ ok: false, code: "invalid-input" });
  });

  it("maps 502 to unexpected-status", async () => {
    const r = await analyzeRequest(REQ, depsFor(response(502, null)));
    expect(r).toEqual({ ok: false, code: "unexpected-status" });
  });

  it("maps a throwing fetch to network-error", async () => {
    const r = await analyzeRequest(REQ, {
      fetch: () => {
        throw new Error("boom");
      },
    });
    expect(r).toEqual({ ok: false, code: "network-error" });
  });

  it("maps a rejecting fetch to network-error", async () => {
    const r = await analyzeRequest(REQ, { fetch: () => Promise.reject(new Error("x")) });
    expect(r).toEqual({ ok: false, code: "network-error" });
  });

  it("returns timeout when fetch ignores the abort", async () => {
    const r = await analyzeRequest(REQ, { fetch: () => new Promise(() => undefined), timeoutMs: 10 });
    expect(r).toEqual({ ok: false, code: "timeout" });
  });

  it.each([
    ["non-object", "nope"],
    ["missing verdict", { meta: { semanticMode: "used" } }],
    ["bad level", { verdict: { ...VERDICT, level: "safe" }, meta: { semanticMode: "used" } }],
    ["bad mode", { verdict: VERDICT, meta: { semanticMode: "other" } }],
    ["non-finite score", { verdict: { ...VERDICT, riskScore: "1" }, meta: { semanticMode: "used" } }],
    ["signals not array", { verdict: { ...VERDICT, signals: {} }, meta: { semanticMode: "used" } }],
  ])("200 with malformed body (%s) gives bad-response", async (_n, body) => {
    const r = await analyzeRequest(REQ, depsFor(response(200, body)));
    expect(r).toEqual({ ok: false, code: "bad-response" });
  });

  it("200 with unparsable JSON gives bad-response", async () => {
    const res: ResponseLike = {
      status: 200,
      headers: { get: () => null },
      json: async () => {
        throw new SyntaxError("bad");
      },
    };
    expect(await analyzeRequest(REQ, depsFor(res))).toEqual({ ok: false, code: "bad-response" });
  });

  it("sends the fixed request options", async () => {
    let url = "";
    let init: RequestInit | undefined;
    await analyzeRequest(REQ, {
      fetch: async (u, i) => {
        url = u;
        init = i;
        return response(200, OK_BODY);
      },
    });
    expect(url).toBe("/api/analyze");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(init?.credentials).toBe("same-origin");
    expect(init?.cache).toBe("no-store");
    expect(init?.referrerPolicy).toBe("no-referrer");
    expect(JSON.parse(String(init?.body))).toEqual({ text: "hello", urls: ["https://a.example"] });
  });

  it("sends only text and urls when the input has extra properties", async () => {
    let body = "";
    const input = { text: "t", urls: ["https://b.example"], image: "BYTES", extra: 1 };
    await analyzeRequest(input as unknown as AnalyzeRequest, {
      fetch: async (_u, i) => {
        body = String(i.body);
        return response(200, OK_BODY);
      },
    });
    expect(Object.keys(JSON.parse(body)).sort()).toEqual(["text", "urls"]);
    expect(body).not.toContain("BYTES");
  });
});
