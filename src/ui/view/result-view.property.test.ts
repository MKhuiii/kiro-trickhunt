import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Verdict } from "../../pipeline";
import { en, t, vi } from "../i18n/dictionary";
import type { MessageKey } from "../i18n/dictionary";
import { KNOWN_SIGNAL_IDS } from "../i18n/signal-ids";
import { buildResultView } from "./result-view";
import type { ReadyResultView } from "./result-view";

const NUM_RUNS = 150;
const SOURCE_ORDER = ["text", "url", "semantic", "image", "qr", "other"];
const LEVELS = ["no_signals", "suspicious", "high", "critical"] as const;
const MONSTERS = ["bank", "prize", "job-bait", "authority", "generic"] as const;
const SOURCES = ["text", "url", "semantic", "image", "qr", "other"] as const;

const evidenceArb = fc
  .tuple(fc.constantFrom("a", "B", "7", "x"), fc.string({ maxLength: 60 }))
  .map(([head, rest]) => head + rest);

const signalArb = fc.record({
  id: fc.constantFrom(...KNOWN_SIGNAL_IDS),
  source: fc.constantFrom(...SOURCES),
  severity: fc.double({ min: 0, max: 1, noNaN: true }),
  evidence: evidenceArb,
  whyItMatters: fc.constant("why"),
});

const semanticArb = fc.record({
  status: fc.constantFrom("ok", "unavailable", "degraded"),
  skipped: fc.boolean(),
});

const verdictArb: fc.Arbitrary<Verdict> = fc
  .record({
    level: fc.constantFrom(...LEVELS),
    riskScore: fc.integer({ min: 0, max: 100 }),
    monster: fc.constantFrom(...MONSTERS),
    signals: fc.array(signalArb, { minLength: 1, maxLength: 8 }),
    actions: fc.array(fc.string({ maxLength: 40 }), { maxLength: 3 }),
    limitations: fc.array(fc.string({ maxLength: 40 }), { maxLength: 3 }),
    semantic: semanticArb,
    inputTruncated: fc.boolean(),
    urlsAnalyzed: fc.nat({ max: 5 }),
    urlsSkipped: fc.nat({ max: 5 }),
  })
  .map(
    (r) =>
      ({
        ...r,
        monster: r.level === "no_signals" ? null : r.monster,
        signals: r.level === "no_signals" ? [] : r.signals,
      }) as unknown as Verdict,
  );

const noticeKinds = [
  "ocr-skipped",
  "ocr-too-poor",
  "ocr-failed",
  "payment-qr",
  "wifi-qr",
  "no-url",
  "text-truncated",
  "something-else",
];
const noticeListArb = fc.array(fc.record({ kind: fc.constantFrom(...noticeKinds) }), {
  maxLength: 4,
});
const extrasArb = fc.option(
  fc.record(
    {
      semanticMode: fc.constantFrom("used", "budget-exhausted", "not-configured", "skipped"),
      ingestNotices: noticeListArb,
      buildNotices: noticeListArb,
      qrResults: noticeListArb,
      userText: fc.string({ maxLength: 30 }),
    },
    { requiredKeys: [] },
  ),
  { nil: undefined },
);
const localeArb = fc.oneof(fc.constantFrom("en", "vi"), fc.anything());

function labelKeys(view: ReadyResultView): MessageKey[] {
  const keys: MessageKey[] = [
    view.levelKey,
    view.riskMeter.labelKey,
    view.monster.nameKey,
    view.monster.shortKey,
    ...view.monster.tipKeys,
    view.semanticNoteKey,
    ...view.notices.map((n) => n.key),
  ];
  for (const g of view.signalGroups) {
    keys.push(g.labelKey);
    for (const c of g.cards) keys.push(c.explanationKey);
  }
  if (view.noSignals !== null) {
    keys.push(view.noSignals.summaryKey, view.noSignals.notSafeKey, view.noSignals.reminderKey);
  }
  return keys;
}

function fold(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
}

describe("PBT-65: buildResultView totality and structure", () => {
  /** **Validates: Requirements REQ-UI-15, REQ-UI-16, REQ-UI-17, REQ-UI-19** */
  it("never throws, keeps state/level, group order and dictionary keys consistent", () => {
    fc.assert(
      fc.property(verdictArb, fc.string({ maxLength: 200 }), localeArb, extrasArb, (v, text, locale, extras) => {
        const view = buildResultView(v, text, locale as never, extras as never);
        expect(view.kind).toBe("ready");
        if (view.kind !== "ready") return;

        expect(view.state === "neutral").toBe(v.level === "no_signals");
        if (view.state !== "neutral") {
          const cards = view.signalGroups.reduce((n, g) => n + g.cards.length, 0);
          expect(cards).toBeGreaterThanOrEqual(1);
        }

        const idx = view.signalGroups.map((g) => SOURCE_ORDER.indexOf(g.source));
        expect(idx.every((i) => i >= 0)).toBe(true);
        expect(idx).toEqual([...idx].sort((a, b) => a - b));
        expect(new Set(idx).size).toBe(idx.length);

        for (const key of labelKeys(view)) {
          expect(Object.hasOwn(en, key)).toBe(true);
          expect(Object.hasOwn(vi, key)).toBe(true);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("never throws for arbitrary garbage input", () => {
    fc.assert(
      fc.property(fc.anything(), fc.anything(), fc.anything(), fc.anything(), (v, text, locale, extras) => {
        const view = buildResultView(v as never, text as never, locale as never, extras as never);
        expect(["ready", "withheld"]).toContain(view.kind);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("PBT-66: risk meter and wording", () => {
  const base = (riskScore: number): Verdict =>
    ({
      riskScore,
      level: "high",
      monster: "bank",
      signals: [
        { id: "text.urgency", source: "text", severity: 0.5, evidence: "urgent", whyItMatters: "x" },
      ],
      actions: [],
      limitations: [],
      semantic: { status: "ok", skipped: false },
      inputTruncated: false,
      urlsAnalyzed: 0,
      urlsSkipped: 0,
    }) as unknown as Verdict;

  const percentOf = (score: number): number => {
    const view = buildResultView(base(score), "urgent", "en");
    if (view.kind !== "ready") throw new Error("expected ready");
    return view.riskMeter.percent;
  };

  /** **Validates: Requirements REQ-UI-15, REQ-UI-16** */
  it("percent is an integer 0..100 and does not decrease as riskScore grows", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 100 }), fc.integer({ min: 0, max: 100 }), (a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        const pLo = percentOf(lo);
        const pHi = percentOf(hi);
        expect(pLo).toBeLessThanOrEqual(pHi);
      }),
      { numRuns: NUM_RUNS },
    );
    fc.assert(
      fc.property(fc.double(), (score) => {
        const p = percentOf(score);
        expect(Number.isInteger(p)).toBe(true);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(100);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /** **Validates: Requirements REQ-UI-06, REQ-UI-17** */
  it("no resolved label, summary, level or notice text says safe, except notSafeKey", () => {
    fc.assert(
      fc.property(verdictArb, extrasArb, fc.constantFrom("en", "vi"), (v, extras, locale) => {
        const view = buildResultView(v, "text", locale, extras as never);
        expect(view.kind).toBe("ready");
        if (view.kind !== "ready") return;
        const notSafe = view.noSignals?.notSafeKey;
        for (const key of labelKeys(view)) {
          if (key === notSafe) continue;
          for (const lang of ["en", "vi"] as const) {
            const text = fold(t(lang, key, { count: 3, percent: 50 }));
            expect(text).not.toContain("safe");
            expect(text).not.toContain("an toan");
          }
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
