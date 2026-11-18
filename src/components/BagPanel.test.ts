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

function render(locale: Locale, slots: Slots, text = "", checkLinks?: boolean): string {
  const noop = (): void => undefined;
  return renderToStaticMarkup(
    createElement(BagPanel, {
      locale,
      slots,
      text,
      file: null,
      ...(checkLinks === undefined ? {} : { checkLinks }),
      onCheckLinksChange: noop,
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

      it("shows an unticked consent checkbox with a visible label and linked text (REQ-LREP-01, 06, 58)", () => {
        const input = /<input\b[^>]*id="input-check-links"[^>]*>/.exec(empty);
        if (!input) throw new Error("no consent checkbox");
        expect(input[0]).toContain('type="checkbox"');
        expect(input[0]).not.toMatch(/\schecked(=""|\s|\/|>)/);
        expect(input[0]).toContain('aria-describedby="input-check-links-hint"');
        expect(input[0]).toMatch(/\bh-11\b/);
        expect(input[0]).toMatch(/\bw-11\b/);
        expect(empty).toMatch(
          new RegExp(
            `<label\\b[^>]*for="input-check-links"[^>]*>${escapeHtml(t(locale, "reputation.consent.label"))}</label>`,
          ),
        );
        expect(empty).toMatch(
          new RegExp(
            `<p\\b[^>]*id="input-check-links-hint"[^>]*>${escapeHtml(t(locale, "reputation.consent.text"))}</p>`,
          ),
        );
      });

      it("shows the consent checkbox even when no slot is on, and ticks it only when told", () => {
        const ticked = render(locale, { text: true, image: false }, "hi", true);
        expect(/<input\b[^>]*id="input-check-links"[^>]*>/.exec(ticked)?.[0]).toMatch(/\schecked(=""|\s|\/|>)/);
      });

      it("shows only the picture input when only the image slot is on", () => {
        const html = render(locale, { text: false, image: true });
        expect(html).toContain('id="input-image"');
        expect(html).not.toContain('id="input-text"');
      });
    });
  }
});
