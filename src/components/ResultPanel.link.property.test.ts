import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResultPanel } from "./ResultPanel";
import { buildResultView, resultSections, t } from "../ui";
import type { Locale, Verdict } from "../pipeline";
import { NO_REPUTATION } from "../pipeline/reputation-fixture";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const URL_IDS = [
  "url.brand-lookalike",
  "url.punycode-host",
  "url.ip-address-host",
  "url.at-in-authority",
  "url.excessive-subdomains",
  "url.known-shortener",
  "url.credential-keywords",
] as const;

const fragment = fc.constantFrom(
  "http://",
  "10.0.0.1",
  "login",
  '<a href="x">',
  "</a>",
  "onClick=1",
  'role="link"',
  "&amp;",
  "paypa1",
  "a b",
);
const evidenceArb = fc.array(fragment, { minLength: 1, maxLength: 5 }).map((p) => p.join(""));

const signalArb = fc.record({
  id: fc.constantFrom(...URL_IDS, "text.urgency"),
  severity: fc.double({ min: 0.1, max: 1, noNaN: true }),
  evidence: evidenceArb,
});

function verdictOf(signals: readonly { id: string; severity: number; evidence: string }[]): Verdict {
  return {
    riskScore: 60,
    level: "high",
    monster: "bank",
    signals: signals.map((s) => ({
      id: s.id,
      source: s.id.startsWith("url.") ? "url" : "text",
      severity: s.severity,
      evidence: s.evidence,
      whyItMatters: "Reason.",
    })),
    actions: ["Call your provider yourself."],
    limitations: ["We cannot see the sender."],
    semantic: { status: "ok", skipped: false },
    inputTruncated: false,
    urlsAnalyzed: 1,
    urlsSkipped: 0,
    reputation: NO_REPUTATION,
  } as unknown as Verdict;
}

describe("PBT-114 ResultPanel link spotlight", () => {
  /**
   * **Validates: Requirements REQ-PAGE-47, REQ-PAGE-48, REQ-PAGE-50, REQ-PAGE-51, REQ-PAGE-54**
   */
  it("places the spotlight right, shows each name once in order, and has no link markup", () => {
    fc.assert(
      fc.property(
        fc.array(signalArb, { minLength: 1, maxLength: 8 }),
        fc.constantFrom<Locale>("en", "vi"),
        (signals, locale) => {
          const view = buildResultView(verdictOf(signals), "", locale);
          if (view.kind !== "ready") return;
          const sections = resultSections(view);
          const has = view.linkCreatures.length > 0;
          expect(sections.includes("linkSpotlight")).toBe(has);
          if (has) {
            const i = sections.indexOf("linkSpotlight");
            expect(sections[i - 1]).toBe("levelBanner");
            for (const later of ["aiNote", "actions", "evidence"] as const) {
              const j = sections.indexOf(later);
              if (j >= 0) expect(j).toBeGreaterThan(i);
            }
          }

          const html = renderToStaticMarkup(createElement(ResultPanel, { view, locale }));
          let last = -1;
          for (const c of view.linkCreatures) {
            const name = `>${escapeHtml(t(locale, c.nameKey))}<`;
            expect(html.split(name).length - 1).toBe(1);
            const pos = html.indexOf(name);
            expect(pos).toBeGreaterThan(last);
            last = pos;
          }
          const tagsOnly = html.replace(/>[^<]*</g, "><");
          expect(tagsOnly).not.toContain("<a ");
          expect(tagsOnly).not.toContain("href=");
          expect(tagsOnly).not.toContain("onClick");
          expect(tagsOnly).not.toContain('role="link"');
          const id = "link-spotlight-heading";
          expect(html.split(`id="${id}"`).length - 1).toBe(has ? 1 : 0);
          expect(html.split(`aria-labelledby="${id}"`).length - 1).toBe(has ? 1 : 0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

