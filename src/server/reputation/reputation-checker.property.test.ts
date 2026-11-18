/**
 * reputation-checker.property.test.ts — the checker is total and makes at most one request.
 *
 * Feature: link-reputation-check, Property 116: the checker is total and makes at most one request (PBT-116)
 *
 * **Validates: Requirements REQ-LREP-19, REQ-LREP-23, REQ-LREP-29**
 */

import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import type { ReputationResult } from "../../analyzers/reputation-checker";
import { createReputationChecker } from "./reputation-checker";
import { FakeReputationProvider } from "./fake-reputation-provider";
import type {
  HashSearchResult,
  ReputationProvider,
} from "./safe-browsing-provider";

const NUM_RUNS = 100;

const CATEGORIES = ["social-engineering", "malware", "unwanted-software", "other"];
const REASONS = ["timeout", "provider-error", "invalid-response", "rate-limited"];

function conforms(r: ReputationResult): boolean {
  if (r.status === "degraded") return REASONS.includes(r.reason);
  if (r.reason !== undefined && r.reason !== "too-many-links") return false;
  if (!Number.isInteger(r.checkedCount) || r.checkedCount < 0) return false;
  return r.hits.every(
    (h) => typeof h.url === "string" && CATEGORIES.includes(h.category),
  );
}

/** A provider that answers with arbitrary data, typed as if it were valid. */
function arbitraryProvider(answer: unknown): ReputationProvider & { calls: number } {
  const p = {
    calls: 0,
    searchHashes(): Promise<HashSearchResult> {
      p.calls += 1;
      return Promise.resolve(answer as HashSearchResult);
    },
  };
  return p;
}

const urlLikeArb = fc.oneof(
  fc.webUrl(),
  fc.string(),
  fc.constantFrom("", "not a url", "http://", "ftp://x.com", "http://[::1"),
);
const urlsArb = fc.oneof(
  fc.array(urlLikeArb, { maxLength: 8 }),
  fc.array(fc.anything(), { maxLength: 6 }),
  fc.anything(),
);

const asUrls = (v: unknown) => v as readonly string[];

describe("PBT-116: reputation checker is total", () => {
  it("never rejects and conforms for arbitrary inputs and provider answers", async () => {
    await fc.assert(
      fc.asyncProperty(
        urlsArb,
        fc.anything(),
        fc.boolean(),
        async (urls, answer, gateOpen) => {
          const provider = arbitraryProvider(answer);
          const checker = createReputationChecker({ provider, gate: () => gateOpen });
          const result = await checker.check(asUrls(urls));
          expect(conforms(result)).toBe(true);
          expect(provider.calls).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("gives an empty ok result with no provider or gate call for empty or malformed lists", async () => {
    const malformedArb = fc.array(
      fc.oneof(
        fc.constantFrom("", "not a url", "http://", "ftp://x.com"),
        fc.integer(),
        fc.constant(null),
        fc.constant(undefined),
      ),
      { maxLength: 6 },
    );
    await fc.assert(
      fc.asyncProperty(malformedArb, async (urls) => {
        const provider = FakeReputationProvider.responding([]);
        let gateCalls = 0;
        const checker = createReputationChecker({
          provider,
          gate: () => {
            gateCalls += 1;
            return true;
          },
        });
        const result = await checker.check(asUrls(urls));
        expect(result).toEqual({ status: "ok", hits: [], checkedCount: 0 });
        expect(provider.calls).toHaveLength(0);
        expect(gateCalls).toBe(0);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("maps a throwing provider to provider-error with exactly one call", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }), async (urls) => {
        const provider = FakeReputationProvider.throwing();
        const checker = createReputationChecker({ provider, gate: () => true });
        const result = await checker.check(urls);
        expect(result).toEqual({ status: "degraded", reason: "provider-error" });
        expect(provider.calls).toHaveLength(1);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("maps a hanging provider to timeout once the signal aborts, with one call", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }), async (urls) => {
        const provider = FakeReputationProvider.hanging();
        const checker = createReputationChecker({ provider, gate: () => true });
        const controller = new AbortController();
        const pending = checker.check(urls, controller.signal);
        controller.abort();
        const result = await pending;
        expect(result).toEqual({ status: "degraded", reason: "timeout" });
        expect(provider.calls).toHaveLength(1);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("passes through a degraded provider reason without retrying", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.webUrl(), { minLength: 1, maxLength: 5 }),
        fc.constantFrom(...REASONS),
        async (urls, reason) => {
          const provider = FakeReputationProvider.degraded(
            reason as "timeout" | "provider-error" | "invalid-response" | "rate-limited",
          );
          const checker = createReputationChecker({ provider, gate: () => true });
          const result = await checker.check(urls);
          expect(result).toEqual({ status: "degraded", reason });
          expect(provider.calls).toHaveLength(1);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
