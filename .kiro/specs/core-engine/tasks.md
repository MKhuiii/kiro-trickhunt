# Tasks — TrickHunt Core Engine

## Environment
- OS: Windows, shell: Windows PowerShell 5.1.
- Never chain commands with `&&`; use `;` or run them separately.
- Always make commands non-interactive: `npx --yes`, `--yes` flags.
- Scaffolders (create-next-app, etc.) must not run in a non-empty directory:
  scaffold into a valid-named subfolder (lowercase, no leading underscore),
  then move the files.

## Task 1 — Project scaffold

- [x] Initialise a Next.js 15 project with TypeScript strict mode in the workspace root
- [x] Add Vitest, @vitest/ui, fast-check, and zod as dev dependencies
- [x] Configure `vitest.config.ts` with a `core` test alias
- [x] Add `src/core/index.ts` as the public entry point (empty re-export for now)

## Task 2 — Signal module

- [x] Implement `SignalSource` union type in `src/core/signal.ts`
- [x] Implement the `Signal` interface
- [x] Implement `createSignal(input)` factory with validation (REQ-SIG-01, REQ-SIG-02)
- [x] Write unit tests: valid signal, severity out of range, empty id/evidence/whyItMatters
- [x] Write property test PBT-05 (severity outside [0,1] always errors)

## Task 3 — Aggregator module

- [x] Implement `RiskLevel` type and `AggregationResult` interface in `src/core/aggregator.ts`
- [x] Implement `aggregate(signals)` using the noisy-or formula (REQ-AGG-01 through REQ-AGG-06)
- [x] Implement the score-to-level mapping function
- [x] Write unit tests: empty list, single severity=1, level boundary values (49/50, 79/80)
- [x] Write property tests PBT-01 (score always in [0,100]), PBT-02 (monotonicity), PBT-04 (level matches score)

## Task 4 — Analyzer interface + registry

- [x] Define the `Analyzer<TInput>` interface in `src/core/analyzer.ts`
- [x] Implement `AnalyzerRegistry` with `register` and `analyze` methods
- [x] Ensure `AnalyzerRegistry.analyze` never rejects (wraps individual analyzers)
- [x] Write unit tests: registry with zero analyzers, analyzer returning signals, analyzer that throws internally
- [x] Write property test PBT-03 using a passthrough analyzer with `fc.anything()` input

## Task 5 — Public API and integration test

- [x] Re-export `Signal`, `createSignal`, `aggregate`, `AggregationResult`, `RiskLevel`, `Analyzer`, `AnalyzerRegistry` from `src/core/index.ts`
- [x] Write one integration test: create two signals, run through registry, aggregate, assert level is correct
- [x] Verify `vitest run` passes with zero failures
