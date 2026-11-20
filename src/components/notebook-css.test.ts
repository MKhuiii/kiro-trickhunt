// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Scans globals.css as text. Covers REQ-BEST-11.
const CSS = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

function keyframeBody(name: string): string {
  const open = CSS.indexOf("{", CSS.indexOf(`@keyframes ${name}`));
  let depth = 1;
  let i = open + 1;
  while (i < CSS.length && depth > 0) {
    if (CSS[i] === "{") depth += 1;
    else if (CSS[i] === "}") depth -= 1;
    i += 1;
  }
  return CSS.slice(open + 1, i - 1);
}

/** Rules whose selector mentions the notebook (flat rules only). */
function notebookRules(): { selector: string; body: string }[] {
  return [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((m) => ({ selector: m[1].trim(), body: m[2] }))
    .filter((r) => /\.th-(notebook|flip)/.test(r.selector));
}

describe("notebook CSS", () => {
  it("flip keyframes change only transform and opacity and describe only the start", () => {
    for (const name of ["th-flip-next", "th-flip-prev"]) {
      const body = keyframeBody(name);
      const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((p) => p[1]);
      expect(props.sort()).toEqual(["opacity", "transform"]);
      expect(body).not.toMatch(/\bto\b\s*\{|\b100%/);
    }
  });

  it("forward and backward flips start differently", () => {
    expect(keyframeBody("th-flip-next")).not.toBe(keyframeBody("th-flip-prev"));
  });

  it("flip animations are plain 1 second declarations", () => {
    for (const cls of [".th-flip-next", ".th-flip-prev"]) {
      const rule = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .map((m) => ({ selector: m[1].trim(), body: m[2] }))
        .find((r) => r.selector === cls);
      expect(rule, cls).toBeDefined();
      expect(rule!.body).toMatch(/animation:\s*th-flip-(next|prev)\s+1s\b/);
      expect(rule!.body).not.toMatch(/!important/);
    }
  });

  it("notebook rules use no px font size and no clip-path", () => {
    const rules = notebookRules();
    expect(rules.length).toBeGreaterThan(0);
    for (const { selector, body } of rules) {
      expect(body, selector).not.toMatch(/font-size\s*:[^;]*px/);
      expect(body, selector).not.toMatch(/clip-path/);
      expect(body, selector).not.toMatch(/content\s*:\s*"[^"]/);
    }
  });

  it("defines the open-notebook and sticker classes", () => {
    for (const cls of [
      "th-notebook-spread",
      "th-notebook-gutter",
      "th-notebook-stitch",
      "th-notebook-edges",
      "th-sticker-board",
      "th-sticker",
      "th-notebook-leaves",
      "th-notebook-leaf",
      "th-notebook-leaf-scroll",
    ]) {
      expect(CSS, cls).toMatch(new RegExp(`\\.${cls}\\b[^{]*\\{`));
    }
    expect(CSS).toMatch(/@media\s*\(min-width:\s*48rem\)/);
  });

  it("removes the old contents leader and line classes", () => {
    expect(CSS).not.toMatch(/\.th-notebook-leader/);
    expect(CSS).not.toMatch(/\.th-notebook-line/);
  });

  it("the notebook look uses no image, no clip-path, no px font size and adds no keyframes", () => {
    const start = CSS.indexOf(".th-notebook {");
    expect(start).toBeGreaterThan(0);
    const section = CSS.slice(start);
    expect(section).not.toMatch(/url\(/);
    expect(section).not.toMatch(/clip-path/);
    expect(section).not.toMatch(/font-size\s*:[^;]*px/);
    const names = [...CSS.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]);
    expect(names.filter((n) => /notebook|sticker/.test(n))).toEqual([]);
    expect(section.match(/@keyframes/g)?.length).toBe(2);
  });

  it("high contrast removes the spread, stitching, edges, tape and tilt", () => {
    for (const cls of [".th-notebook-edges", ".th-notebook-gutter", ".th-notebook-stitch", ".th-sticker::before"]) {
      expect(CSS, cls).toContain(`[data-high-contrast="true"] ${cls}`);
    }
    expect(CSS).toMatch(/\[data-high-contrast="true"\]\s*\.th-notebook-spread/);
    const rule = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(
      (m) => m[1].includes('[data-high-contrast="true"] .th-sticker,') || m[1].trim().endsWith('[data-high-contrast="true"] .th-sticker'),
    );
    expect(rule?.[2]).toMatch(/transform:\s*none/);
  });

  it("lays out two leaves in spread mode and one column otherwise", () => {
    expect(CSS).toMatch(/\.th-notebook-leaves\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(CSS).toMatch(/\[data-layout="spread"\]\s*\.th-notebook-leaves[^{]*\{[^}]*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(CSS).toMatch(/\[data-layout="spread"\]\s*\.th-notebook-leaf-left\s+\.th-notebook-leaf-scroll\s*\{/);
    expect(CSS).toMatch(/\[data-layout="spread"\]\s*\.th-notebook-leaf-right\s+\.th-notebook-leaf-scroll\s*\{/);
  });

  it("high contrast keeps a plain divider between the leaves", () => {
    const rule = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((m) =>
      m[1].includes('[data-high-contrast="true"] [data-layout="spread"] .th-notebook-leaf-right'),
    );
    expect(rule?.[2]).toMatch(/border-left:\s*0?\.\d+rem solid/);
  });

  it("high contrast removes the decoration", () => {
    expect(CSS).toMatch(/\[data-high-contrast="true"\]\s*\.th-notebook-ribbon/);
    expect(CSS).toMatch(/\[data-high-contrast="true"\]\s*\.th-notebook\b/);
  });

  it("each leaf is its own scroll box with a themed scrollbar", () => {
    const rule = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((m) => m[1].trim() === ".th-notebook-leaf-scroll");
    expect(rule?.[2]).toMatch(/overflow-y:\s*auto/);
    expect(rule?.[2]).toMatch(/min-height:\s*0/);
    expect(rule?.[2]).toMatch(/scrollbar-width:\s*thin/);
    expect(rule?.[2]).toMatch(/scrollbar-color:\s*var\(--th-ink-faded\)\s+var\(--th-paper\)/);
    const bar = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((m) => m[1].trim() === ".th-notebook-leaf-scroll::-webkit-scrollbar");
    expect(bar?.[2]).toMatch(/width:\s*(0?\.\d+|\d+(\.\d+)?)rem/);
    expect(parseFloat(/width:\s*([\d.]+)rem/.exec(bar?.[2] ?? "")?.[1] ?? "0")).toBeGreaterThanOrEqual(0.75);
    expect(CSS).toMatch(/\.th-notebook-leaf-scroll::-webkit-scrollbar-track\s*\{[^}]*var\(--th-paper\)/);
    expect(CSS).toMatch(/\.th-notebook-leaf-scroll::-webkit-scrollbar-thumb\s*\{[^}]*var\(--th-ink-faded\)/);
    expect(CSS).toMatch(/\[data-high-contrast="true"\]\s*\.th-notebook-leaf-scroll\s*\{[^}]*scrollbar-color/);
  });

  it("the page area no longer scrolls", () => {
    const rule = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find((m) => m[1].trim() === ".th-notebook-page-area");
    expect(rule?.[2]).not.toMatch(/overflow-y/);
  });
});