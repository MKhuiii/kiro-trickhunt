import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HunterButton } from "./HunterButton";
import { t } from "../ui";
import type { Locale } from "../pipeline";

// Markup tests for the home step (REQ-HUNT-11, REQ-HUNT-12).

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function render(locale: Locale): string {
  return renderToStaticMarkup(createElement(HunterButton, { locale, onOpen: () => undefined }));
}

describe("HunterButton markup", () => {
  for (const locale of ["en", "vi"] as const) {
    describe(locale, () => {
      const html = render(locale);

      it("renders a button with the accessible name", () => {
        expect(html).toMatch(/<button\b/);
        expect(html).toContain(`aria-label="${escapeHtml(t(locale, "home.hunter.action"))}"`);
      });

      it("shows the caption and the privacy note", () => {
        expect(html).toContain(escapeHtml(t(locale, "scene.home.caption")));
        expect(html).toContain(escapeHtml(t(locale, "privacy.note")));
      });

      it("has no <text or <title in the markup", () => {
        expect(html).not.toContain("<text");
        expect(html).not.toContain("<title");
      });
    });
  }
});
