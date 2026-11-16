import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Verdict } from "../../pipeline";
import { t } from "../i18n/dictionary";
import { KNOWN_SIGNAL_IDS } from "../i18n/signal-ids";
import { MONSTER_PRESENTATION } from "../monsters";
import { MAX_ACTIONS, MAX_CLUES, buildJournalView } from "./journal";
import { resultSections } from "./page-layout";
import { buildResultView } from "./result-view";

// PBT-96 (REQ-HUNT-66 to REQ-HUNT-68, REQ-HUNT-71).

const LEVELS = ["no_signals", "suspicious", "high", "critical"] as const;
const MONSTERS = ["bank", "prize", "job-bait", "authority", "generic"] as const;
const SOURCES = ["text", "url", "semantic", "image", "qr", "other"] as const;
const NOTICE_KINDS = [
  "ocr-skipped",
  "ocr-too-poor",
  "ocr-failed",
  "payment-qr",
  "wifi-qr",
  "no-url",
  "text-truncated",
  "urls-skipped",
];
const RANK = { high: 2, medium: 1, low: 0 } as const;
const BANNED = /\b(safe|clean)\b|an toàn/i;

const evidenceArb = fc
  .tuple(fc.constantFrom("E", "Q", "7"), fc.string({ maxLength: 40 }))
  .map(([head, rest]) => head + rest.replace(/\./g, ""));

const signalArb = fc.record({
  id: fc.constantFrom(...KNOWN_SIGNAL_IDS),
  source: fc.constantFrom(...SOURCES),
  severity: fc.double({ min: 0, max: 1, noNaN: true }),
  evidence: evidenceArb,
  whyItMatters: fc.constant("why"),
});

const verdictArb: fc.Arbitrary<Verdict> = fc
  .record({
    level: fc.constantFrom(...LEVELS),
    riskScore: fc.integer({ min: 0, max: 100 }),
    monster: fc.constantFrom(...MONSTERS),
    signals: fc.array(signalArb, { minLength: 1, maxLength: 9 }),
    actions: fc.array(fc.string({ minLength: 1, maxLength: 40 }), { maxLength: 6 }),
    limitations: fc.array(fc.string({ maxLength: 40 }), { maxLength: 3 }),
    semantic: fc.record({
      status: fc.constantFrom("ok", "unavailable", "degraded"),
      skipped: fc.boolean(),
    }),
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

const noticeListArb = fc.array(fc.record({ kind: fc.constantFrom(...NOTICE_KINDS) }), {
  maxLength: 4,
});
const extrasArb = fc.record(
  {
    semanticMode: fc.constantFrom("used", "budget-exhausted", "not-configured", "skipped"),
    ingestNotices: noticeListArb,
    buildNotices: noticeListArb,
  },
  { requiredKeys: [] },
);

const ALL_IDS: readonly string[] = [
  ...KNOWN_SIGNAL_IDS,
  ...NOTICE_KINDS,
  ...Object.keys(MONSTER_PRESENTATION),
];

describe("buildJournalView property tests (PBT-96)", () => {
  /** **Validates: Requirements REQ-HUNT-66, REQ-HUNT-67** */
  it("page 1 is short, sorted, and always has the limits note and evidence", () => {
    fc.assert(
      fc.property(verdictArb, extrasArb, (verdict, extras) => {
        const view = buildResultView(verdict, "text", "en", extras);
        const journal = buildJournalView(view);
        if (journal.kind !== "ready" || view.kind !== "ready") return;
        const p = journal.page1;

        expect(p.limitsNoteKey).toBe("result.limitsNote");
        expect(p.clues.length).toBeLessThanOrEqual(MAX_CLUES);
        expect(p.actions.length).toBeLessThanOrEqual(MAX_ACTIONS);
        for (let i = 1; i < p.clues.length; i += 1) {
          expect(RANK[p.clues[i - 1].severityBand]).toBeGreaterThanOrEqual(
            RANK[p.clues[i].severityBand],
          );
        }
        if (verdict.level !== "no_signals") {
          expect(p.clues.length).toBeGreaterThanOrEqual(1);
          expect(p.clues[0].evidence).not.toBe("");
        }
        if (view.aiNote !== null) {
          expect(p.note?.key).toBe("result.aiNote.unavailable");
        }
        const total = (view.aiNote !== null ? 1 : 0) + view.notices.length;
        expect(p.moreNotes + (p.note !== null ? 1 : 0)).toBe(total);
      }),
      { numRuns: 200 },
    );
  });

  /** **Validates: Requirements REQ-HUNT-68** */
  it("page 1 and page 2 hold every section of resultSections, in order", () => {
    fc.assert(
      fc.property(fc.oneof(verdictArb, fc.constant({} as Verdict)), extrasArb, (verdict, extras) => {
        const view = buildResultView(verdict, "text", "en", extras);
        const journal = buildJournalView(view);
        const all = resultSections(view);
        expect([...journal.covers, ...journal.page2].sort()).toEqual([...all].sort());
        expect(all.filter((s) => journal.page2.includes(s))).toEqual(journal.page2);
        expect(journal.covers).toContain("limitsNote");
      }),
      { numRuns: 200 },
    );
  });

  /** **Validates: Requirements REQ-HUNT-67, REQ-HUNT-71** */
  it("page 1 has no internal id and no banned word in its keys", () => {
    fc.assert(
      fc.property(verdictArb, extrasArb, (verdict, extras) => {
        const journal = buildJournalView(buildResultView(verdict, "text", "en", extras));
        if (journal.kind !== "ready") return;
        const p = journal.page1;
        const shown = [
          p.monsterNameKey,
          p.monsterShortKey,
          p.levelKey,
          p.limitsNoteKey,
          p.noSignals?.summaryKey ?? "",
          p.noSignals?.reminderKey ?? "",
          ...p.clues.map((c) => c.explanationKey),
          ...p.clues.map((c) => c.evidence),
          ...p.actions,
        ];
        for (const text of shown) {
          for (const id of ALL_IDS) expect(text).not.toBe(id);
        }
        // The fixed text on page 1 never uses the banned words, in both languages.
        for (const locale of ["en", "vi"] as const) {
          const fixed = [
            p.monsterNameKey,
            p.monsterShortKey,
            p.levelKey,
            p.limitsNoteKey,
            ...(p.noSignals ? [p.noSignals.summaryKey, p.noSignals.reminderKey] : []),
            ...(p.note ? [p.note.key] : []),
          ].map((key) => t(locale, key, { count: p.moreNotes }));
          for (const text of fixed) expect(BANNED.test(text)).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });
});
