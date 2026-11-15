import { describe, expect, it } from "vitest";
import type { Verdict } from "../../pipeline";
import { splitSections } from "./info-sections";
import { resultSections } from "./page-layout";
import type { SectionId } from "./page-layout";
import { buildResultView } from "./result-view";

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

const VIEWS = {
  "monster with actions and limitations": buildResultView(verdict(), "urgent", "en"),
  "monster without actions or limitations": buildResultView(
    verdict({ actions: [], limitations: [] }),
    "urgent",
    "en",
  ),
  "monster with AI note": buildResultView(verdict(), "urgent", "en", {
    semanticMode: "not-configured",
  }),
  neutral: buildResultView(NEUTRAL, "hello", "en"),
  withheld: buildResultView(null as unknown as Verdict, "x", "en"),
};

describe("splitSections", () => {
  for (const [name, view] of Object.entries(VIEWS)) {
    it(`keeps every section and the order for: ${name}`, () => {
      const all = resultSections(view);
      const { scrolling, pinned } = splitSections(all);
      expect([...scrolling, ...pinned].sort()).toEqual([...all].sort());
      expect(scrolling).toEqual(all.filter((s) => s !== "limitsNote"));
      expect(pinned).toEqual(["limitsNote"]);
    });
  }

  it("pins only the limits note and keeps the rest in order", () => {
    const input: SectionId[] = ["heading", "levelBanner", "limitsNote", "monster", "technical"];
    expect(splitSections(input)).toEqual({
      scrolling: ["heading", "levelBanner", "monster", "technical"],
      pinned: ["limitsNote"],
    });
  });

  it("pinned is empty when there is no limits note", () => {
    expect(splitSections(["heading", "monster"])).toEqual({
      scrolling: ["heading", "monster"],
      pinned: [],
    });
  });

  it("empty and malformed input gives empty parts", () => {
    expect(splitSections([])).toEqual({ scrolling: [], pinned: [] });
    expect(splitSections(null as unknown as SectionId[])).toEqual({ scrolling: [], pinned: [] });
  });
});
