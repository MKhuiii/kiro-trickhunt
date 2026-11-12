# Requirements Document

## Introduction

A public `POST /api/analyze` endpoint. It validates the request, protects the
free-tier LLM quota with a rate limiter and an LLM budget, runs the existing
analysis pipeline and returns a `Verdict`, without ever leaking or storing
user content.

All logic lives in `src/server/api/` as a handler factory with injected
dependencies. `src/app/api/analyze/route.ts` is a thin wrapper. Rate limit and
budget are in-memory and per server instance (best effort).

**Hard constraints:**
- `src/core/`, `src/analyzers/`, `src/pipeline/` and the `src/server/llm/`
  contracts are NOT changed. The API imports `createPipeline`, `Pipeline`,
  `PipelineOptions` and `Verdict` from `src/pipeline/index.ts`, `LlmClient`
  from `src/analyzers/llm-client.ts` and `createLlmClient` from
  `src/server/llm`.
- Relative imports only, no path alias.
- Code in `src/server/api/` imports nothing from `next` or `react` and uses
  only standard `Request` and `Response`.
- API settings are read only in `api-config.ts`; LLM settings only in
  `src/server/llm/llm-config.ts`.
- Nothing the user sends is stored or logged: no text, URLs, IPs, headers, raw
  LLM output or provider errors. The only log line is a fixed event.
- Tests never touch the network. They use `FakeLlmClient`, fake clocks and
  standard `Request` and `Response` objects.
- The API does not accept a `locale`; the pipeline default `"en"` is used.

## Glossary

- **Analyze_Handler**: The function returned by `createAnalyzeHandler`, mapping a `Request` to a `Response`.
- **Rate_Limiter**: In-memory sliding-window limiter keyed by client key.
- **LLM_Budget**: In-memory counter limiting LLM calls per minute and per day.
- **Client_Key**: First entry of `x-forwarded-for`, trimmed and length-capped, or `"unknown"`.
- **Semantic_Mode**: `"used"`, `"budget-exhausted"` or `"not-configured"`, reported in `meta`.
- **API_Config**: Values read by `readApiConfig` from the environment.
- **API_Limits**: Size constants in `api-limits.config.ts`.
- **Log_Event**: The fixed-shape object passed to `logEvent`.
- **Pipeline**: The existing `createPipeline` result from `src/pipeline`.

## Requirements

### Requirement 1: Handler and Route

**User Story:** As a maintainer, I want a thin route over an injectable handler, so that the endpoint is fully testable with standard Request and Response objects.

```ts
export interface AnalyzeHandlerDeps {
  getLlmClient(): LlmClient | null;
  createPipeline(options: PipelineOptions): Pipeline;
  rateLimiter: RateLimiter;
  llmBudget: LlmBudget;
  now(): number;                       // epoch ms, used for duration only
  logEvent(event: AnalyzeLogEvent): void;
}
export function createAnalyzeHandler(deps: AnalyzeHandlerDeps): (req: Request) => Promise<Response>;
```

#### Acceptance Criteria

1. **REQ-API-01** THE Analyze_Handler SHALL always resolve to a `Response` and never throw or reject, converting every internal failure, including a throwing dependency, into a `Response`.
2. **REQ-API-02** THE route module `src/app/api/analyze/route.ts` SHALL export `POST` (built from the factory with real dependencies) and only the route segment options `runtime = "nodejs"`, `dynamic = "force-dynamic"` and a static numeric `maxDuration`.
3. **REQ-API-03** THE Analyze_Handler SHALL process a request in this order: rate limit, content type, declared size, bounded body read, JSON parse, schema validation, budget acquisition, pipeline run, response, and the first failing step SHALL end the request.
4. **REQ-API-04** THE Analyze_Handler SHALL call `createPipeline` once per request with `{ llmClient }` only, where `llmClient` is defined in Requirement 5.
5. **REQ-API-05** IF `createPipeline` or `run` throws or rejects, THEN THE Analyze_Handler SHALL respond 500 with code `internal-error`.
6. **REQ-API-06** THE module `default-handler.ts` SHALL assemble the real dependencies once per module instance, so limiter and budget state persist across warm invocations.

### Requirement 2: Request Validation

**User Story:** As an operator, I want every input checked before work is done, so that malformed or oversized requests cost almost nothing.

#### Acceptance Criteria

1. **REQ-API-07** IF the `Content-Type` media type is not `application/json` (case-insensitive, parameters such as `charset` allowed), THEN THE Analyze_Handler SHALL respond 415 `invalid-content-type` without reading the body.
2. **REQ-API-08** IF `Content-Length` is a valid integer greater than `MAX_BODY_BYTES`, THEN THE Analyze_Handler SHALL respond 413 `payload-too-large` without reading the body, and a missing or non-numeric `Content-Length` SHALL be ignored.
3. **REQ-API-09** WHEN the actual byte count read from the body exceeds `MAX_BODY_BYTES`, THE Analyze_Handler SHALL stop reading and respond 413 `payload-too-large`, regardless of the declared length.
4. **REQ-API-10** IF the body is not valid UTF-8 or not valid JSON, THEN THE Analyze_Handler SHALL respond 400 `invalid-input`.
5. **REQ-API-11** THE Analyze_Handler SHALL validate the body with a strict zod schema `{ text?: string (max MAX_TEXT_CHARS), urls?: string[] (max MAX_URLS_IN items, each max MAX_URL_CHARS) }` and SHALL respond 400 `invalid-input` for unknown keys, wrong types and exceeded limits.
6. **REQ-API-12** IF `text` is absent or whitespace only AND `urls` is absent or empty, THEN THE Analyze_Handler SHALL respond 400 `invalid-input`.
7. **REQ-API-13** THE API_Limits SHALL define `MAX_BODY_BYTES`, `MAX_TEXT_CHARS`, `MAX_URLS_IN` and `MAX_URL_CHARS` as constants (not environment variables), with `MAX_BODY_BYTES` at least the worst-case JSON-encoded size of a maximal valid body and `MAX_TEXT_CHARS` and `MAX_URL_CHARS` not below the pipeline values, so the pipeline truncation stays a second defense.

### Requirement 3: Responses

**User Story:** As a client developer, I want a small, stable response contract, so that I can handle every outcome without parsing messages.

```ts
type SemanticMode = "used" | "budget-exhausted" | "not-configured";
type ErrorCode =
  | "invalid-content-type" | "payload-too-large" | "invalid-input"
  | "rate-limited" | "internal-error";
// 200: { verdict: Verdict, meta: { semanticMode: SemanticMode } }
// else: { error: { code: ErrorCode } }
```

#### Acceptance Criteria

1. **REQ-API-14** WHEN the pipeline completes, THE Analyze_Handler SHALL respond 200 with JSON `{ verdict, meta: { semanticMode } }` where `verdict` is the pipeline result.
2. **REQ-API-15** THE Analyze_Handler SHALL report Semantic_Mode `"used"` when an LLM client exists and the budget acquisition succeeded (the pipeline received the client), `"budget-exhausted"` when a client exists and the budget denied it, and `"not-configured"` when no client exists, and `"used"` SHALL NOT promise that the pipeline called the LLM.
3. **REQ-API-16** THE Analyze_Handler SHALL send error bodies of exactly `{ "error": { "code": <ErrorCode> } }` with status 415 `invalid-content-type`, 413 `payload-too-large`, 400 `invalid-input`, 429 `rate-limited` and 500 `internal-error`.
4. **REQ-API-17** WHEN the Analyze_Handler responds 429, THE response SHALL include a `Retry-After` header holding a positive integer number of seconds.
5. **REQ-API-18** THE Analyze_Handler SHALL set `Content-Type: application/json`, `Cache-Control: no-store` and `X-Content-Type-Options: nosniff` on every response.
6. **REQ-API-19** THE Analyze_Handler SHALL send no CORS headers and SHALL NOT echo request text, URLs, headers or the Client_Key, and error bodies SHALL NOT contain messages, stack traces or dependency output.

### Requirement 4: Rate Limiter

**User Story:** As an operator, I want per-client throttling before any body is read, so that one client cannot exhaust the free tier.

```ts
export interface RateLimiter {
  check(key: string): { allowed: boolean; retryAfterSec: number };
}
```

#### Acceptance Criteria

1. **REQ-API-20** THE Rate_Limiter SHALL allow at most `RATE_LIMIT_PER_MINUTE` requests per key in any 60-second window, using an injected clock.
2. **REQ-API-21** WHEN a check is denied, THE Rate_Limiter SHALL NOT record it and SHALL return a positive integer `retryAfterSec`, and an allowed check SHALL return 0.
3. **REQ-API-22** THE Rate_Limiter SHALL track at most `MAX_TRACKED_KEYS` keys and SHALL evict the least recently seen key when the bound is reached.
4. **REQ-API-23** THE Rate_Limiter SHALL remove expired entries at most every `CLEANUP_INTERVAL_MS`, performed lazily inside `check` without timers.
5. **REQ-API-24** THE Client_Key extraction SHALL take the first `x-forwarded-for` entry, trimmed and cut to `MAX_KEY_CHARS`, SHALL return `"unknown"` for a missing, blank or invalid header, and SHALL NOT throw.
6. **REQ-API-25** THE Client_Key SHALL exist only in limiter memory and SHALL NOT be logged, returned, stored elsewhere or included in errors.
7. **REQ-API-26** THE Analyze_Handler SHALL check the rate limit before content type, size and body parsing, so abusive clients are throttled before any body is read.

### Requirement 5: LLM Budget

**User Story:** As an operator, I want a hard cap on LLM calls, so that the provider free-tier quota is never exceeded.

```ts
export interface LlmBudget {
  tryAcquire(): boolean;
}
```

#### Acceptance Criteria

1. **REQ-API-27** THE LLM_Budget SHALL succeed at most `LLM_CALLS_PER_MINUTE` times in any 60-second window and at most `LLM_CALLS_PER_DAY` times in any 24-hour window, using an injected clock, and a denied attempt SHALL NOT be recorded.
2. **REQ-API-28** WHEN `getLlmClient()` returns a client, THE Analyze_Handler SHALL call `tryAcquire` once, before the pipeline runs, and SHALL NOT call it otherwise.
3. **REQ-API-29** IF the budget denies, THEN THE Analyze_Handler SHALL build the pipeline with `llmClient: null`, respond 200 with the rule-based verdict and report `"budget-exhausted"`.
4. **REQ-API-30** IF no client is configured, THEN THE Analyze_Handler SHALL report `"not-configured"`.
5. **REQ-API-31** THE LLM_Budget SHALL count an acquired call even when the pipeline policy skips the semantic layer (eager acquisition).
6. **REQ-API-32** THE LLM_Budget SHALL be per server instance and best effort on serverless platforms, and its defaults SHALL stay below the provider quota.

### Requirement 6: API Config

**User Story:** As an operator, I want limits tunable by environment variables with safe defaults, so that a bad value never breaks or opens up the endpoint.

#### Acceptance Criteria

1. **REQ-API-33** THE `readApiConfig(env)` function in `api-config.ts` SHALL be the only code that reads `RATE_LIMIT_PER_MINUTE`, `LLM_CALLS_PER_MINUTE` and `LLM_CALLS_PER_DAY`, via a default `process.env` argument.
2. **REQ-API-34** THE `readApiConfig` function SHALL validate with zod, never throw for any input, and return the default for missing, blank, non-decimal or non-string values.
3. **REQ-API-35** THE `readApiConfig` function SHALL clamp parsed values to the min and max of each setting, with defaults and bounds in one constants block.
4. **REQ-API-36** THE API_Config SHALL NOT use the `NEXT_PUBLIC_` prefix, and size limits SHALL NOT be settings (see REQ-API-13).

### Requirement 7: Logging

**User Story:** As an operator, I want one fixed log event per request, so that I can see volume and failures without any user content in logs.

```ts
export interface AnalyzeLogEvent {
  readonly event: "analyze";
  readonly status: 200 | 400 | 413 | 415 | 429 | 500;
  readonly durationMs: number;
  readonly semanticMode: SemanticMode | "none";
}
```

#### Acceptance Criteria

1. **REQ-API-37** THE Analyze_Handler SHALL call `logEvent` exactly once per request with a Log_Event whose types allow no free-form string, with `semanticMode` `"none"` on every path that ends before the budget step.
2. **REQ-API-38** THE default `logEvent` SHALL live in `log-event.ts`, the only file in `src/server/api/` that uses `console`, with a comment explaining why.
3. **REQ-API-39** IF `logEvent` throws, THEN THE Analyze_Handler SHALL return the same response as without the failure.
4. **REQ-API-40** THE code in `src/server/api/` and `route.ts` SHALL NOT log or store text, URLs, IPs, headers, raw LLM output or provider errors.

### Requirement 8: Documentation

**User Story:** As a developer, I want the endpoint documented, so that I can call it and understand its limits.

#### Acceptance Criteria

1. **REQ-API-41** THE `README.md` SHALL document the endpoint contract, a PowerShell `Invoke-RestMethod` example with a JSON body, the limits, the best-effort nature of the in-memory limiter and budget, and the rules-only fallback.
2. **REQ-API-42** THE `.env.example` file SHALL list the three API settings with placeholder values and comments on units and bounds.

## Property-Based Testing Requirements

Continues after PBT-37. Handler properties use `FakeLlmClient`, fake clocks and
standard `Request`. Use `numRuns >= 100`.

| ID | Property | Generator hint |
|---|---|---|
| **PBT-38** | The handler never throws or rejects for arbitrary bodies, content types and headers, and always returns status in {200, 400, 413, 415, 429, 500} | `fc.string()`, `fc.uint8Array()`, `fc.json()`, `fc.dictionary(fc.string(), fc.string())` for headers |
| **PBT-39** | Every error response body is exactly `{ error: { code } }` with a code from the fixed set, and neither responses nor `logEvent` calls contain the request text or a secret placed in the deps | Marker text in body; secret in a throwing pipeline and in the limiter key |
| **PBT-40** | Rate limiter: in any 60 s window at most the limit is allowed per key, `retryAfterSec` is a positive integer when denied, tracked keys never exceed `MAX_TRACKED_KEYS` | `fc.array` of `(key, time delta)` pairs, small bounds injected |
| **PBT-41** | Budget: in any 60 s window at most `LLM_CALLS_PER_MINUTE` and in any 24 h window at most `LLM_CALLS_PER_DAY` acquisitions succeed | `fc.array` of time deltas, small limits |
| **PBT-42** | Client key extraction never throws and never returns more than `MAX_KEY_CHARS` characters | `fc.string()`, `fc.fullUnicodeString()`, long and blank values |
| **PBT-43** | A pipeline that throws or rejects yields 500 `internal-error` with a fixed body | Pipelines throwing arbitrary values, sync and async |
| **PBT-44** | When the budget denies, the response is 200 with the rule-based verdict (equal to a pipeline run with `llmClient: null`) and `semanticMode` `"budget-exhausted"`; the fake client is never called | Valid bodies, always-deny budget |
| **PBT-45** | Valid inputs below all limits never produce 400 or 413 | Non-blank text up to `MAX_TEXT_CHARS`, up to `MAX_URLS_IN` urls up to `MAX_URL_CHARS`, permissive limiter |
| **PBT-46** | `readApiConfig` never throws for arbitrary env objects, and every value is an integer within its bounds | `fc.dictionary`, `fc.anything()`, huge and non-numeric strings |

### Example-based tests

- Valid text gives 200 with `verdict` and `meta`.
- Wrong content type gives 415.
- Oversized body (declared and undeclared) gives 413.
- Invalid JSON gives 400.
- Unknown keys give 400.
- The (limit + 1)th request in a minute gives 429 with `Retry-After`.
- Missing LLM client gives `semanticMode: "not-configured"` and no
  `tryAcquire` call.
- Neither responses nor `logEvent` calls contain the input text.
- `route.ts` exports `POST`, `runtime`, `dynamic` and `maxDuration` only.
- `MAX_BODY_BYTES` covers the worst-case encoded maximal body.

## Out of Scope

UI, OCR and QR decoding, authentication, external stores (Redis), CORS,
streaming, caching, analytics, a `locale` parameter, and any change to
analyzers, pipeline or `src/server/llm` contracts.

## Non-Functional Requirements

- **NFR-API-01** Limits and defaults MUST be editable in config files without
  touching handler logic or its tests.
- **NFR-API-02** Handler work per request is bounded: one body read of at most
  `MAX_BODY_BYTES`, one pipeline run, at most one LLM call path.
