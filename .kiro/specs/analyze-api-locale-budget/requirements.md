# Requirements Document

## Introduction

A deliberate change to the frozen `POST /api/analyze` contract (specs
`analyze-api` and `client-ingest`). Four changes:

1. An optional `locale` (`"vi"` or `"en"`) in the request.
2. Lazy LLM budget acquisition: budget is spent only when the pipeline really
   calls the LLM.
3. An accurate `meta.semanticMode`, with the new value `"skipped"`.
4. The client builder and client send `locale`.

Numbering continues the existing specs: `REQ-API-43` onward, `REQ-CI-61`
onward, `PBT-59` onward (the last existing number is `PBT-58`).

**Hard constraints:**
- `src/core/` and `src/analyzers/` are NOT changed.
- `src/pipeline/` is NOT changed. `createPipeline` already supports locale:
  `PipelineOptions.locale?: Locale` is resolved by `resolveLocale` and drives
  `buildActions` and `buildLimitations`. No pipeline change is needed or allowed.
- `src/server/llm/` contracts are NOT changed. `LlmClientError` is reused with
  an existing code.
- Limits (`api-limits.config.ts`, `api-config.ts`) and error codes are NOT changed.
- Relative imports only. Client code never imports `src/server/`.
- Tests never touch the network (`FakeLlmClient`, fake clocks, `Request`).

## Glossary

- **Lazy_Client**: A per-request `LlmClient` wrapper built by the handler around the real client and the `LlmBudget`.
- **Denial**: A `tryAcquire()` call that returned `false` (or threw) inside the Lazy_Client.
- **Real_Call**: An invocation of the real client's `complete()` made by the Lazy_Client.
- **Semantic_Mode**: `"used" | "budget-exhausted" | "not-configured" | "skipped"`.

## Requirements

### Requirement 1: Optional Locale (server)

**User Story:** As a Vietnamese-speaking user, I want actions and limitations in my language, so that I can follow the advice.

#### Acceptance Criteria

1. **REQ-API-43** THE request schema SHALL accept an optional `locale` whose value is exactly `"vi"` or `"en"`, and SHALL stay strict: any other key still gives 400 `invalid-input`.
2. **REQ-API-44** IF `locale` is present with any other value or type (including `null`, `""`, `"VI"`, `"fr"`, numbers), THEN THE Analyze_Handler SHALL respond 400 `invalid-input`.
3. **REQ-API-45** THE rule "text or urls required" (REQ-API-12) SHALL still apply, so a body with only `locale` gives 400 `invalid-input`.
4. **REQ-API-46** WHEN `locale` is present, THE Analyze_Handler SHALL call `createPipeline` with `{ llmClient, locale }`, and WHEN it is absent SHALL pass no `locale` key, so the pipeline default applies.
5. **REQ-API-47** WHEN `locale` is `"vi"` or `"en"`, THE `actions` and `limitations` of the response verdict SHALL be the texts of that locale from `src/pipeline/messages.config.ts`, as produced by the existing pipeline.

### Requirement 2: Locale in the client

**User Story:** As a UI developer, I want the request builder and client to carry the locale, so that the UI can ask for the user's language.

#### Acceptance Criteria

1. **REQ-CI-61** THE `buildAnalyzeRequest` function SHALL accept an optional `locale` input, SHALL set `request.locale` only when it is exactly `"vi"` or `"en"`, SHALL ignore any other value, and SHALL still return `request: null` when there is no text and no urls (a locale alone is not a request).
2. **REQ-CI-62** THE `analyzeRequest` function SHALL send a body whose only possible keys are `text` (string), `urls` (array of strings) and `locale` (`"vi"` or `"en"`), regardless of extra properties on the input, and SHALL omit `locale` when it is absent or invalid.
3. **REQ-CI-63** THE client `SemanticMode` type and the 200-response check SHALL accept the closed set `used | budget-exhausted | not-configured | skipped`.

### Requirement 3: Lazy Budget Acquisition

**User Story:** As an operator, I want budget spent only on real LLM calls, so that requests the pipeline never sends to the LLM do not use up the quota.

```ts
// src/server/api/lazy-llm-client.ts
export interface LazyLlmClient {
  readonly client: LlmClient;
  /** Valid after the pipeline run. */
  outcome(): "used" | "budget-exhausted" | "skipped";
}
export function createLazyLlmClient(real: LlmClient, budget: LlmBudget): LazyLlmClient;
```

#### Acceptance Criteria

1. **REQ-API-48** WHEN `getLlmClient()` returns a client, THE Analyze_Handler SHALL build a new Lazy_Client for that request and pass `lazy.client` as `llmClient` to `createPipeline`, and SHALL NOT call `tryAcquire` itself.
2. **REQ-API-49** THE Lazy_Client SHALL call `budget.tryAcquire()` once per `complete()` invocation, only when `complete()` is invoked, and never at construction.
3. **REQ-API-50** IF the acquisition succeeds, THEN THE Lazy_Client SHALL call the real client's `complete()` with the same request and return or reject with its result.
4. **REQ-API-51** IF the acquisition is denied or `tryAcquire` throws, THEN THE Lazy_Client SHALL record a Denial, SHALL NOT call the real client, and SHALL throw `new LlmClientError("network")` (fixed code, no message from the budget).
5. **REQ-API-52** A request with no text, or one the pipeline policy skips (blank text, or rules level `critical` under `when-not-critical`), SHALL NOT call `tryAcquire`.
6. **REQ-API-53** THE number of successful acquisitions SHALL equal the number of Real_Calls, and the number of `tryAcquire` calls SHALL equal Real_Calls plus Denials.

### Requirement 4: Accurate Semantic Mode

**User Story:** As a client developer, I want `semanticMode` to say what really happened, so that I can tell users whether the AI check ran.

#### Acceptance Criteria

1. **REQ-API-54** THE Analyze_Handler SHALL derive Semantic_Mode after the pipeline run, in this order: `"not-configured"` when `getLlmClient()` returned no client; `"budget-exhausted"` when the Lazy_Client recorded a Denial; `"used"` when a Real_Call happened; otherwise `"skipped"`.
2. **REQ-API-55** IF the budget denies, THEN THE response SHALL still be 200 with the rule-based verdict (`riskScore`, `level`, `monster` and `signals` equal to a run with `llmClient: null`) and `"budget-exhausted"`, and `verdict.semantic` SHALL be the pipeline's own degraded outcome.
3. **REQ-API-56** THE `"skipped"` value SHALL mean a client is configured but the pipeline never invoked it, and `"used"` SHALL still not promise that the LLM answered successfully (see `verdict.semantic`).
4. **REQ-API-57** THE `LogSemanticMode` type SHALL add `"skipped"`, the logged mode SHALL equal `meta.semanticMode` on a 200, and on every path that ends before the pipeline run it SHALL stay `"none"`; if the pipeline run throws, the logged mode SHALL be derived the same way (REQ-API-54) from the Lazy_Client state.

### Requirement 5: Documentation

**User Story:** As a developer, I want the README to match the endpoint, so that I can call it correctly.

#### Acceptance Criteria

1. **REQ-API-58** THE `README.md` section "Analyze API" SHALL document the optional `locale` field (values, 400 on others, default behaviour), the four `semanticMode` values including `skipped`, the lazy budget rule (budget spent only when the LLM is really called), and SHALL remove the sentence "There is no `locale` field", and the browser section SHALL say the body carries `text`, `urls` and optional `locale`.

## Existing Requirements and Tests Modified

This is a deliberate change to a frozen contract. Each item below is changed
by this spec; nothing else in the existing specs is changed.

### Requirements

| Existing | Change |
|---|---|
| `analyze-api` Introduction, hard constraints: "The API does not accept a `locale`" | Replaced by REQ-API-43 to REQ-API-47 |
| `analyze-api` Out of Scope: "a `locale` parameter" | Removed from the list |
| `analyze-api` Glossary: Semantic_Mode (three values) | Four values; see REQ-API-54 |
| REQ-API-03 (budget acquisition is a step before the pipeline run) | The budget step no longer exists as a handler step; acquisition happens inside the pipeline run (REQ-API-48, 49). Other steps keep their order |
| REQ-API-04 (`createPipeline` called with `{ llmClient }` only) | Now `{ llmClient }` or `{ llmClient, locale }` (REQ-API-46) |
| REQ-API-11 (strict schema `{ text, urls }`) | Schema gains optional `locale` (REQ-API-43, 44) |
| REQ-API-15 (`"used"` = client exists and acquisition succeeded) | Replaced by REQ-API-54, 56 |
| REQ-API-28 (call `tryAcquire` once before the pipeline when a client exists) | Replaced by REQ-API-48, 49 |
| REQ-API-29 (denied: pipeline built with `llmClient: null`) | Replaced by REQ-API-51, 55: the pipeline gets the Lazy_Client and the real client is not called |
| REQ-API-31 (count an acquired call even when the policy skips; eager acquisition) | Reversed by REQ-API-52 |
| REQ-API-37 (`semanticMode` `"none"` on every path that ends before the budget step) | Now "before the pipeline run", plus `"skipped"` (REQ-API-57) |
| REQ-API-41 (README contents) | Extended by REQ-API-58 |
| `analyze-api` PBT-44 | Replaced by PBT-63 |
| `client-ingest` REQ-CI-45 (body keys only `text`, `urls`) | Keys `text`, `urls`, `locale` (REQ-CI-62) |
| `client-ingest` REQ-CI-49 (closed set of three modes) | Four modes (REQ-CI-63) |
| `client-ingest` REQ-CI-15 ("accepted by the real server request parser") | Unchanged in wording; now also covers `locale` |
| `client-ingest` PBT-56 (body keys only `text`, `urls`) | Replaced by PBT-64 |
| `client-ingest` PBT-49 and PBT-50 | Extended to the optional `locale` (see tests below) |

Not modified: REQ-API-01, 02, 05 to 14, 16 to 27, 30, 32 to 36, 38 to 40, 42;
REQ-API-30 (`"not-configured"` without `tryAcquire`) keeps its meaning.

### Tests

| File | Test | Change |
|---|---|---|
| `src/server/api/analyze-handler.test.ts` | "returns 200 with verdict and meta for valid text" (asserts `semanticMode: "used"` through the real pipeline) | Use a deterministic stub pipeline that calls `llmClient.complete` once, so `"used"` does not depend on the rules level |
| same | "reports budget-exhausted and passes llmClient null when denied" | Stub pipeline calls `complete`; expect `"budget-exhausted"`; `llmClient` is the Lazy_Client (not null, not the real client); real client `callCount` 0 |
| same | "reports used ... acquireCalls 1 ... `pipelineOptions[0].llmClient` toBe(client)" | `llmClient` is the Lazy_Client; `acquireCalls` is 1 only when the stub calls `complete` |
| same | "reports not-configured and never calls tryAcquire" | Unchanged |
| same | log-event shape test and 415 `"none"` test | Unchanged |
| `src/server/api/analyze-handler.property.test.ts` | PBT-44 (`budget: () => false`, expects verdict equal to a `llmClient: null` run) | Replaced by PBT-63: compare only `riskScore`, `level`, `monster`, `signals`; benign non-blank text so the policy lets the semantic layer run |
| same | PBT-38, 39, 43, 45 | Unchanged |
| `src/server/api/analyze-request.test.ts` | "rejects unknown keys" | Unchanged; add `locale` cases |
| `src/server/api/analyze-request.ts` type `ParsedRequest` | `input` gains `locale?: "vi" \| "en"` | Type change |
| `src/server/api/log-event.ts` | `LogSemanticMode` gains `"skipped"` | Type change |
| `src/app/api/analyze/route.test.ts` | not-configured test | Unchanged |
| `src/server/api/llm-budget*.test.ts` | all | Unchanged |
| `src/client/ingest/analyze-client.property.test.ts` | PBT-56 `expect(["text", "urls"]).toContain(key)` | Allowed keys become `text`, `urls`, `locale`; value of `locale` in `vi`, `en` |
| `src/client/ingest/analyze-client.test.ts` | body tests with `{ text, urls }` and the `BYTES` extra-property test | Unchanged (no locale input); add locale cases and a `skipped` 200 case |
| `src/client/ingest/analyze-input.property.test.ts` | PBT-49 `Object.keys(request).every(k => k === "text" \|\| k === "urls")` | Add `"locale"` |
| same | PBT-50 (request accepted by `readAnalyzeRequest`) | Generator adds optional valid and invalid locale input; the request must still be accepted |
| `src/client/ingest/analyze-input.test.ts` | `toEqual({ text: "a\n\nb" })` | Unchanged (no locale input) |
| `src/client/ingest/limits.test.ts`, `boundaries.test.ts` | all | Unchanged |

## Property-Based Testing Requirements

Continues after PBT-58. `numRuns >= 100`. Handler properties use
`FakeLlmClient`, a counting fake budget, fake clocks and `new Request(...)`.

| ID | Property | Generator hint |
|---|---|---|
| **PBT-59** | The handler never throws or rejects, and every error body is exactly `{ error: { code } }`. For arbitrary `locale` values only `"vi"` and `"en"` are accepted: any other value gives 400 `invalid-input`; `"vi"` and `"en"` with a valid body never give 400 | `fc.anything()`, `fc.string()`, `fc.constantFrom("vi","en","VI","en ","")` as `locale` |
| **PBT-60** | With `locale` `"vi"` (resp. `"en"`) and `llmClient: null`, `verdict.actions` and `verdict.limitations` equal the output of a pipeline run with that locale, and every string belongs to the `vi` (resp. `en`) texts of `messages.config.ts` | Valid bodies; membership check over `ACTIONS_*` and `LIMITATIONS_*` of the locale |
| **PBT-61** | A request with blank or absent text and only URLs never calls `tryAcquire` (counting fake budget) and, when a client exists, gets 200 with `semanticMode` `"skipped"` | `fc.constantFrom(undefined, "", "  \n")` as text, `fc.array(urls, { minLength: 1 })` |
| **PBT-62** | For arbitrary budget decisions (including a throwing budget) and a pipeline stub that calls `complete` 0 to N times: successful acquisitions equal Real_Calls, and `tryAcquire` calls equal Real_Calls plus Denials; the handler still never throws | `fc.array(fc.boolean())` decisions, `fc.nat({ max: 5 })` calls |
| **PBT-63** | With a denying budget and text the policy lets through, the response is 200, `riskScore`, `level`, `monster` and `signals` equal a `llmClient: null` run, `semanticMode` is `"budget-exhausted"`, and the real client was never called | Benign non-blank text; `fc.pre` that the rules-only level is not `critical` |
| **PBT-64** | The `analyzeRequest` body only has keys from `text`, `urls`, `locale`, `locale` appears only with `"vi"` or `"en"`, and `buildAnalyzeRequest` never returns a request holding any other locale | `fc.anything()` as input, `fc.constantFrom("vi","en")` mixed with arbitrary values |

### Example-based tests

- `locale` alone gives 400; `locale: "fr"` gives 400; `locale: "vi"` gives 200 and Vietnamese actions.
- Absent `locale` gives the same output as today (`createPipeline` options have no `locale` key).
- Client configured, text critical under `when-not-critical`: mode `"skipped"`, no `tryAcquire`.
- Client configured, stub calls `complete` once with budget allowing: `"used"`, one acquisition, one Real_Call.
- Lazy_Client denial throws `LlmClientError` with code `network` and no budget text.
- README mentions `locale` and `skipped`.

## Out of Scope

UI, new analyzers, changes to limits or error codes, changes to `src/core`,
`src/analyzers`, `src/pipeline` and `src/server/llm`, more locales than `vi`
and `en`.

## Non-Functional Requirements

- **NFR-AL-01** The Lazy_Client holds no state across requests and stores no request content.
- **NFR-AL-02** A denial or a failing real client never changes the HTTP status: the response stays 200 with the rule-based verdict.
