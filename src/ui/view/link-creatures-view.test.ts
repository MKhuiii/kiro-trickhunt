import { describe, expect, it } from "vitest";
import type { Verdict } from "../../pipeline";
import { LINK_CREATURES } from "../link-creatures";
import { buildLinkCreatures } from "./link-creatures-view";
import { buildResultView } from "./result-view";
import { NO_REPUTATION } from "../../pipeline/reputation-fixture";

function sig(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    source: "url",
    severity: 0.5,
    evidence: `ev ${id}`,
    whyItMatters: "x",
    ...over,
  };
}

function verdict(signals: unknown[], level = "high"): Verdict {
  return {
    riskScore: 60,
    level,
    monster: level === "no_signals" ? null : "bank",
    signals,
    actions: [],
    limitations: [],
    semantic: { status: "ok", skipped: false },
    inputTruncated: false,
    urlsAnalyzed: 1,
    urlsSkipped: 0,
    reputation: NO_REPUTATION,
  } as unknown as Verdict;
}

function creatures(v: Verdict) {
  const view = buildResultView(v, "", "en");
  if (view.kind !== "ready") throw new Error("expected ready view");
  return view.linkCreatures;
}

describe("buildLinkCreatures", () => {
  it("one lookalike signal gives the Doppelganger with its evidence", () => {
    const list = creatures(
      verdict([sig("url.brand-lookalike", { evidence: "paypa1 looks like paypal (edit distance 1)" })]),
    );
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("doppelganger");
    expect(list[0].nameKey).toBe("link.doppelganger.name");
    expect(list[0].tone).toBe("strong");
    expect(list[0].toneLabelKey).toBe("link.tone.strong.label");
    expect(list[0].toneIconKey).toBe("icon-tone-strong");
    expect(list[0].explanationKey).toBe("link.tone.strong.explain");
    expect(list[0].tipKeys).toHaveLength(3);
    expect(list[0].signalIds).toEqual(["url.brand-lookalike"]);
    expect(list[0].evidence).toBe("paypa1 looks like paypal (edit distance 1)");
  });

  it("plague-mark uses its own explanation key, others use the tone line", () => {
    const list = creatures(
      verdict([
        sig("url.reputation-listed", { severity: 0.9 }),
        sig("url.known-shortener", { severity: 0.2 }),
      ]),
    );
    expect(list.map((c) => c.id)).toEqual(["plague-mark", "cloaked-gate"]);
    expect(list[0].explanationKey).toBe("link.plague-mark.explain");
    expect(list[0].toneLabelKey).toBe("link.tone.strong.label");
    expect(list[1].explanationKey).toBe("link.tone.soft.explain");
  });

  it("sorts by severity: Faceless One before Wisp", () => {
    const list = creatures(
      verdict([
        sig("url.credential-keywords", { severity: 0.45 }),
        sig("url.ip-address-host", { severity: 0.7 }),
      ]),
    );
    expect(list.map((c) => c.id)).toEqual(["faceless-one", "wisp"]);
  });

  it("breaks severity ties by table order", () => {
    const list = creatures(
      verdict([
        sig("url.credential-keywords", { severity: 0.5 }),
        sig("url.brand-lookalike", { severity: 0.5 }),
      ]),
    );
    expect(list.map((c) => c.id)).toEqual(["doppelganger", "wisp"]);
  });

  it("gives [] for text-only signals and for no_signals", () => {
    expect(creatures(verdict([sig("text.urgency", { source: "text" })]))).toEqual([]);
    expect(creatures(verdict([], "no_signals"))).toEqual([]);
  });

  it("ignores url.* ids with a non-url source", () => {
    expect(creatures(verdict([sig("url.known-shortener", { source: "text" })]))).toEqual([]);
  });

  it("ignores signals with empty evidence", () => {
    expect(
      creatures(verdict([sig("url.known-shortener", { evidence: "   " }), sig("text.urgency", { source: "text" })])),
    ).toEqual([]);
  });

  it("two shortener signals give one Cloaked Gate with the first evidence", () => {
    const list = creatures(
      verdict([
        sig("url.known-shortener", { evidence: "bit.ly" }),
        sig("url.known-shortener", { evidence: "tinyurl.com", severity: 0.9 }),
      ]),
    );
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("cloaked-gate");
    expect(list[0].evidence).toBe("bit.ly");
    expect(list[0].signalIds).toEqual(["url.known-shortener"]);
  });

  it("treats non-finite severity as 0", () => {
    const list = creatures(
      verdict([
        sig("url.known-shortener", { severity: Number.NaN }),
        sig("url.credential-keywords", { severity: 0.1 }),
      ]),
    );
    expect(list.map((c) => c.id)).toEqual(["wisp", "cloaked-gate"]);
  });

  it("is total for garbage input", () => {
    for (const x of [undefined, null, 3, "x", {}, [null, 1, "a", { source: "url" }]]) {
      expect(buildLinkCreatures(x)).toEqual([]);
    }
  });

  it("covers every creature of the table", () => {
    const list = buildLinkCreatures(LINK_CREATURES.map((c) => sig(c.signalId)));
    expect(list.map((c) => c.id).sort()).toEqual(LINK_CREATURES.map((c) => c.id).sort());
  });
});
