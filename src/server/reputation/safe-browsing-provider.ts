import { z } from "zod";
import type {
  ReputationCategory,
  ReputationDegradedReason,
} from "../../analyzers/reputation-checker";
import {
  DISREGARDED_THREAT_TYPES,
  ENFORCEABLE_ATTRIBUTES,
  MAX_RESPONSE_CHARS,
  REPUTATION_ENDPOINT,
  THREAT_CATEGORY_BY_TYPE,
} from "./reputation.config";
import { fromBase64Any, toBase64Url } from "./url-expressions";

export type ProviderMatch = {
  readonly fullHash: Uint8Array;
  readonly categories: readonly ReputationCategory[];
};

export type HashSearchResult =
  | { readonly status: "ok"; readonly matches: readonly ProviderMatch[] }
  | {
      readonly status: "degraded";
      readonly reason: ReputationDegradedReason;
    };

export interface ReputationProvider {
  searchHashes(
    prefixes: readonly Uint8Array[],
    signal?: AbortSignal,
  ): Promise<HashSearchResult>;
}

const FULL_HASH_BYTES = 32;

const detailSchema = z.looseObject({
  threatType: z.string(),
  attributes: z.array(z.string()).optional(),
});

const responseSchema = z.looseObject({
  fullHashes: z
    .array(
      z.looseObject({
        fullHash: z.string(),
        fullHashDetails: z.array(detailSchema).optional(),
      }),
    )
    .optional(),
});

const degraded = (reason: ReputationDegradedReason): HashSearchResult => ({
  status: "degraded",
  reason,
});

function categoryOf(threatType: string): ReputationCategory {
  return Object.prototype.hasOwnProperty.call(
    THREAT_CATEGORY_BY_TYPE,
    threatType,
  )
    ? THREAT_CATEGORY_BY_TYPE[threatType]
    : "other";
}

function isEnforceable(detail: { threatType: string; attributes?: readonly string[] }): boolean {
  if (DISREGARDED_THREAT_TYPES.includes(detail.threatType)) return false;
  return (detail.attributes ?? []).every((a) =>
    ENFORCEABLE_ATTRIBUTES.includes(a),
  );
}

function buildUrl(prefixes: readonly Uint8Array[]): string {
  const encoded = prefixes.map(toBase64Url).sort();
  const query = encoded
    .map((p) => `hashPrefixes=${encodeURIComponent(p)}`)
    .join("&");
  return `${REPUTATION_ENDPOINT}?${query}`;
}

type RawEntry = {
  readonly fullHash: Uint8Array | null;
  readonly details: readonly { threatType: string; attributes: readonly string[] }[];
};

// Safe Browsing v5 hashes.search answers in protobuf (JSON is rejected by the
// service). Numbers below come from google/security/safebrowsing/v5/safebrowsing.proto.
const THREAT_TYPE_BY_NUMBER: Readonly<Record<number, string>> = {
  0: "THREAT_TYPE_UNSPECIFIED",
  1: "MALWARE",
  2: "SOCIAL_ENGINEERING",
  3: "UNWANTED_SOFTWARE",
  4: "POTENTIALLY_HARMFUL_APPLICATION",
};

class ProtoError extends Error {}

type Field = { readonly no: number; readonly wire: number; readonly num: number; readonly bytes: Uint8Array };

function readVarint(buf: Uint8Array, at: number): { value: number; next: number } {
  let value = 0;
  let scale = 1;
  for (let i = 0; i < 10; i++) {
    if (at + i >= buf.length) throw new ProtoError();
    const b = buf[at + i];
    value += (b & 0x7f) * scale;
    if ((b & 0x80) === 0) return { value, next: at + i + 1 };
    scale *= 128;
  }
  throw new ProtoError();
}

function readFields(buf: Uint8Array): Field[] {
  const fields: Field[] = [];
  let at = 0;
  while (at < buf.length) {
    const tag = readVarint(buf, at);
    at = tag.next;
    const no = Math.floor(tag.value / 8);
    const wire = tag.value % 8;
    const empty = new Uint8Array(0);
    if (wire === 0) {
      const v = readVarint(buf, at);
      at = v.next;
      fields.push({ no, wire, num: v.value, bytes: empty });
    } else if (wire === 2) {
      const len = readVarint(buf, at);
      at = len.next;
      if (at + len.value > buf.length) throw new ProtoError();
      fields.push({ no, wire, num: 0, bytes: buf.subarray(at, at + len.value) });
      at += len.value;
    } else if (wire === 1 || wire === 5) {
      const size = wire === 1 ? 8 : 4;
      if (at + size > buf.length) throw new ProtoError();
      at += size;
    } else {
      throw new ProtoError();
    }
  }
  return fields;
}

function protoEntries(buf: Uint8Array): RawEntry[] {
  const entries: RawEntry[] = [];
  for (const top of readFields(buf)) {
    if (top.no !== 1 || top.wire !== 2) continue;
    let fullHash: Uint8Array | null = null;
    const details: { threatType: string; attributes: string[] }[] = [];
    for (const f of readFields(top.bytes)) {
      if (f.no === 1 && f.wire === 2) fullHash = f.bytes;
      if (f.no === 2 && f.wire === 2) {
        let threatType = "THREAT_TYPE_UNSPECIFIED";
        const attributes: string[] = [];
        for (const d of readFields(f.bytes)) {
          if (d.no === 1 && d.wire === 0) threatType = THREAT_TYPE_BY_NUMBER[d.num] ?? `THREAT_TYPE_${d.num}`;
          if (d.no === 2 && d.wire === 0) attributes.push(`ATTRIBUTE_${d.num}`);
          if (d.no === 2 && d.wire === 2) {
            // Packed repeated enum.
            let at = 0;
            while (at < d.bytes.length) {
              const v = readVarint(d.bytes, at);
              attributes.push(`ATTRIBUTE_${v.value}`);
              at = v.next;
            }
          }
        }
        details.push({ threatType, attributes });
      }
    }
    entries.push({ fullHash, details });
  }
  return entries;
}

function jsonEntries(bytes: Uint8Array): RawEntry[] | null {
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) return null;
  return (parsed.data.fullHashes ?? []).map((e) => ({
    fullHash: fromBase64Any(e.fullHash),
    details: (e.fullHashDetails ?? []).map((d) => ({
      threatType: d.threatType,
      attributes: d.attributes ?? [],
    })),
  }));
}

function parseBody(bytes: Uint8Array): HashSearchResult {
  if (bytes.length > MAX_RESPONSE_CHARS) return degraded("invalid-response");
  let entries: RawEntry[] | null;
  try {
    // JSON bodies start with "{" (0x7b); protobuf field 15 with wire type 3 is never valid here.
    entries = bytes.length > 0 && bytes[0] === 0x7b ? jsonEntries(bytes) : protoEntries(bytes);
  } catch {
    return degraded("invalid-response");
  }
  if (entries === null) return degraded("invalid-response");

  const matches: ProviderMatch[] = [];
  for (const entry of entries) {
    if (entry.fullHash === null || entry.fullHash.length !== FULL_HASH_BYTES) {
      return degraded("invalid-response");
    }
    const categories: ReputationCategory[] = [];
    for (const detail of entry.details) {
      if (!isEnforceable(detail)) continue;
      const category = categoryOf(detail.threatType);
      if (!categories.includes(category)) categories.push(category);
    }
    if (categories.length > 0) matches.push({ fullHash: entry.fullHash, categories });
  }
  return { status: "ok", matches };
}
export function createSafeBrowsingProvider(options: {
  readonly apiKey: string;
  readonly timeoutMs: number;
  readonly fetchImpl: typeof fetch;
}): ReputationProvider {
  return {
    async searchHashes(prefixes, signal) {
      const controller = new AbortController();
      const onAbort = () => controller.abort();
      if (signal?.aborted) return degraded("timeout");
      signal?.addEventListener("abort", onAbort, { once: true });
      const timer = setTimeout(() => controller.abort(), options.timeoutMs);
      try {
        const response = await options.fetchImpl(buildUrl(prefixes), {
          method: "GET",
          headers: {
            "X-Goog-Api-Key": options.apiKey,
            Accept: "application/json",
          },
          cache: "no-store",
          redirect: "error",
          credentials: "omit",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
        });
        if (response.status === 429) return degraded("rate-limited");
        if (response.status !== 200) return degraded("provider-error");
        return parseBody(new Uint8Array(await response.arrayBuffer()));
      } catch {
        return controller.signal.aborted
          ? degraded("timeout")
          : degraded("provider-error");
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
      }
    },
  };
}
