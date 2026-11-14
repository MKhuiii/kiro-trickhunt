import { describe, expect, it } from "vitest";
import { createPipeline } from "../../pipeline";
import type { Verdict } from "../../pipeline";
import { t } from "../i18n/dictionary";
import { buildResultView } from "./result-view";
import type { ReadyResultView } from "./result-view";

const BANK_TEXT = "Urgent: your account has been locked. Enter your OTP now to unlock it.";
const BANK_URL = "http://paypa1.com/verify";

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

function sig(over: Record<string, unknown>) {
  return {
    id: "text.urgency",
    source: "text",
    severity: 0.5,
    evidence: "urgent",
    whyItMatters: "x",
    ...over,
  } as unknown as Verdict["signals"][number];
}

function ready(v: unknown, text = "", extras?: Parameters<typeof buildResultView>[3]): ReadyResultView {
  const view = buildResultView(v as Verdict, text, "en", extras);
  if (view.kind !== "ready") throw new Error("expected ready view");
  return view;
}

describe("buildResultView: monster state", () => {
  it("real pipeline bank phishing gives the bank monster", async () => {
    const v = await createPipeline({ llmClient: null }).run({
      text: BANK_TEXT,
      urls: [BANK_URL],
    });
    const view = ready(v, BANK_TEXT);
    expect(view.state).toBe("monster");
    expect(view.monster.id).toBe("bank");
    expect(t("en", view.monster.nameKey)).toBe("Bank Ghost");
    expect(view.noSignals).toBeNull();
    expect(view.signalGroups.length).toBeGreaterThan(0);
    expect(view.highlights.length).toBeGreaterThan(0);
  });

  it("hand-made verdict gives the bank monster", () => {
    const view = ready(verdict(), "This is urgent");
    expect(view.monster.id).toBe("bank");
    expect(t("en", view.monster.nameKey)).toBe("Bank Ghost");
    expect(view.monster.tipKeys).toHaveLength(3);
    expect(view.levelKey).toBe("level.high");
    expect(view.riskMeter.darknessBand).toBe(2);
  });

  it("unknown or null monster on a non-neutral verdict falls back to generic", () => {
    expect(ready(verdict({ monster: null })).monster.id).toBe("generic");
    expect(ready(verdict({ monster: "dragon" as never })).monster.id).toBe("generic");
    expect(ready(verdict({ monster: "neutral" as never })).monster.id).toBe("generic");
  });
});

describe("buildResultView: neutral state", () => {
  it("no_signals gives neutral with the three keys", async () => {
    const v = await createPipeline({ llmClient: null }).run({
      text: "Hi team, the meeting is moved to 3pm tomorrow in room B.",
    });
    const view = ready(v, "text");
    expect(view.state).toBe("neutral");
    expect(view.monster.id).toBe("neutral");
    expect(view.signalGroups).toEqual([]);
    expect(view.noSignals).toEqual({
      summaryKey: "result.noSignals.summary",
      notSafeKey: "result.noSignals.notSafeNote",
      reminderKey: "result.noSignals.reminder",
    });
    expect(view.riskMeter.percent).toBe(0);
  });
});

describe("buildResultView: withheld", () => {
  const withheldCases: [string, unknown][] = [
    ["null", null],
    ["a string", "nope"],
    ["empty object", {}],
    ["unknown level", verdict({ level: "safe" as never })],
    ["inherited level name", verdict({ level: "constructor" as never })],
    ["signals not an array", { ...verdict(), signals: "x" }],
    ["no_signals with signals", verdict({ level: "no_signals", monster: null })],
    ["non-no_signals with no signals", verdict({ signals: [] })],
    ["no usable card (blank evidence)", verdict({ signals: [sig({ evidence: "   " })] })],
    ["no usable card (non-object signals)", { ...verdict(), signals: [null, 4] }],
  ];

  for (const [name, v] of withheldCases) {
    it(`${name} gives withheld`, () => {
      const view = buildResultView(v as Verdict, "", "en");
      expect(view.kind).toBe("withheld");
      if (view.kind === "withheld") expect(view.messageKey).toBe("result.withheld");
    });
  }

  it("withheld view still carries notices", () => {
    const view = buildResultView(null as unknown as Verdict, "", "en", {
      ingestNotices: [{ kind: "payment-qr" }],
    });
    expect(view.kind).toBe("withheld");
    expect(view.notices.map((n) => n.kind)).toEqual(["payment-qr"]);
  });

  it("never throws on a throwing getter", () => {
    const bad = {
      get level(): never {
        throw new Error("boom");
      },
    };
    expect(buildResultView(bad as unknown as Verdict, "", "en").kind).toBe("withheld");
  });
});

describe("buildResultView: cards and groups", () => {
  it("unknown signal id gives signal.unknown.explain", () => {
    const view = ready(verdict({ signals: [sig({ id: "text.brand-new" })] }));
    expect(view.signalGroups[0].cards[0].explanationKey).toBe("signal.unknown.explain");
  });

  it("known signal id gets its own explanation key", () => {
    const view = ready(verdict());
    expect(view.signalGroups[0].cards[0].explanationKey).toBe("signal.text.urgency.explain");
  });

  it("groups follow the order text, url, semantic, image, qr, other", () => {
    const signals = [
      sig({ source: "qr", id: "url.ip-address-host" }),
      sig({ source: "weird" }),
      sig({ source: "image" }),
      sig({ source: "semantic", id: "semantic.pressure-escalation" }),
      sig({ source: "url", id: "url.ip-address-host" }),
      sig({ source: "text" }),
    ];
    const view = ready(verdict({ signals }));
    expect(view.signalGroups.map((g) => g.source)).toEqual([
      "text",
      "url",
      "semantic",
      "image",
      "qr",
      "other",
    ]);
    expect(view.signalGroups[0].labelKey).toBe("source.text");
    expect(view.signalGroups[5].labelKey).toBe("source.other");
  });

  it("skips cards with blank evidence but keeps the others", () => {
    const view = ready(verdict({ signals: [sig({ evidence: " " }), sig({ evidence: "ok" })] }));
    expect(view.signalGroups).toHaveLength(1);
    expect(view.signalGroups[0].cards.map((c) => c.evidence)).toEqual(["ok"]);
  });

  it("maps severity to bands at 0.4 and 0.7", () => {
    const bands = [0, 0.39, 0.4, 0.69, 0.7, 1].map(
      (severity) =>
        ready(verdict({ signals: [sig({ severity })] })).signalGroups[0].cards[0].severityBand,
    );
    expect(bands).toEqual(["low", "low", "medium", "medium", "high", "high"]);
  });
});

describe("buildResultView: meter, lists, announcement", () => {
  it("clamps and rounds riskMeter.percent", () => {
    const pct = (riskScore: number) => ready(verdict({ riskScore })).riskMeter.percent;
    expect(pct(150)).toBe(100);
    expect(pct(-5)).toBe(0);
    expect(pct(Number.NaN)).toBe(0);
    expect(pct(49.6)).toBe(50);
    expect(pct(73)).toBe(73);
  });

  it("copies actions and limitations", () => {
    const view = ready(verdict({ actions: ["a", "b"], limitations: ["c"] }));
    expect(view.actions).toEqual(["a", "b"]);
    expect(view.limitations).toEqual(["c"]);
  });

  it("announcement names the level label in the given locale", () => {
    const en = buildResultView(verdict({ level: "critical" }), "", "en");
    expect(en.kind === "ready" && en.announcement).toBe(
      `Result ready: ${t("en", "level.critical")}`,
    );
    const vi = buildResultView(verdict({ level: "critical" }), "", "vi");
    expect(vi.kind === "ready" && vi.announcement).toContain(t("vi", "level.critical"));
  });

  it("semanticNoteKey honors budget-exhausted with a degraded verdict", () => {
    const view = ready(
      verdict({ semantic: { status: "degraded", reason: "timeout", skipped: false } }),
      "",
      { semanticMode: "budget-exhausted" },
    );
    expect(view.semanticNoteKey).toBe("semantic.budget-exhausted");
    expect(ready(verdict({ semantic: { status: "degraded", skipped: false } })).semanticNoteKey).toBe(
      "semantic.degraded",
    );
  });
});

describe("buildResultView: notices", () => {
  it("QR-only hides ocr-too-poor", () => {
    const view = ready(verdict(), "", {
      ingestNotices: [{ kind: "ocr-too-poor" }],
      qrResults: [{ kind: "url" }],
    });
    expect(view.notices.map((n) => n.kind)).not.toContain("ocr-too-poor");
  });

  it("no QR and no user text shows ocr-too-poor", () => {
    const view = ready(verdict(), "", {
      ingestNotices: [{ kind: "ocr-too-poor" }],
      userText: "",
    });
    expect(view.notices.map((n) => n.kind)).toContain("ocr-too-poor");
  });

  it("derives text-truncated and urls-skipped from the verdict", () => {
    const view = ready(verdict({ inputTruncated: true, urlsSkipped: 2 }));
    expect(view.notices.map((n) => n.kind)).toEqual(["text-truncated", "urls-skipped"]);
  });
});
