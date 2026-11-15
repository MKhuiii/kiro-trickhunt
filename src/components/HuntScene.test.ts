import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HuntScene } from "./HuntScene";
import { StatusRegion } from "./StatusRegion";
import { t, legsFor, legFor } from "../ui";
import type { Leg } from "../ui";
import { Art } from "./art/registry";

// Markup tests for the hunting scene (REQ-HUNT-21, REQ-HUNT-25 to REQ-HUNT-27).

const POSE: Record<Leg, string> = { forest: "tracking", mountain: "lantern", swamp: "reading", ruins: "aiming" };
const CAPTION = {
  forest: "scene.hunt.forest",
  mountain: "scene.hunt.mountain",
  swamp: "scene.hunt.swamp",
  ruins: "scene.hunt.ruins",
} as const;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

describe("HuntScene markup", () => {
  for (const leg of ["forest", "mountain", "swamp", "ruins"] as const) {
    it(`renders ${leg}: pose, shade, caption, one live region`, () => {
      const html = renderToStaticMarkup(
        createElement(
          HuntScene,
          { locale: "en", leg },
          createElement(StatusRegion, { locale: "en", messageKey: null }),
        ),
      );
      expect(html).toContain(`data-pose="${POSE[leg]}"`);
      expect(html).toContain("th-walk");
      expect(html).toContain("th-shade-run");
      expect(html).toContain("th-leg-in");
      expect(html).toContain(esc(t("en", CAPTION[leg])));
      expect(html.match(/aria-live=/g)?.length).toBe(1);
    });
  }
});

const STATUSES = ["preparing", "qr", "ocr-loading", "ocr-recognizing", "sending"] as const;

function scene(locale: "en" | "vi", leg: Leg): string {
  return renderToStaticMarkup(
    createElement(HuntScene, { locale, leg }, createElement(StatusRegion, { locale, messageKey: null })),
  );
}

describe("HuntScene markup per Leg (REQ-HUNT-22, REQ-HUNT-25)", () => {
  for (const locale of ["en", "vi"] as const) {
    for (const leg of ["forest", "mountain", "swamp", "ruins"] as const) {
      it(`renders the ${locale} caption for ${leg}`, () => {
        const html = scene(locale, leg);
        expect(html).toContain(esc(t(locale, CAPTION[leg])));
        expect(html).toContain(`data-leg="${leg}"`);
      });
    }
  }

  it("text only never shows mountain or swamp", () => {
    expect(legsFor(false)).toEqual(["forest", "ruins"]);
    const cls = "absolute inset-0 h-full w-full";
    const mountain = renderToStaticMarkup(createElement(Art, { id: "backdrop-mountain", className: cls }));
    const swamp = renderToStaticMarkup(createElement(Art, { id: "backdrop-swamp", className: cls }));
    for (const status of STATUSES) {
      for (const elapsedMs of [0, 1000, 2000, 3999, 4000, 100000]) {
        const leg = legFor({ hasImage: false, status, elapsedMs, minMs: 4000 });
        expect(["mountain", "swamp"]).not.toContain(leg);
        const html = scene("en", leg);
        expect(html).not.toContain('data-leg="mountain"');
        expect(html).not.toContain('data-leg="swamp"');
        expect(html).not.toContain(mountain);
        expect(html).not.toContain(swamp);
      }
    }
  });

  it("StatusRegion is the only aria-live region", () => {
    for (const leg of ["forest", "mountain", "swamp", "ruins"] as const) {
      const html = scene("en", leg);
      expect(html.match(/aria-live=/g)?.length).toBe(1);
      const bare = renderToStaticMarkup(createElement(HuntScene, { locale: "en", leg }));
      expect(bare).not.toContain("aria-live");
    }
  });
});