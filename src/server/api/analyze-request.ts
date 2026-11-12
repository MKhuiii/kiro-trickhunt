/**
 * Request parsing for POST /api/analyze (REQ-API-07 to REQ-API-12).
 * Never throws: every failure is a typed result.
 */
import { z } from "zod";
import {
  MAX_BODY_BYTES,
  MAX_TEXT_CHARS,
  MAX_URL_CHARS,
  MAX_URLS_IN,
} from "./api-limits.config";

export type ParsedRequest =
  | { readonly ok: true; readonly input: { text?: string; urls?: string[] } }
  | {
      readonly ok: false;
      readonly code: "invalid-content-type" | "payload-too-large" | "invalid-input";
    };

const bodySchema = z
  .strictObject({
    text: z.string().max(MAX_TEXT_CHARS).optional(),
    urls: z.array(z.string().max(MAX_URL_CHARS)).max(MAX_URLS_IN).optional(),
  })
  .refine(
    (value) =>
      (value.text !== undefined && value.text.trim().length > 0) ||
      (value.urls !== undefined && value.urls.length > 0),
    { message: "text or urls required" },
  );

function hasJsonContentType(headers: Headers): boolean {
  const raw = headers.get("content-type");
  if (raw === null) return false;
  const mediaType = raw.split(";")[0]?.trim().toLowerCase();
  return mediaType === "application/json";
}

function declaredTooLarge(headers: Headers): boolean {
  const raw = headers.get("content-length");
  if (raw === null) return false;
  const trimmed = raw.trim();
  if (!/^\d{1,15}$/.test(trimmed)) return false;
  return Number(trimmed) > MAX_BODY_BYTES;
}

type ReadResult =
  | { readonly ok: true; readonly bytes: Uint8Array }
  | { readonly ok: false; readonly tooLarge: boolean };

/** Reads the body in chunks and stops as soon as the cap is exceeded. */
async function readBoundedBody(req: Request): Promise<ReadResult> {
  if (req.body === null) {
    return { ok: true, bytes: new Uint8Array(0) };
  }
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) continue;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // ignore cancel errors
        }
        return { ok: false, tooLarge: true };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, tooLarge: false };
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
}

export async function readAnalyzeRequest(req: Request): Promise<ParsedRequest> {
  try {
    if (!hasJsonContentType(req.headers)) {
      return { ok: false, code: "invalid-content-type" };
    }
    if (declaredTooLarge(req.headers)) {
      return { ok: false, code: "payload-too-large" };
    }

    const read = await readBoundedBody(req);
    if (!read.ok) {
      return { ok: false, code: read.tooLarge ? "payload-too-large" : "invalid-input" };
    }

    let json: unknown;
    try {
      const textBody = new TextDecoder("utf-8", { fatal: true }).decode(read.bytes);
      json = JSON.parse(textBody);
    } catch {
      return { ok: false, code: "invalid-input" };
    }

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, code: "invalid-input" };
    }

    const input: { text?: string; urls?: string[] } = {};
    if (parsed.data.text !== undefined) input.text = parsed.data.text;
    if (parsed.data.urls !== undefined) input.urls = parsed.data.urls;
    return { ok: true, input };
  } catch {
    return { ok: false, code: "invalid-input" };
  }
}
