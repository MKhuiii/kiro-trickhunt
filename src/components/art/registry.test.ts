import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Art, ART_REGISTRY } from "./registry";
import type { ArtId } from "./registry";

// Validates: Requirements REQ-HUNT-38, REQ-HUNT-44

const IDS = Object.keys(ART_REGISTRY) as ArtId[];

describe("art registry", () => {
  it.each(IDS)("%s renders a decorative svg with no forbidden elements", (id) => {
    const html = renderToStaticMarkup(createElement(Art, { id }));
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    for (const tag of ["<text", "<title", "<filter", "<animate"]) {
      expect(html).not.toContain(tag);
    }
  });

  it("falls back to the generic shade for an unknown id", () => {
    const unknown = renderToStaticMarkup(createElement(Art, { id: "nope" }));
    const shade = renderToStaticMarkup(createElement(Art, { id: "monster-generic-shade" }));
    expect(unknown).toBe(shade);
  });

  it("renders an image entry as a decorative img", () => {
    const registry = ART_REGISTRY as Record<string, unknown>;
    const original = registry["bag"];
    registry["bag"] = { kind: "image", src: "/hunter/bag.png" };
    try {
      const html = renderToStaticMarkup(createElement(Art, { id: "bag" }));
      expect(html).toContain('alt=""');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('src="/hunter/bag.png"');
    } finally {
      registry["bag"] = original;
    }
  });
});
