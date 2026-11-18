import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JournalPageTwo } from "./JournalPageTwo";
import { JournalSheet } from "./JournalSheet";
import { MONSTER_PRESENTATION, buildJournalView, buildResultView } from "../ui";
import { KNOWN_SIGNAL_IDS } from "../ui/i18n/signal-ids";
import { shortEvidence } from "../ui/view/evidence";
import type { Verdict } from "../pipeline";
import { NO_REPUTATION } from "../pipeline/reputation-fixture";

// PBT-93: no ids in the rendered result (REQ-HUNT-35, REQ-HUNT-37).

const NUM_RUNS = 100;
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Starts with an upper-case letter or digit and has no dots, so it can never equal an id
// (signal ids are dotted; the other ids are lower-case).
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
    signals: fc.array(signalArb, { minLength: 1, maxLength: 8 }),
    actions: fc.array(fc.string({ maxLength: 40 }), { maxLength: 3 }),
    limitations: fc.array(fc.string({ maxLength: 40 }), { maxLength: 3 }),
    semantic: fc.record({
      status: fc.constantFrom("ok", "unavailable", "degraded"),
      skipped: fc.boolean(),
    }),
    inputTruncated: fc.boolean(),
    urlsAnalyzed: fc.nat({ max: 5 }),
    urlsSkipped: fc.nat({ max: 5 }),
    reputation: fc.constant(NO_REPUTATION),
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

function hasWholeValue(html: string, id: string): boolean {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`["'>]${escaped}["'<]`).test(html);
}

describe("PBT-93: no ids in the rendered result", () => {
  /** **Validates: Requirements REQ-HUNT-35, REQ-HUNT-37** */
  it("markup has no signal id or notice kind, and a ready result shows evidence", () => {
    fc.assert(
      fc.property(
        verdictArb,
        fc.string({ maxLength: 100 }),
        fc.constantFrom("en", "vi"),
        extrasArb,
        (verdict, text, locale, extras) => {
          const view = buildResultView(verdict, text, locale, extras);
          // Both pages: the short note and the full notes (technical details included).
          const journal = buildJournalView(view);
          const html =
            renderToStaticMarkup(
              createElement(JournalSheet, { view, locale, onAgain: () => undefined }),
            ) +
            renderToStaticMarkup(createElement(JournalPageTwo, { view, journal, locale }));

          for (const id of ALL_IDS) {
            expect(hasWholeValue(html, id), id).toBe(false);
          }
          for (const id of KNOWN_SIGNAL_IDS) {
            expect(html, id).not.toContain(`"${id}"`);
          }

          if (view.kind === "ready" && verdict.level !== "no_signals") {
            // The view collapses whitespace and trims, so compare with the shown form.
            const shown = verdict.signals.some((s) =>
              html.includes(escapeHtml(shortEvidence(s.evidence))),
            );
            expect(shown).toBe(true);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
