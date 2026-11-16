import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TopControls } from "./TopControls";
import { HunterButton } from "./HunterButton";
import { loadPreferences, t } from "../ui";
import type { Locale } from "../pipeline";

// Markup tests for the round top-right controls and the logo (no header bar).

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const noop = (): void => undefined;

function render(locale: Locale, patch: Partial<ReturnType<typeof loadPreferences>> = {}): string {
  const prefs = { ...loadPreferences(null), language: locale, ...patch };
  return renderToStaticMarkup(createElement(TopControls, { prefs, locale, onChange: noop }));
}

function buttons(html: string): string[] {
  return html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];
}

describe.each(["en", "vi"] as const)("TopControls (%s)", (locale) => {
  it("has exactly three round buttons: language, sound and settings", () => {
    const list = buttons(render(locale));
    expect(list).toHaveLength(3);
    for (const b of list) expect(b).toContain("th-chip");
  });

  it("names every button from the dictionary (the icons carry no text)", () => {
    const html = render(locale);
    const other = locale === "en" ? "vi" : "en";
    const language = t(locale, "topbar.language", {
      name: t(locale, `prefs.language.${locale}`),
      other: t(locale, `prefs.language.${other}`),
    });
    expect(html).toContain(`aria-label="${escapeHtml(language)}"`);
    expect(html).toContain(`aria-label="${escapeHtml(t(locale, "settings.sound.label"))}"`);
    expect(html).toContain(`aria-label="${escapeHtml(t(locale, "settings.open"))}"`);
    for (const b of buttons(html)) {
      expect(b.replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, "").trim()).toBe("");
    }
  });

  it("shows the flag of the current language", () => {
    expect(render("en")).toContain("#012169");
    expect(render("vi")).toContain("#da251d");
  });

  it("shows the sound state as a pressed button with a different icon", () => {
    const off = render(locale, { sound: false });
    const on = render(locale, { sound: true });
    expect(off).toContain('aria-pressed="false"');
    expect(on).toContain('aria-pressed="true"');
    expect(off).not.toBe(on);
  });

  it("has a settings button that controls a closed panel, and no header element", () => {
    const html = render(locale);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="settings-panel"');
    expect(html).not.toContain("<header");
    expect(html).not.toContain('id="settings-panel"');
  });

  it("keeps the controls above the stage and clear of it for pointer events", () => {
    const html = render(locale);
    expect(html).toContain("z-20");
    expect(html).toContain("pointer-events-none");
  });
});

describe("the logo above the hunter", () => {
  it.each(["en", "vi"] as const)("shows the app name as the page heading (%s)", (locale) => {
    const html = renderToStaticMarkup(createElement(HunterButton, { locale, onOpen: noop }));
    expect(html).toMatch(/<h1\b[^>]*class="th-logo[^"]*"[^>]*>TrickHunt<\/h1>/);
    expect(html).toContain(escapeHtml(t(locale, "app.tagline")));
    // The logo comes before the hunter button.
    expect(html.indexOf("<h1")).toBeLessThan(html.indexOf("<button"));
  });
});
