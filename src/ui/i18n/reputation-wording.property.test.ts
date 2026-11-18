import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { en } from "./en";
import { vi } from "./vi";
import { tierOf } from "./voice";
import type { VoiceLang } from "./voice";

// Feature: link-reputation-check, Property 128: dictionary wording rules hold for every new key (PBT-128)

const TABLES: Readonly<Record<VoiceLang, Readonly<Record<string, string>>>> = {
  en: en as Readonly<Record<string, string>>,
  vi: vi as Readonly<Record<string, string>>,
};

const KEYS: string[] = [
  ...Object.keys(en).filter(
    (k) => k.startsWith("reputation.") || k.startsWith("link.plague-mark."),
  ),
  "signal.url.reputation-listed.explain",
].filter((k, i, all) => all.indexOf(k) === i);

const FORBIDDEN: Readonly<Record<VoiceLang, RegExp>> = {
  en: /\b(fake|malicious|dangerous)\b/i,
  vi: /giả mạo|độc hại|nguy hiểm/i,
};
const SAFE_FAMILY: Readonly<Record<VoiceLang, RegExp>> = {
  en: /\b(safe|safely|safety|unsafe|safer|safest)\b/i,
  vi: /an toàn/i,
};
const MAX_SENTENCE_WORDS = 25;

const keyArb = fc.constantFrom(...KEYS);
const langArb = fc.constantFrom<VoiceLang>("en", "vi");

function placeholders(text: string): string[] {
  return (text.match(/\{[A-Za-z0-9_]+\}/g) ?? []).sort();
}

function longestSentenceWords(text: string): number {
  return Math.max(
    0,
    ...text
      .split(/[.!?]+(?:\s|$)/)
      .map((s) => s.split(/\s+/).filter((w) => w.length > 0).length),
  );
}

describe("PBT-128: reputation wording", () => {
  it("covers the expected key set in both languages", () => {
    for (const key of [
      "reputation.consent.label",
      "reputation.consent.text",
      "reputation.notice.unavailable",
      "reputation.notListed.text",
      "reputation.notListed.limit",
      "reputation.attribution.text",
      "reputation.attribution.newTab",
      "signal.url.reputation-listed.explain",
      "link.plague-mark.name",
      "link.plague-mark.desc",
      "link.plague-mark.explain",
    ]) {
      expect(KEYS).toContain(key);
    }
    for (const key of KEYS) {
      expect(key in en).toBe(true);
      expect(key in vi).toBe(true);
    }
  });

  /** **Validates: Requirements REQ-LREP-41, REQ-LREP-45** */
  it("is non-empty with equal placeholders in both languages", () => {
    fc.assert(
      fc.property(keyArb, langArb, (key, lang) => {
        expect(TABLES[lang][key].trim().length).toBeGreaterThan(0);
        expect(placeholders(TABLES.vi[key])).toEqual(placeholders(TABLES.en[key]));
      }),
      { numRuns: 200 },
    );
  });

  /** **Validates: Requirements REQ-LREP-45, REQ-LREP-46** */
  it("never uses the forbidden wording or a word of the safe family", () => {
    fc.assert(
      fc.property(keyArb, langArb, (key, lang) => {
        const value = TABLES[lang][key];
        expect(value).not.toMatch(FORBIDDEN[lang]);
        expect(value).not.toMatch(SAFE_FAMILY[lang]);
      }),
      { numRuns: 200 },
    );
  });

  /** **Validates: Requirements REQ-LREP-46, REQ-LREP-47** */
  it("has sentences of at most 25 words and is tier C", () => {
    fc.assert(
      fc.property(keyArb, langArb, (key, lang) => {
        expect(longestSentenceWords(TABLES[lang][key])).toBeLessThanOrEqual(MAX_SENTENCE_WORDS);
        expect(tierOf(key)).toBe("C");
      }),
      { numRuns: 200 },
    );
  });
});
