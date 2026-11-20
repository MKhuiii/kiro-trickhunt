import { describe, expect, it } from "vitest";
import { en } from "./i18n/en";
import { vi as viTable } from "./i18n/vi";

// REQ-BEST-07.1, REQ-BEST-07.2: the bestiary.* strings never call anything safe
// and never state dangerous, malicious or fake as a fact.
const TABLES = { en: en as Readonly<Record<string, string>>, vi: viTable as Readonly<Record<string, string>> };
const SAFE = {
  en: /\b(safe|safely|safety|unsafe|safer|safest)\b/i,
  vi: /an toàn/i,
};
const FACT = {
  en: /\b(dangerous|malicious|fake)\b/i,
  vi: /nguy hiểm|độc hại|giả mạo/i,
};

describe("bestiary.* wording", () => {
  for (const lang of ["en", "vi"] as const) {
    const keys = Object.keys(TABLES[lang]).filter((k) => k.startsWith("bestiary."));

    it(`${lang}: has the 15 bestiary keys`, () => {
      expect(keys).toHaveLength(15);
    });

    it(`${lang}: no string says safe / an toàn or states dangerous, malicious, fake`, () => {
      for (const key of keys) {
        const text = TABLES[lang][key];
        expect(text, `${lang} ${key}`).not.toMatch(SAFE[lang]);
        expect(text, `${lang} ${key}`).not.toMatch(FACT[lang]);
      }
    });
  }
});
