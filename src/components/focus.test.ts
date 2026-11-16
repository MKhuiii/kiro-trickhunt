import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BagPanel } from "./BagPanel";
import { TopControls } from "./TopControls";
import { HunterButton } from "./HunterButton";
import { Frame } from "./Frame";
import { FOCUS_RING } from "./styles";
import { loadPreferences } from "../ui";

// Keyboard and focus markup checks (REQ-HUNT-20, REQ-HUNT-32, REQ-HUNT-50).

const RING = "focus-visible:outline-4";

/** Every <button ...> opening tag in the markup. */
function buttonTags(html: string): string[] {
  return html.match(/<button\b[^>]*>/g) ?? [];
}

describe("focus ring on interactive elements", () => {
  it("FOCUS_RING is a visible outline", () => {
    expect(FOCUS_RING).toContain(RING);
  });

  it("every TopControls and HunterButton button has the focus ring", () => {
    const noop = (): void => undefined;
    const header = renderToStaticMarkup(
      createElement(TopControls, { prefs: loadPreferences(null), locale: "en", onChange: noop }),
    );
    const hunter = renderToStaticMarkup(
      createElement(HunterButton, { locale: "en", onOpen: noop }),
    );
    for (const tag of [...buttonTags(header), ...buttonTags(hunter)]) {
      expect(tag).toContain(RING);
    }
  });

  it("every BagPanel control has the focus ring and the heading is focusable", () => {
    const noop = (): void => undefined;
    const html = renderToStaticMarkup(
      createElement(BagPanel, {
        locale: "en",
        slots: { text: true, image: true },
        text: "hi",
        file: new File(["x"], "a.png", { type: "image/png" }),
        onToggle: noop,
        onTextChange: noop,
        onFileChange: noop,
        onConfirm: noop,
        onClose: noop,
      }),
    );
    expect(buttonTags(html).length).toBeGreaterThanOrEqual(5);
    for (const tag of buttonTags(html)) expect(tag).toContain(RING);
    expect(html).toMatch(/<textarea\b[^>]*focus-visible:outline-4/);
    expect(html).toMatch(/<input\b[^>]*type="file"[^>]*focus-visible:outline-4/);
    expect(html).toMatch(/<h2\b[^>]*tabindex="-1"/);
  });

  it("the skip-link target is focusable", () => {
    const html = renderToStaticMarkup(
      createElement(Frame, { step: "home", ...{ children: null } }),
    );
    expect(html).toMatch(/<main\b[^>]*id="main"[^>]*tabindex="-1"/);
  });
});
