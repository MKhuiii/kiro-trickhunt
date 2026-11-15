import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

// Source scan of src/components/*.tsx and src/app/page.tsx
// (REQ-PAGE-35, REQ-PAGE-36, REQ-PAGE-37, REQ-PAGE-39).

const ROOT = resolve(__dirname, "..", "..");
const COMPONENTS_DIR = join(ROOT, "src", "components");
const PAGE_FILE = join(ROOT, "src", "app", "page.tsx");

const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
// Line comments must not start inside a string such as "https://...".
const LINE_COMMENT = /(^|[^:"'`\\])\/\/[^\n]*/g;

export function stripComments(text: string): string {
  return text.replace(BLOCK_COMMENT, "").replace(LINE_COMMENT, "$1");
}

const CODE_RULES: readonly { rule: string; re: RegExp }[] = [
  { rule: "fetch(", re: /\bfetch\s*\(/ },
  { rule: "console.", re: /\bconsole\s*\./ },
  { rule: "localStorage", re: /\blocalStorage\b/ },
  { rule: "sessionStorage", re: /\bsessionStorage\b/ },
  { rule: "indexedDB", re: /\bindexedDB\b/ },
  { rule: "document.cookie", re: /\bdocument\s*\.\s*cookie\b/ },
  { rule: "XMLHttpRequest", re: /\bXMLHttpRequest\b/ },
  { rule: "history.pushState/replaceState", re: /\bhistory\s*\.\s*(pushState|replaceState)\b/ },
  { rule: "location.hash/search assignment", re: /\blocation\s*\.\s*(hash|search)\s*=(?!=)/ },
  { rule: "server import", re: /["'][^"']*(?:^|\/)server(?:\/[^"']*)?["']/ },
  { rule: "literal aria-label/title/placeholder/alt", re: /\b(?:aria-label|title|placeholder|alt)\s*=\s*["'][^"']*[A-Za-z]/ },
  { rule: "fixed-pixel text size", re: /\btext-\[\s*[\d.]+px\s*\]/ },
  { rule: "fixed-pixel font-size", re: /\bfont-size\s*:\s*[\d.]+px/ },
  { rule: "fixed-pixel fontSize", re: /\bfontSize\s*:\s*(?:\d|["'][\d.]+px)/ },
];

/** JSX text nodes: text between `>` and `<` outside braces that contains letters. */
const JSX_TEXT = /(?<![=\-])>([^<>{}]*[A-Za-z][^<>{}]*)</g;

/**
 * TypeScript code can look like `>text<` (arrow functions, generics, comparisons).
 * Real prose has none of the statement characters below, so matches containing
 * them are code, not JSX text.
 */
export function jsxTextNodes(code: string): string[] {
  return [...code.matchAll(JSX_TEXT)].map((m) => m[1]).filter((s) => !/[;=&|]/.test(s));
}

/** Static (runtime) imports from pipeline are not allowed; `import type` is. */
function runtimePipelineImports(code: string): string[] {
  const out: string[] = [];
  const re = /^[ \t]*(import|export)\b([^;]*?)\bfrom\s*["']([^"']+)["']/gm;
  for (const m of code.matchAll(re)) {
    if (!/pipeline/.test(m[3])) continue;
    if (/^\s*type\b/.test(m[2])) continue;
    out.push(m[3]);
  }
  if (/\bimport\s*\(\s*["'][^"']*pipeline/.test(code)) out.push("dynamic import");
  return out;
}

export function scan(text: string): string[] {
  const code = stripComments(text);
  const found: string[] = [];
  for (const { rule, re } of CODE_RULES) if (re.test(code)) found.push(rule);
  // http(s) literals are rejected even inside comments.
  if (/https?:\/\//i.test(text)) found.push("http(s) literal");
  if (jsxTextNodes(code).length > 0) found.push("hard-coded JSX text");
  if (runtimePipelineImports(code).length > 0) found.push("runtime pipeline import");
  return found;
}

function componentFiles(): { name: string; text: string }[] {
  const files = readdirSync(COMPONENTS_DIR)
    .filter((n) => n.endsWith(".tsx"))
    .map((n) => join(COMPONENTS_DIR, n));
  if (existsSync(PAGE_FILE)) files.push(PAGE_FILE);
  return files.map((f) => ({ name: f.slice(ROOT.length + 1), text: readFileSync(f, "utf8") }));
}

describe("components source scan", () => {
  it("scans the component files and the page", () => {
    const names = componentFiles().map((f) => f.name.replace(/\\/g, "/"));
    expect(names).toContain("src/app/page.tsx");
    expect(names).toContain("src/components/App.tsx");
    expect(names).toContain("src/components/ResultPanel.tsx");
    expect(names.length).toBeGreaterThan(10);
  });

  it("has no violations in any component or page", () => {
    const bad = componentFiles()
      .map((f) => ({ file: f.name, rules: scan(f.text) }))
      .filter((r) => r.rules.length > 0);
    expect(bad).toEqual([]);
  });
});

describe("scan helper detects violations (sanity)", () => {
  const cases: [string, string, string][] = [
    ["fetch", 'const r = await fetch("/x");', "fetch("],
    ["console", "console.log(a);", "console."],
    ["localStorage", 'localStorage.setItem("a","b");', "localStorage"],
    ["sessionStorage", "sessionStorage.clear();", "sessionStorage"],
    ["indexedDB", "indexedDB.open(a);", "indexedDB"],
    ["cookie", 'document.cookie = "a=b";', "document.cookie"],
    ["xhr", "new XMLHttpRequest();", "XMLHttpRequest"],
    ["http literal", 'const u = "https://example.com";', "http(s) literal"],
    ["http in comment", "// see http://example.com\nconst a = 1;", "http(s) literal"],
    ["pushState", "history.pushState({}, '', '/a');", "history.pushState/replaceState"],
    ["replaceState", "window.history.replaceState(null, '', a);", "history.pushState/replaceState"],
    ["hash assignment", 'window.location.hash = "#a";', "location.hash/search assignment"],
    ["search assignment", 'location.search = "?q=" + a;', "location.hash/search assignment"],
    ["server import", 'import { x } from "../server/llm";', "server import"],
    ["runtime pipeline import", 'import { analyze } from "../pipeline";', "runtime pipeline import"],
    ["JSX text", "const a = <p>Hello there</p>;", "hard-coded JSX text"],
    ["multiline JSX text", "const a = (\n<p>\n  Click here\n</p>\n);", "hard-coded JSX text"],
    ["aria-label", 'const a = <button aria-label="Close" />;', "literal aria-label/title/placeholder/alt"],
    ["title", "const a = <p title='Info' />;", "literal aria-label/title/placeholder/alt"],
    ["placeholder", 'const a = <input placeholder="Paste" />;', "literal aria-label/title/placeholder/alt"],
    ["alt", 'const a = <img alt="Logo" />;', "literal aria-label/title/placeholder/alt"],
    ["text-[Npx]", 'const c = "text-[14px] font-bold";', "fixed-pixel text size"],
    ["font-size px", "const s = `font-size: 12px`;", "fixed-pixel font-size"],
    ["fontSize number", "const s = { fontSize: 14 };", "fixed-pixel fontSize"],
  ];

  for (const [label, sample, rule] of cases) {
    it(`flags ${label}`, () => {
      expect(scan(sample)).toContain(rule);
    });
  }

  it("accepts clean component code", () => {
    const clean = [
      'import type { Locale } from "../pipeline";',
      'import { t } from "../ui";',
      "export function A({ locale }: { locale: Locale }) {",
      '  const load = () => import("../client/ingest/browser-deps");',
      "  // console.log is only mentioned in a comment",
      '  return <p className="text-base" aria-label={t(locale, "k")}>{t(locale, "k")}</p>;',
      "}",
    ].join("\n");
    expect(scan(clean)).toEqual([]);
  });

  it("accepts type-only pipeline imports and relative-unit sizes", () => {
    const code = 'import type {\n  Locale,\n} from "../pipeline";\nconst c = "text-[1.25rem]";\nconst d = <img alt="" />;';
    expect(scan(code)).toEqual([]);
  });
});
