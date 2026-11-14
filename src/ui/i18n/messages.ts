import type {
  AnalyzeClientCode,
  BuildNoticeKind,
  IngestErrorCode,
  IngestNotice,
} from "../../client/ingest";
import {
  DEFAULT_RETRY_AFTER_SEC,
  MAX_IMAGE_BYTES,
  MAX_RETRY_AFTER_SEC,
} from "../../client/ingest/ingest.config";
import type { MessageKey } from "./en";

type Params = Readonly<Record<string, string | number>>;

export type MessageRef = {
  key: MessageKey;
  params: Record<string, string | number>;
  technicalCode: string;
};

/** Every notice kind the UI can show. `urls-skipped` is raised by the UI from a count. */
export type NoticeKind = BuildNoticeKind | IngestNotice["kind"] | "urls-skipped";

const ANALYZE_KEYS: Record<AnalyzeClientCode, MessageKey> = {
  "invalid-input": "error.analyze.invalid-input",
  "payload-too-large": "error.analyze.payload-too-large",
  "invalid-content-type": "error.analyze.invalid-content-type",
  "rate-limited": "error.analyze.rate-limited",
  "internal-error": "error.analyze.internal-error",
  "network-error": "error.analyze.network-error",
  timeout: "error.analyze.timeout",
  "bad-response": "error.analyze.bad-response",
  "unexpected-status": "error.analyze.unexpected-status",
};

const INGEST_KEYS: Record<IngestErrorCode, MessageKey> = {
  "unsupported-type": "error.ingest.unsupported-type",
  "invalid-size": "error.ingest.invalid-size",
  "file-too-large": "error.ingest.file-too-large",
  "decode-failed": "error.ingest.decode-failed",
  "too-many-pixels": "error.ingest.too-many-pixels",
  "canvas-unavailable": "error.ingest.canvas-unavailable",
  "ocr-engine-unavailable": "error.ingest.ocr-engine-unavailable",
  "ocr-timeout": "error.ingest.ocr-timeout",
  "ocr-aborted": "error.ingest.ocr-aborted",
  "ocr-failed": "error.ingest.ocr-failed",
  "qr-engine-unavailable": "error.ingest.qr-engine-unavailable",
  "qr-decode-failed": "error.ingest.qr-decode-failed",
  unexpected: "error.ingest.unexpected",
};

const NOTICE_KEYS: Record<NoticeKind, MessageKey> = {
  "ocr-skipped": "notice.ocr-skipped",
  "ocr-too-poor": "notice.ocr-too-poor",
  "ocr-failed": "notice.ocr-failed",
  "payment-qr": "notice.payment-qr",
  "wifi-qr": "notice.wifi-qr",
  "no-url": "notice.no-url",
  "text-truncated": "notice.text-truncated",
  "urls-skipped": "notice.urls-skipped",
};

const BYTES_PER_MB = 1024 * 1024;

function lookup<C extends string>(
  table: Readonly<Record<C, MessageKey>>,
  code: unknown,
): { key: MessageKey; code: C } | null {
  if (typeof code !== "string" || !Object.hasOwn(table, code)) return null;
  return { key: table[code as C], code: code as C };
}

function retrySeconds(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_RETRY_AFTER_SEC;
  return Math.min(MAX_RETRY_AFTER_SEC, Math.max(1, Math.ceil(value)));
}

export function analyzeErrorMessage(code: unknown, retryAfterSec?: unknown): MessageRef {
  const hit = lookup(ANALYZE_KEYS, code);
  if (!hit) return { key: "error.generic", params: {}, technicalCode: "unknown" };
  const params: Params =
    hit.code === "rate-limited" ? { seconds: retrySeconds(retryAfterSec) } : {};
  return { key: hit.key, params: { ...params }, technicalCode: hit.code };
}

export function ingestErrorMessage(code: unknown): MessageRef {
  const hit = lookup(INGEST_KEYS, code);
  if (!hit) return { key: "error.generic", params: {}, technicalCode: "unknown" };
  const params: Params =
    hit.code === "file-too-large" ? { maxMb: Math.floor(MAX_IMAGE_BYTES / BYTES_PER_MB) } : {};
  return { key: hit.key, params: { ...params }, technicalCode: hit.code };
}

export function noticeMessage(kind: unknown, params?: { count?: number }): MessageRef {
  const hit = lookup(NOTICE_KEYS, kind);
  if (!hit) return { key: "notice.generic", params: {}, technicalCode: "unknown" };
  const out: Record<string, string | number> = {};
  if (hit.code === "urls-skipped") {
    const count = params?.count;
    out.count = typeof count === "number" && Number.isFinite(count) ? count : 0;
  }
  return { key: hit.key, params: out, technicalCode: hit.code };
}
