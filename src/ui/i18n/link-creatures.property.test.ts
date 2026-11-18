import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { en } from "./en";
import { vi } from "./vi";
import {
  MAX_WORD_LENGTH,
  bannedWords,
  countHorrorWords,
  longestWord,
  tierOf,
} from "./voice";
import type { VoiceLang } from "./voice";

// PBT-108: link creature dictionary (REQ-LINK-05, 06, 07, 18).
// Ids and bands are local copies; src/ui/link-creatures.ts comes in task 3.

const CREATURE_IDS = [
  "doppelganger",
  "changeling",
  "faceless-one",
  "masked-stranger",
  "hydra",
  "cloaked-gate",
  "wisp",
  "plague-mark",
] as const;
const TONE_BANDS = ["strong", "medium", "soft"] as const;

const TABLES: Readonly<Record<VoiceLang, Readonly<Record<string, string>>>> = {
  en: en as Readonly<Record<string, string>>,
  vi: vi as Readonly<Record<string, string>>,
};

const LINK_KEYS: string[] = [
  ...CREATURE_IDS.flatMap((id) => [
    `link.${id}.name`,
    `link.${id}.desc`,
    `link.${id}.tip1`,
    `link.${id}.tip2`,
    `link.${id}.tip3`,
  ]),
  ...TONE_BANDS.flatMap((b) => [`link.tone.${b}.label`, `link.tone.${b}.explain`]),
  "link.plague-mark.explain",
];

const keyArb = fc.constantFrom(...LINK_KEYS);
const langArb = fc.constantFrom<VoiceLang>("en", "vi");
const FACT_WORDS = /\b(fake|malicious|dangerous|safe|clean)\b/i;

describe("PBT-108: link creature dictionary", () => {
  /** **Validates: Requirements REQ-LINK-05, REQ-LINK-18** */
  it("every link key exists in en and vi, with non-empty text and no placeholders", () => {
    fc.assert(
      fc.property(keyArb, langArb, (key, lang) => {
        const value = TABLES[lang][key];
        expect(typeof value).toBe("string");
        expect(value.trim().length).toBeGreaterThan(0);
        expect(value).not.toMatch(/\{[A-Za-z0-9_]+\}/);
      }),
      { numRuns: 200 },
    );
  });

  /** **Validates: Requirements REQ-LINK-05, REQ-LINK-18** */
  it("en and vi have the same set of link.* keys, and it is exactly the expected set", () => {
    const enKeys = Object.keys(en).filter((k) => k.startsWith("link.")).sort();
    const viKeys = Object.keys(vi).filter((k) => k.startsWith("link.")).sort();
    // link.badge.caption and link.plain.note come from ui-page (REQ-PAGE-45).
    expect(enKeys).toEqual([...LINK_KEYS, "link.badge.caption", "link.plain.note"].sort());
    expect(viKeys).toEqual(enKeys);
  });

  /** **Validates: Requirements REQ-LINK-06** */
  it("every link key is tier C: no horror word, no banned word, no long word", () => {
    fc.assert(
      fc.property(keyArb, langArb, (key, lang) => {
        const value = TABLES[lang][key];
        expect(tierOf(key)).toBe("C");
        expect(countHorrorWords(value, lang)).toBe(0);
        expect(bannedWords(value, lang)).toEqual([]);
        expect(longestWord(value)).toBeLessThanOrEqual(MAX_WORD_LENGTH);
      }),
      { numRuns: 200 },
    );
  });

  /** **Validates: Requirements REQ-LINK-07** */
  it("English text never states a link as a fact (fake, malicious, dangerous, safe)", () => {
    fc.assert(
      fc.property(keyArb, (key) => {
        expect(en[key as keyof typeof en]).not.toMatch(FACT_WORDS);
      }),
      { numRuns: 100 },
    );
  });

  /** **Validates: Requirements REQ-LINK-07** */
  it("every description says the link has traits of something", () => {
    fc.assert(
      fc.property(fc.constantFrom(...CREATURE_IDS), (id) => {
        expect(TABLES.en[`link.${id}.desc`]).toMatch(/^This link has traits of /);
        expect(TABLES.vi[`link.${id}.desc`]).toMatch(/^Đường dẫn này có dấu hiệu /);
      }),
      { numRuns: 100 },
    );
  });
});
