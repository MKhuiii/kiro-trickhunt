# Requirements Document

## Introduction

A "field guide" (sổ tay) that lets a user browse every scam monster and every
link creature before or without running a check. A notebook button on the page
opens a panel that looks like a hunter's field notebook. The user flips pages,
one page at a time. Page 0 is a table of contents. Each of the 13 entries then has
its own page with its art, description and warning signs (14 pages in total).

Numbering: new `REQ-BEST-` series. `PBT-131` to `PBT-134` exist. The notebook
revision (Requirements 10 and 11) adds `PBT-135` onward.

**Revision history:** The first version (tasks 1 to 6, done) showed a list of
entry buttons and a detail view. The revision (tasks 7 to 12) replaces that model
with the notebook. Requirements 5 and 6 are rewritten, Requirements 10 and 11 are
new, and the finished tasks 1 to 6 are kept as they were.

**Revision 2 (follow-up 2, tasks 13 to 16):** the contents page becomes small pictures
with short names, laid out like stickers or paper scraps pasted into the notebook, and
the whole panel looks like an open notebook lying on a table. Requirement 6 criteria 1
to 3 are rewritten, 6.10 and 6.11 are new, Requirement 11 criteria 6 and 8 are rewritten
and 11.9 to 11.12 are new. The notebook still shows one logical page at a time.

**Revision 3 (follow-up 3, tasks 17 to 21):** on wide screens the notebook uses BOTH pages of the open book. Each flip turns a pair of pages (a spread), and the left and right page both hold real content. Below the 48rem breakpoint the notebook stays one logical page per step. Requirement 12 is new. It supersedes the "one logical page at a time" wording for wide screens (Requirement 5 criteria 5.10 to 5.14, Requirement 11 criteria 11.2, 11.9 and the revision 2 decision "no second page of content") and the earlier rule that content sits on the right page only. Each superseded criterion is marked in place and listed in the table at the start of Requirement 12.

**Revision 4 (follow-up 4, tasks 22 to 24):** the visible page indicator ("n / 14", "1-2 / 14") is removed, and each leaf scrolls on its own with its own scrollbar. Requirement 13 is new. It supersedes the indicator wording and the single shared page-area scroll in Requirement 5 criteria 5.7, 5.11 and 5.14 (indicator part), Requirement 8 criterion 8.1 (key count), Requirement 12 criteria 12.9 and 12.13, the "Page numbering" decision below, and the glossary entry "Last page". Each superseded text is marked in place and listed in Requirement 13. Tasks 1 to 21 are not edited.

**Revision 5 (follow-up 5, tasks 25 to 26):** the notebook button moves from the `Frame` footer strip to the top-left corner of the page frame (the top-right corner already holds `TopControls`). Requirement 14 is new. It supersedes Requirement 4 criterion 4.5 and every mention of the "Frame footer strip" in `design.md` and in tasks 5 and 10. Each superseded text is marked in place. Tasks 1 to 24 are not edited.

**Decisions made with the user:**

- Two-page spread (revision 3, confirmed with the user): every flip on a wide screen turns a pair of pages. Spread 0 shows the contents on the left and the Bank page on the right. Then each spread shows two consecutive creatures. Narrow screens keep one logical page per step (14 steps).
- Contents page (revision 2): each of the 13 entries is a sticker button with small decorative art and its short name. No dotted leaders and no page number on the visible line. Pressing a sticker flips to that page. The two groups are separated by two handwritten-style headings that use the existing `--th-hand` font token (no new font, no new dependency).
- Notebook look (revision 2): an open notebook on a table. On wide screens a two-page spread look made only by styling (centre gutter shadow, paper texture, stacked page edges, ribbon, stitched binding) that still shows ONE logical page; no second page of content. On narrow screens it is a single sheet.

- Placement: a panel opened from a clickable notebook picture, inside the existing page. There is no new route.
- Presentation (revision): a field notebook the user flips through. Not a panel of clickable tiles and not a list-plus-detail view.
- Paging (revision): one page at a time, with a CSS page-flip effect. Page 0 is a table of contents of picture stickers (revision 2; first revision had plain text lines); then one page per entry.
- Closing note (revision): `bestiary.note` is shown on the last page only (the final entry page, page index count - 1), not on the contents page and not on any other page.
- Page numbering (confirmed, revised): the contents page reads "1 / 14" in the indicator. The page number of an entry is no longer visible on the contents page; screen readers still hear it (for example the Bank sticker is announced with "page 2"). SUPERSEDED by revision 4 for the indicator part: there is no visible indicator any more. The page number is heard through the live announcement and the leaf labels (REQ-BEST-13.1, 13.2). The Bank sticker is still announced with "page 2".
- No visible indicator, one scrollbar per leaf (revision 4, requested by the user): the text under the notebook is removed, only the previous and next buttons remain, and the left leaf and the right leaf (or the single sheet) each scroll alone.
- Flip duration (confirmed): 1 second, as `motion-css.test.ts` requires. That test is not edited.
- Entries: the five scam monsters plus the eight link creatures.
- Each entry shows its type: "Scam monster" or "Link creature". Link creatures also show their tone label.
- Data is static. No server call, no LLM, no storage.
- English first. Vietnamese strings are added as drafts only because the dictionary parity test requires every key in both tables.

**Assumption to confirm:** "add the link creature type to each entry" is read as
a type label on every entry, not as new link creature kinds. No new creature is
invented by this spec.

**Hard constraints:**

- No change to `src/core/`, `src/analyzers/`, `src/pipeline/`, `src/server/`, `src/app/api/`, the `POST /api/analyze` contract, `chooseMonster` or the scoring.
- The guide never changes, reads or depends on the current check or result. Opening it does not reset the page state.
- No network request, no storage write (no `localStorage`, no cookie), no logging. Nothing the user typed is read by the guide.
- No new dependency. Tests run in `node` with fakes, as in existing specs.
- Wording: the word "safe" never appears as a verdict. Link wording follows `link-creatures` (a link "has traits of", never "fake", "malicious" or "dangerous" as a fact). The guide does not claim that a message matching no entry is fine.
- No fixed-pixel font sizes on user-facing text. Art is decorative and has no text.
- Entry text reuses existing dictionary keys. Only the chrome text of the guide is new.

## Existing requirements and tests this spec modifies

| Item | Change |
|---|---|
| REQ-UI-07 | Unchanged rule. New Vietnamese strings are listed in `design.md`, flagged draft. |
| REQ-VOICE-01, REQ-VOICE-04 | Extended: `TIER_RULES` in `src/ui/i18n/voice.ts` gets the prefix `bestiary.` in the tier B (meaning first) rule. No existing key moves tier. |
| `src/ui/index.ts` | Edited: new exports (REQ-BEST-03). |
| `src/components/art/registry.tsx` | Edited: one new art id, `notebook`. |
| `src/components/App.tsx` | Edited: open/close state and the two new components. |
| `src/ui/bestiary.ts` (revision) | Edited: page helpers `pageCount`, `clampPage`, `flipTarget`, `entryForPage` (REQ-BEST-10). |
| `src/app/globals.css` (revision) | Edited: new `.th-notebook*` classes and two start-only keyframes (REQ-BEST-11). The existing reduced-motion blocks already cover them. |
| `src/components/BestiaryPanel.tsx` (revision) | Rewritten as the notebook. `nextFocusIndex` and its props stay. |
| PBT-100, PBT-101, PBT-102 | Not edited. They iterate every key through `tierOf`, so they cover the new keys. |
| `components.boundaries.test.ts` | Not edited. It must still pass (no `fetch`, no server import, no runtime pipeline import in components). |

No existing test file was edited by the first version (tasks 1 to 6).

**Revision: one existing test file is edited, with user approval.**

| Test file | Change | Why |
|---|---|---|
| `src/components/BestiaryPanel.test.ts` | Edited with user approval. The `GUIDE_FILES` list gains `NotebookPage.tsx` and `NotebookContents.tsx` so REQ-BEST-07.3 covers them, and the props check also covers them. PBT-134 and every existing assertion stay as they are. | REQ-BEST-07.3 applies to every guide file, including new ones. |
| `src/ui/bestiary.test.ts`, `src/ui/bestiary.property.test.ts` | Not edited. New tests go in new files `bestiary-pages.test.ts` and `bestiary-pages.property.test.ts`. | Keeps PBT-131 to PBT-133 untouched. |
| Dictionary parity and voice tests (`PBT-100` to `PBT-102` and the parity test) | Not edited. They iterate every key, so they cover the new keys and no longer see the removed ones. | See REQ-BEST-08. |
| `src/components/notebook-css.test.ts` (revision 2) | **Needs user approval during execution.** New assertions only for the new classes (no px font size, no clip-path, high-contrast overrides for spread, stitching, sticker); current assertions stay. | REQ-BEST-11.8, 11.9, 11.11 |
| `src/components/BestiaryPanel.test.ts` (revision 2) | **Needs user approval during execution, only if used.** Possible new source checks: `NotebookContents.tsx` uses `Art`/`LinkCreatureArt` and no visible `toc.page` outside visually hidden text. Current assertions stay. | REQ-BEST-06.2, 06.10 |
| `src/ui/bestiary-wording.test.ts` (revision 2) | **No edit expected.** The key count stays 16 because no key is added or removed. It needs approval only if the user chooses to add a key. | REQ-BEST-08.1 |
| `src/components/notebook-css.test.ts` (revision 3) | **Needs user approval during execution (the user has already approved editing this file in this feature).** Assertions for the new leaf classes, the two-column leaf grid, and high-contrast overrides for them; current assertions stay unless they contradict a single-column page area. | REQ-BEST-12.12, 12.14 |
| `src/components/BestiaryPanel.test.ts` (revision 3) | **Needs user approval during execution (already approved for this feature).** `GUIDE_FILES` gains the layout-mode hook file; new source checks for the hook (uses `matchMedia`, no storage, server default `single`) and for `bestiary.note` staying behind `isLast`. | REQ-BEST-12.1, 12.11, 12.4 |
| `src/ui/bestiary-pages.test.ts`, `bestiary-pages.property.test.ts`, `bestiary-wording.test.ts`, `art*.test.ts` (revision 3) | Not edited. New spread tests go in new files. The key count stays 16 unless the fallback in REQ-BEST-12.9 is used. | REQ-BEST-12.15 |
| `motion-css.test.ts`, `high-contrast-css.test.ts`, `components.boundaries.test.ts` | Not edited. They must still pass. The new keyframes change only `transform` and `opacity`, describe only the start, and last 1 second, as that test requires. | REQ-BEST-11. |
| `src/components/notebook-css.test.ts` (revision 4) | **Needs user approval during execution (the user has already approved editing this file in this feature).** Assertions for the leaf scroll class (`overflow-y: auto`, scrollbar tokens, no px size, high-contrast override); the page area stops being the scroll box, so any assertion that it scrolls is adjusted. Every other assertion stays. | REQ-BEST-13.3, 13.4, 13.6 |
| `src/components/BestiaryPanel.test.ts` (revision 4) | **Needs user approval during execution (the user has already approved editing this file in this feature).** New source checks: no `bestiary.page.of` in the panel; each leaf scroll area has `tabIndex`, `role="region"` and an `aria-label` from `bestiary.page.label`; the nav row has no sticky class. Current assertions stay. | REQ-BEST-13.1, 13.3, 13.5 |
| `src/ui/bestiary-wording.test.ts` (revision 4) | **Needs user approval during execution (NOT yet approved).** The key count 16 becomes 15 because `bestiary.page.of` is removed (REQ-BEST-13.2). If the user declines, `bestiary.page.of` must stay and REQ-BEST-13.2 changes. | REQ-BEST-13.2 |
| `en.ts`, `vi.ts` dictionary tables (revision 4) | Edited (not a test): `bestiary.page.of` removed from both. The dictionary parity and voice tests are not edited and must pass. | REQ-BEST-13.2 |
| Any other test asserting "n / 14", "1-2 / 14" or `bestiary.page.of` | None found in `src` and `e2e` (checked while writing this revision). Task 22 searches again, including `e2e/hunt-flow.spec.ts`, and asks before editing any other file. | REQ-BEST-13.1 |

**Revision 5 (button in the top-left corner).** Checked against the source while writing this revision: no test reads or renders the `footer` prop of `Frame` (the only `<footer` in a test is the unrelated journal footer in `JournalSheet.test.ts`), and no test or e2e file references the notebook button or `bestiary.open` outside `BestiaryPanel.test.ts`.

| Item | Change | Approval |
|---|---|---|
| `src/components/Frame.tsx` | Edited (not a test): the optional `footer` prop and its strip are removed (dead code); a new optional `guide` slot for the top-left corner is added. | none |
| `src/components/BestiaryButton.tsx` | Edited (not a test): adds its own corner wrapper and compact classes. Props stay (`locale`, `open`, `onClick`, `buttonRef`). | none |
| `src/components/App.tsx` | Edited (not a test): `footer={...}` becomes `guide={...}`. | none |
| `src/components/BestiaryPanel.test.ts` | Reads `BestiaryButton.tsx` for the forbidden-API scan and the props check. **Expected unedited.** If an edit is needed, the user already approved editing this file for this feature; confirm once. | already approved |
| `src/components/notebook-css.test.ts` | **Expected unedited**: placement uses utility classes in components and no new rule in `globals.css`. If a CSS rule is added after all, the user already approved editing this file; confirm once. | already approved |
| `src/components/focus.test.ts` | Renders `Frame` with only `step` and `children`, so it is unaffected by the new slot. Must pass unedited. | none (not edited) |
| `src/components/TopControls.test.ts`, `components.boundaries.test.ts`, `high-contrast-css.test.ts`, `motion-css.test.ts` | Must pass unedited. | none (not edited) |
| `e2e/hunt-flow.spec.ts` | **Expected unedited** (it does not reference the button or the Frame footer). If the new position breaks a locator or a click, stop and ask the user before editing it. | **needs user approval during execution (NOT yet approved)** |
| `src/components/Frame.test.ts` | New file (no approval needed): the `guide` slot renders, the spacer is present only with a guide, and `Frame.tsx` has no `footer`. | none (new file) |

## Glossary

- **Field guide**: The panel and the data behind it.
- **Entry**: One monster or one link creature in the guide.
- **Kind**: `monster` or `link`.
- **Notebook**: The panel as a book of 14 pages. Only one page is shown at a time.
- **Page**: A 0-based index. Page 0 is the contents page; page n (1 to 13) shows entry n of the table. Users see the index plus one.
- **Contents page**: Page 0. One sticker button per entry, with small decorative art and the short name, in two groups.
- **Sticker**: A contents button styled like a paper scrap pasted into the notebook. A sticker is a native button.
- **Hand heading**: A group heading on the contents page set in the existing `--th-hand` font (class `th-hand`).
- **Spread look** (superseded by revision 3): The two-page open-book appearance of the panel on wide screens. In revisions 1 and 2 it was decoration only and held one logical page. From revision 3 it holds two logical pages (see Spread).
- **Layout mode**: `spread` (viewport at least 48rem wide) or `single` (narrower, and the default before the browser is measured, including on the server).
- **Spread**: In spread mode, a pair of logical pages shown together. Spread s shows page 2s on the left leaf and page 2s + 1 on the right leaf. A page with no partner (odd count) leaves the right leaf blank.
- **Leaf**: One visible page of the open book (left or right). In single mode there is one leaf.
- **Focused page**: The logical page index kept in the panel state. In spread mode it is the left page of the spread after a flip, and the clicked page after a sticker jump.
- **Visually hidden text**: Text kept for assistive technology and removed from the visual layout (the project's `sr-only` pattern).
- **Last page**: The final entry page, page index `count - 1` (page number 14; the visible "14 / 14" indicator is SUPERSEDED by revision 4, the number is now only in the announcement and the leaf label). It is the only page that shows `bestiary.note`.
- **Leaf scroll area**: Revision 4. The scrolling box of one leaf. It has its own scrollbar, its own keyboard focus stop (`tabIndex` 0), `role="region"` and an accessible name from `bestiary.page.label`.
- **Navigation row**: Revision 4. A slim row under the book holding only the previous and next buttons.
- **Flip**: A change of the current page by one step or by a jump from the contents page.
- **Direction**: `next` (towards the last page) or `prev` (towards page 0).

## Requirements

### Requirement 1: Entry table

**User Story:** As a family helper, I want one list of every monster and creature, so that I can learn the patterns before a message arrives.

```ts
type EntryKind = "monster" | "link";

interface BestiaryEntry {
  readonly id: string;                      // unique across both kinds, e.g. "monster:bank", "link:hydra"
  readonly kind: EntryKind;
  readonly nameKey: MessageKey;
  readonly descKey: MessageKey;             // monster.<id>.short or link.<id>.desc
  readonly tipKeys: readonly MessageKey[];  // exactly the existing tip1..tip3 keys
  readonly artKey: string;
  readonly colorToken: ColorToken;
  readonly toneLabelKey?: MessageKey;       // link entries only
  readonly toneExplainKey?: MessageKey;     // link entries only; honors LinkCreature.explanationKey
}
const BESTIARY_ENTRIES: readonly BestiaryEntry[];   // src/ui/bestiary.ts
```

#### Acceptance Criteria

1. THE table SHALL hold exactly 13 entries: the five monsters of `MONSTER_PRESENTATION` except `neutral`, in the order bank, prize, job-bait, authority, generic, then every creature of `LINK_CREATURES` in its order. REQ-BEST-01.1
2. THE `neutral` candle SHALL NOT be an entry. It stands for "no signals", and showing it as a creature could read as a safety claim. REQ-BEST-01.2
3. THE table SHALL be derived from `MONSTER_PRESENTATION` and `LINK_CREATURES`. It SHALL NOT repeat their name keys, art keys or color tokens by hand. REQ-BEST-01.3
4. EVERY `nameKey`, `descKey`, `tipKeys`, `toneLabelKey` and `toneExplainKey` SHALL be a key of the English dictionary, and every entry SHALL have at least one tip. REQ-BEST-01.4
5. `id` values SHALL be unique. REQ-BEST-01.5
6. A link entry SHALL carry the tone label and explanation of its `LinkCreature` (`explanationKey` when present, else the tone's `explanationKey`). A monster entry SHALL carry neither. REQ-BEST-01.6

### Requirement 2: Grouping and kind label

**User Story:** As a user, I want to see at a glance which entries are scam monsters and which are link creatures.

#### Acceptance Criteria

1. THE function `groupEntries(entries)` SHALL return two groups in order: `monsters`, then `links`, each keeping table order. REQ-BEST-02.1
2. EVERY entry SHALL show a kind label: `bestiary.kind.monster` or `bestiary.kind.link`. THE kind SHALL NOT be shown by color alone. REQ-BEST-02.2
3. A link entry SHALL also show its tone label and tone explanation on its page. REQ-BEST-02.3
4. THE function `findEntry(id)` SHALL return the entry or `undefined`. It SHALL NOT throw for any string. REQ-BEST-02.4

### Requirement 3: Public surface

#### Acceptance Criteria

1. `src/ui/index.ts` SHALL export `BESTIARY_ENTRIES`, `groupEntries`, `findEntry` and the types `BestiaryEntry` and `EntryKind`. REQ-BEST-03.1
2. THE module `src/ui/bestiary.ts` SHALL import only types from `src/pipeline/` and SHALL use no DOM, network or storage API. REQ-BEST-03.2
3. `src/ui/index.ts` SHALL also export `pageCount`, `clampPage`, `flipTarget`, `entryForPage` and the type `FlipDirection`. REQ-BEST-03.3

### Requirement 4: Notebook button

**User Story:** As a user, I want a picture of a notebook that I can click, so that I find the guide without reading menus.

#### Acceptance Criteria

1. THE page SHALL show a button with a notebook picture (art id `notebook`) in every page state (idle, working, done, failed). REQ-BEST-04.1
2. THE button SHALL have a visible text label `bestiary.open`. The picture is decorative (`aria-hidden`). REQ-BEST-04.2
3. THE button SHALL be a native `<button type="button">`, reachable by keyboard, with the shared `FOCUS_RING`, and SHALL have `aria-expanded` and `aria-haspopup="dialog"`. REQ-BEST-04.3
4. THE button target SHALL be at least 44 by 44 CSS pixels. REQ-BEST-04.4
5. THE button SHALL NOT overlap the top-right controls or the input area at a 320 CSS pixel viewport width. REQ-BEST-04.5 SUPERSEDED in revision 5 by REQ-BEST-14.1 to 14.5: the button no longer sits in the `Frame` footer strip, it sits in the top-left corner, and the no-overlap rule is made measurable there (also at 200 percent text).

### Requirement 5: Notebook dialog and page navigation

**User Story:** As an elderly user, I want a notebook that I read one page at a time with big text, one obvious way to turn pages and one obvious way to close it.

Revision (follow-up to tasks 1 to 6): the first version listed entries as buttons and opened a detail view. It is replaced by a field notebook the user flips through, one page at a time. Criteria 5.1 to 5.5 and 5.8 are unchanged from the first version.

#### Acceptance Criteria

1. THE panel SHALL be an element with `role="dialog"`, `aria-modal="true"` and `aria-labelledby` pointing at its title (`bestiary.title`). REQ-BEST-05.1
2. ON open, focus SHALL move into the panel. ON close, focus SHALL return to the notebook button. REQ-BEST-05.2
3. THE key Escape SHALL close the panel, except while an IME composition is active. REQ-BEST-05.3
4. WHILE the panel is open, Tab and Shift+Tab SHALL stay inside it. REQ-BEST-05.4
5. THE panel SHALL have a visible text close button (`bestiary.close`) with a target of at least 44 by 44 CSS pixels. REQ-BEST-05.5
6. WHEN the panel opens, THE panel SHALL show page 0, the contents page, with no earlier page remembered. REQ-BEST-05.6
7. THE page area SHALL scroll inside itself when its content is taller than the viewport, and SHALL stay usable at a 320 CSS pixel viewport width and at 200 percent browser text size. SUPERSEDED by REQ-BEST-13.3 for the scrolling part (each leaf scrolls, not one shared page area); the 320 px and 200 percent part is kept by REQ-BEST-13.7. REQ-BEST-05.7
8. OPENING or closing the panel SHALL NOT change `PageState`, the input text, the selected files or the preferences. REQ-BEST-05.8
9. THE panel SHALL NOT persist anything, including which page was last open. Its only state is the current page index and the direction of the last flip. REQ-BEST-05.9
10. THE panel SHALL show two text buttons, `bestiary.page.prev` and `bestiary.page.next`, each with a target of at least 44 by 44 CSS pixels. THE previous button SHALL NOT be rendered on page 0 and THE next button SHALL NOT be rendered on the last page, so an unavailable action is absent as text and position, never shown by color alone. Revision 3: this holds in single mode; in spread mode the buttons turn a spread (REQ-BEST-12.6). REQ-BEST-05.10
11. THE panel SHALL show a visible page indicator in the form "{current} / {total}" (for example "3 / 14") where "current" is the page index plus one. Revision 3: this holds in single mode; in spread mode the indicator shows a range (REQ-BEST-12.9). SUPERSEDED by REQ-BEST-13.1: no visible indicator is shown. REQ-BEST-05.11
12. WHILE focus is inside the dialog, THE key ArrowRight SHALL flip to the next page and THE key ArrowLeft SHALL flip to the previous page. THE panel SHALL ignore these keys at the ends, during an IME composition and when Ctrl, Alt or Meta is held. Revision 3: in spread mode the keys flip a spread (REQ-BEST-12.6). REQ-BEST-05.12
13. AFTER a page change by button, key or contents line, THE panel SHALL move focus to the heading of the new page (`tabIndex` -1). Revision 3: in spread mode focus goes to the heading of the left leaf, the first newly shown page (REQ-BEST-12.5). REQ-BEST-05.13
14. AFTER a page change, THE panel SHALL announce the new page politely (an `aria-live="polite"` region with `bestiary.page.label`, giving the page number, the total and the page name). THE panel SHALL NOT announce on first open. Revision 4: this criterion is KEPT as written and is now the main way the position is given to assistive technology (REQ-BEST-13.2). REQ-BEST-05.14
15. THE panel SHALL NOT keep a selected entry and SHALL NOT have a "back to list" button. REQ-BEST-05.15

### Requirement 6: Contents page and entry pages

**User Story:** As a family helper, I want a table of contents and one page per creature, so that I can find a pattern and read all of it in one place.

#### Acceptance Criteria

1. THE contents page (page 0) SHALL show the heading `bestiary.toc.heading`, the line `bestiary.toc.intro`, then the Hand heading `bestiary.group.monsters` with the five monster stickers, then the Hand heading `bestiary.group.links` with the eight link creature stickers, in table order. THE two group headings SHALL use the existing `--th-hand` font through the `th-hand` class, with no new font file and no new dependency. REQ-BEST-06.1
2. EACH sticker SHALL show small decorative art (`Art` for a monster, `LinkCreatureArt` for a link creature, `aria-hidden`) and the entry name (`nameKey`) as visible text. THE visible sticker SHALL NOT show a page number, the text of `bestiary.toc.page`, a dotted leader or a kind label as visible text. THE entry at table position n (starting at 1) SHALL be on page index n, shown to the user as page number n + 1. REQ-BEST-06.2
3. EACH sticker SHALL be a native `<button type="button">` that flips to the page of its entry, with a target of at least 44 by 44 CSS pixels and the shared `FOCUS_RING`. THE contents page SHALL NOT show `bestiary.note`. REQ-BEST-06.3
4. A link entry's page SHALL include the existing note `link.plain.note` (links are shown as plain text, never opened). REQ-BEST-06.4
5. ALL text SHALL use relative units (`rem`, `em`, Tailwind text scale), with no fixed-pixel font size. REQ-BEST-06.5
6. EVERY entry page SHALL render art through the existing `Art` registry (monsters) or `LinkCreatureArt` (link creatures). A missing art id SHALL fall back as `Art` already does. REQ-BEST-06.6
7. THE notebook SHALL have one page per entry plus the contents page: 14 pages for the 13 entries. REQ-BEST-06.7
8. EACH entry page SHALL show, in this order: the art, the name as a heading, the kind label, the description, and the heading `bestiary.signs.heading` with the tips as a list. FOR a link entry, THE page SHALL also show the tone label and tone explanation after the description. REQ-BEST-06.8
9. THE last page (page index `count - 1`) SHALL show the closing note `bestiary.note` after the rest of its content, and no other page SHALL show it. REQ-BEST-06.9
10. THE accessible name of each sticker SHALL include the entry name, the kind label (`bestiary.kind.monster` or `bestiary.kind.link`) and the page text (`bestiary.toc.page` with `{page}` set to the page index plus one), supplied as visually hidden text inside the button. THE kind of an entry SHALL therefore be given in words, by the visually hidden kind label and by the group heading, and never by color or art alone. REQ-BEST-06.10
11. THE stickers SHALL wrap to the available width, showing 2 to 3 per row at a 320 CSS pixel viewport width and more per row on wider screens. THE contents page SHALL NOT overflow horizontally at 320 CSS pixels width and at 200 percent text size, and all sticker sizes and spacing SHALL use relative units. A long name SHALL wrap inside its sticker and SHALL NOT be clipped. REQ-BEST-06.11

### Requirement 7: Wording and privacy

#### Acceptance Criteria

1. NO English or Vietnamese text of a new key SHALL contain the word "safe" (or "an toàn") as a verdict, "dangerous", "malicious" or "fake" as a fact about a link. REQ-BEST-07.1
2. `bestiary.note` SHALL say that a message can match no entry and still be a scam. REQ-BEST-07.2
3. THE guide code (`src/ui/bestiary.ts` and every guide component file: `BestiaryButton.tsx`, `BestiaryPanel.tsx`, `NotebookPage.tsx`, `NotebookContents.tsx`) SHALL contain no `fetch(`, `XMLHttpRequest`, `sendBeacon`, `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie` or `console.`. REQ-BEST-07.3
4. THE guide SHALL NOT receive the verdict, the input text or the files as props. This applies to every guide component. REQ-BEST-07.4

### Requirement 8: Dictionary

#### Acceptance Criteria

1. THE English and Vietnamese tables SHALL both hold exactly the 16 `bestiary.*` keys of the final set listed in `design.md` and no other `bestiary.*` key. Revision: `bestiary.intro` and `bestiary.back` are removed from both tables, nine keys are kept, and seven keys are added. Revision 2: no key is added or removed; `bestiary.toc.page` stays as visually hidden text and only the text of `bestiary.toc.intro` changes in both languages (it says "picture" instead of "line"). No key outside the `bestiary.` prefix changes. Revision 4: the count 16 is SUPERSEDED by REQ-BEST-13.2: `bestiary.page.of` is removed and the final set is 15 keys. REQ-BEST-08.1
2. EVERY new key SHALL be classified by `tierOf` as tier B, and the existing voice property tests SHALL pass without edits. REQ-BEST-08.2
3. THE Vietnamese strings SHALL be flagged draft in `design.md`. REQ-BEST-08.3

### Requirement 9: Notebook art

#### Acceptance Criteria

1. THE registry SHALL gain the id `notebook`, an original SVG with no text, no `<title>`, no filter and no animation, as the other registry pieces. REQ-BEST-09.1
2. THE existing `art-budget.test.ts` and `registry.test.ts` SHALL pass without edits. `art.test.ts` SHALL pass with one exception, approved by the user: the single line `"notebook",` is added to its `EXPECTED_IDS` list. No other line of it changes. REQ-BEST-09.2

### Requirement 10: Page helpers

**User Story:** As a developer, I want the page arithmetic in pure functions, so that flipping can never leave the notebook.

```ts
type FlipDirection = "next" | "prev";
function pageCount(entries: readonly BestiaryEntry[]): number;                 // entries.length + 1
function clampPage(page: number, count: number): number;                       // always an integer in [0, max(count - 1, 0)]
function flipTarget(page: number, count: number, direction: FlipDirection): number;
function entryForPage(entries: readonly BestiaryEntry[], page: number): BestiaryEntry | undefined;
```

#### Acceptance Criteria

1. THE function `pageCount(entries)` SHALL return the number of entries plus one for the contents page. REQ-BEST-10.1
2. THE function `clampPage(page, count)` SHALL return an integer index in the range 0 to `max(count - 1, 0)` for every input, including NaN, infinities, negative numbers, fractions and a `count` below 1. REQ-BEST-10.2
3. THE function `flipTarget(page, count, direction)` SHALL return `clampPage(page, count)` moved by one step in `direction`, and SHALL stay at the first page for `prev` and at the last page for `next`. REQ-BEST-10.3
4. WHEN `next` is applied `count - 1` times from page 0, THE function `flipTarget` SHALL reach the last page, and WHEN `prev` is applied `count - 1` times from the last page, THE function `flipTarget` SHALL reach page 0. REQ-BEST-10.4
5. THE function `entryForPage(entries, page)` SHALL return `undefined` for page 0 and for any page outside the notebook, and SHALL return `entries[page - 1]` for a page from 1 to `entries.length`. IT SHALL NOT throw for any number. REQ-BEST-10.5
6. THE helpers SHALL live in `src/ui/bestiary.ts` and SHALL use no DOM, network or storage API. REQ-BEST-10.6

### Requirement 11: Page-flip effect and notebook look

**User Story:** As a user, I want turning a page to feel like turning a page of a notebook, without making the text harder to read.

#### Acceptance Criteria

1. WHEN the page changes, THE notebook SHALL play a CSS flip effect on the new page that changes only `transform` and `opacity`. THE effect SHALL use no new dependency and no animation library. REQ-BEST-11.1
2. THE direction of the effect SHALL follow the direction of the flip: a forward flip (a higher page number, including a jump from a contents line) and a backward flip use different start states. Revision 3: in spread mode the effect plays on the turning leaf only (REQ-BEST-12.10). REQ-BEST-11.2
3. WHILE `prefers-reduced-motion: reduce` is set, or the in-page reduced-motion preference is on, THE notebook SHALL change the page instantly with no motion. REQ-BEST-11.3
4. THE keyframes SHALL describe only the start state, so the resting style of every page is its final, readable state, and THE effect SHALL NOT clip text at rest or during the flip at 320 CSS pixels width and at 200 percent text size. REQ-BEST-11.4
5. WHEN the panel opens, THE notebook SHALL NOT play a flip effect. REQ-BEST-11.5
6. THE panel SHALL look like an open notebook lying on a table: a paper surface with texture made of CSS gradients, a stitched binding, a centre gutter or spine shadow, a page curl or stacked page edges, and a ribbon. THE decoration SHALL be original CSS only, with no image file, no new dependency and no text, SHALL use `--th-*` tokens, and SHALL be hidden from assistive technology. REQ-BEST-11.6
7. THE notebook look SHALL NOT convey the kind of an entry, or any state, by color alone, and SHALL keep WCAG AA contrast for text. REQ-BEST-11.7
8. WHILE high contrast is on, THE notebook SHALL drop gradients, shadows, texture, stitching, page edges, the ribbon and the sticker tilt, and keep plain text on a plain surface. REQ-BEST-11.8
9. WHERE the viewport is wide, THE notebook SHALL show the two-page spread look (gutter shadow in the centre and page edges on both sides). SUPERSEDED by revision 3: the panel no longer shows exactly one logical page on wide screens and the right leaf holds real content (REQ-BEST-12.2, REQ-BEST-12.10). The gutter, edges, stitching and ribbon stay and are placed for two leaves. REQ-BEST-11.9
10. WHERE the viewport is narrow, THE notebook SHALL degrade to a single sheet without the gutter and without horizontal overflow at 320 CSS pixels width. REQ-BEST-11.10
11. THE sticker look on the contents page (paper scrap, slight tilt, soft shadow) SHALL use only `transform` set at rest, `box-shadow`, gradients and `--th-*` tokens, SHALL NOT clip text, and SHALL keep WCAG AA contrast for the name. REQ-BEST-11.11
12. THE flip effect, its 1 second duration and the reduced-motion behavior SHALL stay as in criteria 1 to 5, and the notebook look SHALL add no new animation. REQ-BEST-11.12

### Requirement 12: Two-page spread on wide screens

**User Story:** As a family helper on a laptop, I want the open notebook to use both of its pages, so that I see two creatures at once and turn a pair of pages at a time.

Superseded wording (kept in place above, marked there):

| Earlier text | Now |
|---|---|
| "one page at a time" (Introduction, Requirement 5 title text) | One logical page per step in single mode, one spread per step in spread mode |
| 5.10, 5.11, 5.12, 5.13 | Hold in single mode; spread mode follows 12.5, 12.6, 12.9 |
| 11.2 | In spread mode the effect plays on the turning leaf only (12.10) |
| 11.9 and the revision 2 decision "no second page of content" | The right leaf holds real content (12.2) |
| Design rule "content on the right page only" and the empty mirrored left half | Both leaves hold content; there is no empty decorative half |
| 12.9 (visible indicator text), 12.13 ("the indicator visible") and the 5.11 indicator | Superseded by revision 4 (REQ-BEST-13.1). The range text "{from}-{to}" is kept only inside the announcement and the leaf labels (REQ-BEST-13.2) |
| 5.7 and the design rule "one scroll area holds both leaves" | Superseded by revision 4 (REQ-BEST-13.3): each leaf scrolls on its own |

**Spread layout for the real table (14 logical pages, 7 spreads):**

| Spread | Left leaf (page index) | Right leaf (page index) |
|---|---|---|
| 0 | Contents (0) | Bank (1) |
| 1 | Prize (2) | Job-bait (3) |
| 2 | Authority (4) | Generic (5) |
| 3 | Link creature 1 (6) | Link creature 2 (7) |
| 4 | Link creature 3 (8) | Link creature 4 (9) |
| 5 | Link creature 5 (10) | Link creature 6 (11) |
| 6 | Link creature 7 (12) | Link creature 8 (13), with `bestiary.note` |

14 is even, so the last spread is full. If a later table makes the count odd, the last spread has its left leaf only and the right leaf is blank paper with no content.

#### Acceptance Criteria

1. THE panel SHALL be in spread mode WHILE the viewport is at least 48rem wide (the existing breakpoint) and in single mode otherwise. BEFORE the browser is measured, including on the server, THE panel SHALL be in single mode. THE panel SHALL change mode when the viewport crosses the breakpoint, without reload and without storing anything. REQ-BEST-12.1
2. WHILE in spread mode, THE panel SHALL show spread s with logical page 2s on the left leaf and logical page 2s + 1 on the right leaf, where s runs from 0 to `spreadCount(count) - 1` and `spreadCount(count)` is `ceil(count / 2)` for a count of at least 1 (7 for 14 pages). Each leaf SHALL hold the full content of its page (contents or entry). REQ-BEST-12.2
3. IF the page count is odd, THEN THE panel SHALL render the right leaf of the last spread as blank paper with no heading, no text and `aria-hidden`. REQ-BEST-12.3
4. THE contents page (page 0) SHALL be on the left leaf of spread 0. THE closing note `bestiary.note` SHALL appear only on logical page `count - 1`, on whichever leaf holds that page, and on no other leaf. REQ-BEST-12.4
5. EACH leaf SHALL have a heading with `tabIndex` -1. AFTER a flip or a sticker jump, THE panel SHALL move focus to the heading of the first newly shown leaf (the left leaf in spread mode, the only leaf in single mode). AFTER a change of layout mode alone, THE panel SHALL NOT move focus, announce or play a flip effect. REQ-BEST-12.5
6. WHILE in spread mode, THE previous and next buttons and the keys ArrowLeft and ArrowRight SHALL move by one spread, THE previous button SHALL be absent on spread 0, and THE next button SHALL be absent on the last spread. THE same ignore rules as REQ-BEST-05.12 SHALL apply. WHILE in single mode, THE behavior SHALL be as before: one logical page per step, 14 steps. REQ-BEST-12.6
7. WHEN a sticker is pressed in spread mode, THE panel SHALL show the spread that contains the sticker's page, so that the page is visible on one of the two leaves, and SHALL keep that page as the focused page. REQ-BEST-12.7
8. THE panel SHALL keep one focused page index across a layout-mode change and SHALL NOT reset it. WHEN the mode changes from spread to single, THE panel SHALL show the focused page, which is the left page of the last flipped spread or the page of the last pressed sticker. WHEN the mode changes from single to spread, THE panel SHALL show the spread that contains the focused page. REQ-BEST-12.8
9. SUPERSEDED by REQ-BEST-13.1 and 13.2 for the visible indicator; the live announcement and label part stays in force with the per-leaf rule of 13.2. (Original text:) WHILE in spread mode, THE indicator SHALL read "{from}-{to} / {total}" (for example "1-2 / 14"), built from the existing key `bestiary.page.of` with `current` set to the text "{from}-{to}" where from and to are the leaf page indexes plus one, and SHALL read "{from} / {total}" when the right leaf is blank. WHILE in single mode, THE indicator SHALL read "{current} / {total}" as before. THE live announcement and the scroll area label SHALL use `bestiary.page.label` with the same `current` text and with `name` set to the two page names joined by ", " (the one name in single mode). THE panel SHALL NOT add a dictionary key for this. IF `t` cannot take a text value for `current`, THEN one key `bestiary.page.range` ("{from}-{to} / {total}", same text in Vietnamese, tier B, no "safe") MAY be added, which needs the user's approval and raises the key count to 17 in `bestiary-wording.test.ts`. REQ-BEST-12.9
10. WHEN a spread changes by a forward flip, THE flip effect SHALL play on the right leaf and use the forward start state. WHEN it changes by a backward flip, THE effect SHALL play on the left leaf and use the backward start state. FOR a sticker jump, THE direction SHALL be forward when the target spread is higher than the current spread, otherwise backward. THE effect SHALL change only `transform` and `opacity`, last 1 second, use no `clip-path`, and be instant under reduced motion. THE effect SHALL NOT play on open. REQ-BEST-12.10
11. THE layout mode SHALL come from a hook that reads `matchMedia` with the same 48rem query, defaults to single when `matchMedia` is missing or on the server, reacts to changes of the query, and uses no storage, network or logging. REQ-BEST-12.11
12. IN spread mode, THE gutter shadow SHALL sit between the two leaves, the stitched binding SHALL run along the gutter, the page edges SHALL sit on the outer sides of both leaves, and the ribbon SHALL hang from the top of the gutter. IN single mode THE decoration SHALL be as in revision 2. THE decoration SHALL stay `aria-hidden`, empty and token-based. REQ-BEST-12.12
13. THE notebook SHALL stay usable at a 320 CSS pixel viewport width and at 200 percent text size, with no horizontal overflow, with the previous and next buttons visible (the words "and the indicator" are SUPERSEDED by REQ-BEST-13.1), and with a focus trap, Escape to close and ArrowLeft and ArrowRight as in REQ-BEST-05. A 200 percent browser text size that makes 48rem wider than the viewport SHALL put the panel in single mode through the same query. REQ-BEST-12.13
14. WHILE high contrast is on, THE notebook SHALL drop gradients, shadows, texture, stitching, edges, the ribbon and the gutter in spread mode as in REQ-BEST-11.8 and keep plain text on a plain surface, with a visible plain divider between the two leaves. REQ-BEST-12.14

##### Spread helpers (pure, total, in `src/ui/bestiary.ts`)

```ts
type LayoutMode = "single" | "spread";
function spreadCount(count: number): number;                       // ceil(max(floor(count), 1) / 2); non-finite count gives 1
function clampSpread(spread: number, count: number): number;       // integer in [0, spreadCount(count) - 1], NaN gives 0
function spreadOf(page: number, count: number): number;            // floor(clampPage(page, count) / 2)
function pagesOfSpread(spread: number, count: number): { left: number; right: number | undefined };
function flipSpread(spread: number, count: number, direction: FlipDirection): number;
function visiblePages(page: number, count: number, mode: LayoutMode): { left: number; right: number | undefined };
```

15. EVERY spread helper SHALL be total (no throw for NaN, infinities, negatives, fractions or a count below 1), SHALL use no DOM, network or storage API, and SHALL satisfy PBT-139 to PBT-144 in `design.md`. REQ-BEST-12.15

### Requirement 13: No visible indicator, one scrollbar per leaf

**User Story:** As a family helper, I want a clean notebook with only the two page buttons, and I want each page to scroll on its own, so that I can read a long page without moving the other one.

Superseded wording (kept in place above, marked there): the visible indicator "n / 14" and "1-2 / 14" (5.11, 12.9, the 12.13 words "and the indicator", the "Page numbering" decision, the glossary "Last page"), the single shared page-area scroll (5.7, and the design rule "one scroll area holds both leaves"), and the key count 16 (8.1). Criteria 5.10, 5.12, 5.13, 5.14 and 12.5, 12.6, 12.7, 12.8, 12.10 are kept.

#### Acceptance Criteria

1. THE panel SHALL NOT render any visible page indicator or page number text under or inside the notebook (no "n / 14", no "{from}-{to} / {total}"). THE navigation row SHALL hold only the previous and next buttons. THE previous and next buttons SHALL keep the rules of REQ-BEST-05.10 and REQ-BEST-12.6 (visible text, at least 44 by 44 CSS pixels, absent at the ends, never shown by color alone). REQ-BEST-13.1
2. THE panel SHALL keep the polite live announcement of REQ-BEST-05.14 with `bestiary.page.label`, built as in REQ-BEST-12.9 (`current` is "{from}-{to}" in spread mode, the single page number otherwise, `name` is the page names joined by ", "), and SHALL NOT announce on first open or on a layout-mode change alone. THE accessible name of EACH leaf scroll area SHALL be `bestiary.page.label` with `current` set to that leaf's own page number (page index plus one), `total` set to the page count and `name` set to that leaf's page name, so assistive technology knows the name and the page of every leaf. THE key `bestiary.page.label` therefore stays in use. THE key `bestiary.page.of` has no remaining use and SHALL be removed from `en.ts` and `vi.ts`. THE final set SHALL be 15 `bestiary.*` keys, equal in both languages, listed in `design.md`; the other 15 keys are unchanged. THE count in `bestiary-wording.test.ts` changes from 16 to 15 and needs the user's approval during execution. No dictionary key SHALL stay unused. REQ-BEST-13.2
3. EACH leaf (the left leaf and the right leaf in spread mode, the single sheet in single mode) SHALL be its own scroll container with its own vertical scrollbar: `overflow-y: auto`, `min-height: 0`, bounded by the dialog height (the dialog is at most `90dvh` high), so a leaf scrolls when its own content is taller than its box and does not move the other leaf. THE old shared page-area scroll (`overflow-y-auto` on the page area, `tabIndex` 0 and the single `aria-label` on it) SHALL be removed. REQ-BEST-13.3
4. EACH leaf scroll area SHALL show a visible scrollbar when its content overflows, styled with theme tokens only: `scrollbar-width: thin` and `scrollbar-color` using `--th-ink-faded` for the thumb and `--th-paper` for the track, plus `::-webkit-scrollbar`, `::-webkit-scrollbar-track` and `::-webkit-scrollbar-thumb` rules with the same tokens, a width in `rem` of at least 0.75rem, and no `px` font size, no image and no new dependency. WHILE high contrast is on, THE scrollbar SHALL stay visible with plain tokens and no gradient or shadow. REQ-BEST-13.4
5. EACH leaf scroll area SHALL be reachable by keyboard: `tabIndex` 0, `role="region"` and the accessible name of REQ-BEST-13.2, always present (not only while it overflows), so the Tab order does not change when content grows at 200 percent text. THE focus trap SHALL include these scroll areas as tab stops. THE blank right leaf of an odd count SHALL have no `tabIndex`, no role and no label (it stays `aria-hidden`). THE focus ring SHALL be visible on a focused scroll area without being clipped. REQ-BEST-13.5
6. THE previous and next buttons SHALL sit in a slim navigation row below the book, outside both scroll areas, with the previous button at the start and the next button at the end of the row. A same-size empty element SHALL keep the other button in place when one is absent. THE row SHALL NOT use `position: sticky`, `fixed` or `absolute`, because both leaf scroll areas end above it and the row never overlays content. THE row SHALL wrap (`flex-wrap`) when the viewport is narrow. REQ-BEST-13.6
7. THE notebook SHALL stay usable at a 320 CSS pixel viewport width and at 200 percent text size: no horizontal overflow, both buttons visible without scrolling the dialog, the leaf scroll area bounded by the dialog, nothing clipped at rest and during the flip. REQ-BEST-13.7
8. THE closing note `bestiary.note` SHALL stay on logical page 13 only, inside the scroll area of the leaf that holds that page. THE focus rule of REQ-BEST-12.5 SHALL stay: after a flip or a sticker jump, focus goes to the heading of the first newly shown leaf (the left leaf in spread mode, the only leaf in single mode). The new leaf mounts with its scroll position at the top. REQ-BEST-13.8
9. THE flip effect of REQ-BEST-12.10 SHALL stay and SHALL be placed on a non-scrolling wrapper of the leaf, so the scroll box never carries the transform. REQ-BEST-13.9

### Requirement 14: Notebook button in the top-left corner

**User Story:** As a user, I want the notebook button in the top-left corner, so that I find it at once in the same place on every screen and it does not take space at the bottom of the page.

Superseded wording (kept in place and marked there): REQ-BEST-04.5, the `design.md` sentences "It sits in the `Frame` footer strip" and "No change is expected in the revision" (`App.tsx`), and the words "same button in the Frame footer strip" in task 10. Task 5 ("move the button if it covers the input") is kept. Criteria 4.1 to 4.4 are kept. The top-right corner stays with `TopControls`.

Facts the criteria rely on: `TopControls` is an absolutely positioned wrapper at `right-3 top-3 z-20` (`pointer-events-none`, its buttons `pointer-events-auto`), made of three `2.75rem` round buttons with `0.5rem` gaps, so it covers `10rem` from the right edge of the frame. The home and bag steps keep `3.75rem` of space at the top for it.

#### Acceptance Criteria

1. THE Frame SHALL render the notebook button in its top-left corner as an absolutely positioned wrapper at `left-3 top-3 z-20` (the same `0.75rem` inset and layer as `TopControls`, mirrored), with `pointer-events-none` on the wrapper and `pointer-events-auto` on the button, in every flow step (home, bag, hunting, revealed, lost) and therefore in the page states idle, working, done and failed. THE button SHALL NOT scroll with any inner region and SHALL NOT take part in the page flow. REQ-BEST-14.1
2. WHILE the viewport is at least `18rem` wide, THE button box SHALL be at most `3rem` high, so it ends inside the `3.75rem` top space of the home and bag steps, and its wrapper SHALL be at most `calc(100% - 11.25rem)` wide, which leaves the `10rem` of `TopControls` plus a `0.5rem` gap and the `0.75rem` inset. THE button SHALL NOT overlap `TopControls`, the title, the hunter, the bag input or any text at 320 CSS pixels width at 100 percent text size and at every width above it. REQ-BEST-14.2
3. WHERE the width allowed by criterion 2 is smaller than the full button (the compact form), THE button SHALL keep its visible text label `bestiary.open`, SHALL let that label wrap to at most two lines, SHALL shrink the notebook picture to `1.75rem` square, and SHALL stay at least 44 by 44 CSS pixels. All sizes SHALL be in relative units and no font size SHALL be in `px`. THE button SHALL NOT drop the text label and SHALL NOT clip the label. REQ-BEST-14.3
4. IF the viewport is narrower than `18rem` (rem follows the text size, so this includes 320 CSS pixels at 200 percent text), THEN THE button SHALL move to a second row at `left-3` and `top-[3.75rem]`, below the `TopControls` row, and THE Frame SHALL add an `aria-hidden` empty spacer of `6.5rem` above `main`, so the button sits fully inside the spacer and covers no content in any step. THE spacer SHALL NOT exist at `18rem` and wider. REQ-BEST-14.4
5. THE Frame SHALL NOT have a `footer` prop or a footer strip. THE Frame SHALL take the button through one optional slot named `guide`, and SHALL render the `guide` slot (and the spacer of criterion 4) before `main` in the document order, so keyboard Tab reaches the top-left button before the page content. REQ-BEST-14.5
6. THE button SHALL stay a native `<button type="button">` with `aria-haspopup="dialog"`, `aria-expanded={open}`, the shared `FOCUS_RING`, the decorative `aria-hidden` picture and the visible label `bestiary.open`. ON close of the panel, focus SHALL return to this button (`returnFocusRef`). THE props of `BestiaryButton` (`locale`, `open`, `onClick`, `buttonRef`) SHALL NOT change, SHALL NOT include a verdict, text or files, and `guideOpen` SHALL stay independent of the page state. REQ-BEST-14.6
7. WHILE the panel is open, THE button SHALL stay rendered and SHALL be covered by the modal overlay and backdrop, as before: it is not removed and not made inert by this feature, and the panel keeps its own focus trap. REQ-BEST-14.7
8. WHILE high contrast is on, THE button SHALL keep its plain surface, border and `FOCUS_RING` so it stays visible over every backdrop. THE button SHALL NOT use any new color token, image, icon or animation. REQ-BEST-14.8
