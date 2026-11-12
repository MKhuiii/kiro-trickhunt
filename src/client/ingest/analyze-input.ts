import { MAX_TEXT_CHARS, MAX_URLS_IN } from "./ingest.config";
import { isHttpUrl } from "./qr-payload";
import type { AnalyzeRequest, QrKind } from "./types";

export type BuildNoticeKind = "payment-qr" | "wifi-qr" | "no-url" | "text-truncated";

export interface BuildNotice {
  readonly kind: BuildNoticeKind;
}

export interface BuildAnalyzeInput {
  readonly userText?: unknown;
  readonly ocrText?: unknown;
  readonly qrResults?: unknown;
}

export interface BuildAnalyzeResult {
  readonly request: AnalyzeRequest | null;
  readonly notices: readonly BuildNotice[];
}

const QR_KINDS: ReadonlySet<string> = new Set<QrKind>([
  "url",
  "payment",
  "wifi",
  "contact",
  "text",
  "other",
]);

function readProp(source: unknown, key: string): unknown {
  try {
    if (source === null || (typeof source !== "object" && typeof source !== "function")) {
      return undefined;
    }
    return (source as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

function readTrimmed(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    return value.trim();
  } catch {
    return "";
  }
}

function isHighSurrogate(unit: number): boolean {
  return unit >= 0xd800 && unit <= 0xdbff;
}

function buildText(userText: unknown, ocrText: unknown): { text: string | null; truncated: boolean } {
  const parts = [readTrimmed(userText), readTrimmed(ocrText)].filter((part) => part.length > 0);
  let text = parts.join("\n\n").trim();
  let truncated = false;

  if (text.length > MAX_TEXT_CHARS) {
    truncated = true;
    text = text.slice(0, MAX_TEXT_CHARS);
    if (text.length > 0 && isHighSurrogate(text.charCodeAt(text.length - 1))) {
      text = text.slice(0, -1);
    }
    text = text.trimEnd();
  }

  return { text: text.length > 0 ? text : null, truncated };
}

function readEntries(qrResults: unknown): unknown[] {
  try {
    if (!Array.isArray(qrResults)) return [];
    const length = qrResults.length;
    const entries: unknown[] = [];
    for (let i = 0; i < length; i += 1) {
      try {
        entries.push(qrResults[i]);
      } catch {
        // skip unreadable entry
      }
    }
    return entries;
  } catch {
    return [];
  }
}

/**
 * Merge user text, OCR text and QR classifications into an API request body
 * plus notices. Never throws. `request` is null when there is nothing to
 * analyze; notices are still returned. Non-url QR payload content is never
 * read beyond its kind.
 */
export function buildAnalyzeRequest(input: unknown): BuildAnalyzeResult {
  try {
    const { text, truncated } = buildText(readProp(input, "userText"), readProp(input, "ocrText"));

    const urls: string[] = [];
    const seen = new Set<string>();
    let hasPayment = false;
    let hasWifi = false;
    let hasUrlKind = false;
    let hasOtherNonUrl = false;

    for (const entry of readEntries(readProp(input, "qrResults"))) {
      const kind = readProp(entry, "kind");
      if (typeof kind !== "string" || !QR_KINDS.has(kind)) continue;

      if (kind === "url") {
        hasUrlKind = true;
        const url = readProp(entry, "url");
        if (isHttpUrl(url) && !seen.has(url) && urls.length < MAX_URLS_IN) {
          seen.add(url);
          urls.push(url);
        }
      } else if (kind === "payment") {
        hasPayment = true;
      } else if (kind === "wifi") {
        hasWifi = true;
      } else {
        hasOtherNonUrl = true;
      }
    }

    const notices: BuildNotice[] = [];
    if (hasPayment) notices.push({ kind: "payment-qr" });
    if (hasWifi) notices.push({ kind: "wifi-qr" });
    if (hasOtherNonUrl && !hasUrlKind) notices.push({ kind: "no-url" });
    if (truncated) notices.push({ kind: "text-truncated" });

    if (text === null && urls.length === 0) {
      return { request: null, notices };
    }

    const request: AnalyzeRequest = {};
    if (text !== null) request.text = text;
    if (urls.length > 0) request.urls = urls;
    return { request, notices };
  } catch {
    return { request: null, notices: [] };
  }
}
