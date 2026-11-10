# Design — TrickHunt LLM Provider Adapter

## Files

- `src/server/llm/llm-config.ts` — `LlmConfig`, `readLlmConfig`, defaults and bounds
- `src/server/llm/llm-client-error.ts` — `LlmClientError`, `LlmErrorCode`
- `src/server/llm/openai-compatible-client.ts` — `createOpenAiCompatibleClient`
- `src/server/llm/create-llm-client.ts` — `createLlmClient`
- `src/server/llm/index.ts` — re-exports the factory, config reader and error
- `src/server/llm/*.test.ts`, `*.property.test.ts` — fake `fetch` only
- `scripts/smoke-llm.ts` — manual, not in `vitest run`
- `.env.example`, `.gitignore`, `README.md` (smoke section)

`LlmClientError` lives in its own file because `src/analyzers/llm-client.ts`
must not change. The name `openai-compatible` describes the wire protocol, not
a vendor. No vendor, URL or model string exists in code.

## Wire format (from provider docs)

The OpenAI Chat Completions reference, and Groq's API reference which mirrors
it, define: `POST {base}/chat/completions`, `Authorization: Bearer <key>`,
body `model`, `messages[{role, content}]`, `temperature`, `max_tokens`,
`stream`; response `choices[].message.content`. Groq marks `max_tokens` as
deprecated in favour of `max_completion_tokens`, but `max_tokens` is the
parameter accepted by the widest set of compatible servers (including local
ones), so the adapter sends `max_tokens`. If a future provider rejects it,
that is a one-line change confined to the adapter. `response_format` is not
sent, as required.

## Key decisions

**Config.** One zod schema over a picked subset of `env`. Everything is read
from a plain object argument; `process.env` is only the default value of that
argument inside `llm-config.ts`, which keeps tests pure. Unknown or non-string
values fail the schema, and the whole function is wrapped in `try/catch`
returning `null`. `LLM_BASE_URL` is required in practice: with no hard-coded
URL there is nothing to fall back to, so a missing URL gives `null` like a
missing key or model. The key is attached with
`Object.defineProperty(..., { enumerable: false })`, so accidental
serialization or logging of the config cannot leak it.

**Numeric parsing.** `/^\d{1,9}$/` then `Number`, then clamp to `[min, max]`.
Anything else uses the default. Example constants: tokens default 400 in
[1, 2000]; timeout default 7000 ms in [500, 30000]. Defaults sit just under
`TIMEOUT_MS` in the semantic config so the adapter normally times out first.
Both layers still behave correctly if the outer one wins.

**Request.** Built as a plain object and `JSON.stringify`-ed once. Headers:
`Content-Type`, `Authorization`. URL is `baseUrl + "/chat/completions"`.

**Timeout and abort.** One internal `AbortController`. A timer aborts it and
flags `timedOut`. If the caller signal is already aborted, throw `network`
before fetching; otherwise forward its `abort` event. `fetchImpl` is raced
against a promise that rejects when the internal controller aborts, because a
fake or misbehaving fetch may ignore the signal. The timer and listener are
removed in `finally`. Error code is `timeout` when `timedOut` is set, else
`network` for caller aborts.

**Error mapping.** One `try` around fetch, status check, `res.json()` and
shape check. Inside, only `LlmClientError` is thrown deliberately. The `catch`
discards the caught value: if it is an `LlmClientError` it is rethrown, else
it becomes `timeout` (timer flag) or `network`. `res.json()` failure maps to
`bad-shape` when the body arrived but did not parse, and a stream/read error
maps to `network`. The shape check uses a small zod schema
`{ choices: [{ message: { content: string } }] }`; first choice only, trimmed,
non-empty. `LlmClientError` sets `message = "LLM request failed: " + code`,
passes no `cause`, and has `code` as its only own enumerable property.

**Factory and rules-only mode.** `createLlmClient` = `readLlmConfig` then
adapter, or `null`. Whoever composes the pipeline (a later API route spec)
registers `SemanticAnalyzer` only when the client is non-null:

```ts
const client = createLlmClient(process.env, fetch);   // composition root only
if (client) registry.register(new SemanticAnalyzer(client, onResult));
```

With `null`, the registry runs `UrlAnalyzer` and `TextAnalyzer` only. The
score still comes from the deterministic aggregator, so results are valid
without an LLM, and the UI should not present this as an error. Any
`LlmClientError` at runtime is already absorbed by `analyzeSemantic` as
`degraded/client-error`, and rules-only signals still return.

**Privacy.** No `console` calls, no module state, no caching. The only
outbound content is what `analyzeSemantic` already redacted and delimited.

**Smoke script.** Imports by relative path (no alias dependence), builds the
client with `createLlmClient(process.env, fetch)`, runs one fixed harmless
sample through `analyzeSemantic`, prints `status`, `reason` and signal ids
only. Run with `npx tsx --env-file=.env scripts/smoke-llm.ts`. It passes the
whole env object through and reads no LLM setting itself, so
`llm-config.ts` stays the only reader.

## Dependencies

`zod` moves from `devDependencies` to `dependencies` (server runtime uses it).
`tsx` is added as an exact-pinned devDependency for the smoke script only.

## Notes

- `.env.example` is currently empty and `.gitignore` only ignores `.env`; both
  are updated by this spec.
- A reasoning model that spends all `max_tokens` on hidden reasoning can
  return empty content. That maps to `bad-shape` and degrades gracefully.
  Raise `LLM_MAX_OUTPUT_TOKENS` if the smoke script shows it.
