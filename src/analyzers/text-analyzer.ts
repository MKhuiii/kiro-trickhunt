/**
 * Text analyzer: normalization, matching, entity extraction and the
 * TextAnalyzer class. Pure, environment-agnostic (no next/react/DOM/process).
 */

import { createSignal } from "../core/signal";
import type { Signal } from "../core/signal";
import type { Analyzer } from "../core/analyzer";
import { MAX_EVIDENCE_CHARS, MAX_INPUT_CHARS, TEXT_PATTERNS } from "./text-analyzer.config";
import type { TextPattern } from "./text-analyzer.config";

/**
 * Normalize text for case- and diacritic-insensitive matching (REQ-TXT-03).
 * NFD decompose, strip combining marks, map đ/Đ to d, lower-case,
 * collapse whitespace and trim.
 */
export function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * Normalize and reduce to word tokens separated by single spaces:
 * every non-letter/non-digit character becomes a space (REQ-TXT-04).
 */
export function toWordForm(input: string): string {
  return normalizeText(input)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Prepare text for boundary-aware matching: word form padded with a space
 * on each side. Compute once per input and reuse for every phrase.
 */
export function toPaddedText(input: string): string {
  return ` ${toWordForm(input)} `;
}

/**
 * Prepare a phrase for matching (same normalization as the text).
 * Call once per config phrase at module load.
 */
export function normalizePhrase(phrase: string): string {
  return toWordForm(phrase);
}

/**
 * True when `phrase` occurs in `paddedText` at word boundaries.
 * `paddedText` must come from `toPaddedText`; `phrase` from `normalizePhrase`.
 * Plain substring search, no regex (REQ-TXT-04).
 */
export function matchesPhrase(paddedText: string, phrase: string): boolean {
  if (phrase.length === 0) return false;
  return paddedText.indexOf(` ${phrase} `) !== -1;
}

/**
 * Return the phrases (as given in `phrases`) that match in `paddedText`.
 * Each entry pairs the original phrase with its pre-normalized form.
 */
export function findMatchedPhrases(
  paddedText: string,
  phrases: ReadonlyArray<{ readonly original: string; readonly normalized: string }>,
): string[] {
  const matched: string[] = [];
  for (const p of phrases) {
    if (matchesPhrase(paddedText, p.normalized)) matched.push(p.original);
  }
  return matched;
}

// ---------------------------------------------------------------------------
// Entity extraction (REQ-TXT-08, REQ-TXT-09, REQ-TXT-10)
// ---------------------------------------------------------------------------

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const URL_PREFIX_RE = /^(?:https?:\/\/|www\.)/i;
/** Digit groups joined by single space/dot/dash. Separator is mandatory, so matching is linear. */
const PHONE_CANDIDATE_RE = /\+?\d+(?:[ .-]\d+)*/g;
const DIGIT_RUN_RE = /\d+/g;
const URL_TRAILING = ".,;:!?)";

export interface ExtractedEntities {
  urls: string[];
  phoneNumbers: string[];
  accountNumbers: string[];
}

function insideAny(ranges: ReadonlyArray<readonly [number, number]>, index: number): boolean {
  for (const [start, end] of ranges) {
    if (index >= start && index < end) return true;
  }
  return false;
}

function countDigits(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c >= 48 && c <= 57) n++;
  }
  return n;
}

/**
 * Extract URLs, phone numbers and account numbers. Pure, never throws.
 * Values are exact substrings of the (capped) input, de-duplicated in order
 * of first appearance. Digits inside URLs are not reported as phones/accounts.
 */
export function extractEntities(text: string): ExtractedEntities {
  try {
    const input = text.slice(0, MAX_INPUT_CHARS);
    const urls = new Set<string>();
    const phones = new Set<string>();
    const accounts = new Set<string>();
    const urlRanges: Array<readonly [number, number]> = [];

    for (const m of input.matchAll(URL_RE)) {
      let url = m[0];
      while (url.length > 0 && URL_TRAILING.includes(url[url.length - 1])) {
        url = url.slice(0, -1);
      }
      const prefix = URL_PREFIX_RE.exec(url);
      if (!prefix || url.length === prefix[0].length) continue;
      urls.add(url);
      urlRanges.push([m.index, m.index + m[0].length]);
    }

    for (const m of input.matchAll(PHONE_CANDIDATE_RE)) {
      const start = m.index;
      if (insideAny(urlRanges, start)) continue;
      const candidate = m[0];
      const digits = countDigits(candidate);
      const first = candidate[0];
      if ((first === "+" || first === "0") && digits >= 9 && digits <= 15) {
        phones.add(candidate);
        continue;
      }
      // Not a phone as a whole (e.g. two adjacent numbers merged by a separator):
      // classify each contiguous digit run on its own.
      for (const r of candidate.matchAll(DIGIT_RUN_RE)) {
        const run = r[0];
        const len = run.length;
        if (run[0] === "0" && len >= 9 && len <= 15) {
          phones.add(run);
        } else if (len >= 8 && len <= 19) {
          accounts.add(run);
        }
      }
    }

    return {
      urls: [...urls],
      phoneNumbers: [...phones],
      accountNumbers: [...accounts],
    };
  } catch {
    return { urls: [], phoneNumbers: [], accountNumbers: [] };
  }
}

// ---------------------------------------------------------------------------
// TextAnalyzer
// ---------------------------------------------------------------------------

interface CompiledPattern {
  readonly pattern: TextPattern;
  readonly phrases: ReadonlyArray<{ readonly original: string; readonly normalized: string }>;
}

/** Built once at module load: config phrases (en + vi) with normalized forms. */
const COMPILED_PATTERNS: readonly CompiledPattern[] = TEXT_PATTERNS.map((pattern) => ({
  pattern,
  phrases: [...pattern.phrases.en, ...pattern.phrases.vi].map((original) => ({
    original,
    normalized: normalizePhrase(original),
  })),
}));

/**
 * Rule-based scam-language analyzer. One signal per matched pattern group,
 * in config order. Never rejects (REQ-TXT-12).
 */
export class TextAnalyzer implements Analyzer<string> {
  readonly sourceType = "text" as const;

  async analyze(input: string): Promise<Signal[]> {
    try {
      const padded = toPaddedText(input.slice(0, MAX_INPUT_CHARS));
      const signals: Signal[] = [];

      for (const { pattern, phrases } of COMPILED_PATTERNS) {
        const matched = Array.from(new Set(findMatchedPhrases(padded, phrases)));
        if (matched.length === 0) continue;

        signals.push(
          createSignal({
            id: pattern.id,
            source: "text",
            severity: pattern.weight,
            evidence: matched.join(", ").slice(0, MAX_EVIDENCE_CHARS),
            whyItMatters: pattern.whyItMatters,
          }),
        );
      }

      return signals;
    } catch {
      return [];
    }
  }
}
