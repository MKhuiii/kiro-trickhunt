import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE } from "./i18n/dictionary";
import {
  PREFERENCE_STORAGE_KEYS,
  getBrowserStorage,
  loadPreferences,
  savePreference,
  type StorageLike,
} from "./preferences";

const KNOWN_KEYS = Object.values(PREFERENCE_STORAGE_KEYS);

interface FakeStorage extends StorageLike {
  data: Map<string, string>;
  reads: string[];
  writes: string[];
}

function fakeStorage(initial: Record<string, string> = {}): FakeStorage {
  const data = new Map(Object.entries(initial));
  const reads: string[] = [];
  const writes: string[] = [];
  return {
    data,
    reads,
    writes,
    getItem(key) {
      reads.push(key);
      return data.has(key) ? (data.get(key) as string) : null;
    },
    setItem(key, value) {
      writes.push(key);
      data.set(key, value);
    },
  };
}

const throwingGet: StorageLike = {
  getItem() {
    throw new Error("denied");
  },
  setItem() {},
};
const throwingSet: StorageLike = {
  getItem: () => null,
  setItem() {
    throw new Error("quota");
  },
};

describe("DEFAULT_LOCALE", () => {
  it('is "en"', () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });
});

describe("loadPreferences", () => {
  const defaults = { language: "en", textSize: 100, reduceMotion: false, highContrast: false };

  it("returns defaults for empty storage", () => {
    expect(loadPreferences(fakeStorage())).toEqual(defaults);
  });

  it("loads valid values", () => {
    const s = fakeStorage({
      [PREFERENCE_STORAGE_KEYS.language]: "vi",
      [PREFERENCE_STORAGE_KEYS.textSize]: "150",
      [PREFERENCE_STORAGE_KEYS.reduceMotion]: "true",
      [PREFERENCE_STORAGE_KEYS.highContrast]: "true",
    });
    expect(loadPreferences(s)).toEqual({
      language: "vi",
      textSize: 150,
      reduceMotion: true,
      highContrast: true,
    });
  });

  it("accepts each text size", () => {
    for (const n of [100, 125, 150]) {
      const s = fakeStorage({ [PREFERENCE_STORAGE_KEYS.textSize]: String(n) });
      expect(loadPreferences(s).textSize).toBe(n);
    }
  });

  it("falls back per key only when one value is invalid", () => {
    const valid = {
      [PREFERENCE_STORAGE_KEYS.language]: "vi",
      [PREFERENCE_STORAGE_KEYS.textSize]: "125",
      [PREFERENCE_STORAGE_KEYS.reduceMotion]: "true",
      [PREFERENCE_STORAGE_KEYS.highContrast]: "true",
    };
    const bad: Record<string, string> = {
      language: "fr",
      textSize: "130",
      reduceMotion: "yes",
      highContrast: "1",
    };
    const expectedValid = {
      language: "vi",
      textSize: 125,
      reduceMotion: true,
      highContrast: true,
    };
    for (const k of Object.keys(bad) as (keyof typeof PREFERENCE_STORAGE_KEYS)[]) {
      const s = fakeStorage({ ...valid, [PREFERENCE_STORAGE_KEYS[k]]: bad[k] });
      const result = loadPreferences(s);
      expect(result[k]).toEqual(defaults[k]);
      for (const other of Object.keys(bad) as (keyof typeof PREFERENCE_STORAGE_KEYS)[]) {
        if (other !== k) expect(result[other]).toEqual(expectedValid[other]);
      }
    }
  });

  it("returns defaults for throwing, null and undefined storage", () => {
    expect(loadPreferences(throwingGet)).toEqual(defaults);
    expect(loadPreferences(null)).toEqual(defaults);
    expect(loadPreferences(undefined)).toEqual(defaults);
  });

  it("reads only the four known keys", () => {
    const s = fakeStorage({ other: "x" });
    loadPreferences(s);
    expect(s.reads.length).toBeGreaterThan(0);
    for (const k of s.reads) expect(KNOWN_KEYS).toContain(k);
  });

  it('gives language "en" for missing, throwing and junk storage', () => {
    const junk = {
      getItem: () => 42 as unknown as string,
      setItem() {},
    };
    expect(loadPreferences(null).language).toBe("en");
    expect(loadPreferences(undefined).language).toBe("en");
    expect(loadPreferences(throwingGet).language).toBe("en");
    expect(loadPreferences(junk).language).toBe("en");
    expect(loadPreferences(fakeStorage({ [PREFERENCE_STORAGE_KEYS.language]: "EN-us" })).language).toBe("en");
  });

  it('gives "vi" for a saved "vi"', () => {
    const s = fakeStorage({ [PREFERENCE_STORAGE_KEYS.language]: "vi" });
    expect(loadPreferences(s).language).toBe("vi");
  });
});

describe("savePreference", () => {
  it("writes valid values and returns true", () => {
    const s = fakeStorage();
    expect(savePreference(s, "language", "vi")).toBe(true);
    expect(savePreference(s, "textSize", 125)).toBe(true);
    expect(savePreference(s, "reduceMotion", true)).toBe(true);
    expect(savePreference(s, "highContrast", false)).toBe(true);
    expect(Object.fromEntries(s.data)).toEqual({
      [PREFERENCE_STORAGE_KEYS.language]: "vi",
      [PREFERENCE_STORAGE_KEYS.textSize]: "125",
      [PREFERENCE_STORAGE_KEYS.reduceMotion]: "true",
      [PREFERENCE_STORAGE_KEYS.highContrast]: "false",
    });
    expect(loadPreferences(s)).toEqual({
      language: "vi",
      textSize: 125,
      reduceMotion: true,
      highContrast: false,
    });
  });

  it("ignores unknown keys and never writes them", () => {
    const s = fakeStorage();
    const result = savePreference(s, "bogus" as never, "x" as never);
    expect(result).toBe(false);
    expect(s.writes).toEqual([]);
  });

  it("does not write invalid values", () => {
    const s = fakeStorage();
    expect(savePreference(s, "language", "fr" as never)).toBe(false);
    expect(savePreference(s, "textSize", 130 as never)).toBe(false);
    expect(savePreference(s, "reduceMotion", "true" as never)).toBe(false);
    expect(savePreference(s, "highContrast", 1 as never)).toBe(false);
    expect(s.writes).toEqual([]);
  });

  it("returns false for throwing setItem and missing storage", () => {
    expect(savePreference(throwingSet, "language", "vi")).toBe(false);
    expect(savePreference(null, "language", "vi")).toBe(false);
    expect(savePreference(undefined, "language", "vi")).toBe(false);
  });

  it("writes only known storage keys", () => {
    const s = fakeStorage();
    savePreference(s, "language", "en");
    savePreference(s, "textSize", 150);
    savePreference(s, "reduceMotion", false);
    savePreference(s, "highContrast", true);
    savePreference(s, "nope" as never, true as never);
    for (const k of s.writes) expect(KNOWN_KEYS).toContain(k);
    expect(KNOWN_KEYS).toHaveLength(4);
  });
});

describe("getBrowserStorage", () => {
  it("returns null in Node", () => {
    expect(getBrowserStorage()).toBeNull();
  });
});
