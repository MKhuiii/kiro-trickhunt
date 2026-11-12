import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, basename, resolve } from "node:path";

// Source scans of non-test client files (REQ-CI-44, REQ-CI-57..60).

const ROOT = resolve(__dirname, "..", "..", "..");
const SCAN_DIRS = [join(ROOT, "src", "client"), join(ROOT, "src", "app", "try")];

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name) && !/\.(property\.)?test\.ts$/.test(name)) out.push(full);
  }
  return out;
}

function sources(): { file: string; name: string; text: string }[] {
  return SCAN_DIRS.flatMap(walk).map((file) => ({
    file,
    name: basename(file),
    text: readFileSync(file, "utf8"),
  }));
}

function offenders(re: RegExp, filter: (name: string) => boolean = () => true): string[] {
  return sources()
    .filter((s) => filter(s.name) && re.test(s.text))
    .map((s) => s.name);
}

const PURE = [
  "validate-image-file",
  "fit-within",
  "qr-payload",
  "analyze-input",
  "ocr-quality",
  "ingest.config",
  "types",
].map((n) => `${n}.ts`);

describe("client ingest boundaries", () => {
  it("scans at least the ingest sources", () => {
    const names = sources().map((s) => s.name);
    for (const p of PURE) expect(names).toContain(p);
    expect(names).toContain("analyze-client.ts");
  });

  it("imports nothing from server/", () => {
    const re = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["'][^"']*server\//;
    expect(offenders(re)).toEqual([]);
  });

  it("uses no XMLHttpRequest, sendBeacon, WebSocket or EventSource", () => {
    expect(offenders(/\b(XMLHttpRequest|sendBeacon|WebSocket|EventSource)\b/)).toEqual([]);
  });

  it("calls fetch( only in analyze-client.ts", () => {
    expect(offenders(/\bfetch\s*\(/, (n) => n !== "analyze-client.ts")).toEqual([]);
  });

  it("uses no browser storage", () => {
    expect(
      offenders(/\b(localStorage|sessionStorage|indexedDB)\b|\bdocument\.cookie\b|\bcaches\./),
    ).toEqual([]);
  });

  it("loads tesseract.js and zxing-wasm only through import()", () => {
    const staticImport =
      /\b(?:import|export)\b[^;"']*?\bfrom\s*["'](?:tesseract\.js|zxing-wasm)[^"']*["']|\bimport\s*["'](?:tesseract\.js|zxing-wasm)/;
    expect(offenders(staticImport)).toEqual([]);
    // Every quoted specifier must sit directly inside import(...).
    for (const s of sources()) {
      const quoted = s.text.match(/["'](?:tesseract\.js|zxing-wasm)[^"']*["']/g) ?? [];
      const dynamic = s.text.match(/\bimport\s*\(\s*["'](?:tesseract\.js|zxing-wasm)[^"']*["']\s*\)/g) ?? [];
      expect({ file: s.name, count: quoted.length }).toEqual({ file: s.name, count: dynamic.length });
    }
  });

  it("references no third-party CDN", () => {
    expect(offenders(/jsdelivr|unpkg|projectnaptha/i)).toEqual([]);
  });

  it("keeps pure modules free of window, document, navigator, fetch and process", () => {
    expect(offenders(/\b(window|document|navigator|fetch|process)\b/, (n) => PURE.includes(n))).toEqual(
      [],
    );
  });
});
