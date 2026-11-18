import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InfoFrame } from "./InfoFrame";
import { buildResultView, t } from "../ui";
import type { Locale, Verdict } from "../pipeline";
import { NO_REPUTATION } from "../pipeline/reputation-fixture";

// Markup tests for the information frame (REQ-HUNT-02, 29, 30, 36).

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function verdict(): Verdict {
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
    ],
    actions: ["Call your provider yourself."],
    limitations: ["We cannot see the sender."],
    semantic: { status: "degraded", skipped: false },
    inputTruncated: false,
    urlsAnalyzed: 0,
    urlsSkipped: 0,
    reputation: NO_REPUTATION,
  };
}

function render(view: ReturnType<typeof buildResultView>, locale: Locale): string {
  return renderToStaticMarkup(createElement(InfoFrame, { view, locale }));
}

/** Returns the scroll region markup (from its opening tag to its matching close). */
function scrollRegion(html: string): { start: number; end: number } {
  const start = html.search(/<div[^>]*tabindex="0"/);
  expect(start).toBeGreaterThanOrEqual(0);
  const tag = /<div\b|<\/div>/g;
  tag.lastIndex = start;
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(html)) !== null) {
    depth += m[0] === "</div>" ? -1 : 1;
    if (depth === 0) return { start, end: m.index + m[0].length };
  }
  throw new Error("scroll region is not closed");
}

describe.each(["en", "vi"] as const)("InfoFrame (%s)", (locale) => {
  const ready = buildResultView(verdict(), "act now", locale, {});
  const withheld = buildResultView(null as unknown as Verdict, "", locale, {});

  it("builds the expected view kinds", () => {
    expect(ready.kind).toBe("ready");
    expect(withheld.kind).toBe("withheld");
  });

  it("has the frame label and tabindex 0 on the scroll region", () => {
    const html = render(ready, locale);
    const label = escapeHtml(t(locale, "result.frame.label"));
    expect(html).toContain(`aria-label="${label}"`);
    const { start } = scrollRegion(html);
    const openTag = html.slice(start, html.indexOf(">", start));
    expect(openTag).toContain('tabindex="0"');
    expect(openTag).toContain(`aria-label="${label}"`);
  });

  it("places the limits note after the scroll region closes", () => {
    const html = render(ready, locale);
    const note = escapeHtml(t(locale, "result.limitsNote"));
    const { start, end } = scrollRegion(html);
    expect(html.slice(start, end)).not.toContain(note);
    expect(html.slice(end)).toContain(note);
  });

  it("keeps the resultSections order inside the scroll region", () => {
    const html = render(ready, locale);
    const { start, end } = scrollRegion(html);
    const region = html.slice(start, end);
    const keys = [
      "result.heading",
      "result.actions.heading",
      "result.evidence.heading",
      "result.limitations.heading",
      "result.tech.summary",
    ] as const;
    const positions = keys.map((k) => region.indexOf(escapeHtml(t(locale, k))));
    for (const [i, p] of positions.entries()) expect(p, keys[i]).toBeGreaterThanOrEqual(0);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("withheld view shows no empty technical block", () => {
    const html = render(withheld, locale);
    expect(html).not.toContain("<details");
    expect(html).not.toContain(escapeHtml(t(locale, "result.tech.summary")));
    expect(html).not.toContain("<div></div>");
    expect(html).toContain(escapeHtml(t(locale, "result.limitsNote")));
  });
});
