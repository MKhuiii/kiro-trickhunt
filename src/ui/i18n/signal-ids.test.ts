import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SEMANTIC_SIGNALS } from "../../analyzers/semantic-analyzer.config";
import { TEXT_PATTERNS } from "../../analyzers/text-analyzer.config";
import { MONSTERS } from "../../pipeline/monsters.config";
import { en } from "./en";
import { vi } from "./vi";
import { KNOWN_SIGNAL_IDS, explanationKeyFor } from "./signal-ids";

function urlIdsFromSource(): string[] {
  const source = readFileSync(
    join(__dirname, "..", "..", "analyzers", "url-analyzer.ts"),
    "utf8",
  );
  const ids = new Set<string>();
  for (const m of source.matchAll(/id:\s*"(url\.[^"]+)"/g)) ids.add(m[1]);
  return [...ids];
}

describe("signal ids", () => {
  it("equal the analyzer configs plus the url ids in url-analyzer.ts", () => {
    const expected = [
      ...TEXT_PATTERNS.map((p) => p.id),
      ...urlIdsFromSource(),
      ...SEMANTIC_SIGNALS.map((s) => s.id),
    ];
    expect([...KNOWN_SIGNAL_IDS].sort()).toEqual([...expected].sort());
  });

  it("includes every id used in monster weights", () => {
    const known = new Set<string>(KNOWN_SIGNAL_IDS);
    for (const monster of MONSTERS) {
      for (const id of Object.keys(monster.weights)) {
        expect(known.has(id), `${monster.id}: ${id}`).toBe(true);
      }
    }
  });

  it("has an explanation key in both languages for every known id", () => {
    for (const id of KNOWN_SIGNAL_IDS) {
      const key = explanationKeyFor(id);
      expect(key).toBe(`signal.${id}.explain`);
      expect(Object.hasOwn(en, key)).toBe(true);
      expect(Object.hasOwn(vi, key)).toBe(true);
    }
  });

  it("gives the generic key for unknown or non-string ids", () => {
    for (const id of ["nope", "", "constructor", "__proto__", null, undefined, 7]) {
      expect(explanationKeyFor(id)).toBe("signal.unknown.explain");
    }
  });
});
