import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResultPanel } from "./ResultPanel";
import { MONSTER_PRESENTATION, buildResultView, t } from "../ui";
import type { Locale, Verdict } from "../pipeline";

// Markup tests: no internal ids in the rendered result (REQ-HUNT-20 to REQ-HUNT-22).

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const SIGNAL_IDS = ["text.urgency", "url.ip-address-host"];
const NOTICE_KINDS = ["text-truncated", "urls-skipped", "payment-qr", "ocr-too-poor"];
const LEVEL_KEYS = ["level.high", "level.no_signals", "no_signals"];
const MONSTER_IDS = Object.keys(MONSTER_PRESENTATION);
const ART_KEYS = Object.values(MONSTER_PRESENTATION).map((m) => m.artKey);

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
        evidence: "act now",
        whyItMatters: "Pressure.",
      },
      {
        id: "url.ip-address-host",
        source: "url",
        severity: 0.8,
        evidence: "http://10.0.0.1/login",
        whyItMatters: "Raw address.",
      },
    ],
    actions: ["Call your provider yourself."],
    limitations: ["We cannot see the sender."],
    semantic: { status: "degraded", skipped: false },
    inputTruncated: true,
    urlsAnalyzed: 1,
    urlsSkipped: 2,
    ...overrides,
  };
}

function render(view: ReturnType<typeof buildResultView>, locale: Locale = "en"): string {
  return renderToStaticMarkup(createElement(ResultPanel, { view, locale }));
}

function expectNoIds(html: string): void {
  for (const id of [...SIGNAL_IDS, ...NOTICE_KINDS, ...LEVEL_KEYS, ...ART_KEYS]) {
    expect(html, id).not.toContain(id);
  }
  for (const id of MONSTER_IDS) {
    // Ids are checked as whole attribute or text values: "bank" is also an ordinary word.
    const re = new RegExp(`["'>]${id}["'<]`);
    expect(html, id).not.toMatch(re);
  }
}

describe("ResultPanel without ids", () => {
  const readyView = buildResultView(verdict(), "act now http://10.0.0.1/login", "en", {
    semanticMode: "budget-exhausted",
  });
  const withheldView = buildResultView(null as unknown as Verdict, "", "en", {
    ingestNotices: [{ kind: "payment-qr" }],
  });

  it("builds the expected view kinds", () => {
    expect(readyView.kind).toBe("ready");
    expect(withheldView.kind).toBe("withheld");
  });

  it("ready markup has no ids but shows evidence", () => {
    const html = render(readyView);
    expectNoIds(html);
    expect(html).toContain("act now");
    expect(html).toContain(escapeHtml("http://10.0.0.1/login"));
  });

  it("ready markup shows collapsed details with the plain semantic note", () => {
    const html = render(readyView);
    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
    expect(html).toContain(escapeHtml(t("en", "result.tech.summary")));
    expect(html).toContain(escapeHtml(t("en", "semantic.budget-exhausted")));
  });

  it("withheld markup has no ids and no technical block", () => {
    const html = render(withheldView);
    expectNoIds(html);
    expect(html).not.toContain("<details");
    expect(html).not.toContain(escapeHtml(t("en", "result.tech.summary")));
  });

  it("ready technical block shows only dictionary text, no ids, no art", () => {
    const html = render(readyView);
    expect(html).toContain("<summary");
    expect(html).not.toContain("<svg viewBox=\"0 0 200");
    expect(html).not.toContain("font-mono");
    expect(html).toContain(escapeHtml(t("en", "semantic.budget-exhausted")));
  });

  it("never renders an empty wrapper div", () => {
    expect(render(withheldView)).not.toContain("<div></div>");
    expect(render(readyView)).not.toContain("<div></div>");
  });

  it("vietnamese ready markup has no ids", () => {
    expectNoIds(render(buildResultView(verdict(), "", "vi"), "vi"));
  });
});
