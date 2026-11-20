# Implementation Plan: Field guide (bestiary)

## Overview

Build the field guide as described in `requirements.md` and `design.md`.
Changed files are listed in `design.md`. No change to `src/core`, `src/analyzers`,
`src/pipeline`, `src/server`, `src/app/api`, the API contract or `chooseMonster`.
No existing test file is edited.

## Environment

- OS: Windows, shell: PowerShell. Do not chain with `&&`.
- Run tests with `vitest run` (single pass). Node environment, no network.
- Relative imports only. Components import only types from `src/pipeline`.
- English and Vietnamese text come from `design.md`; do not reword it.

## Tasks

- [x] 1. Dictionary and voice tier
  - Add the 11 `bestiary.*` keys to `en.ts` and `vi.ts` exactly as in `design.md`
  - Add the prefix `bestiary.` to the tier B rule in `voice.ts`
  - Run the existing dictionary and voice tests; they must pass unedited
  - _Requirements: REQ-BEST-07.1, REQ-BEST-08.1, REQ-BEST-08.2, REQ-BEST-08.3_
- [x] 2. Data module
  - Write `src/ui/bestiary.ts` with `BESTIARY_ENTRIES`, `groupEntries`, `findEntry`
  - Export from `src/ui/index.ts`
  - Write `bestiary.test.ts` (13 entries, order, no `neutral`, tone keys only on links)
  - Write `bestiary.property.test.ts` (PBT-131, PBT-132, PBT-133)
  - _Requirements: REQ-BEST-01, REQ-BEST-02, REQ-BEST-03_
- [x] 3. Notebook art
  - Write `art/notebook.tsx` (original SVG, decorative, within the art budget)
  - Register `notebook` in `registry.tsx`
  - Run `art.test.ts`, `art-budget.test.ts`, `registry.test.ts`; they must pass unedited, except one user-approved line: `"notebook",` added to `EXPECTED_IDS` in `art.test.ts`
  - _Requirements: REQ-BEST-09_
- [x] 4. Components
  - Write `BestiaryButton.tsx` and `BestiaryPanel.tsx` with the exported helper `nextFocusIndex`
  - Write `BestiaryPanel.test.ts` (PBT-134 as a property test, plus the static source checks of REQ-BEST-07.3 and 07.4)
  - Run `components.boundaries.test.ts`; it must pass unedited
  - _Requirements: REQ-BEST-04, REQ-BEST-05, REQ-BEST-06, REQ-BEST-07_
- [x] 5. Wire into the page
  - Add `guideOpen` state, the button and the panel to `App.tsx`
  - Confirm the button appears in idle, working, done and failed states and does not alter `PageState`
  - Check the layout at 320 px width and at 200 percent text size; move the button if it covers the input
  - _Requirements: REQ-BEST-04.1, REQ-BEST-04.5, REQ-BEST-05.7, REQ-BEST-05.8_
- [x] 6. Final checkpoint
  - Run `vitest run` and `tsc --noEmit`; both must pass
  - Open the page in the browser: click the notebook, open a monster and a link creature, use Tab, Escape and the back button, and confirm focus returns to the notebook
  - Ask the user for review of the Vietnamese draft strings

## Follow-up: notebook with page flip (tasks 7 to 12)

Tasks 1 to 6 are done and stay as they are. Tasks 7 to 12 replace the list-and-detail panel with a notebook the user flips through, one page at a time (see `requirements.md` Requirements 5, 6, 10, 11 and `design.md`).

Rules for this follow-up:

- The English and Vietnamese text comes from the Dictionary keys table in `design.md`; do not reword it. The final set is 16 `bestiary.*` keys: 2 removed (`bestiary.intro`, `bestiary.back`), 7 added, 9 kept.
- No change to `src/core`, `src/analyzers`, `src/pipeline`, `src/server`, `src/app/api`, the API contract or `chooseMonster`. No new dependency. No network, storage or logging.
- **One existing test file must be edited: `src/components/BestiaryPanel.test.ts`** (add the two new component files to `GUIDE_FILES`). This reverses the earlier "no existing test is edited" rule. The user approved the edit. PBT-134 and every current assertion stay as they are. The same file also gets the `bestiary.note` placement checks (see task 9).
- `motion-css.test.ts`, `high-contrast-css.test.ts`, `components.boundaries.test.ts`, `bestiary.test.ts`, `bestiary.property.test.ts`, the dictionary parity test and the voice tests must pass unedited.
- Tasks 7 and 8 can be done in either order. Task 9 needs both.

- [x] 7. Page helpers and property test
  - Add `FlipDirection`, `pageCount`, `clampPage`, `flipTarget`, `entryForPage` to `src/ui/bestiary.ts` as in `design.md`; they must be total and use no DOM, network or storage API
  - Export them from `src/ui/index.ts`
  - Write `src/ui/bestiary-pages.test.ts` (examples: count 14, NaN and Infinity inputs, page 0 and page 14 ends, `entryForPage(…, 0)` is undefined)
  - Write `src/ui/bestiary-pages.property.test.ts` with PBT-135 (clamp in range, idempotent), PBT-136 (flip in range and stops at the ends), PBT-137 (count - 1 forward flips reach the last page, and back), PBT-138 (page to entry mapping), at least 100 runs each, tagged with the property number
  - Run `bestiary.test.ts` and `bestiary.property.test.ts`; they must pass unedited
  - _Requirements: REQ-BEST-03.3, REQ-BEST-06.7, REQ-BEST-10.1, REQ-BEST-10.2, REQ-BEST-10.3, REQ-BEST-10.4, REQ-BEST-10.5, REQ-BEST-10.6_
- [x] 8. Dictionary keys
  - In `en.ts` and `vi.ts`: remove `bestiary.intro` and `bestiary.back`; add `bestiary.toc.heading`, `bestiary.toc.intro`, `bestiary.toc.page`, `bestiary.page.prev`, `bestiary.page.next`, `bestiary.page.of`, `bestiary.page.label` exactly as in `design.md`; keep the other nine
  - Keep placeholders identical in both languages (`{page}`, `{current}`, `{total}`, `{name}`)
  - Do not edit `voice.ts`; the prefix `bestiary.` is already tier B
  - Run the dictionary parity and voice tests; they must pass unedited. Expect `BestiaryPanel.tsx` to fail type checking until task 9 removes its uses of the two removed keys, so do tasks 8 and 9 in one sitting
  - _Requirements: REQ-BEST-07.1, REQ-BEST-08.1, REQ-BEST-08.2, REQ-BEST-08.3_
- [x] 9. Rewrite the panel as a notebook
  - Write `NotebookContents.tsx` (page 0: heading, intro, two groups of plain text line buttons with name, kind label and page number; no `bestiary.note`) and `NotebookPage.tsx` (one entry page with an `isLast` prop: art, name heading with `tabIndex -1`, kind, description, tone for link entries, warning signs, `link.plain.note` for link entries, and `bestiary.note` as the closing line only when `isLast` is true)
  - Rewrite `BestiaryPanel.tsx`: pass `isLast={page === count - 1}` to `NotebookPage`; state is only `page` and `direction`; remove `selectedId` and the back button; previous and next text buttons (at least 44 by 44 px, not rendered at the ends), indicator "{current} / {total}", ArrowLeft and ArrowRight, Escape, Tab trap with `nextFocusIndex`, focus to the new page heading after a flip, polite live region (silent on first open), focus return to the notebook button, page area scrolls inside itself
  - Add the `.th-notebook*` classes, `.th-flip-next`, `.th-flip-prev` and their start-only keyframes to `src/app/globals.css` (transform and opacity only, 1 second, no `clip-path`, relative units, high-contrast override)
  - Edit `BestiaryPanel.test.ts` (user-approved): add the two new files to `GUIDE_FILES`, and add source checks that `NotebookContents.tsx` does not reference `bestiary.note` and that `bestiary.note` in `NotebookPage.tsx` appears only under an `isLast` condition. Then write `src/components/notebook-css.test.ts`
  - Run `motion-css.test.ts`, `high-contrast-css.test.ts` and `components.boundaries.test.ts`; they must pass unedited
  - _Requirements: REQ-BEST-05.1, REQ-BEST-05.2, REQ-BEST-05.3, REQ-BEST-05.4, REQ-BEST-05.5, REQ-BEST-05.6, REQ-BEST-05.7, REQ-BEST-05.9, REQ-BEST-05.10, REQ-BEST-05.11, REQ-BEST-05.12, REQ-BEST-05.13, REQ-BEST-05.14, REQ-BEST-05.15, REQ-BEST-06.1, REQ-BEST-06.2, REQ-BEST-06.3, REQ-BEST-06.4, REQ-BEST-06.5, REQ-BEST-06.6, REQ-BEST-06.8, REQ-BEST-06.9, REQ-BEST-07.3, REQ-BEST-07.4, REQ-BEST-11.1, REQ-BEST-11.2, REQ-BEST-11.3, REQ-BEST-11.4, REQ-BEST-11.5, REQ-BEST-11.6, REQ-BEST-11.7, REQ-BEST-11.8_
- [x] 10. Check the wiring in the page
  - Confirm `App.tsx` needs no change (same props, same button in the Frame footer strip); edit it only if the types require it
  - Confirm opening and closing the notebook leaves `PageState`, the input, the files and the preferences unchanged in idle, working, done and failed states
  - Check the layout at 320 px width and at 200 percent text size: the page area scrolls inside itself, the previous and next buttons and the indicator stay visible and wrap, and the flip effect does not clip text
  - Check the flip with reduced motion on (system setting and the in-page switch): the page changes with no motion
  - _Requirements: REQ-BEST-04.1, REQ-BEST-04.5, REQ-BEST-05.7, REQ-BEST-05.8, REQ-BEST-11.3, REQ-BEST-11.4_
- [x] 11. Source and wording checks
  - Confirm the static checks cover `bestiary.ts`, `BestiaryButton.tsx`, `BestiaryPanel.tsx`, `NotebookPage.tsx` and `NotebookContents.tsx`
  - Confirm no new string says "safe" or "an toàn" as a verdict
  - _Requirements: REQ-BEST-07.1, REQ-BEST-07.2, REQ-BEST-07.3, REQ-BEST-07.4_
- [x] 12. Final checkpoint
  - Run `vitest run` and `tsc --noEmit`; both must pass
  - Open the page in the browser: open the notebook, flip forward and back with the buttons and with ArrowRight and ArrowLeft, jump from a contents line, check page "14 / 14" has no next button and shows the closing note, page "1 / 14" has no previous button and no closing note, the Bank line says page 2, press Escape, and confirm focus returns to the notebook button and the next open starts at page 1 / 14
  - Ask the user for review of the Vietnamese draft strings
  - Ask the user, if questions arise
  - _Requirements: REQ-BEST-05, REQ-BEST-06, REQ-BEST-08, REQ-BEST-10, REQ-BEST-11_

## Follow-up 2: notebook look and picture contents

Tasks 1 to 12 are done and stay as they are. Tasks 13 to 16 change the contents page to picture stickers and give the panel an open-notebook look (see `requirements.md` Requirements 6, 8, 11 and `design.md`, "Open-notebook look").

Rules for this follow-up:

- This follow-up supersedes two lines above that stay unedited: task 9 says the contents page has "plain text line buttons with ... page number", and task 12 and the first Note say "the Bank line says page 2". From task 13 on, the page number is visually hidden text only.
- No key is added or removed: the set stays at 16 `bestiary.*` keys. The text of `bestiary.toc.intro` changes in both languages. `bestiary.toc.page` stays as visually hidden text. English and Vietnamese text comes from `design.md`; keep placeholders identical.
- No change to `src/core`, `src/analyzers`, `src/pipeline`, `src/server`, `src/app/api`, the API contract or `chooseMonster`. No new dependency, no new font, no image file, no network, storage or logging. Handwritten headings use the existing `th-hand` class and `--th-hand` token.
- Existing tests that need the user's approval before they are edited during execution (ask first, then edit): `src/components/notebook-css.test.ts` (new assertions for the new classes), and `src/components/BestiaryPanel.test.ts` (only for the optional contents source checks). `src/ui/bestiary-wording.test.ts` is not edited, because the count stays 16. These must pass unedited: `motion-css.test.ts`, `high-contrast-css.test.ts`, `components.boundaries.test.ts`, `bestiary.test.ts`, `bestiary.property.test.ts`, `bestiary-pages.test.ts`, `bestiary-pages.property.test.ts`, the dictionary parity and voice tests.
- Task 14 and task 15 touch different files. Task 14 uses the class names `th-sticker-board` and `th-sticker` that task 15 defines, as listed in `design.md`.

- [x] 13. Dictionary text change and wording check
  - In `en.ts` and `vi.ts`: change only the text of `bestiary.toc.intro` to the values in `design.md` ("Tap a picture ..." and "Chạm vào một hình ..."). Add and remove no key
  - Keep `bestiary.toc.page` and its `{page}` placeholder in both languages
  - Run `bestiary-wording.test.ts` (still 16 keys, no "safe" or "an toàn"), the dictionary parity and voice tests; they must pass unedited
  - _Requirements: REQ-BEST-08.1, REQ-BEST-08.2, REQ-BEST-08.3, REQ-BEST-07.1_
- [x] 14. Rewrite the contents page as picture stickers
  - Rewrite `src/components/NotebookContents.tsx`: heading `bestiary.toc.heading`, `bestiary.toc.intro`, two `th-hand` group headings, and for each entry a native `<button type="button" className="th-sticker">` with decorative art (`Art` or `LinkCreatureArt` in `LINK_CREATURE_DISC`, `aria-hidden`), the visible name, and a visually hidden span with the kind label and `bestiary.toc.page` (`page + 1`)
  - Remove the dotted leader span, the visible page text and the visible kind label; keep the props (`locale`, `onGoTo`), the `tabIndex -1` heading and the absence of `bestiary.note`
  - Keep `FOCUS_RING`, targets of at least 44 by 44 px, relative units, and name wrapping
  - Check `components.boundaries.test.ts` and the current source checks in `BestiaryPanel.test.ts`; they must pass unedited. With the user's approval, add the optional contents source checks (art is `aria-hidden`, every `bestiary.toc.page` is inside `sr-only`)
  - _Requirements: REQ-BEST-02.2, REQ-BEST-06.1, REQ-BEST-06.2, REQ-BEST-06.3, REQ-BEST-06.6, REQ-BEST-06.10, REQ-BEST-06.11, REQ-BEST-07.3, REQ-BEST-07.4_
- [x] 15. Open-notebook styling and panel markup
  - In `src/app/globals.css`: add `.th-notebook-spread`, `.th-notebook-gutter`, `.th-notebook-stitch`, `.th-notebook-edges`, `.th-sticker-board` and `.th-sticker*` (paper texture by gradients, gutter shadow, stacked edges, page curl, stitched binding, tape, static tilt by `:nth-child`), a `@media (min-width: 48rem)` spread look, and high-contrast overrides for all of them; remove `.th-notebook-leader`. Relative units only, `--th-*` tokens only, no `clip-path`, no image, no new animation
  - In `BestiaryPanel.tsx`: add the decorative `aria-hidden` wrapper spans from `design.md`; keep one logical page, the state, props, keys, focus handling and the 1 second flip unchanged
  - With the user's approval, edit `notebook-css.test.ts`: add checks for the new classes (no `px` font size, no `clip-path`, no `url(`, no new keyframes, high-contrast overrides, no `.th-notebook-leader`); keep every current assertion
  - Run `notebook-css.test.ts`, `motion-css.test.ts`, `high-contrast-css.test.ts` and `components.boundaries.test.ts`
  - _Requirements: REQ-BEST-05.7, REQ-BEST-11.1, REQ-BEST-11.3, REQ-BEST-11.4, REQ-BEST-11.5, REQ-BEST-11.6, REQ-BEST-11.7, REQ-BEST-11.8, REQ-BEST-11.9, REQ-BEST-11.10, REQ-BEST-11.11, REQ-BEST-11.12, REQ-BEST-06.11_
- [x] 16. Browser check and final checkpoint
  - Open the page in the browser at 1280 px width, at 320 px width and at 200 percent text size, and save a screenshot of each (contents page and one entry page)
  - Confirm: the spread look shows at 1280 px with one page of content; at 320 px it is a single sheet with 2 to 3 stickers per row and no horizontal overflow; at 200 percent text no name is clipped and the previous and next buttons stay visible
  - Confirm: pressing a sticker flips to its page, a screen reader name or the accessibility tree shows name, kind and page for each sticker, no page number or dotted leader is visible on the contents page, the indicator reads "1 / 14", and high contrast and reduced motion drop decoration and motion
  - Run `vitest run` and `tsc --noEmit`; both must pass
  - Ask the user for review of the Vietnamese `bestiary.toc.intro` text
  - Ask the user, if questions arise
  - _Requirements: REQ-BEST-05.7, REQ-BEST-06.2, REQ-BEST-06.10, REQ-BEST-06.11, REQ-BEST-08.1, REQ-BEST-11.3, REQ-BEST-11.8, REQ-BEST-11.9, REQ-BEST-11.10_

## Follow-up 3: two-page spread

Tasks 1 to 16 are done and stay as they are. Tasks 17 to 21 make the notebook use both pages of the open book on wide screens (see `requirements.md` Requirement 12 and `design.md`, "Two-page spread (revision 3)").

Rules for this follow-up:

- This follow-up supersedes the "one logical page at a time" wording for wide screens (48rem and up) in the Overview, in Follow-up 2 ("the spread look shows ... with one page of content" in task 16, "still one logical page" in task 15) and in the first Note, and the earlier rule that content is on the right page only. Below 48rem the notebook still shows one logical page per step (14 steps). Tasks 1 to 16 are not edited.
- Spread mapping: spread s shows pages 2s (left) and 2s + 1 (right). 14 pages make 7 spreads: contents and Bank, Prize and Job-bait, Authority and Generic, then link creatures in pairs. The count is even, so the last spread is full. If the count is odd, the right leaf of the last spread is blank paper.
- No dictionary key is planned (the set stays at 16). The indicator reuses `bestiary.page.of` with `current` set to "1-2" style text. Fallback only if `t` cannot take text: one key `bestiary.page.range`, which needs the user's approval and a count of 17 in `bestiary-wording.test.ts`.
- No change to `src/core`, `src/analyzers`, `src/pipeline`, `src/server`, `src/app/api`, the API contract or `chooseMonster`. No new dependency, font or image. No network, storage or logging.
- Existing tests that need the user's approval before they are edited during execution (the user already approved both files for this feature; ask once and record the answer): `src/components/notebook-css.test.ts` (new leaf classes and overrides) and `src/components/BestiaryPanel.test.ts` (append the hook file to `GUIDE_FILES`, hook source checks). Any other existing test that asserts "n / 14" or a page count also needs approval (none found). These must pass unedited: `motion-css.test.ts`, `high-contrast-css.test.ts`, `components.boundaries.test.ts`, `bestiary.test.ts`, `bestiary.property.test.ts`, `bestiary-pages.test.ts`, `bestiary-pages.property.test.ts`, `bestiary-wording.test.ts`, the dictionary parity and voice tests, the art tests.
- Tasks 18 to 20 all edit `BestiaryPanel.tsx`, so they run one after another.

- [x] 17. Spread helpers and property tests
  - Add `LayoutMode`, `spreadCount`, `clampSpread`, `spreadOf`, `pagesOfSpread`, `flipSpread`, `visiblePages` to `src/ui/bestiary.ts` as in `design.md`; total, pure, no DOM, network or storage API. Export them from `src/ui/index.ts`
  - Write `src/ui/bestiary-spreads.test.ts` (examples: 14 pages give 7 spreads, spread 0 is pages 0 and 1, spread 6 is pages 12 and 13, an odd count of 5 gives 3 spreads with a blank right leaf on the last, NaN and Infinity inputs, single mode `visiblePages`)
  - Write `src/ui/bestiary-spreads.property.test.ts` with PBT-139 (counts and clamps in range), PBT-140 (flip in range, ends stop), PBT-141 (walkable in `spreadCount - 1` flips), PBT-142 (mapping covers each page exactly once, parity), PBT-143 (a clicked page is visible in its spread), PBT-144 (mode change keeps the page), at least 100 runs each, tagged with the property number
  - Run `bestiary.test.ts`, `bestiary.property.test.ts`, `bestiary-pages.test.ts` and `bestiary-pages.property.test.ts`; they must pass unedited
  - _Requirements: REQ-BEST-12.2, REQ-BEST-12.3, REQ-BEST-12.4, REQ-BEST-12.6, REQ-BEST-12.7, REQ-BEST-12.8, REQ-BEST-12.15_
- [x] 18. Layout-mode hook and panel state, flip and focus logic
  - Write `src/components/use-layout-mode.ts` with `SPREAD_QUERY`, pure `readLayoutMode` and `useLayoutMode` (`useSyncExternalStore`, server snapshot `single`, `matchMedia` guarded, `change` listener removed on cleanup, no storage)
  - In `BestiaryPanel.tsx`: read the mode; keep `page` across mode changes; flip, jump, button absence and ArrowLeft/ArrowRight per the table in `design.md`; a navigation counter that drives focus to the left (or only) leaf heading and the announcement, so a resize alone does not move focus or announce; ends stop
  - Edit `BestiaryPanel.test.ts` (user-approved): append `use-layout-mode.ts` to `GUIDE_FILES`, add hook source checks (uses `matchMedia`, no storage, network or logging, default `single`), and add hook example tests with a fake `matchMedia` in a new file if the node environment needs it
  - Run `components.boundaries.test.ts`; it must pass unedited
  - _Requirements: REQ-BEST-12.1, REQ-BEST-12.5, REQ-BEST-12.6, REQ-BEST-12.7, REQ-BEST-12.8, REQ-BEST-12.11, REQ-BEST-12.13_
- [x] 19. Two-page markup and CSS
  - In `BestiaryPanel.tsx`: render a left and a right leaf (`th-notebook-leaves`, `th-notebook-leaf`, `-left`, `-right`, `data-layout`) in the one scroll area; contents on the left leaf of spread 0; each leaf heading `tabIndex -1`; `isLast` per leaf from its own page index so `bestiary.note` shows only on page `count - 1`; blank `aria-hidden` right leaf for an odd count; flip class on the right leaf for a forward flip and on the left leaf for a backward flip (single mode as before); wider dialog at 48rem and up
  - In `src/app/globals.css`: two-column leaf grid in spread mode, gutter and stitching at the centre, edges on both outer sides, ribbon at the gutter, the single-sheet layout below 48rem as before, a plain divider in high contrast; no new keyframes, no `clip-path`, no image, relative units, `--th-*` tokens only
  - Edit `notebook-css.test.ts` (user-approved): new leaf classes, overrides and the existing scan rules; keep current assertions that still apply
  - Run `notebook-css.test.ts`, `motion-css.test.ts`, `high-contrast-css.test.ts` and `components.boundaries.test.ts`
  - _Requirements: REQ-BEST-12.2, REQ-BEST-12.3, REQ-BEST-12.4, REQ-BEST-12.5, REQ-BEST-12.10, REQ-BEST-12.12, REQ-BEST-12.13, REQ-BEST-12.14, REQ-BEST-11.1, REQ-BEST-11.3, REQ-BEST-11.4_
- [x] 20. Indicator text and dictionary check
  - In `BestiaryPanel.tsx`: build the page range text ("1-2", or "3" in single mode and for a blank right leaf) and pass it as `current` to `bestiary.page.of` (indicator) and `bestiary.page.label` (announcement and scroll area label, `name` as the two page names joined by ", ")
  - Add no dictionary key. Confirm `t` accepts the text value (`Params` allows `string | number`). Only if it does not work, stop and ask the user before adding `bestiary.page.range` and changing the count to 17 in `bestiary-wording.test.ts`
  - Run `bestiary-wording.test.ts` (16 keys, no "safe" or "an toàn"), the dictionary parity and voice tests; they must pass unedited
  - _Requirements: REQ-BEST-12.9, REQ-BEST-08.1, REQ-BEST-08.2, REQ-BEST-07.1_
- [x] 21. Browser check and final checkpoint
  - Open the page at 1280 px width, at 320 px width and at 200 percent text size, and save a screenshot of each (spread 0, a middle spread, the last spread; a single page at 320 px)
  - Confirm: at 1280 px the left leaf shows the contents and the right leaf shows Bank, the indicator reads "1-2 / 14", next shows Prize and Job-bait, the last spread shows pages 13-14 with the closing note on the right leaf only, and next is absent there; a sticker jump shows its page in the spread; ArrowLeft and ArrowRight flip a spread; the forward flip turns the right leaf and the backward flip turns the left leaf; focus lands on the left leaf heading; resizing across 48rem keeps the page and moves no focus; at 320 px it is one page per step with 14 steps and no horizontal overflow; at 200 percent text no name is clipped and the buttons stay visible; high contrast and reduced motion drop decoration and motion
  - Run `vitest run` and `tsc --noEmit`; both must pass. Search the tests for any assertion of "n / 14" or page counts and ask the user before editing any besides the two approved files
  - Ask the user for review of the indicator wording ("1-2 / 14") and of the screen reader text
  - Ask the user, if questions arise
  - _Requirements: REQ-BEST-12.1, REQ-BEST-12.4, REQ-BEST-12.5, REQ-BEST-12.6, REQ-BEST-12.7, REQ-BEST-12.8, REQ-BEST-12.9, REQ-BEST-12.10, REQ-BEST-12.13, REQ-BEST-12.14_

## Follow-up 4: no indicator, scroll per page

Tasks 1 to 21 are done and stay as they are. Tasks 22 to 24 remove the visible page indicator and give each leaf its own scrollbar (see `requirements.md` Requirement 13 and `design.md`, "No indicator, scroll per leaf (revision 4)").

Rules for this follow-up:

- This follow-up supersedes the indicator wording ("1 / 14", "1-2 / 14", "14 / 14", "the indicator reads", "the indicator stay visible") and the single shared page-area scroll wording in tasks 9, 10, 12, 16, 19, 20 and 21 and in the first Note. Those tasks are not edited. The Bank sticker is still announced with "page 2".
- Keys: `bestiary.page.label` stays (live region and the label of each leaf scroll area). `bestiary.page.of` becomes unused and is removed from `en.ts` and `vi.ts`. The final set is 15 `bestiary.*` keys, equal in both languages (list in `design.md`).
- Existing tests that need the user's approval before they are edited during execution: `src/components/notebook-css.test.ts` and `src/components/BestiaryPanel.test.ts` (both already approved for this feature; confirm once), and `src/ui/bestiary-wording.test.ts` (count 16 becomes 15; **not yet approved, ask first**). These must pass unedited: the dictionary parity and voice tests, `motion-css.test.ts`, `high-contrast-css.test.ts`, `components.boundaries.test.ts`, `bestiary.test.ts`, `bestiary.property.test.ts`, `bestiary-pages*.test.ts`, `bestiary-spreads*.test.ts`, the art tests.
- No change to `src/core`, `src/analyzers`, `src/pipeline`, `src/server`, `src/app/api`, the API contract or `chooseMonster`. No new dependency, font or image. No network, storage or logging. No px font size.
- Tasks 22 and 23 both edit `BestiaryPanel.tsx` and `globals.css`, so they run one after another.

- [x] 22. Remove the visible indicator; settle the live region and keys
  - In `BestiaryPanel.tsx`: delete the visible `bestiary.page.of` text from the navigation row. Keep the polite live region with `bestiary.page.label` (range text, names joined by ", "), silent on first open and on a mode change alone
  - In `en.ts` and `vi.ts`: remove `bestiary.page.of`. Confirm no other file references it. Final set is the 15 keys in `design.md`; no kept text changes
  - Search `src` and `e2e` (including `e2e/hunt-flow.spec.ts`) for "n / 14", "1-2 / 14" and `bestiary.page.of`; ask the user before editing any file besides the three listed in the rules
  - Ask the user to approve the `bestiary-wording.test.ts` change, then change the count from 16 to 15 only. If the user declines, stop and revisit REQ-BEST-13.2 before continuing
  - Run the dictionary parity and voice tests and `bestiary-wording.test.ts`; no "safe" or "an toàn"
  - _Requirements: REQ-BEST-13.1, REQ-BEST-13.2, REQ-BEST-08.1, REQ-BEST-08.2, REQ-BEST-07.1_
- [x] 23. Per-leaf scroll containers, scrollbar styling and the navigation row
  - In `BestiaryPanel.tsx`: remove the shared scroll (`overflow-y-auto`, `tabIndex`, `aria-label` on the page area). For each leaf add a non-scrolling keyed wrapper (`th-notebook-leaf`, carries the flip class) around a scroll box (`th-notebook-leaf-scroll`, `role="region"`, `tabIndex` 0, `aria-label` from `bestiary.page.label` with that leaf's own page number and name). The blank right leaf of an odd count stays `aria-hidden` with no role, tab stop or label. Make sure the focus trap list includes the scroll areas
  - Navigation row: a slim `flex flex-wrap justify-between` row under the book with only the previous and next buttons (44 by 44, absent at the ends, same-size empty span in their place), no `sticky`, `fixed` or `absolute`
  - In `src/app/globals.css`: add the height chain and `.th-notebook-leaf-scroll` (`overflow-y: auto`, `min-height: 0`), the scrollbar rules with `scrollbar-width`, `scrollbar-color` and `::-webkit-scrollbar*` using `--th-*` tokens in `rem`, the focus ring, the high-contrast override; the page area stops scrolling. No new keyframes, no `clip-path`, no image
  - With the user's approval (already given for this feature; confirm once), edit `notebook-css.test.ts` and `BestiaryPanel.test.ts` as listed in `design.md`; keep every other assertion
  - Run `notebook-css.test.ts`, `BestiaryPanel.test.ts`, `motion-css.test.ts`, `high-contrast-css.test.ts` and `components.boundaries.test.ts`
  - _Requirements: REQ-BEST-13.3, REQ-BEST-13.4, REQ-BEST-13.5, REQ-BEST-13.6, REQ-BEST-13.7, REQ-BEST-13.8, REQ-BEST-13.9, REQ-BEST-12.5, REQ-BEST-12.10, REQ-BEST-12.14, REQ-BEST-05.10_
- [x] 24. Browser check and final checkpoint
  - Open the page at 1280 px width, at 320 px width and at 200 percent text size, and save a screenshot of each (spread 0, a middle spread, the last spread; a single sheet at 320 px)
  - Confirm: no page indicator text anywhere; only the previous and next buttons under the book, absent at the ends, 44 by 44, not sticky and not overlapping content; each leaf shows its own scrollbar when its content overflows (use 200 percent text or a short window) and scrolls without moving the other leaf; Tab reaches each leaf scroll area and the arrow keys scroll it; the accessibility tree names each leaf ("Page 2 of 14: ...") and the live region announces after a flip but not on open; the closing note is on page 13 only; focus lands on the heading of the first new leaf after a flip; no horizontal overflow at 320 px; high contrast keeps a visible scrollbar; reduced motion drops the flip
  - Run `vitest run` and `tsc --noEmit`; both must pass
  - Ask the user, if questions arise
  - _Requirements: REQ-BEST-13.1, REQ-BEST-13.2, REQ-BEST-13.3, REQ-BEST-13.4, REQ-BEST-13.5, REQ-BEST-13.6, REQ-BEST-13.7, REQ-BEST-13.8_

## Follow-up 5: button in the top-left corner

Tasks 1 to 24 are done and stay as they are. Tasks 25 and 26 move the notebook button from the `Frame` footer strip to the top-left corner of the page (see `requirements.md` Requirement 14 and `design.md`, "Button in the top-left corner (revision 5)").

Rules for this follow-up:

- This follow-up supersedes the words "Frame footer strip" in task 10 and in `design.md`, and REQ-BEST-04.5. Task 5 and task 10 are not edited.
- Placement contract: wrapper `pointer-events-none absolute left-3 top-3 z-20` (mirror of `TopControls`), width cap `calc(100% - 11.25rem)`, box height at most `3rem`, compact form (picture `1.75rem`, label wraps to two lines, never dropped), below `18rem` a second row at `top-[3.75rem]` with a `6.5rem` spacer in `Frame`. Exact classes are settled in the browser check.
- `Frame`: remove the `footer` prop and strip (dead code); add the optional `guide` slot as the first child. No test references `footer` on `Frame`.
- Existing tests: expected unedited are `BestiaryPanel.test.ts` and `notebook-css.test.ts` (both already approved for this feature, confirm once if an edit is needed), `focus.test.ts`, `TopControls.test.ts`, `components.boundaries.test.ts`, `high-contrast-css.test.ts`, `motion-css.test.ts`. **`e2e/hunt-flow.spec.ts` is not approved: stop and ask the user before editing it.** The new file `src/components/Frame.test.ts` needs no approval.
- No change to `src/core`, `src/analyzers`, `src/pipeline`, `src/server`, `src/app/api`, the API contract or `chooseMonster`. No new dependency, color token, icon, font, image, dictionary key or animation. No `px` font size. `BestiaryButton` props do not change.
- Task 26 needs task 25.

- [x] 25. Move the button to the top-left corner and remove the Frame footer
  - In `Frame.tsx`: remove the `footer` prop and its strip; add `guide?: ReactNode` rendered first (before `main`), with the narrow-case spacer (`aria-hidden`, `h-[6.5rem] shrink-0 min-[18rem]:hidden`) only when `guide` is set; update the prop comments
  - In `BestiaryButton.tsx`: add the corner wrapper (`pointer-events-none absolute left-3 top-3 z-20 max-w-[calc(100%-11.25rem)]`, and below `18rem` `top-[3.75rem]` with `max-w-[calc(100%-1.5rem)]`), the compact classes (picture `h-7 w-7`, label wraps up to two lines, box at most `3rem` high, `min-h-11 min-w-11`) and keep the native button, `aria-haspopup`, `aria-expanded`, `FOCUS_RING`, decorative picture, visible `bestiary.open` and the same props
  - In `App.tsx`: change `footer={...}` to `guide={...}`; keep `guideOpen`, `guideButtonRef` and the panel as they are
  - Write `src/components/Frame.test.ts` (new): with a `guide` the slot and the spacer render before `main`; without it neither renders; `Frame.tsx` source has no `footer`
  - Confirm no test or file references the removed `footer` prop (search `src` and `e2e`); `BestiaryPanel.test.ts` (props and forbidden-API checks on `BestiaryButton.tsx`) and `focus.test.ts` pass unedited
  - Run `Frame.test.ts`, `BestiaryPanel.test.ts`, `focus.test.ts`, `TopControls.test.ts`, `components.boundaries.test.ts` and `tsc --noEmit`
  - _Requirements: REQ-BEST-14.1, REQ-BEST-14.2, REQ-BEST-14.3, REQ-BEST-14.4, REQ-BEST-14.5, REQ-BEST-14.6, REQ-BEST-14.8, REQ-BEST-04.1, REQ-BEST-04.2, REQ-BEST-04.3, REQ-BEST-04.4_
- [x] 26. Browser check and final checkpoint
  - Open the page at 1280 px width, at 320 px width and at 200 percent text size, and save a screenshot of each in the states idle (home and bag), working (hunting), done (revealed) and failed (lost)
  - Confirm: the button sits in the top-left corner in every state; it never overlaps `TopControls`, the title, the hunter or the bag input at 1280 px, at 320 px (100 percent text) and at 320 px with 200 percent text (second row, spacer, content starts below it); the label `bestiary.open` is visible and not clipped in English and Vietnamese; the target is at least 44 by 44; the button box ends inside the `3.75rem` top space while the viewport is `18rem` or wider
  - Confirm: Tab reaches the button first after the skip link; Enter opens the panel with `aria-expanded` true; Escape closes it and focus returns to the button; the button is covered by the overlay while the panel is open; high contrast keeps it visible; the page state, input and files are unchanged after open and close
  - If the layout at 320 px with 200 percent text leaves too little room for content, adjust the spacer or the reserve within the contract of `design.md` and report it
  - Run `vitest run` and `tsc --noEmit`; both must pass. Run `e2e/hunt-flow.spec.ts` if the environment allows, and ask the user before editing it
  - Ask the user, if questions arise
  - _Requirements: REQ-BEST-14.1, REQ-BEST-14.2, REQ-BEST-14.3, REQ-BEST-14.4, REQ-BEST-14.5, REQ-BEST-14.6, REQ-BEST-14.7, REQ-BEST-14.8_

## Notes

- Follow-up 5 (requested by the user, top-left corner chosen with the user because the top-right holds `TopControls`): this supersedes the "Frame footer strip" wording in task 10, in `design.md` and REQ-BEST-04.5. The button keeps its behavior; only its place changes.
- Follow-up 4 (requested by the user): this supersedes the visible indicator wording ("n / 14", "1-2 / 14") and the single shared page-area scroll wording in the tasks, requirements and design above. The previous and next buttons stay. The live region and the per-leaf labels keep the page position for assistive technology.
- Decisions confirmed by the user: the flip lasts 1 second (`motion-css.test.ts` is not edited); `bestiary.note` is shown on the last page only; page numbering is the 0-based page plus one ("1 / 14" on the contents page, the Bank line says page 2); `BestiaryPanel.test.ts` is edited with user approval.
- Follow-up 3 (confirmed with the user): wide screens use both pages and each flip turns a pair; this supersedes "one logical page at a time" on wide screens and the rule that content is on the right page only. Narrow screens keep one logical page per step.
- No task here is marked done.

## Task Dependency Graph

Tasks 1 to 6 are complete and omitted. Tasks 8 and 9 touch different files but task 9 uses the new keys. Tasks 13 to 16 are in waves 4 to 6: task 13 edits the dictionary, tasks 14 and 15 edit different files, and task 16 checks everything. Tasks 17 to 21 are in waves 7 to 11, one per wave: task 17 adds the helpers, and tasks 18 to 20 all edit `BestiaryPanel.tsx`, so they run in sequence before task 21 checks everything. Tasks 22 to 24 are in waves 12 to 14, one per wave: task 22 removes the indicator and the key, task 23 edits `BestiaryPanel.tsx` and `globals.css` after it, and task 24 checks everything. Tasks 25 and 26 are in waves 15 and 16, one per wave: task 25 edits `Frame.tsx`, `BestiaryButton.tsx` and `App.tsx` after task 24, and task 26 checks everything. Follow-up 5 supersedes the "Frame footer strip" wording of task 10.

```json
{
  "waves": [
    { "id": 0, "tasks": ["7", "8"] },
    { "id": 1, "tasks": ["9"] },
    { "id": 2, "tasks": ["10", "11"] },
    { "id": 3, "tasks": ["12"] },
    { "id": 4, "tasks": ["13"] },
    { "id": 5, "tasks": ["14", "15"] },
    { "id": 6, "tasks": ["16"] },
    { "id": 7, "tasks": ["17"] },
    { "id": 8, "tasks": ["18"] },
    { "id": 9, "tasks": ["19"] },
    { "id": 10, "tasks": ["20"] },
    { "id": 11, "tasks": ["21"] },
    { "id": 12, "tasks": ["22"] },
    { "id": 13, "tasks": ["23"] },
    { "id": 14, "tasks": ["24"] },
    { "id": 15, "tasks": ["25"] },
    { "id": 16, "tasks": ["26"] }
  ]
}
```
