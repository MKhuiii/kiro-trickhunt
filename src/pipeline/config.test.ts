import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { aggregate, createSignal } from "../core";
import { SEMANTIC_SIGNALS } from "../analyzers/semantic-analyzer.config";
import { TEXT_PATTERNS } from "../analyzers/text-analyzer.config";
import {
  ACTIONS_BY_MONSTER,
  ACTIONS_BY_SIGNAL,
  ACTIONS_FALLBACK,
  LIMITATIONS_DEGRADED,
  LIMITATIONS_FIXED,
  LIMITATIONS_NO_SIGNALS,
  LIMITATIONS_UNAVAILABLE,
} from "./messages.config";
import { MONSTERS, MONSTER_ORDER } from "./monsters.config";
import { OVERLAP_GROUPS } from "./overlap.config";
import { COMBINATION_RULES, MIN_SCORE_BY_LEVEL } from "./rules.config";
import type { Locale, MonsterId } from "./verdict";

const LOCALES: readonly Locale[] = ["en", "vi"];
const MONSTER_IDS: readonly MonsterId[] = [
  "bank",
  "prize",
  "job-bait",
  "authority",
  "generic",
];

/** URL signal ids are emitted by the analyzer code, not its config file. */
function urlSignalIds(): string[] {
  const source = readFileSync(
    join(__dirname, "..", "analyzers", "url-analyzer.ts"),
    "utf8",
  );
  return [...source.matchAll(/id:\s*"(url\.[a-z-]+)"/g)].map((m) => m[1]);
}

const REAL_IDS: ReadonlySet<string> = new Set([
  ...TEXT_PATTERNS.map((p) => p.id),
  ...SEMANTIC_SIGNALS.map((s) => s.id),
  ...urlSignalIds(),
]);

/** True if `key` is an exact real id or a ".*" prefix matching one. */
function resolves(key: string): boolean {
  if (key.endsWith(".*")) {
    const prefix = key.slice(0, -1);
    return [...REAL_IDS].some((id) => id.startsWith(prefix));
  }
  return REAL_IDS.has(key);
}

const messageLists: ReadonlyArray<readonly [string, Record<Locale, readonly string[]>]> = [
  ["ACTIONS_FALLBACK", ACTIONS_FALLBACK],
  ["LIMITATIONS_FIXED", LIMITATIONS_FIXED],
  ["LIMITATIONS_DEGRADED", LIMITATIONS_DEGRADED],
  ["LIMITATIONS_UNAVAILABLE", LIMITATIONS_UNAVAILABLE],
  ["LIMITATIONS_NO_SIGNALS", LIMITATIONS_NO_SIGNALS],
];

function allMessages(): string[] {
  const out: string[] = [];
  for (const locale of LOCALES) {
    for (const list of Object.values(ACTIONS_BY_MONSTER[locale])) out.push(...list);
    for (const list of Object.values(ACTIONS_BY_SIGNAL[locale])) out.push(...list);
    for (const [, lists] of messageLists) out.push(...lists[locale]);
  }
  return out;
}

describe("messages config", () => {
  it("has non-empty lists of non-blank strings in both locales", () => {
    for (const [name, lists] of messageLists) {
      for (const locale of LOCALES) {
        expect(lists[locale].length, `${name}.${locale}`).toBeGreaterThan(0);
        for (const text of lists[locale]) {
          expect(text.trim(), `${name}.${locale}`).not.toBe("");
        }
      }
    }
    for (const locale of LOCALES) {
      for (const [id, list] of Object.entries(ACTIONS_BY_MONSTER[locale])) {
        expect(list.length, `monster ${id}.${locale}`).toBeGreaterThan(0);
        list.forEach((t) => expect(t.trim()).not.toBe(""));
      }
      for (const [id, list] of Object.entries(ACTIONS_BY_SIGNAL[locale])) {
        expect(list.length, `signal ${id}.${locale}`).toBeGreaterThan(0);
        list.forEach((t) => expect(t.trim()).not.toBe(""));
      }
    }
  });

  it("has equal list lengths across locales", () => {
    for (const [name, lists] of messageLists) {
      expect(lists.en.length, name).toBe(lists.vi.length);
    }
    for (const id of MONSTER_IDS) {
      expect(ACTIONS_BY_MONSTER.en[id].length, id).toBe(
        ACTIONS_BY_MONSTER.vi[id].length,
      );
    }
    expect(Object.keys(ACTIONS_BY_SIGNAL.en).sort()).toEqual(
      Object.keys(ACTIONS_BY_SIGNAL.vi).sort(),
    );
    for (const key of Object.keys(ACTIONS_BY_SIGNAL.en)) {
      expect(ACTIONS_BY_SIGNAL.en[key].length, key).toBe(
        ACTIONS_BY_SIGNAL.vi[key].length,
      );
    }
  });

  it("covers every MonsterId in ACTIONS_BY_MONSTER for both locales", () => {
    for (const locale of LOCALES) {
      expect(Object.keys(ACTIONS_BY_MONSTER[locale]).sort()).toEqual(
        [...MONSTER_IDS].sort(),
      );
    }
  });

  it("contains no forbidden safety words (REQ-PIPE-41)", () => {
    const forbidden: readonly RegExp[] = [
      /\bsafe\b/i,
      /\bsafely\b/i,
      /\bsafety\b/i,
      /\bclean\b/i,
      /no threats? found/i,
      /probably fine/i,
      /\blikely safe\b/i,
      /\bdangerous\b/i,
      /\bdefinitely\b/i,
      /\bmalicious\b/i,
      /100\s*%/,
      /an toàn/i,
      /sạch/i,
      /chắc chắn/i,
    ];
    for (const text of allMessages()) {
      for (const re of forbidden) {
        expect(text, `"${text}" matches ${re}`).not.toMatch(re);
      }
    }
  });

  it("uses only real signal ids or prefixes as ACTIONS_BY_SIGNAL keys", () => {
    for (const locale of LOCALES) {
      for (const key of Object.keys(ACTIONS_BY_SIGNAL[locale])) {
        expect(resolves(key), key).toBe(true);
      }
    }
  });
});

describe("overlap config", () => {
  it("has groups of at least two ids and no id in more than one group", () => {
    const seen = new Set<string>();
    for (const group of OVERLAP_GROUPS) {
      expect(group.length).toBeGreaterThanOrEqual(2);
      for (const id of group) {
        expect(seen.has(id), `duplicate ${id}`).toBe(false);
        seen.add(id);
      }
    }
  });

  it("references only real signal ids", () => {
    for (const id of OVERLAP_GROUPS.flat()) {
      expect(REAL_IDS.has(id), id).toBe(true);
    }
  });
});

describe("monsters config", () => {
  it("references only real signal ids with positive weights", () => {
    for (const monster of MONSTERS) {
      for (const [id, weight] of Object.entries(monster.weights)) {
        expect(REAL_IDS.has(id), `${monster.id}: ${id}`).toBe(true);
        expect(weight).toBeGreaterThan(0);
      }
    }
  });

  it("defines each specific monster once and MONSTER_ORDER matches", () => {
    const ids = MONSTERS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...MONSTER_ORDER].sort());
  });
});

describe("rules config", () => {
  it("references only real signal ids or matching prefixes", () => {
    for (const rule of COMBINATION_RULES) {
      expect(rule.allOf.length).toBeGreaterThan(0);
      for (const group of rule.allOf) {
        expect(group.length).toBeGreaterThan(0);
        for (const key of group) {
          expect(resolves(key), `${rule.id}: ${key}`).toBe(true);
        }
      }
    }
  });

  it("has unique rule ids", () => {
    const ids = COMBINATION_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("MIN_SCORE_BY_LEVEL maps back to its level through aggregate", () => {
    for (const [level, minScore] of Object.entries(MIN_SCORE_BY_LEVEL)) {
      const at = (score: number) =>
        aggregate([
          createSignal({
            id: "text.urgency",
            source: "text",
            severity: score / 100,
            evidence: "e",
            whyItMatters: "w",
          }),
        ]);
      const result = at(minScore);
      expect(result.score).toBe(minScore);
      expect(result.level).toBe(level);
      // One point lower must be a different level. Not applicable to
      // "suspicious": a score of 0 with a signal present is still suspicious.
      if (level !== "suspicious") {
        expect(at(minScore - 1).level).not.toBe(level);
      }
    }
  });
});
