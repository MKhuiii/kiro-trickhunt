# Implementation Plan: Halloween voice

## Overview

Build the voice module and its tests first (they pass on today's dictionary),
then rewrite the tier A and B strings, then fix the tests that pin old text.
Nothing outside `src/ui/i18n`, the tests and the e2e changes.

## Environment

- OS: Windows, shell: Windows PowerShell 5.1. Run tests with `vitest run`.
- Relative imports only. `src/ui/` has no React or browser globals.
- Wording comes from the tables in `design.md`; do not reword them.
- No change to `src/core`, `src/analyzers`, `src/pipeline`, `src/server`, `src/client`, `src/app/api`. No new dependency.

## Tasks

- [x] 1. Steering `halloween-voice.md` and a pointer in `hunter-scene-rules.md`
  - _Requirements: REQ-VOICE-01 to REQ-VOICE-12_

- [x] 2. Spec files (`requirements.md`, `design.md`, `tasks.md`, `.config.kiro`)

- [x] 3. Voice module and tests on the current dictionary
  - [x] 3.1 Create `src/ui/i18n/voice.ts` as in design A
    - _Requirements: REQ-VOICE-01, REQ-VOICE-04, REQ-VOICE-05, REQ-VOICE-06_
  - [x] 3.2 `voice.test.ts` unit tests
  - [x] 3.3 `voice.property.test.ts` with PBT-100, PBT-101, PBT-102 and the length part of PBT-103
    - **Validates: Requirements REQ-VOICE-01, 04, 05, 06, 10**
  - Demo: `vitest run` is green on the unchanged dictionary. A new key without a tier makes it fail.

- [x] 4. Checkpoint - Ensure all tests pass

- [x] 5. Apply the new wording
  - [x] 5.1 Rewrite the tier A strings in `en.ts` and `vi.ts` (design B, tier A)
    - _Requirements: REQ-VOICE-02, REQ-VOICE-08_
  - [x] 5.2 Rewrite the tier B strings (design B, tier B)
    - _Requirements: REQ-VOICE-03, REQ-VOICE-10_
  - [x] 5.3 Add PBT-103 (tier B at most one horror word) and PBT-104 (required-themed keys, both languages)
    - **Validates: Requirements REQ-VOICE-03, 08, 10**
  - Demo: the app shows the new wording; risk labels, actions and explanations are unchanged.

- [x] 6. Fix tests and e2e that pin old text
  - [x] 6.1 Search `src` and `e2e` for old literals (for example "Ambient sound") and use `t()` or the new text
  - [x] 6.2 Add an e2e check for a horror word on the home screen and for the fixed text on a result
  - Demo: `vitest run` and `playwright test` are green.

- [x] 7. Final checkpoint
  - `tsc`, `eslint`, `vitest run`, `playwright test`; screenshots of home, bag, hunt, reveal and journal on phone and desktop for layout; confirm no change in protected folders and no new dependency.

Notes: PBT-100 to PBT-104 are in `src/ui/i18n/voice.property.test.ts`; the unit tests are in `voice.test.ts`. 29 strings were rewritten in each language (14 tier A, 15 tier B). The e2e suite has a `halloween voice` group. Layout was checked at 375 and 1440 px in English and Vietnamese.
