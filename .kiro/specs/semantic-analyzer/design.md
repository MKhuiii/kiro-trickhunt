# Design — TrickHunt Semantic Analyzer

## Files

- `src/analyzers/semantic-analyzer.config.ts` — limits, `SEMANTIC_SIGNALS`
- `src/analyzers/llm-client.ts` — `LlmClient`, `LlmRequest` (types only)
- `src/analyzers/fake-llm-client.ts` — `FakeLlmClient` for tests
- `src/analyzers/semantic-analyzer.ts` — `redactSensitive`, `buildPrompt`,
  `parseLlmResponse`, `analyzeSemantic`, `SemanticAnalyzer`, delimiter constants
- `src/analyzers/semantic-analyzer.test.ts`, `semantic-analyzer.property.test.ts`

Provider code goes in `src/server/llm/` later and only implements `LlmClient`.

## Key decisions

**Pipeline order.** `analyzeSemantic`: blank check, slice to `MAX_INPUT_CHARS`,
`redactSensitive`, `buildPrompt`, one `client.complete` call raced against a
timeout, `parseLlmResponse(raw, redacted)`. Truncating before redaction bounds
regex work; redaction before the prompt means raw digits, phones and emails
never reach the client. The redacted string is the `sentText`, so evidence is
checked against exactly what the model saw.

**Redaction.** Plain regexes without nested quantifiers, applied in order:
email, phone (`+` or leading `0`, 9–15 digits, optional single space, dot or
dash separators), bank/card (8–19 digits with optional single separators),
then any `\d{4,}`. Placeholders contain no digits, which gives idempotence and
the "no digit run >= 4" property. Only ASCII digits are handled; non-ASCII
digit scripts are outside the guarantee.

**Prompt.** Delimiters are fixed constants, `<<<TRICKHUNT_TEXT>>>` and
`<<<END_TRICKHUNT_TEXT>>>`. Neutralization replaces every `<<<` and `>>>` in
the input with `<` `<` `<` / `>` `>` `>` separated by spaces (`"< < <"`), so
neither delimiter, nor a partial one, survives. Replacement is a single pass
over a string that cannot recreate `<<<`. `user` is
`OPEN\n{text}\nCLOSE`. The system prompt lists the allowed ids from config so
the id set has one source of truth.

**Parsing.** Two-stage zod: envelope `z.object({ signals: z.array(z.unknown()) })`
then `safeParse` per entry, so one bad entry never discards the rest. Order of
checks per entry: shape, id in set, evidence non-empty and substring of
`sentText`, then truncate evidence, clamp severity, de-dup, cap. Truncating a
substring keeps it a substring. Zod `.strip()` (default) drops unknown fields,
so `verdict` and `score` are never read. The whole function sits in
`try/catch` returning `[]`, and `createSignal` calls are individually guarded.

**Status.** `parseLlmResponse` returns `Signal[]` only, so `analyzeSemantic`
decides `invalid-response` through a small internal helper
`parseEnvelope(raw)` that returns `unknown[] | null`. `parseLlmResponse` is
built on the same helper, so the two cannot disagree.

**Timeout.** `Promise.race` between `client.complete` and a timer that also
calls `AbortController.abort()`. The timer is always cleared in `finally`. A
late result from the client is ignored. `options.timeoutMs` exists so property
tests can use a few milliseconds instead of `TIMEOUT_MS`.

**Content hygiene.** No `console` calls, no module-level state, no caching.
Error objects from the client are discarded; only the reason code is kept.

## Public API

```ts
export const SEMANTIC_OPEN_DELIMITER: string;
export const SEMANTIC_CLOSE_DELIMITER: string;

export function redactSensitive(text: string): string;
export function buildPrompt(redactedText: string): { system: string; user: string };
export function parseLlmResponse(raw: string, sentText: string): Signal[];

export interface SemanticResult {
  signals: Signal[];
  status: "ok" | "degraded";
  reason?: "timeout" | "client-error" | "invalid-response" | "skipped";
}
export function analyzeSemantic(
  text: string, client: LlmClient, options?: { timeoutMs?: number },
): Promise<SemanticResult>;

export class SemanticAnalyzer implements Analyzer<string> {
  readonly sourceType = "semantic" as const;
  constructor(client: LlmClient, onResult?: (r: SemanticResult) => void);
  analyze(input: string): Promise<Signal[]>;
}
```

## Reading the status from a later pipeline (least invasive)

`Analyzer.analyze` can only return `Signal[]`, and that contract stays. Options
considered:

1. **Optional `onResult` callback on the constructor (chosen).** No contract
   change, no shared state, works per call. The pipeline passes a closure that
   records the status for the current request.
2. Pipeline calls `analyzeSemantic` directly instead of going through the
   registry. Also contract-free, but bypasses the registry and its error
   isolation.
3. A `lastResult` field on the analyzer. Rejected: racy under concurrent calls.

## Type note — `sourceType: "semantic"` (needs a decision)

`Analyzer.sourceType` and `Signal.source` are typed `SignalSource`
(`"url" | "text" | "image" | "qr"`) in `src/core/signal.ts`. `"semantic"` is not
in that union, so the requested `sourceType` does not type-check as is.

- **Chosen: add `"semantic"` to the `SignalSource` union.** It is a one-line
  additive widening. Runtime behaviour of `createSignal`, `aggregate` and
  `AnalyzerRegistry` is unchanged (`aggregate` never reads `source`), and no
  existing code breaks. The only edit to `src/core/` and it touches a type,
  not a contract.
- Alternative: use `"text"` for both `sourceType` and `Signal.source`. Zero
  core change, but `registry.analyze("text", input)` would then run
  `TextAnalyzer` and `SemanticAnalyzer` together, and an LLM call could not be
  skipped independently.

Please confirm the first option before implementation; the tasks assume it.

## Notes

- Signals from `text.*` and `semantic.*` can overlap (for example urgency and
  `semantic.pressure-escalation`). Under noisy-or this raises risk twice. That
  is deliberately left to the verdict spec.
- Suggested config defaults: `MAX_INPUT_CHARS` 4000, `TIMEOUT_MS` 8000,
  `MAX_SIGNALS` 4, `MAX_EVIDENCE_CHARS` 200, `SEVERITY_CAP` 0.8, per-id
  `maxSeverity` between 0.5 and 0.7.
