/**
 * text-analyzer.property.test.ts — Property-based tests for the Text Analyzer
 *
 * **Validates: Requirements PBT-10, PBT-11, PBT-12, PBT-13, PBT-14, PBT-15**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createSignal } from "../core/signal";
import { TextAnalyzer, extractEntities } from "./text-analyzer";
import { MAX_EVIDENCE_CHARS, TEXT_PATTERNS } from "./text-analyzer.config";

const analyzer = new TextAnalyzer();

const ALL_PHRASES: string[] = TEXT_PATTERNS.flatMap((p) => [...p.phrases.en, ...p.phrases.vi]);

/** Arbitrary text: plain strings and full-unicode (binary) strings. */
const anyText = fc.oneof(fc.string(), fc.string({ unit: "binary" }));

/** ASCII letters and spaces only, so filler is identical under case/diacritic changes. */
const filler = fc.stringMatching(/^[a-zA-Z ]{0,30}$/);

/** Text built from config phrases joined with filler, separated by spaces. */
const phraseText = fc
  .array(fc.tuple(fc.constantFrom(...ALL_PHRASES), filler), { minLength: 1, maxLength: 8 })
  .map((parts) => parts.map(([phrase, fill]) => `${fill} ${phrase} `).join(" "));

const stripDiacritics = (s: string): string =>
  s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D");

const ids = (signals: ReadonlyArray<{ id: string }>): string[] => signals.map((s) => s.id);

describe("PBT-10 — analyze resolves for any string", () => {
  it("never rejects", async () => {
    await fc.assert(
      fc.asyncProperty(anyText, async (s) => {
        const result = await analyzer.analyze(s);
        return Array.isArray(result);
      }),
      { numRuns: 300 },
    );
  });
});

describe("PBT-11 — signals are valid and sourced from text", () => {
  it("every signal passes createSignal and has source 'text'", async () => {
    await fc.assert(
      fc.asyncProperty(fc.oneof(anyText, phraseText), async (s) => {
        const signals = await analyzer.analyze(s);
        for (const sig of signals) {
          if (sig.source !== "text") return false;
          createSignal({ ...sig }); // throws if invalid
        }
        return true;
      }),
      { numRuns: 300 },
    );
  });
});

describe("PBT-12 — analyze is deterministic", () => {
  it("two calls give deep-equal results", async () => {
    await fc.assert(
      fc.asyncProperty(fc.oneof(anyText, phraseText), async (s) => {
        const a = await analyzer.analyze(s);
        const b = await analyzer.analyze(s);
        expect(b).toEqual(a);
        return true;
      }),
      { numRuns: 300 },
    );
  });
});

describe("PBT-13 — signal ids invariant under case and diacritics", () => {
  it("upper-case, lower-case and diacritic-stripped text give the same ids", async () => {
    await fc.assert(
      fc.asyncProperty(phraseText, async (s) => {
        const base = ids(await analyzer.analyze(s));
        expect(base.length).toBeGreaterThan(0);
        expect(ids(await analyzer.analyze(s.toUpperCase()))).toEqual(base);
        expect(ids(await analyzer.analyze(s.toLowerCase()))).toEqual(base);
        expect(ids(await analyzer.analyze(stripDiacritics(s)))).toEqual(base);
        return true;
      }),
      { numRuns: 300 },
    );
  });
});

describe("PBT-14 — extractEntities never throws; values are substrings", () => {
  const withUrl = fc
    .tuple(fc.string(), fc.webUrl(), fc.string())
    .map(([a, u, b]) => `${a} ${u} ${b}`);

  it("returns only substrings of the input", () => {
    fc.assert(
      fc.property(fc.oneof(anyText, withUrl), (s) => {
        const e = extractEntities(s);
        for (const v of [...e.urls, ...e.phoneNumbers, ...e.accountNumbers]) {
          if (!s.includes(v)) return false;
        }
        return true;
      }),
      { numRuns: 500 },
    );
  });
});

describe("PBT-15 — evidence length bounded", () => {
  it("no evidence exceeds MAX_EVIDENCE_CHARS for long phrase-heavy text", async () => {
    const longText = fc
      .array(fc.constantFrom(...ALL_PHRASES), { minLength: 20, maxLength: 120 })
      .map((ps) => [...ALL_PHRASES, ...ps].join(" . "));
    await fc.assert(
      fc.asyncProperty(longText, async (s) => {
        const signals = await analyzer.analyze(s);
        return signals.length > 0 && signals.every((x) => x.evidence.length <= MAX_EVIDENCE_CHARS);
      }),
      { numRuns: 100 },
    );
  });
});
