import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Art } from "./registry";
import type { ArtId } from "./registry";
import { HIGH_CONTRAST_PALETTE, NORMAL_PALETTE } from "../../ui";

// Validates: Requirements REQ-HUNT-77, REQ-HUNT-78, REQ-HUNT-79, REQ-HUNT-80

const NEW_MONSTERS: readonly { id: ArtId; first: string; parts: readonly string[] }[] = [
  { id: "monster-investment-goblin", first: "monster-investment", parts: ["body", "head", "eyes", "coins", "chart"] },
  { id: "monster-romance-wraith", first: "monster-romance", parts: ["body", "fog", "eyes", "heart"] },
];

describe.each(NEW_MONSTERS)("$id", ({ id, first, parts }) => {
  const html = renderToStaticMarkup(createElement(Art, { id }));
  const tokens = [...html.matchAll(/var\(--th-([a-z0-9-]+)\)/g)].map((m) => m[1]);

  it("follows the markup rules", () => {
    expect(html).toMatch(/^<svg\b/);
    expect(html).toContain('viewBox="0 0 200 200"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    for (const part of parts) expect(html).toContain(`data-part="${part}"`);
    expect(html).toMatch(/data-part="[a-z-]+-detail"/);
    expect(html).not.toMatch(/<(text|title|filter|animate)\b/);
  });

  it("uses the monster token first, and only tokens that exist in both palettes", () => {
    expect(tokens[0]).toBe(first);
    for (const t of new Set(tokens)) {
      expect(NORMAL_PALETTE[t as keyof typeof NORMAL_PALETTE], `${t} in normal`).toBeTruthy();
      expect(HIGH_CONTRAST_PALETTE[t as keyof typeof HIGH_CONTRAST_PALETTE], `${t} in high contrast`).toBeTruthy();
    }
  });

  it("has no hex or functional color", () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|currentColor/);
  });
});
