// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Covers REQ-HUNT-43 and REQ-HUNT-47. Scans source files as text.
const CSS = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);
const APP = readFileSync(join(process.cwd(), "src", "components", "App.tsx"), "utf8");

/** `dataset.highContrast` becomes the `data-high-contrast` attribute. */
function attributeFromDataset(prop: string): string {
  return "data-" + prop.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
}

describe("high contrast CSS", () => {
  it("the detail-hiding selector uses the attribute the app sets on the root", () => {
    const set = /documentElement[\s\S]*?root\.dataset\.(\w+)\s*=\s*String\(prefs\.highContrast\)/.exec(
      APP,
    );
    expect(set).not.toBeNull();
    const attr = attributeFromDataset(set![1]);
    const rule = /([^{}]+)\{[^}]*display\s*:\s*none/.exec(
      CSS.slice(CSS.indexOf('[data-part$="-detail"]') - 80),
    );
    expect(rule).not.toBeNull();
    expect(rule![1]).toContain(`[${attr}="true"]`);
    expect(rule![1]).toContain('[data-part$="-detail"]');
  });
});
