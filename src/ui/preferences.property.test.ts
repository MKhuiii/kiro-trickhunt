import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE } from "./i18n/dictionary";
import {
  PREFERENCE_STORAGE_KEYS,
  loadPreferences,
  savePreference,
  type PreferenceKey,
  type StorageLike,
} from "./preferences";

const NUM_RUNS = 200;
const KNOWN_KEYS: readonly string[] = Object.values(PREFERENCE_STORAGE_KEYS);
const PREF_KEYS: readonly PreferenceKey[] = ["language", "textSize", "reduceMotion", "highContrast"];

const VALID_ENCODINGS: Record<string, readonly string[]> = {
  [PREFERENCE_STORAGE_KEYS.language]: ["vi", "en"],
  [PREFERENCE_STORAGE_KEYS.textSize]: ["100", "125", "150"],
  [PREFERENCE_STORAGE_KEYS.reduceMotion]: ["true", "false"],
  [PREFERENCE_STORAGE_KEYS.highContrast]: ["true", "false"],
};

interface FakeStorage extends StorageLike {
  readonly written: Array<[string, string]>;
}

/** Reads return stored values as-is (junk allowed). Optionally throws on get and/or set. */
function makeStorage(
  data: ReadonlyMap<string, unknown>,
  opts: { throwGet?: boolean; throwSet?: boolean } = {},
): FakeStorage {
  const written: Array<[string, string]> = [];
  return {
    written,
    getItem(key: string): string | null {
      if (opts.throwGet) throw new Error("getItem blocked");
      return (data.has(key) ? data.get(key) : null) as string | null;
    },
    setItem(key: string, value: string): void {
      if (opts.throwSet) throw new Error("setItem blocked");
      written.push([key, value]);
      (data as Map<string, unknown>).set(key, value);
    },
  };
}

type StorageKind = "missing" | "throwing" | "junk";

const junkValue = fc.oneof(fc.anything(), fc.string(), fc.constantFrom("vi", "en", "VI", "100", "125", "150", "true", "false"));

const storedEntries = fc.record({
  language: junkValue,
  textSize: junkValue,
  reduceMotion: junkValue,
  highContrast: junkValue,
});

function isValidSet(p: unknown): boolean {
  if (typeof p !== "object" || p === null) return false;
  const o = p as Record<string, unknown>;
  return (
    (o.language === "vi" || o.language === "en") &&
    (o.textSize === 100 || o.textSize === 125 || o.textSize === 150) &&
    typeof o.reduceMotion === "boolean" &&
    typeof o.highContrast === "boolean"
  );
}

function buildStorage(kind: StorageKind, entries: Record<string, unknown>): FakeStorage | null {
  if (kind === "missing") return null;
  const map = new Map<string, unknown>();
  for (const k of PREF_KEYS) map.set(PREFERENCE_STORAGE_KEYS[k], entries[k]);
  return makeStorage(map, { throwGet: kind === "throwing" });
}

describe("PBT-71 preferences are always valid and never throw", () => {
  /** **Validates: Requirements REQ-UI-38, REQ-UI-39, REQ-UI-40, REQ-UI-44** */
  it("loadPreferences returns a valid set for junk, throwing and missing storage", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<StorageKind>("missing", "throwing", "junk"),
        storedEntries,
        (kind, entries) => {
          const storage = buildStorage(kind, entries);
          const prefs = loadPreferences(storage);
          expect(isValidSet(prefs)).toBe(true);
          const stored = kind === "junk" ? entries.language : undefined;
          if (stored === "vi") expect(prefs.language).toBe("vi");
          else expect(prefs.language).toBe("en");
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  /** **Validates: Requirements REQ-UI-38, REQ-UI-41** */
  it("savePreference never throws and writes only the four known keys with valid encodings", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.constantFrom<string>(...PREF_KEYS)),
        fc.oneof(
          fc.anything(),
          fc.constantFrom<unknown>("vi", "en", 100, 125, 150, true, false),
        ),
        fc.boolean(),
        (key, value, throwSet) => {
          const storage = makeStorage(new Map(), { throwSet });
          expect(() =>
            savePreference(storage, key as PreferenceKey, value as never),
          ).not.toThrow();
          for (const [k, v] of storage.written) {
            expect(KNOWN_KEYS).toContain(k);
            expect(VALID_ENCODINGS[k]).toContain(v);
          }
          expect(() => savePreference(null, key as PreferenceKey, value as never)).not.toThrow();
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  /** **Validates: Requirements REQ-UI-38, REQ-UI-39, REQ-UI-41** */
  it("a saved valid value is read back unchanged", () => {
    const validPair = fc.oneof(
      fc.tuple(fc.constant<PreferenceKey>("language"), fc.constantFrom<unknown>("vi", "en")),
      fc.tuple(fc.constant<PreferenceKey>("textSize"), fc.constantFrom<unknown>(100, 125, 150)),
      fc.tuple(fc.constant<PreferenceKey>("reduceMotion"), fc.boolean()),
      fc.tuple(fc.constant<PreferenceKey>("highContrast"), fc.boolean()),
    );
    fc.assert(
      fc.property(validPair, ([key, value]) => {
        const storage = makeStorage(new Map());
        expect(savePreference(storage, key, value as never)).toBe(true);
        expect(loadPreferences(storage)[key]).toBe(value);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("PBT-74 default language is English", () => {
  it("DEFAULT_LOCALE is en", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });

  /** **Validates: Requirements REQ-UI-44** */
  it("language is en unless the language key holds exactly vi", () => {
    const extraKeys = fc.dictionary(fc.string(), fc.oneof(fc.anything(), fc.string()));
    fc.assert(
      fc.property(
        fc.constantFrom<StorageKind>("missing", "throwing", "junk"),
        junkValue,
        extraKeys,
        (kind, langValue, extras) => {
          let storage: FakeStorage | null = null;
          if (kind !== "missing") {
            const map = new Map<string, unknown>();
            for (const [k, v] of Object.entries(extras)) map.set(k, v);
            map.set(PREFERENCE_STORAGE_KEYS.language, langValue);
            storage = makeStorage(map, { throwGet: kind === "throwing" });
          }
          const lang = loadPreferences(storage).language;
          const expected = kind === "junk" && langValue === "vi" ? "vi" : "en";
          expect(lang).toBe(expected);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
