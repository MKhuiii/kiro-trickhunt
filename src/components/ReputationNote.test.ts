import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReputationNote } from "./ReputationNote";
import { t } from "../ui";
import type { ReputationNoteView } from "../ui/view/reputation-note";

const UNAVAILABLE: ReputationNoteView = {
  kind: "unavailable",
  textKey: "reputation.notice.unavailable",
};
const NOT_LISTED: ReputationNoteView = {
  kind: "not-listed",
  textKey: "reputation.notListed.text",
  limitKey: "reputation.notListed.limit",
};

function render(note: ReputationNoteView, locale: "en" | "vi"): string {
  return renderToStaticMarkup(createElement(ReputationNote, { note, locale }));
}

describe("ReputationNote", () => {
  it("renders the unavailable text in both languages", () => {
    for (const locale of ["en", "vi"] as const) {
      const html = render(UNAVAILABLE, locale);
      expect(html).toContain(t(locale, "reputation.notice.unavailable"));
      expect(html.match(/<p[\s>]/g)).toHaveLength(1);
    }
  });

  it("renders the not-listed text, then the limit sentence", () => {
    for (const locale of ["en", "vi"] as const) {
      const html = render(NOT_LISTED, locale);
      const a = html.indexOf(t(locale, "reputation.notListed.text"));
      const b = html.indexOf(t(locale, "reputation.notListed.limit"));
      expect(a).toBeGreaterThan(-1);
      expect(b).toBeGreaterThan(a);
    }
  });

  it("has no link, interaction markup, or fixed pixel sizes", () => {
    for (const note of [UNAVAILABLE, NOT_LISTED]) {
      const html = render(note, "en");
      expect(html).not.toMatch(/<a[\s>]|href=|onclick|role="link"|tabindex|<button/i);
      expect(html).not.toMatch(/\d\s*px/i);
    }
  });

  it("never says safe", () => {
    expect(render(NOT_LISTED, "en")).not.toMatch(/\b(safe|clean|verified)\b/i);
  });
});
