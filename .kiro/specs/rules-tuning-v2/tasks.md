# Implementation Plan: Rules tuning v2

## Overview

Configuration change described in `requirements.md` and `design.md`. No logic, UI, API or LLM change. Windows PowerShell: do not chain with `&&`. Tests use `createPipeline({ llmClient: null })`.

## Tasks

- [x] 1. Diagnosis: run the ten Batch_2 messages through the rules-only pipeline and record signals and monster scores in `design.md` (temporary test deleted)
  - _Requirements: REQ-PIPE-53_
- [x] 2. Append the ten `b2-` samples to `samples.ts`; update `samples.test.ts` counts (53/26/27); add the Clean assertion for `b2-` benign samples in `eval.test.ts`
  - _Requirements: REQ-PIPE-53, REQ-PIPE-54_
- [x] 3. Edit `text-analyzer.config.ts`: remove four bare payment phrases, add strong, detection and chat-migration phrases
  - _Requirements: REQ-TXT-22, REQ-TXT-23, REQ-TXT-24, REQ-TXT-25_
- [x] 4. Add `text-analyzer.v2.test.ts`; change the expected highlight in `highlights.test.ts` to `send money now`
  - _Requirements: REQ-TXT-22 to REQ-TXT-25_
- [x] 5. Run `vitest run`, `npx tsc --noEmit`, `npm run lint`; copy the measured table into `design.md`
  - _Requirements: REQ-PIPE-54, REQ-PIPE-55_
