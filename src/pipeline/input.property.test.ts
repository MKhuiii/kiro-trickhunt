/**
 * input.property.test.ts — Property-based tests for prepareInput
 *
 * **Validates: Requirements PBT-33**
 *
 * PBT-33: urls.length <= MAX_URLS, and every analyzed URL occurs in the input
 *         (in input.urls or as a substring of the truncated text).
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";

import { prepareInput } from "./input";
import { MAX_TEXT_CHARS, MAX_URLS } from "./pipeline.config";

const filler = fc.constantFrom("hello", " ", "\n", "click here:", "your account", "!!", "verify");

/** Text with URLs embedded between filler words. */
const textWithUrls = (maxUrls: number) =>
  fc
    .tuple(
      fc.array(filler, { maxLength: 5 }),
      fc.array(fc.webUrl(), { maxLength: maxUrls }),
    )
    .map(([words, urls]) => [...words, ...urls.flatMap((u) => [" ", u, " "])].join(" "));

function check(input: { text: string; urls: string[] }): boolean {
  const prepared = prepareInput(input);
  if (prepared.urls.length > MAX_URLS) return false;
  return prepared.urls.every(
    (u) => input.urls.includes(u) || prepared.text.includes(u),
  );
}

describe("PBT-33 — prepareInput URL cap and provenance", () => {
  it("provided URLs: capped and all from input.urls", () => {
    fc.assert(
      fc.property(fc.array(fc.webUrl(), { maxLength: MAX_URLS * 3 }), (urls) =>
        check({ text: "", urls }),
      ),
      { numRuns: 200 },
    );
  });

  it("text with embedded URLs plus provided URLs", () => {
    fc.assert(
      fc.property(
        textWithUrls(MAX_URLS * 2),
        fc.array(fc.webUrl(), { maxLength: MAX_URLS * 2 }),
        (text, urls) => check({ text, urls }),
      ),
      { numRuns: 200 },
    );
  });

  it("over-long text: URLs beyond truncation are not analyzed", () => {
    fc.assert(
      fc.property(
        textWithUrls(MAX_URLS + 5),
        fc.integer({ min: 0, max: 1000 }),
        (text, extra) => {
          const padded = text + " ".repeat(MAX_TEXT_CHARS + extra) + " http://late.example.com/x";
          return check({ text: padded, urls: [] });
        },
      ),
      { numRuns: 100 },
    );
  });
});
