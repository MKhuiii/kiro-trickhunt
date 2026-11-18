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

// REQ-PAGE-44: link text is plain text. Skip link in page.tsx is not scanned here.
const NO_LINK_FILES = [
  "LinkBadge.tsx",
  "EvidenceList.tsx",
  "HighlightedMessage.tsx",
  "LinkSpotlight.tsx",
  "ResultPanel.tsx",
];
const LINK_RULES: readonly { rule: string; re: RegExp }[] = [
  { rule: "href", re: /\bhref\b/ },
  { rule: "<a element", re: /<a[\s>]/ },
  { rule: "onClick", re: /\bonClick\b/ },
];

export function scanLinkRules(text: string): string[] {
  const code = stripComments(text);
  return LINK_RULES.filter(({ re }) => re.test(code)).map((r) => r.rule);
}

// REQ-PAGE-39: the art file carries no text.
const ART_FILE = join(COMPONENTS_DIR, "art", "link-creatures.tsx");
const ART_TEXT_RULES: readonly { rule: string; re: RegExp }[] = [
  { rule: "<text", re: /<text[\s>]/ },
  { rule: "<title", re: /<title[\s>]/ },
  { rule: "<tspan", re: /<tspan[\s>]/ },
];

export function scanArtText(text: string): string[] {
  const code = stripComments(text);
  return ART_TEXT_RULES.filter(({ re }) => re.test(code)).map((r) => r.rule);
}

describe("link text is plain (REQ-PAGE-44)", () => {
  for (const name of NO_LINK_FILES) {
    it(`${name} has no href, <a or onClick`, () => {
      const text = readFileSync(join(COMPONENTS_DIR, name), "utf8");
      expect(scanLinkRules(text)).toEqual([]);
    });
  }

  it("the skip link in page.tsx is not affected by these rules", () => {
    expect(scan(readFileSync(PAGE_FILE, "utf8"))).toEqual([]);
  });
});

// REQ-LREP-01, REQ-LREP-09, REQ-LREP-55: the one link in the app, and the plain note.
const ATTRIBUTION_FILE = "ReputationAttribution.tsx";
const NOTE_FILE = "ReputationNote.tsx";
const STORAGE_FILES = ["BagPanel.tsx", "App.tsx"];
const STORAGE_RULES: readonly { rule: string; re: RegExp }[] = [
  { rule: "localStorage", re: /\blocalStorage\b/ },
  { rule: "sessionStorage", re: /\bsessionStorage\b/ },
  { rule: "indexedDB", re: /\bindexedDB\b/ },
  { rule: "document.cookie", re: /\bdocument\s*\.\s*cookie\b/ },
];

export function scanStorage(text: string): string[] {
  const code = stripComments(text);
  return STORAGE_RULES.filter(({ re }) => re.test(code)).map((r) => r.rule);
}

/** Returns the problems with the anchors in a file; empty when there is exactly one good anchor. */
export function scanAttributionAnchor(text: string): string[] {
  const code = stripComments(text);
  const anchors = [...code.matchAll(/<a[\s>][^>]*>/g)].map((m) => m[0]);
  if (anchors.length !== 1) return [`expected exactly one <a, found ${anchors.length}`];
  const a = anchors[0];
  const problems: string[] = [];
  if (!/\btarget\s*=\s*["']_blank["']/.test(a)) problems.push("target");
  if (!/\brel\s*=\s*["'](?=[^"']*\bnoopener\b)(?=[^"']*\bnoreferrer\b)[^"']*["']/.test(a)) problems.push("rel");
  if (!/\breferrerPolicy\s*=\s*["']no-referrer["']/.test(a)) problems.push("referrerPolicy");
  return problems;
}

describe("link reputation components (REQ-LREP-01, 09, 55)", () => {
  it("ReputationAttribution.tsx is not in NO_LINK_FILES", () => {
    expect(NO_LINK_FILES).not.toContain(ATTRIBUTION_FILE);
  });

  it("ReputationAttribution.tsx has exactly one anchor with target, rel and referrerPolicy", () => {
    const text = readFileSync(join(COMPONENTS_DIR, ATTRIBUTION_FILE), "utf8");
    expect(scanAttributionAnchor(text)).toEqual([]);
  });

  it("ReputationNote.tsx has no href, <a or onClick", () => {
    const text = readFileSync(join(COMPONENTS_DIR, NOTE_FILE), "utf8");
    expect(scanLinkRules(text)).toEqual([]);
  });

  for (const name of STORAGE_FILES) {
    it(`${name} uses no browser storage`, () => {
      const text = readFileSync(join(COMPONENTS_DIR, name), "utf8");
      expect(scanStorage(text)).toEqual([]);
    });
  }

  for (const name of [ATTRIBUTION_FILE, NOTE_FILE]) {
    it(`${name} is in the scanned set and passes the full scan (no hard-coded text)`, () => {
      const file = componentFiles().find((f) => f.name.replace(/\\/g, "/") === `src/components/${name}`);
      expect(file).toBeDefined();
      expect(scan(file!.text)).toEqual([]);
    });
  }

  describe("sanity", () => {
    const good = '<a href={U} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">x</a>';

    it("accepts a correct anchor", () => {
      expect(scanAttributionAnchor(`const a = ${good};`)).toEqual([]);
    });

    it("flags a missing anchor and two anchors", () => {
      expect(scanAttributionAnchor("const a = <p />;")).toHaveLength(1);
      expect(scanAttributionAnchor(`const a = <div>${good}${good}</div>;`)).toHaveLength(1);
    });

    it("flags missing attributes", () => {
      expect(scanAttributionAnchor('const a = <a href={U} rel="noopener">x</a>;')).toEqual(
        expect.arrayContaining(["target", "rel", "referrerPolicy"]),
      );
      expect(scanAttributionAnchor('const a = <a href={U} target="_blank" rel="noopener noreferrer">x</a>;')).toEqual([
        "referrerPolicy",
      ]);
    });

    it("flags hard-coded text in a reputation component", () => {
      expect(scan("export const N = () => <p>Not listed</p>;")).toContain("hard-coded JSX text");
    });

    it("flags storage use", () => {
      expect(scanStorage('localStorage.setItem("a","b");')).toEqual(["localStorage"]);
      expect(scanStorage('document.cookie = "a=b"; indexedDB.open(a);')).toEqual(
        expect.arrayContaining(["indexedDB", "document.cookie"]),
      );
      expect(scanStorage("// sessionStorage\nconst a = 1;")).toEqual([]);
    });

    it("flags a link in the note", () => {
      expect(scanLinkRules('const n = <a href="/x">x</a>;')).toEqual(expect.arrayContaining(["href", "<a element"]));
    });
  });
});

describe("badge and art coverage (REQ-PAGE-39)", () => {
  it("LinkBadge.tsx is in the scanned set", () => {
    const names = componentFiles().map((f) => f.name.replace(/\\/g, "/"));
    expect(names).toContain("src/components/LinkBadge.tsx");
  });

  it("LinkSpotlight.tsx is in the scanned set and passes the full scan (REQ-PAGE-39)", () => {
    const files = componentFiles();
    const file = files.find((f) => f.name.replace(/\\/g, "/") === "src/components/LinkSpotlight.tsx");
    expect(file).toBeDefined();
    expect(scan(file!.text)).toEqual([]);
  });

  it("the art file exists, passes the full scan and carries no text", () => {
    expect(existsSync(ART_FILE)).toBe(true);
    const text = readFileSync(ART_FILE, "utf8");
    expect(scan(text)).toEqual([]);
    expect(scanArtText(text)).toEqual([]);
  });
});

describe("link rules detect violations (sanity)", () => {
  const linkCases: [string, string, string][] = [
    ["href", 'const a = <span href="/x" />;', "href"],
    ["<a element", "const a = <a>go</a>;", "<a element"],
    ["<a with attrs", 'const a = <a className="x">go</a>;', "<a element"],
    ["onClick", "const a = <span onClick={f} />;", "onClick"],
  ];
  for (const [label, sample, rule] of linkCases) {
    it(`flags ${label}`, () => {
      expect(scanLinkRules(sample)).toContain(rule);
    });
  }

  it("ignores comments and similar tags", () => {
    expect(scanLinkRules("// href onClick\nconst a = <abbr />;")).toEqual([]);
  });

  it("flags violations in spotlight-like and result-panel-like code (REQ-PAGE-51)", () => {
    const spotlight = 'export const S = () => <section><a href="/x">go</a></section>;';
    expect(scanLinkRules(spotlight)).toEqual(expect.arrayContaining(["href", "<a element"]));
    const panel = "export const P = () => <div onClick={go}>{x}</div>;";
    expect(scanLinkRules(panel)).toContain("onClick");
  });

  it("flags hard-coded text in spotlight-like code (REQ-PAGE-39)", () => {
    expect(scan("export const S = () => <section><p>Look here</p></section>;")).toContain(
      "hard-coded JSX text",
    );
  });

  it("flags text elements in art", () => {
    expect(scanArtText("const a = <text>Hi</text>;")).toContain("<text");
    expect(scanArtText("const a = <title>Hi</title>;")).toContain("<title");
    expect(scanArtText('const a = <path d="M0 0" />;')).toEqual([]);
  });

  it("flags hard-coded text in an art file", () => {
    expect(scan("const a = <g>Hello</g>;")).toContain("hard-coded JSX text");
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
