# Design — TrickHunt Text Analyzer

## Files

- `src/analyzers/text-analyzer.config.ts` — `TEXT_PATTERNS`, `MAX_EVIDENCE_CHARS`, `MAX_INPUT_CHARS`
- `src/analyzers/text-analyzer.ts` — `normalizeText`, `extractEntities`, `TextAnalyzer`
- `src/analyzers/text-analyzer.test.ts`, `text-analyzer.property.test.ts`

## Key decisions

**Normalization.** `normalizeText(s)` = NFD, remove `\p{M}`, replace `đ` with `d`,
lower-case, collapse whitespace. Config phrases go through the same function
once at module load, so authors can write phrases with or without accents.

**Matching.** Pad the normalized text with a space on each side. A phrase
matches when `indexOf(" " + phrase + " ")` is found after replacing every
non-letter, non-digit character in the text with a space. This gives word
boundaries with plain substring search (REQ-TXT-04, NFR-TXT-02) and avoids
backtracking regexes.

**Evidence.** Evidence is the config form of each matched phrase, not a slice
of the original text. Offsets cannot be mapped back after stripping marks, and
config phrases are short and already length-bounded. Joined and cut at
`MAX_EVIDENCE_CHARS`.

**Signals.** One per pattern group, built in config order with
`createSignal({ id, source: "text", severity: weight, evidence, whyItMatters })`.

**Entities.** Three small regexes without nested quantifiers, run on the
original (untruncated-by-normalization) text. Phone matches are collected
first and their ranges excluded from account number matches.

**Safety.** `analyze` is `async`, slices input to `MAX_INPUT_CHARS`, and wraps
the body in `try/catch` returning `[]`. `extractEntities` applies the same
cap and also wraps in `try/catch` returning empty arrays.

## Public API

```ts
export function normalizeText(input: string): string;
export function extractEntities(text: string): {
  urls: string[]; phoneNumbers: string[]; accountNumbers: string[];
};
export class TextAnalyzer implements Analyzer<string> {
  readonly sourceType = "text" as const;
  analyze(input: string): Promise<Signal[]>;
}
```

## Notes

- Case-invariance for PBT-13 is tested on ASCII and Vietnamese text built from
  config phrases. Locale-specific case mappings (e.g. `ß` to `SS`) are outside
  the guarantee.
- Pipeline wiring (`extractEntities` to `UrlAnalyzer`) is a separate feature.
