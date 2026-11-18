import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ReputationChecker,
  ReputationResult,
} from "../analyzers/reputation-checker";

import { createPipeline } from "./pipeline";
import { REPUTATION_PIPELINE_TIMEOUT_MS } from "./pipeline.config";

// Feature: link-reputation-check, Property 125: Timeouts degrade, never fail
// the scan (pipeline part: a hanging or slow checker is cut at
// REPUTATION_PIPELINE_TIMEOUT_MS with reason timeout, its signal is aborted,
// and the verdict equals the no-checker verdict apart from `reputation`)
// **Validates: Requirements REQ-LREP-25, REQ-LREP-26**
//
// numRuns is 100. Fake timers keep each run in virtual time, so no real
// waiting happens and the full count stays fast.

const textArb = fc.constantFrom(
  undefined,
  "",
  "Hi team, the meeting is moved to 3pm tomorrow.",
  "Your bank account is locked. Verify your card number now or lose access today.",
);

const urlArb = fc.constantFrom(
  "http://evil.example.com/path?secret=1",
  "https://example.org/",
  "http://192.168.1.10/login",
);

const inputArb = fc.record({
  text: textArb,
  urls: fc.array(urlArb, { minLength: 1, maxLength: 3 }),
});

/** `null` means the checker never answers; a number is its delay past the cut. */
const behaviourArb = fc.oneof(
  fc.constant<number | null>(null),
  fc.integer({ min: 0, max: 20_000 }),
);

describe("Property 125: reputation pipeline timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("cuts a hanging or slow checker at the timeout without changing the verdict", async () => {
    await fc.assert(
      fc.asyncProperty(inputArb, behaviourArb, async (input, extraDelay) => {
        const T = REPUTATION_PIPELINE_TIMEOUT_MS;
        const signals: AbortSignal[] = [];
        const checker: ReputationChecker = {
          check: (urls, signal) => {
            if (signal) signals.push(signal);
            if (extraDelay === null) {
              return new Promise<ReputationResult>(() => undefined);
            }
            return new Promise<ReputationResult>((resolve) => {
              setTimeout(
                () =>
                  resolve({
                    status: "ok",
                    hits: urls.map((url) => ({ url, category: "malware" as const })),
                    checkedCount: urls.length,
                  }),
                T + extraDelay,
              );
            });
          },
        };

        const baseline = await createPipeline({ llmClient: null }).run(input);

        let settled = false;
        const run = createPipeline({ llmClient: null, reputationChecker: checker })
          .run(input)
          .then((v) => {
            settled = true;
            return v;
          });

        await vi.advanceTimersByTimeAsync(T - 1);
        expect(settled).toBe(false);
        expect(signals).toHaveLength(1);
        expect(signals[0].aborted).toBe(false);

        await vi.advanceTimersByTimeAsync(1);
        const verdict = await run;
        expect(settled).toBe(true);
        expect(signals[0].aborted).toBe(true);
        expect(verdict.reputation).toEqual({
          status: "degraded",
          reason: "timeout",
          checkedCount: 0,
        });

        const { reputation: _a, ...rest } = verdict;
        const { reputation: _b, ...baseRest } = baseline;
        void _a;
        void _b;
        expect(rest).toEqual(baseRest);

        // A late answer changes nothing and leaves no timers behind.
        await vi.advanceTimersByTimeAsync(extraDelay ?? 0);
        expect(vi.getTimerCount()).toBe(0);
      }),
      { numRuns: 100 },
    );
  });
});
