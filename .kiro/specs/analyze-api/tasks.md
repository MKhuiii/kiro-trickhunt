# Implementation Plan: Analyze API

## Overview

Build `POST /api/analyze` as a handler factory in `src/server/api/` with an
in-memory rate limiter and LLM budget, then a thin App Router route. No change
to `src/core`, `src/analyzers`, `src/pipeline` or `src/server/llm`.

## Environment

- OS: Windows, shell: Windows PowerShell 5.1.
- Never chain commands with `&&`; use `;` or run them separately.
- Always make commands non-interactive: `npx --yes`, `--yes` flags.
- Run tests with `vitest run` (single-pass, no watch).
- Tests never touch the network: use `FakeLlmClient`, fake clocks and
  standard `Request` / `Response`.
- Relative imports only, no path alias.
- Do not edit `src/core/`, `src/analyzers/`, `src/pipeline/` or the existing
  `src/server/llm/` contracts.
- Do not implement beyond the task being executed.

## Tasks

- [x] 1. Limits, config and logging types
  - [x] 1.1 Create `src/server/api/api-limits.config.ts` and `api-config.ts`
    - Constants from the design; `readApiConfig` with zod, defaults, clamping, never throws
    - Create `log-event.ts` with the closed types and `defaultLogEvent` (only `console` use, with comment)
    - _Requirements: REQ-API-13, REQ-API-33, REQ-API-34, REQ-API-35, REQ-API-36, REQ-API-37, REQ-API-38_
  - [x] 1.2 Unit tests for config and limits
    - Defaults on empty env; blank, non-decimal and huge values give defaults or clamp; zero LLM limit allowed
    - `MAX_BODY_BYTES >= 6 * (MAX_TEXT_CHARS + MAX_URLS_IN * MAX_URL_CHARS) + 1024`
    - `MAX_TEXT_CHARS` and `MAX_URL_CHARS` equal the pipeline values
    - _Requirements: REQ-API-13, REQ-API-34, REQ-API-35_
  - [x] 1.3 Property test PBT-46 in `api-config.property.test.ts`
    - **Property 9: Config total and clamped**
    - **Validates: Requirements REQ-API-34, REQ-API-35**

- [ ] 2. Rate limiter and client key
  - [x] 2.1 Create `src/server/api/rate-limiter.ts`
    - `createRateLimiter` with injected clock, sliding window, denied not recorded, `MAX_TRACKED_KEYS` eviction, lazy cleanup
    - `extractClientKey` (first `x-forwarded-for` entry, trimmed, capped, `"unknown"`)
    - _Requirements: REQ-API-20, REQ-API-21, REQ-API-22, REQ-API-23, REQ-API-24, REQ-API-25_
  - [x] 2.2 Unit tests for the limiter
    - Limit+1 denied with `retryAfterSec >= 1`; allowed again after the window; keys independent; oldest key evicted; cleanup removes idle keys; missing, blank and multi-entry header cases
    - _Requirements: REQ-API-20, REQ-API-21, REQ-API-22, REQ-API-23, REQ-API-24_
  - [x] 2.3 Property tests PBT-40 and PBT-42 in `rate-limiter.property.test.ts`
    - **Property 3: Rate limiter window and bounds**
    - **Property 5: Client key bounded and total**
    - **Validates: Requirements REQ-API-20, REQ-API-21, REQ-API-22, REQ-API-24**

- [x] 3. LLM budget
  - [x] 3.1 Create `src/server/api/llm-budget.ts`
    - `createLlmBudget` with per-minute and per-day sliding windows, injected clock, denied not recorded
    - _Requirements: REQ-API-27, REQ-API-31, REQ-API-32_
  - [x] 3.2 Unit tests for the budget
    - Minute cap, day cap, recovery after windows, zero limit always denies
    - _Requirements: REQ-API-27_
  - [x] 3.3 Property test PBT-41 in `llm-budget.property.test.ts`
    - **Property 4: Budget windows**
    - **Validates: Requirements REQ-API-27**

- [x] 4. Request parsing and responses
  - [x] 4.1 Create `analyze-response.ts` and `analyze-request.ts`
    - Error codes, fixed headers, `Retry-After`, exact error body
    - Content-type check, `Content-Length` check, bounded stream read, fatal UTF-8 decode, JSON parse, strict zod schema, text-or-urls rule
    - _Requirements: REQ-API-07, REQ-API-08, REQ-API-09, REQ-API-10, REQ-API-11, REQ-API-12, REQ-API-16, REQ-API-17, REQ-API-18, REQ-API-19_
  - [x] 4.2 Unit tests for parsing and responses
    - 415; declared 413; undeclared 413 (stream stops early); invalid UTF-8; invalid JSON; unknown keys; wrong types; over-limit text and URLs; blank text with no urls; missing body; charset parameter accepted
    - Error body exactness and the three headers; no CORS header
    - _Requirements: REQ-API-07 to REQ-API-12, REQ-API-16, REQ-API-18, REQ-API-19_

- [x] 5. Handler
  - [x] 5.1 Create `src/server/api/analyze-handler.ts`
    - Flow order from the design; eager budget acquisition; pipeline with `{ llmClient }` only; one `logEvent` per request in its own `try/catch`; outer `try/catch` to 500
    - _Requirements: REQ-API-01, REQ-API-03, REQ-API-04, REQ-API-05, REQ-API-14, REQ-API-15, REQ-API-26, REQ-API-28, REQ-API-29, REQ-API-30, REQ-API-37, REQ-API-39, REQ-API-40_
  - [x] 5.2 Unit tests for the handler (example list in requirements)
    - Valid text gives 200 with `verdict` and `meta`; 415; 413; 400 for bad JSON and unknown keys
    - The (limit+1)th request gives 429 with `Retry-After`; rate-limited request never reads the body
    - No client gives `"not-configured"` and no `tryAcquire`; denied budget gives `"budget-exhausted"` and `llmClient: null`; acquired gives `"used"`
    - Throwing `logEvent`, `now`, `getLlmClient` and `createPipeline` still give a `Response`
    - Responses and `logEvent` calls never contain the input text; `logEvent` called once with the closed shape
    - _Requirements: REQ-API-01, REQ-API-03, REQ-API-05, REQ-API-14, REQ-API-15, REQ-API-17, REQ-API-26 to REQ-API-30, REQ-API-37, REQ-API-39, REQ-API-40_
  - [x] 5.3 Property tests PBT-38, 39, 43, 44, 45 in `analyze-handler.property.test.ts`
    - **Property 1: Handler total**
    - **Property 2: Fixed error bodies, no leaks**
    - **Property 6: Pipeline failure maps to 500**
    - **Property 7: Budget denial degrades, not fails**
    - **Property 8: Valid inputs pass validation**
    - **Validates: Requirements REQ-API-01, REQ-API-05, REQ-API-11, REQ-API-12, REQ-API-16, REQ-API-19, REQ-API-29**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Wiring and route
  - [x] 7.1 Create `default-handler.ts`, `index.ts` and `src/app/api/analyze/route.ts`
    - Real deps from `readApiConfig()`, `createLlmClient(process.env, fetch)` once, `createPipeline`, `Date.now`, `defaultLogEvent`
    - Route exports `runtime = "nodejs"`, `dynamic = "force-dynamic"`, `maxDuration = 15` (literal, comment that the plan may cap it) and `POST`
    - _Requirements: REQ-API-02, REQ-API-06_
  - [x] 7.2 Unit tests for wiring
    - Route module exports exactly `POST`, `runtime`, `dynamic`, `maxDuration` with the expected values
    - Default handler with no LLM env returns 200 `"not-configured"` for a valid body (no network)
    - _Requirements: REQ-API-02, REQ-API-06, REQ-API-30_

- [x] 8. Documentation
  - [x] 8.1 Add a README section and update `.env.example`
    - Endpoint contract, request and response examples, error codes, PowerShell `Invoke-RestMethod` call with a JSON body, limits table, best-effort in-memory limiter and budget (per instance, resets on cold start), rules-only fallback, `maxDuration` note
    - `.env.example`: `RATE_LIMIT_PER_MINUTE`, `LLM_CALLS_PER_MINUTE`, `LLM_CALLS_PER_DAY` with placeholder values and bounds comments; no `NEXT_PUBLIC_`
    - _Requirements: REQ-API-41, REQ-API-42_

- [x] 9. Final verification
  - [x] 9.1 Run checks and confirm contracts unchanged
    - `vitest run`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass
    - `git diff --stat -- src/core src/analyzers src/pipeline src/server/llm` shows no changes
    - Grep: `console.` only in `src/server/api/log-event.ts`; no `process.env` in `src/server/api/` outside `api-config.ts` and `default-handler.ts`; no import of `next` or `react` in `src/server/api/`; no path alias imports; no `NEXT_PUBLIC_`
    - _Requirements: REQ-API-36, REQ-API-38, REQ-API-40, NFR-API-01_

## Notes

- Each task references specific requirements for traceability.
- Property tests validate universal correctness properties from the design.
- Sub-tasks are not marked optional: tests ship with their implementation.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "2.1", "3.1", "4.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "3.3", "4.2", "5.1"] },
    { "id": 3, "tasks": ["5.2", "5.3", "7.1"] },
    { "id": 4, "tasks": ["7.2", "8.1"] },
    { "id": 5, "tasks": ["9.1"] }
  ]
}
```
