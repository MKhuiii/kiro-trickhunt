// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve, relative } from "node:path";

/**
 * Source-scan rules for src/server/reputation (REQ-LREP-08, 09, 59, 67, 68).
 */

const SRC = resolve(__dirname, "..", "..");
const REP_DIR = __dirname;
const ROOT = resolve(SRC, "..");

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

const isTest = (p: string): boolean => /\.test\.tsx?$/.test(p);

/** Removes block comments and line comments (not the `//` of a URL). */
export function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\w])\/\/.*$/gm, "$1");
}

interface Src {
  name: string;
  text: string;
}

function load(files: string[]): Src[] {
  return files.map((f) => ({
    name: relative(SRC, f).replace(/\\/g, "/"),
    text: stripComments(readFileSync(f, "utf8")),
  }));
}

const repFiles = load(walk(REP_DIR).filter((f) => !isTest(f)));
const allFiles = load(walk(SRC).filter((f) => !isTest(f)));

function importsOf(text: string): string[] {
  const out: string[] = [];
  const re = /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1] as string);
  return out;
}

/** Resolves a relative specifier to a path under src, or returns the bare specifier. */
function target(fromName: string, spec: string): string {
  if (spec.startsWith("@/")) return spec.slice(2);
  if (!spec.startsWith(".")) return spec;
  const abs = resolve(SRC, fromName, "..", spec);
  return relative(SRC, abs).replace(/\\/g, "/");
}

const BROWSER_PACKAGES = /^(tesseract|zxing|react|react-dom|next)(\b|[-/.])/;
const FORBIDDEN_LAYERS = /^(pipeline|ui|components|client)(\/|$)/;

function importViolations(files: Src[]): string[] {
  const bad: string[] = [];
  for (const f of files) {
    for (const spec of importsOf(f.text)) {
      const t = target(f.name, spec);
      if (BROWSER_PACKAGES.test(t) || FORBIDDEN_LAYERS.test(t)) bad.push(`${f.name} -> ${spec}`);
    }
  }
  return bad;
}

function reverseViolations(files: Src[]): string[] {
  const bad: string[] = [];
  for (const f of files) {
    if (!/^(pipeline|core|analyzers|ui|client)\//.test(f.name)) continue;
    for (const spec of importsOf(f.text)) {
      if (/^server\/reputation(\/|$)/.test(target(f.name, spec))) bad.push(`${f.name} -> ${spec}`);
    }
  }
  return bad;
}

const LOG_CALL = /\bconsole\s*\.|\blogger\s*\.|\blog\s*\.\s*(info|warn|error|debug)\b/;

function logViolations(files: Src[]): string[] {
  return files.filter((f) => LOG_CALL.test(f.text)).map((f) => f.name);
}

/** Top-level `let`/`var`, or a top-level new Map/Set/WeakMap/Array/object that is not `const` frozen config. */
function mutableStateViolations(files: Src[]): string[] {
  const bad: string[] = [];
  for (const f of files) {
    if (/^(let|var)\s/m.test(f.text) || /^export\s+(let|var)\s/m.test(f.text)) bad.push(f.name);
    if (/^(export\s+)?const\s+\w+(\s*:[^=]+)?\s*=\s*new\s+(Map|Set|WeakMap|WeakSet)\b/m.test(f.text)) {
      bad.push(f.name);
    }
  }
  return bad;
}

describe("src/server/reputation source scan", () => {
  it("finds the module files", () => {
    const names = repFiles.map((f) => f.name);
    for (const n of [
      "server/reputation/url-expressions.ts",
      "server/reputation/reputation-config.ts",
      "server/reputation/reputation.config.ts",
      "server/reputation/safe-browsing-provider.ts",
      "server/reputation/reputation-checker.ts",
    ]) {
      expect(names).toContain(n);
    }
  });

  it("imports nothing from next, react, tesseract, zxing, pipeline, ui, components or client (REQ-LREP-67)", () => {
    expect(importViolations(repFiles)).toEqual([]);
  });

  it("is imported by no module of pipeline, core, analyzers, ui or client (REQ-LREP-68)", () => {
    expect(reverseViolations(allFiles)).toEqual([]);
  });

  it("has no console or logger call", () => {
    expect(logViolations(repFiles)).toEqual([]);
  });

  it("imports node:crypto only in url-expressions.ts", () => {
    const users = repFiles
      .filter((f) => importsOf(f.text).some((s) => s === "node:crypto" || s === "crypto"))
      .map((f) => f.name);
    expect(users).toEqual(["server/reputation/url-expressions.ts"]);
  });

  it("names safebrowsing.googleapis.com only in reputation.config.ts and no other host (REQ-LREP-09)", () => {
    const withHost = repFiles
      .filter((f) => f.text.includes("safebrowsing.googleapis.com"))
      .map((f) => f.name);
    expect(withHost).toEqual(["server/reputation/reputation.config.ts"]);
    for (const f of repFiles) {
      const hosts = [...f.text.matchAll(/https?:\/\/([^/"'`\s]+)/g)].map((m) => m[1]);
      for (const h of hosts) expect(h).toBe("safebrowsing.googleapis.com");
    }
    const outside = allFiles
      .filter((f) => f.text.includes("safebrowsing.googleapis.com"))
      .map((f) => f.name);
    expect(outside).toEqual(["server/reputation/reputation.config.ts"]);
  });

  it("reads process.env only in reputation-config.ts (and default-handler outside the folder)", () => {
    const inFolder = repFiles.filter((f) => /process\.env/.test(f.text)).map((f) => f.name);
    expect(inFolder).toEqual(["server/reputation/reputation-config.ts"]);
    const outside = allFiles
      .filter((f) => !f.name.startsWith("server/reputation/"))
      .filter((f) => /process\.env/.test(f.text) && /reputation/i.test(f.text))
      .map((f) => f.name);
    for (const n of outside) expect(n).toBe("server/api/default-handler.ts");
  });

  it("reads LINK_REPUTATION_ names only in reputation-config.ts (REQ-LREP-08, 59)", () => {
    const users = allFiles.filter((f) => f.text.includes("LINK_REPUTATION_")).map((f) => f.name);
    expect(users).toEqual(["server/reputation/reputation-config.ts"]);
  });

  it("never uses the NEXT_PUBLIC_ prefix for a reputation setting", () => {
    const users = allFiles.filter((f) => /NEXT_PUBLIC_\w*REPUTATION/i.test(f.text));
    expect(users.map((f) => f.name)).toEqual([]);
  });

  it("keeps no module-level mutable state or cache", () => {
    expect(mutableStateViolations(repFiles)).toEqual([]);
  });

  it("adds no reputation client dependency to package.json", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(names.filter((n) => /safe-?browsing|googleapis|@google-cloud/i.test(n))).toEqual([]);
  });
});

describe("boundary scan sanity cases", () => {
  const fake = (name: string, text: string): Src => ({ name, text: stripComments(text) });

  it("stripComments keeps URLs and drops comments", () => {
    const s = stripComments('const u = "https://a.b/c"; // console.log(x)\n/* process.env */');
    expect(s).toContain("https://a.b/c");
    expect(s).not.toContain("console");
    expect(s).not.toContain("process.env");
  });

  it("flags forbidden imports", () => {
    const f = fake("server/reputation/x.ts", 'import React from "react";\nimport { a } from "../../ui/b";\nimport { c } from "../../pipeline/d";');
    expect(importViolations([f]).length).toBe(3);
    expect(importViolations([fake("server/reputation/x.ts", 'import { a } from "./y";')])).toEqual([]);
  });

  it("flags a reverse import from a lower layer", () => {
    const f = fake("pipeline/p.ts", 'import { x } from "../server/reputation";');
    expect(reverseViolations([f])).toEqual(["pipeline/p.ts -> ../server/reputation"]);
    expect(reverseViolations([fake("server/api/h.ts", 'import { x } from "../reputation";')])).toEqual([]);
  });

  it("flags logging calls", () => {
    expect(logViolations([fake("a.ts", "console.warn(url)")])).toEqual(["a.ts"]);
    expect(logViolations([fake("a.ts", "// console.log(url)\nconst a = 1;")])).toEqual([]);
  });

  it("flags module-level mutable state", () => {
    expect(mutableStateViolations([fake("a.ts", "let cache = 1;")])).toEqual(["a.ts"]);
    expect(mutableStateViolations([fake("a.ts", "const cache = new Map();")])).toEqual(["a.ts"]);
    expect(mutableStateViolations([fake("a.ts", "function f() {\n  const m = new Map();\n  let n = 0;\n}")])).toEqual([]);
  });
});
