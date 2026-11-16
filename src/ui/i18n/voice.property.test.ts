import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { en } from "./en";
import { vi } from "./vi";
import {
  BANNED_EXEMPT_KEY,
  FIXED_TEXT,
  MAX_WORDS_PER_SENTENCE,
  MAX_WORD_LENGTH,
  TIER_RULES,
  bannedWords,
  countHorrorWords,
  isRequiredThemed,
  longestWord,
  sentenceLengths,
  tierOf,
  tierRuleIndex,
} from "./voice";
import type { VoiceLang } from "./voice";

// PBT-100 to PBT-103 over the real dictionaries (REQ-VOICE-01 to REQ-VOICE-10).
// PBT-104 (required-themed keys) is in the second block, added with the new wording.

const TABLES: Readonly<Record<VoiceLang, Readonly<Record<string, string>>>> = {
  en: en as Readonly<Record<string, string>>,
  vi: vi as Readonly<Record<string, string>>,
};
const KEYS = Object.keys(en);
const LANGS: readonly VoiceLang[] = ["en", "vi"];

const keyArb = fc.constantFrom(...KEYS);
const langArb = fc.constantFrom(...LANGS);
const text = (lang: VoiceLang, key: string): string => TABLES[lang][key];

describe("PBT-100: every key has exactly one tier", () => {
  /** **Validates: Requirements REQ-VOICE-01** */
  it("every key of en has a tier, and vi has the same keys", () => {
    expect(Object.keys(vi).sort()).toEqual([...KEYS].sort());
    fc.assert(
      fc.property(keyArb, (key) => {
        expect(tierOf(key), key).not.toBeNull();
      }),
      { numRuns: Math.max(200, KEYS.length) },
    );
    for (const key of KEYS) expect(tierOf(key), key).not.toBeNull();
  });

  /** **Validates: Requirements REQ-VOICE-01** */
  it("every tier rule decides at least one key, so none is left over", () => {
    const used = new Set(KEYS.map((k) => tierRuleIndex(k)));
    TIER_RULES.forEach((rule, i) => expect(used.has(i), String(rule.pattern)).toBe(true));
  });
});

describe("PBT-101: tier C is plain and the fixed text is pinned", () => {
  const tierC = KEYS.filter((k) => tierOf(k) === "C");

  /** **Validates: Requirements REQ-VOICE-04** */
  it("a tier C string has no horror word in either language", () => {
    expect(tierC.length).toBeGreaterThan(50);
    fc.assert(
      fc.property(fc.constantFrom(...tierC), langArb, (key, lang) => {
        expect(countHorrorWords(text(lang, key), lang), `${lang} ${key}`).toBe(0);
      }),
      { numRuns: 500 },
    );
  });

  /** **Validates: Requirements REQ-VOICE-05** */
  it("the fixed text matches word for word, in both languages, and sits in tier C or B", () => {
    for (const [key, fixed] of Object.entries(FIXED_TEXT)) {
      expect(TABLES.en[key], `en ${key}`).toBe(fixed.en);
      expect(TABLES.vi[key], `vi ${key}`).toBe(fixed.vi);
      expect(tierOf(key), key).toBe("C");
    }
  });
});

describe("PBT-102: no banned word anywhere", () => {
  /** **Validates: Requirements REQ-VOICE-06** */
  it("no key has a banned word, except the one negated sentence", () => {
    fc.assert(
      fc.property(keyArb, langArb, (key, lang) => {
        if (key === BANNED_EXEMPT_KEY) return;
        expect(bannedWords(text(lang, key), lang), `${lang} ${key}`).toEqual([]);
      }),
      { numRuns: 600 },
    );
  });

  /** **Validates: Requirements REQ-VOICE-06** */
  it("the exempt sentence only uses the word safe, in its negated form", () => {
    expect(bannedWords(TABLES.en[BANNED_EXEMPT_KEY], "en")).toEqual(["safe"]);
    expect(bannedWords(TABLES.vi[BANNED_EXEMPT_KEY], "vi")).toEqual(["an toàn"]);
    expect(TABLES.en[BANNED_EXEMPT_KEY]).toMatch(/does not mean/);
    expect(TABLES.vi[BANNED_EXEMPT_KEY]).toMatch(/không có nghĩa/);
  });
});

describe("PBT-104: the required-themed keys carry the horror voice", () => {
  const required = KEYS.filter((k) => isRequiredThemed(k));

  /** **Validates: Requirements REQ-VOICE-08** */
  it("every required-themed key has a horror word in English and in Vietnamese", () => {
    expect(required.length).toBeGreaterThanOrEqual(17 + 12);
    for (const key of required) expect(tierOf(key), key).toBe("A");
    fc.assert(
      fc.property(fc.constantFrom(...required), langArb, (key, lang) => {
        expect(countHorrorWords(text(lang, key), lang), `${lang} ${key}`).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 400 },
    );
  });

  /** **Validates: Requirements REQ-VOICE-08** */
  it("every key in the required list exists in the dictionary", () => {
    for (const key of [
      "app.tagline",
      "scene.home.caption",
      "scene.reveal.found",
      "home.hunter.action",
      "hunt.again",
      "journal.title",
    ]) {
      expect(KEYS).toContain(key);
    }
  });
});

describe("PBT-103: tiers A and B are short and plain", () => {
  const themed = KEYS.filter((k) => tierOf(k) !== "C");

  /** **Validates: Requirements REQ-VOICE-10** */
  it("sentences and words stay within the limits", () => {
    expect(themed.length).toBeGreaterThan(40);
    fc.assert(
      fc.property(fc.constantFrom(...themed), langArb, (key, lang) => {
        const s = text(lang, key);
        for (const n of sentenceLengths(s)) {
          expect(n, `${lang} ${key}: sentence length`).toBeLessThanOrEqual(
            MAX_WORDS_PER_SENTENCE[lang],
          );
        }
        expect(longestWord(s), `${lang} ${key}: word length`).toBeLessThanOrEqual(MAX_WORD_LENGTH);
      }),
      { numRuns: 500 },
    );
  });

  /** **Validates: Requirements REQ-VOICE-03** */
  it("a tier B string has at most one horror word", () => {
    const tierB = KEYS.filter((k) => tierOf(k) === "B");
    expect(tierB.length).toBeGreaterThan(15);
    fc.assert(
      fc.property(fc.constantFrom(...tierB), langArb, (key, lang) => {
        expect(countHorrorWords(text(lang, key), lang), `${lang} ${key}`).toBeLessThanOrEqual(1);
      }),
      { numRuns: 400 },
    );
  });
});
