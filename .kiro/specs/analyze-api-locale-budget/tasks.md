# Implementation Plan: Analyze API locale and lazy budget

## Overview

Change `POST /api/analyze` as described in `requirements.md`. No change to
`src/core`, `src/analyzers`, `src/pipeline` or `src/server/llm`.

## Environment

- OS: Windows, shell: Windows PowerShell 5.1. Never chain with `&&`.
- Run tests with `vitest run` (single pass). No network in tests.
- Relative imports only. Client code never imports `src/server/`.
- Do not implement beyond the task being executed.

## Tasks

- [x] 1. Server request and log types
  - [x] 1.1 Add optional `locale` to `analyze-request.ts`; add `"skipped"` to `LogSemanticMode`
    - `z.enum(["vi","en"]).optional()` in the strict schema; `ParsedRequest.input.locale`
    - _Requirements: REQ-API-43, REQ-API-44, REQ-API-45, REQ-API-57_
  - [x] 1.2 Extend `analyze-request.test.ts`
    - Valid `vi` and `en`; `fr`, `VI`, `null`, number, empty string give `invalid-input`; locale alone fails; unknown keys still fail
    - _Requirements: REQ-API-43, REQ-API-44, REQ-API-45_

- [x] 2. Lazy client
  - [x] 2.1 Create `src/server/api/lazy-llm-client.ts`
    - Per design; denial throws `LlmClientError("network")`; throwing `tryAcquire` counts as denial
    - _Requirements: REQ-API-49, REQ-API-50, REQ-API-51, REQ-API-53, NFR-AL-01_
  - [x] 2.2 Unit tests `lazy-llm-client.test.ts`
    - No `tryAcquire` at construction; allowed call reaches the real client with the same request; denial does not reach it and throws the fixed error; outcome values
    - _Requirements: REQ-API-49, REQ-API-50, REQ-API-51_
  - [x] 2.3 Property test PBT-62 in `lazy-llm-client.property.test.ts`
    - **Property: acquisitions equal Real_Calls; attempts equal Real_Calls plus Denials**
    - **Validates: Requirements REQ-API-53**

- [x] 3. Handler
  - [x] 3.1 Update `analyze-handler.ts`
    - Build Lazy_Client per request; pass `locale` only when present; derive mode after the run (also on a throwing run); log the same mode; remove eager `tryAcquire`
    - _Requirements: REQ-API-46, REQ-API-48, REQ-API-52, REQ-API-54, REQ-API-55, REQ-API-56, REQ-API-57_
  - [x] 3.2 Update `analyze-handler.test.ts` (changes listed in the requirements)
    - Stub pipeline calling `complete`; used, budget-exhausted, skipped (critical text, blank text with urls), not-configured; locale `vi` gives Vietnamese actions; absent locale gives no `locale` key in options
    - _Requirements: REQ-API-46 to REQ-API-48, REQ-API-52, REQ-API-54 to REQ-API-57_
  - [x] 3.3 Replace PBT-44 with PBT-63; add PBT-59, PBT-60, PBT-61 in `analyze-handler.property.test.ts`
    - **Property: locale acceptance and fixed error bodies (PBT-59)**
    - **Property: locale texts (PBT-60)**
    - **Property: blank text never acquires, mode skipped (PBT-61)**
    - **Property: denying budget degrades (PBT-63)**
    - **Validates: Requirements REQ-API-43 to REQ-API-47, REQ-API-52, REQ-API-54, REQ-API-55**

- [x] 4. Checkpoint - Ensure all tests pass
  - Run `vitest run` for `src/server` and `src/app`; ask the user if questions arise.

- [x] 5. Client
  - [x] 5.1 Update `types.ts`, `analyze-input.ts`, `analyze-client.ts`
    - Locale in `AnalyzeRequest`, builder input and `buildBody`; `skipped` in `SemanticMode` and `MODES`
    - _Requirements: REQ-CI-61, REQ-CI-62, REQ-CI-63_
  - [x] 5.2 Update client tests (changes listed in the requirements)
    - New locale cases in `analyze-client.test.ts` and `analyze-input.test.ts`; `skipped` 200 case; amend PBT-49, PBT-50 and replace PBT-56 by PBT-64
    - **Property: client body keys and locale values (PBT-64)**
    - **Validates: Requirements REQ-CI-61, REQ-CI-62, REQ-CI-63**

- [x] 6. Documentation
  - [x] 6.1 Update `README.md`
    - Request table gains `locale`; remove "There is no `locale` field"; four `semanticMode` values; lazy budget note; browser section text
    - _Requirements: REQ-API-58_

- [x] 7. Final verification
  - [x] 7.1 Run checks
    - `vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build`
    - `git diff --stat -- src/core src/analyzers src/pipeline src/server/llm` shows no changes
    - Grep: no `tryAcquire` call in `analyze-handler.ts`; no import of `src/server` in `src/client`; no path alias imports
    - _Requirements: all_

## Notes

- Tests ship with their implementation.
- PBT-44 and PBT-56 are replaced, not kept beside the new ones.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "5.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "5.2"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.3", "6.1"] },
    { "id": 4, "tasks": ["7.1"] }
  ]
}
```
