import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

// Source scan for the Pixi stage (REQ-HUNT-51, 52, 55, 56).

const ROOT = resolve(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");
const STAGE_DIR = join(SRC, "components", "stage");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

function isTest(file: string): boolean {
  return /\.test\.tsx?$/.test(file);
}

function strip(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

describe("pixi.js usage", () => {
  const files = walk(SRC).filter((f) => !isTest(f));

  it("is imported only by a dynamic import() inside PixiStage.tsx", () => {
    const hits = files
      .map((f) => ({ f, code: strip(readFileSync(f, "utf8")) }))
      .filter(({ code }) => /["']pixi\.js["']/.test(code));
    expect(hits.map((h) => h.f.slice(SRC.length + 1).replace(/\\/g, "/"))).toEqual([
      "components/stage/PixiStage.tsx",
    ]);
    const code = hits[0].code;
    expect(code).toMatch(/await import\("pixi\.js"\)/);
    expect(code).not.toMatch(/^\s*import\s[^;]*from\s*["']pixi\.js["']/m);
  });

  it("does not use Pixi filters, the network, storage or the console in the stage", () => {
    const stage = walk(STAGE_DIR).filter((f) => !isTest(f));
    expect(stage.length).toBeGreaterThan(2);
    for (const file of stage) {
      const code = strip(readFileSync(file, "utf8"));
      expect(code, file).not.toMatch(/\bfetch\s*\(/);
      expect(code, file).not.toMatch(/\bXMLHttpRequest\b/);
      expect(code, file).not.toMatch(/\bconsole\s*\./);
      expect(code, file).not.toMatch(/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b/);
      expect(code, file).not.toMatch(/https?:\/\//i);
      expect(code, file).not.toMatch(/\bfilters\b|BlurFilter|DisplacementFilter|GlowFilter/);
      expect(code, file).not.toMatch(/\bAssets\.(load|add)\b/);
    }
  });
});

describe("dependencies", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    dependencies: Record<string, string>;
  };

  it("pins pixi.js to an exact version", () => {
    expect(pkg.dependencies["pixi.js"]).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("has no @pixi/react and no other new runtime dependency", () => {
    expect(Object.keys(pkg.dependencies).sort()).toEqual(
      [
        "next",
        "pixi.js",
        "react",
        "react-dom",
        "tesseract.js",
        "tesseract.js-core",
        "zod",
        "zxing-wasm",
      ].sort(),
    );
  });
});

describe("svg textures (task 22)", () => {
  const code = strip(readFileSync(join(STAGE_DIR, "svg-texture.ts"), "utf8"));

  it("only makes same-origin blob addresses and revokes them", () => {
    expect(code).toMatch(/createObjectURL/);
    expect(code).toMatch(/revokeObjectURL/);
    expect(code).toMatch(/finally\s*\{[\s\S]*revokeBlobUrl/);
  });

  it("sets no image source except the blob address", () => {
    expect(code).toMatch(/img\.src = url;/);
    expect(code).not.toMatch(/\.src\s*=\s*["'`]/);
  });
});
