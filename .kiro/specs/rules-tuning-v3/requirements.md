# Requirements Document

## Introduction

A PRECISION round, same method as `rules-tuning-v1` and `rules-tuning-v2`. In
rules-only mode (`createPipeline({ llmClient: null })`) twenty ordinary benign
messages contain one ambiguous phrase and reach `high` or `critical`, because
one fired signal with weight 0.5 or more crosses the level thresholds on its
own (aggregator: 1 to 49 `suspicious`, 50 to 79 `high`, 80 and above
`critical`). The rules own precision; a separate AI layer owns recall. This
spec lowers the weights of ambiguous groups, tightens bare phrases, restores
recall through combination rules, and extends the evaluation set.

**Amendment (monster gating and semantic signals).** With the AI layer on, one
`semantic.*` signal on a benign message gave a specific monster ("job-bait" for
a legitimate interview invitation) at level `suspicious`. A semantic signal can
reach 0.6 to 0.7 today, so one signal can even give `high`. The amendment
(Requirement 4) caps semantic severities, lowers weak semantic monster weights,
states the monster rule as a requirement, and adds two exposed benign messages.
The two messages (`b3-ben-21`, `b3-ben-22`) are no longer held-out samples.

Numbering continues: `REQ-TXT-26` onward, `REQ-PIPE-56` onward (this
update adds `REQ-PIPE-70` and `REQ-PIPE-71`), `PBT-81` onward (`PBT-86` to
`PBT-88` added), `NFR-RT-03` onward (`NFR-RT-05` added). Last existing numbers: `REQ-TXT-25`,
`REQ-PIPE-55`, `REQ-UI-46`, `PBT-80`, `NFR-RT-02`.

**Hard constraints:** configuration and tests, plus one logic change: the
maintainer chose option A for REQ-PIPE-67/68, so `selectMonster` in
`src/pipeline/monster.ts` (that function only) gets an overlap-group gate at
level `suspicious`. At `high` and `critical` its behaviour is exactly as
before. `TextAnalyzer`, `reduceForScoring`, `applyRules`, `aggregate`,
`Signal`, `Analyzer`, UI, API, LLM client and prompt, `url-analyzer.config.ts`,
`overlap.config.ts`, `messages.config.ts`, `pipeline.config.ts`, `reduce.ts`,
`combine.ts` and `src/core/` are NOT changed. `MONSTER_THRESHOLD` and
`MONSTER_ORDER` are NOT changed. `semantic-analyzer.config.ts` (severity caps
only) IS changed by the amendment. No new monster, no new signal id, no new
dependency, no network. "Safe" wording rules still apply. Documentation: the
repo-root `README.md` gains a "Known limits" section (NFR-RT-05).

## Glossary

- **Batch_3**: the twenty-two samples with ids prefixed `b3-` in `src/pipeline/eval/samples.ts`.
- **Benign_Pass**: level `no_signals` or `suspicious`, and monster `null` or `generic` (defined in `rules-tuning-v1`).
- **Ambiguous_Group**: one of `text.payment-request`, `text.otp-request`, `text.urgency`, `text.threat`, `text.authority-impersonation`, `text.financial-institution`, `text.job-offer`, `text.off-platform`. The last one is an addition to the list in the request (see design, "Known limits").
- **Single_Signal_Verdict**: the level from `aggregate(reduceForScoring([s]))` followed by `applyRules`, for one signal `s` with its configured weight.
- **Accepted_Recall_Loss**: a scam sample whose expected rules-only level is lowered to `suspicious` to keep a benign message out of `high`.

## Requirements

### Requirement 1: Evaluation set extension

**User Story:** As a maintainer, I want the twenty observed false positives in the evaluation set, so that precision is measured and cannot regress.

#### Acceptance Criteria

1. **REQ-PIPE-56** `EVAL_SAMPLES` SHALL gain the twenty-two Batch_3 messages with the exact texts of the requests, ids `b3-ben-01` to `b3-ben-22` (the number is the message number: 1 to 20 in the first request, 21 and 22 in the amendment), `expectedMonster: null`, `minLevel: "no_signals"`, and `locale` `"vi"` for messages 7, 8, 11 and 14, `"en"` otherwise. The set then has 75 samples: 26 scam and 49 benign.
2. **REQ-PIPE-57** `eval.test.ts` SHALL assert for every `b3-` sample: level is `no_signals` or `suspicious`, monster is `null` or `generic`, and monster is `null` exactly when the level is `no_signals`. Message 20 (`b3-ben-20`) is accepted at `no_signals` or `suspicious` only. Message 21 is `no_signals` and message 22 is at most `suspicious` rules-only.
3. **REQ-PIPE-58** The 53 earlier samples SHALL keep passing with no exception: every scam sample keeps its expected monster and a level at or above its `minLevel`; every earlier benign sample stays `no_signals`.

### Requirement 2: Text weights and phrases

**User Story:** As a user who receives an ordinary message with one ambiguous phrase, I do not want to be told it has "multiple warning signs".

#### Acceptance Criteria

1. **REQ-TXT-26** Weights SHALL change so that one signal of any Ambiguous_Group stays at most 0.49: `text.payment-request` 0.75 to 0.4, `text.otp-request` 0.85 to 0.45, `text.urgency` 0.5 to 0.3, `text.threat` 0.7 to 0.4, `text.authority-impersonation` 0.6 to 0.35, `text.off-platform` 0.5 to 0.4, `text.job-offer` 0.45 to 0.35. `text.financial-institution` stays 0.2. `text.prize-reward` and `text.sensitive-data-request` stay unchanged.
2. **REQ-TXT-27** `text.payment-request` SHALL NOT contain a bare fee noun or bare gift-card phrase: remove `pay immediately`, `registration fee`, `activation fee`, `processing fee`, `gift cards`, and Vietnamese `phí kích hoạt`, `phí đăng ký tài khoản`, `đặt cọc`, `phí xử lý`, `thẻ quà tặng`. A fee SHALL match only with a pay verb and a gift card only with buy, pay with, pay by or send (design lists the added phrases). Strong request phrases (`transfer money to a safe account`, `send money now`, `pay a deposit`, `pay the fee`, `nộp phí`, and the other existing `pay ... fee` forms) stay.
3. **REQ-TXT-28** `text.otp-request` SHALL NOT contain `your password`, `enter your pin`, `mã pin`, `mật khẩu của bạn` or `cung cấp mật khẩu`. It SHALL match a password or PIN only with a request verb and a request marker (`send me your password`, `tell me your pin`, `vui lòng cung cấp mật khẩu`, `hãy gửi mã pin`, and the forms in the design). Existing OTP and code request phrases stay, with `send me the code` first in the English list.
4. **REQ-TXT-29** `text.urgency` SHALL NOT contain a bare deadline: remove `within 24 hours`, `within 48 hours`, `within 72 hours`, `within 12 hours`, `within 2 hours`, `within 1 hour`, `within an hour`, and the Vietnamese `trong 24h`, `trong 48h`, `trong 24 giờ`, `trong 48 giờ`, `trong 1 giờ`, `trong vòng 24 giờ`, `trong vòng 1 giờ`, `trong vòng 2 giờ`. Deadlines bound to an action or a consequence (`reply within 24 hours`, `locked in 24 hours`, `bị khóa trong 24h`) are matched.
5. **REQ-TXT-30** `text.threat` SHALL NOT contain bare `unpaid taxes` or `unpaid tax`; it SHALL match `your unpaid taxes`, `you have unpaid taxes` and `card has been suspended`.
6. **REQ-TXT-31** `text.job-offer` SHALL NOT contain bare `easy tasks`, `simple tasks` or `nhiệm vụ đơn giản`; it SHALL match `with easy tasks`, `complete easy tasks`, `complete simple tasks`, `làm nhiệm vụ đơn giản`, `hoàn thành nhiệm vụ đơn giản`.
7. **REQ-TXT-32** Every added or changed phrase SHALL follow REQ-TXT-02 to REQ-TXT-07 and REQ-TXT-21: boundary-aware, case- and diacritic-insensitive, at most one signal per group, weights in `[0, 1]`.

### Requirement 3: Combination rules and monster selection

**User Story:** As a user who receives a real scam, I still want a high or critical result and the right monster, because several independent warning signs are present.

#### Acceptance Criteria

1. **REQ-PIPE-59** `COMBINATION_RULES` SHALL gain five rules (existing two stay): `otp-with-context` (`text.otp-request` with any of `text.financial-institution`, `text.urgency`, `text.threat`, `url.*`) to `critical`; `payment-with-pressure` (`text.payment-request` with any of `text.off-platform`, `text.urgency`, `text.threat`, `text.authority-impersonation`, `text.prize-reward`) to `critical`; `authority-with-threat` (`text.authority-impersonation` with `text.threat`) to `critical`; `job-offer-with-payment` (`text.job-offer` with `text.payment-request`) to `critical`; `job-offer-off-platform` (`text.job-offer` with `text.off-platform`) to `high`. Every id SHALL resolve to a real signal id or prefix (existing `config.test.ts`).
2. **REQ-PIPE-60** `MONSTERS` weights SHALL change so that no single Ambiguous_Group signal reaches `MONSTER_THRESHOLD`: `bank`: `text.otp-request` 3 to 1, and `text.authority-impersonation` removed; `job-bait`: `text.job-offer` 3 to 1; `authority`: `text.authority-impersonation` 2 to 1 and `text.threat` 2 to 1. All other weights unchanged.
3. **REQ-PIPE-61** A result at level `suspicious` caused by one Ambiguous_Group signal SHALL carry monster `generic`, never a specific monster (follows from REQ-PIPE-60 and `MONSTER_THRESHOLD` 2; checked by PBT-82).
4. **REQ-PIPE-62** `MONSTER_THRESHOLD` (2), `MONSTER_ORDER`, `OVERLAP_GROUPS`, `MIN_SCORE_BY_LEVEL`, `ACTIONS_*`, `LIMITATIONS_*`, `pipeline.config.ts`, `reduce.ts`, `combine.ts`, `overlap.config.ts` and `src/core/` SHALL be unchanged. In `monster.ts` only `selectMonster` changes (REQ-PIPE-67); its signature and its result at `no_signals`, `high` and `critical` stay as before.
5. **REQ-PIPE-63** Every scam sample in the evaluation set (21 tuning samples and 5 `b2-` samples) SHALL keep its expected monster and level at or above its `minLevel` with the new configuration. If one cannot, its `minLevel` MAY be lowered to `suspicious` and it SHALL be listed in `design.md` under "Accepted recall loss"; at most 5 samples; the maintainer SHALL be asked before the sixth. Measured with the prototype: none needed.
6. **REQ-PIPE-64** `design.md` SHALL record a before and after table: benign samples at or above `high`, scam samples at their expected level and monster, and Accepted_Recall_Loss.

### Requirement 4: Monster gating and semantic signals (amendment)

**User Story:** As a user with the AI layer on, I do not want one weak AI observation to name a specific monster.

#### Acceptance Criteria

1. **REQ-PIPE-65** `SEVERITY_CAP` in `semantic-analyzer.config.ts` SHALL change from 0.8 to 0.45 and every `maxSeverity` SHALL be 0.45 (was 0.5 to 0.7), so one semantic signal on its own is at most `suspicious`. REQ-SEM-02 and REQ-SEM-03 still hold (each value in `(0, SEVERITY_CAP]`, cap below 1). The LLM prompt and client are unchanged.
2. **REQ-PIPE-66** `MONSTERS` SHALL change for semantic ids: `job-bait`: `semantic.relationship-or-job-bait` 3 to 1; `prize`: `semantic.too-good-to-be-true` 2 to 1; `authority`: add `semantic.pressure-escalation` 1. Every semantic id then weighs at most 1 for each monster, so one semantic signal never reaches `MONSTER_THRESHOLD`.
3. **REQ-PIPE-67** WHILE the level is `suspicious`, `selectMonster` SHALL return a specific monster only when the signals that carry a weight for that monster come from at least two different overlap groups (`OVERLAP_GROUPS`; a signal outside every group is its own group; signals of the same group count once) and the monster total is at least `MONSTER_THRESHOLD`; otherwise it SHALL return `generic`. WHILE the level is `high` or `critical`, `selectMonster` SHALL return exactly what it returned before the gate. This applies to rule and `semantic.*` signals alike. With REQ-PIPE-65 and REQ-PIPE-66, configuration alone covers every single signal of every known id (measured); the gate covers two signals of the same overlap group (for example `text.job-offer` with `semantic.relationship-or-job-bait`, which gave `suspicious`, `job-bait` before the gate).
4. **REQ-PIPE-68** The maintainer chose option A (design, "Decision: gate `selectMonster` by overlap group"). The change SHALL be limited to `selectMonster` in `src/pipeline/monster.ts` and the tests it affects in `monster.test.ts`; the gate SHALL apply at level `suspicious` only; `MONSTER_THRESHOLD` and `MONSTER_ORDER` SHALL stay unchanged; `reduce.ts`, `combine.ts`, `overlap.config.ts` and `src/core/` SHALL stay untouched. Every test in `monster.test.ts` that changes SHALL be listed in `design.md` with its reason.
5. **REQ-PIPE-69** Tests with `FakeLlmClient` SHALL show: one `semantic.relationship-or-job-bait` or `semantic.pressure-escalation` signal (at any severity the fake returns) on the clean message `b3-ben-21` gives level at most `suspicious` and monster `generic`; the same signal with a rule signal from a different overlap group in the same monster family gives the specific monster at level `high` (`job-bait` with `text.off-platform`; `authority` with `text.threat`).
6. **REQ-PIPE-70** With `createPipeline` and `FakeLlmClient` on the benign base message `b3-ben-21`: WHEN the fake returns `semantic.impersonation-tone`, `semantic.pressure-escalation` and `semantic.isolation-secrecy` at severity 0.45 (the cap; three different overlap groups), THE Pipeline SHALL return score 83 and level `critical`; WHEN the fake returns one of them at 0.45, THE Pipeline SHALL return score 45 and level `suspicious` (score below 50). Two such signals give score 70 and `high` (design, "Semantic cap: levels with the real aggregate"). No rule in `COMBINATION_RULES` can fire on `semantic.*` signals alone, so `applyRules` does not change these results.
7. **REQ-PIPE-71** The gate SHALL be covered by property tests in `monster.gate.property.test.ts` (PBT-86 to PBT-88) and by the updated examples in `monster.test.ts`, which SHALL contain a copy of the pre-gate logic only inside the property test file.

## Existing Requirements, Tests, Samples and Config Modified

Each item below is changed by this spec; nothing else is. The failing set was
measured by applying the planned configuration to the current code and running
the whole suite (96 files, 1279 tests): 10 tests in 5 files fail, all listed.

### Requirements

| Existing | Change |
|---|---|
| `rules-tuning-v1` REQ-TXT-16 (urgency deadlines "within 1 hour", "trong 24h", "trong vòng 1 giờ" match) | Superseded: bare deadlines are removed (REQ-TXT-29). "locked in 24 hours" stays |
| `rules-tuning-v1` REQ-TXT-17 (otp-request) | Extended: bare password and PIN phrases removed (REQ-TXT-28). Resolves the v1 "Known limits" item on `your password`, `mã pin` |
| `rules-tuning-v1` REQ-TXT-19 (`text.job-offer` weight 0.45; "easy tasks", "simple tasks", "nhiệm vụ đơn giản") | Superseded: weight 0.35, three bare phrases replaced (REQ-TXT-26, 31) |
| `rules-tuning-v1` REQ-PIPE-48 (monster weights) | Superseded for the weights in REQ-PIPE-60 |
| `rules-tuning-v1` REQ-PIPE-50 ("a single weight-1 signal never selects a specific monster") | Still true; now also true for every Ambiguous_Group signal (REQ-PIPE-61) |
| `rules-tuning-v1` REQ-PIPE-51 (`COMBINATION_RULES` unchanged) | Superseded for `COMBINATION_RULES` only (REQ-PIPE-59) |
| `rules-tuning-v1` REQ-PIPE-45 and "43 samples" | Set grows to 73; earlier samples unchanged |
| `rules-tuning-v2` REQ-TXT-23 (strong payment phrases: `pay immediately`, `registration fee`, `activation fee`, `phí kích hoạt`, `phí đăng ký tài khoản`; "processing fee", "gift cards" stay) | Superseded for the bare forms (REQ-TXT-27) |
| `rules-tuning-v2` REQ-TXT-25 (`unpaid taxes`, `unpaid tax` in `text.threat`) | Superseded (REQ-TXT-30) |
| `rules-tuning-v2` REQ-PIPE-55 (`monsters.config.ts` unchanged) | Superseded for `monsters.config.ts` (REQ-PIPE-60). `overlap.config.ts` stays unchanged |
| `rules-tuning-v2` design "Known limits" (registration or activation fee fires `high`) | Resolved |
| `semantic-analyzer` severity values (`SEVERITY_CAP` 0.8, per-id `maxSeverity` 0.5 to 0.7) | Superseded by REQ-PIPE-65. REQ-SEM-02 and REQ-SEM-03 (range rules) unchanged |
| `rules-tuning-v1` REQ-PIPE-48 (semantic ids in monster weights: `relationship-or-job-bait` 3, `too-good-to-be-true` 2 in prize) | Superseded by REQ-PIPE-66 |
| `rules-tuning-v2` REQ-PIPE-54 (Batch_2 benign are Clean; Batch_2 scams at `high` or above) | Unchanged and still met |

Not modified: REQ-TXT-01 to 15, 18, 20, 21, 22, 24; REQ-PIPE-01 to 44, 46 to 47, 49, 52 to 54; REQ-UI-*; `url-analyzer`, `semantic-analyzer`, `core-engine`, `analyze-api`, `client-ingest` requirements.

### Config

| File | Change |
|---|---|
| `src/analyzers/text-analyzer.config.ts` | Seven groups: weights (REQ-TXT-26) and phrases (REQ-TXT-27 to 31). `text.financial-institution`, `text.prize-reward`, `text.sensitive-data-request` untouched |
| `src/pipeline/monsters.config.ts` | `bank`, `job-bait`, `authority` weights (REQ-PIPE-60); `semantic.relationship-or-job-bait`, `semantic.too-good-to-be-true`, `semantic.pressure-escalation` weights (REQ-PIPE-66) |
| `src/analyzers/semantic-analyzer.config.ts` | `SEVERITY_CAP` 0.8 to 0.45; six `maxSeverity` values to 0.45 (REQ-PIPE-65). Existing tests read these constants and pass unchanged (measured) |
| `src/pipeline/rules.config.ts` | Five rules added (REQ-PIPE-59) |

Not modified: `overlap.config.ts`, `messages.config.ts`, `pipeline.config.ts`, `url-analyzer.config.ts`, UI dictionaries (no new signal id), `reduce.ts`, `combine.ts`, `src/core/`.

### Logic and documentation

| File | Change |
|---|---|
| `src/pipeline/monster.ts` | `selectMonster` only: overlap-group gate at level `suspicious` (REQ-PIPE-67, REQ-PIPE-68). `MONSTER_THRESHOLD` and `MONSTER_ORDER` unchanged |
| `README.md` (repo root) | New "Known limits" section (NFR-RT-05) |

### Samples

| File | Change |
|---|---|
| `src/pipeline/eval/samples.ts` | Twenty-two `b3-ben-01` to `b3-ben-22` samples appended. The 53 earlier samples and their `minLevel` stay |

### Tests

| File | Test | Change |
|---|---|---|
| `src/pipeline/eval/samples.test.ts` | "has 53 samples: 26 scam and 27 benign (43 tuning + 10 batch 2)" | Now 75 / 26 / 49, and 22 `b3-` ids. Other tests in the file pass unchanged |
| `src/pipeline/eval/eval.test.ts` | `describe` "rules-only evaluation set" | Extra block for `b3-` samples (REQ-PIPE-57). One test per sample, so 22 new tests |
| `src/analyzers/text-analyzer.property.test.ts` | "rules-tuning-v1 fixtures match the config > every added phrase exists in TEXT_PATTERNS under its group" (fails), PBT-77 (fails), PBT-78 (fails) | Fixture `ADDED_PHRASES` only: remove the phrases that REQ-TXT-29 and 31 delete (urgency en: `within 72 hours`, `within 12 hours`, `within 2 hours`, `within 1 hour`, `within an hour`; urgency vi: all six; job-offer: `easy tasks`, `simple tasks`, `nhiệm vụ đơn giản`). Assertions unchanged. PBT-75 passes unchanged |
| `src/analyzers/text-analyzer.v2.test.ts` | "strong payment phrases stay strong (REQ-TXT-23)" | Remove three inputs: `pay immediately by gift cards`, `A one-time registration fee of $20`, `only a small processing fee required` (they now give no `text.payment-request`; moved to the v3 test; justification per input in `design.md`, "Removed test inputs"). The other six inputs still pass |
| `src/pipeline/combine.test.ts` | "otp-urgent-impersonation > needs all three groups" (fails) | First assertion `otp + urgency` gives `critical` through the new `otp-with-context` rule, not `suspicious`. The assertions for `otp + authority-impersonation` and `urgency + authority-impersonation` stay |
| `src/pipeline/monster.test.ts` | "breaks ties by MONSTER_ORDER", first case (fails) | `otp-request` (now bank 1) + `prize-reward` (prize 3) gives `prize`. Replace with `text.sensitive-data-request` + `semantic.too-good-to-be-true` at `high` (bank 2, prize 1, job-bait 1 after REQ-PIPE-66): `bank` on total, not on order. Comments of the first two cases are stale (REQ-PIPE-66) and only the comments change. The second case result (`prize`) is unchanged; the third passes unchanged |
| `src/pipeline/monster.test.ts` | New "two signals of one overlap group at suspicious give generic (REQ-PIPE-67)" | Added by the gate (REQ-PIPE-68): `text.job-offer` + `semantic.relationship-or-job-bait` gives `generic` at `suspicious`, `job-bait` at `high`. No existing test in the file is expected to break because of the gate; any that does is listed in `design.md` with its reason |
| `src/pipeline/monster.test.ts` | "text.job-offer alone gives job-bait" (fails) | `text.job-offer` alone gives `generic`; `text.job-offer` + `text.off-platform` gives `job-bait` |
| `src/pipeline/monster.test.ts` | "a higher total beats an earlier monster in order" | Comment only: authority is now 1 + 1 = 2 against bank 1 (test passes) |
| `src/pipeline/pipeline.test.ts` | "overlapping urgency and semantic pressure do not inflate the score" (fails) | The test needs the text signal to be at least as strong as the semantic one. Semantic severity 0.5 to 0.3 (0.5 would be capped to 0.45, still above the text 0.3), assertion `urgency.severity >= 0.3`, comment updated. Intent unchanged |

The amendment adds no failing test: with the semantic caps and weights applied
on top of the weights above, the same tests fail and no other (measured:
`semantic-analyzer.config.test.ts`, `semantic-analyzer.test.ts`,
`semantic-analyzer.property.test.ts` read the constants and pass).

Unchanged and still passing (measured): the other 91 test files, including
`eval.property.test.ts` (PBT-76, PBT-80), `text-analyzer.config.test.ts`,
`text-analyzer.test.ts` (uses `phrases.en[0]`), `config.test.ts`,
`dictionary.property.test.ts` (PBT-79), `highlights.test.ts`,
`result-view.test.ts`, `pipeline.property.test.ts`.

## Property-Based Testing Requirements

Continues after PBT-80. `numRuns >= 100` (or exhaustive over a finite set). Never the network.

| ID | Property | Generator hint |
|---|---|---|
| **PBT-81** | For every Ambiguous_Group id, a Single_Signal_Verdict (real `reduceForScoring`, `aggregate`, `applyRules`; signal built with `createSignal` at the configured weight) has level `suspicious` at most. Also, for every phrase of those groups, a pipeline run on the phrase alone that fires exactly one signal gives level `suspicious` at most and monster `generic` | `fc.constantFrom` over ids; exhaustive loop over phrases |
| **PBT-82** | For every Ambiguous_Group id, `selectMonster("suspicious", [that signal])` is `generic` (REQ-PIPE-61) | `fc.constantFrom` over ids |
| **PBT-83** | Appending a benign sentence to any sample text or any added phrase never lowers `riskScore` (extends PBT-76 to Batch_3 and the new combination rules) | `EVAL_SAMPLES` texts plus the phrases added by this spec; benign sentences from all benign samples |
| **PBT-85** | For a single signal of any id in `KNOWN_SIGNAL_IDS` (text, url and semantic) with any severity in `(0, max]`, where `max` is the id's configured weight, `maxSeverity` or analyzer severity, the monster from `selectMonster` after `aggregate` and `applyRules` is `generic` unless the level is `high` or `critical` (REQ-PIPE-67, single-signal case) | `fc.constantFrom(...KNOWN_SIGNAL_IDS)` and `fc.double` up to `max`; url maxima in a local fixture table |
| **PBT-84** | For every phrase added by this spec, signal ids are the same for the upper-cased text, the lower-cased text and the diacritic-stripped text (extends PBT-77 and PBT-78) | Added phrases in `fc.string()` filler |
| **PBT-86** | For every overlap group and any non-empty selection of its ids (two or more signals, or one id repeated), `selectMonster("suspicious", signals)` is `generic` (REQ-PIPE-67, same group counts once) | `fc.constantFrom(...OVERLAP_GROUPS)`, array of indexes |
| **PBT-87** | For every pair of ids from different overlap groups that only one monster supports (total at least `MONSTER_THRESHOLD`), `selectMonster("suspicious", [a, b])` is that monster (REQ-PIPE-67) | Pairs derived from `MONSTERS` and `OVERLAP_GROUPS` |
| **PBT-88** | For `high` and `critical` and any list of known ids, `selectMonster` equals a copy of the pre-gate logic kept inside the test file (REQ-PIPE-67, REQ-PIPE-68) | `fc.array(fc.constantFrom(...ALL_IDS))` |

PBT-79 (every signal id has an explanation in both dictionaries) is re-run unchanged: no signal id is added or removed.

Files: `src/pipeline/precision.property.test.ts` (PBT-81 to PBT-83 and PBT-85), `src/analyzers/text-analyzer.v3.property.test.ts` (PBT-84, plus a fixture test that every added phrase exists in its group) and `src/pipeline/monster.gate.property.test.ts` (PBT-86 to PBT-88; the copy of the old logic lives only in this file).

### Example-based tests

- New `src/analyzers/text-analyzer.v3.test.ts`: the three inputs removed from the v2 test, plus "pay the registration fee" gives `text.payment-request`; "buy gift cards" and "We sell gift cards" differ; "send me your password" fires, "change your password in Settings" does not; "reply within 24 hours" fires, "delivered within 24 hours" does not; "your unpaid taxes" fires, "I still have unpaid taxes" does not; "with easy tasks" fires, "a few easy tasks around the house" does not.
- New `src/pipeline/combine.v3.test.ts`: each of the five new rules fires with its groups and not with one side.
- New `src/pipeline/semantic-monster.test.ts` with `FakeLlmClient` (REQ-PIPE-69): single semantic signal on `b3-ben-21` is at most `suspicious` and `generic` for severities 0.3, 0.6 and 1; `relationship-or-job-bait` with "Message us on Telegram" gives `high`, `job-bait`; `pressure-escalation` with "A court summons has been issued" gives `high`, `authority`. REQ-PIPE-70: three signals (`impersonation-tone`, `pressure-escalation`, `isolation-secrecy`) at 0.45 on `b3-ben-21` give score 83, `critical`; one of them at 0.45 gives score 45, `suspicious` (below 50). The same-group gap test (`text.job-offer` + `semantic.relationship-or-job-bait`: `suspicious`, `generic`) is part of the gate (REQ-PIPE-67).
- The twenty-two Batch_3 messages are in the Eval_Set and covered by `eval.test.ts`.

## Out of Scope

UI, API, LLM layer, new monsters, new signal ids, algorithm changes, a
negation-aware matcher, a held-out validation set, tuning `text.prize-reward`
and `text.sensitive-data-request` (see design, "Known limits").

## Non-Functional Requirements

- **NFR-RT-03** No temporary diagnosis file is committed (`src/**/tmp-*.test.ts` is git-ignored; delete them before the final task). The files that change are only those listed in the design "Files" section: `monster.ts` (`selectMonster` only) and `monster.test.ts` change; `reduce.ts`, `combine.ts`, `overlap.config.ts` and `src/core/` stay untouched.
- **NFR-RT-04** The full `vitest run` passes after the change. The only edited existing tests are the ones in the table above.
- **NFR-RT-05** THE repo-root `README.md` SHALL contain a "Known limits" section stating that rules-only mode has low recall on unfamiliar scam wording and that the AI layer is needed for it; that the evaluation set was used for tuning and is not an accuracy estimate; and the accepted recall losses (currently none, per `design.md`). Documentation only: no source or test file changes for this item.
