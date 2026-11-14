# Implementation Plan: UI presentation layer

## Overview

Build `src/ui/` as described in `requirements.md` and `design.md`. No change to
`src/core`, `src/analyzers`, `src/pipeline`, `src/server`, `src/app/api` or the
API contract. The only edit outside `src/ui/` is `src/client/ingest/boundaries.test.ts`.

## Environment

- OS: Windows, shell: Windows PowerShell 5.1. Never chain with `&&`.
- Run tests with `vitest run` (single pass). Node environment, no network, no real storage.
- Relative imports only. Type-only imports from `src/pipeline` and `src/client/ingest`;
  the one runtime import from there is `ingest.config.ts`.
- Do not implement beyond the task being executed. English is the primary
  language: English and Vietnamese text come from the review table in
  `design.md` (Vietnamese is a draft); do not reword either.
- English-first amendment: no task was completed when it was applied, so tasks
  were edited in place (marked *(amended)*) and no "English-first rework" group
  is needed. If any task is already checked when you read this, do not reopen
  it: add a final group "English-first rework" (unchecked) with the same code
  and test changes instead.

## Tasks

- [x] 1. Theme tokens and contrast
  - [x] 1.1 Create `src/ui/theme/palettes.ts`, `contrast.ts`, `pairs.ts`, `levels.ts`
    - Palettes with the design values and `ColorToken`; `contrastRatio` (invalid input gives 1); `DECLARED_PAIRS`; `LEVEL_PRESENTATION`
    - _Requirements: REQ-UI-32, REQ-UI-33, REQ-UI-34, REQ-UI-36_
  - [x] 1.2 Unit tests `contrast.test.ts`, `pairs.test.ts`, `levels.test.ts`
    - Known ratios (black/white 21, equal colors 1); every pair meets its threshold in both palettes; 7:1 for text in high contrast; level labels, icons and bands differ; tokens differ per palette; same token names in both palettes
    - _Requirements: REQ-UI-32 to REQ-UI-36_
  - [x] 1.3 Property test PBT-72 in `contrast.property.test.ts`
    - **Property: declared pairs meet thresholds; contrastRatio symmetric, in 1..21, invalid gives 1**
    - **Validates: Requirements REQ-UI-33, REQ-UI-35**

- [x] 2. Dictionary
  - [x] 2.1 Create `i18n/en.ts`, `i18n/vi.ts`, `i18n/dictionary.ts`, `i18n/signal-ids.ts` *(amended)*
    - `en` (written first) as const defines `MessageKey`; `vi` (draft) typed `Record<MessageKey, string>`; every row of the design review table; `DEFAULT_LOCALE = "en"` exported from `dictionary.ts`; `t` single-pass, total, falls back to `DEFAULT_LOCALE`; `KNOWN_SIGNAL_IDS` and `explanationKeyFor`
    - _Requirements: REQ-UI-01 to REQ-UI-07, REQ-UI-44_
  - [x] 2.2 Unit tests `dictionary.test.ts`, `signal-ids.test.ts`, `default-locale.test.ts`
    - `DEFAULT_LOCALE` is `"en"`; `t(undefined, key)` equals `t("en", key)`; `default-locale.test.ts` scans non-test files under `src/ui/` for `navigator` and `navigator.language` (none allowed)
    - `t` examples (unknown locale, missing param, `{seconds}` inside a param value); ids equal analyzer configs plus `url-analyzer.ts` literals; monsters weights ids are known; sentence length at most 25 words; English `error.ingest.unsupported-type` equals "This file type is not supported. Use PNG, JPG or WebP." and the Vietnamese text names PNG, JPG and WebP; English monster names are Bank Ghost, Gift Vampire, Job Zombie, Authority Banshee, Odd Shadow
    - _Requirements: REQ-UI-01, REQ-UI-03, REQ-UI-07, REQ-UI-10_
  - [x] 2.3 Property test PBT-70 in `dictionary.property.test.ts`
    - **Property: identical key sets, no empty values, same placeholders, id coverage, only `notSafeNote` may mention safe or an toàn (negated)**
    - **Validates: Requirements REQ-UI-02 to REQ-UI-06**
  - [x] 2.4 Property test PBT-73 in `dictionary.property.test.ts` *(amended)*
    - **Property: `t` is total, inserts values verbatim, never re-expands; any non-vi locale equals the en text**
    - **Validates: Requirements REQ-UI-01, REQ-UI-44**

- [x] 3. Messages mapping
  - [x] 3.1 Create `src/ui/i18n/messages.ts`
    - Three tables typed over the ingest unions; `Object.hasOwn` lookup; `seconds` and `maxMb` params; `technicalCode` known-or-unknown
    - _Requirements: REQ-UI-08 to REQ-UI-14_
  - [x] 3.2 Unit tests `messages.test.ts`
    - Every code of each union (listed explicitly) maps to an existing key; `rate-limited` 42 and default 30, clamp and ceil; `file-too-large` has `maxMb`; unknown, `constructor`, `__proto__`, `null` give generic
    - _Requirements: REQ-UI-08 to REQ-UI-13_
  - [x] 3.3 Property test PBT-69 in `messages.property.test.ts`
    - **Property: arbitrary input always gives an existing key, safe technicalCode, valid params**
    - **Validates: Requirements REQ-UI-09, REQ-UI-12, REQ-UI-13**

- [x] 4. Monster presentation
  - [x] 4.1 Create `src/ui/monsters.ts`
    - `MONSTER_PRESENTATION` per design
    - _Requirements: REQ-UI-29, REQ-UI-30, REQ-UI-31_
  - [x] 4.2 Unit tests `monsters.test.ts`
    - Every `MONSTERS` id plus `generic` and `neutral` has an entry and nothing else; art keys unique and kebab-case; color tokens exist in both palettes; name keys exist
    - _Requirements: REQ-UI-29 to REQ-UI-31, REQ-UI-37_

- [x] 5. Highlighting
  - [x] 5.1 Create `view/folding.ts`, `view/highlights.ts`, `view/evidence.ts`
    - `foldWithMap` code point by code point with index maps (including `đ`, whitespace runs); `computeHighlights` with the caps; `evidenceNeedles`; `shortEvidence`
    - _Requirements: REQ-UI-22 to REQ-UI-27_
  - [x] 5.2 Unit tests `folding.test.ts`, `highlights.test.ts`, `evidence.test.ts`
    - Real evidence from `TextAnalyzer`, `UrlAnalyzer` (each url id) and `parseLlmResponse`; English `"Your account is LOCKED"` with `"account is locked"` (and real `TextAnalyzer` evidence from English phrases); one Vietnamese example kept: `"Tài khoản bị KHÓA"` with `"tai khoan bi khoa"`; `"ĐẶT CỌC"` with `"đặt cọc"`; evidence with `[NUMBER]` not highlighted; astral and combining characters; empty, longer-than-text and blank evidence; 4000-character text with 50 needles
    - _Requirements: REQ-UI-22 to REQ-UI-28_
  - [x] 5.3 Property tests PBT-67 and PBT-68 in `highlights.property.test.ts`
    - **Property: segments partition the text exactly (PBT-67)**
    - **Property: substring, case-changed and accent-stripped evidence is covered; no surrogate split (PBT-68)**
    - **Validates: Requirements REQ-UI-22 to REQ-UI-26**

- [x] 6. Checkpoint - Ensure all tests pass

- [x] 7. Result view
  - [x] 7.1 Create `view/semantic-note.ts`, `view/notices.ts`
    - First-match semantic table; notice order, de-duplication, tones, `ocr-too-poor` rule, verdict-derived notices
    - _Requirements: REQ-UI-20, REQ-UI-21_
  - [x] 7.2 Create `view/result-view.ts`
    - `buildResultView` per design: withheld rules, neutral or monster state, meter, highlights, grouped cards, notices, actions, limitations, announcement; whole body in try/catch returning the withheld view
    - _Requirements: REQ-UI-15 to REQ-UI-21_
  - [x] 7.3 Unit tests `semantic-note.test.ts`, `notices.test.ts`, `result-view.test.ts`
    - *(amended)* English bank phishing message (built with `createPipeline({ llmClient: null })` and by hand) gives `bank`; `no_signals` gives neutral with the three keys; QR-only hides `ocr-too-poor`, no QR and no text shows it; every row of the semantic table including `budget-exhausted` with a degraded verdict; unknown signal id gives `signal.unknown.explain`; malformed verdict and `no_signals` with signals give withheld
    - _Requirements: REQ-UI-15 to REQ-UI-21_
  - [x] 7.4 Property tests PBT-65 and PBT-66 in `result-view.property.test.ts`
    - **Property: never throws, state and groups invariants (PBT-65)**
    - **Property: percent range and monotonicity; no safe wording outside the dedicated key (PBT-66)**
    - **Validates: Requirements REQ-UI-15 to REQ-UI-17, REQ-UI-19, REQ-UI-06**

- [x] 8. Preferences and boundaries
  - [x] 8.1 Create `src/ui/preferences.ts`
    - *(amended)* Closed keys and parsers; `loadPreferences(storage)` (default language `DEFAULT_LOCALE`), `savePreference`, `getBrowserStorage`; no `chooseInitialLanguage` and no language detection; the file never mentions `sessionStorage`, `indexedDB`, `cookie`, `caches`, `navigator` or `window`
    - _Requirements: REQ-UI-38 to REQ-UI-42, REQ-UI-44_
  - [x] 8.2 Unit tests `preferences.test.ts`
    - Fake storage: defaults, valid values, invalid values per key, throwing `getItem` and `setItem`, missing storage, unknown key ignored, `getBrowserStorage()` returns `null` in Node; *(amended)* missing, throwing and junk storage always give language `"en"`, a saved `"vi"` gives `"vi"`; the `chooseInitialLanguage` examples are removed
    - _Requirements: REQ-UI-38 to REQ-UI-42_
  - [x] 8.3 Property tests PBT-71 and PBT-74 in `preferences.property.test.ts` *(amended)*
    - **Property: always a valid set, never throws, only four keys written, round trip; language is en unless a valid saved vi (PBT-71)**
    - **Property: default language is en for missing, throwing and junk storage (PBT-74)**
    - **Validates: Requirements REQ-UI-38 to REQ-UI-41, REQ-UI-44**
  - [x] 8.4 Update `src/client/ingest/boundaries.test.ts` as written in `design.md`
    - Add `src/ui` to `SCAN_DIRS`; split the storage check (everything except `src/ui/preferences.ts`; and `preferences.ts` with only `localStorage` allowed); add the `src/ui` source checks; assert `preferences.ts` and `result-view.ts` are scanned. Leave every other check as is
    - _Requirements: REQ-UI-42, REQ-UI-43, NFR-UI-01_

- [x] 9. Public exports
  - [x] 9.1 Create `src/ui/index.ts`
    - Export `t`, `MessageKey`, the three message functions, `buildResultView` and its types, `computeHighlights`, `MONSTER_PRESENTATION`, palettes, `contrastRatio`, `LEVEL_PRESENTATION`, preferences API; no component code
    - _Requirements: NFR-UI-01 to NFR-UI-04_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Run `vitest run`, `npx tsc --noEmit` and `npm run lint`; confirm `git status` shows changes only in `src/ui/` and `src/client/ingest/boundaries.test.ts`
