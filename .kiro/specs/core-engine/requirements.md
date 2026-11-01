# Requirements — TrickHunt Core Engine

## Overview

The core engine is the analysis backbone of TrickHunt. It is framework-agnostic
TypeScript that can run in a browser, a Node.js server, or an edge runtime.
It has no knowledge of UI, LLM APIs, or OCR — those layers call into it.

---

## 1. Signal

### 1.1 Shape

A `Signal` is a plain, immutable value object describing one detected indicator
of potential harm.

| Field | Type | Constraints |
|---|---|---|
| `id` | `string` | Non-empty; uniquely identifies the signal kind (e.g. `"url.suspicious-tld"`) |
| `source` | `"url" \| "text" \| "image" \| "qr"` | Extensible union — new sources may be added without breaking existing code |
| `severity` | `number` | Closed interval **[0, 1]**; `0` = negligible, `1` = definitive indicator |
| `evidence` | `string` | Human-readable excerpt or description of what triggered the signal (non-empty) |
| `whyItMatters` | `string` | One-sentence plain-English explanation for the end user (non-empty) |

### 1.2 Requirements

- **REQ-SIG-01** The system MUST reject (throw or return an error) any `Signal`
  whose `severity` is outside `[0, 1]`.
- **REQ-SIG-02** The system MUST reject any `Signal` with an empty `id`,
  `evidence`, or `whyItMatters`.
- **REQ-SIG-03** `Signal` objects MUST be treated as immutable after creation;
  no mutation is permitted by engine code.

---

## 2. Aggregator

### 2.1 Purpose

The `Aggregator` combines a list of `Signal` objects into a single
`AggregationResult` using a **noisy-or** formula, then maps the score to a
human-readable risk level.

### 2.2 Noisy-Or Formula

```
score = round( (1 − ∏(1 − sᵢ)) × 100 )
```

where `sᵢ` is the `severity` of each signal in the input list.
The result is an integer in `[0, 100]`.

An empty signal list yields a score of `0`.

### 2.3 Risk Levels

| Level | Score range | Meaning |
|---|---|---|
| `no_signals` | score = 0 AND signal list is empty | Nothing detected yet |
| `suspicious` | 1 – 49 | Some indicators present; stay alert |
| `high` | 50 – 79 | Multiple or strong indicators; treat with caution |
| `critical` | 80 – 100 | Strong evidence of malicious intent |

> **Design note:** There is intentionally no "safe" level. Absence of signals
> means nothing has been analysed yet, not that the input is safe.

### 2.4 Requirements

- **REQ-AGG-01** `aggregate([])` MUST return `{ score: 0, level: "no_signals", signals: [] }`.
- **REQ-AGG-02** The returned score MUST always be an integer in `[0, 100]`.
- **REQ-AGG-03** Adding any signal with `severity > 0` to an existing list MUST
  NOT decrease the score (monotonicity).
- **REQ-AGG-04** A single signal with `severity = 1` MUST produce `score = 100`
  and `level = "critical"`.
- **REQ-AGG-05** The `AggregationResult` MUST include the original signal list
  unchanged (for display / audit purposes).
- **REQ-AGG-06** The `Aggregator` MUST be a pure function (no side effects,
  no global state, deterministic for identical inputs).

---

## 3. Analyzer Interface

### 3.1 Purpose

An `Analyzer` is a pluggable unit that inspects one piece of input and returns
zero or more `Signal` objects. Analyzers are registered at startup and invoked
by a thin orchestration layer (out of scope for this spec).

### 3.2 Interface Contract

```
interface Analyzer<TInput> {
  readonly sourceType: Signal["source"]
  analyze(input: TInput): Promise<Signal[]>
}
```

- `sourceType` identifies which input category this analyzer handles.
- `analyze` MUST resolve (never reject) for any input value, including `null`,
  `undefined`, empty strings, and malformed data. Error conditions MUST be
  handled internally and may produce zero signals or a low-severity
  "analysis-failed" signal.
- `analyze` MUST resolve within a reasonable timeout (implementation detail of
  the concrete analyzer; the interface does not enforce a timeout itself).

### 3.3 Requirements

- **REQ-ANL-01** `analyze` MUST return `Promise<Signal[]>` — never throw,
  never reject.
- **REQ-ANL-02** Every signal returned by `analyze` MUST satisfy the
  `Signal` validation rules in §1.2.
- **REQ-ANL-03** An `Analyzer` MUST NOT mutate its input.
- **REQ-ANL-04** Multiple `Analyzer` instances with the same `sourceType` MUST
  be independently composable — their signal arrays are concatenated before
  aggregation.

---

## 4. Property-Based Testing Requirements

These properties MUST be covered by property-based tests (e.g. fast-check).

| ID | Property | Generator hint |
|---|---|---|
| **PBT-01** | For any list of valid signals, `score ∈ [0, 100]` | Arbitrary `severity[]` drawn from `[0, 1]` |
| **PBT-02** | For any valid signal list `L` and any signal `s` with `severity > 0`, `aggregate([...L, s]).score >= aggregate(L).score` | Arbitrary lists + new signal |
| **PBT-03** | For any primitive or object value passed to any concrete `Analyzer`, `analyze` resolves without throwing | Arbitrary `fc.anything()` |
| **PBT-04** | For any valid signal list, `level` matches the score-to-level mapping in §2.3 exactly | Derived from PBT-01 runs |
| **PBT-05** | `Signal` construction with `severity` outside `[0, 1]` always results in an error | Arbitrary `fc.float()` outside range |

---

## 5. Out of Scope

- UI components, rendering, or routing
- LLM / AI API calls
- OCR processing
- QR image decoding
- Persistence or logging of user content
- Network requests of any kind

---

## 6. Non-Functional Requirements

- **NFR-01 Privacy:** The engine MUST NOT initiate any network requests. It
  operates entirely on data passed to it by the caller.
- **NFR-02 Portability:** The engine MUST have zero runtime dependencies that
  are environment-specific (no `window`, `document`, `process`, or Node
  built-ins in the core). Pure TypeScript / ECMAScript only.
- **NFR-03 Tree-shakability:** Each module (`signal`, `aggregator`, `analyzer`)
  MUST be independently importable so bundlers can exclude unused parts.
