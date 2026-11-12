/**
 * analyze-client.ts — the only client file that calls `fetch` (REQ-CI-44).
 * Sends text and links only; never returns response text. Never rejects.
 */

import type { Verdict } from "../../pipeline/verdict";
import {
  ANALYZE_ENDPOINT,
  ANALYZE_TIMEOUT_MS,
  DEFAULT_RETRY_AFTER_SEC,
  MAX_RETRY_AFTER_SEC,
} from "./ingest.config";
import type { AnalyzeRequest } from "./types";

export type AnalyzeClientCode =
  | "invalid-input"
  | "payload-too-large"
  | "invalid-content-type"
  | "rate-limited"
  | "internal-error"
  | "network-error"
  | "timeout"
  | "bad-response"
  | "unexpected-status";

export type SemanticMode = "used" | "budget-exhausted" | "not-configured";

export type AnalyzeClientResult =
  | { ok: true; verdict: Verdict; semanticMode: SemanticMode }
  | { ok: false; code: AnalyzeClientCode; retryAfterSec?: number };

export interface ResponseLike {
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
}

export interface AnalyzeClientDeps {
  fetch(input: string, init: RequestInit): Promise<ResponseLike>;
  timeoutMs?: number;
}

// Copied from the server's fixed error codes; server code is never imported.
const API_ERROR_CODES: readonly AnalyzeClientCode[] = [
  "invalid-content-type",
  "payload-too-large",
  "invalid-input",
  "rate-limited",
  "internal-error",
];

const CODE_BY_STATUS: Readonly<Record<number, AnalyzeClientCode>> = {
  400: "invalid-input",
  413: "payload-too-large",
  415: "invalid-content-type",
  429: "rate-limited",
  500: "internal-error",
};

const LEVELS: readonly string[] = ["no_signals", "suspicious", "high", "critical"];
const MODES: readonly string[] = ["used", "budget-exhausted", "not-configured"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function defaultDeps(): AnalyzeClientDeps {
  return {
    fetch: (input, init) =>
      (globalThis.fetch as unknown as AnalyzeClientDeps["fetch"])(input, init),
  };
}

function buildBody(request: unknown): string {
  const body: { text?: string; urls?: string[] } = {};
  if (isRecord(request)) {
    const text = request.text;
    if (typeof text === "string") body.text = text;
    const urls = request.urls;
    if (Array.isArray(urls)) {
      body.urls = urls.filter((u): u is string => typeof u === "string");
    }
  }
  return JSON.stringify(body);
}

function parseRetryAfter(raw: string | null): number {
  if (typeof raw !== "string" || !/^\d{1,9}$/.test(raw)) return DEFAULT_RETRY_AFTER_SEC;
  const n = Number(raw);
  return Math.min(MAX_RETRY_AFTER_SEC, Math.max(1, n));
}

async function readJson(response: ResponseLike): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function errorResult(status: number, body: unknown, response: ResponseLike): AnalyzeClientResult {
  let code: AnalyzeClientCode | undefined;
  if (isRecord(body) && isRecord(body.error)) {
    const c = body.error.code;
    if (typeof c === "string") {
      code = API_ERROR_CODES.find((known) => known === c);
    }
  }
  code ??= CODE_BY_STATUS[status];
  if (code === undefined) return { ok: false, code: "unexpected-status" };
  if (status === 429) {
    let header: string | null = null;
    try {
      header = response.headers.get("Retry-After");
    } catch {
      header = null;
    }
    return { ok: false, code, retryAfterSec: parseRetryAfter(header) };
  }
  return { ok: false, code };
}

function okResult(body: unknown): AnalyzeClientResult {
  if (!isRecord(body)) return { ok: false, code: "bad-response" };
  const verdict = body.verdict;
  const meta = body.meta;
  if (
    !isRecord(verdict) ||
    typeof verdict.riskScore !== "number" ||
    !Number.isFinite(verdict.riskScore) ||
    typeof verdict.level !== "string" ||
    !LEVELS.includes(verdict.level) ||
    !Array.isArray(verdict.signals) ||
    !isRecord(meta) ||
    typeof meta.semanticMode !== "string" ||
    !MODES.includes(meta.semanticMode)
  ) {
    return { ok: false, code: "bad-response" };
  }
  return {
    ok: true,
    verdict: verdict as unknown as Verdict,
    semanticMode: meta.semanticMode as SemanticMode,
  };
}

export async function analyzeRequest(
  request: AnalyzeRequest,
  deps?: AnalyzeClientDeps,
): Promise<AnalyzeClientResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  try {
    const d = deps ?? defaultDeps();
    const timeoutMs =
      typeof d.timeoutMs === "number" && Number.isFinite(d.timeoutMs) && d.timeoutMs >= 0
        ? d.timeoutMs
        : ANALYZE_TIMEOUT_MS;

    const timeoutPromise = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => {
        resolve("timeout");
        try {
          controller.abort();
        } catch {
          // ignore
        }
      }, timeoutMs);
    });

    const work = (async (): Promise<AnalyzeClientResult> => {
      let response: ResponseLike;
      try {
        response = await d.fetch(ANALYZE_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: buildBody(request),
          credentials: "same-origin",
          cache: "no-store",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
        });
      } catch {
        return { ok: false, code: "network-error" };
      }
      const status = response.status;
      const body = await readJson(response);
      if (status === 200) return okResult(body);
      return errorResult(status, body, response);
    })();
    // Avoid unhandled rejections if the timeout wins.
    work.catch(() => undefined);

    const winner = await Promise.race([work, timeoutPromise]);
    if (winner === "timeout") return { ok: false, code: "timeout" };
    return winner;
  } catch {
    return { ok: false, code: "network-error" };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
