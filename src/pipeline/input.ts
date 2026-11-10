/**
 * input.ts — Input preparation for the analysis pipeline.
 *
 * Pure and total: `prepareInput` never throws for any value (REQ-PIPE-08..13).
 * Limits come from pipeline.config.ts.
 */

import { extractEntities } from "../analyzers/text-analyzer";
import { normalizeUrl } from "../analyzers/url-analyzer";

import { MAX_TEXT_CHARS, MAX_URLS, MAX_URL_CHARS } from "./pipeline.config";

export interface PreparedInput {
  /** Text coerced to a string and cut to MAX_TEXT_CHARS. */
  readonly text: string;
  /** True only when characters were cut from the text. */
  readonly inputTruncated: boolean;
  /** Original URL strings to analyze (at most MAX_URLS). */
  readonly urls: readonly string[];
  /** Unique URL candidates not analyzed (over the count or length cap). */
  readonly urlsSkipped: number;
  /** True when the text is blank and there are no URL candidates. */
  readonly empty: boolean;
}

const EMPTY_PREPARED: PreparedInput = Object.freeze({
  text: "",
  inputTruncated: false,
  urls: Object.freeze([]) as readonly string[],
  urlsSkipped: 0,
  empty: true,
});

function readProp(source: unknown, key: string): unknown {
  try {
    if (source === null || typeof source !== "object") return undefined;
    return (source as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

function dedupeKey(url: string): string {
  try {
    return normalizeUrl(url) ?? url;
  } catch {
    return url;
  }
}

function collectProvidedUrls(value: unknown): string[] {
  const out: string[] = [];
  try {
    if (!Array.isArray(value)) return out;
    for (let i = 0; i < value.length; i++) {
      const item: unknown = value[i];
      if (typeof item === "string" && item.trim().length > 0) out.push(item);
    }
  } catch {
    // keep whatever was collected
  }
  return out;
}

function collectExtractedUrls(text: string): string[] {
  try {
    return extractEntities(text).urls.filter(
      (u): u is string => typeof u === "string" && u.trim().length > 0,
    );
  } catch {
    return [];
  }
}

/**
 * Coerce, truncate and collect URLs from raw pipeline input.
 * Accepts `unknown`; never throws.
 */
export function prepareInput(input: unknown): PreparedInput {
  try {
    const rawText = readProp(input, "text");
    const fullText = typeof rawText === "string" ? rawText : "";
    const inputTruncated = fullText.length > MAX_TEXT_CHARS;
    const text = inputTruncated ? fullText.slice(0, MAX_TEXT_CHARS) : fullText;

    const candidates = [
      ...collectProvidedUrls(readProp(input, "urls")),
      ...collectExtractedUrls(text),
    ];

    const seen = new Set<string>();
    const urls: string[] = [];
    let urlsSkipped = 0;
    for (const candidate of candidates) {
      const key = dedupeKey(candidate);
      if (seen.has(key)) continue;
      seen.add(key);
      if (urls.length < MAX_URLS && candidate.length <= MAX_URL_CHARS) {
        urls.push(candidate);
      } else {
        urlsSkipped += 1;
      }
    }

    return Object.freeze({
      text,
      inputTruncated,
      urls: Object.freeze(urls),
      urlsSkipped,
      empty: text.trim().length === 0 && seen.size === 0,
    });
  } catch {
    return EMPTY_PREPARED;
  }
}
