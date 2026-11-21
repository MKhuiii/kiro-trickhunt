# Implementation Plan: New monsters v1 (Profit Goblin and Heart Wraith)

## Overview

Configuration, dictionary data, two SVG components and tests, described in
`requirements.md` and `design.md`. No algorithm change: `aggregate`,
`applyRules`, `selectMonster`, `reduce`, `TextAnalyzer`, `src/core/`, the AI
prompt and the semantic id set are not touched. Windows PowerShell: do not
chain with `&&`. Tests use `createPipeline({ llmClient: null })`, except the
`FakeLlmClient` tests. No network, no new dependency. A temporary diagnosis
file must be named `src/**/tmp-*.test.ts` or `/tmp-*.txt` (git-ignored) and
deleted before the final task.

Do not tick a task until its tests have actually been run in this session.
Q1 to Q4 in `design.md` ("Hard-coded places and questions") were answered yes
by the maintainer, so tasks 8.x are unblocked. Q4 covers only `MonsterStage.test.ts`,
`svg-markup.art.test.ts`, `result-view.property.test.ts` and `scene.test.ts`; do not edit
the other hard-coded tests. Task 8.1 ends with a stop: show the goblin to the maintainer
before 8.2.

If a goal cannot be met without harming another sample, stop, keep the safe
changes and write the trade-off under "Accepted recall loss" in `design.md`
(at most 3 samples; ask before a fourth).

## Tasks

- [x] 1. Diagnosis: run the twenty `nm-` messages through Rules_Mode and Fake_Mode on the unchanged code and record signals, level and monster in `design.md` (done while writing the spec; temporary test deleted)
  - _Requirements: REQ-PIPE-85_

- [x] 2. Evaluation set (measure before changing)
  - [x] 2.1 Create `src/pipeline/eval/new-monsters-samples.ts` with `NM_SAMPLES` (texts from the design, type `NmSample`). Imports only from `src/pipeline` and `src/core`
    - _Requirements: REQ-PIPE-79, REQ-PIPE-80_
  - [x] 2.2 Create `src/pipeline/new-monsters.test.ts`: one test per sample and mode (Rules_Mode, Fake_Mode), the synthetic checks (real brand list, no digit run of 8 or more, no URL) and unique ids
    - Run once on the unchanged config: 7 scam tests in Rules_Mode (everything except `nm-rom-vi-1`, which is already `suspicious`) and all 8 scam tests in Fake_Mode must fail; all 12 benign tests pass in both modes. `samples.test.ts` still passes (the isolation test reads the new file)
    - _Requirements: REQ-PIPE-81 to REQ-PIPE-84_

- [x] 3. Text rule configuration
  - [x] 3.1 Append `text.investment-pitch` and `text.romance-bait` to `text-analyzer.config.ts` and add the payment phrases, exactly as in the design. Weights 0.35. Do not edit any existing phrase or weight
    - _Requirements: REQ-TXT-33 to REQ-TXT-39_
  - [x] 3.2 Add `text-analyzer.v5.test.ts` (examples of the requirements, including the bare-word list and the benign inputs)
    - _Requirements: REQ-TXT-34 to REQ-TXT-37_
  - [x] 3.3 Update the two analyzer tests: `text-analyzer.config.test.ts` ("contains exactly the 10 expected ids", now 12) and `text-analyzer.test.ts` ("covers all 10 groups", now 12, one example input each). No other edit
    - Run `text-analyzer*.test.ts` and `precision.property.test.ts` before ticking
    - _Requirements: REQ-TXT-33, REQ-TXT-39_

- [x] 4. Pipeline configuration
  - [x] 4.1 Edit `verdict.ts`, `monsters.config.ts` (type, two monsters, `MONSTER_ORDER` after `authority`), `overlap.config.ts` (two groups extended), `rules.config.ts` (two rules before `reputation-listed`) and `messages.config.ts` (actions en and vi), as in the design. `MONSTER_THRESHOLD` unchanged
    - _Requirements: REQ-PIPE-72 to REQ-PIPE-77_
  - [x] 4.2 Update `config.test.ts`: local `MONSTER_IDS` gains `investment` and `romance`. No other edit
    - _Requirements: REQ-PIPE-77_
  - [x] 4.3 Run `new-monsters.test.ts`: all 20 samples pass in both modes. Compare with the "Prototype measurement" table; any difference is written into `design.md`
    - _Requirements: REQ-PIPE-81 to REQ-PIPE-83_
  - [x] 4.4 Add the combination rule examples (REQ-PIPE-76) and the single-signal Fake_Mode checks to `new-monsters.test.ts`
    - _Requirements: REQ-PIPE-76, REQ-TXT-33_

- [x] 5. Property tests for the pipeline and the analyzer
  - [x] 5.1 `new-monsters.property.test.ts`: PBT-145, PBT-146, PBT-149, PBT-150
    - _Requirements: REQ-TXT-33, REQ-PIPE-74, REQ-PIPE-75_
  - [x] 5.2 `text-analyzer.v5.property.test.ts`: PBT-147, plus a fixture test that every added phrase exists in its group
    - _Requirements: REQ-TXT-38_

- [x] 6. Checkpoint
  - Run the whole suite. Expected failures at this point, and only these: the UI tests of "Measured" that wait for UI data (`monsters.test.ts`, `dictionary.property.test.ts` PBT-70 and PBT-79, `signal-ids.test.ts` two tests). Any other failure stops the work and is written into `design.md`
  - _Requirements: REQ-PIPE-78, NFR-RT-08_

- [x] 7. UI data (not blocked)
  - [x] 7.1 Add `monster-investment` and `monster-romance` to `COLOR_TOKENS`, both palettes (values in the design) and `MONSTER_TOKENS` in `pairs.ts`
    - Run `pairs.test.ts`, `contrast*.test.ts`, `css-vars*.test.ts`
    - _Requirements: REQ-UI-48_
  - [x] 7.2 Add the two entries to `MONSTER_PRESENTATION` in `monsters.ts`
    - _Requirements: REQ-UI-47_
  - [x] 7.3 Add the dictionary keys to `en.ts` and `vi.ts` (texts in the design) and the two ids to `KNOWN_SIGNAL_IDS`. Edit only the title of the `signal-ids.test.ts` test ("24" to "26")
    - _Requirements: REQ-UI-49 to REQ-UI-51_
  - [x] 7.4 `src/ui/new-monsters.property.test.ts`: PBT-148
    - Run `voice*.test.ts`, `dictionary*.test.ts`. If PBT-104 fails only for the two names, that is question Q3: stop and report; do not edit `voice.ts`
    - _Requirements: REQ-UI-47 to REQ-UI-51_

- [x] 8. Rendering, voice and test lists (approved: Q1 to Q4 answered yes)
  - [x] 8.1 Q1: add the two entries to `MONSTER_TEXT` in `result-view.ts`; add `result-view.test.ts` rows and a run through `buildResultView` for both monsters at `high`
    - _Requirements: REQ-UI-52, REQ-UI-53_
  - [x] 8.2 Q2: add the two ids to `MONSTER_ORDER` in `bestiary.ts`; update the counts in `bestiary.test.ts` (13 to 15 entries, 5 to 7 monsters) and `bestiary-pages.property.test.ts` (13 to 15)
    - _Requirements: REQ-UI-53_
  - [x] 8.3 Q3: add `goblin`, `goblins`, `wraith`, `wraiths` to `EN_HORROR` and `yêu tinh` to `VI_HORROR` in `voice.ts`, and the same words to the vocabulary list of `halloween-voice.md`; add examples to `voice.test.ts`
    - _Requirements: REQ-UI-53_
  - [x] 8.4 Q4: extend the hand-written monster lists of `MonsterStage.test.ts`, `svg-markup.art.test.ts`, `result-view.property.test.ts` and `scene.test.ts` only
    - _Requirements: REQ-UI-53_

- [x] 9. Art
  - [x] 9.1 `monsters-new.tsx`: `MonsterInvestmentGoblin` only (three to five shapes plus one `-detail` group, tokens only). Add the id to `ArtId` and `ART_REGISTRY`, and the id to `EXPECTED_IDS` in `art.test.ts`. Add `monsters-new.test.ts` rows (markup rules, tokens exist in both palettes, no hex color)
    - Run `art*.test.ts`, `registry.test.ts`, `stage/svg-markup.art.test.ts`
    - **Stop here and show the goblin to the maintainer before 9.2**
    - _Requirements: REQ-HUNT-77 to REQ-HUNT-80_
  - [x] 9.2 `MonsterRomanceWraith`, registered and tested the same way
    - Re-run `art-budget.test.ts`: each file at most 30 KB, all art at most 350 KB
    - _Requirements: REQ-HUNT-77 to REQ-HUNT-79_

- [x] 10. Documentation
  - [x] 10.1 `README.md`: list the six main monsters; extend "Known limits" (REQ NFR-RT-06). Documentation only
    - _Requirements: NFR-RT-06_

- [x] 11. Final measurement and cleanup
  - [x] 11.1 Re-run the whole suite; fill the "after" columns of the table in `design.md` with the measured numbers (correct monsters, missed scams, false positives, Earlier_Samples unchanged); list any test that changed and why
    - _Requirements: REQ-PIPE-78, REQ-PIPE-85, NFR-RT-08_
  - [x] 11.2 Delete every `tmp-*` file; `git status` shows only the files of the design "Files" table
    - _Requirements: NFR-RT-07_

- [x] 12. Detailed art for the two new monsters (maintainer request)
  - [x] 12.1 Redraw `MonsterInvestmentGoblin` in `monsters-new.tsx` to the hunter-scene detail standard: 4 to 6 shades from existing tokens, linear or radial gradients for depth (defined in `<defs>` with unique ids, stop colors as `var(--th-...)`), shading and rim light, fine details in groups whose `data-part` ends with `-detail` (coin shine, fur or cloth folds, teeth, chart grid). Keep `data-part` groups, viewBox 0 0 200 200, first token `monster-investment`, no `<text>`, `<title>`, `<filter>`, `<animate>`, no hex color
    - Run `art*.test.ts`, `art-budget.test.ts` (file at most 30 KB, all art at most 350 KB), `stage/svg-markup.art.test.ts`, `MonsterStage.test.ts`
    - **Stop here and show the goblin to the maintainer before 12.2**
    - _Requirements: REQ-HUNT-77 to REQ-HUNT-80_
  - [x] 12.2 Redraw `MonsterRomanceWraith` the same way (translucent hood and cloth folds, fog layers, hollow eyes with glow, heart with rim light and cracks in a `-detail` group)
    - Re-run the same tests and the full `npx vitest run` and `npx tsc --noEmit`
    - _Requirements: REQ-HUNT-77 to REQ-HUNT-79_
