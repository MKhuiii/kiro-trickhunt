import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LostScene } from "./LostScene";
import { flowReducer, sceneFor, t } from "../ui";
import type { FlowState } from "../ui";

// Markup tests for the lost step (REQ-HUNT-33, REQ-HUNT-34).

const LOCALES = ["en", "vi"] as const;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

function lost(locale: "en" | "vi", ...children: ReturnType<typeof createElement>[]): string {
  return renderToStaticMarkup(createElement(LostScene, { locale, onAgain: () => {} }, ...children));
}

describe("LostScene markup", () => {
  for (const locale of LOCALES) {
    it(`${locale}: renders caption, children slot and the hunt-again button`, () => {
      const html = lost(locale, createElement("p", { "data-testid": "slot" }, "child-content"));
      expect(html).toContain(esc(t(locale, "scene.lost.caption")));
      expect(html).toContain('data-testid="slot"');
      expect(html).toContain("child-content");
      expect(html).toMatch(new RegExp(`<button[^>]*type="button"[^>]*>${esc(t(locale, "hunt.again"))}</button>`));
      expect(html).toContain('data-pose="downcast"');
      expect(html).toContain("th-lost-fade");
      expect(html).not.toContain("<text");
      expect(html).not.toContain("<title");
    });

    it(`${locale}: renders without children`, () => {
      const html = lost(locale);
      expect(html).toContain(esc(t(locale, "hunt.again")));
    });
  }
});

describe("lost step is used for a failed check and a withheld view", () => {
  const hunting: FlowState = { step: "hunting", slots: { text: true, image: false } };

  // App dispatches { kind: "fail" } for a failed outcome and for a withheld view,
  // and renders LostScene whenever the flow step is "lost".
  it("a fail event moves hunting to lost, which sceneFor maps to the lost caption", () => {
    const next = flowReducer(hunting, { kind: "fail" });
    expect(next.step).toBe("lost");
    const scene = sceneFor({ step: next.step });
    expect(scene.phase).toBe("lost");
    expect(scene.captionKey).toBe("scene.lost.caption");
    expect(scene.monster).toBeNull();
  });

  it("a ready event does not reach lost", () => {
    expect(flowReducer(hunting, { kind: "ready" }).step).toBe("revealed");
  });

  it("the lost scene shows its caption for both outcomes", () => {
    for (const locale of LOCALES) {
      const html = lost(locale);
      expect(html).toContain(esc(t(locale, sceneFor({ step: "lost" }).captionKey)));
    }
  });
});
