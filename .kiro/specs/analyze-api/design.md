# Design Document

## Overview

`POST /api/analyze` validates input, throttles the client, optionally spends
one unit of LLM budget, runs the existing pipeline and returns
`{ verdict, meta }`. The route file is a thin wrapper; all logic is a handler
factory with injected dependencies in `src/server/api/`. No existing contract
changes: the API only imports `createPipeline`, `Pipeline`, `PipelineOptions`
and `Verdict` from `src/pipeline/index.ts`, `LlmClient` from
`src/analyzers/llm-client.ts` and `createLlmClient` from `src/server/llm`.

Stack facts checked: `package.json` pins Next.js 15.5.28, zod 4.6.7, Vitest
5.0.5 and fast-check 4.10.2. `next.config.ts` is empty, so `cacheComponents` is
off and the route segment options below apply.

## Architecture

### Module layout

- `src/server/api/api-limits.config.ts` — size and window constants (not env)
- `src/server/api/api-config.ts` — `readApiConfig(env)`, defaults and bounds
- `src/server/api/rate-limiter.ts` — `RateLimiter`, `createRateLimiter`, `extractClientKey`
- `src/server/api/llm-budget.ts` — `LlmBudget`, `createLlmBudget`
- `src/server/api/log-event.ts` — `AnalyzeLogEvent`, `defaultLogEvent` (only `console` use)
- `src/server/api/analyze-response.ts` — `ErrorCode`, header set, `jsonResponse`, `errorResponse`
- `src/server/api/analyze-request.ts` — content type check, bounded body read, zod schema
- `src/server/api/analyze-handler.ts` — `createAnalyzeHandler`
- `src/server/api/default-handler.ts` — real dependencies, `createDefaultAnalyzeHandler()`
- `src/server/api/index.ts` — public exports
- `src/app/api/analyze/route.ts` — `POST` and segment options
- a `*.test.ts` next to each module, `*.property.test.ts` for PBT-38 to PBT-46

### Handler flow (order is fixed, REQ-API-03)

1. Start time from `deps.now()`.
2. `extractClientKey(req.headers)`, then `rateLimiter.check(key)`. Denied gives
   429 with `Retry-After`.
3. Content type is `application/json`, else 415.
4. `Content-Length` greater than `MAX_BODY_BYTES` gives 413.
5. Bounded read of the body; over the cap gives 413.
6. UTF-8 decode (fatal) and `JSON.parse`; failure gives 400.
7. Strict zod parse plus the "text or urls" rule; failure gives 400.
8. `client = getLlmClient()`. If `client` exists, `tryAcquire()` decides
   `"used"` or `"budget-exhausted"`; no client gives `"not-configured"`.
9. `createPipeline({ llmClient })` where `llmClient` is the client only for
   `"used"`; `await pipeline.run({ text, urls })`.
10. 200 with `{ verdict, meta: { semanticMode } }`.
11. `logEvent` once with the final status (step 2 to 10 all pass through one
    `finish` function), then return.

**Rate limit placement.** The rate limit runs before all body work. Checks 3
and 4 are cheap, but a client that sends garbage must still be counted, and a
throttled client must never cost a body read or a JSON parse. Invalid requests
therefore consume rate-limit allowance, which is the intended behavior. The
limiter holds no body data.

**Whole-handler safety.** The body of the handler sits in one `try/catch`
that returns `internal-error`. `logEvent` is called inside its own `try/catch`
so a failing logger cannot change the response (REQ-API-39). `getLlmClient`,
`tryAcquire`, `rateLimiter.check` and `now` are also inside the outer
`try/catch`, so a throwing dependency gives 500, not a rejection.

## Components and Interfaces

### Config constants (`api-limits.config.ts`)

```ts
export const MAX_TEXT_CHARS = 4000;      // equals pipeline MAX_TEXT_CHARS
export const MAX_URLS_IN = 10;           // pipeline analyzes 5, counts the rest as skipped
export const MAX_URL_CHARS = 2048;       // equals pipeline MAX_URL_CHARS
export const MAX_BODY_BYTES = 153_600;   // 150 KiB
export const RATE_WINDOW_MS = 60_000;
export const LLM_MINUTE_WINDOW_MS = 60_000;
export const LLM_DAY_WINDOW_MS = 86_400_000;
export const MAX_TRACKED_KEYS = 5000;
export const CLEANUP_INTERVAL_MS = 60_000;
export const MAX_KEY_CHARS = 64;
```

These are plain constants (import-free) so the API does not import values from
`src/pipeline/pipeline.config.ts`. A unit test asserts `MAX_TEXT_CHARS` and
`MAX_URL_CHARS` equal the pipeline values, so a later pipeline change fails
loudly (REQ-API-13).

**Body byte size.** `MAX_TEXT_CHARS` and `MAX_URL_CHARS` count UTF-16 units.
Worst case for JSON encoding is a control character, escaped as `\u00XX`
(6 bytes per unit); a BMP character is 3 bytes in UTF-8 and a surrogate pair
is 4 bytes for 2 units. A maximal body has at most
`4000 + 10 * 2048 = 24 480` units, so `24 480 * 6 = 146 880` bytes, plus
under 1 KiB for keys, quotes and commas. `153 600` covers that with margin. A
unit test asserts
`MAX_BODY_BYTES >= 6 * (MAX_TEXT_CHARS + MAX_URLS_IN * MAX_URL_CHARS) + 1024`.
Memory cost is negligible and the cap is far below any platform body limit.

### `api-config.ts`

```ts
export const API_CONFIG_LIMITS = {
  ratePerMinute:      { default: 10,  min: 1, max: 600 },
  llmCallsPerMinute:  { default: 4,   min: 0, max: 60 },
  llmCallsPerDay:     { default: 200, min: 0, max: 10000 },
} as const;
export interface ApiConfig {
  readonly ratePerMinute: number;
  readonly llmCallsPerMinute: number;
  readonly llmCallsPerDay: number;
}
export function readApiConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ApiConfig;               // never throws
```

Same technique as `llm-config.ts`: pick the three keys, zod schema accepting
`unknown`, `/^\d{1,9}$/` after trim, clamp to bounds, otherwise default. The
function returns a config (defaults) instead of `null` because there is no
"unconfigured" state. A zero LLM limit disables the LLM (always
`"budget-exhausted"`).

**Defaults rationale.** Provider quotas are not hard-coded anywhere, but
typical free tiers allow tens of requests per minute, a few thousand per day,
and several thousand tokens per minute. The provider counts the requested
`max_tokens` (default 400 in `llm-config.ts`) plus the prompt (text up to 4000
chars, about 1000 to 1500 tokens) up front, so one call reserves roughly 2000
tokens. With a per-minute token limit around 6000 to 8000, only a few calls fit
in a minute. `LLM_CALLS_PER_MINUTE = 4` and `LLM_CALLS_PER_DAY = 200` stay
under that and under typical daily request limits; the operator must lower them
if the provider limit is smaller. `RATE_LIMIT_PER_MINUTE = 10` per client keeps
rules-only traffic cheap while stopping one client from using the whole LLM
minute budget alone (budget is global, rate limit is per client).

### `rate-limiter.ts`

```ts
export interface RateLimiter {
  check(key: string): { allowed: boolean; retryAfterSec: number };
}
export function createRateLimiter(options: {
  readonly limit: number;
  readonly now: () => number;
  readonly windowMs?: number;        // default RATE_WINDOW_MS
  readonly maxKeys?: number;         // default MAX_TRACKED_KEYS
  readonly cleanupIntervalMs?: number;
}): RateLimiter;
export function extractClientKey(headers: Headers): string;
```

State: `Map<string, number[]>` of request timestamps per key, ordered oldest
first. `check`: (1) lazy sweep if `now - lastCleanup >= cleanupIntervalMs`,
deleting keys whose newest timestamp is older than the window; (2) drop
timestamps `<= now - windowMs` for this key; (3) if length `< limit`, push
`now`, re-insert the key last (delete then set) so Map order equals recency,
return `{ allowed: true, retryAfterSec: 0 }`; (4) else return
`{ allowed: false, retryAfterSec: max(1, ceil((oldest + windowMs - now) / 1000)) }`
without recording. When inserting a new key at `maxKeys`, delete the first Map
entry (least recently seen). A backwards clock step is tolerated: timestamps
greater than `now` are treated as inside the window, and `retryAfterSec` is
clamped to `[1, windowMs / 1000]`.

`extractClientKey`: read `x-forwarded-for` in a `try/catch`; take text before
the first comma, trim, cut to `MAX_KEY_CHARS`; empty gives `"unknown"`. All
requests without the header share the `"unknown"` bucket, which fails safe for
direct hits. `x-forwarded-for` is only trustworthy behind a platform proxy
that sets it (Vercel does); elsewhere clients can spoof it, which is one more
reason the limiter is best effort. The key never leaves limiter memory.

### `llm-budget.ts`

```ts
export interface LlmBudget { tryAcquire(): boolean; }
export function createLlmBudget(options: {
  readonly callsPerMinute: number;
  readonly callsPerDay: number;
  readonly now: () => number;
}): LlmBudget;
```

State: one timestamp array of successful acquisitions, pruned to the last 24
hours. `tryAcquire`: prune; count entries within the last 60 s; deny if the
minute count `>= callsPerMinute` or the array length `>= callsPerDay`;
otherwise push `now` and return true. Array size is bounded by `callsPerDay`
(max 10 000). Per instance and best effort: on serverless, each warm instance
has its own counters and a cold start resets them, so the real global rate can
exceed the configured numbers by the instance count. Defaults are therefore set
conservatively, and the provider's own limit remains the final backstop (a
provider rejection already degrades to rules-only via the adapter).

### Budget acquisition choice: eager

Two options were evaluated.

- **Eager (chosen).** The handler calls `tryAcquire()` once when a client
  exists, then passes either the client or `null` to `createPipeline`.
  `semanticMode` is known before the pipeline runs and is a pure function of
  (client exists, acquire result). Tests are deterministic with a fake budget.
  Cost: a request that the pipeline policy would skip anyway (rules-only
  `critical`, blank text, URLs only) still consumes a unit, so the budget is
  slightly conservative. That errs on the safe side for quota protection.
- **Lazy wrapper.** An `LlmClient` wrapper calls `tryAcquire()` inside
  `complete()` and throws `LlmClientError("http-status")` when denied. This is
  precise, but `semanticMode` then depends on what happened inside the
  pipeline. A mutable per-request flag is needed, and three outcomes
  (acquired, denied, never called) map awkwardly onto the three public values:
  "never called" is neither `"used"` nor `"budget-exhausted"`. A denial would
  also surface as `degraded/client-error` in the verdict, which is
  misleading. The pipeline's timeout also leaves a late `complete()` possible
  after the response, mutating state on a finished request. More states, more
  tests, and a wrapper that still cannot change the pipeline.

Eager is simpler and keeps the response contract exact. If budget waste from
skipped semantic calls proves real, the lazy wrapper can be added later behind
the same `LlmBudget` interface without a contract change.

**What `"used"` means.** The client existed and `tryAcquire()` returned true,
so the pipeline received the client. It does not say the LLM was called or
that the call succeeded; that detail is already in `verdict.semantic`.

### `log-event.ts`

```ts
export type LogStatus = 200 | 400 | 413 | 415 | 429 | 500;
export type LogSemanticMode = "used" | "budget-exhausted" | "not-configured" | "none";
export interface AnalyzeLogEvent {
  readonly event: "analyze";
  readonly status: LogStatus;
  readonly durationMs: number;       // integer >= 0
  readonly semanticMode: LogSemanticMode;
}
export function defaultLogEvent(event: AnalyzeLogEvent): void;
```

`defaultLogEvent` writes one `console.info(JSON.stringify(event))`. This is
the only `console` use in `src/server/api/`: on Vercel and Node, stdout is the
only log channel, and the event type has no string field the caller could fill
with user data. A grep task checks no other file in `src/server/api/` or
`route.ts` uses `console`.

### `analyze-request.ts`

```ts
export type ParsedRequest =
  | { readonly ok: true; readonly input: { text?: string; urls?: string[] } }
  | { readonly ok: false; readonly code: "invalid-content-type" | "payload-too-large" | "invalid-input" };
export async function readAnalyzeRequest(req: Request): Promise<ParsedRequest>;
```

Schema (zod 4): `z.strictObject({ text: z.string().max(MAX_TEXT_CHARS).optional(), urls: z.array(z.string().max(MAX_URL_CHARS)).max(MAX_URLS_IN).optional() })`, then a refine:
`text.trim().length > 0 || urls.length > 0`. Body read uses
`req.body.getReader()`, sums `value.byteLength`, and on exceeding the cap calls
`reader.cancel()` (errors ignored) and returns `payload-too-large`. A missing
`body` is treated as an empty buffer and fails JSON parse (400).
`TextDecoder("utf-8", { fatal: true })` rejects invalid UTF-8 (400). The
function never throws.

### `analyze-response.ts`

`ErrorCode`, `STATUS_BY_CODE`, and two builders. Headers are one constant
object (`Content-Type`, `Cache-Control: no-store`,
`X-Content-Type-Options: nosniff`) applied to every response; there is no
CORS header anywhere, so browsers on other origins cannot read responses.
`errorResponse(code, extraHeaders?)` serializes exactly
`{ error: { code } }`. `Retry-After` is set from `String(retryAfterSec)`.

### `default-handler.ts` and the route

```ts
export function createDefaultAnalyzeHandler(): (req: Request) => Promise<Response> {
  const config = readApiConfig();
  const now = () => Date.now();
  return createAnalyzeHandler({
    getLlmClient: () => client,                // created once, see below
    createPipeline,
    rateLimiter: createRateLimiter({ limit: config.ratePerMinute, now }),
    llmBudget: createLlmBudget({ callsPerMinute: config.llmCallsPerMinute, callsPerDay: config.llmCallsPerDay, now }),
    now,
    logEvent: defaultLogEvent,
  });
}
```

`client` is `createLlmClient(process.env, fetch)` evaluated once in this
function (composition root; it is the only place `process.env` is passed
onward, and `createLlmClient` itself never reads it). Creation is cheap and
holds no request data. Module-level state in `route.ts` is the single call
`export const POST = createDefaultAnalyzeHandler()`, so limiter and budget live
as long as the warm instance.

```ts
// src/app/api/analyze/route.ts
import { createDefaultAnalyzeHandler } from "../../../server/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Upper bound for the function; the hosting plan may cap it lower.
export const maxDuration = 15;

export const POST = createDefaultAnalyzeHandler();
```

### Route segment config (verified against Next.js 15 docs)

Source: Next.js 15 "Route Segment Config" reference. Findings:

- `runtime`: `'nodejs'` (default) or `'edge'`. Chosen `"nodejs"`: the handler
  uses in-memory state and `TextDecoder` streams; the edge runtime is not
  needed and gives no benefit here. Stated explicitly so a default change
  cannot silently move it.
- `dynamic`: `'force-dynamic'` is a documented value that makes the route
  render per request and equals `fetchCache = 'force-no-store'`. POST handlers
  are not cached by Next.js anyway, but `force-dynamic` documents the intent
  and covers the outgoing LLM `fetch` too. Chosen.
- `revalidate` and `fetchCache`: not exported. `force-dynamic` already implies
  no-store behavior for fetches and `revalidate = 0`; exporting more options
  adds conflict risk ("options across a route must be compatible") with no gain.
- `maxDuration`: a number; by default Next.js sets no limit and the deployment
  platform may use the value. Chosen `15` seconds: the pipeline semantic
  timeout is 9 s (`SEMANTIC_TIMEOUT_MS`) plus rule analysis and body handling,
  leaving margin. A comment states the plan may cap it lower; if a plan caps
  below about 10 s, a slow LLM call could be cut by the platform before the
  pipeline times out. This is documented in the README.
- Values must be statically analyzable literals (the docs show
  `revalidate = 600` valid and `60 * 10` invalid), so no constants are
  imported into these exports. The build uses `--turbopack`; the final task
  runs `npm run build` to confirm the route compiles.
- These options are ignored if `cacheComponents` is on; it is not in
  `next.config.ts`.

## Data Models

Request body (JSON, strict):

| Field | Type | Limit |
|---|---|---|
| `text` | string, optional | at most 4000 UTF-16 units |
| `urls` | string[], optional | at most 10 items, each at most 2048 units |

At least one non-blank `text` or a non-empty `urls` is required. No other key
is accepted.

Responses:

| Status | Body | Notes |
|---|---|---|
| 200 | `{ verdict, meta: { semanticMode } }` | `Verdict` from the pipeline, JSON-serialized |
| 400 | `{ error: { code: "invalid-input" } }` | bad JSON, UTF-8, schema |
| 413 | `{ error: { code: "payload-too-large" } }` | declared or actual size |
| 415 | `{ error: { code: "invalid-content-type" } }` | |
| 429 | `{ error: { code: "rate-limited" } }` | `Retry-After: <seconds>` |
| 500 | `{ error: { code: "internal-error" } }` | any unexpected failure |

Method other than POST is answered by Next.js itself (405) because only `POST`
is exported; the handler never sees it.

Defaults (all tunable by env except sizes):

| Setting | Default | Min | Max |
|---|---|---|---|
| `RATE_LIMIT_PER_MINUTE` | 10 | 1 | 600 |
| `LLM_CALLS_PER_MINUTE` | 4 | 0 | 60 |
| `LLM_CALLS_PER_DAY` | 200 | 0 | 10000 |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Handler total (PBT-38)

For any body bytes or string, content type and header set, the handler SHALL resolve to a `Response` with status in {200, 400, 413, 415, 429, 500} and the three required headers.

**Validates: Requirements 1.1, 3.5, 2.1, 2.4**

### Property 2: Fixed error bodies, no leaks (PBT-39)

For any error response, the body SHALL equal `{ error: { code } }` with a code from the fixed set, and for any request text or secret placed in the dependencies, neither responses nor `logEvent` calls SHALL contain it.

**Validates: Requirements 3.3, 3.6, 4.6, 7.4**

### Property 3: Rate limiter window and bounds (PBT-40)

For any sequence of (key, time) checks, at most `limit` are allowed per key in any 60 s window, denied checks return a positive integer `retryAfterSec`, and tracked keys never exceed `MAX_TRACKED_KEYS`.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 4: Budget windows (PBT-41)

For any sequence of acquisition attempts over time, successes in any 60 s window never exceed `LLM_CALLS_PER_MINUTE` and in any 24 h window never exceed `LLM_CALLS_PER_DAY`.

**Validates: Requirements 5.1**

### Property 5: Client key bounded and total (PBT-42)

For any header value, `extractClientKey` SHALL not throw and SHALL return at most `MAX_KEY_CHARS` characters.

**Validates: Requirements 4.5**

### Property 6: Pipeline failure maps to 500 (PBT-43)

For any pipeline that throws or rejects with any value, the handler SHALL respond 500 `internal-error` with the fixed body.

**Validates: Requirements 1.5**

### Property 7: Budget denial degrades, not fails (PBT-44)

For any valid body, when the budget denies, the response SHALL be 200 with the verdict of a rules-only pipeline run, `semanticMode` `"budget-exhausted"`, and zero calls to the fake client.

**Validates: Requirements 3.2, 5.3**

### Property 8: Valid inputs pass validation (PBT-45)

For any body within all limits with non-blank text or at least one URL, and a permissive limiter, the response status SHALL NOT be 400 or 413.

**Validates: Requirements 2.5, 2.6, 2.3**

### Property 9: Config total and clamped (PBT-46)

For any env object, `readApiConfig` SHALL not throw and every value SHALL be an integer within its bounds.

**Validates: Requirements 6.2, 6.3**

## Error Handling

- Dependency failures (`now`, `rateLimiter`, `getLlmClient`, `llmBudget`,
  `createPipeline`, `run`) all end in 500 `internal-error`; the caught value is
  discarded, never logged or returned.
- `logEvent` failure is swallowed and does not alter the response.
- The pipeline never rejects by contract; the catch is a second defense for
  injected fakes and future changes.
- `Retry-After` is the only dynamic header and is a plain integer string.
- Provider errors are already absorbed by the adapter and pipeline
  (`degraded/client-error`); the API adds nothing.

## Testing Strategy

Unit tests cover the example list in the requirements; the nine properties
above are the fast-check tests PBT-38 to PBT-46 (at least 100 runs each, one
test per property, tagged `Feature: analyze-api, Property N`). Tests use
`FakeLlmClient`, fake clocks and `new Request(...)`. Property-based testing
applies to the limiter, budget, key extraction, config and handler logic. It
is not used for the route segment exports or README, which get example or
grep checks.
