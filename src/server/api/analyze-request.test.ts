import { describe, expect, it } from "vitest";
import { readAnalyzeRequest } from "./analyze-request";
import {
  MAX_BODY_BYTES,
  MAX_TEXT_CHARS,
  MAX_URL_CHARS,
  MAX_URLS_IN,
} from "./api-limits.config";

function makeRequest(
  body: BodyInit | null,
  headers: Record<string, string> = { "content-type": "application/json" },
): Request {
  return new Request("http://localhost/api/analyze", { method: "POST", headers, body });
}

function jsonRequest(value: unknown, contentType = "application/json"): Request {
  return makeRequest(JSON.stringify(value), { "content-type": contentType });
}

async function code(req: Request): Promise<string> {
  const result = await readAnalyzeRequest(req);
  return result.ok ? "ok" : result.code;
}

describe("readAnalyzeRequest content type", () => {
  it("rejects a missing content type with invalid-content-type", async () => {
    expect(await code(makeRequest("{}", {}))).toBe("invalid-content-type");
  });

  it("rejects a non-JSON content type", async () => {
    expect(await code(makeRequest('{"text":"hi"}', { "content-type": "text/plain" }))).toBe(
      "invalid-content-type",
    );
  });

  it("accepts a charset parameter and mixed case", async () => {
    const result = await readAnalyzeRequest(
      jsonRequest({ text: "hello" }, "Application/JSON; charset=utf-8"),
    );
    expect(result).toEqual({ ok: true, input: { text: "hello" } });
  });
});

describe("readAnalyzeRequest size limits", () => {
  it("rejects a declared Content-Length over the limit without reading the body", async () => {
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.close();
      },
    });
    const req = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(MAX_BODY_BYTES + 1),
      },
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(await code(req)).toBe("payload-too-large");
    // The body was never handed to a reader (pull may run once for prefill).
    expect(req.body?.locked).toBe(false);
  });

  it("rejects an undeclared oversized body and stops reading early", async () => {
    const chunk = new Uint8Array(64 * 1024).fill(0x20);
    let pulls = 0;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        if (pulls > 1000) {
          controller.close();
          return;
        }
        controller.enqueue(chunk);
      },
      cancel() {
        cancelled = true;
      },
    });
    const req = new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: stream,
      duplex: "half",
    } as RequestInit);
    expect(await code(req)).toBe("payload-too-large");
    expect(cancelled).toBe(true);
    expect(pulls).toBeLessThan(20);
  });

  it("ignores a non-numeric Content-Length and falls back to the stream cap", async () => {
    const req = makeRequest('{"text":"hi"}', {
      "content-type": "application/json",
      "content-length": "abc",
    });
    expect(await code(req)).toBe("ok");
  });
});

describe("readAnalyzeRequest body decoding", () => {
  it("rejects invalid UTF-8", async () => {
    const bytes = new Uint8Array([0x7b, 0xff, 0xfe, 0x7d]);
    expect(await code(makeRequest(bytes))).toBe("invalid-input");
  });

  it("rejects invalid JSON", async () => {
    expect(await code(makeRequest("{not json"))).toBe("invalid-input");
  });

  it("rejects a missing body", async () => {
    expect(await code(makeRequest(null))).toBe("invalid-input");
  });

  it("rejects an empty body", async () => {
    expect(await code(makeRequest(""))).toBe("invalid-input");
  });
});

describe("readAnalyzeRequest schema", () => {
  it("accepts text only, urls only, and both", async () => {
    expect(await readAnalyzeRequest(jsonRequest({ text: "hi" }))).toEqual({
      ok: true,
      input: { text: "hi" },
    });
    expect(await readAnalyzeRequest(jsonRequest({ urls: ["http://a.example"] }))).toEqual({
      ok: true,
      input: { urls: ["http://a.example"] },
    });
    expect(await readAnalyzeRequest(jsonRequest({ text: "hi", urls: ["x"] }))).toEqual({
      ok: true,
      input: { text: "hi", urls: ["x"] },
    });
  });

  it("rejects unknown keys", async () => {
    expect(await code(jsonRequest({ text: "hi", extra: 1 }))).toBe("invalid-input");
  });

  it.each([
    ["text not a string", { text: 5 }],
    ["urls not an array", { text: "hi", urls: "http://a" }],
    ["url entry not a string", { urls: [1] }],
    ["null body", null],
    ["array body", []],
    ["string body", "hi"],
  ])("rejects wrong types: %s", async (_name, value) => {
    expect(await code(jsonRequest(value))).toBe("invalid-input");
  });

  it("accepts text at the limit and rejects over it", async () => {
    expect(await code(jsonRequest({ text: "a".repeat(MAX_TEXT_CHARS) }))).toBe("ok");
    expect(await code(jsonRequest({ text: "a".repeat(MAX_TEXT_CHARS + 1) }))).toBe(
      "invalid-input",
    );
  });

  it("accepts urls at the limits and rejects over them", async () => {
    const okUrls = Array.from({ length: MAX_URLS_IN }, () => "u".repeat(MAX_URL_CHARS));
    expect(await code(jsonRequest({ urls: okUrls }))).toBe("ok");
    expect(await code(jsonRequest({ urls: [...okUrls, "x"] }))).toBe("invalid-input");
    expect(await code(jsonRequest({ urls: ["u".repeat(MAX_URL_CHARS + 1)] }))).toBe(
      "invalid-input",
    );
  });

  it("rejects blank text with no urls", async () => {
    expect(await code(jsonRequest({ text: "   \n\t " }))).toBe("invalid-input");
    expect(await code(jsonRequest({ text: "" }))).toBe("invalid-input");
    expect(await code(jsonRequest({ urls: [] }))).toBe("invalid-input");
    expect(await code(jsonRequest({ text: "  ", urls: [] }))).toBe("invalid-input");
    expect(await code(jsonRequest({}))).toBe("invalid-input");
  });

  it("accepts blank text when urls are present", async () => {
    expect(await code(jsonRequest({ text: "  ", urls: ["http://a.example"] }))).toBe("ok");
  });
});

describe("readAnalyzeRequest locale", () => {
  it.each(["vi", "en"])("accepts locale %s and keeps it in the input", async (locale) => {
    expect(await readAnalyzeRequest(jsonRequest({ text: "hi", locale }))).toEqual({
      ok: true,
      input: { text: "hi", locale },
    });
    expect(
      await readAnalyzeRequest(jsonRequest({ urls: ["http://a.example"], locale })),
    ).toEqual({ ok: true, input: { urls: ["http://a.example"], locale } });
  });

  it.each([
    ["fr", "fr"],
    ["uppercase VI", "VI"],
    ["null", null],
    ["number", 1],
    ["empty string", ""],
  ])("rejects invalid locale: %s", async (_name, locale) => {
    expect(await code(jsonRequest({ text: "hi", locale }))).toBe("invalid-input");
  });

  it.each(["vi", "en"])("rejects a body with only locale %s", async (locale) => {
    expect(await code(jsonRequest({ locale }))).toBe("invalid-input");
  });

  it("still rejects unknown keys next to a valid locale", async () => {
    expect(await code(jsonRequest({ text: "hi", locale: "en", extra: 1 }))).toBe(
      "invalid-input",
    );
  });
});
