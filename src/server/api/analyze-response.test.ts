import { describe, expect, it } from "vitest";
import { errorResponse, jsonResponse, STATUS_BY_CODE, type ErrorCode } from "./analyze-response";

const CODES: readonly ErrorCode[] = [
  "invalid-content-type",
  "payload-too-large",
  "invalid-input",
  "rate-limited",
  "internal-error",
];

function expectFixedHeaders(res: Response): void {
  expect(res.headers.get("content-type")).toBe("application/json");
  expect(res.headers.get("cache-control")).toBe("no-store");
  expect(res.headers.get("x-content-type-options")).toBe("nosniff");
}

describe("errorResponse", () => {
  it.each(CODES)("%s has the exact body, status and fixed headers", async (code) => {
    const res = errorResponse(code, 5);
    expect(res.status).toBe(STATUS_BY_CODE[code]);
    expect(await res.json()).toEqual({ error: { code } });
    expectFixedHeaders(res);
  });

  it("maps codes to the expected statuses", () => {
    expect(STATUS_BY_CODE).toEqual({
      "invalid-content-type": 415,
      "payload-too-large": 413,
      "invalid-input": 400,
      "rate-limited": 429,
      "internal-error": 500,
    });
  });

  it("body text contains only the code", async () => {
    const res = errorResponse("invalid-input");
    expect(await res.text()).toBe('{"error":{"code":"invalid-input"}}');
  });

  it("never sets CORS headers", () => {
    for (const code of CODES) {
      const res = errorResponse(code, 3);
      for (const name of res.headers.keys()) {
        expect(name.startsWith("access-control-")).toBe(false);
      }
    }
    const ok = jsonResponse({ a: 1 }, 200);
    expect(ok.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("sets Retry-After as a positive integer on 429", () => {
    expect(errorResponse("rate-limited", 12).headers.get("retry-after")).toBe("12");
    expect(errorResponse("rate-limited", 2.2).headers.get("retry-after")).toBe("3");
    expect(errorResponse("rate-limited", 0).headers.get("retry-after")).toBe("1");
    expect(errorResponse("rate-limited", Number.NaN).headers.get("retry-after")).toBe("1");
    expect(errorResponse("rate-limited").headers.get("retry-after")).toBe("1");
  });

  it("omits Retry-After on other codes", () => {
    for (const code of CODES.filter((c) => c !== "rate-limited")) {
      expect(errorResponse(code, 9).headers.get("retry-after")).toBeNull();
    }
  });
});

describe("jsonResponse", () => {
  it("applies fixed headers and they win over extras", () => {
    const res = jsonResponse({ ok: true }, 200, {
      "Content-Type": "text/html",
      "Cache-Control": "public",
      "X-Content-Type-Options": "other",
      "X-Extra": "1",
    });
    expect(res.status).toBe(200);
    expectFixedHeaders(res);
    expect(res.headers.get("x-extra")).toBe("1");
  });
});
