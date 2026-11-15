import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

// Source scan of the scene art files (REQ-HUNT-28, REQ-HUNT-33).
// Scene SVGs are decorative: no <text> and no <title> element.

const ROOT = resolve(__dirname, "..", "..");
const ART_DIR = join(ROOT, "src", "components", "art");

const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
// Line comments must not start inside a string such as "https://...".
const LINE_COMMENT = /(^|[^:"'`\\])\/\/[^\n]*/g;

function stripComments(text: string): string {
  return text.replace(BLOCK_COMMENT, "").replace(LINE_COMMENT, "$1");
}

const FORBIDDEN: readonly { rule: string; re: RegExp }[] = [
  { rule: "<text", re: /<text/i },
  { rule: "<title", re: /<title/i },
];

export function sceneViolations(text: string): string[] {
  const code = stripComments(text);
  return FORBIDDEN.filter(({ re }) => re.test(code)).map(({ rule }) => rule);
}

function existingSceneFiles(): { name: string; text: string }[] {
  return readdirSync(ART_DIR)
    .filter((n) => n.endsWith(".tsx"))
    .map((n) => join(ART_DIR, n))
    .map((f) => ({ name: f.slice(ROOT.length + 1).replace(/\\/g, "/"), text: readFileSync(f, "utf8") }));
}

describe("scene art source scan", () => {
  it("scans the scene files that exist", () => {
    const names = existingSceneFiles().map((f) => f.name);
    expect(names).toContain("src/components/art/registry.tsx");
    expect(names).toContain("src/components/art/hunter.tsx");
  });

  it("has no <text or <title in any scene file", () => {
    const bad = existingSceneFiles()
      .map((f) => ({ file: f.name, rules: sceneViolations(f.text) }))
      .filter((r) => r.rules.length > 0);
    expect(bad).toEqual([]);
  });
});

describe("sceneViolations helper detects violations (sanity)", () => {
  it("flags <text", () => {
    expect(sceneViolations('const a = <svg><text x="1">Hi</text></svg>;')).toContain("<text");
  });

  it("flags <title", () => {
    expect(sceneViolations("const a = <svg><title>Moon</title></svg>;")).toContain("<title");
  });

  it("ignores mentions in comments and accepts clean art", () => {
    const clean = '// no <text or <title here\nconst a = <svg aria-hidden="true"><path d="M0 0" /></svg>;';
    expect(sceneViolations(clean)).toEqual([]);
  });
});
