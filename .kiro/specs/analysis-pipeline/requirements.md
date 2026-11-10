# Requirements — TrickHunt Analysis Pipeline and Verdict

## Overview

The pipeline turns raw input (text and/or URLs) into a `Verdict`. It wires the
existing `TextAnalyzer`, `UrlAnalyzer` and optional `SemanticAnalyzer`
together, removes double counting between overlapping signals, calls the
existing `aggregate()`, applies combination rules, picks a monster, and attaches
actions and limitations. It is one pure, injectable function; the only
dependency is an injected `LlmClient | null`.

It lives in `src/pipeline/`. The `Signal`, `createSignal`, `aggregate`,
`Analyzer`, `AnalyzerRegistry` contracts in `src/core/` and every analyzer in
`src/analyzers/` are NOT changed.

**Hard constraints:**
- `run` MUST resolve for every input and every client behaviour, and MUST NOT
  throw synchronously (inherits REQ-ANL-01).
- No imports from `next`, `react`, `window`, `document`, `process`, or
  anything under `src/server/` (NFR-02). Imports from `src/core` go through
  `src/core/index.ts`.
- The risk score is owned by the deterministic aggregator and the combination
  rules. The LLM contributes signals only.
- There is no "safe" level, word or flag anywhere in types, config or output.
- Nothing is logged, stored or cached. No network calls. Tests use
  `FakeLlmClient` only.
- All weights, thresholds, limits, overlap groups, combination rules, monsters,
  actions and limitation texts live in config files, not in logic.

---

## 1. Verdict Types and Public API

```ts
type RiskLevel = "no_signals" | "suspicious" | "high" | "critical"; // from core
type MonsterId = "bank" | "prize" | "job-bait" | "authority" | "generic";

interface Verdict {
  readonly riskScore: number;            // integer 0..100
  readonly level: RiskLevel;
  readonly monster: MonsterId | null;
  readonly signals: readonly Signal[];   // all signals, severity desc
  readonly actions: readonly string[];
  readonly limitations: readonly string[];
  readonly semantic: {
    readonly status: "ok" | "unavailable" | "degraded";
    readonly reason?: "timeout" | "client-error" | "invalid-response";
    readonly skipped: boolean;
  };
  readonly inputTruncated: boolean;
  readonly urlsAnalyzed: number;
  readonly urlsSkipped: number;
}

createPipeline(options: {
  llmClient: LlmClient | null;
  locale?: "en" | "vi";                  // default "en"
  semanticTimeoutMs?: number;            // test hook, default SEMANTIC_TIMEOUT_MS
}): { run(input: { text?: string; urls?: string[] }): Promise<Verdict> };
```

### 1.1 Requirements

- **REQ-PIPE-01** `Verdict` and `MonsterId` types MUST be exported from
  `src/pipeline/index.ts`, which is the only public entry point.
- **REQ-PIPE-02** `riskScore` MUST be an integer in `[0, 100]` and `level` MUST
  be one of the four `RiskLevel` values. No other level exists.
- **REQ-PIPE-03** `monster` MUST be a `MonsterId` or `null`. `null` if and only
  if `level` is `no_signals`.
- **REQ-PIPE-04** `actions` and `limitations` MUST never be empty. Both are
  plain strings in the configured locale.
- **REQ-PIPE-05** A `Verdict` MUST contain no raw LLM response and no input
  text other than inside `Signal.evidence`. Each `Signal.evidence` MUST NOT
  exceed `MAX_EVIDENCE_CHARS` (pipeline config); longer evidence is shortened
  by building a new signal with `createSignal`, never by mutation.
- **REQ-PIPE-06** The returned `Verdict` and its arrays MUST be frozen.
- **REQ-PIPE-07** An unknown or missing `locale` MUST fall back to `"en"`.

---

## 2. Input Handling

`src/pipeline/pipeline.config.ts` exports `MAX_TEXT_CHARS` (4000, equal to the
semantic analyzer input limit so one flag covers every stage), `MAX_URLS` (5),
`MAX_URL_CHARS` (2048), `MAX_EVIDENCE_CHARS` (200), `SEMANTIC_POLICY`,
`SEMANTIC_TIMEOUT_MS`.

### 2.1 Requirements

- **REQ-PIPE-08** `text` MUST be coerced to `""` when not a string, then
  truncated to `MAX_TEXT_CHARS`. `inputTruncated` is `true` only when
  characters were cut.
- **REQ-PIPE-09** URL candidates are `input.urls` (non-string and blank entries
  ignored) followed by `extractEntities(truncatedText).urls`, in that order.
- **REQ-PIPE-10** Candidates MUST be de-duplicated by `normalizeUrl(x) ?? x`;
  the first original string wins. Original strings are passed to the analyzer
  unmodified.
- **REQ-PIPE-11** The first `MAX_URLS` unique candidates of length
  `<= MAX_URL_CHARS` are analyzed (`urlsAnalyzed`). All other unique candidates
  are counted in `urlsSkipped`.
- **REQ-PIPE-12** Every analyzed URL MUST occur in `input.urls` or as a
  substring of the truncated text.
- **REQ-PIPE-13** If the truncated text is blank and no URL candidates exist,
  `run` MUST return a `no_signals` verdict (score 0, monster `null`) without
  calling any analyzer or the client.
- **REQ-PIPE-14** `TextAnalyzer` MUST NOT call `UrlAnalyzer`. The pipeline
  alone passes URLs to `UrlAnalyzer`, one call per URL.

---

## 3. Execution Order and Semantic Layer

`SEMANTIC_POLICY: "when-not-critical" | "always"`, default `"when-not-critical"`.

### 3.1 Requirements

- **REQ-PIPE-15** The pipeline MUST build an `AnalyzerRegistry` containing
  `TextAnalyzer` and `UrlAnalyzer`, plus `SemanticAnalyzer` only when
  `llmClient` is not `null`. The registry and the `SemanticAnalyzer` are built
  per `run` so the captured status is never shared between concurrent runs.
- **REQ-PIPE-16** Rule analyzers run first: `"text"` once on the text (skipped
  when blank) and `"url"` once per analyzed URL.
- **REQ-PIPE-17** `SemanticAnalyzer` runs on the truncated text only when
  `llmClient` exists, the text is not blank, and either the policy is
  `"always"` or the rules-only result (after overlap handling, aggregation and
  combination rules) is not `critical`.
- **REQ-PIPE-18** When `llmClient` is `null`, `semantic` is
  `{ status: "unavailable", skipped: false }` and everything else still works.
- **REQ-PIPE-19** When the semantic layer is not run by policy or blank text
  with a client present, `semantic` is `{ status: "ok", skipped: true }`.
  `reason` MUST NOT be set to a "skipped" value; `degraded` is used only for
  real failures.
- **REQ-PIPE-20** When the semantic layer runs, `status` and `reason` come from
  the `onResult` callback (`ok`, or `degraded` with the analyzer's reason). If
  `onResult` was never called, or the pipeline's own timeout
  (`semanticTimeoutMs`) fires first, the result is `degraded` with reason
  `client-error` or `timeout` respectively, and late results are ignored.
- **REQ-PIPE-21** If the semantic layer fails or is degraded, rule-based
  signals MUST still be returned and scored.

---

## 4. Overlap Handling

`src/pipeline/overlap.config.ts` exports `OVERLAP_GROUPS: readonly (readonly string[])[]`.
Seed groups:

- `text.authority-impersonation`, `semantic.impersonation-tone`
- `text.urgency`, `semantic.pressure-escalation`
- `text.prize-reward`, `semantic.too-good-to-be-true`
- `text.off-platform`, `semantic.isolation-secrecy`

### 4.1 Requirements

- **REQ-PIPE-22** A signal id MUST appear in at most one overlap group.
- **REQ-PIPE-23** For the aggregation step only, the pipeline MUST keep the
  strongest signal per overlap group (ties: earliest in text, url, semantic
  order) and the strongest signal per id (this collapses repeats across URLs).
  Signals in no group are kept after the per-id step.
- **REQ-PIPE-24** `Verdict.signals` MUST contain every signal returned by the
  analyzers (after evidence shortening), not the reduced list.
- **REQ-PIPE-25** The reduced list MUST be passed to the existing
  `aggregate()`. Its `score` and `level` are the aggregate result.
- **REQ-PIPE-26** An overlapping text and semantic signal MUST NOT raise the
  score above what the stronger one alone gives.
- **REQ-PIPE-27** `Verdict.signals` MUST be sorted by `severity` descending,
  stable on ties (original analyzer order).

---

## 5. Combination Rules

`src/pipeline/rules.config.ts` exports `COMBINATION_RULES` and
`MIN_SCORE_BY_LEVEL` (`suspicious` 1, `high` 50, `critical` 80, matching the
aggregator mapping).

```ts
interface CombinationRule {
  id: string;
  allOf: readonly (readonly string[])[]; // each inner array is an any-of group
  minLevel: "suspicious" | "high" | "critical";
}
```

An id entry ending in `.*` matches any signal id with that prefix
(`"url.*"`). A rule fires when every `allOf` group has at least one match among
all signals.

Seed rules:
- `otp-urgent-impersonation`: `[text.otp-request]`, `[text.urgency, text.threat]`,
  `[text.authority-impersonation, url.credential-keywords, url.brand-lookalike]`
  gives `critical`.
- `sensitive-data-with-link`: `[text.sensitive-data-request]`, `[url.*]` gives
  at least `high`.

### 5.1 Requirements

- **REQ-PIPE-28** Final `level` MUST be the maximum of the aggregate level and
  the `minLevel` of every fired rule.
- **REQ-PIPE-29** Final `riskScore` MUST be the maximum of the aggregate score
  and `MIN_SCORE_BY_LEVEL` of the highest fired rule level.
- **REQ-PIPE-30** Rules can only raise: final score and level are never lower
  than the aggregate result.
- **REQ-PIPE-31** Rules MUST NOT fire on an empty signal list.
- **REQ-PIPE-32** `MIN_SCORE_BY_LEVEL[l]` MUST map back to level `l` through
  the existing `aggregate` thresholds (checked by a unit test).

---

## 6. Monster Selection

`src/pipeline/monsters.config.ts` exports `MONSTERS` (bank, prize, job-bait,
authority), `MONSTER_ORDER` (that order), `MONSTER_THRESHOLD` and `GENERIC`.

```ts
interface MonsterDef {
  id: Exclude<MonsterId, "generic">;
  weights: Readonly<Record<string, number>>; // signal id -> weight
}
```

### 6.1 Requirements

- **REQ-PIPE-33** A monster's total is the sum of `weights[id]` over the
  distinct signal ids present in the verdict signals.
- **REQ-PIPE-34** The monster with the highest total that is `>= MONSTER_THRESHOLD`
  is chosen; ties are broken by `MONSTER_ORDER`.
- **REQ-PIPE-35** Level `no_signals` gives `null`. Any other level with no
  monster above the threshold gives `"generic"`.
- **REQ-PIPE-36** Monster ids and signal ids in the config MUST be validated by
  a unit test against the real analyzer configs (no unknown ids, no `generic`
  entry in `MONSTERS`).

---

## 7. Actions and Limitations

`src/pipeline/messages.config.ts` exports texts keyed by locale (`en`, `vi`):
`ACTIONS_BY_MONSTER`, `ACTIONS_BY_SIGNAL` (exact id or `url.*` prefix),
`ACTIONS_FALLBACK`, `LIMITATIONS_FIXED`, `LIMITATIONS_DEGRADED`,
`LIMITATIONS_UNAVAILABLE`, `LIMITATIONS_NO_SIGNALS`.

### 7.1 Requirements

- **REQ-PIPE-37** Actions MUST be the monster's actions followed by actions for
  each matching signal (config order), de-duplicated by exact text. For
  `no_signals` the monster list is empty.
- **REQ-PIPE-38** At least one action MUST always be returned, using
  `ACTIONS_FALLBACK` when nothing else matches. Seed signal actions include
  `text.otp-request` ("never share codes") and any `url.*` ("do not open the
  link").
- **REQ-PIPE-39** Limitations MUST always include `LIMITATIONS_FIXED`, plus
  `LIMITATIONS_DEGRADED` when semantic status is `degraded`,
  `LIMITATIONS_UNAVAILABLE` when `unavailable`, and `LIMITATIONS_NO_SIGNALS`
  when level is `no_signals`. Items are de-duplicated.
- **REQ-PIPE-40** Every entry MUST exist in both `en` and `vi` and be non-empty.
- **REQ-PIPE-41** No configured text MAY contain the words "safe", "clean",
  "no threats" (or Vietnamese "an toàn") as a claim of safety, checked by a
  unit test over all config texts.
- **REQ-PIPE-42** Explanations MUST come from each `Signal.whyItMatters`.
  The pipeline generates no prose beyond the configured actions and
  limitations.

---

## 8. Property-Based Testing Requirements

Continues after PBT-27. All use `FakeLlmClient` (never the network); use
`semanticTimeoutMs` of a few milliseconds for never-resolving clients.

| ID | Property | Generator hint |
|---|---|---|
| **PBT-28** | `run` never rejects or throws for arbitrary `text`/`urls` and for clients that return arbitrary strings, throw, reject, or never resolve | `fc.string()`, `fc.fullUnicodeString()`, `fc.array`, `fc.anything()` cast as input; fake behaviours |
| **PBT-29** | `riskScore` is an integer in `[0, 100]`; `level` is in the closed set; `monster` is in the closed set or `null`; `actions` and `limitations` are non-empty | Same as PBT-28 |
| **PBT-30** | Monotonicity: for text below `MAX_TEXT_CHARS` and a fake client returning `{"signals":[]}` (or `null` client), appending a known trigger phrase never lowers `riskScore` | `fc.string({maxLength})` plus phrases from `TEXT_PATTERNS` |
| **PBT-31** | Combination rules never lower the aggregate: `riskScore >= aggregate(reduced).score` and level rank is not lower | Signal lists built from the ids in `COMBINATION_RULES` plus random severities, via the pure combine function |
| **PBT-32** | Determinism: same input and same fake client behaviour gives deep-equal verdicts | Same as PBT-28 |
| **PBT-33** | `urlsAnalyzed <= MAX_URLS`, and every analyzed URL occurs in the input | `fc.array(fc.webUrl())`, text with embedded URLs, many URLs |
| **PBT-34** | With a client that always fails, rule-based signals are still present and `semantic.status === "degraded"` | Texts built from config phrases and `fc.webUrl()`; throw, reject, garbage, never-resolve |
| **PBT-35** | With `llmClient: null`, `semantic.status === "unavailable"` and the verdict is still valid | Same as PBT-28 |
| **PBT-36** | `level === "no_signals"` implies `monster === null`; `signals` is sorted by `severity` descending | Same as PBT-28 |
| **PBT-37** | No `Signal.evidence` exceeds `MAX_EVIDENCE_CHARS`, and `JSON.stringify(verdict)` contains no unique marker string placed in a raw fake LLM response outside valid evidence | Long hostnames and paths; responses embedding a marker |

### 8.1 Example-based tests

- Bank phishing sample (OTP request, urgency, brand-lookalike URL): `critical`,
  monster `bank`.
- Benign meeting message: `no_signals`, monster `null`, one fallback action,
  no-signals limitation.
- Message with only an IP-address URL: `suspicious` or higher, monster
  `generic`.
- Rules-only result `critical` with policy `"when-not-critical"`: the fake
  client is never called and `semantic` is `{ status: "ok", skipped: true }`.
- Overlapping `text.urgency` and `semantic.pressure-escalation`: score equals
  that of the stronger signal alone; both stay in `Verdict.signals`.
- Sensitive-data request plus any URL signal: at least `high`.
- Blank text and no URLs: no analyzer and no client call.

---

## 9. Out of Scope

- HTTP, API route, rate limiting, UI, OCR, QR decoding
- The real LLM adapter (`src/server/llm/`)
- Logging and analytics
- New analyzers or new signal ids
- Translating `Signal.whyItMatters` (analyzer texts stay as configured)

---

## 10. Non-Functional Requirements

- **NFR-PIPE-01** Limits, groups, rules, monsters and texts MUST be editable in
  the config files without touching pipeline logic or its tests.
- **NFR-PIPE-02** Pipeline work is bounded: at most `MAX_URLS` URL analyses,
  one text analysis and one semantic call per `run`.
