# Design Document

## Overview

Small change in `src/server/api/` and `src/client/ingest/`. No change in
`src/core`, `src/analyzers`, `src/pipeline` or `src/server/llm`.

Verified against the code:
- `PipelineOptions.locale?: Locale` exists; `resolveLocale` falls back to `"en"`;
  `buildActions` and `buildLimitations` read the locale texts from
  `messages.config.ts`. The handler only has to forward the value.
- The pipeline calls the client only when it has one, the text is not blank and
  (`SEMANTIC_POLICY` is `"always"` or rules level is not `critical`). Every
  client error is caught by `SemanticAnalyzer` and becomes a degraded outcome,
  so a thrown `LlmClientError` from the wrapper never rejects the run.

## Files

- New `src/server/api/lazy-llm-client.ts` (+ `.test.ts`, `.property.test.ts`)
- Changed `analyze-request.ts`, `analyze-handler.ts`, `log-event.ts`
- Changed `src/client/ingest/types.ts`, `analyze-input.ts`, `analyze-client.ts`
- Changed tests listed in the requirements; `README.md`

## Server

`analyze-request.ts`: add `locale: z.enum(["vi", "en"]).optional()` to the strict
object. `ParsedRequest.input` becomes `{ text?; urls?; locale?: "vi" | "en" }`.
The refine rule is unchanged, so locale alone fails.

`lazy-llm-client.ts` (imports `LlmClientError` from `../llm`):

```ts
export function createLazyLlmClient(real: LlmClient, budget: LlmBudget): LazyLlmClient {
  let denied = false;
  let called = false;
  const client: LlmClient = {
    complete(request) {
      let ok = false;
      try { ok = budget.tryAcquire() === true; } catch { ok = false; }
      if (!ok) { denied = true; throw new LlmClientError("network"); }
      called = true;
      return real.complete(request);
    },
  };
  return { client, outcome: () => (denied ? "budget-exhausted" : called ? "used" : "skipped") };
}
```

`complete` throws synchronously on denial; the analyzer already wraps the call
in `try/catch` and `Promise.resolve`. `called` is set before the real call so a
throwing real client still counts as a Real_Call. `LlmClientError("network")` is
used because `LlmErrorCode` has no budget code and `src/server/llm` is frozen.

`analyze-handler.ts` after parsing:

```ts
const real = deps.getLlmClient();
const lazy = real ? createLazyLlmClient(real, deps.llmBudget) : null;
const options: PipelineOptions = parsed.input.locale
  ? { llmClient: lazy?.client ?? null, locale: parsed.input.locale }
  : { llmClient: lazy?.client ?? null };
const input = { text: parsed.input.text, urls: parsed.input.urls }; // without locale
// mode derived in a helper after run (also in the catch path):
//   real == null -> "not-configured"; else lazy.outcome()
```

The input passed to `pipeline.run` keeps only `text` and `urls`. The log mode
is set from the same helper, in a `finally`-style step, so a pipeline that
throws after a budget acquisition still logs the true mode.

Precedence note: `budget-exhausted` wins over `used`. If a future analyzer made
two calls and only the second was denied, the response would report
`budget-exhausted`, which is the more cautious statement.

## Client

`types.ts`: `AnalyzeRequest` gains `locale?: "vi" | "en"` (literal union declared
locally; client code does not import server code).
`analyze-input.ts`: `BuildAnalyzeInput.locale?: unknown`; copied to the request
only if `=== "vi" || === "en"`, after the existing null check.
`analyze-client.ts`: `buildBody` copies `locale` under the same check;
`SemanticMode` and `MODES` add `"skipped"`.

## Behaviour change to note

With a denying budget the pipeline now sees a client, so `verdict.semantic` is
`{ status: "degraded", reason: "client-error" }` and `limitations` include the
degraded text, where before it was `unavailable`. Score, level, monster and
signals are unchanged. This is why PBT-44 is replaced (PBT-63 compares only the
rule-based fields).

## Testing

Properties PBT-59 to PBT-64 in the requirements. Pipeline stubs that call
`llmClient.complete` make mode tests independent of the rules level.
