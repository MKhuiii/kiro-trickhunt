import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, basename, resolve } from "node:path";

// Source scans of non-test client files (REQ-CI-44, REQ-CI-57..60).

const ROOT = resolve(__dirname, "..", "..", "..");
const UI_DIR = join(ROOT, "src", "ui");
const SCAN_DIRS = [join(ROOT, "src", "client"), join(ROOT, "src", "app", "try"), UI_DIR];

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

const PREFERENCES_FILE = join(UI_DIR, "preferences.ts");

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
    expect(names).toContain("preferences.ts");
    expect(names).toContain("result-view.ts");
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

  it("uses no browser storage outside src/ui/preferences.ts", () => {
    const re = /\b(localStorage|sessionStorage|indexedDB)\b|\bdocument\.cookie\b|\bcaches\./;
    const bad = sources()
      .filter((s) => s.file !== PREFERENCES_FILE && re.test(s.text))
      .map((s) => s.file);
    expect(bad).toEqual([]);
  });

  it("allows only localStorage in src/ui/preferences.ts", () => {
    expect(existsSync(PREFERENCES_FILE)).toBe(true);
    const text = readFileSync(PREFERENCES_FILE, "utf8");
    expect(text).not.toMatch(/\b(sessionStorage|indexedDB)\b|\bdocument\.cookie\b|\bcaches\./);
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

  describe("src/ui sources", () => {
    const ui = () => sources().filter((s) => s.file.startsWith(UI_DIR));
    const offending = (re: RegExp) => ui().filter((s) => re.test(s.text)).map((s) => s.name);
    // Identifier checks ignore comments and string literals (user-facing copy may say "process").
    const STRIP = /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/g;
    const offendingCode = (re: RegExp) =>
      ui()
        .filter((s) => re.test(s.text.replace(STRIP, "")))
        .map((s) => s.name);

    it("scans ui sources", () => {
      expect(ui().length).toBeGreaterThan(0);
    });

    it("imports no react, react-dom or next", () => {
      expect(
        offending(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["'](?:react|react-dom|next)(?:\/[^"']*)?["']/),
      ).toEqual([]);
    });

    it("uses no window, document, navigator or process", () => {
      expect(offendingCode(/\b(window|document|navigator|process)\b/)).toEqual([]);
    });

    it("never reads navigator.language", () => {
      expect(offendingCode(/\bnavigator\s*\.\s*language/)).toEqual([]);
    });

    it("imports pipeline and client/ingest only as types, except ingest.config", () => {
      const bad: string[] = [];
      const re = /^[ \t]*(import|export)\b([^;]*?)\bfrom\s*["']([^"']+)["']/gm;
      for (const s of ui()) {
        for (const m of s.text.matchAll(re)) {
          const spec = m[3];
          if (!/pipeline|client\/ingest/.test(spec)) continue;
          if (/^\s*type\b/.test(m[2])) continue;
          if (/(^|\/)ingest\.config$/.test(spec)) continue;
          bad.push(`${s.name}: ${spec}`);
        }
        if (/\bimport\s*\(\s*["'][^"']*(pipeline|client\/ingest)/.test(s.text)) bad.push(`${s.name}: dynamic`);
      }
      expect(bad).toEqual([]);
    });

    it("imports nothing from src/server", () => {
      expect(offending(/["'][^"']*\/server(\/|["'])/)).toEqual([]);
    });

    it("makes no network calls", () => {
      expect(offending(/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource)\b/)).toEqual([]);
    });

    it("contains no http(s) URLs", () => {
      expect(offending(/https?:\/\//i)).toEqual([]);
    });
  });
});
