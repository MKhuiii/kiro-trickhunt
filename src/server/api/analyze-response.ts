/**
 * Response builders for POST /api/analyze (REQ-API-16 to REQ-API-19).
 * Error bodies carry a fixed code only. No CORS headers are ever set.
 */

export type ErrorCode =
  | "invalid-content-type"
  | "payload-too-large"
  | "invalid-input"
  | "rate-limited"
  | "internal-error";

export const STATUS_BY_CODE: Readonly<Record<ErrorCode, 400 | 413 | 415 | 429 | 500>> = {
  "invalid-content-type": 415,
  "payload-too-large": 413,
  "invalid-input": 400,
  "rate-limited": 429,
  "internal-error": 500,
};

/** Fixed headers applied to every response. */
const FIXED_HEADERS: Readonly<Record<string, string>> = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function buildHeaders(extra?: Readonly<Record<string, string>>): Headers {
  const headers = new Headers(FIXED_HEADERS);
  if (extra) {
    for (const [name, value] of Object.entries(extra)) {
      headers.set(name, value);
    }
  }
  // Fixed headers always win over extras.
  for (const [name, value] of Object.entries(FIXED_HEADERS)) {
    headers.set(name, value);
  }
  return headers;
}

/** JSON response with the fixed header set. */
export function jsonResponse(
  body: unknown,
  status: number,
  extraHeaders?: Readonly<Record<string, string>>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: buildHeaders(extraHeaders),
  });
}

/**
 * Error response with the exact body `{ "error": { "code": <code> } }`.
 * For 429, `retryAfterSec` becomes a positive integer `Retry-After` header.
 */
export function errorResponse(code: ErrorCode, retryAfterSec?: number): Response {
  const extra: Record<string, string> = {};
  if (code === "rate-limited") {
    const seconds =
      typeof retryAfterSec === "number" && Number.isFinite(retryAfterSec)
        ? Math.max(1, Math.ceil(retryAfterSec))
        : 1;
    extra["Retry-After"] = String(seconds);
  }
  return jsonResponse({ error: { code } }, STATUS_BY_CODE[code], extra);
}
