# Design — TrickHunt Core Engine

## Module Layout

```
src/core/
  signal.ts        — Signal type + validation factory
  aggregator.ts    — noisy-or score + level mapping
  analyzer.ts      — Analyzer interface + registry helper
  index.ts         — re-exports public API
```

All modules are pure TypeScript. No framework imports.

---

## signal.ts

```ts
export type SignalSource = "url" | "text" | "image" | "qr";

export interface Signal {
  readonly id: string;
  readonly source: SignalSource;
  readonly severity: number;   // [0, 1]
  readonly evidence: string;
  readonly whyItMatters: string;
}

/** Validated constructor — throws if constraints are violated. */
export function createSignal(input: Signal): Signal { ... }
```

`createSignal` is the only way to produce a `Signal` consumed by the engine.
Direct object literals may be used in tests where the shape is already known
to be valid, but the factory MUST be used at module boundaries.

---

## aggregator.ts

```ts
export type RiskLevel = "no_signals" | "suspicious" | "high" | "critical";

export interface AggregationResult {
  readonly score: number;       // integer [0, 100]
  readonly level: RiskLevel;
  readonly signals: readonly Signal[];
}

export function aggregate(signals: readonly Signal[]): AggregationResult { ... }
```

Score formula:

```
p_survive = signals.reduce((acc, s) => acc * (1 - s.severity), 1)
score     = Math.round((1 - p_survive) * 100)
```

Level mapping is a simple range check executed after scoring.

---

## analyzer.ts

```ts
export interface Analyzer<TInput = unknown> {
  readonly sourceType: SignalSource;
  analyze(input: TInput): Promise<Signal[]>;
}
```

A `AnalyzerRegistry` helper (optional utility, not required by core):

```ts
export class AnalyzerRegistry {
  register(analyzer: Analyzer): void
  analyze(source: SignalSource, input: unknown): Promise<Signal[]>
}
```

`AnalyzerRegistry.analyze` calls all registered analyzers whose `sourceType`
matches, collects results, flattens the arrays, and returns the union.
It never rejects — individual analyzer failures are caught and discarded
(or converted to a low-severity signal, implementation choice).

---

## Data Flow

```
Raw input (URL / text / image bytes)
        │
        ▼
   Analyzer(s)  ──────────►  Signal[]
        │
        ▼
   aggregate()
        │
        ▼
   AggregationResult  { score, level, signals }
        │
        ▼
   UI / caller
```

---

## Error Handling Strategy

| Layer | Policy |
|---|---|
| `createSignal` | Throw `TypeError` with descriptive message |
| `aggregate` | Never throws; invalid signals should not reach it |
| `Analyzer.analyze` | Must catch all internal errors; return `[]` or a failure signal |
| `AnalyzerRegistry` | Wraps each `analyze` call in a try/catch; continues on failure |

---

## Testing Strategy

- **Unit tests** (Vitest): one file per module, happy-path + edge cases.
- **Property tests** (fast-check): cover PBT-01 through PBT-05 from requirements.
- Test files live alongside source: `signal.test.ts`, `aggregator.test.ts`, `analyzer.test.ts`.
- No mocks required for core — everything is pure functions or simple classes.
