import {
  QR_MAX_PAYLOAD_CHARS,
  QR_MAX_RESULTS,
  QR_TIMEOUT_MS,
} from "./ingest.config";
import type { ImageDataLike } from "./types";
import type { QrReader } from "./zxing-reader";

export type { QrReader } from "./zxing-reader";

export interface DecodeQrDeps {
  loadReader(): Promise<QrReader>;
}

export interface DecodeQrOptions {
  readonly timeoutMs?: number;
}

export type QrErrorCode = "qr-engine-unavailable" | "qr-decode-failed";

export interface DecodeQrResult {
  readonly payloads: readonly string[];
  readonly errorCode?: QrErrorCode;
}

const TIMED_OUT = Symbol("qr-timeout");

function failure(errorCode: QrErrorCode): DecodeQrResult {
  return Object.freeze({ payloads: Object.freeze([] as string[]), errorCode });
}

function filterPayloads(output: unknown): string[] {
  if (!Array.isArray(output)) return [];
  const payloads: string[] = [];
  for (const item of output as unknown[]) {
    if (payloads.length >= QR_MAX_RESULTS) break;
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const text = record.text;
    if (record.isValid === false) continue;
    if (typeof text !== "string") continue;
    if (text.length === 0 || text.length > QR_MAX_PAYLOAD_CHARS) continue;
    payloads.push(text);
  }
  return payloads;
}

/**
 * Reads QR payloads from pixel data. Never throws or rejects.
 */
export async function decodeQr(
  imageData: ImageDataLike,
  deps: DecodeQrDeps,
  options?: DecodeQrOptions,
): Promise<DecodeQrResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const requested = options?.timeoutMs;
    const timeoutMs =
      typeof requested === "number" && Number.isFinite(requested) && requested >= 0
        ? requested
        : QR_TIMEOUT_MS;

    let reader: QrReader;
    try {
      reader = await deps.loadReader();
      if (typeof reader?.read !== "function") {
        return failure("qr-engine-unavailable");
      }
    } catch {
      return failure("qr-engine-unavailable");
    }

    try {
      const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
        timer = setTimeout(() => resolve(TIMED_OUT), timeoutMs);
      });
      // Wrap so a synchronous throw becomes a rejection; the late rejection of
      // a lost race is swallowed by the race itself.
      const read = Promise.resolve().then(() => reader.read(imageData));
      const output = await Promise.race([read, timeout]);
      if (output === TIMED_OUT) return failure("qr-decode-failed");
      return Object.freeze({ payloads: Object.freeze(filterPayloads(output)) });
    } catch {
      return failure("qr-decode-failed");
    }
  } catch {
    return failure("qr-decode-failed");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
