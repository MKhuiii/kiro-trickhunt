import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { MONSTERS } from "../../pipeline/monsters.config";
import { en, t, vi, type MessageKey } from "./dictionary";
import { KNOWN_SIGNAL_IDS } from "./signal-ids";

const enTable: Readonly<Record<string, string>> = en;
const viTable: Readonly<Record<string, string>> = vi;
const ALL_KEYS = Object.keys(enTable);

const MONSTER_IDS = [...MONSTERS.map((m) => m.id), "generic"].filter(
  (id, i, arr) => arr.indexOf(id) === i,
);
const LEVELS = ["no_signals", "suspicious", "high", "critical"] as const;
const SAFE_KEY = "result.noSignals.notSafeNote";

const REQUIRED_KEYS: string[] = [
  ...KNOWN_SIGNAL_IDS.map((id) => `signal.${id}.explain`),
  "signal.unknown.explain",
  ...MONSTER_IDS.flatMap((id) => [
    `monster.${id}.name`,
    `monster.${id}.short`,
    `monster.${id}.tip1`,
    `monster.${id}.tip2`,
    `monster.${id}.tip3`,
  ]),
  "monster.neutral.name",
  "monster.neutral.short",
  ...LEVELS.map((l) => `level.${l}`),
];

function placeholders(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/\{([A-Za-z0-9_]+)\}/g)) found.add(m[1]);
  return [...found].sort();
}

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/Ä‘/g, "d")
    .replace(/Ä/g, "d")
    .toLowerCase();
}

const MENTIONS_SAFE = /safe|an toan/;

describe("dictionary property tests (PBT-70)", () => {
  /**
   * **Validates: Requirements REQ-UI-02, REQ-UI-03**
   */
  it("has identical key sets in both languages", () => {
    expect(Object.keys(viTable).sort()).toEqual([...ALL_KEYS].sort());
  });

  /**
   * **Validates: Requirements REQ-UI-02, REQ-UI-03**
   */
  it("every key has a non-empty value and the same placeholders in both languages", () => {
    fc.assert(
      fc.property(fc.constantFrom(...ALL_KEYS), (key) => {
        const e = enTable[key];
        const v = viTable[key];
        expect(typeof e).toBe("string");
        expect(typeof v).toBe("string");
        expect(e.trim().length).toBeGreaterThan(0);
        expect(v.trim().length).toBeGreaterThan(0);
        expect(placeholders(v)).toEqual(placeholders(e));
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements REQ-UI-04, REQ-UI-05**
   */
  it("every signal, monster, neutral and level key exists in both languages", () => {
    fc.assert(
      fc.property(fc.constantFrom(...REQUIRED_KEYS), (key) => {
        expect(Object.hasOwn(enTable, key)).toBe(true);
        expect(Object.hasOwn(viTable, key)).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements REQ-UI-06**
   */
  it("only notSafeNote mentions safe or an toÃ n, and only after a negation", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_KEYS),
        fc.constantFrom("en", "vi"),
        (key, lang) => {
          const text = fold((lang === "en" ? enTable : viTable)[key]);
          const match = MENTIONS_SAFE.exec(text);
          if (key !== SAFE_KEY) {
            expect(match).toBeNull();
            return;
          }
          if (!match) return;
          const before = text.slice(0, match.index);
          const negation = lang === "vi" ? /khong/ : /\b(not|never|cannot)\b/;
          expect(negation.test(before)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("notSafeNote does mention safe in each language (negated)", () => {
    expect(MENTIONS_SAFE.test(fold(enTable[SAFE_KEY]))).toBe(true);
    expect(MENTIONS_SAFE.test(fold(viTable[SAFE_KEY]))).toBe(true);
  });
});

describe("t property tests (PBT-73)", () => {
  const KEYS_WITH_PARAMS = ALL_KEYS.filter((k) => placeholders(enTable[k]).length > 0);
  const paramValue = fc.oneof(
    fc.string(),
    fc.integer(),
    fc.constantFrom("{seconds}", "{count}", "{name}", "{", "}{x}"),
  );
  const anyKey = fc.constantFrom(...ALL_KEYS) as fc.Arbitrary<MessageKey>;

  it("has keys with placeholders to exercise", () => {
    expect(KEYS_WITH_PARAMS.length).toBeGreaterThan(0);
  });

  /**
   * **Validates: Requirements REQ-UI-01, REQ-UI-44**
   */
  it("never throws for any locale, key and params", () => {
    fc.assert(
      fc.property(
        fc.anything(),
        anyKey,
        fc.dictionary(fc.string(), paramValue),
        (locale, key, params) => {
          expect(typeof t(locale, key, params)).toBe("string");
          expect(typeof t(locale, key)).toBe("string");
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements REQ-UI-01**
   */
  it("inserts each value verbatim, leaves no filled placeholder, never re-expands values", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("en", "vi"),
        fc.constantFrom(...KEYS_WITH_PARAMS) as fc.Arbitrary<MessageKey>,
        fc.dictionary(fc.string(), paramValue),
        fc.array(paramValue, { minLength: 8, maxLength: 8 }),
        (locale, key, extra, values) => {
          const table = locale === "vi" ? viTable : enTable;
          const names = placeholders(table[key]);
          const params: Record<string, string | number> = { ...extra };
          names.forEach((n, i) => {
            params[n] = values[i % values.length];
          });
          const out = t(locale, key, params);
          for (const n of names) {
            expect(out).toContain(String(params[n]));
          }
          // Independent single-pass expectation: values are never expanded again.
          const expected = table[key].replace(
            /\{([A-Za-z0-9_]+)\}/g,
            (_m, n: string) => String(params[n]),
          );
          expect(out).toBe(expected);
          // With brace-free values, no filled placeholder remains.
          const clean: Record<string, string | number> = {};
          for (const n of names) clean[n] = "x";
          const cleanOut = t(locale, key, clean);
          for (const n of names) expect(cleanOut).not.toContain(`{${n}}`);
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements REQ-UI-44**
   */
  it("any non-vi locale gives the en text", () => {
    fc.assert(
      fc.property(
        fc.anything().filter((l) => l !== "vi"),
        anyKey,
        fc.dictionary(fc.string(), paramValue),
        (locale, key, params) => {
          expect(t(locale, key, params)).toBe(t("en", key, params));
          expect(t(locale, key)).toBe(t("en", key));
        },
      ),
      { numRuns: 200 },
    );
  });
});

