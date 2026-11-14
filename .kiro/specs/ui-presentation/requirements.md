# Requirements Document

## Introduction

The framework-free presentation layer of the TrickHunt UI, in `src/ui/`. It turns
analysis results, errors and notices into everything an English-first (Vietnamese secondary),
accessible UI needs to display: a vi/en dictionary, message mapping, a result
view model, text highlighting, a monster presentation table, theme tokens with
contrast checks, and a preferences module. There are no React components, pages,
SVG artwork, styling or animations in this spec; they come in the next specs.

Numbering continues the existing specs: new `REQ-UI-` series, `PBT-65` onward
(the last existing number is `PBT-64`).

## Amendment: English-first

English is now the primary UI language and Vietnamese the secondary one. `en`
is the source language of the dictionary, written first and with the most care;
`vi` keeps the same keys but is a draft pending human review and is not expected
to be polished here. The default language is `"en"`, there is no auto-detection,
and only a saved preference can change it. The existing numbering is kept.

Requirements and tests changed by this amendment:

| Item | Change |
|---|---|
| REQ-UI-01 | Modified: unknown locale falls back to `DEFAULT_LOCALE` |
| REQ-UI-03 | Modified: `en` explanations are plain-English rewrites, `vi` are drafts |
| REQ-UI-05, REQ-UI-06 | Modified: the not-safe note is written in English first; negation rule unchanged |
| REQ-UI-07 | Modified: English is the reference, Vietnamese is flagged draft |
| REQ-UI-10 | Modified: English reference text for `unsupported-type` |
| REQ-UI-28 | Modified: English examples, one Vietnamese example kept |
| REQ-UI-31 | Modified: English names are primary |
| REQ-UI-38, REQ-UI-39 | Modified: default language `"en"`; `loadPreferences(storage)` has no fallback parameter |
| REQ-UI-41 | Replaced: `chooseInitialLanguage` removed; no language detection |
| REQ-UI-43 | Modified: also checks that no file reads `navigator.language` |
| REQ-UI-44 | New: `DEFAULT_LOCALE` is `"en"` |
| PBT-71 | Modified: language is `"en"` unless a valid saved `"vi"` |
| PBT-73 | Modified: `chooseInitialLanguage` part removed |
| PBT-74 | New: default language is `"en"` |
| Example tests | Modified: English inputs and outputs; Vietnamese highlight example kept; `chooseInitialLanguage` examples removed; default-locale and no-`navigator.language` examples added |
| All others | Unchanged (PBT-65 to PBT-70, PBT-72) |

**Hard constraints:**

- `src/core/`, `src/analyzers/`, `src/pipeline/`, `src/server/`, `src/app/api/`
  and the `POST /api/analyze` contract are NOT changed.
- Relative imports only. Client source (`src/ui/`, non-test) may use only
  `import type` from `src/pipeline/` and from `src/client/ingest/`, with one
  exception: runtime constants may be imported from
  `src/client/ingest/ingest.config.ts` (import-free). It never imports
  `src/server/`. Test files may import real configs and analyzers.
- No DOM, no network, no third-party request, no new dependency.
- The only file that touches `localStorage` is `src/ui/preferences.ts`.
- No result is ever presented as "safe" or "an toàn" (ui-rules). The single
  allowed place is one dictionary key, and only in a negated form.
- Tests run in the `node` environment and use fakes (fake storage, fake
  verdicts). Real analyzers are used only to produce real evidence samples.

## Glossary

- **Dictionary**: The `en` (primary, source) and `vi` (secondary, draft) string tables in `src/ui/i18n/`, typed by one shared `MessageKey` union.
- **DEFAULT_LOCALE**: The constant `"en"`, the language used when nothing valid is saved.
- **Message_Ref**: `{ key, params, technicalCode }` returned by the message mapping; `key` is always a dictionary key.
- **Result_View**: The view model returned by `buildResultView`. Components only render it.
- **Neutral_State**: The state for level `no_signals`: no monster, a "no warning signs found" summary and a reminder.
- **Withheld_View**: A Result_View of kind `withheld`, returned when a verdict cannot be shown with evidence.
- **Needle**: A string searched in the text to highlight one piece of evidence.
- **Folded_Text**: Text normalized code point by code point (NFD, marks removed, `đ` to `d`, lower case, whitespace runs to one space) with an index map back to the original.
- **Palette**: A constant object of color tokens (`#RRGGBB`). Two exist: normal and high-contrast.
- **Pair**: A declared foreground/background token pair with a use (`text`, `large-text` or `ui`).
- **Preferences**: `{ language, textSize, reduceMotion, highContrast }`.

## Requirements

### Requirement 1: Dictionary

**User Story:** As a reader, I want every message in short, plain English (or Vietnamese if I choose it), so that I understand why something looks like a scam and what to do next.

```ts
type Locale = "vi" | "en";                       // import type from pipeline
type MessageKey = keyof typeof en;                // vi is typed Record<MessageKey, string>
function t(locale: unknown, key: MessageKey, params?: Record<string, string | number>): string;
```

#### Acceptance Criteria

1. **REQ-UI-01** THE `t` function SHALL return the string of `key` for `"vi"` or `"en"`, treat any other locale as `DEFAULT_LOCALE` (`"en"`), replace each `{name}` with `String(params.name)` in a single pass (values are never expanded again), replace a placeholder without a param by an empty string, and SHALL NOT throw for any input.
2. **REQ-UI-02** THE `vi` and `en` dictionaries SHALL have identical key sets, no empty or whitespace-only value, and the same set of placeholders for every key.
3. **REQ-UI-03** THE Dictionary SHALL contain the key `signal.<id>.explain` in both languages for every signal id produced by the analyzers (all `text.*` ids in `TEXT_PATTERNS`, all `semantic.*` ids in `SEMANTIC_SIGNALS`, and every `url.*` id in `url-analyzer.ts`), plus `signal.unknown.explain`. The `en` text is a plain-English rewrite that keeps the meaning of the analyzer's `whyItMatters` and points to a next step; the `vi` text is a draft translation. The server's `whyItMatters` is never displayed.
4. **REQ-UI-04** THE Dictionary SHALL contain, for every monster id in the pipeline `MONSTERS` config plus `generic`, the keys `monster.<id>.name`, `.short`, `.tip1`, `.tip2` and `.tip3`, and for the neutral state `monster.neutral.name` and `.short`.
5. **REQ-UI-05** THE Dictionary SHALL contain a label key `level.<level>` for each of the four risk levels, and the keys `result.noSignals.summary`, `result.noSignals.notSafeNote` and `result.noSignals.reminder`. The `notSafeNote` text SHALL state that no warning signs does not mean the message is genuine.
6. **REQ-UI-06** NO dictionary value in either language SHALL contain `safe` or `an toàn` (case-insensitive and diacritic-insensitive), except the key `result.noSignals.notSafeNote`, whose text SHALL contain it only after a negation (`không` in vi; `not`, `never` or `cannot` in en).
7. **REQ-UI-07** EVERY dictionary sentence SHALL have at most 25 words (split on `.`, `!`, `?` and whitespace), English is the reference text (short sentences, no jargon, calm tone, a next step wherever there is a warning), and every Vietnamese string SHALL be listed in `design.md` flagged "draft, pending human review" until a person approves it.

### Requirement 2: Messages mapping

**User Story:** As a user, I want a clear sentence for every problem, so that I never see a raw error code.

```ts
type MessageRef = { key: MessageKey; params: Record<string, string | number>; technicalCode: string };
function analyzeErrorMessage(code: unknown, retryAfterSec?: unknown): MessageRef;
function ingestErrorMessage(code: unknown): MessageRef;
function noticeMessage(kind: unknown, params?: { count?: number }): MessageRef;
```

#### Acceptance Criteria

1. **REQ-UI-08** THE `analyzeErrorMessage` function SHALL map each `AnalyzeClientCode` (`invalid-input`, `payload-too-large`, `invalid-content-type`, `rate-limited`, `internal-error`, `network-error`, `timeout`, `bad-response`, `unexpected-status`) to the key `error.analyze.<code>`.
2. **REQ-UI-09** FOR `rate-limited`, THE `analyzeErrorMessage` function SHALL return `params.seconds` as an integer from 1 to `MAX_RETRY_AFTER_SEC`, using `retryAfterSec` rounded up and clamped, or `DEFAULT_RETRY_AFTER_SEC` when it is absent or not a finite number. Other codes SHALL return empty params.
3. **REQ-UI-10** THE `ingestErrorMessage` function SHALL map each `IngestErrorCode` (`unsupported-type`, `invalid-size`, `file-too-large`, `decode-failed`, `too-many-pixels`, `canvas-unavailable`, `ocr-engine-unavailable`, `ocr-timeout`, `ocr-aborted`, `ocr-failed`, `qr-engine-unavailable`, `qr-decode-failed`, `unexpected`) to `error.ingest.<code>`; `file-too-large` SHALL carry `params.maxMb` computed from `MAX_IMAGE_BYTES`; the English `unsupported-type` text is the reference, "This file type is not supported. Use PNG, JPG or WebP.", and the Vietnamese text SHALL also name PNG, JPG and WebP.
4. **REQ-UI-11** THE `noticeMessage` function SHALL map each ingest notice kind (`ocr-skipped`, `ocr-too-poor`, `ocr-failed`), each build notice kind (`payment-qr`, `wifi-qr`, `no-url`, `text-truncated`) and the verdict-derived kind `urls-skipped` (with `params.count`) to `notice.<kind>`.
5. **REQ-UI-12** FOR any other input (unknown strings, non-strings, `null`, objects, and names such as `constructor`, `__proto__` and `toString`), THE three functions SHALL return the generic key (`error.generic` or `notice.generic`), and SHALL NOT throw.
6. **REQ-UI-13** `technicalCode` SHALL be the input code only when it is one of the known codes, and `"unknown"` otherwise, so that arbitrary input is never echoed. It is meant only for a collapsed "technical details" section.
7. **REQ-UI-14** EACH lookup table SHALL be typed `Record<Code, MessageKey>` over the union types exported by `src/client/ingest`, so that adding a member to a union fails the TypeScript build until the table is updated.

### Requirement 3: Result view model

**User Story:** As a family helper, I want one ready-made description of a result, so that the screen shows the verdict, the evidence and the next step consistently.

```ts
interface ResultExtras {
  semanticMode?: "used" | "budget-exhausted" | "not-configured" | "skipped";
  ingestNotices?: readonly { kind: string }[];
  buildNotices?: readonly { kind: string }[];
  qrResults?: readonly { kind: string }[];   // only the count is used
  userText?: string;                          // text the user typed or pasted
}
function buildResultView(verdict: Verdict, inputText: string, locale: unknown, extras?: ResultExtras): ResultView;
```

`inputText` is the text that was sent to the API (`BuildAnalyzeResult.request.text`), so highlight offsets match what the server analyzed.

#### Acceptance Criteria

1. **REQ-UI-15** THE `buildResultView` function SHALL NOT throw for any input. It SHALL return a Withheld_View (`kind: "withheld"`, key `result.withheld`, plus notices) when the verdict is malformed, or when level is `no_signals` while signals exist, or when level is not `no_signals` while no signal card can be built (a verdict is never shown without evidence).
2. **REQ-UI-16** FOR level `no_signals`, THE view SHALL be the Neutral_State: `monster.id` is `neutral`, `state` is `"neutral"`, and the summary, not-safe-note and reminder keys are present. For any other level, `state` SHALL be `"monster"` with `verdict.monster`, or `generic` when it is `null` or unknown. A bank phishing verdict maps to `bank`.
3. **REQ-UI-17** THE `riskMeter` SHALL be `{ percent, labelKey, iconKey, darknessBand }` where `percent` is `riskScore` rounded and clamped to 0..100 (non-finite gives 0) and never decreases when `riskScore` increases, `labelKey` is `level.<level>`, `iconKey` and `darknessBand` (0..3) come from the level table, and each of the four levels has a different label key, icon key and band, so that level is never conveyed by color alone.
4. **REQ-UI-18** THE `highlights` SHALL be `computeHighlights(inputText, needles)` where needles are produced by `evidenceNeedles` for every signal.
5. **REQ-UI-19** THE `signalGroups` SHALL group signals by `source` in the fixed order `text`, `url`, `semantic`, `image`, `qr`, then any other value as `other`; empty groups are omitted; the order inside a group is the verdict order. Each card SHALL have `signalId`, `explanationKey` (`signal.<id>.explain`, or `signal.unknown.explain` for an id outside the known set), `evidence` (whitespace collapsed, trimmed, at most 80 code points with `…` when cut) and `severityBand` (`low` below 0.4, `medium` below 0.7, otherwise `high`; non-finite gives `low`).
6. **REQ-UI-20** THE `semanticNoteKey` SHALL be chosen by the first matching rule: mode `budget-exhausted` gives `semantic.budget-exhausted`; mode `not-configured` gives `semantic.not-configured`; `verdict.semantic.status` `degraded` gives `semantic.degraded`; status `unavailable` with no mode gives `semantic.not-configured`; mode `skipped` or `verdict.semantic.skipped` gives `semantic.skipped`; mode `used`, or status `ok` with no mode, gives `semantic.used`; anything else gives `semantic.skipped`.
7. **REQ-UI-21** THE `notices` SHALL be the ingest notices, then the build notices, then notices derived from the verdict (`text-truncated` when `inputTruncated`, `urls-skipped` when `urlsSkipped > 0`), de-duplicated by kind, with unknown kinds mapped to `notice.generic`, and SHALL omit `ocr-too-poor` when `extras.qrResults` is non-empty or `extras.userText` has non-blank text. THE view SHALL copy `actions` and `limitations` from the verdict (only non-empty strings), contain only dictionary keys for its labels, and its `announcement` SHALL be `t(locale, "a11y.result-ready", { level })`.

### Requirement 4: Highlighting

**User Story:** As a young professional, I want the suspicious parts of the message marked, so that I can learn to spot them myself.

```ts
interface HighlightSegment { readonly start: number; readonly end: number; readonly text: string; readonly highlighted: boolean }
function computeHighlights(text: string, evidences: readonly string[]): HighlightSegment[];
function evidenceNeedles(signal: { id: string; evidence: string }): string[];
```

#### Acceptance Criteria

1. **REQ-UI-22** THE `computeHighlights` function SHALL NOT throw for any input (a non-string `text` gives `[]`; non-string or blank evidence is ignored) and SHALL return segments that are ordered, gap-free, overlap-free and non-empty, cover `[0, text.length)`, and whose `text` values concatenate to exactly the input (an empty text gives `[]`).
2. **REQ-UI-23** FOR each evidence (trimmed), THE function SHALL first search all exact occurrences in `text`; only when there is none, it SHALL search all occurrences in the Folded_Text of `text` using the folded evidence.
3. **REQ-UI-24** THE Folded_Text SHALL be built one code point at a time (NFD, marks removed, `đ` and `Đ` to `d`, lower case, marks removed again, whitespace runs collapsed to one space), keeping for every folded UTF-16 index the start and end of its source code point, so every folded match maps back to an original range that never splits a surrogate pair.
4. **REQ-UI-25** THE function SHALL clip ranges to the text bounds and merge overlapping or touching ranges into single highlighted segments.
5. **REQ-UI-26** EVIDENCE that cannot be located, is empty, or is longer than the text SHALL be ignored without error. THE function SHALL consider at most 50 evidences of at most 200 characters each and at most 200 ranges, and SHALL finish in bounded time for a 4000-character text.
6. **REQ-UI-27** THE `evidenceNeedles` function SHALL return the whole evidence first, then, according to the real analyzer formats: for `text.*` the parts split on `", "`; for `url.credential-keywords` the path after `" in path "`; for `url.brand-lookalike` the part before `" looks like "`; for `url.excessive-subdomains` the evidence without the trailing `" (N parts)"`. Needles are de-duplicated and non-blank.
7. **REQ-UI-28** TESTS SHALL use evidence produced by the real `TextAnalyzer`, `UrlAnalyzer` and `parseLlmResponse`. The main examples are English: text `"Your account is LOCKED"` with evidence `"account is locked"` highlights `"account is LOCKED"`. One Vietnamese example is kept to prove diacritic-insensitive matching: text `"Tài khoản bị KHÓA"` with evidence `"tai khoan bi khoa"` highlights the whole text, and `"ĐẶT CỌC"` is located by `"đặt cọc"`.

### Requirement 5: Monster presentation table

**User Story:** As an older reader, I want each kind of scam to have a memorable name and look, so that I can recognize it next time.

```ts
type MonsterKey = MonsterId | "neutral";
const MONSTER_PRESENTATION: Readonly<Record<MonsterKey, { id: MonsterKey; nameKey: MessageKey; colorToken: ColorToken; artKey: string }>>;
```

#### Acceptance Criteria

1. **REQ-UI-29** THE table SHALL have exactly one entry for every `MonsterId` (`bank`, `prize`, `job-bait`, `authority`, `generic`) plus `neutral`. A test SHALL check that every `id` in the pipeline `MONSTERS` config and `generic` has an entry, and that there are no other entries.
2. **REQ-UI-30** EACH entry SHALL have a `colorToken` that exists in both palettes and a unique kebab-case `artKey` (`monster-bank-ghost`, `monster-prize-vampire`, `monster-job-zombie`, `monster-authority-banshee`, `monster-generic-shade`, `monster-neutral-candle`). The SVG components are built in the next spec.
3. **REQ-UI-31** EACH `nameKey` SHALL point to a dictionary key `monster.<id>.name`. The English names are primary: Bank Ghost (`bank`), Gift Vampire (`prize`), Job Zombie (`job-bait`), Authority Banshee (`authority`) and Odd Shadow (`generic`). The Vietnamese names are draft translations pending review, and tests SHALL NOT pin Vietnamese wording.

### Requirement 6: Theme tokens and contrast

**User Story:** As a user with weak eyesight, I want readable colors and a high-contrast option, so that I can read the result.

```ts
function contrastRatio(foreground: string, background: string): number;
```

#### Acceptance Criteria

1. **REQ-UI-32** THE module `src/ui/theme/palettes.ts` SHALL export `NORMAL_PALETTE` and `HIGH_CONTRAST_PALETTE` as constants with identical token names and `#RRGGBB` values: a dark ink-purple background and candle-orange accent in the original design.
2. **REQ-UI-33** THE `contrastRatio` function SHALL implement the WCAG 2 relative luminance formula, be symmetric, return a value from 1 to 21 (exactly 1 for equal colors), return 1 for any value that is not a valid `#RRGGBB` or `#RGB` string, and SHALL NOT throw.
3. **REQ-UI-34** THE module `src/ui/theme/pairs.ts` SHALL declare every foreground/background pair the UI will use (text and muted text on each surface, accent, text on accent, level colors, monster colors, focus ring and borders) with a use of `text`, `large-text` or `ui`.
4. **REQ-UI-35** IN both palettes, every `text` pair SHALL have a ratio of at least 4.5, and every `large-text` and `ui` pair at least 3. IN the high-contrast palette, every `text` pair SHALL have a ratio of at least 7.
5. **REQ-UI-36** THE table `LEVEL_PRESENTATION` in `src/ui/theme/levels.ts` SHALL give each risk level a `labelKey`, `iconKey`, `colorToken` and `darknessBand`; label keys, icon keys and bands are pairwise different, and the four color tokens are pairwise different in each palette.
6. **REQ-UI-37** EVERY color token referenced by `LEVEL_PRESENTATION` and `MONSTER_PRESENTATION` SHALL exist in both palettes.

### Requirement 7: Preferences

**User Story:** As a returning user, I want the app to remember my language, text size and display options, so that I do not set them every time.

```ts
interface Preferences { language: "vi" | "en"; textSize: 100 | 125 | 150; reduceMotion: boolean; highContrast: boolean }
interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
function loadPreferences(storage: StorageLike | null | undefined): Preferences;
function savePreference<K extends keyof Preferences>(storage: StorageLike | null | undefined, key: K, value: Preferences[K]): boolean;
function getBrowserStorage(): StorageLike | null;
const DEFAULT_LOCALE: "en";                      // exported from i18n/dictionary.ts
```

#### Acceptance Criteria

1. **REQ-UI-38** THE key set SHALL be closed to `language`, `textSize`, `reduceMotion`, `highContrast`, stored under the fixed names `trickhunt.pref.language`, `.textSize`, `.reduceMotion`, `.highContrast` as the strings `"vi"`/`"en"`, `"100"`/`"125"`/`"150"` and `"true"`/`"false"`. Defaults are `DEFAULT_LOCALE` (`"en"`), `100`, `false`, `false`. *(Modified: the default language was a caller-supplied fallback.)*
2. **REQ-UI-39** THE `loadPreferences` function SHALL always return a valid Preferences object and SHALL NOT throw, for a missing storage, a storage whose `getItem` throws, and arbitrary stored values. Each key is resolved on its own: an invalid or missing value gives that key's default and does not affect the others. It SHALL read only the four known keys. With a missing, throwing or junk storage, `language` is always `"en"`. *(Modified.)*
3. **REQ-UI-40** THE `savePreference` function SHALL write only for a known key and a valid value, SHALL ignore unknown keys and invalid values, SHALL catch every storage error, SHALL return `true` only when the write completed, and SHALL never write any key other than the four known ones.
4. **REQ-UI-41** *(Replaced: was `chooseInitialLanguage`, now removed.)* THERE SHALL be no language auto-detection: no function in `src/ui/` reads `navigator.language` or any other browser language setting, and the language is `"en"` unless a valid saved preference says otherwise.
5. **REQ-UI-42** THE function `getBrowserStorage` SHALL be the only code in `src/ui/` that references `localStorage`; it SHALL return `null` when the storage is absent or access throws, and no other storage API (`sessionStorage`, IndexedDB, cookies, Cache API) SHALL appear in `src/ui/`.
6. **REQ-UI-43** THE existing `src/client/ingest/boundaries.test.ts` SHALL be updated as described in `design.md`: it also scans `src/ui/`, allows exactly `preferences.ts` to mention `localStorage` (and nothing else from the storage list), and adds source checks for `src/ui/` (including that no file reads `navigator.language`).
7. **REQ-UI-44** *(New.)* THE module `src/ui/i18n/dictionary.ts` SHALL export `DEFAULT_LOCALE` with the value `"en"`; every fallback in `src/ui/` (unknown locale in `t`, missing preference, view locale for non-locale input) SHALL use it, and no other file SHALL hard-code a default language.

## Property-Based Testing Requirements

Continues after PBT-64. Use `numRuns >= 100`. Verdicts are generated as valid
verdicts: level not `no_signals` has at least one signal; `no_signals` has none.
Storage is a fake that records every `setItem` key.

| ID | Property | Generator hint |
|---|---|---|
| **PBT-65** | `buildResultView` never throws and returns a Result_View for any valid verdict, input text, locale (including non-locale values) and extras; the state matches the level (`neutral` exactly when level is `no_signals`); every non-neutral ready view has at least one signal card; groups are in the fixed source order; all label keys are dictionary keys | Verdict arbitraries over levels, score 0..100, signals from the real id set with random sources and evidence, `fc.string()` text, `fc.anything()` locale |
| **PBT-66** | `riskMeter.percent` is an integer from 0 to 100 and does not decrease when `riskScore` increases (other fields fixed); no text resolved from the label, summary, level and notice keys of any view, in either language, contains `safe` or `an toàn`, except the dedicated `notSafeNote` key | `fc.tuple(fc.integer(0,100), fc.integer(0,100))` sorted; `fc.double` incl. `NaN`, `Infinity` for score; all levels |
| **PBT-67** | `computeHighlights`: segments are ordered, gap-free, overlap-free, non-empty, start at 0 and end at `text.length`, and their texts concatenate to the input, for any text and evidences (empty, repeated, unicode, astral, longer than text, absent, non-strings) | `fc.string({ unit: "binary" })`, `fc.fullUnicodeString()`, arrays of `fc.string()` and `fc.anything()` |
| **PBT-68** | For a non-blank substring of the text used as evidence, the union of highlighted ranges covers it; for the same substring with changed case and with diacritics stripped, the highlighted original range covers the corresponding original characters; no highlighted range splits a surrogate pair | Text from a Vietnamese and ASCII alphabet with `đ`, accents and combining marks; random slice as evidence |
| **PBT-69** | The three message functions return a key that exists in both dictionaries for arbitrary input, `technicalCode` is `"unknown"` or a known code, `params` values are strings or numbers, and `seconds` is an integer from 1 to `MAX_RETRY_AFTER_SEC` for any `retryAfterSec` | `fc.anything()`, `fc.string()`, `fc.constantFrom("constructor","__proto__","toString")`, `fc.double()` |
| **PBT-70** | Dictionaries: identical key sets, no empty value, same placeholder set per key, every known signal id and every monster id has all required keys in both languages, and only `notSafeNote` may contain `safe` or `an toàn` | Exhaustive over keys; real ids read from the analyzer configs and `url-analyzer.ts` |
| **PBT-71** | Preferences: for arbitrary stored values, a throwing storage and a missing storage, `loadPreferences` returns a valid set and never throws, and `language` is `"en"` whenever the stored language is not exactly `"vi"` or `"en"` (a valid saved `"vi"` is returned as `"vi"`); `savePreference` with arbitrary key and value never throws and only ever writes the four known keys with valid encodings; a saved value is read back unchanged | `fc.anything()` as stored string and as value, `fc.string()` as key, fake storages that throw on `getItem` and `setItem` |
| **PBT-72** | Contrast: every declared pair meets its threshold in both palettes (4.5 for `text`, 3 for `large-text` and `ui`, 7 for `text` in high contrast); `contrastRatio` is symmetric and within 1 and 21 for any two valid colors, and returns 1 for any invalid input | `fc.integer(0, 0xffffff)` formatted as `#RRGGBB`, `fc.string()` for invalid |
| **PBT-73** | `t` never throws; for any params the output contains each supplied value verbatim, contains no `{` placeholder from the dictionary that had a param, and does not expand placeholders found inside param values; for any non-`"vi"` locale value `t` equals the `"en"` text *(Modified: the `chooseInitialLanguage` part is removed)* | `fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer()))` with values like `{seconds}`; `fc.anything()` for locale |
| **PBT-74** | *(New.)* Default language: for arbitrary storages (missing, throwing, junk values, other keys set) `loadPreferences(storage).language` is `"en"` unless the `language` key holds exactly `"vi"`; `DEFAULT_LOCALE` is `"en"` | `fc.anything()` as stored strings, `fc.string()` extra keys, throwing fakes |

### Example-based tests

All inputs and expected outputs are English unless stated. *(Modified: examples switched to English.)*

- An English bank phishing message ("This is your bank. Send me the code …" with a lookalike link), run through the real pipeline, maps to the `bank` monster, whose English name is "Bank Ghost".
- A `no_signals` verdict gives the Neutral_State; resolved in English, the summary is "No warning signs found.", the dedicated note says this does not mean the message is genuine, and the reminder points to the official number.
- `rate-limited` with `retryAfterSec: 42` gives `params.seconds` 42 and the English text "… wait 42 sec …"; without it, 30.
- A QR-only result (no text, one `url` QR) hides `ocr-too-poor`; with no QR and no user text it shows it.
- An unknown API code gives `error.generic`; the English `unsupported-type` text is "This file type is not supported. Use PNG, JPG or WebP."
- Text `"Your account is LOCKED"` with evidence `"account is locked"` highlights `"account is LOCKED"` as one segment.
- One Vietnamese example is kept: text `"Tài khoản bị KHÓA"` with evidence `"tai khoan bi khoa"` is one highlighted segment (proves diacritic-insensitive matching).
- `semanticMode: "budget-exhausted"` with a degraded verdict gives `semantic.budget-exhausted`.
- `DEFAULT_LOCALE` is `"en"`; `t(undefined, key)` equals `t("en", key)`; `loadPreferences(null)` gives language `"en"`.
- A source scan finds no `navigator.language` (nor `navigator`) in any non-test file under `src/ui/`.
- *(Removed: the `chooseInitialLanguage` examples.)*

## Out of Scope

React components, pages, SVG artwork, styling, animations, the monster guide
page, any server change, any change to `src/core`, `src/analyzers`,
`src/pipeline` or the API contract, any new dependency, more languages than
`vi` and `en`, re-running an analysis when the language changes, language
detection of any kind. Note for the next spec (no API change now): the UI sends
`locale` from the current preference, which is `"en"` by default, to
`POST /api/analyze` (through `buildAnalyzeRequest({ locale })`).

## Non-Functional Requirements

- **NFR-UI-01** `src/ui/` imports no `react`, `next`, `window`, `document`, `navigator` or `process`, and makes no network call.
- **NFR-UI-02** Every public function is total: invalid input gives a safe result, never an exception.
- **NFR-UI-03** All view logic is pure and deterministic: the same input gives the same output.
- **NFR-UI-04** Results are immutable (`readonly` types); inputs are never mutated.
