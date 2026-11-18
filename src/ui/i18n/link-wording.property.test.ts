import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { en } from "./en";
import { vi } from "./vi";
import { tierOf } from "./voice";
import type { VoiceLang } from "./voice";

// PBT-113: link wording rule (REQ-PAGE-45).

const TABLES: Readonly<Record<VoiceLang, Readonly<Record<string, string>>>> = {
  en: en as Readonly<Record<string, string>>,
  vi: vi as Readonly<Record<string, string>>,
};

const URL_SIGNALS = [
  "punycode-host",
  "ip-address-host",
  "at-in-authority",
  "excessive-subdomains",
  "known-shortener",
  "brand-lookalike",
  "credential-keywords",
] as const;

const KEYS: string[] = [
  ...Object.keys(en).filter((k) => k.startsWith("link.")),
  "link.badge.caption",
  "link.plain.note",
  "result.links.heading",
  ...URL_SIGNALS.map((s) => `signal.url.${s}.explain`),
  "signal.url.reputation-listed.explain",
  ...Object.keys(en).filter((k) => k.startsWith("reputation.")),
].filter((k, i, all) => all.indexOf(k) === i);

const FORBIDDEN: Readonly<Record<VoiceLang, RegExp>> = {
  en: /\b(fake|malicious|dangerous)\b/i,
  vi: /giả mạo|độc hại|nguy hiểm|trang giả|trang web giả/i,
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

describe("PBT-113: link wording", () => {
  it("covers the expected key set in both languages", () => {
    expect(KEYS).toContain("link.badge.caption");
    expect(KEYS).toContain("link.plain.note");
    expect(KEYS).toContain("result.links.heading");
    expect(KEYS.length).toBeGreaterThanOrEqual(7 + 2 + 7 * 5 + 6);
    for (const key of KEYS) {
      expect(key in en).toBe(true);
      expect(key in vi).toBe(true);
    }
  });

  /** **Validates: Requirements REQ-PAGE-45** */
  it("is non-empty with equal placeholders in both languages", () => {
    fc.assert(
      fc.property(keyArb, langArb, (key, lang) => {
        expect(TABLES[lang][key].trim().length).toBeGreaterThan(0);
        expect(placeholders(TABLES.vi[key])).toEqual(placeholders(TABLES.en[key]));
      }),
      { numRuns: 200 },
    );
  });

  /** **Validates: Requirements REQ-PAGE-45** */
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

  /** **Validates: Requirements REQ-PAGE-45** */
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
