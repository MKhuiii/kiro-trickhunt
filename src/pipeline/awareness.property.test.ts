/**
 * Property tests for the awareness adjustment (rules-tuning-v5).
 *
 * PBT-90: without the awareness marker the result is unchanged.
 * PBT-91: the adjustment lowers by at most one step, only from high to
 *         suspicious, never from critical and never to no_signals.
 * PBT-92: with the switch off nothing is ever lowered.
 * PBT-93: adding any blocking signal, a link or a number prevents lowering.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createSignal } from "../core";
import type { RiskLevel, Signal } from "../core";
import { KNOWN_SIGNAL_IDS } from "../ui/i18n/signal-ids";
import { TEXT_PATTERNS } from "../analyzers/text-analyzer.config";
import { applyAwarenessAdjustment, isReportedOnly } from "./awareness";
import type { AwarenessInput } from "./awareness";

const LEVELS: readonly RiskLevel[] = ["no_signals", "suspicious", "high", "critical"];
const RANK: Record<RiskLevel, number> = { no_signals: 0, suspicious: 1, high: 2, critical: 3 };

const TEXTS = [
  "Fraud alert: scammers are sending fake texts saying your account has been locked. Ignore them and use the official app.",
  "Ngân hàng cảnh báo: kẻ lừa đảo nhắn tin báo tài khoản bị khóa. Đây là tin nhắn giả mạo, hãy bỏ qua.",
  "Your account has been locked.",
  "Scam warning: your account will be suspended within 24 hours.",
];

const BLOCKING = [
  "text.otp-request",
  "text.sensitive-data-request",
  "text.payment-request",
  "text.off-platform",
  "text.prize-reward",
  "text.job-offer",
  ...KNOWN_SIGNAL_IDS.filter((id) => id.startsWith("url.") || id.startsWith("semantic.")),
];

const NEUTRAL = ["text.threat", "text.urgency", "text.authority-impersonation", "text.financial-institution"];

function sig(id: string): Signal {
  const source = id.startsWith("url.") ? "url" : id.startsWith("semantic.") ? "semantic" : "text";
  return createSignal({ id, source, severity: 0.4, evidence: "e", whyItMatters: "w" });
}

const inputArb: fc.Arbitrary<AwarenessInput> = fc.record({
  enabled: fc.boolean(),
  score: fc.integer({ min: 0, max: 100 }),
  level: fc.constantFrom(...LEVELS),
  signals: fc.array(fc.constantFrom(...NEUTRAL, ...BLOCKING).map(sig), { maxLength: 5 }),
  text: fc.constantFrom(...TEXTS),
  inputUrls: fc.constantFrom([], ["https://a.example"]),
  semanticStatus: fc.constantFrom("ok" as const, "degraded" as const, "unavailable" as const),
  awareness: fc.option(fc.record({ severity: fc.double({ min: 0, max: 1, noNaN: true }) }), {
    nil: null,
  }),
});

const PAYMENT_PHRASES = (() => {
  const p = TEXT_PATTERNS.find((t) => t.id === "text.payment-request");
  return p === undefined ? [] : [...p.phrases.en, ...p.phrases.vi];
})();

/** Warning sentences that contain a reporting cue and a payment phrase. */
const WARNING_WITH_CUE = [
  "Cảnh báo: kẻ lừa đảo dùng thủ đoạn giả danh công an yêu cầu chuyển tiền vào tài khoản tạm giữ.",
  "Ngân hàng không bao giờ yêu cầu chuyển tiền vào tài khoản an toàn.",
  "Scam warning: scammers ask you to transfer money to a safe account.",
];

/** A clause that asks for payment without a command verb at its start. */
const askingClause = (phrase: string, lead: string): string => `${lead} ${phrase} trước 17h`;

describe("awareness adjustment properties", () => {
  it("PBT-94: a warning sentence never hides a payment request in another clause", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...WARNING_WITH_CUE),
        fc.constantFrom(...PAYMENT_PHRASES),
        fc.constantFrom("Quý khách cần", "Bạn cần", "You need to", "Người nhận phải"),
        fc.constantFrom(" ", "\n", " Lưu ý! ", ", "),
        fc.boolean(),
        (warning, phrase, lead, sep, warningFirst) => {
          const asking = askingClause(phrase, lead);
          const text = warningFirst ? `${warning}${sep}${asking}` : `${asking}.${sep}${warning}`;
          expect(isReportedOnly("text.payment-request", text)).toBe(false);
          const out = applyAwarenessAdjustment({
            enabled: true,
            score: 80,
            level: "high",
            signals: [sig("text.payment-request"), sig("text.authority-impersonation")],
            text,
            inputUrls: [],
            semanticStatus: "ok",
            awareness: { severity: 1 },
          });
          expect(out.applied).toBe(false);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("PBT-95: a payment phrase before the cue in its clause is never reported", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PAYMENT_PHRASES),
        fc.constantFrom("thủ đoạn", "chiêu trò", "kẻ gian yêu cầu", "scammers ask you to"),
        (phrase, cue) => {
          expect(isReportedOnly("text.payment-request", `Bạn cần ${phrase} theo ${cue}`)).toBe(false);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("PBT-90: without the marker the result is unchanged", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const out = applyAwarenessAdjustment({ ...input, awareness: null });
        expect(out.applied).toBe(false);
        expect(out.level).toBe(input.level);
        expect(out.score).toBe(input.score);
      }),
      { numRuns: 500 },
    );
  });

  it("PBT-91: lowers at most one step, only high to suspicious, never raises the score", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const out = applyAwarenessAdjustment(input);
        if (!out.applied) {
          expect(out.level).toBe(input.level);
          expect(out.score).toBe(input.score);
          return;
        }
        expect(input.level).toBe("high");
        expect(out.level).toBe("suspicious");
        expect(RANK[input.level] - RANK[out.level]).toBe(1);
        expect(out.score).toBeLessThanOrEqual(input.score);
        expect(out.score).toBeLessThan(50);
      }),
      { numRuns: 1000 },
    );
  });

  it("PBT-92: with the switch off nothing is lowered", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        expect(applyAwarenessAdjustment({ ...input, enabled: false }).applied).toBe(false);
      }),
      { numRuns: 500 },
    );
  });

  it("PBT-93: a blocking signal, a link or a number always prevents lowering", () => {
    fc.assert(
      fc.property(
        inputArb,
        fc.oneof(
          fc.constantFrom(...BLOCKING).map((id) => ({ kind: "signal" as const, id })),
          fc.constant({ kind: "link" as const, id: "" }),
          fc.constant({ kind: "number" as const, id: "" }),
        ),
        (input, extra) => {
          const changed: AwarenessInput =
            extra.kind === "signal"
              ? { ...input, signals: [...input.signals, sig(extra.id)] }
              : extra.kind === "link"
                ? { ...input, text: `${input.text} https://x.example` }
                : { ...input, text: `${input.text} 0000 000 000` };
          expect(applyAwarenessAdjustment(changed).applied).toBe(false);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
