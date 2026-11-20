import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BagPanel } from "./BagPanel";
import { t } from "../ui";
import type { Slots } from "../ui";
import type { Locale } from "../pipeline";

// Markup tests for the bag step (REQ-HUNT-14 to REQ-HUNT-16, REQ-HUNT-20).

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function render(locale: Locale, slots: Slots, text = ""): string {
  const noop = (): void => undefined;
  return renderToStaticMarkup(
    createElement(BagPanel, {
      locale,
      slots,
      text,
      file: null,
      onToggle: noop,
      onTextChange: noop,
      onFileChange: noop,
      onConfirm: noop,
      onClose: noop,
    }),
  );
}

function submitButton(html: string): string {
  const match = /<button\b[^>]*type="submit"[^>]*>.*?<\/button>/.exec(html);
  if (!match) throw new Error("no submit button");
  return match[0];
}

describe("BagPanel markup", () => {
  for (const locale of ["en", "vi"] as const) {
    describe(locale, () => {
      const empty = render(locale, { text: false, image: false });

      it("renders both compartments with labels", () => {
        expect(empty).toContain(escapeHtml(t(locale, "bag.text.label")));
        expect(empty).toContain(escapeHtml(t(locale, "bag.image.label")));
      });

      it("has a heading", () => {
        expect(empty).toMatch(
          new RegExp(`<h2\\b[^>]*>${escapeHtml(t(locale, "bag.heading"))}</h2>`),
        );
      });

      it("shows the need-one hint and disables confirm when empty", () => {
        expect(empty).toContain(escapeHtml(t(locale, "bag.needOne")));
        const button = submitButton(empty);
        expect(button).toMatch(/\sdisabled(=""|\s|>)/);
        expect(button).toContain(escapeHtml(t(locale, "input.submit")));
      });

      it("hides the hint and enables confirm with text in the text slot", () => {
        const html = render(locale, { text: true, image: false }, "hello");
        expect(html).not.toContain(escapeHtml(t(locale, "bag.needOne")));
        expect(submitButton(html)).not.toMatch(/\sdisabled(=""|\s|>)/);
      });

      it("has no link-check consent checkbox", () => {
        expect(empty).not.toContain('input-check-links');
        expect(empty).not.toContain("type=\"checkbox\"");
      });

      it("shows only the picture input when only the image slot is on", () => {
        const html = render(locale, { text: false, image: true });
        expect(html).toContain('id="input-image"');
        expect(html).not.toContain('id="input-text"');
      });
    });
  }
});
