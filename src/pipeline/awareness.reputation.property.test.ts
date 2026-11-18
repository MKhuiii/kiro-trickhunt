/**
 * Feature: link-reputation-check, Property 122: awareness never lowers a listed result
 *
 * PBT-122: with a `url.reputation-listed` signal the awareness adjustment
 * never lowers `level` or `score`. Without it, only `high` may be lowered,
 * by one step, as before.
 *
 * **Validates: Requirements REQ-LREP-33, REQ-LREP-34**
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createSignal } from "../core";
import type { RiskLevel, Signal } from "../core";
import { applyAwarenessAdjustment } from "./awareness";
import type { AwarenessInput } from "./awareness";

const LEVELS: readonly RiskLevel[] = ["no_signals", "suspicious", "high", "critical"];
const RANK: Record<RiskLevel, number> = { no_signals: 0, suspicious: 1, high: 2, critical: 3 };

const TEXTS = [
  "Fraud alert: scammers are sending fake texts saying your account has been locked. Ignore them and use the official app.",
  "Ngân hàng cảnh báo: kẻ lừa đảo nhắn tin báo tài khoản bị khóa. Đây là tin nhắn giả mạo, hãy bỏ qua.",
  "Scam warning: your account will be suspended within 24 hours.",
];

const NEUTRAL = ["text.threat", "text.urgency", "text.authority-impersonation", "text.financial-institution"];

const LISTED_ID = "url.reputation-listed";

function sig(id: string, source: "url" | "text"): Signal {
  return createSignal({ id, source, severity: 0.6, evidence: "e", whyItMatters: "w" });
}

const listed = (): Signal => sig(LISTED_ID, "url");

const neutralSignalsArb = fc.array(
  fc.constantFrom(...NEUTRAL).map((id) => sig(id, "text")),
  { maxLength: 4 },
);

/** Inputs where every awareness condition holds, so the old rule would lower. */
const lowerableArb: fc.Arbitrary<AwarenessInput> = fc.record({
  enabled: fc.constant(true),
  score: fc.integer({ min: 50, max: 89 }),
  level: fc.constant<RiskLevel>("high"),
  signals: neutralSignalsArb,
  text: fc.constantFrom(...TEXTS),
  inputUrls: fc.constant<string[]>([]),
  semanticStatus: fc.constant("ok" as const),
  awareness: fc.record({ severity: fc.double({ min: 0.35, max: 1, noNaN: true }) }),
});

/** Arbitrary inputs, lowerable or not. */
const anyArb: fc.Arbitrary<AwarenessInput> = fc.record({
  enabled: fc.boolean(),
  score: fc.integer({ min: 0, max: 100 }),
  level: fc.constantFrom(...LEVELS),
  signals: neutralSignalsArb,
  text: fc.constantFrom(...TEXTS),
  inputUrls: fc.constantFrom<string[]>([], ["https://a.example"]),
  semanticStatus: fc.constantFrom("ok" as const, "degraded" as const, "unavailable" as const),
  awareness: fc.option(fc.record({ severity: fc.double({ min: 0, max: 1, noNaN: true }) }), {
    nil: null,
  }),
});

/** Put the listing signal at a random position among the other signals. */
const withListed = (input: AwarenessInput, at: number): AwarenessInput => {
  const list = [...input.signals];
  list.splice(at % (list.length + 1), 0, listed());
  return { ...input, signals: list };
};

describe("awareness with a reputation listing (PBT-122)", () => {
  it("the same input without the listing signal is lowered (the test is not vacuous)", () => {
    fc.assert(
      fc.property(lowerableArb, (input) => {
        expect(applyAwarenessAdjustment(input).applied).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it("with the listing signal, level and score never change", () => {
    fc.assert(
      fc.property(
        fc.oneof(lowerableArb, anyArb),
        fc.nat({ max: 10 }),
        (base, at) => {
          const input = withListed(base, at);
          const out = applyAwarenessAdjustment(input);
          expect(out.applied).toBe(false);
          expect(out.level).toBe(input.level);
          expect(out.score).toBe(input.score);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("without the listing signal, only high may be lowered, by one step", () => {
    fc.assert(
      fc.property(fc.oneof(lowerableArb, anyArb), (input) => {
        const out = applyAwarenessAdjustment(input);
        if (input.level !== "high") {
          expect(out.level).toBe(input.level);
          expect(out.score).toBe(input.score);
        } else {
          expect(RANK[input.level] - RANK[out.level]).toBeLessThanOrEqual(1);
          expect(out.score).toBeLessThanOrEqual(input.score);
        }
      }),
      { numRuns: 300 },
    );
  });
});
