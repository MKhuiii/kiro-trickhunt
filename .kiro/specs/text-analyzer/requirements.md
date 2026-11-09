# Requirements — TrickHunt Text Analyzer

## Overview

The Text Analyzer is a rule-based implementation of `Analyzer<string>`
(`src/core/analyzer.ts`) that scans a message for common scam language and
returns `Signal` objects. It also exposes `extractEntities`, a pure helper that
finds URLs, phone numbers and account numbers so a later pipeline can pass the
URLs to `UrlAnalyzer`.

It lives in `src/analyzers/`. The `Signal`, `createSignal` and `aggregate`
contracts in `src/core/` are NOT changed.

**Hard constraints:**
- `analyze` MUST resolve for every string (inherits REQ-ANL-01).
- Every returned `Signal` MUST pass `createSignal` (inherits REQ-ANL-02).
- `TextAnalyzer` MUST NOT call or import `UrlAnalyzer`.
- No imports from `next`, `react`, `window`, `document`, or `process` (NFR-02).
- No network access, no LLM calls (NFR-01).

---

## 1. Configuration and Matching

### 1.1 Config file

`src/analyzers/text-analyzer.config.ts` exports:

```ts
export const MAX_EVIDENCE_CHARS = 200;
export const MAX_INPUT_CHARS = 20_000;
export const TEXT_PATTERNS: readonly TextPattern[];

interface TextPattern {
  id: string;            // e.g. "text.urgency"
  weight: number;        // becomes Signal.severity, in [0, 1]
  whyItMatters: string;  // plain-English, non-technical
  phrases: { en: string[]; vi: string[] };
}
```

### 1.2 Normalization

Both input and phrases are normalized the same way before matching:
NFD decompose, strip combining marks (`\p{M}`), map `đ`/`Đ` to `d`
(NFD does not decompose it), lower-case, collapse whitespace.

### 1.3 Requirements

- **REQ-TXT-01** All pattern phrases, weights, `whyItMatters` text,
  `MAX_EVIDENCE_CHARS` and `MAX_INPUT_CHARS` MUST live in
  `text-analyzer.config.ts` and MUST NOT be hard-coded in analyzer logic.
- **REQ-TXT-02** Every pattern MUST have at least one English and one
  Vietnamese phrase, and a `weight` in `[0, 1]`.
- **REQ-TXT-03** Matching MUST be case-insensitive and diacritic-insensitive:
  `"xac minh"` and `"xác minh"` match the same phrase.
- **REQ-TXT-04** A phrase MUST match only at word boundaries on the normalized
  text, so `"pin"` does not match inside `"spinning"`.
- **REQ-TXT-05** The config file MUST be importable without importing the
  analyzer.

---

## 2. Pattern Groups

Each group emits at most one signal with `source: "text"` and
`severity` equal to the group's configured weight.

| Signal id | Detects |
|---|---|
| `text.otp-request` | Asks for an OTP, PIN, password or verification code |
| `text.urgency` | Time pressure ("within 24 hours", "immediately", "last warning") |
| `text.threat` | Account locked or suspended, legal action, arrest, fines |
| `text.prize-reward` | Unexpected prize, gift, refund, "you have won" |
| `text.payment-request` | Asks for a transfer, deposit, fee or gift cards |
| `text.authority-impersonation` | Claims to be a bank, police, tax office, courier or other authority |
| `text.off-platform` | Asks to move to another chat app or keep it secret |
| `text.sensitive-data-request` | Asks for ID number, card number, bank login |

### 2.1 Requirements

- **REQ-TXT-06** For each group, a signal MUST be emitted when at least one of
  its phrases matches, and no signal when none match.
- **REQ-TXT-07** A group MUST emit at most one signal regardless of how many
  phrases match. `evidence` MUST list the matched phrases (config form,
  de-duplicated, in config order), joined by `", "` and truncated to
  `MAX_EVIDENCE_CHARS`.

---

## 3. Entity Extraction

`extractEntities(text: string): { urls: string[]; phoneNumbers: string[]; accountNumbers: string[] }`

- **REQ-TXT-08** `extractEntities` MUST be pure, MUST NOT throw for any
  string, and MUST return de-duplicated arrays in order of first appearance.
- **REQ-TXT-09** Every extracted URL, phone number and account number MUST be
  an exact substring of the input. URLs are `http(s)://` or `www.` tokens with
  trailing punctuation (`.,;:!?)`) removed.
- **REQ-TXT-10** A digit run MUST NOT be reported as both a phone number and an
  account number. Phone numbers start with `+` or `0` and have 9–15 digits;
  account numbers are other runs of 8–19 digits.

---

## 4. Analyzer Contract

- **REQ-TXT-11** `TextAnalyzer` MUST implement `Analyzer<string>` with
  `sourceType` `"text"`.
- **REQ-TXT-12** `analyze` MUST NOT throw or reject for any string. Input is
  truncated to `MAX_INPUT_CHARS` before matching. On unexpected error it
  returns `[]`.
- **REQ-TXT-13** Every signal MUST be built with `createSignal`, and
  `evidence` MUST NOT exceed `MAX_EVIDENCE_CHARS` characters.
- **REQ-TXT-14** `analyze` MUST be deterministic: the same input gives the same
  signals in the same order (config order).
- **REQ-TXT-15** `TextAnalyzer` MUST NOT call `extractEntities`, `UrlAnalyzer`
  or any other analyzer. `extractEntities` is a separate export.

---

## 5. Property-Based Testing Requirements

| ID | Property | Generator hint |
|---|---|---|
| **PBT-10** | `analyze(s)` resolves for any string | `fc.string()`, `fc.fullUnicodeString()` |
| **PBT-11** | Every signal from `analyze(s)` passes `createSignal` and has `source === "text"` | Same as PBT-10 |
| **PBT-12** | `analyze(s)` twice gives deep-equal results | Same as PBT-10 |
| **PBT-13** | Signal ids are unchanged when `s` is upper-cased, lower-cased, or has diacritics removed | Text built from config phrases plus `fc.string()` filler |
| **PBT-14** | `extractEntities(s)` never throws and every extracted value is a substring of `s` | `fc.string()`, `fc.fullUnicodeString()`, strings with embedded `fc.webUrl()` |
| **PBT-15** | No signal `evidence` is longer than `MAX_EVIDENCE_CHARS` | Long text repeating many phrases |

---

## 6. Out of Scope

- LLM calls and network access
- UI rendering
- Redaction of extracted entities
- Calling `UrlAnalyzer` (pipeline wiring is a later feature)
- Language detection (all phrase lists are checked for every input)

---

## 7. Non-Functional Requirements

- **NFR-TXT-01** Phrase lists MUST be editable without touching analyzer logic
  or its tests.
- **NFR-TXT-02** Matching MUST be linear in input length for a fixed config
  (plain substring search on normalized text, no nested quantifier regexes).
