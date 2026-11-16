# Implementation Plan: Hunter UI

## Overview

Build the one-frame monster-hunt experience described in `requirements.md` and
`design.md`. Part A is small, tested, pure logic in `src/ui/`. Part B is thin
components, art and CSS. No change to `src/core`, `src/analyzers`,
`src/pipeline`, `src/server`, `src/app/api`, `src/client` or the API contract.
`src/app/try/page.tsx` is not changed. `resultSections` keeps its order.

## Environment

- OS: Windows, shell: Windows PowerShell 5.1. Never chain with `&&`.
- Run tests with `vitest run` (single pass, node environment, no network).
- Relative imports only. `src/ui/` has no React or browser globals. Components
  import only `import type` from `src/pipeline`.
- No new dependency. Markup tests use `react-dom/server` (already installed).
- Do not implement beyond the task being executed. English text and Vietnamese
  drafts come from the table in `design.md` A5; do not reword them.
- Tests that pinned the old `input.submit` text are updated in task 1.1 only.
- Every task ends with the app still working. After each task run `vitest run`
  and check what the task's Demo line says in the browser.
- Art tasks (6 to 10) are done one piece at a time. After each piece, show the
  user the result in the real flow and wait for approval before the next piece.
  Detail standard: `design.md` B3 and `requirements.md` REQ-HUNT-38 to 43.
- The steering file `.kiro/steering/hunter-scene-rules.md` is already updated for
  this spec.

## Tasks

- [x] 1. Pure logic and dictionary (`src/ui/`)
  - [x] 1.1 Update `i18n/en.ts` and `i18n/vi.ts`
    - Apply the table in design A5: change `input.submit`, add the `scene.*`, `bag.*`, `home.*`, `hunt.again` and `result.frame.label` keys; update the tests that pinned the old `input.submit` text; confirm both dictionaries keep identical key sets
    - _Requirements: REQ-HUNT-09, REQ-HUNT-17, REQ-HUNT-34_
  - [x] 1.2 Create `view/flow.ts`
    - `flowReducer`, `canConfirm`, `shouldSubmitOnEnter` exactly as in design A1; total, never throws
    - _Requirements: REQ-HUNT-06, REQ-HUNT-07, REQ-HUNT-16, REQ-HUNT-18_
  - [x] 1.3 Create `hunt.config.ts` and `view/journey.ts`
    - `MIN_HUNT_MS` (4000), `legsFor`, `legFor`, `revealWaitMs` as in design A2; bad numbers are treated as 0
    - _Requirements: REQ-HUNT-22, REQ-HUNT-23, REQ-HUNT-24_
  - [x] 1.4 Create `view/scene.ts` and `view/info-sections.ts`
    - `sceneFor` (table in design A3, malformed input gives `lost`) and `splitSections` (design A4)
    - _Requirements: REQ-HUNT-08, REQ-HUNT-09, REQ-HUNT-10, REQ-HUNT-30_
  - [x] 1.5 Unit tests
    - `flow.test.ts` (one example per table row, no-op events, `canConfirm` cases, Enter with Shift and with IME composition), `journey.test.ts` (text only and with picture, each status, elapsed time, reduced motion), `scene.test.ts` (one per row), `info-sections.test.ts` (every view shape keeps all sections and order)
    - _Requirements: REQ-HUNT-06 to REQ-HUNT-10, REQ-HUNT-16 to REQ-HUNT-18, REQ-HUNT-22 to REQ-HUNT-24, REQ-HUNT-30_
  - [x] 1.6 Property tests PBT-89, PBT-90, PBT-91, PBT-94 and PBT-92
    - `flow.property.test.ts` (PBT-89, PBT-94), `journey.property.test.ts` (PBT-90), `scene.property.test.ts` (PBT-91), `dictionary.hunt.property.test.ts` (PBT-92)
    - **Property: flow is total and reaches hunting only through a valid confirm (PBT-89); leg is allowed, monotonic and capped, reveal wait is 0 with reduced motion (PBT-90); scene total (PBT-91); no banned words and key parity (PBT-92); Enter rule (PBT-94)**
    - **Validates: Requirements REQ-HUNT-06 to REQ-HUNT-10, REQ-HUNT-18, REQ-HUNT-22 to REQ-HUNT-24, REQ-HUNT-34**
  - [x] 1.7 Export the new items from `src/ui/index.ts`
  - Demo: `vitest run` is green. The page is unchanged except the submit button now reads "Start the hunt".

- [x] 2. Checkpoint - Ensure all tests pass

- [x] 3. Fixed frame, palette tokens and art registry
  - [x] 3.1 Add the tokens in design A6
    - `COLOR_TOKENS`, both palettes, `globals.css` defaults, declared pairs; fix a palette value, not a threshold, if a pair fails
    - _Requirements: REQ-HUNT-47_
  - [x] 3.2 Create `art/registry.tsx` with simple placeholder SVGs
    - `ArtId`, `Art`, image entry support (`<img alt="" aria-hidden>`), unknown id falls back to the generic shade; move the six existing monsters in as placeholders; keep `monster-art.tsx` re-exporting so nothing breaks
    - _Requirements: REQ-HUNT-38, REQ-HUNT-44_
  - [x] 3.3 Create `Frame.tsx` and the slim top bar (`Header.tsx`)
    - `h-dvh overflow-hidden`, `data-step`, `min-h-0` children, app name and Settings button (panel opens over the frame and scrolls inside); `SettingsPanel` content unchanged
    - _Requirements: REQ-HUNT-01, REQ-HUNT-03, REQ-HUNT-04, REQ-HUNT-46_
  - [x] 3.4 Add the art tests
    - `art.test.ts` (every `ArtId` renders `aria-hidden`, no `<text`, `<title`, `<filter`, `<animate`), `art-budget.test.ts` (each file at most 30 KB, all at most 350 KB), and a source scan forbidding `<text`, `<title`, `<filter` in `src/components/art/*.tsx`; keep `components.boundaries.test.ts` green
    - _Requirements: REQ-HUNT-41, REQ-HUNT-42, REQ-HUNT-49_
  - Demo: the app opens in a fixed frame with a top bar; no page scroll at 320 px to 1440 px, portrait and landscape; the old form still works inside it.

- [x] 4. Home: the hunter in the middle
  - [x] 4.1 Draw the home backdrop (`backdrop-home`) in `art/backdrops.tsx`
    - Detail per design B3; layered `<g data-part>` groups, `-detail` groups for high contrast; within the size budget
    - _Requirements: REQ-HUNT-11, REQ-HUNT-38 to REQ-HUNT-43_
  - [x] 4.2 Draw the hunter in `art/hunter.tsx` with all six poses
    - Detail per design B3; every pose differs in shape; groups for hat, head, cloak, arms, lantern, crossbow
    - _Requirements: REQ-HUNT-39, REQ-HUNT-40_
  - [x] 4.3 Create `HunterButton.tsx`
    - Real `<button>` around the hunter, accessible name from `home.hunter.action`, whole figure tappable and at least 2.75 rem, visible focus; caption and privacy note below on `surface` panels
    - _Requirements: REQ-HUNT-05, REQ-HUNT-11 to REQ-HUNT-13_
  - [x] 4.4 Add the home animations to `globals.css`
    - `th-fog-drift`, `th-sway`, `th-flicker`, `th-fly`; base style is the final state
    - _Requirements: REQ-HUNT-26, REQ-HUNT-27_
  - [x] 4.5 Wire `home` into `App.tsx` with `useReducer(flowReducer)` and `sceneFor`
    - `open-bag` on tap; focus the hunter button on load and after returning
    - _Requirements: REQ-HUNT-07, REQ-HUNT-12_
  - [x] 4.6 Markup tests
    - `home` renders a `<button>` with a name and the caption; no `<text`/`<title`
    - _Requirements: REQ-HUNT-11, REQ-HUNT-12_
  - Demo: the first screen is the graveyard with the hunter in the middle; Tab reaches the hunter and Enter opens the (not yet built) bag step; with motion off the scene is still and readable. Review the art with the user.

- [x] 5. The bag
  - [x] 5.1 Draw the bag in `art/bag.tsx`
    - Closed and open bag, rolled paper, photo frame; detail per design B3
    - _Requirements: REQ-HUNT-38 to REQ-HUNT-40_
  - [x] 5.2 Create `BagPanel.tsx` (replaces `InputForm.tsx`)
    - Two compartment toggles with text labels and `bag.slot.on/off`; text field (same label and hint); picture input with choose, drag and drop, remove and the paste hint; confirm button; close button; `bag.needOne` hint when it cannot confirm; keep the `firstImage` export; `parchment` tokens; `min-h-11` controls; the panel scrolls inside itself
    - _Requirements: REQ-HUNT-14, REQ-HUNT-15, REQ-HUNT-16, REQ-HUNT-17, REQ-HUNT-19, REQ-HUNT-46_
  - [x] 5.3 Keyboard behaviour
    - Enter confirms and Shift+Enter makes a new line using `shouldSubmitOnEnter` and `nativeEvent.isComposing`; Esc closes and returns focus to the hunter button; opening focuses the bag heading
    - _Requirements: REQ-HUNT-18, REQ-HUNT-19, REQ-HUNT-20_
  - [x] 5.4 Wire the bag into `App.tsx`
    - `toggle`, `close-bag`, `confirm`; pass `userText` only if the Text compartment is on and `file` only if the Picture compartment is on to `runCheck`; paste listener switches the Picture compartment on while the bag is open
    - _Requirements: REQ-HUNT-17_
  - [x] 5.5 Markup tests
    - Both compartments render with labels; hint shown when empty; confirm button text; the region has a heading
    - _Requirements: REQ-HUNT-14 to REQ-HUNT-16, REQ-HUNT-20_
  - Demo: tap the hunter, the bag opens; switch on text and/or picture, fill them, press Enter or the button and the check starts (the old result view still shows after it).

- [x] 6. Checkpoint - Ensure all tests pass

- [x] 7. The hunt journey
  - [x] 7.1 Draw the forest backdrop (`backdrop-forest`)
    - Detail per design B3
    - _Requirements: REQ-HUNT-21, REQ-HUNT-38 to REQ-HUNT-43_
  - [x] 7.2 Draw the mountain backdrop (`backdrop-mountain`)
  - [x] 7.3 Draw the swamp backdrop (`backdrop-swamp`)
  - [x] 7.4 Draw the ruins backdrop (`backdrop-ruins`)
  - [x] 7.5 Draw the Shade in `art/shade.tsx` (2 to 3 running poses)
  - [x] 7.6 Create `HuntScene.tsx` and the hunt animations
    - Backdrop of the current Leg, hunter pose (`tracking`, `lantern`, `reading`, `aiming`), Shade ahead, caption from `scene.captionKey`, `StatusRegion` kept as the only live region; `th-walk`, `th-parallax`, `th-shade-run`, `th-leg-in`; base style is the final state
    - _Requirements: REQ-HUNT-21, REQ-HUNT-25 to REQ-HUNT-27_
  - [x] 7.7 Wire the journey into `App.tsx`
    - `startedAt` ref; a 250 ms tick while `hunting`; `legFor` per tick; wait `revealWaitMs` after `runCheck` resolves before `ready` or `fail`; clear the interval and timeout on every path and on "again"
    - _Requirements: REQ-HUNT-23, REQ-HUNT-24_
  - [x] 7.8 Markup tests for each Leg
    - Each Leg renders its caption; text only never shows `mountain` or `swamp`; `StatusRegion` is the only `aria-live` region
    - _Requirements: REQ-HUNT-22, REQ-HUNT-25_
  - Demo: submit a message and see the forest then the ruins in about 4 seconds; submit a picture and see all four Legs follow the real progress; a slow check stays at the ruins; with reduced motion the wait is skipped and each Leg is still. Review each backdrop with the user as it is finished (7.1 to 7.5).

- [x] 8. Monsters and the reveal
  - [x] 8.1 Draw the Bank Ghost in `art/monsters.tsx`
    - Detail per design B3; `data-part` groups for body, face, chains, padlock
    - _Requirements: REQ-HUNT-28, REQ-HUNT-38 to REQ-HUNT-43_
  - [x] 8.2 Draw the Prize Vampire
  - [x] 8.3 Draw the Job Zombie
  - [x] 8.4 Draw the Authority Banshee
  - [x] 8.5 Draw the Generic Shade
  - [x] 8.6 Draw the Neutral Candle
  - [x] 8.7 Create `MonsterStage.tsx` and the reveal and lost scenes
    - Large monster in the middle in its `--th-monster-*` color with `th-reveal`; caption `scene.reveal.found` with `{name}` or `scene.reveal.nothing`; `lost`: hunter `downcast`, thicker fog (`th-lost-fade`), `scene.lost.caption`, the existing `ErrorAlert` or withheld notice and "Hunt again"
    - _Requirements: REQ-HUNT-28, REQ-HUNT-33, REQ-HUNT-34_
  - [x] 8.8 Markup and art tests
    - All six monsters render and the right caption shows; the `neutral` caption has no banned word; `lost` for a failed check and for a withheld view; `art.test.ts` and the budget test stay green
    - _Requirements: REQ-HUNT-28, REQ-HUNT-33, REQ-HUNT-41, REQ-HUNT-42_
  - Demo: a bank-scam message ends with the Bank Ghost large in the middle; a harmless message ends with the candle and "no warning signs found"; a network error shows the lost scene and the existing error text. Review each monster with the user as it is finished (8.1 to 8.6).

- [x] 9. The information frame
  - [x] 9.1 Create `InfoFrame.tsx`
    - Scroll region with `tabindex="0"`, `aria-label` from `result.frame.label`, visible focus; `splitSections` renders `scrolling` inside and `pinned` (limits note) below; side by side with the monster from `md`, stacked below; two columns in short landscape
    - _Requirements: REQ-HUNT-02, REQ-HUNT-29, REQ-HUNT-30, REQ-HUNT-31, REQ-HUNT-45_
  - [x] 9.2 Edit `MonsterCard.tsx`, `TechnicalDetails.tsx` and `ResultPanel.tsx`
    - Per design B4: no art in the card; no ids in technical details; `null` renders nothing and skips its wrapper
    - _Requirements: REQ-HUNT-29, REQ-HUNT-35 to REQ-HUNT-37_
  - [x] 9.3 "Hunt again" and focus
    - Focus the result heading when revealed; "Hunt again" clears text, file, verdict and timers and focuses the hunter button
    - _Requirements: REQ-HUNT-32, REQ-HUNT-49_
  - [x] 9.4 Markup tests
    - `InfoFrame` has the label and `tabindex`; the pinned note is outside the scroll region; the sections keep their order; withheld view shows no empty technical block
    - _Requirements: REQ-HUNT-02, REQ-HUNT-29, REQ-HUNT-30, REQ-HUNT-36_
  - [x] 9.5 Property test PBT-93 in `result-markup.property.test.ts`
    - Generated verdicts; evidence strings are generated without dots so they cannot equal an id; the markup has none of the ids and a ready result has at least one evidence string
    - **Property: no ids in the rendered result (PBT-93)**
    - **Validates: Requirements REQ-HUNT-35, REQ-HUNT-37**
  - Demo: after the reveal the information frame lists the level, what to do, evidence, tips and notices, scrolls inside itself, the limits note stays at the foot, and "Technical details" shows only plain sentences.

- [x] 10. Checkpoint - Ensure all tests pass

- [x] 11. Responsive and accessibility pass
  - [x] 11.1 Check every step at widths 320, 375, 768, 1024 and 1440
    - Portrait and landscape; text size 100% and the largest; high contrast on and off; no page scroll; nothing cut off; fix with classes only
    - _Requirements: REQ-HUNT-01, REQ-HUNT-03, REQ-HUNT-45, REQ-HUNT-46_
  - [x] 11.2 Check the keyboard path and focus
    - Skip link, Settings, hunter button, bag controls, confirm, result heading and Info frame, "Hunt again"; visible focus; Esc; Enter with a Vietnamese IME
    - _Requirements: REQ-HUNT-18, REQ-HUNT-20, REQ-HUNT-32, REQ-HUNT-50_
  - [x] 11.3 Check reduced motion (system and in-page) and the no-flash rule
    - Every step and Leg readable with `animation: none`; the 4 second wait is skipped
    - _Requirements: REQ-HUNT-24, REQ-HUNT-26, REQ-HUNT-27_
  - [x] 11.4 Check high contrast
    - Detail layers hidden, text pairs pass, no text on art
    - _Requirements: REQ-HUNT-43, REQ-HUNT-47_
  - [x] 11.5 Playwright end-to-end at three viewports
    - **Optional. Needs approval to add `@playwright/test` as a dev dependency (not installed now).** If approved: home to bag to hunt to reveal at phone, tablet and desktop sizes; one reduced-motion run; one `no_signals` run; assert the only network call is the same-origin `POST /api/analyze` and the page has no ids
    - _Requirements: REQ-HUNT-01, REQ-HUNT-35_
  - Demo: the whole flow feels right on a phone, a tablet and a desktop.

- [x] 12. Final checkpoint
  - Run `vitest run` and `eslint`; run `next build`; confirm none of `src/core`, `src/analyzers`, `src/pipeline`, `src/server`, `src/app/api`, `src/client` changed (`git diff --stat`); confirm no new dependency in `package.json`; confirm no "safe" / "an toàn" in new strings; confirm `InputForm.tsx` and the old `monster-art.tsx` re-export are removed and nothing imports them.

## Revision 2 tasks (PixiJS stage, journal, optional sound)

Requirements 10 to 14 (`REQ-HUNT-51` to `REQ-HUNT-76`), `design.md` "Revision 2".
The only new runtime dependency is `pixi.js` at an exact version. Do the tasks
in order; each ends with the app working and `vitest run` green.

- [x] 13. Spec and steering updated for revision 2
  - Requirements 10 to 14, design "Revision 2" and `hunter-scene-rules.md` are written (this file's parent folder and `.kiro/steering`).
  - _Requirements: REQ-HUNT-51 to REQ-HUNT-76_

- [x] 14. Stage plan, journal model, sound plan and sound preference (`src/ui/`)
  - [x] 14.1 Create `view/stage-plan.ts` with `stagePlan` and `profileFor`
    - Rules in design R2-A; total, types only
    - _Requirements: REQ-HUNT-56, REQ-HUNT-57, REQ-HUNT-61, REQ-HUNT-63_
  - [x] 14.2 Create `view/journal.ts` with `buildJournalView`
    - Rules in design R2-A; reuse `SignalCardView`, `resultSections`
    - _Requirements: REQ-HUNT-66, REQ-HUNT-67, REQ-HUNT-68, REQ-HUNT-71_
  - [x] 14.3 Create `view/sound-plan.ts` with `soundPlan`
    - _Requirements: REQ-HUNT-75_
  - [x] 14.4 Add the `sound` preference in `preferences.ts`; add dictionary keys (`journal.*`, `settings.sound.*`, `sound.*`) in en and vi
    - Closed key set, default false; keys with identical sets in both languages
    - _Requirements: REQ-HUNT-74_
  - [x] 14.5 Unit tests and property tests PBT-95 to PBT-99
    - `stage-plan.test.ts`, `stage-plan.property.test.ts`, `journal.test.ts`, `journal.property.test.ts`, `sound-plan.test.ts`, `sound-plan.property.test.ts`, extend `preferences` tests, `dictionary.revision2.property.test.ts`
    - **Validates: Requirements REQ-HUNT-56, 57, 63, 66 to 68, 71, 74, 75**
  - [x] 14.6 Export from `src/ui/index.ts`
  - Demo: `vitest run` is green and the page is unchanged.

- [x] 15. Install pixi.js and build the stage adapter
  - [x] 15.1 Install `pixi.js` at an exact version
    - Record gzip size as bundled, licence and release date in `design.md`; add a test that checks `package.json`
    - _Requirements: REQ-HUNT-51_
  - [x] 15.2 Create `components/stage/` (`PixiStage.tsx`, `stage-adapter.ts`, `light-textures.ts`, `svg-texture.ts`)
    - Lazy `import()`, progressive upgrade, fallback, destroy on unmount, pause when hidden, no network
    - _Requirements: REQ-HUNT-52 to REQ-HUNT-58_
  - [x] 15.3 Adapter and boundary tests with fakes
    - _Requirements: REQ-HUNT-52, REQ-HUNT-54, REQ-HUNT-55_
  - [x] 15.4 Mount `PixiStage` behind the scene in `App.tsx`
  - Demo: fog and a vignette appear over the SVG scene; with no WebGL or reduced motion the scene is as before.

- [x] 16. Checkpoint - Ensure all tests pass

- [x] 17. Atmosphere
  - [x] 17.1 Add tokens (`blood`, `paper`, `ink`, `ink-faded`, `paper-stain`) to both palettes and declared pairs
    - _Requirements: REQ-HUNT-59_
  - [x] 17.2 Fog layers, fireflies, bats and crows, eyes, swaying trees, lantern light pool, vignette
    - _Requirements: REQ-HUNT-59, REQ-HUNT-60_
  - [x] 17.3 Hunt and reveal sequences
    - Heartbeat vignette, leg parallax through darkness, reveal sweep, camera push at most 2%, still with reduced motion
    - _Requirements: REQ-HUNT-61, REQ-HUNT-62, REQ-HUNT-63_
  - Demo: the home, bag, hunt and reveal screens feel darker and alive.

- [x] 18. Journal
  - [x] 18.1 Heading font in `components/fonts.ts` through `next/font` (Vietnamese subset)
  - [x] 18.2 `JournalSheet`, `JournalPageOne`, `JournalPageTwo` and CSS
    - Replace `InfoFrame` in `App.tsx`; keep focus on the heading, "Hunt again", limits note always visible
    - _Requirements: REQ-HUNT-65 to REQ-HUNT-71_
  - [x] 18.3 Markup tests and the no-boxes scan; PBT-93 re-run on the journal
    - _Requirements: REQ-HUNT-65, REQ-HUNT-71_
  - Demo: the result is one short note; "more notes" turns the page.

- [x] 19. Bag without boxes
  - [x] 19.1 Redraw `BagPanel` markup (props and behaviour unchanged)
    - _Requirements: REQ-HUNT-72, REQ-HUNT-73_
  - [x] 19.2 Keep `BagPanel.test.ts` green; add the no-boxes scan
  - Demo: the bag has no form box and works as before.

- [x] 20. Optional ambient sound
  - [x] 20.1 `audio/audio-host.ts` and tests with a fake `AudioContext`
    - _Requirements: REQ-HUNT-75, REQ-HUNT-76_
  - [x] 20.2 Settings switch and wiring in `App.tsx`
    - Create the context only after a user gesture; dispose on unmount
    - _Requirements: REQ-HUNT-74, REQ-HUNT-76_
  - Demo: turn sound on in Settings and hear wind, a heartbeat while hunting and a swell at the reveal.

- [x] 21. Final pass
  - Run `vitest run`, `eslint`, `next build`; update the Playwright flow; check widths 320 to 1440, text size, high contrast, reduced motion, keyboard; confirm only `pixi.js` was added to `package.json`; confirm no change in `src/core`, `src/analyzers`, `src/pipeline`, `src/server`, `src/app/api`, `src/client`.

### Notes on revision 2 (what was done and what was not)

- Done: 14 (stage plan, journal model, sound plan, sound preference, dictionary keys), 15 (`pixi.js` 8.23.0 pinned, `components/stage/`, tests with fakes, boundaries test), 17 (atmosphere: fog, trees, fireflies, bats, crows, eyes, lantern light, vignette heartbeat, darkness easing, reveal light sweep, camera push), 18 (journal), 19 (bag without boxes), 20 (optional sound), 21 (full tests, lint, build, e2e).
- Done in task 22 (REQ-HUNT-64): the hunter and the shade (hunting) and the monster (reveal) are painted in the canvas from the page's own SVG drawings (`svg-markup.ts`, `svg-texture.ts`, actors in `stage-adapter.ts`, `data-actor` marks, the sync in `PixiStage`). The SVG copy stays for layout and as the fallback.
- Leg parallax stays CSS on the SVG backdrops (already built in task 7); Pixi adds the atmosphere on top.
- `InfoFrame.tsx`, `InfoFrame.test.ts`, `view/info-sections.ts` and its test are no longer used by the app (the journal replaced them). Deleting them was blocked, so they remain until the maintainer removes them.
- Font: Patrick Hand (OFL-1.1, Vietnamese subset) is self-hosted in `public/fonts/` through `@font-face`; no runtime dependency was added for it.
- Sound levels were raised after a loudness measurement (see requirements REQ-HUNT-75).
- Measured: `pixi.js` is split into lazy chunks of about 240 KB gzip in total (about 865 KB raw); the first-load JS of the page stays about 121 KB shared.

- [x] 22. Move the hunter, shade and monsters into the canvas (REQ-HUNT-64)
  - Serialize the art SVG with `XMLSerializer`, make same-origin blob textures, position them from a DOM anchor rectangle, fade the monster in out of the shade, keep the SVG as the fallback.