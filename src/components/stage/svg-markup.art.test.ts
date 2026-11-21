import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Art } from "../art/registry";
import type { ArtId } from "../art/registry";
import { HUNTER_POSES } from "../art/hunter";
import { SHADE_POSES } from "../art/shade";
import { HIGH_CONTRAST_PALETTE, NORMAL_PALETTE } from "../../ui";
import { assertPlainArt, prepareSvgMarkup } from "./svg-markup";

// The real drawings the stage paints in the canvas must survive the markup steps:
// plain art, every theme color known, and nothing left as var(...).

const MONSTERS: readonly ArtId[] = [
  "monster-bank-ghost",
  "monster-prize-vampire",
  "monster-job-zombie",
  "monster-authority-banshee",
  "monster-generic-shade",
  "monster-neutral-candle",
  "monster-investment-goblin",
  "monster-romance-wraith",
];

function drawings(): { name: string; markup: string }[] {
  const list: { name: string; markup: string }[] = [];
  for (const pose of HUNTER_POSES) {
    list.push({ name: `hunter:${pose}`, markup: renderToStaticMarkup(createElement(Art, { id: "hunter", pose })) });
  }
  for (const pose of SHADE_POSES) {
    list.push({ name: `shade:${pose}`, markup: renderToStaticMarkup(createElement(Art, { id: "shade", pose })) });
  }
  for (const id of MONSTERS) {
    list.push({ name: id, markup: renderToStaticMarkup(createElement(Art, { id })) });
  }
  return list;
}

const known = (palette: Record<string, string>) => (name: string) =>
  palette[name.replace(/^--th-/, "")];

describe.each([
  ["normal palette", NORMAL_PALETTE],
  ["high contrast palette", HIGH_CONTRAST_PALETTE],
] as const)("the stage's drawings with the %s", (_label, palette) => {
  for (const { name, markup } of drawings()) {
    it(`${name} is plain art and every color resolves`, () => {
      expect(() => assertPlainArt(markup)).not.toThrow();
      const used = new Set([...markup.matchAll(/var\(\s*(--th-[a-z0-9-]+)/gi)].map((m) => m[1]));
      for (const v of used) expect(known(palette)(v), `${name} uses ${v}`).toBeTruthy();
      const out = prepareSvgMarkup(markup, {
        size: 512,
        hideDetail: palette === HIGH_CONTRAST_PALETTE,
        resolve: known(palette),
      });
      expect(out).not.toContain("var(");
      expect(out).not.toContain("transparent;transparent");
      expect(out).toMatch(/<svg\b[^>]*\bwidth="512"[^>]*\bheight="512"/);
      if (palette === HIGH_CONTRAST_PALETTE) expect(out).not.toMatch(/data-part="[^"]*-detail"/);
    });
  }
});
