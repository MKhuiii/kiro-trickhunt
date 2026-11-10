# Design — TrickHunt Analysis Pipeline

## Files

- `src/pipeline/pipeline.config.ts` — limits, `SEMANTIC_POLICY`, timeouts
- `src/pipeline/overlap.config.ts` — `OVERLAP_GROUPS`
- `src/pipeline/rules.config.ts` — `COMBINATION_RULES`, `MIN_SCORE_BY_LEVEL`
- `src/pipeline/monsters.config.ts` — `MONSTERS`, `MONSTER_ORDER`, `MONSTER_THRESHOLD`
- `src/pipeline/messages.config.ts` — actions and limitations in `en` / `vi`
- `src/pipeline/verdict.ts` — types only
- `src/pipeline/input.ts` — `prepareInput(input)`: truncate, collect URLs, cap
- `src/pipeline/reduce.ts` — evidence shortening, overlap reduction, sort
- `src/pipeline/combine.ts` — `applyRules(aggregateResult, signals)`
- `src/pipeline/monster.ts` — `selectMonster(level, signals)`
- `src/pipeline/messages.ts` — `buildActions`, `buildLimitations`
- `src/pipeline/pipeline.ts` — `createPipeline`
- `src/pipeline/index.ts` — public exports
- a `*.test.ts` next to each module, plus `pipeline.property.test.ts`

Everything except `pipeline.ts` is a pure function, so PBT-31 can test
`applyRules` directly without analyzers.

## Flow of `run`

1. `prepareInput` (never throws): coerce, truncate, collect and cap URLs.
2. Blank text and no URLs: return the empty verdict (no analyzers, no client).
3. Rule stage, in parallel: `registry.analyze("text", text)` and
   `registry.analyze("url", url)` per URL.
4. `reduce` then `aggregate` then `applyRules` on the rules-only signals.
5. Semantic stage if a client exists, text is not blank, and policy allows
   (`always`, or rules-only level is not `critical`).
6. If it ran, merge signals in order text, url, semantic and repeat step 4.
7. `selectMonster`, `buildActions`, `buildLimitations`, assemble, freeze.

The whole of `run` sits in one `try/catch` that returns a minimal valid
`no_signals`-shaped fallback verdict with `semantic.status: "degraded"` if
something unexpected escapes, so the promise never rejects.

## Key decisions

**Registry per run.** `SemanticAnalyzer` reports status only through
`onResult`. A shared closure would be racy under concurrent `run` calls, so the
registry and `SemanticAnalyzer` are created inside `run` (cheap: no state
beyond the injected client). `TextAnalyzer` and `UrlAnalyzer` have no
constructor arguments.

**Pipeline-level semantic timeout.** `SemanticAnalyzer` always uses
`TIMEOUT_MS` and exposes no override. The pipeline races
`registry.analyze("semantic", text)` against its own timer
(`SEMANTIC_TIMEOUT_MS`, default slightly above `TIMEOUT_MS`, overridable via
`semanticTimeoutMs`) so never-resolving clients are testable quickly. A
`settled` flag per run makes late `onResult` calls no-ops. The timer is
cleared in `finally`.

**"Skipped" stays out of degraded.** `semantic.skipped` is a separate boolean
so `degraded` only ever means a real failure. Policy skip and blank text with
a client both give `ok` plus `skipped: true`. The analyzer's own
`degraded/skipped` reason (blank input) can therefore never appear, because
the pipeline never calls it with blank text.

**Reduce for scoring, keep for display.** Reduction keeps the strongest signal
per overlap group, then the strongest per id. Only the reduced list goes to
`aggregate()`. `Verdict.signals` carries all signals so the user sees every
warning sign. Group membership is a map `id -> group index` built once from
config.

**Rules use all signals.** Rule matching reads the full list (ids are
identical to the reduced list's ids, so the result is the same, and it avoids
a hidden dependency on reduction). Rules only raise, via `max`, so they cannot
break monotonicity or the aggregate contract. `MIN_SCORE_BY_LEVEL` repeats the
aggregator's thresholds; a unit test calls `aggregate` on a signal with that
severity to catch drift, instead of changing core.

**Monster scoring.** Presence-based sum of config weights over distinct ids.
Seed weights (editable): bank gets `text.otp-request` 3,
`text.sensitive-data-request` 2, `url.brand-lookalike` 2,
`text.authority-impersonation` 1, `url.credential-keywords` 1,
`semantic.impersonation-tone` 1; prize gets `text.prize-reward` 3,
`semantic.too-good-to-be-true` 2, `text.payment-request` 1; job-bait gets
`semantic.relationship-or-job-bait` 3, `text.off-platform` 2,
`semantic.isolation-secrecy` 1, `semantic.too-good-to-be-true` 1,
`text.payment-request` 1; authority gets `text.authority-impersonation` 2,
`text.threat` 2, `semantic.impersonation-tone` 1, `text.payment-request` 1.
`MONSTER_THRESHOLD` 2. Check: the bank sample scores bank 5, all others 0.
IP-only URL scores 0 everywhere, so `generic`.

**Messages.** Locale is resolved once to `en | vi`. Config shape is
`Record<Locale, readonly string[]>` per key, with a unit test that both locales
have equal, non-empty lists and pass the forbidden-words check.

## Known property caveat

With policy `when-not-critical`, adding a trigger phrase can flip the rules-only
result to `critical`, which skips the semantic call and drops semantic signals
that would otherwise have raised the score further. So monotonicity is not
universal for a client that returns signals. PBT-30 therefore uses a fake client
returning no signals (or `null`), where the property holds. This is accepted:
a rules-only `critical` is already at least 80.

## Notes

- Verdict-rules steering file is currently empty; level wording comes from
  `product.md` and `privacy-and-safety.md`. Level names are returned, display
  strings belong to the UI.
- Semantic status mapping comes from `SemanticResult`; the analyzer's reasons
  `timeout`, `client-error`, `invalid-response` pass through unchanged.
