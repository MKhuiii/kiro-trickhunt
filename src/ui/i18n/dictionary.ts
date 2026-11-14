import { en, type MessageKey } from "./en";
import { vi } from "./vi";

export type { MessageKey } from "./en";
export { en } from "./en";
export { vi } from "./vi";

/** The only place that names the default language. Nothing detects the browser language. */
export const DEFAULT_LOCALE = "en" as const;

export type Params = Readonly<Record<string, string | number>>;

const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g;

function tableFor(locale: unknown): Readonly<Record<string, string>> {
  return locale === "vi" ? vi : en;
}

/**
 * Total translation lookup. Unknown locale falls back to DEFAULT_LOCALE, an
 * unknown key gives "". Placeholders are filled in one pass, so parameter
 * values are never expanded again.
 */
export function t(locale: unknown, key: MessageKey, params?: Params): string {
  const table = tableFor(locale);
  const text = Object.hasOwn(table, key)
    ? table[key]
    : Object.hasOwn(en, key)
      ? (en as Readonly<Record<string, string>>)[key]
      : "";
  if (typeof text !== "string") return "";
  return text.replace(PLACEHOLDER, (_match, name: string) => {
    if (params && Object.hasOwn(params, name)) {
      return String(params[name]);
    }
    return "";
  });
}
