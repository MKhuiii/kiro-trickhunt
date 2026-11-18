import type {
  ReputationCategory,
  ReputationDegradedReason,
} from "../../analyzers/reputation-checker";
import type {
  HashSearchResult,
  ProviderMatch,
  ReputationProvider,
} from "./safe-browsing-provider";
import { expressionsOf, sha256, toLookupUrl } from "./url-expressions";

export interface FakeProviderCall {
  readonly prefixes: readonly Uint8Array[];
  readonly hadSignal: boolean;
}

type Behavior = (
  prefixes: readonly Uint8Array[],
  signal?: AbortSignal,
) => Promise<HashSearchResult>;

/** Deterministic provider for tests and local use. No network. */
export class FakeReputationProvider implements ReputationProvider {
  readonly calls: FakeProviderCall[] = [];

  private constructor(private readonly behavior: Behavior) {}

  searchHashes(
    prefixes: readonly Uint8Array[],
    signal?: AbortSignal,
  ): Promise<HashSearchResult> {
    this.calls.push({ prefixes: prefixes.map((p) => p.slice()), hadSignal: signal !== undefined });
    return this.behavior(prefixes, signal);
  }

  /** Answers with the given matches, whatever the prefixes are. */
  static responding(matches: readonly ProviderMatch[]): FakeReputationProvider {
    return new FakeReputationProvider(async () => ({ status: "ok", matches }));
  }

  static degraded(reason: ReputationDegradedReason): FakeReputationProvider {
    return new FakeReputationProvider(async () => ({ status: "degraded", reason }));
  }

  /** Rejects on every call, to test callers that must not trust the provider. */
  static throwing(): FakeReputationProvider {
    return new FakeReputationProvider(() =>
      Promise.reject(new Error("fake provider failure")),
    );
  }

  /** Never resolves. When a signal aborts, resolves as a timeout. */
  static hanging(): FakeReputationProvider {
    return new FakeReputationProvider(
      (_prefixes, signal) =>
        new Promise<HashSearchResult>((resolve) => {
          if (signal === undefined) return;
          const done = () => resolve({ status: "degraded", reason: "timeout" });
          if (signal.aborted) done();
          else signal.addEventListener("abort", done, { once: true });
        }),
    );
  }

  /**
   * Lists the given URLs honestly: one match per expression, carrying the
   * real SHA-256 of that expression. Only matches whose 4-byte prefix was
   * requested are returned, as the real service does.
   */
  static listing(
    urls: readonly string[],
    category: ReputationCategory = "social-engineering",
  ): FakeReputationProvider {
    const listed: ProviderMatch[] = [];
    for (const input of urls) {
      const lookup = toLookupUrl(input);
      if (lookup === null) continue;
      for (const expression of expressionsOf(lookup)) {
        listed.push({ fullHash: sha256(expression), categories: [category] });
      }
    }
    return new FakeReputationProvider(async (prefixes) => ({
      status: "ok",
      matches: listed.filter((m) =>
        prefixes.some((p) => p.every((byte, i) => m.fullHash[i] === byte)),
      ),
    }));
  }
}

export interface CapturedFetchCall {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly init: RequestInit;
}

/**
 * A fake `fetch` that records the URL, headers and options a real adapter
 * sends, then answers with `responseFactory`.
 */
export function fakeFetchCapturing(
  responseFactory: () => Response | Promise<Response>,
): { readonly fetchImpl: typeof fetch; readonly calls: CapturedFetchCall[] } {
  const calls: CapturedFetchCall[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, key) => {
      headers[key] = value;
    });
    calls.push({
      url: typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      headers,
      init: init ?? {},
    });
    return responseFactory();
  }) as typeof fetch;
  return { fetchImpl, calls };
}
