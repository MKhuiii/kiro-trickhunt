import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Verdict } from "../../pipeline";
import { t } from "../i18n/dictionary";
import { KNOWN_SIGNAL_IDS } from "../i18n/signal-ids";
import { LEVEL_PRESENTATION } from "../theme/levels";
import { buildResultView } from "./result-view";
import type { ReadyResultView } from "./result-view";
import { NO_REPUTATION } from "../../pipeline/reputation-fixture";

const NUM_RUNS = 150;
const MONSTERS = ["bank", "prize", "job-bait", "authority", "generic"] as const;
const SOURCES = ["text", "url", "semantic", "image", "qr", "other"] as const;
const MODES = ["used", "budget-exhausted", "not-configured", "skipped"] as const;
const STATUSES = ["ok", "unavailable", "degraded"] as const;

const signalArb = fc.record({
  id: fc.constantFrom(...KNOWN_SIGNAL_IDS),
  source: fc.constantFrom(...SOURCES),
  severity: fc.double({ min: 0, max: 1, noNaN: true }),
  evidence: fc
    .tuple(fc.constantFrom("a", "B", "7", "x"), fc.string({ maxLength: 40 }))
    .map(([h, r]) => h + r),
  whyItMatters: fc.constant("why"),
});

/** Valid verdict: non-no_signals has at least one signal; no_signals has none. */
function verdictArb(levels: readonly ("no_signals" | "suspicious" | "high" | "critical")[]) {
  return fc
    .record({
      level: fc.constantFrom(...levels),
      riskScore: fc.integer({ min: 0, max: 100 }),
      monster: fc.constantFrom(...MONSTERS),
      signals: fc.array(signalArb, { minLength: 1, maxLength: 6 }),
      actions: fc.array(fc.string({ maxLength: 30 }), { maxLength: 3 }),
      limitations: fc.array(fc.string({ maxLength: 30 }), { maxLength: 3 }),
      semantic: fc.record({
        status: fc.constantFrom(...STATUSES),
        skipped: fc.boolean(),
        reason: fc.option(fc.string({ maxLength: 20 }), { nil: undefined }),
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
}

const extrasArb = fc.option(
  fc.record(
    {
      semanticMode: fc.constantFrom(...MODES),
      userText: fc.string({ maxLength: 30 }),
    },
    { requiredKeys: [] },
  ),
  { nil: undefined },
);

function ready(v: Verdict, extras: unknown): ReadyResultView {
  const view = buildResultView(v, "some text", "en", extras as never);
  if (view.kind !== "ready") throw new Error("expected ready view");
  return view;
}

function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}+/gu, "").replace(/đ/g, "d").toLowerCase();
}

const FORBIDDEN = ["scam", "dangerous", "stop", "malicious", "lua dao", "nguy hiem", "doc hai", "dung lai"];

describe("PBT-75: calm suspicious", () => {
  /** **Validates: Requirements REQ-PAGE-01, REQ-PAGE-02, REQ-PAGE-03, REQ-PAGE-06** */
  it("suspicious is a generic monster with calm texts and no stop icon", () => {
    expect(LEVEL_PRESENTATION.suspicious.iconKey).not.toBe("icon-stop");
    fc.assert(
      fc.property(verdictArb(["suspicious"]), extrasArb, (v, extras) => {
        const view = ready(v, extras);
        expect(view.state).toBe("monster");
        expect(view.monster.id).toBe("generic");
        for (const lang of ["en", "vi"] as const) {
          const label = t(lang, view.levelKey);
          const texts = [label, t(lang, "a11y.result-ready", { level: label })];
          for (const text of texts) {
            const f = fold(text);
            for (const word of FORBIDDEN) expect(f).not.toContain(word);
          }
        }
        expect(fold(view.announcement)).not.toContain("scam");
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("PBT-76: AI note rule", () => {
  /** **Validates: Requirements REQ-PAGE-07** */
  it("aiNote is non-null exactly under the REQ-PAGE-07 condition", () => {
    fc.assert(
      fc.property(
        verdictArb(["no_signals", "suspicious", "high", "critical"]),
        fc.option(fc.constantFrom(...MODES), { nil: undefined }),
        (v, mode) => {
          const status = v.semantic.status as string;
          const expected =
            mode === "budget-exhausted" ||
            mode === "not-configured" ||
            status === "degraded" ||
            (status === "unavailable" && mode === undefined);
          const view = ready(v, mode === undefined ? undefined : { semanticMode: mode });
          expect(view.aiNote !== null).toBe(expected);
          if (view.aiNote !== null) expect(view.aiNote.textKey).toBe("result.aiNote.unavailable");
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("PBT-77: strong reminder", () => {
  /** **Validates: Requirements REQ-PAGE-10** */
  it("uses the strong reminder exactly when aiNote is present; texts never say safe", () => {
    fc.assert(
      fc.property(verdictArb(["no_signals"]), extrasArb, (v, extras) => {
        const view = ready(v, extras);
        expect(view.noSignals).not.toBeNull();
        expect(view.noSignals?.reminderKey).toBe(
          view.aiNote !== null ? "result.noSignals.reminderStrong" : "result.noSignals.reminder",
        );
      }),
      { numRuns: NUM_RUNS },
    );
    for (const lang of ["en", "vi"] as const) {
      const normal = t(lang, "result.noSignals.reminder");
      const strong = t(lang, "result.noSignals.reminderStrong");
      expect(strong).not.toBe(normal);
      for (const text of [normal, strong]) {
        const f = fold(text);
        expect(f).not.toContain("safe");
        expect(f).not.toContain("an toan");
      }
    }
  });
});
