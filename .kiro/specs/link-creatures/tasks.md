# Implementation Plan: Link creatures

## Overview

Build the link creature layer as described in `requirements.md` and `design.md`.
Changed files: `src/ui/**` and one section of `README.md`. No change to
`src/core`, `src/analyzers`, `src/pipeline`, `src/server`, `src/app/api`, the API
contract or `chooseMonster`. No existing test file is edited.

## Environment

- OS: Windows, shell: Windows PowerShell 5.1. Never chain with `&&`.
- Run tests with `vitest run` (single pass). Node environment, no network.
- Relative imports only. Client code imports only types from `src/pipeline`.
- English and Vietnamese text come from `design.md`; do not reword it.

## Tasks

- [x] 1. Theme tokens and pairs
  - Add the seven `link-*` tokens to `COLOR_TOKENS`, `NORMAL_PALETTE` and `HIGH_CONTRAST_PALETTE` with the values in `design.md`
  - Add `LINK_TOKENS` and 14 `text` pairs (on `surface` and `raised`) to `pairs.ts`
  - Write `theme/link-creatures.contrast.property.test.ts` (PBT-109)
  - _Requirements: REQ-LINK-15, REQ-LINK-16, REQ-LINK-17_

- [x] 2. Dictionary and voice tier
  - Add all `link.*` keys to `en.ts` and `vi.ts` from `design.md`
  - Add `link\.` to the tier C prefix rule in `voice.ts`
  - Write `i18n/link-creatures.property.test.ts` (PBT-108)
  - _Requirements: REQ-LINK-05, REQ-LINK-06, REQ-LINK-07, REQ-LINK-18_

- [x] 3. Creature table
  - Create `src/ui/link-creatures.ts` with `LINK_CREATURES` and `LINK_TONES`
  - Write `link-creatures.test.ts`: exact table, unique ids, tokens and art keys, bands, one-to-one with the `url.*` ids read from `url-analyzer.ts` and with `KNOWN_SIGNAL_IDS`, real `UrlAnalyzer` samples
  - _Requirements: REQ-LINK-01, REQ-LINK-02, REQ-LINK-03, REQ-LINK-04_

- [x] 4. View model
  - Create `view/link-creatures-view.ts` and add `linkCreatures` to `ReadyResultView` and `buildResultView`
  - Export from `src/ui/index.ts`
  - Write `view/link-creatures-view.test.ts` (examples) and `view/link-creatures-view.property.test.ts` (PBT-105, PBT-106, PBT-107 with a copy of the old projection)
  - _Requirements: REQ-LINK-08 to REQ-LINK-14, REQ-LINK-19_

- [x] 5. README
  - Add the "Link creatures" section before "Known limits"
  - _Requirements: REQ-LINK-20_

- [x] 6. Final checkpoint
  - Run `vitest run`, `npx tsc --noEmit` and `npm run lint`
  - Confirm `git status` shows changes only in `src/ui/` and `README.md`
