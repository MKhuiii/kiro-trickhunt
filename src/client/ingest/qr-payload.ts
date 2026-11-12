import { CONTACT_PREFIXES, MAX_URL_CHARS, PAYMENT_PREFIXES, WIFI_PREFIX } from "./ingest.config";
import type { QrClassification, QrKind } from "./types";

const WHITESPACE_OR_CONTROL = /[\s\u0000-\u001f\u007f]/;
const URI_SCHEME_PREFIX = /^[a-z][a-z0-9+.-]*:/i;

/**
 * True when `value` is a string of at most MAX_URL_CHARS, free of whitespace and
 * control characters, that parses as an http or https URL with a hostname.
 * Never throws.
 */
export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.length === 0 || value.length > MAX_URL_CHARS) return false;
  if (WHITESPACE_OR_CONTROL.test(value)) return false;
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === "http:" || parsed.protocol === "https:") &&
      parsed.hostname.length > 0
    );
  } catch {
    return false;
  }
}

function kindOnly(kind: Exclude<QrKind, "url">): QrClassification {
  return Object.freeze({ kind });
}

function startsWithAny(lowerPayload: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => lowerPayload.startsWith(prefix.toLowerCase()));
}

/**
 * Reduce a decoded QR payload to a kind (and, for http/https links, the URL).
 * Check order: wifi, payment, contact, url, text, other. No part of a non-url
 * payload is copied into the result. Never throws.
 */
export function classifyQrPayload(payload: string): QrClassification {
  try {
    if (typeof payload !== "string") return kindOnly("other");
    const trimmed = payload.trim();
    if (trimmed.length === 0) return kindOnly("other");

    const lower = trimmed.toLowerCase();

    if (lower.startsWith(WIFI_PREFIX.toLowerCase())) return kindOnly("wifi");
    if (startsWithAny(lower, PAYMENT_PREFIXES)) return kindOnly("payment");
    if (startsWithAny(lower, CONTACT_PREFIXES)) return kindOnly("contact");

    if (isHttpUrl(trimmed)) return Object.freeze({ kind: "url", url: trimmed });

    if (!URI_SCHEME_PREFIX.test(trimmed)) return kindOnly("text");
    return kindOnly("other");
  } catch {
    return kindOnly("other");
  }
}
