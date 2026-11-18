import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EvidenceList } from "./EvidenceList";
import { buildResultView, t } from "../ui";
import { LinkCreatureArt } from "./art/link-creatures";
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

describe("PBT-112 EvidenceList with link badges", () => {
  /** **Validates: Requirements REQ-PAGE-40, REQ-PAGE-44** */
  it("has no link markup, escapes evidence, and shows no creature name", () => {
    fc.assert(
      fc.property(
        fc.array(signalArb, { minLength: 1, maxLength: 8 }),
        fc.constantFrom<Locale>("en", "vi"),
        (signals, locale) => {
          const view = buildResultView(verdictOf(signals), "", locale);
          if (view.kind !== "ready") return;
          const html = renderToStaticMarkup(createElement(EvidenceList, { view, locale }));
          const tagsOnly = html.replace(/>[^<]*</g, "><");
          expect(tagsOnly).not.toContain("<a ");
          expect(tagsOnly).not.toContain("href=");
          expect(tagsOnly).not.toContain("onClick");
          expect(tagsOnly).not.toContain('role="link"');
          expect(tagsOnly).not.toContain("tabindex");
          for (const c of view.linkCreatures) {
            expect(html).toContain(escapeHtml(c.evidence));
            const name = `>${escapeHtml(t(locale, c.nameKey))}<`;
            expect(html.split(name).length - 1).toBe(0);
          }
          const hasUrl = view.signalGroups.some((g) => g.source === "url");
          const note = escapeHtml(t(locale, "link.plain.note"));
          expect(html.split(note).length - 1).toBe(hasUrl ? 1 : 0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("PBT-115 EvidenceList without badges", () => {
  /** **Validates: Requirements REQ-PAGE-49** */
  it("shows no badge, no creature art, keeps every card evidence, and the plain note once", () => {
    fc.assert(
      fc.property(
        fc.array(signalArb, { minLength: 1, maxLength: 8 }),
        fc.constantFrom<Locale>("en", "vi"),
        (signals, locale) => {
          const view = buildResultView(verdictOf(signals), "", locale);
          if (view.kind !== "ready") return;
          const html = renderToStaticMarkup(createElement(EvidenceList, { view, locale }));
          expect(html).not.toContain(escapeHtml(t(locale, "link.badge.caption")));
          for (const c of view.linkCreatures) {
            expect(html).not.toContain(escapeHtml(t(locale, c.nameKey)));
            const art = renderToStaticMarkup(
              createElement(LinkCreatureArt, { artKey: c.artKey, className: "h-12 w-12" }),
            );
            expect(html).not.toContain(art);
          }
          for (const g of view.signalGroups) {
            for (const card of g.cards) expect(html).toContain(escapeHtml(card.evidence));
          }
          const hasUrl = view.signalGroups.some((g) => g.source === "url");
          const note = escapeHtml(t(locale, "link.plain.note"));
          expect(html.split(note).length - 1).toBe(hasUrl ? 1 : 0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
