# Requirements — TrickHunt LLM Provider Adapter

## Overview

A real `LlmClient` for any OpenAI-compatible Chat Completions endpoint. Groq,
Cerebras, OpenRouter, OpenAI or a local server must work by changing only
environment variables. All code lives in `src/server/llm/`.

**Hard constraints:**
- `LlmClient`, `LlmRequest`, `Signal`, `aggregate` and every analyzer are NOT
  changed. `src/server/llm/` may import types from `src/analyzers`; nothing in
  `src/analyzers` or `src/core` may import from `src/server`.
- No provider name, URL or model id appears in code. Provider documentation
  is only used to confirm the wire format (see design).
- No reliance on JSON-mode or `response_format`. `parseLlmResponse` already
  handles plain text and code fences.
- No logging (`console` or otherwise) of user content, request or response
  bodies, provider error messages or the key. Only fixed codes exist.
- Tests never touch the network and never need a real key.
- The Semantic Analyzer contract is unchanged: `complete` returns text or
  throws; `analyzeSemantic` already maps a throw to `degraded/client-error`.

---

## 1. Config Reader (`llm-config.ts`)

```ts
export interface LlmConfig {
  readonly provider?: string;       // label only, never changes behaviour
  readonly apiKey: string;          // non-enumerable
  readonly model: string;
  readonly baseUrl: string;         // normalised, no trailing slash
  readonly maxOutputTokens: number;
  readonly timeoutMs: number;
}
export function readLlmConfig(env: Readonly<Record<string, string | undefined>>): LlmConfig | null;
```

### 1.1 Requirements

- **REQ-LLM-01** MUST read `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`,
  `LLM_BASE_URL`, `LLM_MAX_OUTPUT_TOKENS` and `LLM_TIMEOUT_MS` from the `env`
  argument and validate them with zod. `llm-config.ts` is the only file that
  reads `process.env` for LLM settings (via a default argument) and the only
  file that touches the key outside the adapter's request header.
- **REQ-LLM-02** MUST return `null`, never throw, for any `env` value,
  including non-object and non-string entries. Missing, blank or
  whitespace-only `LLM_API_KEY` or `LLM_MODEL` gives `null`.
- **REQ-LLM-03** `LLM_BASE_URL` MUST be an absolute `https:` URL, or `http:`
  only for `localhost`, `127.0.0.1` and `[::1]` (local models). Anything else
  gives `null`. Credentials, query and fragment in the URL give `null`.
  Trailing slashes are removed.
- **REQ-LLM-04** `LLM_MAX_OUTPUT_TOKENS` and `LLM_TIMEOUT_MS` MUST parse as
  plain decimal integers. Non-numeric or blank values fall back to the config
  defaults. Parsed values are clamped to configured min and max bounds, so
  huge values never pass through. Defaults and bounds live in one constants
  block in `llm-config.ts`.
- **REQ-LLM-05** `apiKey` MUST be defined as a non-enumerable property, so
  `JSON.stringify(config)`, spread and `console.log` never include it.
- **REQ-LLM-06** `LLM_PROVIDER` is optional, trimmed, length-limited and used
  only as a label (smoke output). It MUST NOT alter requests.

---

## 2. Adapter (`openai-compatible-client.ts`)

```ts
export function createOpenAiCompatibleClient(
  config: LlmConfig,
  fetchImpl: typeof fetch,
): LlmClient;
```

### 2.1 Requirements

- **REQ-LLM-07** `complete` MUST send exactly one non-streaming `POST` to
  `${baseUrl}/chat/completions` with JSON body
  `{ model, messages: [{role:"system"},{role:"user"}], temperature: 0, max_tokens, stream: false }`.
  `system` and `user` come verbatim from the `LlmRequest`. No other body
  fields (no `response_format`).
- **REQ-LLM-08** The key MUST appear only in the `Authorization: Bearer <key>`
  header. It MUST NOT appear in the URL or body.
- **REQ-LLM-09** MUST honor the caller's `AbortSignal` and its own
  `timeoutMs`, combined into one signal passed to `fetchImpl`. An already
  aborted signal MUST NOT call `fetchImpl`. Because a fetch may ignore
  abort, `complete` MUST also race against the timer so it never hangs.
- **REQ-LLM-10** MUST return only `choices[0].message.content` as a trimmed
  non-empty string. No usage, ids or other fields are returned.
- **REQ-LLM-11** MUST NOT retry, cache, keep module-level state, or issue more
  than one `fetchImpl` call per `complete`. Timers are always cleared.
- **REQ-LLM-12** `fetchImpl` is injected; the adapter MUST NOT reference the
  global `fetch` directly.

---

## 3. Error Mapping

```ts
export type LlmErrorCode = "network" | "http-status" | "bad-shape" | "timeout";
export class LlmClientError extends Error { readonly code: LlmErrorCode }
```

### 3.1 Requirements

- **REQ-LLM-13** Every failure of `complete` MUST throw `LlmClientError` with
  one of the four codes. No other error type escapes.
- **REQ-LLM-14** Mapping: `fetchImpl` reject or body-read failure gives
  `network`; non-2xx gives `http-status`; own timer expiry (or abort caused by
  it) gives `timeout`; invalid JSON, wrong shape, non-string or empty text
  gives `bad-shape`. A caller-initiated abort gives `network`.
- **REQ-LLM-15** `LlmClientError.message` MUST be a fixed string derived from
  the code only. It MUST have no `cause`, and the only own enumerable field is
  `code`. Its message and `JSON.stringify` MUST NOT contain the key, request
  text, response body or provider message.
- **REQ-LLM-16** The raw `Response`, status text and caught errors MUST be
  discarded, never stored or logged.

---

## 4. Factory (`create-llm-client.ts`)

```ts
export function createLlmClient(
  env: Readonly<Record<string, string | undefined>>,
  fetchImpl: typeof fetch,
): LlmClient | null;
```

### 4.1 Requirements

- **REQ-LLM-17** MUST return `readLlmConfig(env)`'s result wired to the
  adapter, or `null` when the config is `null`. It MUST NOT throw.
- **REQ-LLM-18** A `null` client means the pipeline MUST run in rules-only
  mode (URL and text analyzers only, no `SemanticAnalyzer` registered). That
  is a normal state, not an error, and MUST NOT be shown as a failure.
- **REQ-LLM-19** The factory MUST NOT read `process.env` and MUST NOT call
  `fetchImpl`.

---

## 5. Environment Files

### 5.1 Requirements

- **REQ-LLM-20** `.env.example` MUST list all six variables with placeholder
  values and a short comment each (what it is, optional or required, units,
  bounds). No real key, model or personal data.
- **REQ-LLM-21** `.gitignore` MUST ignore `.env*` and re-include only
  `.env.example`. No variable uses the `NEXT_PUBLIC_` prefix.

---

## 6. Manual Smoke Script (`scripts/smoke-llm.ts`)

### 6.1 Requirements

- **REQ-LLM-22** MUST build the client via `createLlmClient(process.env, fetch)`
  and, if `null`, print `rules-only (no LLM configured)` and exit 0.
- **REQ-LLM-23** MUST run one fixed, harmless sample text through
  `analyzeSemantic` and print only `status`, optional `reason`, and signal
  ids. Never the sample text, evidence, raw response, key or error messages.
- **REQ-LLM-24** MUST NOT be matched by `vitest run` (outside `src/**` and not
  named `*.test.ts`) and MUST be documented in `README.md` with the exact run
  command and a note that it makes one real request.

---

## 7. Property-Based Testing Requirements

All use a fake `fetchImpl`. Continues after PBT-22. Use a short `timeoutMs`.

| ID | Property | Generator hint |
|---|---|---|
| **PBT-23** | For arbitrary fetch outcomes (reject, any status with arbitrary or malformed body, never resolves), `complete` settles within a bound near `timeoutMs` and either returns a non-empty string or throws `LlmClientError` with one of the four codes | `fc.oneof` of outcomes; `fc.anything()` JSON bodies; `fc.string()` |
| **PBT-24** | The thrown error's `message`, `JSON.stringify` and `String(err)` never contain the key, the request text or the response body | Arbitrary key (length >= 8) and text, body embedding both |
| **PBT-25** | The captured request never has the key in URL or body, and has it only as the `Authorization` header value | Arbitrary key and system/user text |
| **PBT-26** | `readLlmConfig` never throws for arbitrary env objects; missing or blank key or model gives `null`; numeric values are within bounds or defaulted | `fc.dictionary`, `fc.anything()`, huge and non-numeric strings |
| **PBT-27** | `createLlmClient` returns `null` whenever `LLM_API_KEY` is absent or blank, and never calls `fetchImpl` | `fc.dictionary` with the key removed |

### 7.1 Example-based tests

- 200 with a valid body returns the model text (trimmed).
- 401 gives `http-status`; body `{}` or `{choices:[]}` gives `bad-shape`;
  `content: ""` gives `bad-shape`.
- Request is `POST <baseUrl>/chat/completions`, `temperature: 0`,
  `stream: false`, no `response_format`.
- Never-resolving fetch with small `timeoutMs` gives `timeout`.
- Caller aborts: `network`; already-aborted signal: `fetchImpl` not called.
- Full chain: `analyzeSemantic` with the adapter and a fake fetch returning
  a valid signals JSON gives `ok`; a 500 gives `degraded/client-error`.
- `.env.example` parses to all six keys and contains no `NEXT_PUBLIC_`.

---

## 8. Out of Scope

API route, rate limiting, UI, streaming, retries, caching, several providers
at once, provider-specific headers or parameters, any change to analyzers.

---

## 9. Non-Functional Requirements

- **NFR-LLM-01** Swapping provider means editing only environment variables.
- **NFR-LLM-02** `src/server/llm/` imports no browser-only packages and no
  `next` or `react` modules.
