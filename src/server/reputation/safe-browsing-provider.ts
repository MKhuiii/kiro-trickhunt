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

function isEnforceable(detail: z.infer<typeof detailSchema>): boolean {
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

function parseBody(text: string): HashSearchResult {
  if (text.length > MAX_RESPONSE_CHARS) return degraded("invalid-response");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return degraded("invalid-response");
  }
  const parsed = responseSchema.safeParse(json);
  if (!parsed.success) return degraded("invalid-response");

  const matches: ProviderMatch[] = [];
  for (const entry of parsed.data.fullHashes ?? []) {
    const bytes = fromBase64Any(entry.fullHash);
    if (bytes === null || bytes.length !== FULL_HASH_BYTES) {
      return degraded("invalid-response");
    }
    const categories: ReputationCategory[] = [];
    for (const detail of entry.fullHashDetails ?? []) {
      if (!isEnforceable(detail)) continue;
      const category = categoryOf(detail.threatType);
      if (!categories.includes(category)) categories.push(category);
    }
    if (categories.length > 0) matches.push({ fullHash: bytes, categories });
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
        const text = await response.text();
        return parseBody(text);
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
