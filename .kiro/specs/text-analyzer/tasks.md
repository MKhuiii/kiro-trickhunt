# Tasks — TrickHunt Text Analyzer

## Environment
- OS: Windows, shell: Windows PowerShell 5.1.
- Never chain commands with `&&`; use `;` or run them separately.
- Always make commands non-interactive: `npx --yes`, `--yes` flags.
- Run tests with `vitest run` (single-pass, no watch).

## Task 1 — Config

- [x] Create `src/analyzers/text-analyzer.config.ts` with `MAX_EVIDENCE_CHARS`,
      `MAX_INPUT_CHARS`, and `TEXT_PATTERNS` for the 8 groups, each with weight,
      `whyItMatters`, and English + Vietnamese phrases (REQ-TXT-01, REQ-TXT-02,
      REQ-TXT-05)
- [x] Unit test: every pattern has weight in `[0, 1]`, non-empty
      `whyItMatters`, and non-empty `en` and `vi` lists

## Task 2 — Normalization and matching

- [x] Implement `normalizeText` in `src/analyzers/text-analyzer.ts`
      (REQ-TXT-03)
- [x] Implement boundary-aware phrase matching (REQ-TXT-04)
- [x] Unit tests: `"XAC MINH"` and `"xác minh"` match the same phrase;
      `đ` handled; `"pin"` does not match `"spinning"`

## Task 3 — TextAnalyzer

- [x] Implement `TextAnalyzer` with one signal per matched group, evidence
      listing matched phrases, truncation, and try/catch (REQ-TXT-06,
      REQ-TXT-07, REQ-TXT-11 through REQ-TXT-15)
- [x] Unit tests: one example per group in English and Vietnamese; several
      phrases in one group give one signal; empty string gives `[]`; severity
      equals configured weight

## Task 4 — extractEntities

- [x] Implement `extractEntities` (REQ-TXT-08, REQ-TXT-09, REQ-TXT-10)
- [x] Unit tests: `https://` and `www.` URLs, trailing punctuation removed,
      VN phone `0912345678`, `+84 912 345 678`, 16-digit account number,
      phone not repeated as account number, duplicates removed

## Task 5 — Property tests

- [x] Write PBT-10 through PBT-15 in
      `src/analyzers/text-analyzer.property.test.ts`

## Task 6 — Verification

- [x] Run `vitest run` and confirm zero failures
- [x] Run `npx tsc --noEmit` and confirm no errors
- [x] Verify no `import` in `src/analyzers/` references `next`, `react`,
      `window`, `document`, or `process`, and that `text-analyzer.ts` does not
      import `url-analyzer`
