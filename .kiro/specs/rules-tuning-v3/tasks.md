# Implementation Plan: Rules tuning v3

## Overview

Configuration change plus one logic change, described in `requirements.md` and
`design.md`. The logic change is `selectMonster` in `src/pipeline/monster.ts`
(overlap-group gate at level `suspicious`, task 4.4, option A). No UI, API or
LLM change. `monster.ts` (`selectMonster` only) and `monster.test.ts` change,
and a new test `monster.gate.property.test.ts` is added. `reduce.ts`,
`combine.ts`, `overlap.config.ts` and `src/core/` stay untouched.
`MONSTER_THRESHOLD` and `MONSTER_ORDER` stay unchanged. The repo-root
`README.md` gains a "Known limits" section (task 7.4). Windows PowerShell: do
not chain with `&&`. Tests use `createPipeline({ llmClient: null })`, except
the `FakeLlmClient` tests of tasks 4.3 and 4.4. No network, no new dependency.
Any temporary diagnosis file must be named `src/**/tmp-*.test.ts` (git-ignored)
and deleted before the final task.

Do not tick a task until its tests have actually been run in this session.

Task 7.5 is a manual check performed by the maintainer. Do not dispatch it.

## Tasks

- [x] 1. Diagnosis: run the twenty Batch_3 messages through the rules-only pipeline and record signals, weights and monster scores in `design.md` (done while writing the spec; temporary test deleted)
  - _Requirements: REQ-PIPE-64_
- [x] 2. Evaluation set (measure before changing)
  - [x] 2.1 Append the twenty-two `b3-ben-01` to `b3-ben-22` samples to `samples.ts` (texts from the design)
    - _Requirements: REQ-PIPE-56_
  - [x] 2.2 Update `samples.test.ts` counts (75 / 26 / 49, 22 `b3-` ids); add the `b3-` block to `eval.test.ts`
    - Run once on the unchanged config: exactly 17 `b3-` tests must fail (01 to 09, 12 to 18, 22: 16 at `high` or above, plus 09 with monster `job-bait`); 10, 11, 19, 20, 21 pass
    - _Requirements: REQ-PIPE-56, REQ-PIPE-57_
- [x] 3. Text rule configuration
  - [x] 3.1 Edit `text-analyzer.config.ts` weights and phrases as in the design (otp-request, urgency, threat, payment-request, authority-impersonation, off-platform, job-offer)
    - Keep `send me the code` first in the English otp list
    - _Requirements: REQ-TXT-26 to REQ-TXT-32_
  - [x] 3.2 Add `text-analyzer.v3.test.ts` (example tests from the requirements)
    - _Requirements: REQ-TXT-27 to REQ-TXT-31_
  - [x] 3.3 Fix the fixture `ADDED_PHRASES` in `text-analyzer.property.test.ts`; remove three inputs from `text-analyzer.v2.test.ts`
    - Removed inputs: `pay immediately by gift cards`, `A one-time registration fee of $20`, `only a small processing fee required`
    - Justification per removed input recorded in design.md "Removed test inputs"
    - Re-verify by running `text-analyzer.v2.test.ts`, `text-analyzer.property.test.ts` and `text-analyzer.v3.test.ts` before ticking this task
    - _Requirements: REQ-TXT-29, REQ-TXT-31_
- [x] 4. Pipeline configuration
  - [x] 4.1 Edit `monsters.config.ts` (bank, job-bait, authority, and the three semantic weights) and `rules.config.ts` (five rules) as in the design; leave `MONSTER_THRESHOLD`, `MONSTER_ORDER`, `overlap.config.ts`
    - _Requirements: REQ-PIPE-59, REQ-PIPE-60, REQ-PIPE-62, REQ-PIPE-66_
  - [x] 4.2 Update `combine.test.ts` ("needs all three groups"), `monster.test.ts` (tie case, job-offer case, one comment) and `pipeline.test.ts` ("overlapping urgency ...") as in the requirements table; add `combine.v3.test.ts`
    - _Requirements: REQ-PIPE-59, REQ-PIPE-60, REQ-PIPE-61_
  - [x] 4.3 (amendment) Edit `semantic-analyzer.config.ts`: `SEVERITY_CAP` 0.45, every `maxSeverity` 0.45; add `semantic-monster.test.ts` with `FakeLlmClient` (REQ-PIPE-69, REQ-PIPE-70)
    - (a) FakeLlmClient unit test in `semantic-monster.test.ts`: `semantic.impersonation-tone`, `semantic.pressure-escalation` and `semantic.isolation-secrecy` at the cap (0.45) on the benign base message `b3-ben-21` give level `critical` and score 83 (design, "Semantic cap: levels with the real aggregate": 1 - 0.55³ = 0.833625). The three ids are in different overlap groups (0, 1, 3), so `reduceForScoring` keeps all three
    - (b) FakeLlmClient test: one semantic signal at the cap stays below the `high` threshold (score 45, below 50, level `suspicious`). Compare the rounded `score`, not the unrounded value
    - Also keep the REQ-PIPE-69 tests (single signal at most `suspicious` and `generic` for severities 0.3, 0.6 and 1; `high` with the matching rule signal)
    - Run `semantic-monster.test.ts`, `semantic-analyzer.config.test.ts`, `semantic-analyzer.test.ts` and `semantic-analyzer.property.test.ts` before ticking this task
    - _Requirements: REQ-PIPE-65, REQ-PIPE-69, REQ-PIPE-70_
  - [x] 4.4 (amendment) `selectMonster` gating by overlap group. The maintainer chose option A (design, "Decision: gate `selectMonster` by overlap group"). Constraints: change only `selectMonster` in `src/pipeline/monster.ts` and the tests it breaks (`monster.test.ts`); the gate applies only at level `suspicious`; at `high` and `critical` the behaviour is exactly as before, proven by a property test against a copy of the old logic kept inside the test file; `MONSTER_THRESHOLD` and `MONSTER_ORDER` unchanged; signals in the same overlap group count once; a specific monster at `suspicious` needs two different overlap groups that both support it
    - Implement in `src/pipeline/monster.ts` (`selectMonster` only; no signature change; `overlap.config.ts` is imported read-only; `reduce.ts` untouched). An implementation exists in the working tree: review it against the constraints and keep it if it conforms
    - Update the tests it breaks in `monster.test.ts`: one line per changed test with its reason, recorded in `design.md` (the table under "Decision: gate `selectMonster` by overlap group"). By reading, the gate itself breaks none; comment-only fixes remain for the tie cases (stale "bank 2 vs prize 2" and "prize 3 vs job-bait 3")
    - Property tests in `src/pipeline/monster.gate.property.test.ts`: (a) two signals of the same overlap group at `suspicious` give `generic` (PBT-86); (b) two signals from different groups that both support the same monster give that monster at `suspicious` (PBT-87); (c) at `high` and `critical` the result equals a copy of the old logic kept inside the test file (PBT-88)
    - All 75 evaluation samples pass (`eval.test.ts`, unchanged expectations)
    - Run `monster.test.ts`, `monster.gate.property.test.ts`, `precision.property.test.ts`, `semantic-monster.test.ts`, `eval.test.ts` and `pipeline.test.ts` before ticking this task
    - _Requirements: REQ-PIPE-67, REQ-PIPE-68, REQ-PIPE-71_
- [x] 5. Property tests
  - [x] 5.1 `src/pipeline/precision.property.test.ts`: PBT-81, PBT-82, PBT-83, PBT-85
    - **Property: one Ambiguous_Group signal is at most `suspicious` and `generic`; appending a benign sentence never lowers `riskScore`**
    - **Validates: Requirements REQ-TXT-26, REQ-PIPE-60, REQ-PIPE-61**
  - [x] 5.2 `src/analyzers/text-analyzer.v3.property.test.ts`: PBT-84 and the fixture test
    - **Property: matching of every added phrase is invariant under case and diacritic removal**
    - **Validates: Requirements REQ-TXT-32**
- [x] 6. Checkpoint - Ensure all tests pass
  - Run `vitest run`; `eval.test.ts` must pass for all 75 samples with no exception. If a scam sample cannot keep its level, list it under "Accepted recall loss" in `design.md` (maximum 5, ask the maintainer before the sixth)
  - Must be re-run after 4.4 (the gate changes `selectMonster`); a run from before 4.4 does not count
- [x] 7. Report and verification
  - [x] 7.1 Re-measure the before and after tables with a temporary test (level, monster, fired signals, monster totals per sample); copy real numbers into `design.md` (if they differ from the prototype, update the design text, not the samples); delete the test
    - Run only after 4.4, 5 and 6 are done again, so the numbers describe the final configuration
    - _Requirements: REQ-PIPE-63, REQ-PIPE-64_
  - [x] 7.2 Run `vitest run`, `npx tsc --noEmit` and `npm run lint`
    - Only the tests in the requirements table changed (plus additions)
    - _Requirements: NFR-RT-04_
  - [x] 7.3 `git diff --stat` (and `git status --short` for new files): only these files changed or were added, plus the spec files under `.kiro/specs/rules-tuning-v3/`: `text-analyzer.config.ts`, `semantic-analyzer.config.ts`, `monsters.config.ts`, `rules.config.ts`, `monster.ts` (`selectMonster` only), `samples.ts`, and the tests `text-analyzer.property.test.ts`, `text-analyzer.v2.test.ts`, `combine.test.ts`, `monster.test.ts`, `pipeline.test.ts`, `eval.test.ts`, `samples.test.ts`, plus the new tests `text-analyzer.v3.test.ts`, `text-analyzer.v3.property.test.ts`, `pipeline/precision.property.test.ts`, `pipeline/combine.v3.test.ts`, `pipeline/semantic-monster.test.ts`, `pipeline/monster.gate.property.test.ts`, `README.md` (task 7.4), and `.gitignore` (maintainer-approved: ignore `.vitest/` cache). `reduce.ts`, `combine.ts`, `overlap.config.ts` and `src/core/` untouched; no temporary file remains. Run after 7.4 so that `README.md` is already in the diff
    - _Requirements: NFR-RT-03, REQ-PIPE-62_
  - [x] 7.4 Add a "Known limits" section to `README.md` (repo root): rules-only mode has low recall on unfamiliar scam wording and the AI layer is needed for those; the evaluation set was used for tuning and is not an accuracy estimate; the accepted recall losses, if any (currently none, per `design.md`). Documentation only: do not edit any source or test file
    - Keep the wording free of absolute safety claims ("safe" is never a verdict)
    - _Requirements: NFR-RT-05_
  - [x] 7.5 (manual, maintainer) Manual: performed by the maintainer, not by an agent. Do not dispatch. The maintainer re-runs six previously seen scam messages with the real LLM model (not `FakeLlmClient`) and fills the table in `design.md` "Manual check": message id or description, level, monster, fired signals. Acceptance criterion: level at least `high` for each of the six
    - _Requirements: REQ-PIPE-65, REQ-PIPE-70_

## Notes

- Do not tick a task until its tests have actually been run in this session.
- Task 7.5 is manual (maintainer only); do not dispatch it.
- Task 7.3 runs after 7.4 and includes `README.md` in its allowed-file list.
- Task 6 must be re-run after 4.4; task 7.1 runs only after 4.4, 5 and 6 are done again.
- Top-level boxes (4, 5, 7) are kept as they were; the sub-task boxes carry the real status.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["3.3", "4.3"] },
    { "id": 1, "tasks": ["4.4"] },
    { "id": 2, "tasks": ["5.1"] },
    { "id": 3, "tasks": ["7.1", "7.4"] },
    { "id": 4, "tasks": ["7.2"] },
    { "id": 5, "tasks": ["7.3"] },
    { "id": 6, "tasks": ["7.5"] }
  ]
}
```
