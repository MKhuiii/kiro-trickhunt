// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Scans globals.css as text. Covers REQ-HUNT-24, REQ-HUNT-26, REQ-HUNT-27.
const CSS = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Returns the body of a block whose header starts at `start` (just after its `{`). */
function blockBody(text: string, open: number): string {
  let depth = 1;
  let i = open + 1;
  while (i < text.length && depth > 0) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") depth -= 1;
    i += 1;
  }
  return text.slice(open + 1, i - 1);
}

function keyframes(): { name: string; body: string }[] {
  const out: { name: string; body: string }[] = [];
  const re = /@keyframes\s+(th-[\w-]+)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(CSS)) !== null) {
    out.push({ name: m[1], body: blockBody(CSS, m.index + m[0].length - 1) });
  }
  return out;
}

function seconds(value: string): number {
  return value.endsWith("ms") ? parseFloat(value) / 1000 : parseFloat(value);
}

describe("motion CSS", () => {
  it("defines th-* keyframes", () => {
    expect(keyframes().length).toBeGreaterThan(0);
  });

  it("th-* keyframes change only transform and opacity", () => {
    for (const { name, body } of keyframes()) {
      const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((p) => p[1]);
      expect(props.length, name).toBeGreaterThan(0);
      for (const prop of props) {
        expect(["transform", "opacity"], `${name}: ${prop}`).toContain(prop);
      }
    }
  });

  it("every th-* animation lasts at least 1 second", () => {
    const decls = [...CSS.matchAll(/animation(?:-duration)?\s*:\s*([^;}]+)/g)].map((d) => d[0]);
    const durations: number[] = [];
    for (const decl of decls) {
      if (/none/.test(decl)) continue;
      const found = [...decl.matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g)].map((t) => seconds(t[0]));
      if (found.length > 0) durations.push(found[0]);
    }
    expect(durations.length).toBeGreaterThan(0);
    for (const d of durations) expect(d).toBeGreaterThanOrEqual(1);
  });

  it("keyframes only describe the start so the base style is the final state", () => {
    for (const { name, body } of keyframes()) {
      expect(body, name).not.toMatch(/\bto\b\s*\{|\b100%/);
    }
  });

  it("system reduced-motion block sets animation: none", () => {
    const at = CSS.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(at).toBeGreaterThanOrEqual(0);
    const body = blockBody(CSS, CSS.indexOf("{", at));
    expect(body).toMatch(/\*\s*,/);
    expect(body).toMatch(/animation:\s*none\s*!important/);
  });

  it("in-page reduced-motion switch sets animation: none for all elements", () => {
    const at = CSS.indexOf(':root[data-reduce-motion="true"] *');
    expect(at).toBeGreaterThanOrEqual(0);
    const body = blockBody(CSS, CSS.indexOf("{", at));
    expect(body).toMatch(/animation:\s*none\s*!important/);
  });
});
