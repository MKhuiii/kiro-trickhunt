import { describe, expect, it } from "vitest";
import type { Verdict } from "../../pipeline";
import { buildJournalView, firstSentence, MAX_ACTIONS, MAX_CLUES, pickClues } from "./journal";
import { resultSections } from "./page-layout";
import { buildResultView } from "./result-view";
import type { ReadyResultView } from "./result-view";
import { NO_REPUTATION } from "../../pipeline/reputation-fixture";

function signal(id: string, severity: number, evidence: string) {
  return { id, source: "text", severity, evidence, whyItMatters: "why" };
}

function verdict(over: Record<string, unknown> = {}): Verdict {
  return {
    level: "critical",
    riskScore: 90,
    monster: "bank",
    signals: [
      signal("text.urgency", 0.2, "Low one"),
      signal("text.otp-request", 0.9, "High one"),
      signal("text.threat", 0.5, "Medium one"),
      signal("text.payment-request", 0.95, "High two"),
      signal("text.prize-reward", 0.1, "Low two"),
    ],
    actions: ["a1", "a2", "a3", "a4"],
    limitations: ["l1"],
    semantic: { status: "ok", skipped: false },
    inputTruncated: false,
    urlsAnalyzed: 0,
    urlsSkipped: 0,
    reputation: NO_REPUTATION,
    ...over,
  } as unknown as Verdict;
}

function ready(v: Verdict, extras?: Parameters<typeof buildResultView>[3]): ReadyResultView {
  const view = buildResultView(v, "text", "en", extras);
  if (view.kind !== "ready") throw new Error("expected a ready view");
  return view;
}

describe("buildJournalView with links", () => {
  it("puts linkSpotlight first on page 2, never on page 1", () => {
    const linkSignal = {
      id: "url.brand-lookalike",
      source: "url",
      severity: 0.6,
      evidence: "paypa1 looks like paypal",
      whyItMatters: "why",
    };
    const view = ready(verdict({ signals: [linkSignal, signal("text.urgency", 0.2, "Low one")] }));
    expect(view.linkCreatures.length).toBeGreaterThan(0);
    const journal = buildJournalView(view);
    expect(journal.page2[0]).toBe("linkSpotlight");
    expect(journal.covers).not.toContain("linkSpotlight");
    expect([...journal.covers, ...journal.page2].sort()).toEqual([...resultSections(view)].sort());
  });

  it("puts reputationNote on page 2 and counts it as a note on page 1", () => {
    const v = verdict({ urlsAnalyzed: 1, reputation: { status: "ok", checkedCount: 1 } });
    const view = ready(v, { semanticMode: "used", reputationMode: "checked" });
    expect(view.reputationNote?.kind).toBe("not-listed");
    const journal = buildJournalView(view);
    if (journal.kind !== "ready") throw new Error("expected ready");
    expect(journal.page2).toContain("reputationNote");
    expect(journal.covers).not.toContain("reputationNote");
    expect(journal.page1.note).toBeNull();
    expect(journal.page1.moreNotes).toBe(1);
  });

  it("page 2 has no linkSpotlight without links", () => {
    expect(buildJournalView(ready(verdict())).page2).not.toContain("linkSpotlight");
  });
});

describe("buildJournalView page 1", () => {
  it("keeps at most 3 clues, most serious first, stable for equal severity", () => {
    const journal = buildJournalView(ready(verdict()));
    if (journal.kind !== "ready") throw new Error("expected ready");
    const clues = journal.page1.clues;
    expect(clues).toHaveLength(MAX_CLUES);
    expect(clues.map((c) => c.evidence)).toEqual(["High one", "High two", "Medium one"]);
  });

  it("keeps at most 3 actions in order", () => {
    const journal = buildJournalView(ready(verdict()));
    if (journal.kind !== "ready") throw new Error("expected ready");
    expect(journal.page1.actions).toEqual(["a1", "a2", "a3"]);
    expect(journal.page1.actions.length).toBeLessThanOrEqual(MAX_ACTIONS);
  });

  it("always carries the limits note and the level", () => {
    const journal = buildJournalView(ready(verdict()));
    if (journal.kind !== "ready") throw new Error("expected ready");
    expect(journal.page1.limitsNoteKey).toBe("result.limitsNote");
    expect(journal.page1.levelKey).toBe("level.critical");
    expect(journal.page1.noSignals).toBeNull();
  });

  it("uses the AI note as the one note and counts the other notices", () => {
    const extras = {
      semanticMode: "not-configured" as const,
      buildNotices: [{ kind: "payment-qr" }, { kind: "wifi-qr" }],
    };
    const journal = buildJournalView(ready(verdict(), extras));
    if (journal.kind !== "ready") throw new Error("expected ready");
    expect(journal.page1.note?.key).toBe("result.aiNote.unavailable");
    expect(journal.page1.moreNotes).toBe(2);
  });

  it("uses a warning notice when the AI check ran", () => {
    const extras = {
      semanticMode: "used" as const,
      buildNotices: [{ kind: "payment-qr" }],
    };
    const journal = buildJournalView(ready(verdict(), extras));
    if (journal.kind !== "ready") throw new Error("expected ready");
    expect(journal.page1.note).not.toBeNull();
    expect(journal.page1.moreNotes).toBe(0);
  });

  it("has no note and no more notes when there is nothing to say", () => {
    const journal = buildJournalView(ready(verdict(), { semanticMode: "used" }));
    if (journal.kind !== "ready") throw new Error("expected ready");
    expect(journal.page1.note).toBeNull();
    expect(journal.page1.moreNotes).toBe(0);
  });

  it("shows the no-warning-signs text for no_signals", () => {
    const v = verdict({ level: "no_signals", riskScore: 0, monster: null, signals: [] });
    const journal = buildJournalView(ready(v, { semanticMode: "used" }));
    if (journal.kind !== "ready") throw new Error("expected ready");
    expect(journal.page1.clues).toEqual([]);
    expect(journal.page1.noSignals?.summaryKey).toBe("result.noSignals.summary");
    expect(journal.page1.limitsNoteKey).toBe("result.limitsNote");
  });
});

describe("buildJournalView pages together", () => {
  it("page 1 and page 2 hold every section in order", () => {
    const views = [
      buildResultView(verdict(), "text", "en", { semanticMode: "not-configured" }),
      buildResultView(verdict({ actions: [] }), "text", "en", { semanticMode: "used" }),
      buildResultView(
        verdict({ level: "no_signals", riskScore: 0, monster: null, signals: [] }),
        "text",
        "en",
      ),
      buildResultView({} as Verdict, "text", "en"),
    ];
    for (const view of views) {
      const journal = buildJournalView(view);
      const all = resultSections(view);
      expect([...journal.covers, ...journal.page2].sort()).toEqual([...all].sort());
      expect(journal.page2).toEqual(all.filter((s) => journal.page2.includes(s)));
    }
  });

  it("gives a withheld view the message and the limits note", () => {
    const view = buildResultView({} as Verdict, "text", "en");
    const journal = buildJournalView(view);
    expect(journal.kind).toBe("withheld");
    if (journal.kind !== "withheld") return;
    expect(journal.messageKey).toBe("result.withheld");
    expect(journal.limitsNoteKey).toBe("result.limitsNote");
    expect(journal.covers).toContain("limitsNote");
  });

  it("never throws on a malformed view", () => {
    expect(() => buildJournalView(null as never)).not.toThrow();
    expect(buildJournalView(undefined as never).kind).toBe("withheld");
  });
});

describe("pickClues", () => {
  it("returns an empty list for max 0", () => {
    expect(pickClues(ready(verdict()), 0)).toEqual([]);
  });
});

describe("firstSentence", () => {
  it("keeps the first sentence only", () => {
    expect(firstSentence("The message asks for a code. Do not share it.")).toBe(
      "The message asks for a code.",
    );
    expect(firstSentence("Tin nh?n d�i m� OTP! �?ng chia s?.")).toBe("Tin nh?n d�i m� OTP!");
  });

  it("returns the whole text when there is no full stop, and handles junk", () => {
    expect(firstSentence("  no stop here  ")).toBe("no stop here");
    expect(firstSentence("")).toBe("");
    expect(firstSentence(undefined as never)).toBe("");
  });
});
