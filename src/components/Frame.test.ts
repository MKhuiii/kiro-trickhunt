import { describe, it, expect } from "vitest";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Frame } from "./Frame";

// Markup tests for the guide slot (REQ-BEST-14.1, 14.4, 14.6).

function render(guide?: string): string {
  return renderToStaticMarkup(
    createElement(
      Frame,
      {
        step: "home",
        guide: guide ? createElement("button", { id: "g" }, guide) : undefined,
      } as ComponentProps<typeof Frame>,
      createElement("p", null, "content"),
    ),
  );
}

describe("Frame guide slot", () => {
  it("renders the guide and the narrow spacer before main", () => {
    const html = render("Guide");
    const main = html.indexOf("<main");
    expect(html.indexOf('id="g"')).toBeGreaterThan(-1);
    expect(html.indexOf('id="g"')).toBeLessThan(main);
    const spacer = html.indexOf("h-[6.5rem]");
    expect(spacer).toBeGreaterThan(-1);
    expect(spacer).toBeLessThan(main);
    expect(html).toContain('aria-hidden="true" class="h-[6.5rem] shrink-0 @min-[18rem]:hidden"');
  });

  it("renders neither the guide nor the spacer without a guide", () => {
    const html = render();
    expect(html).not.toContain('id="g"');
    expect(html).not.toContain("h-[6.5rem]");
  });

  it("has no footer in the source", () => {
    const src = readFileSync(join(__dirname, "Frame.tsx"), "utf8");
    expect(src).not.toMatch(/footer/i);
  });
});
