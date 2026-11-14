import { DEFAULT_LOCALE } from "./i18n/dictionary";

export type Language = "vi" | "en";
export type TextSize = 100 | 125 | 150;

export interface Preferences {
  language: Language;
  textSize: TextSize;
  reduceMotion: boolean;
  highContrast: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type PreferenceKey = keyof Preferences;

export const PREFERENCE_STORAGE_KEYS: Readonly<Record<PreferenceKey, string>> = {
  language: "trickhunt.pref.language",
  textSize: "trickhunt.pref.textSize",
  reduceMotion: "trickhunt.pref.reduceMotion",
  highContrast: "trickhunt.pref.highContrast",
};

const DEFAULTS: Preferences = {
  language: DEFAULT_LOCALE,
  textSize: 100,
  reduceMotion: false,
  highContrast: false,
};

function readRaw(storage: StorageLike | null | undefined, key: string): string | null {
  try {
    if (!storage) return null;
    const v = storage.getItem(key);
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

function parseBool(raw: string | null, fallback: boolean): boolean {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return fallback;
}

export function loadPreferences(storage: StorageLike | null | undefined): Preferences {
  const lang = readRaw(storage, PREFERENCE_STORAGE_KEYS.language);
  const size = readRaw(storage, PREFERENCE_STORAGE_KEYS.textSize);
  return {
    language: lang === "vi" || lang === "en" ? lang : DEFAULTS.language,
    textSize:
      size === "100" ? 100 : size === "125" ? 125 : size === "150" ? 150 : DEFAULTS.textSize,
    reduceMotion: parseBool(
      readRaw(storage, PREFERENCE_STORAGE_KEYS.reduceMotion),
      DEFAULTS.reduceMotion,
    ),
    highContrast: parseBool(
      readRaw(storage, PREFERENCE_STORAGE_KEYS.highContrast),
      DEFAULTS.highContrast,
    ),
  };
}

function serialize(key: unknown, value: unknown): { k: string; v: string } | null {
  switch (key) {
    case "language":
      return value === "vi" || value === "en"
        ? { k: PREFERENCE_STORAGE_KEYS.language, v: value }
        : null;
    case "textSize":
      return value === 100 || value === 125 || value === 150
        ? { k: PREFERENCE_STORAGE_KEYS.textSize, v: String(value) }
        : null;
    case "reduceMotion":
      return typeof value === "boolean"
        ? { k: PREFERENCE_STORAGE_KEYS.reduceMotion, v: String(value) }
        : null;
    case "highContrast":
      return typeof value === "boolean"
        ? { k: PREFERENCE_STORAGE_KEYS.highContrast, v: String(value) }
        : null;
    default:
      return null;
  }
}

export function savePreference<K extends PreferenceKey>(
  storage: StorageLike | null | undefined,
  key: K,
  value: Preferences[K],
): boolean {
  try {
    if (!storage) return false;
    const entry = serialize(key, value);
    if (!entry) return false;
    storage.setItem(entry.k, entry.v);
    return true;
  } catch {
    return false;
  }
}

/** The only place that reaches for the browser's persistent key-value store. */
export function getBrowserStorage(): StorageLike | null {
  try {
    const s = (globalThis as { localStorage?: unknown }).localStorage;
    if (
      s &&
      typeof (s as StorageLike).getItem === "function" &&
      typeof (s as StorageLike).setItem === "function"
    ) {
      return s as StorageLike;
    }
    return null;
  } catch {
    return null;
  }
}
