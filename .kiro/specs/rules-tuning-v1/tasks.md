# Implementation Plan: Rules tuning v1

## Overview

Configuration change described in `requirements.md` and `design.md`. No change
to `TextAnalyzer`, `selectMonster`, `reduceForScoring`, `applyRules`,
`aggregate`, `Signal` or `Analyzer`. No UI component, API or LLM change.

## Environment

- OS: Windows, shell: Windows PowerShell 5.1. Never chain with `&&`.
- Run tests with `vitest run` (single pass). No network. No new dependency.
- Pipeline tests use `createPipeline({ llmClient: null })`.
- Do not implement beyond the task being executed.
- Any temporary diagnosis file must be deleted before the final task.

## Tasks

- [x] 1. Evaluation set (measure before changing)
  - [x] 1.1 Create `src/pipeline/eval/samples.ts` with the 43 samples from the design
    - Type `EvalSample`; `EVAL_SAMPLES` readonly; fake brands, `.example` URLs only
    - _Requirements: REQ-PIPE-43, REQ-PIPE-44, REQ-PIPE-45_
  - [x] 1.2 Create `samples.test.ts` (counts, unique ids, `.example` rule, no real brand list) and `eval.test.ts` (one test per sample, REQ-PIPE-46)
    - Run once on the unchanged config and record the failures; they must equal the "Before" column of the design (4 wrong or missed scams, 4 benign false positives)
    - _Requirements: REQ-PIPE-45, REQ-PIPE-46, REQ-PIPE-47_

- [x] 2. Text rule configuration
  - [x] 2.1 Edit `text-analyzer.config.ts` phrase lists as written in the design (otp-request, urgency, payment-request, off-platform, threat)
    - Keep `send me the code` first in the English otp list
    - _Requirements: REQ-TXT-16, REQ-TXT-17, REQ-TXT-18, REQ-TXT-21_
  - [x] 2.2 Add groups `text.job-offer` (0.45) and `text.financial-institution` (0.2) with `whyItMatters`, English and Vietnamese phrases
    - _Requirements: REQ-TXT-19, REQ-TXT-20, REQ-TXT-21_
  - [x] 2.3 Update `text-analyzer.config.test.ts` and `text-analyzer.test.ts` (8 to 10 groups, two ids added)
    - _Requirements: REQ-TXT-19, REQ-TXT-20_
  - [x] 2.4 Add example tests: "It will ship in 24 hours" gives no signals; "locked in 24 hours" gives `text.urgency`; "Do not share your OTP" gives no `text.otp-request`; "reply with the OTP" gives it; a plain job posting gives no `text.job-offer`
    - _Requirements: REQ-TXT-16, REQ-TXT-17, REQ-TXT-19_
  - [x] 2.5 Property tests PBT-75, PBT-77, PBT-78 in `text-analyzer.property.test.ts`
    - **Property: one signal per group and bounded evidence; invariance under case and diacritic removal for the new phrases**
    - **Validates: Requirements REQ-TXT-21**

- [x] 3. Pipeline configuration
  - [x] 3.1 Edit `monsters.config.ts` weights and `overlap.config.ts` as in the design; leave `MONSTER_THRESHOLD` and `MONSTER_ORDER`
    - _Requirements: REQ-PIPE-48, REQ-PIPE-49, REQ-PIPE-50, REQ-PIPE-51_
  - [x] 3.2 Update `monster.test.ts`: replace the third tie case with `text.off-platform` + `text.payment-request` (expects `job-bait`, update the comment); add `text.job-offer` alone gives `job-bait`
    - _Requirements: REQ-PIPE-48, REQ-PIPE-50_
  - [x] 3.3 Property tests PBT-76 and PBT-80 in `eval.property.test.ts`
    - **Property: appending a benign sentence never lowers `riskScore`; OTP prohibition sentences never give `text.otp-request`**
    - **Validates: Requirements REQ-PIPE-46, REQ-TXT-17**

- [x] 4. UI dictionary
  - [x] 4.1 Add the two ids to `KNOWN_SIGNAL_IDS` and fix its comment; add the four dictionary entries (en and vi)
    - Sentences of at most 25 words; no "safe" or "an toàn"
    - _Requirements: REQ-UI-45, REQ-UI-46_
  - [x] 4.2 Property test PBT-79 (extend `dictionary.property.test.ts`: ids from `TEXT_PATTERNS` are all in `KNOWN_SIGNAL_IDS`)
    - **Property: every known id has an explanation in both dictionaries**
    - **Validates: Requirements REQ-UI-45, REQ-UI-46**

- [x] 5. Checkpoint - Ensure all tests pass
  - Run `vitest run`; `eval.test.ts` must pass for every sample with no exceptions

- [x] 6. Report and verification
  - [x] 6.1 Re-measure the "Before and after" table with a temporary script (print level, monster, fired signals, monster totals per sample); copy the real "After" numbers and per-sample results into `design.md`; delete the script
    - If a number differs from the prototype, update the design text, not the samples
    - _Requirements: REQ-PIPE-52_
  - [x] 6.2 Run `vitest run`, `npx tsc --noEmit` and `npm run lint`
    - Only these existing tests changed: `text-analyzer.config.test.ts`, `text-analyzer.test.ts`, `monster.test.ts` (plus additions)
    - _Requirements: NFR-RT-02_
  - [x] 6.3 Verify with `git diff --stat` that no file outside the "Files" list in the design changed, that `text-analyzer.ts`, `monster.ts`, `reduce.ts`, `combine.ts` and `src/core/` are untouched, and that no temporary file remains (`git status`)
    - _Requirements: NFR-RT-01, REQ-PIPE-51_
