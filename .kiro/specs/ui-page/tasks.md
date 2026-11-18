# Implementation Plan: UI page

## Overview

Build the first real page as described in `requirements.md` and `design.md`.
Part A amends `src/ui/` (small, tested, pure). Part B adds thin components.
No change to `src/core`, `src/analyzers`, `src/pipeline`, `src/server`,
`src/app/api` or the API contract. `src/app/try/page.tsx` is not changed.

## Environment

- OS: Windows, shell: Windows PowerShell 5.1. Never chain with `&&`.
- Run tests with `vitest run` (single pass, node environment, no network).
- Relative imports only. `src/ui/` has no React or browser globals.
  Components import only `import type` from `src/pipeline`.
- Do not implement beyond the task being executed. English text and Vietnamese
  drafts come from the tables in `design.md`; do not reword them.
- `ui-presentation` tasks are all checked and are not reopened. Existing tests
  that pinned the old `level.suspicious` or `result.actions.heading` text are
  updated in task 1.1 only.

## Tasks

- [x] 1. Dictionary, level and view-model amendments (`src/ui/`)
  - [x] 1.1 Update `i18n/en.ts` and `i18n/vi.ts`
    - Apply the table in design A1: two changed keys, new keys; update the tests that pinned the old texts; confirm whether `BuildAnalyzeInput` has `locale` and report the result
    - _Requirements: REQ-PAGE-01, REQ-PAGE-05, REQ-PAGE-08, REQ-PAGE-10, REQ-PAGE-13_
  - [x] 1.2 Edit `.kiro/steering/privacy-and-safety.md`
    - Change only the `suspicious` row "What to say" to "A few things to double-check"
    - _Requirements: REQ-PAGE-01_
  - [x] 1.3 Level and monster rules
    - `chooseMonster` in `view/result-view.ts` (suspicious always `generic`); tests in `theme/levels.test.ts` for hue and `icon-stop` only on `critical`
    - _Requirements: REQ-PAGE-02, REQ-PAGE-03_
  - [x] 1.4 Add `aiUnavailable` to `view/semantic-note.ts` and the new view fields
    - `aiNote`, `limitsNoteKey` (ready and withheld), strong reminder key in neutral state; `semanticNoteKey` unchanged
    - _Requirements: REQ-PAGE-07, REQ-PAGE-10, REQ-PAGE-11, REQ-PAGE-13_
  - [x] 1.5 Unit tests
    - Update `result-view.test.ts` and `semantic-note.test.ts` with the example-based cases from `requirements.md`; add `ui-page-keys.test.ts`
    - _Requirements: REQ-PAGE-01 to REQ-PAGE-13_
  - [x] 1.6 Property tests PBT-75, PBT-76, PBT-77, PBT-80 in `result-view.page.property.test.ts` and `dictionary.property.test.ts`
    - **Property: calm suspicious (PBT-75), AI note rule (PBT-76), strong reminder (PBT-77), new keys (PBT-80)**
    - **Validates: Requirements REQ-PAGE-01 to REQ-PAGE-10, REQ-PAGE-13**

- [x] 2. Checkpoint - Ensure all tests pass

- [x] 3. Orchestration and theme helpers (`src/ui/`)
  - [x] 3.1 Create `src/ui/run-check.ts`
    - Rules 1 to 6 of design A4; types only from `../pipeline` and `../client/ingest`
    - _Requirements: REQ-PAGE-18, REQ-PAGE-19, REQ-PAGE-20, REQ-PAGE-22_
  - [x] 3.2 Unit tests `run-check.test.ts`
    - Text only skips ingest; empty returns `nothing` with no calls; ingest error with and without text; API error mapping incl. `rate-limited`; throwing deps; success returns `inputText` equal to `request.text` and the mode
    - _Requirements: REQ-PAGE-18 to REQ-PAGE-22_
  - [x] 3.3 Property test PBT-78 in `run-check.property.test.ts`
    - **Property: never throws, request has no image data, empty input makes no calls**
    - **Validates: Requirements REQ-PAGE-18, REQ-PAGE-20, REQ-PAGE-35**
  - [x] 3.4 Create `theme/css-vars.ts`, add declared pairs, tests and PBT-79
    - `paletteToCssVars`; new `DECLARED_PAIRS` rows for AI note and limits note; thresholds unchanged; fix a palette value, not a threshold, if a pair fails
    - **Validates: Requirements REQ-PAGE-28, REQ-PAGE-34**
  - [x] 3.5 Create `view/page-layout.ts` and `page-layout.test.ts`
    - `resultSections`; order checks for ready (monster, neutral, with and without AI note, with and without actions) and withheld; monster always after evidence and limits note; AI note directly after level banner
    - _Requirements: REQ-PAGE-04, REQ-PAGE-09, REQ-PAGE-14, REQ-PAGE-23, REQ-PAGE-24_
  - [x] 3.6 Export the new items from `src/ui/index.ts`

- [x] 4. Checkpoint - Ensure all tests pass

- [x] 5. Components and page
  - [x] 5.1 Create `icons.tsx`, `monster-art.tsx` (original inline SVG, `aria-hidden`)
    - _Requirements: REQ-PAGE-32_
  - [x] 5.2 Create result components: `LevelBanner`, `AiNote`, `ActionBox`, `EvidenceList`, `HighlightedMessage`, `LimitsNote`, `MonsterCard`, `Notices`, `TechnicalDetails`, `ResultPanel`
    - `ResultPanel` renders `resultSections(view)` in order; `AiNote` is not inside `<details>`; the monster card is smaller than the evidence heading
    - _Requirements: REQ-PAGE-04, REQ-PAGE-09, REQ-PAGE-14, REQ-PAGE-23 to REQ-PAGE-25, REQ-PAGE-33_
  - [x] 5.3 Create input and shell components: `InputForm`, `StatusRegion`, `ErrorAlert`, `SettingsPanel`, `Header`, `App`
    - `App` wires `runCheck` with the real client functions, lazy `createBrowserIngestDeps`, preferences after mount, focus to the result heading, `role="status"` and `role="alert"`
    - _Requirements: REQ-PAGE-16 to REQ-PAGE-22, REQ-PAGE-26 to REQ-PAGE-31_
  - [x] 5.4 Replace `src/app/page.tsx`; edit `layout.tsx` and `globals.css`
    - Token variables, `rem` sizes, focus ring, reduced-motion rules, root `data-*` attributes; remove template content and unused images
    - _Requirements: REQ-PAGE-16, REQ-PAGE-27, REQ-PAGE-28, REQ-PAGE-30, REQ-PAGE-31_
  - [x] 5.5 Source-scan tests
    - `src/components/components.boundaries.test.ts` as in design; extend `src/client/ingest/boundaries.test.ts` to scan `src/components/` and `src/app/page.tsx`
    - _Requirements: REQ-PAGE-35 to REQ-PAGE-39_

- [x] 6. Final checkpoint
  - Run `vitest run`, `npx tsc --noEmit`, `npm run lint` and `npx next build`
  - Confirm `git status` shows changes only in `src/ui/`, `src/components/`, `src/app/page.tsx`, `layout.tsx`, `globals.css`, `src/client/ingest/boundaries.test.ts`, `.kiro/steering/privacy-and-safety.md` and `.kiro/specs/ui-page/`
  - Manual check in a browser (run `npm run dev` yourself): a suspicious sample reads calm with the generic monster; with `LLM_API_KEY` unset the AI note appears under the level and a neutral sample shows the strong reminder; the limits note is visible; text size 150 and high contrast work; keyboard-only use works

- [x] 7. Link creature badges (amendment; needs `link-creatures` tasks 1 to 4 done first)
  - Tasks 1 to 6 are checked and are not reopened. This group is the rework.
  - [x] 7.1 Dictionary wording
    - Rewrite the five `signal.url.*.explain` texts and add `link.badge.caption` and `link.plain.note` in `en.ts` and `vi.ts` from design C4; update any existing test that pins an old text
    - Write `i18n/link-wording.property.test.ts` (PBT-113)
    - _Requirements: REQ-PAGE-45_
  - [x] 7.2 Pure helper
    - Create `src/ui/view/link-badges.ts`, export it from `src/ui/index.ts`; write `link-badges.test.ts` and `link-badges.property.test.ts` (PBT-110)
    - _Requirements: REQ-PAGE-40, REQ-PAGE-41_
  - [x] 7.3 Theme pairs
    - Add 14 `ui` pairs (seven `link-*` tokens on `surface` and `raised`) to `pairs.ts`; do not change thresholds
    - _Requirements: REQ-PAGE-46_
  - [x] 7.4 Icons and art
    - Add `IconLink` and the three tone icons with `ToneIcon` to `icons.tsx`; create `art/link-creatures.tsx` (seven pieces and `LinkCreatureArt`); write `art/link-creatures.test.ts` (PBT-111)
    - _Requirements: REQ-PAGE-42, REQ-PAGE-43_
  - [x] 7.5 Badge and card
    - Create `LinkBadge.tsx`; edit `EvidenceList.tsx` (badge per card, `link.plain.note` once in the url group); write `LinkBadge.test.ts` and `EvidenceList.link.property.test.ts` (PBT-112)
    - _Requirements: REQ-PAGE-40, REQ-PAGE-44, REQ-PAGE-46_
  - [x] 7.6 Source-scan rules
    - Extend `components.boundaries.test.ts`: `href`, `<a ` and `onClick` are forbidden in `LinkBadge.tsx`, `EvidenceList.tsx` and `HighlightedMessage.tsx`; add sanity cases
    - _Requirements: REQ-PAGE-39, REQ-PAGE-44_
  - [x] 7.7 Final checkpoint
    - Run `vitest run`, `npx tsc --noEmit`, `npm run lint` and `npx next build`; confirm `git status` shows changes only in `src/ui/`, `src/components/` and `.kiro/specs/`
    - Manual check in a browser: paste a message with a link such as `http://paypa1.com/verify`; the url card shows the badge with art, name, description, tone label and line; the link is plain text and cannot be clicked; text size 150 and high contrast still read well

- [x] 8. Link spotlight (amendment; needs group 7 done first)
  - Groups 1 to 7 are checked and are not reopened. This group moves the link badges to a section right under the level banner (design Part D).
  - [x] 8.1 Dictionary
    - Add `result.links.heading` to `en.ts` and `vi.ts` from design D4; add the key to the PBT-113 set in `link-wording.property.test.ts`; confirm the key set, placeholder and tier tests still pass
    - _Requirements: REQ-PAGE-52_
  - [x] 8.2 Section list
    - Add `linkSpotlight` to `SectionId` and to `resultSections` in `page-layout.ts` (right after `levelBanner`, only for a ready view with links); check that `journal.ts` puts it first on page 2 and that `splitSections` keeps it in the scrolling part; extend `page-layout.test.ts` and the journal tests
    - _Requirements: REQ-PAGE-47, REQ-PAGE-53, REQ-PAGE-54_
  - [x] 8.3 Spotlight component and card change
    - Create `LinkSpotlight.tsx`; add the `linkSpotlight` case to `renderSection` in `ResultPanel.tsx`; remove the badge rendering (and the `linkBadgesForGroup` and `LinkBadge` imports) from `EvidenceList.tsx`, keeping `link.plain.note` once in the url group
    - _Requirements: REQ-PAGE-47, REQ-PAGE-48, REQ-PAGE-49, REQ-PAGE-50, REQ-PAGE-51_
  - [x] 8.4 Tests and properties
    - Edit `EvidenceList.link.property.test.ts` (PBT-112) and add PBT-115 there; create `ResultPanel.link.property.test.ts` (PBT-114); add the examples listed in `requirements.md` to `ResultPanel.test.ts`
    - _Requirements: REQ-PAGE-47 to REQ-PAGE-51, REQ-PAGE-54_
  - [x] 8.5 Source-scan rules
    - Extend `components.boundaries.test.ts`: `href`, `<a ` and `onClick` are forbidden in `LinkSpotlight.tsx` and `ResultPanel.tsx`; the hard-coded text scan covers `LinkSpotlight.tsx`; add sanity cases
    - _Requirements: REQ-PAGE-39, REQ-PAGE-51_
  - [x] 8.6 Final checkpoint
    - Run `vitest run`, `npx tsc --noEmit`, `npm run lint` and `npx next build`; confirm `git status` shows changes only in `src/ui/`, `src/components/` and `.kiro/specs/`
    - Manual check in a browser: paste a message with a link such as `http://paypa1.com/verify`; the badge appears right under the level banner with its heading, the url card has no badge but keeps the plain-text note; the link cannot be clicked; text size 150 and high contrast still read well; in the journal the badges are the first block of page 2

## Notes

- Group 8 is the only unchecked group; its sub-tasks touch different files per wave.
- Vietnamese text is a draft pending human review.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["8.1", "8.2"] },
    { "id": 1, "tasks": ["8.3"] },
    { "id": 2, "tasks": ["8.4", "8.5"] }
  ]
}
```
