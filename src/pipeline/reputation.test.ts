import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ReputationChecker,
  ReputationResult,
} from "../analyzers/reputation-checker";

import { listingSignals, runReputation } from "./reputation";

function checkerOf(fn: ReputationChecker["check"]): ReputationChecker {
  return { check: fn };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("runReputation", () => {
  it("returns not-requested without a checker", async () => {
    const run = await runReputation(null, ["https://a.com/"], 100, "en");
    expect(run.outcome).toEqual({ status: "not-requested", checkedCount: 0 });
    expect(run.signals).toEqual([]);
  });

  it("does not call the checker when there are no URLs", async () => {
    const check = vi.fn();
    const run = await runReputation(checkerOf(check), [], 100, "en");
    expect(check).not.toHaveBeenCalled();
    expect(run.outcome).toEqual({ status: "ok", checkedCount: 0 });
  });

  it("builds signals and outcome from an ok result", async () => {
    const result: ReputationResult = {
      status: "ok",
      checkedCount: 1,
      hits: [{ url: "https://evil.example/x?y=1", category: "malware" }],
    };
    const run = await runReputation(
      checkerOf(async () => result),
      ["https://evil.example/x?y=1"],
      100,
      "en",
    );
    expect(run.outcome).toEqual({ status: "ok", checkedCount: 1 });
    expect(run.signals).toHaveLength(1);
    expect(run.signals[0].id).toBe("url.reputation-listed");
  });

  it("keeps the too-many-links reason", async () => {
    const run = await runReputation(
      checkerOf(async () => ({
        status: "ok",
        checkedCount: 2,
        hits: [],
        reason: "too-many-links",
      })),
      ["https://a.com/"],
      100,
      "en",
    );
    expect(run.outcome).toEqual({
      status: "ok",
      reason: "too-many-links",
      checkedCount: 2,
    });
  });

  it("passes a degraded result through", async () => {
    const run = await runReputation(
      checkerOf(async () => ({ status: "degraded", reason: "rate-limited" })),
      ["https://a.com/"],
      100,
      "en",
    );
    expect(run.outcome).toEqual({
      status: "degraded",
      reason: "rate-limited",
      checkedCount: 0,
    });
    expect(run.signals).toEqual([]);
  });

  it("times out, aborts the signal and degrades", async () => {
    vi.useFakeTimers();
    let aborted = false;
    const checker = checkerOf(
      (_urls, signal) =>
        new Promise<ReputationResult>(() => {
          signal?.addEventListener("abort", () => {
            aborted = true;
          });
        }),
    );
    const promise = runReputation(checker, ["https://a.com/"], 50, "en");
    await vi.advanceTimersByTimeAsync(60);
    const run = await promise;
    expect(run.outcome).toEqual({
      status: "degraded",
      reason: "timeout",
      checkedCount: 0,
    });
    expect(aborted).toBe(true);
  });

  it("degrades when the checker rejects or throws", async () => {
    const rejecting = await runReputation(
      checkerOf(() => Promise.reject(new Error("x"))),
      ["https://a.com/"],
      100,
      "en",
    );
    expect(rejecting.outcome.reason).toBe("provider-error");
    const throwing = await runReputation(
      checkerOf(() => {
        throw new Error("x");
      }),
      ["https://a.com/"],
      100,
      "en",
    );
    expect(throwing.outcome.reason).toBe("provider-error");
  });

  it("degrades on a non-conforming result", async () => {
    const run = await runReputation(
      checkerOf(async () => ({ status: "ok" }) as unknown as ReputationResult),
      ["https://a.com/"],
      100,
      "en",
    );
    expect(run.outcome).toEqual({
      status: "degraded",
      reason: "invalid-response",
      checkedCount: 0,
    });
  });
});

describe("listingSignals", () => {
  it("makes one signal per distinct host with the best category", () => {
    const signals = listingSignals(
      [
        { url: "https://a.example/one", category: "other" },
        { url: "https://a.example/two", category: "social-engineering" },
        { url: "https://b.example/", category: "malware" },
      ],
      "en",
    );
    expect(signals).toHaveLength(2);
    expect(signals[0].evidence).toBe("a.example (reported as deceptive)");
    expect(signals[1].evidence).toBe("b.example (reported for harmful software)");
  });

  it("keeps path, query and userinfo out of the evidence", () => {
    const [signal] = listingSignals(
      [
        {
          url: "https://user:pw@a.example/secret-path?token=abc#frag",
          category: "malware",
        },
      ],
      "en",
    );
    for (const marker of ["secret-path", "token", "abc", "frag", "user", "pw"]) {
      expect(signal.evidence).not.toContain(marker);
    }
  });

  it("skips hits whose URL cannot be normalized", () => {
    expect(listingSignals([{ url: "not a url", category: "malware" }], "en")).toEqual([]);
  });
});
