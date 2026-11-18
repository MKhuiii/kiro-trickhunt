import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JournalSheet } from "./JournalSheet";
import { JournalPageTwo } from "./JournalPageTwo";
import { buildJournalView, buildResultView, t } from "../ui";
import type { Locale, Verdict } from "../pipeline";
import { NO_REPUTATION } from "../pipeline/reputation-fixture";

// Markup tests for the hunter's journal (REQ-HUNT-65 to REQ-HUNT-71).

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function verdict(over: Record<string, unknown> = {}): Verdict {
  return {
    riskScore: 60,
    level: "high",
    monster: "bank",
    signals: [
      { id: "text.urgency", source: "text", severity: 0.5, evidence: "act now", whyItMatters: "x" },
      { id: "text.otp-request", source: "text", severity: 0.9, evidence: "send code", whyItMatters: "x" },
      { id: "text.threat", source: "text", severity: 0.2, evidence: "locked", whyItMatters: "x" },
      { id: "text.payment-request", source: "text", severity: 0.1, evidence: "pay fee", whyItMatters: "x" },
    ],
    actions: ["Call your provider yourself.", "Do not click.", "Tell a friend.", "Fourth action."],
    limitations: ["We cannot see the sender."],
    semantic: { status: "ok", skipped: false },
    inputTruncated: false,
    urlsAnalyzed: 0,
    urlsSkipped: 0,
    reputation: NO_REPUTATION,
    ...over,
  } as unknown as Verdict;
}

const noop = (): void => undefined;

function render(view: ReturnType<typeof buildResultView>, locale: Locale): string {
  return renderToStaticMarkup(createElement(JournalSheet, { view, locale, onAgain: noop }));
}

describe.each(["en", "vi"] as const)("JournalSheet (%s)", (locale) => {
  const extras = { semanticMode: "not-configured" as const };
  const ready = buildResultView(verdict(), "act now send code", locale, extras);
  const calm = buildResultView(
    verdict({ level: "no_signals", riskScore: 0, monster: null, signals: [], actions: ["Check."] }),
    "hello",
    locale,
    { semanticMode: "used" },
  );
  const withheld = buildResultView(null as unknown as Verdict, "", locale, {});

  it("is one labelled paper with the monster, the level and the heading", () => {
    const html = render(ready, locale);
    expect(html).toContain('class="th-paper');
    expect(html).toContain(`aria-label="${escapeHtml(t(locale, "journal.title"))}"`);
    expect(html).toContain(escapeHtml(t(locale, "monster.bank.name")));
    expect(html).toContain(escapeHtml(t(locale, "level.high")));
    expect(html).toMatch(/<h2\b[^>]*tabindex="-1"/);
  });

  it("shows at most 3 clues and 3 actions, strongest clue first", () => {
    const html = render(ready, locale);
    expect(html).toContain("send code");
    expect(html).toContain("act now");
    expect(html).toContain("locked");
    expect(html).not.toContain("pay fee");
    expect(html).toContain("Tell a friend.");
    expect(html).not.toContain("Fourth action.");
    expect(html.indexOf("send code")).toBeLessThan(html.indexOf("act now"));
  });

  it("shows the AI note as one line and the limits note at the foot", () => {
    const html = render(ready, locale);
    expect(html).toContain(escapeHtml(t(locale, "result.aiNote.unavailable")));
    const note = escapeHtml(t(locale, "result.limitsNote"));
    expect(html).toContain(note);
    expect(html.indexOf("<footer")).toBeLessThan(html.indexOf(note));
  });

  it("offers the full notes and Hunt again as plain text buttons", () => {
    const html = render(ready, locale);
    expect(html).toContain(escapeHtml(t(locale, "journal.more")));
    expect(html).toContain(escapeHtml(t(locale, "hunt.again")));
    expect(html).not.toMatch(/<button[^>]*\bborder/);
  });

  it("keeps page 1 scrollable by keyboard with a label", () => {
    const html = render(ready, locale);
    expect(html).toMatch(
      new RegExp(`role="region"[^>]*tabindex="0"[^>]*aria-label="${escapeHtml(t(locale, "journal.page1.label"))}"`),
    );
  });

  it("uses the no warning signs text and never the banned words for a calm result", () => {
    const html = render(calm, locale);
    expect(html).toContain(escapeHtml(t(locale, "result.noSignals.summary")));
    expect(html).toContain(escapeHtml(t(locale, "result.noSignals.reminder")));
    expect(html).not.toMatch(/\b(safe|clean)\b/i);
    expect(html).not.toContain("an toàn");
  });

  it("shows the withheld message and the limits note for a withheld view", () => {
    const html = render(withheld, locale);
    expect(html).toContain(escapeHtml(t(locale, "result.withheld")));
    expect(html).toContain(escapeHtml(t(locale, "result.limitsNote")));
    expect(html).not.toContain("<details");
  });

  it("page 2 is a labelled scroll region with the full notes in order", () => {
    const journal = buildJournalView(ready);
    const html = renderToStaticMarkup(
      createElement(JournalPageTwo, { view: ready, journal, locale }),
    );
    expect(html).toMatch(
      new RegExp(`tabindex="0"[^>]*aria-label="${escapeHtml(t(locale, "journal.page2.label"))}"|aria-label="${escapeHtml(t(locale, "journal.page2.label"))}"[^>]*tabindex="0"`),
    );
    const keys = [
      "result.actions.heading",
      "result.evidence.heading",
      "result.limitations.heading",
      "result.tech.summary",
    ] as const;
    const positions = keys.map((k) => html.indexOf(escapeHtml(t(locale, k))));
    for (const [i, p] of positions.entries()) expect(p, keys[i]).toBeGreaterThanOrEqual(0);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(html).toContain("pay fee");
    expect(html).toContain("Fourth action.");
  });
});
