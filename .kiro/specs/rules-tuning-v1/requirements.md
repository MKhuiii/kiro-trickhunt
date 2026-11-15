# Requirements Document

## Introduction

A deliberate change to frozen configuration (specs `text-analyzer`,
`analysis-pipeline`, `ui-presentation`). In rules-only mode
(`createPipeline({ llmClient: null })`) the four flagship scam types are missed
or given the wrong monster, and legitimate one-time-code messages are rated
`critical`. This spec retunes phrases, weights and monster selection, and adds
a typed evaluation set that proves the result.

Numbering continues the existing specs: `REQ-TXT-16` onward, `REQ-PIPE-43`
onward, `REQ-UI-45` onward, `PBT-75` onward (the last existing numbers are
`REQ-TXT-15`, `REQ-PIPE-42`, `REQ-UI-44`, `PBT-74`).

**Hard constraints:**
- Configuration first. `TextAnalyzer`, `selectMonster`, `reduceForScoring`,
  `applyRules`, `aggregate`, `Signal` and `Analyzer` code and contracts are NOT
  changed. If a goal cannot be reached by configuration, stop and amend this
  spec before touching logic.
- UI components, the API, the LLM layer and `url-analyzer.config.ts` are NOT
  changed. No new monsters (the existing four plus `generic`). No new
  dependency, no network.
- The LLM still owns no score. The "safe" wording rules still apply to every
  new text (REQ-PIPE-41, REQ-UI-06).
- Tests use `createPipeline({ llmClient: null })`.
- The repo steering file `verdict-rules.md` is empty, so it adds no constraint.

## Glossary

- **Eval_Set**: The typed list of synthetic messages in `src/pipeline/eval/`.
- **Scam_Sample**: An Eval_Set entry with an expected monster and a minimum level.
- **Benign_Sample**: An Eval_Set entry with expected monster `null` and level `no_signals`.
- **Benign_Pass**: Level is `no_signals` or `suspicious`, and monster is `null` or `generic` (never a specific monster, never `high` or `critical`).

## Requirements

### Requirement 1: Evaluation set

**User Story:** As a maintainer, I want one measurable set of messages, so that every phrase or weight change is checked against missed scams and false positives.

#### Acceptance Criteria

1. **REQ-PIPE-43** THE module `src/pipeline/eval/samples.ts` SHALL export a readonly typed list `EVAL_SAMPLES` whose entries have `id` (unique), `locale` (`"en"` or `"vi"`), `text`, `expectedMonster` (`"bank" | "prize" | "job-bait" | "authority" | null`) and `minLevel` (`RiskLevel`; `"no_signals"` for every Benign_Sample).
2. **REQ-PIPE-44** THE Eval_Set SHALL be synthetic: fake brands only, URLs only on the `.example` TLD, no real person, no phone or account number, and no real brand.
3. **REQ-PIPE-45** THE Eval_Set SHALL contain, per specific monster, at least 4 English and 1 Vietnamese Scam_Sample, and at least 12 English and 4 Vietnamese Benign_Samples. The Benign_Samples SHALL include a bank balance notice that points to the bank app, a legitimate one-time-code message that says never to share the code (English and Vietnamese), an order confirmation, a delivery notice without a payment request, a meeting invitation, a family message asking for money for dinner, a subscription receipt, and a recruiter interview schedule without a deposit.
4. **REQ-PIPE-46** A test SHALL run every sample through `createPipeline({ llmClient: null })` and assert: for a Scam_Sample, `monster === expectedMonster` and level rank `>= minLevel`; for a Benign_Sample, Benign_Pass.
5. **REQ-PIPE-47** `src/pipeline/eval/` SHALL be imported only by test files, SHALL import only from `src/pipeline` and `src/core`, and SHALL NOT be re-exported from `src/pipeline/index.ts`.

### Requirement 2: Text rule phrases

**User Story:** As a user who receives a scam message, I want deadline and one-time-code requests to be detected, and I do not want a genuine code message to be flagged.

#### Acceptance Criteria

1. **REQ-TXT-16** THE `text.urgency` group SHALL also match, in English and Vietnamese, short deadlines of one hour or more that are bound to a consequence or an action (for example "locked in 24 hours", "within 1 hour", "trong 24h", "trong vòng 1 giờ"). A bare "in 24 hours" SHALL NOT match, so "It will ship in 24 hours" gives no signal.
2. **REQ-TXT-17** THE `text.otp-request` group SHALL match only phrases that contain a request: a request verb together with the code, such as "reply with the OTP", "send us your OTP", "enter the OTP", or Vietnamese forms introduced by "vui lòng", "hãy" or "và" before "cung cấp / gửi / nhập mã OTP". It SHALL NOT contain a bare noun phrase ("your OTP", "verification code", "security code", "one time password", "mã OTP", "mã xác minh", "mã xác thực") and SHALL NOT contain "share your OTP" or "cung cấp mã OTP" without a request marker.
3. **REQ-TXT-18** THE `text.payment-request` group SHALL also match "pay a/the (small) (shipping | handling | registration | release | clearance | training) fee or deposit" forms and Vietnamese "trả / đóng / nộp phí (vận chuyển | đăng ký)" and "đóng / nộp tiền cọc". THE `text.off-platform` group SHALL also match "message us on / contact us on" Telegram and WhatsApp. THE `text.threat` group SHALL also match "you are under investigation" and "đang bị điều tra".
4. **REQ-TXT-19** THE new group `text.job-offer` (weight `0.45`) SHALL match English and Vietnamese phrases for easy-task and no-experience job bait ("easy tasks", "simple tasks", "no experience needed", "hiring online", "không cần kinh nghiệm", "nhiệm vụ đơn giản") and SHALL NOT match a plain job posting ("We are hiring a sales assistant ... salary is paid monthly").
5. **REQ-TXT-20** THE new group `text.financial-institution` (weight `0.2`) SHALL match account-verification and wallet lures ("verify your account", "unlock your account", "e-wallet", "xác minh tài khoản", "ví điện tử"). It SHALL NOT match the bare words "bank", "card" or "ngân hàng".
6. **REQ-TXT-21** EVERY new or changed phrase SHALL follow REQ-TXT-02 to REQ-TXT-07: each new group has `whyItMatters`, at least one English and one Vietnamese phrase and a weight in `[0, 1]`; matching stays boundary-aware and case- and diacritic-insensitive; a group emits at most one signal.

### Requirement 3: Monster selection and overlap

**User Story:** As a user, I want the monster to match the kind of scam, so that the advice I read fits the message.

#### Acceptance Criteria

1. **REQ-PIPE-48** THE `MONSTERS` weights SHALL change as follows. `bank`: add `text.threat` 1 and `text.financial-institution` 1. `job-bait`: add `text.job-offer` 3 and lower `text.off-platform` from 2 to 1. `authority`: add `text.off-platform` 1. `prize` is unchanged. Every id SHALL exist in the analyzer configs (REQ-PIPE-36).
2. **REQ-PIPE-49** THE `OVERLAP_GROUPS` SHALL gain `["text.job-offer", "semantic.relationship-or-job-bait"]`. `text.financial-institution` has no semantic counterpart and SHALL NOT be grouped. No id appears in more than one group (REQ-PIPE-22).
3. **REQ-PIPE-50** `MONSTER_THRESHOLD` SHALL stay `2` and `MONSTER_ORDER` SHALL stay `bank, prize, job-bait, authority`. A single weight-1 signal therefore never selects a specific monster.
4. **REQ-PIPE-51** `COMBINATION_RULES`, `MIN_SCORE_BY_LEVEL`, `ACTIONS_*`, `LIMITATIONS_*` and `pipeline.config.ts` SHALL be unchanged.
5. **REQ-PIPE-52** FOR the Eval_Set, THE pipeline SHALL meet REQ-PIPE-46 with no sample marked as an exception. The design records the before and after counts of correct monsters, missed scams, wrong monsters and false positives.

### Requirement 4: UI dictionary

**User Story:** As a user, I want each new warning sign explained in my language.

#### Acceptance Criteria

1. **REQ-UI-45** THE `KNOWN_SIGNAL_IDS` list SHALL gain `text.job-offer` and `text.financial-institution` (23 ids: 10 text, 7 url, 6 semantic) and its doc comment SHALL match.
2. **REQ-UI-46** THE `en` and `vi` dictionaries SHALL each gain `signal.text.job-offer.explain` and `signal.text.financial-institution.explain`: English is plain language with a next step, Vietnamese is a draft; no sentence has more than 25 words; neither contains "safe" or "an toàn".

## Existing Requirements and Tests Modified

This is a deliberate change to frozen configuration. Each item below is changed
by this spec; nothing else in the existing specs is changed. The failing set
was measured by applying the planned configuration to the current code.

### Requirements

| Existing | Change |
|---|---|
| `text-analyzer` REQ-TXT-01 (config holds all phrases and weights) | Unchanged in meaning; the config gains two groups |
| `text-analyzer` pattern list of eight groups (requirements 1 and design) | Ten groups; see REQ-TXT-19, 20 |
| `text-analyzer` phrase lists of `text.otp-request`, `text.urgency`, `text.payment-request`, `text.off-platform`, `text.threat` | Changed by REQ-TXT-16 to 18 |
| `analysis-pipeline` REQ-PIPE-33 to 35 (monster algorithm) | Unchanged; weights change (REQ-PIPE-48) |
| `analysis-pipeline` Section 6 seed weights (`monsters.config.ts`) | Replaced by REQ-PIPE-48 |
| `analysis-pipeline` Section 4 overlap groups (`overlap.config.ts`) | One group added (REQ-PIPE-49) |
| Behaviour "`text.off-platform` alone selects `job-bait`" (weight 2, from the seed config) | Now weight 1: alone it gives `generic`; with `text.job-offer` or a payment request it selects `job-bait` |
| `ui-presentation` REQ-UI-03 (explanation key for every analyzer id) | Applies to the two new ids (REQ-UI-45, 46) |
| `ui-presentation` PBT-70 (dictionary parity and ids) | Covers the two new ids; no change in wording |

Not modified: REQ-TXT-02 to 15, REQ-PIPE-01 to 42, REQ-UI-01 to 44, all
`url-analyzer`, `semantic-analyzer`, `core-engine`, `analyze-api` and
`client-ingest` requirements.

### Tests

Measured: with the planned configuration and no test edits, five tests fail.

| File | Test | Change |
|---|---|---|
| `src/analyzers/text-analyzer.config.test.ts` | "contains exactly the 8 expected ids" | Expect 10 ids; add the two new ids to `EXPECTED_IDS`; rename to "10" |
| `src/analyzers/text-analyzer.test.ts` | "covers all 8 groups" | Expect 10 |
| `src/pipeline/monster.test.ts` | "breaks ties by MONSTER_ORDER", third case (`text.off-platform` + `text.threat` expected `job-bait`) | `text.off-platform` + `text.threat` now gives `authority` (3) over `job-bait` (1). Replace that case with `text.off-platform` + `text.payment-request`: `job-bait` 2 vs `authority` 2, still won by `MONSTER_ORDER`. Update the comment. Add one case: `text.job-offer` alone gives `job-bait` |
| `src/ui/i18n/signal-ids.test.ts` | "equal the analyzer configs plus the url ids" and "includes every id used in monster weights" | Pass once `KNOWN_SIGNAL_IDS` has the two ids (REQ-UI-45); no edit to the test itself |
| `src/ui/i18n/dictionary.property.test.ts`, `dictionary.test.ts` | key parity and sentence length | Pass once both dictionaries have the two keys; no edit |

Unchanged and still passing (measured): `pipeline.test.ts`,
`pipeline.property.test.ts` (PBT-30 monotonicity), `text-analyzer.property.test.ts`
(PBT-13, PBT-15), `combine*.test.ts`, `messages.test.ts`, `config.test.ts`,
`result-view.test.ts` (uses "Enter your OTP", still matched).

## Property-Based Testing Requirements

Continues after PBT-74. `numRuns >= 100`. All use `createPipeline({ llmClient: null })` or `TextAnalyzer` directly. Never the network.

| ID | Property | Generator hint |
|---|---|---|
| **PBT-75** | For every group in `TEXT_PATTERNS` (including the two new ones), a text built from any subset of its phrases and filler gives at most one signal of that id, and its `evidence` is at most `MAX_EVIDENCE_CHARS` | `fc.subarray` of the group's phrases joined with `fc.string()` filler |
| **PBT-76** | Appending an unrelated benign sentence to any text never lowers `riskScore` (extends PBT-30 to the new phrases) | Texts from `EVAL_SAMPLES` and from all new phrases; benign sentences from the Benign_Samples |
| **PBT-77** | For every phrase added by this spec, the signal ids are the same when the text is upper-cased, lower-cased or stripped of diacritics (extends PBT-13) | New phrases embedded in `fc.string()` filler |
| **PBT-78** | A Vietnamese phrase written without diacritics and with `đ` replaced by `d` gives the same signal ids as the accented phrase | Vietnamese phrases of the new and changed groups |
| **PBT-79** | Every id in `KNOWN_SIGNAL_IDS` has `signal.<id>.explain` in both dictionaries and every id emitted by `TEXT_PATTERNS` is in `KNOWN_SIGNAL_IDS` (existing coverage test stays green) | Exhaustive over ids |
| **PBT-80** | For every Benign_Sample, appending one of the OTP-prohibition sentences ("Do not share your OTP", "Never share this code", "Không cung cấp mã OTP") never produces `text.otp-request` | `fc.constantFrom` over Benign_Samples and prohibition sentences |

### Example-based tests

- The four observed messages from the problem statement give the expected monster and level (they are in the Eval_Set).
- Each Scam_Sample and Benign_Sample passes REQ-PIPE-46 (one test per sample, id in the test name).
- "It will ship in 24 hours" gives no signals; "Your account will be locked in 24 hours" gives `text.urgency`.
- "Do not share your OTP with anyone" gives no `text.otp-request`; "reply with the OTP" gives it.
- Coverage test for the Eval_Set counts (REQ-PIPE-45) and the `.example` rule (REQ-PIPE-44).

## Out of Scope

UI components, the API, the LLM layer, `url-analyzer.config.ts`, new monsters,
changes to `Signal`, `Aggregator` or `Analyzer` contracts, a negation-aware
matcher (see design, "Known limits"), a held-out validation set.

## Non-Functional Requirements

- **NFR-RT-01** The Eval_Set contains no real user data, and the temporary diagnosis script is not committed.
- **NFR-RT-02** The full `vitest run` passes after the change; the only edited existing tests are the three in the table above.
