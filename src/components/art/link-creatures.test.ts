import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { statSync } from "node:fs";
import { join } from "node:path";
import { LINK_ART, LinkCreatureArt } from "./link-creatures";
import { IconLink, ToneIcon } from "../icons";
import { LINK_CREATURES } from "../../ui/link-creatures";

// Validates: Requirements REQ-PAGE-42, REQ-PAGE-43

const render = (artKey: unknown, className?: string): string =>
  renderToStaticMarkup(createElement(LinkCreatureArt, { artKey, className }));
const fallback = renderToStaticMarkup(createElement(IconLink, {}));
const tableKeys = LINK_CREATURES.map((c) => c.artKey);

const FORBIDDEN = /<(title|filter|animate|animateTransform|image|foreignObject|script|text|style)\b/i;
const COLOR_LITERAL = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|(?:fill|stroke)="(?!none"|currentColor")[^"]*"/i;

function assertDecorativeSvg(html: string): void {
  expect(html.startsWith("<svg")).toBe(true);
  expect(html).toContain('aria-hidden="true"');
  expect(html).toContain('focusable="false"');
}

describe("LINK_ART registry", () => {
  it("has exactly the artKey set of LINK_CREATURES (eight)", () => {
    expect(tableKeys).toHaveLength(8);
    expect(tableKeys).toContain("creature-plague-mark");
    expect(Object.keys(LINK_ART).sort()).toEqual([...tableKeys].sort());
  });

  it.each(tableKeys)("%s is a small, plain, currentColor-only svg", (key) => {
    const html = render(key);
    assertDecorativeSvg(html);
    expect(html).toContain('viewBox="0 0 48 48"');
    expect(html).not.toBe(fallback);
    expect(html).not.toMatch(FORBIDDEN);
    expect(html).not.toMatch(COLOR_LITERAL);
    expect(html).not.toMatch(/var\(/);
    expect((html.match(/<[a-z]/gi) ?? []).length).toBeLessThanOrEqual(12);
  });

  it("art file stays under 30 KB", () => {
    expect(statSync(join(__dirname, "link-creatures.tsx")).size).toBeLessThanOrEqual(30 * 1024);
  });
});

describe("LinkCreatureArt fallback", () => {
  it.each(["constructor", "__proto__", "toString", "hasOwnProperty", "", "creature-unknown"])(
    "falls back to IconLink for %j",
    (key) => {
      expect(render(key)).toBe(fallback);
    },
  );

  it.each([undefined, null, 0, {}, [], true])("falls back for non-string %j", (key) => {
    expect(render(key)).toBe(fallback);
  });

  it("passes className through", () => {
    expect(render("creature-wisp", "w-12")).toContain('class="w-12"');
    expect(render("nope", "w-12")).toContain('class="w-12"');
  });
});

describe("ToneIcon", () => {
  const soft = renderToStaticMarkup(createElement(ToneIcon, { iconKey: "icon-tone-soft" }));
  it("renders three different icons and falls back to soft", () => {
    const strong = renderToStaticMarkup(createElement(ToneIcon, { iconKey: "icon-tone-strong" }));
    const medium = renderToStaticMarkup(createElement(ToneIcon, { iconKey: "icon-tone-medium" }));
    expect(new Set([strong, medium, soft]).size).toBe(3);
    for (const k of ["constructor", "__proto__", "", "x", undefined]) {
      expect(renderToStaticMarkup(createElement(ToneIcon, { iconKey: k }))).toBe(soft);
    }
  });
});

describe("PBT-111 LinkCreatureArt for any key", () => {
  it("never throws and always yields a decorative svg; unknown keys equal the fallback", () => {
    const keys = fc.oneof(
      fc.anything(),
      fc.string(),
      fc.constantFrom("constructor", "__proto__", "toString", ""),
      fc.constantFrom(...tableKeys),
    );
    fc.assert(
      fc.property(keys, (key) => {
        const html = render(key);
        assertDecorativeSvg(html);
        expect(html).not.toMatch(FORBIDDEN);
        expect(html).not.toMatch(COLOR_LITERAL);
        const known = typeof key === "string" && tableKeys.includes(key);
        if (known) expect(html).not.toBe(fallback);
        else expect(html).toBe(fallback);
      }),
      { numRuns: 200 },
    );
  });
});
