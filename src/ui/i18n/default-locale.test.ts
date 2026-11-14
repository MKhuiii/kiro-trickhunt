import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE } from "./dictionary";

const UI_DIR = join(__dirname, "..");

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("default locale", () => {
  it("is English", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it("no non-test file under src/ui reads navigator or navigator.language", () => {
    const files = sourceFiles(UI_DIR);
    expect(files.length).toBeGreaterThan(0);
    const offenders = files.filter((f) => /\bnavigator\b/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
