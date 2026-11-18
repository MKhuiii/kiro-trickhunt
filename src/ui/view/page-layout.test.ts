import { describe, expect, it } from "vitest";
import type { Verdict } from "../../pipeline";
import { resultSections } from "./page-layout";
import { buildResultView } from "./result-view";
import type { ResultExtras } from "./result-view";
import { NO_REPUTATION } from "../../pipeline/reputation-fixture";

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
    reputation: NO_REPUTATION,
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

  const LINK_SIGNAL = {
    id: "url.brand-lookalike",
    source: "url",
    severity: 0.5,
    evidence: "paypa1 looks like paypal",
    whyItMatters: "x",
  } as unknown as Verdict["signals"][number];

  it("linkSpotlight sits right after levelBanner (before aiNote) when links exist", () => {
    const v = verdict({ signals: [LINK_SIGNAL] });
    const s = sections(v, { semanticMode: "not-configured" });
    expect(s.filter((x) => x === "linkSpotlight")).toHaveLength(1);
    expect(s.indexOf("linkSpotlight")).toBe(s.indexOf("levelBanner") + 1);
    expect(s[s.indexOf("linkSpotlight") + 1]).toBe("aiNote");
  });

  const CHECKED = { status: "ok", checkedCount: 1 } as unknown as Verdict["reputation"];

  it("reputationNote follows levelBanner when there is no creature", () => {
    const s = sections(verdict({ reputation: CHECKED }), {
      semanticMode: "not-configured",
      reputationMode: "checked",
    });
    expect(s.filter((x) => x === "reputationNote")).toHaveLength(1);
    expect(s.indexOf("reputationNote")).toBe(s.indexOf("levelBanner") + 1);
    expect(s[s.indexOf("reputationNote") + 1]).toBe("aiNote");
  });

  it("no reputationNote section when creatures exist (spotlight renders it) or note is null", () => {
    const withLink = sections(verdict({ signals: [LINK_SIGNAL], reputation: CHECKED }), {
      reputationMode: "checked",
    });
    expect(withLink).not.toContain("reputationNote");
    expect(withLink).toContain("linkSpotlight");
    expect(sections(verdict())).not.toContain("reputationNote");
  });

  it("views without links get no linkSpotlight and the same list as before", () => {
    expect(sections(verdict())).not.toContain("linkSpotlight");
    const view = buildResultView(null as unknown as Verdict, "", "en");
    expect(resultSections(view)).not.toContain("linkSpotlight");
  });

  it("stays total when linkCreatures is garbage", () => {
    const view = buildResultView(verdict(), "urgent", "en");
    for (const bad of [null, undefined, "x", 5, {}]) {
      const garbled = { ...view, linkCreatures: bad } as unknown as typeof view;
      expect(resultSections(garbled)).not.toContain("linkSpotlight");
    }
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
