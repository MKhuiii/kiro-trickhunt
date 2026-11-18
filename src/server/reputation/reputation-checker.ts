import type {
  ReputationCategory,
  ReputationChecker,
  ReputationHit,
  ReputationResult,
} from "../../analyzers/reputation-checker";
import { MAX_PREFIXES_PER_REQUEST } from "./reputation.config";
import type {
  ProviderMatch,
  ReputationProvider,
} from "./safe-browsing-provider";
import {
  expressionsOf,
  prefixOf,
  sha256,
  toLookupUrl,
} from "./url-expressions";

export interface ReputationCheckerOptions {
  readonly provider: ReputationProvider;
  /** Called once, right before the provider request, only when at least one prefix exists. */
  readonly gate: () => boolean;
  readonly maxPrefixes?: number;
}

interface KeptUrl {
  readonly input: string;
  readonly hashes: readonly string[];
}

const hex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const degradedResult = (
  reason: "provider-error" | "rate-limited",
): ReputationResult => ({ status: "degraded", reason });

export function createReputationChecker(
  options: ReputationCheckerOptions,
): ReputationChecker {
  const { provider, gate } = options;
  const maxPrefixes =
    typeof options.maxPrefixes === "number" && options.maxPrefixes >= 0
      ? Math.floor(options.maxPrefixes)
      : MAX_PREFIXES_PER_REQUEST;

  return {
    async check(urls, signal): Promise<ReputationResult> {
      try {
        const kept: KeptUrl[] = [];
        const seen = new Set<string>();
        const prefixes = new Map<string, Uint8Array>();
        let tooMany = false;

        const list: readonly unknown[] = Array.isArray(urls) ? urls : [];
        for (const item of list) {
          if (typeof item !== "string") continue;
          const lookup = toLookupUrl(item);
          if (lookup === null) continue;
          const expressions = expressionsOf(lookup);
          const key = expressions.join("\n");
          if (seen.has(key)) continue;
          seen.add(key);

          const hashes = expressions.map(sha256);
          const urlPrefixes = new Map<string, Uint8Array>();
          for (const h of hashes) {
            const p = prefixOf(h);
            urlPrefixes.set(hex(p), p);
          }
          let added = 0;
          for (const k of urlPrefixes.keys()) if (!prefixes.has(k)) added += 1;
          if (prefixes.size + added > maxPrefixes) {
            tooMany = true;
            break;
          }
          for (const [k, p] of urlPrefixes) prefixes.set(k, p);
          kept.push({ input: item, hashes: hashes.map(hex) });
        }

        if (kept.length === 0) {
          return tooMany
            ? { status: "ok", hits: [], checkedCount: 0, reason: "too-many-links" }
            : { status: "ok", hits: [], checkedCount: 0 };
        }

        let allowed = false;
        try {
          allowed = gate() === true;
        } catch {
          allowed = false;
        }
        if (!allowed) return degradedResult("rate-limited");

        const sorted = [...prefixes.entries()]
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([, p]) => p);
        const result = await provider.searchHashes(sorted, signal);
        if (result.status === "degraded") return result;

        const byHash = new Map<string, Set<ReputationCategory>>();
        for (const m of result.matches as readonly ProviderMatch[]) {
          const k = hex(m.fullHash);
          const set = byHash.get(k) ?? new Set<ReputationCategory>();
          for (const c of m.categories) set.add(c);
          byHash.set(k, set);
        }

        const hits: ReputationHit[] = [];
        for (const url of kept) {
          const categories = new Set<ReputationCategory>();
          for (const h of url.hashes) {
            for (const c of byHash.get(h) ?? []) categories.add(c);
          }
          for (const category of categories) {
            hits.push({ url: url.input, category });
          }
        }

        return tooMany
          ? { status: "ok", hits, checkedCount: kept.length, reason: "too-many-links" }
          : { status: "ok", hits, checkedCount: kept.length };
      } catch {
        return degradedResult("provider-error");
      }
    },
  };
}
