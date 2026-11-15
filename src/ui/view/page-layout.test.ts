import { describe, expect, it } from "vitest";
import type { Verdict } from "../../pipeline";
import { resultSections } from "./page-layout";
import { buildResultView } from "./result-view";
import type { ResultExtras } from "./result-view";

function verdict(overrides: Partial<Verdict> = {}): Verdict {
  return {
    riskScore: 60,
    level: "high",
    monster: "bank",
    signals: [
      {
        id: "text.urgency",
        source: "text",
        severity: 0.5,
        evidence: "urgent",
        whyItMatters: "Pressure.",
      },
    ],
    actions: ["Call the bank yourself."],
    limitations: ["We cannot see the sender."],
    semantic: { status: "ok", skipped: false },
    inputTruncated: false,
    urlsAnalyzed: 0,
    urlsSkipped: 0,
    ...overrides,
  };
}

const NEUTRAL = verdict({
  riskScore: 0,
  level: "no_signals",
  monster: "neutral" as Verdict["monster"],
  signals: [],
  actions: [],
  limitations: [],
});

function sections(v: Verdict, extras?: ResultExtras) {
  return resultSections(buildResultView(v, "urgent", "en", extras));
}

describe("resultSections", () => {
  it("monster state, no AI note, with actions and limitations", () => {
    expect(sections(verdict())).toEqual([
      "heading",
      "levelBanner",
      "actions",
      "evidence",
      "limitsNote",
      "limitations",
      "monster",
      "technical",
    ]);
  });

  it("AI note sits directly after the level banner", () => {
    const s = sections(verdict(), { semanticMode: "not-configured" });
    expect(s[s.indexOf("levelBanner") + 1]).toBe("aiNote");
  });

  it("omits actions and limitations when empty", () => {
    const s = sections(verdict({ actions: [], limitations: [] }));
    expect(s).not.toContain("actions");
    expect(s).not.toContain("limitations");
  });

  it("neutral state uses the same order; monster after evidence and limits note", () => {
    const s = sections(NEUTRAL, { semanticMode: "budget-exhausted" });
    expect(s).toEqual([
      "heading",
      "levelBanner",
      "aiNote",
      "evidence",
      "limitsNote",
      "monster",
      "technical",
    ]);
    expect(s.indexOf("monster")).toBeGreaterThan(s.indexOf("evidence"));
    expect(s.indexOf("monster")).toBeGreaterThan(s.indexOf("limitsNote"));
  });

  it("withheld view shows heading, limits note and technical only", () => {
    const view = buildResultView(null as unknown as Verdict, "", "en");
    expect(view.kind).toBe("withheld");
    expect(resultSections(view)).toEqual(["heading", "limitsNote", "technical"]);
  });

  it("withheld view includes notices first when present", () => {
    const view = buildResultView(null as unknown as Verdict, "", "en", {
      semanticMode: "not-configured",
      ingestNotices: [{ code: "ocr-failed" }],
    } as unknown as ResultExtras);
    const s = resultSections(view);
    if (view.notices.length > 0) expect(s).toEqual(["heading", "notices", "limitsNote", "technical"]);
    else expect(s).toEqual(["heading", "limitsNote", "technical"]);
  });
});
