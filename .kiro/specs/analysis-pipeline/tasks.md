# Tasks — TrickHunt Analysis Pipeline

## Environment
- OS: Windows, shell: Windows PowerShell 5.1.
- Never chain commands with `&&`; use `;` or run them separately.
- Always make commands non-interactive: `npx --yes`, `--yes` flags.
- Run tests with `vitest run` (single-pass, no watch).
- Tests never touch the network: use `FakeLlmClient`.
- Do not edit `src/core/` or `src/analyzers/`.

## Task 1 — Types and config

- [x] Create `verdict.ts` and the five config files (REQ-PIPE-01 to 07, 22,
      28, 29, 33 to 35, 37 to 40)
- [x] Unit tests: both locales complete and non-empty; forbidden safety words
      absent (REQ-PIPE-41); overlap ids unique across groups; monster and rule
      signal ids exist in the real analyzer configs; `MIN_SCORE_BY_LEVEL`
      maps back to its level through `aggregate`

## Task 2 — Input handling

- [x] Implement `prepareInput` (REQ-PIPE-08 to 13)
- [x] Unit tests: truncation flag, URL order and de-duplication, cap and
      `urlsSkipped`, over-long URL skipped, blank input, non-string entries
- [x] Property test PBT-33

## Task 3 — Reduce and combine

- [x] Implement evidence shortening, overlap reduction and stable sort
      (REQ-PIPE-05, 23 to 27)
- [x] Implement `applyRules` with `.*` prefix matching (REQ-PIPE-28 to 32)
- [x] Unit tests: overlap pair does not inflate score; repeated URL signals
      collapse; both seed rules fire and do not fire; rules never lower
- [x] Property test PBT-31

## Task 4 — Monster, actions, limitations

- [x] Implement `selectMonster`, `buildActions`, `buildLimitations`
      (REQ-PIPE-33 to 42)
- [x] Unit tests: tie-break order, threshold gives `generic`, `no_signals`
      gives `null`, de-duplicated actions, fallback action, degraded and
      unavailable limitations

## Task 5 — createPipeline

- [x] Implement `createPipeline` and `index.ts` (REQ-PIPE-14 to 21)
- [x] Unit tests: the seven example tests in requirements section 8.1;
      semantic skipped by policy; failing client gives `degraded` with rule
      signals; `null` client gives `unavailable`; concurrent runs keep their
      own semantic status
- [x] Property tests PBT-28, 29, 30, 32, 34, 35, 36, 37

## Task 6 — Verification

- [x] Run `vitest run` and the TypeScript build
- [x] Verify `src/pipeline` imports nothing from `next`, `react`, `window`,
      `document`, `process` or `src/server`, and that no existing core or
      analyzer file changed (`git diff --stat`)
