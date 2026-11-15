# Design Document

## Overview

Configuration change plus one logic change: `selectMonster` in
`src/pipeline/monster.ts` gets an overlap-group gate at level `suspicious`
(REQ-PIPE-67, option A, see "Decision: gate `selectMonster` by overlap group").
Everything else is configuration and tests. Verified against the code:

- `aggregate` is noisy-or. Score 1 to 49 is `suspicious`, 50 to 79 `high`, 80 to
  100 `critical` (`src/core/aggregator.ts`). A lone signal of weight 0.5 or more
  is therefore `high`, and 0.8 or more is `critical`. A lone signal of weight
  0.49 or less stays `suspicious`.
- `applyRules` only raises. A rule fires when every `allOf` group has a match
  among the unreduced signals; `MIN_SCORE_BY_LEVEL` gives the floor (50 high,
  80 critical).
- `selectMonster` sums `weights[id]` over distinct signal ids, takes the
  highest total at or above `MONSTER_THRESHOLD` (2), and breaks ties with
  `MONSTER_ORDER`. Before the gate it did not look at the level, so a lone
  `text.otp-request` (bank 3) gave `bank` at level `suspicious`. After the gate
  the sum is the same, but at `suspicious` a specific monster also needs two
  overlap groups.
- Phrases are contiguous, boundary-aware and normalized. There is no wildcard
  and no negation, so "context" is expressed as a longer phrase (a verb and an
  object).

Approach: every Ambiguous_Group gets a weight at or below 0.45, so one signal
alone is `suspicious`. Bare phrases are removed or lengthened so ordinary
messages do not fire at all. Recall comes from combination rules. Every
Ambiguous_Group monster weight is 1, so a lone signal gives `generic`.

## Files

- Changed config: `src/analyzers/text-analyzer.config.ts`,
  `src/analyzers/semantic-analyzer.config.ts` (amendment),
  `src/pipeline/monsters.config.ts`, `src/pipeline/rules.config.ts`.
- Changed logic: `src/pipeline/monster.ts` (`selectMonster` only, REQ-PIPE-67).
- Changed samples: `src/pipeline/eval/samples.ts`.
- Changed tests: see requirements, "Tests" (includes `pipeline/monster.test.ts`).
  New tests: `text-analyzer.v3.test.ts`, `text-analyzer.v3.property.test.ts`,
  `pipeline/precision.property.test.ts`, `pipeline/combine.v3.test.ts`,
  `pipeline/semantic-monster.test.ts`, `pipeline/monster.gate.property.test.ts`.
- Changed documentation: `README.md` (repo root, "Known limits", NFR-RT-05).
- Read, not changed: `overlap.config.ts` (imported read-only by `monster.ts`),
  `messages.config.ts`, `pipeline.config.ts`, `url-analyzer.config.ts`,
  `reduce.ts`, `combine.ts`, `src/core/`.

## Diagnosis (before)

Method: a temporary vitest file (git-ignored `tmp-*.test.ts`, deleted) ran each
message through `createPipeline({ llmClient: null })` and printed level, monster,
fired signals with weights and each monster's total. Totals are
bank/prize/job-bait/authority over distinct signal ids. The measured result
equals the observations in the request for messages 1 to 16.

Current weights of the groups (text groups; `url.credential-keywords` is 0.45):

| Group | Weight before | Weight after |
|---|---|---|
| `text.otp-request` | 0.85 | 0.45 |
| `text.sensitive-data-request` | 0.8 | 0.8 (unchanged) |
| `text.payment-request` | 0.75 | 0.4 |
| `text.threat` | 0.7 | 0.4 |
| `text.prize-reward` | 0.6 | 0.6 (unchanged) |
| `text.authority-impersonation` | 0.6 | 0.35 |
| `text.urgency` | 0.5 | 0.3 |
| `text.off-platform` | 0.5 | 0.4 |
| `text.job-offer` | 0.45 | 0.35 |
| `text.financial-institution` | 0.2 | 0.2 (unchanged) |

Per message (before). Id is `b3-ben-NN`.

| # | Level, monster (score) | Fired signals (weight), matching phrase | Totals b/p/j/a |
|---|---|---|---|
| 01 | high, generic (75) | payment-request 0.75: `registration fee` | 0/1/1/1 |
| 02 | high, generic (75) | payment-request 0.75: `processing fee` | 0/1/1/1 |
| 03 | high, generic (75) | payment-request 0.75: `activation fee` | 0/1/1/1 |
| 04 | critical, generic (88) | payment-request 0.75: `pay immediately`; urgency 0.5: `immediately` | 0/1/1/1 |
| 05 | high, generic (50) | urgency 0.5: `within 1 hour` | 0/0/0/0 |
| 06 | high, generic (50) | urgency 0.5: `within an hour` | 0/0/0/0 |
| 07 | high, generic (50) | urgency 0.5: `trong 24h` | 0/0/0/0 |
| 08 | high, generic (75) | payment-request 0.75: `đặt cọc` | 0/1/1/1 |
| 09 | suspicious, job-bait (45) | job-offer 0.45: `easy tasks` | 0/0/3/0 |
| 10 | suspicious, generic (20) | financial-institution 0.2: `digital wallet` | 1/0/0/0 |
| 11 | suspicious, generic (20) | financial-institution 0.2: `ví điện tử` | 1/0/0/0 |
| 12 | high, generic (75) | payment-request 0.75: `gift cards` | 0/1/1/1 |
| 13 | critical, bank (85) | otp-request 0.85: `your password` | 3/0/0/0 |
| 14 | critical, bank (85) | otp-request 0.85: `mã pin` | 3/0/0/0 |
| 15 | critical, bank (85) | otp-request 0.85: `enter your pin` | 3/0/0/0 |
| 16 | high, authority (70) | threat 0.7: `unpaid taxes` | 1/0/0/2 |
| 17 | high, generic (50) | urgency 0.5: `final notice` | 0/0/0/0 |
| 18 | high, generic (50) | urgency 0.5: `within 24 hours` | 0/0/0/0 |
| 19 | no_signals, null (0) | none | 0/0/0/0 |
| 20 | suspicious, generic (20) | financial-institution 0.2: `unusual sign-in` | 1/0/0/0 |

Root causes:

1. Payment, urgency, otp-request and threat have weights of 0.5 to 0.85, so one
   fired signal is `high` or `critical` (messages 1 to 8, 12 to 18).
2. The phrases are bare: a fee noun without a pay verb, a deadline without an
   action, `your password` and `mã pin` without a request verb, `unpaid taxes`
   without a direct address, `easy tasks` without a pay promise.
3. Message 4 fires two groups from one phrase pair (`pay immediately` in
   payment, `immediately` in urgency), and 0.75 + 0.5 is `critical`.
4. Monster weights make a lone signal select a monster: `text.otp-request`
   (bank 3), `text.job-offer` (job-bait 3), `text.threat` (authority 2). So a
   lone `suspicious` or `high` result shows `bank`, `job-bait` or `authority`
   (messages 9, 13 to 16).
5. Message 19 is already clean and is a regression guard: a bare "pay the
   invoice" phrase must not be added.

## Changes

### `text-analyzer.config.ts`

Every phrase below was run against the Eval_Set in a throw-away prototype
(reverted; the working tree is unchanged by this spec). Phrases are lower-case;
the analyzer normalizes them.

**`text.otp-request`** weight 0.85 to **0.45**. Remove en `enter your pin`,
`your password`; vi `mã pin`, `mật khẩu của bạn`, `cung cấp mật khẩu`. Add en
`send me your password`, `send us your password`, `tell me your password`,
`send me your pin`, `send us your pin`, `tell me your pin`; vi
`vui lòng cung cấp mật khẩu`, `hãy cung cấp mật khẩu`, `vui lòng gửi mã pin`,
`vui lòng cung cấp mã pin`, `hãy gửi mã pin`. Keep `confirm your pin` and every
OTP and code request phrase; `send me the code` stays first in the English list.

**`text.urgency`** 0.5 to **0.3**. Remove en `within 24 hours`, `within 48
hours`, `within 72 hours`, `within 12 hours`, `within 2 hours`, `within 1 hour`,
`within an hour`; vi `trong vòng 24 giờ`, `trong 24 giờ`, `trong 24h`,
`trong 48h`, `trong 48 giờ`, `trong 1 giờ`, `trong vòng 1 giờ`, `trong vòng 2 giờ`.
Add en `reply within 24 hours`, `respond within 24 hours`, `pay within 24 hours`,
`pay within 48 hours`, `verify within 24 hours`, `confirm within 24 hours`; vi
`bị khóa trong 24h`, `bị khóa trong 24 giờ`, `bị khóa trong 48h`,
`bị khóa trong 48 giờ`, `bị tạm ngưng trong 24h`, `bị tạm ngưng trong 24 giờ`.
Keep `act now`, `immediately`, `urgent`, `last warning`, `final notice`,
`as soon as possible`, `expires today`, the `locked / suspended / blocked /
closed in 24 or 48 hours` forms and the Vietnamese non-deadline phrases. These
bare words stay: alone they are `suspicious` and `generic` (messages 4 and 17).

**`text.threat`** 0.7 to **0.4**. Remove `unpaid taxes`, `unpaid tax`. Add
`card has been suspended`, `your unpaid taxes`, `you have unpaid taxes`.

**`text.payment-request`** 0.75 to **0.4**. Remove en `pay immediately`,
`registration fee`, `activation fee`, `processing fee`, `gift cards`; vi
`phí kích hoạt`, `phí đăng ký tài khoản`, `đặt cọc`, `phí xử lý`,
`thẻ quà tặng`. Add en `pay a processing fee`, `pay the processing fee`,
`pay an activation fee`, `pay the activation fee`, `buy gift cards`,
`buy a gift card`, `pay with gift cards`, `pay with a gift card`,
`pay by gift card`, `pay by gift cards`, `send gift cards`; vi
`đóng phí kích hoạt`, `nộp phí kích hoạt`, `đóng phí đăng ký tài khoản`,
`đóng phí xử lý`, `nộp phí xử lý`, `mua thẻ quà tặng`, `gửi thẻ quà tặng`.
Keep every `pay a/the ... fee or deposit` form, `pay a deposit`, `pay the fee`,
`nộp phí`, `wire transfer`, the `transfer / send money to a safe account or
now, today, immediately` forms, `buy gift card`, `bitcoin payment`.

**`text.authority-impersonation`** 0.6 to **0.35**, phrases unchanged.
**`text.off-platform`** 0.5 to **0.4**, phrases unchanged.

**`text.job-offer`** 0.45 to **0.35**. Remove `easy tasks`, `simple tasks`,
`nhiệm vụ đơn giản`. Add `with easy tasks`, `complete easy tasks`,
`complete simple tasks`, `làm nhiệm vụ đơn giản`,
`hoàn thành nhiệm vụ đơn giản`. Keep `no experience needed`, `hiring online`
and the others.

**`text.financial-institution`** (0.2): unchanged. Messages 10, 11 and 20 stay
`suspicious` with `generic` (accepted by the request for 20; same for 10 and 11).

Decision, otp-request: the request asks both for a weight at which one signal
is at most `suspicious` and for strong request phrases to stay strong. A single
group cannot be both. The strong phrases stay in the group (not removed), and
their strength comes from the `otp-with-context` rule. A lone "send me the
code" is `suspicious` and `generic`; the AI layer owns that recall.

### `monsters.config.ts`

| Monster | Weights after (changes in bold) |
|---|---|
| bank | otp-request **1** (was 3), sensitive-data-request 2, brand-lookalike 2, credential-keywords 1, impersonation-tone 1, threat 1, financial-institution 1; **authority-impersonation removed** (was 1) |
| prize | prize-reward 3, too-good-to-be-true **1** (was 2, amendment REQ-PIPE-66), payment-request 1 |
| job-bait | relationship-or-job-bait **1** (was 3, amendment), job-offer **1** (was 3), off-platform 1, isolation-secrecy 1, too-good-to-be-true 1, payment-request 1 |
| authority | authority-impersonation **1** (was 2), threat **1** (was 2), pressure-escalation **1** (added, amendment), off-platform 1, impersonation-tone 1, payment-request 1 |

`MONSTER_THRESHOLD` stays 2 and `MONSTER_ORDER` stays. Reasons:

- Every Ambiguous_Group signal now weighs at most 1 for each monster, so one
  signal never reaches the threshold and the result is `generic`. This is the
  monster half of "a single weak signal is shown with the generic monster".
  `text.prize-reward` (3) and `text.sensitive-data-request` (2) are not
  Ambiguous_Groups and keep selecting `prize` and `bank`.
- `text.authority-impersonation` is removed from `bank` so that police or tax
  wording with a threat (auth-en-2: threat + impersonation) is `authority` 2
  against `bank` 1, not a 2 to 2 tie that `MONSTER_ORDER` would give to `bank`.
  The side effect is good: bank-en-5 ends `bank` 3 against `authority` 2 instead
  of the tie 4 to 4 recorded in v1.
- Raising `MONSTER_THRESHOLD` to 3 would also work, but it changes v1
  REQ-PIPE-50 and a lone `text.sensitive-data-request` (2) would lose its
  `bank` monster. Weights alone reach the goal, so the threshold stays.

### `rules.config.ts`

Five rules added after the two existing ones (`otp-urgent-impersonation`,
`sensitive-data-with-link` stay).

| Rule id | allOf | minLevel | Needed by samples |
|---|---|---|---|
| `otp-with-context` | otp-request; any of financial-institution, urgency, threat, `url.*` | critical | bank-en-3 (aggregate gives 67) |
| `payment-with-pressure` | payment-request; any of off-platform, urgency, threat, authority-impersonation, prize-reward | critical | prize-en-2, auth-vi-1, auth-en-3, job-vi-1 |
| `authority-with-threat` | authority-impersonation; threat | critical | auth-en-2, auth-en-3 |
| `job-offer-with-payment` | job-offer; payment-request | critical | none (job-vi-1 is also covered by `payment-with-pressure`); kept as the classic job-scam combination |
| `job-offer-off-platform` | job-offer; off-platform | high | none (aggregate gives 61); kept so `high` does not rest on two weights summing above 0.31 |

The two rules marked "none" are not required by any sample. They follow the
principle (a combination rule, not weights, carries the level) and were
included in the measured prototype, so the measured numbers hold with them.

Why these combinations do not hurt precision: each needs two different
Ambiguous_Groups, and after tightening none of the twenty Batch_3 messages
fires two groups (measured above: at most one signal each).

### Not changed, and why

- `overlap.config.ts`: `text.urgency` and `semantic.pressure-escalation` still
  overlap; no new id.
- `messages.config.ts`: actions are keyed by monster and signal id; no id
  changed.
- Algorithms: `aggregate`, `applyRules`, `reduceForScoring` and the analyzers
  are unchanged. The only logic change is the `selectMonster` gate (amendment).

## Evaluation set

`samples.ts` gets twenty-two entries after the `b2-` ones, one per request message (21 and 22 come from the amendment and are no longer held-out).
All have `expectedMonster: null`, `minLevel: "no_signals"`; the Vietnamese ones
are 07, 08, 11, 14. Texts are copied exactly from the request:

| id | text |
|---|---|
| b3-ben-01 | The registration fee for Saturday's workshop is $20. You can pay at the door. |
| b3-ben-02 | Heads up: card payments include a small processing fee of 2%, cash has no extra charge. |
| b3-ben-03 | There is a one-time SIM activation fee on your new plan, shown on the order page. |
| b3-ben-04 | Parking tip: pay immediately at the machine and keep the ticket on your dashboard. |
| b3-ben-05 | Traffic is bad, I will be there within 1 hour. |
| b3-ben-06 | I'll send you the notes within an hour. |
| b3-ben-07 | Đơn hàng của bạn sẽ được giao trong 24h, bạn nhớ có mặt ở nhà nhé. |
| b3-ben-08 | Mình đã đặt cọc tiền thuê nhà cho tháng sau rồi nhé. |
| b3-ben-09 | Weekend plan: a few easy tasks around the house, then a movie. |
| b3-ben-10 | You can add your card to your digital wallet from the Settings menu. |
| b3-ben-11 | Bạn có thể nạp tiền điện thoại bằng ví điện tử trong ứng dụng. |
| b3-ben-12 | We sell gift cards in the shop if you need a present idea. |
| b3-ben-13 | You can change your password in Settings anytime. |
| b3-ben-14 | Mình quên mã PIN thẻ rồi, mai đi ngân hàng đổi. |
| b3-ben-15 | At the ATM, insert your card and enter your PIN. |
| b3-ben-16 | I am finishing my tax return and still have unpaid taxes from last year to sort out with my accountant. |
| b3-ben-17 | Final notice: your gym membership expires on Friday. Renew online to keep your access. |
| b3-ben-18 | Reminder: your parcel will be delivered within 24 hours. No action needed. |
| b3-ben-19 | Please pay the invoice by the end of the month. Details are on the portal. |
| b3-ben-20 | We noticed an unusual sign-in to your account from a new device. If it was you, no action is needed. |
| b3-ben-21 | Thanks for applying! We would like to invite you to a video interview on Tuesday. Please reply to confirm a time that works for you. |
| b3-ben-22 | Call me as soon as you see this, it is urgent. Dad's flight got moved and we need to decide tonight. |

They satisfy the `samples.test.ts` rules (no real brand, no `\d{8,}` run, no
URL). Benign counts become 49 (English 37, Vietnamese 12). Not
asserted to be Clean (unlike `b2-`), because 04, 10, 11, 17, 20 and 22 are
expected at `suspicious`.

## Before and after

Evaluation set: 26 scam samples (21 tuning + 5 `b2-`) and 49 benign (22 + 5 + 22).

Note: the "after" numbers in this section and in the tables below were re-measured on the final configuration (after task 4.4) in this session (task 7.1); they matched the prototype values.

| Metric | Before (measured) | After (prototype, measured) |
|---|---|---|
| Benign samples at `high` or `critical` | 16 of 49 (12 high, 4 critical), all in Batch_3 (message 22 is `high` before) | 0 of 49 |
| Benign samples with a specific monster | 5 (09 job-bait; 13, 14, 15 bank; 16 authority) | 0 |
| Benign samples at `suspicious` | 4 (09, 10, 11, 20) | 6 (04, 10, 11, 17, 20, 22), all `generic` |
| Benign samples at `no_signals` | 29 | 43 |
| Scam samples at expected monster and at or above `minLevel` | 26 of 26 | 26 of 26 |
| Accepted recall loss | 0 | 0 |

Batch_3 per message, after (all within Benign_Pass):

| # | After: level, monster (score) | Fired signals |
|---|---|---|
| 01, 02, 03 | no_signals, null (0) | none |
| 04 | suspicious, generic (30) | urgency `immediately` |
| 05, 06, 07, 08, 09 | no_signals, null (0) | none |
| 10, 11 | suspicious, generic (20) | financial-institution |
| 12, 13, 14, 15, 16 | no_signals, null (0) | none |
| 17 | suspicious, generic (30) | urgency `final notice` |
| 18, 19 | no_signals, null (0) | none |
| 20 | suspicious, generic (20) | financial-institution `unusual sign-in` |
| 21 | no_signals, null (0) | none (before: same) |
| 22 | suspicious, generic (30) | urgency `as soon as possible`, `urgent` (before: high, generic, 50) |

Scam samples, after (level, monster, score). Totals are b/p/j/a. "Rule" marks a
sample whose `minLevel` is reached only through a combination rule.

| Sample | Before | After | Fired signals after | Totals | Rule needed |
|---|---|---|---|---|---|
| bank-en-1 | critical, bank, 99 | critical, bank, 87 | otp-request, credential-keywords, threat, urgency | 3/0/0/1 | no |
| bank-en-2 | critical, bank, 91 | critical, bank, 91 | sensitive-data-request, credential-keywords, financial-institution | 4/0/0/0 | no |
| bank-en-3 | critical, bank, 85 | critical, bank, 80 | otp-request, threat (`card has been suspended`) | 2/0/0/1 | `otp-with-context` |
| bank-en-4 | critical, bank, 98 | critical, bank, 90 | sensitive-data-request, threat, financial-institution | 4/0/0/1 | no |
| bank-en-5 | critical, bank, 95 | critical, bank, 83 | credential-keywords, threat, authority-impersonation, financial-institution | 3/0/0/2 | no |
| bank-vi-1 | critical, bank, 96 | critical, bank, 80 | otp-request, credential-keywords, urgency (`bị khóa trong 24h`) | 2/0/0/0 | `otp-urgent-impersonation` (existing) |
| prize-en-1 | critical, prize, 95 | critical, prize, 80 | prize-reward, payment-request | 0/4/1/1 | no (min high) |
| prize-en-2 | critical, prize, 90 | critical, prize, 80 | prize-reward, payment-request | 0/4/1/1 | `payment-with-pressure` |
| prize-en-3 | critical, prize, 92 | critical, prize, 92 | sensitive-data-request, prize-reward | 2/3/0/0 | no |
| prize-en-4 | high, prize, 60 | high, prize, 60 | prize-reward | 0/3/0/0 | no |
| prize-vi-1 | critical, prize, 95 | critical, prize, 80 | prize-reward, payment-request | 0/4/1/1 | no (min high) |
| job-en-1 | critical, job-bait, 93 | critical, job-bait, 80 | payment-request, off-platform, job-offer | 0/1/3/2 | no (min high) |
| job-en-2 | high, job-bait, 73 | high, job-bait, 61 | off-platform, job-offer | 0/0/2/1 | no |
| job-en-3 | critical, job-bait, 93 | critical, job-bait, 80 | payment-request, off-platform | 0/1/2/2 | no (min high) |
| job-en-4 | critical, job-bait, 93 | critical, job-bait, 80 | payment-request, off-platform, job-offer | 0/1/3/2 | no (min high) |
| job-vi-1 | critical, job-bait, 93 | critical, job-bait, 80 | payment-request, off-platform, job-offer | 0/1/3/2 | `payment-with-pressure` |
| auth-en-1 | critical, authority, 99 | critical, authority, 86 | threat, payment-request, off-platform, authority-impersonation | 1/1/2/4 | no |
| auth-en-2 | critical, authority, 88 | critical, authority, 80 | threat, authority-impersonation | 1/0/0/2 | `authority-with-threat` |
| auth-en-3 | critical, authority, 97 | critical, authority, 80 | threat, payment-request, authority-impersonation | 1/1/1/3 | `authority-with-threat` |
| auth-en-4 | critical, authority, 98 | critical, authority, 85 | threat, payment-request, off-platform, urgency | 1/1/2/3 | no |
| auth-vi-1 | critical, authority, 90 | critical, authority, 80 | payment-request, authority-impersonation | 0/1/1/2 | `payment-with-pressure` |
| b2-bank-en-1 | critical, bank, 93 | critical, bank, 80 | otp-request, credential-keywords, financial-institution | 3/0/0/0 | no (min high) |
| b2-job-en-1 | critical, job-bait, 93 | high, job-bait, 61 | off-platform, job-offer | 0/0/2/1 | no |
| b2-auth-en-1 | critical, authority, 99 | critical, authority, 84 | threat, off-platform, authority-impersonation, urgency | 1/0/1/3 | no |
| b2-prize-en-1 | critical, prize, 90 | high, prize, 60 | prize-reward | 0/3/0/0 | no |
| b2-auth-vi-1 | critical, authority, 99 | critical, authority, 86 | threat, payment-request, off-platform, authority-impersonation | 1/1/2/4 | no |

Twenty-three of the 26 scam scores are lower than before (only bank-en-2,
prize-en-3 and prize-en-4 are equal). b2-job-en-1 and b2-prize-en-1 drop from
`critical` to `high`; both have a `minLevel` of `high`. No sample loses its
monster. The lower scores are the intended effect of the lower weights.

Existing suite with the prototype configuration and no test edits: 10 failures
in 5 files, all listed in the requirements; the other 1269 tests pass. The
prototype also passed the planned PBT-81 to PBT-83 logic (single-signal level,
single-signal monster, monotonicity over all 73 samples).

PBT-81 finding: the phrase `transfer money immediately` fires payment and
urgency together and so reaches `critical` through `payment-with-pressure`.
That is a request phrase with a pressure word and the result is intended, so
the phrase-level part of PBT-81 only covers phrases that fire exactly one
signal.

## Amendment: monster gating and semantic signals

### Diagnosis (before)

Measured with `FakeLlmClient` returning one semantic signal on message 21 (a
legitimate interview invitation, clean in rules-only mode), original
configuration (temporary test, deleted):

| Semantic signal, severity returned | Level, monster (score) |
|---|---|
| relationship-or-job-bait 0.3 | suspicious, **job-bait** (30) |
| relationship-or-job-bait 0.6 | **high**, **job-bait** (60) |
| pressure-escalation 0.3 | suspicious, generic (30) |
| pressure-escalation 0.5 | **high**, generic (50) |
| too-good-to-be-true 0.3 | suspicious, **prize** (30) |
| impersonation-tone 0.7 | **high**, generic (70) |
| isolation-secrecy 0.7 | **high**, generic (70) |

Root causes:

1. Monster weights let one semantic signal reach the threshold:
   `relationship-or-job-bait` is job-bait 3 and `too-good-to-be-true` is prize 2.
2. `maxSeverity` is 0.5 to 0.7 and `SEVERITY_CAP` 0.8, so one semantic signal
   reaches `high` on its own, the same defect as the rule groups.
3. `selectMonster` ignores the level (it only returns `null` for
   `no_signals`) and ignores overlap groups.

### Configuration changes

- `semantic-analyzer.config.ts`: `SEVERITY_CAP` 0.45 and every `maxSeverity`
  0.45. One semantic signal scores at most 45.
- `monsters.config.ts`: `semantic.relationship-or-job-bait` 3 to 1 (job-bait),
  `semantic.too-good-to-be-true` 2 to 1 (prize), `semantic.pressure-escalation`
  added to `authority` with weight 1. The last one is a choice: that id is in no
  monster today, so a "specific monster at the right level" test for it needs a
  family. Pressure with a threat is the authority pattern (1 + 1 = 2, different
  overlap groups). Drop the line and the pressure test only asserts the level.

### What configuration covers (measured on the prototype)

- Message 21 with one semantic signal, severity 0.3, 0.6 and 1, for
  `relationship-or-job-bait` and `pressure-escalation`: `suspicious`, `generic`
  (score 30 or 45).
- `relationship-or-job-bait` + "Message us on Telegram" (`text.off-platform`):
  `high`, `job-bait`. `pressure-escalation` + "A court summons has been issued"
  (`text.threat`): `high`, `authority`.
- Single signal of every id in `KNOWN_SIGNAL_IDS` at its maximum severity: the
  monster is `generic` unless the level is `high` or `critical` (the only single
  signals with a monster weight of 2 or more are `text.sensitive-data-request`,
  `url.brand-lookalike` and `text.prize-reward`, all `high` or above).
- Rules-only: message 21 is `no_signals`; message 22 is `suspicious`, `generic`
  (before the v3 weights it was `high`).

### What configuration cannot express

The rule has two clauses.

- "Level is high or critical": `selectMonster` already receives `level`, but a
  config file has no field that reads it, and there is no per-monster minimum
  score because `selectMonster` does not receive the score. Not expressible.
  After the caps above the clause is only needed for the strong single signals,
  which already pass.
- "Two independent signals, from different overlap groups": monster totals sum
  weights over distinct ids, and two ids of one overlap group add up like two
  independent ones. Measured (prototype): "No experience needed. Interested in a
  job? We are hiring online." plus one `semantic.relationship-or-job-bait`
  gives `suspicious`, **`job-bait`**, from `text.job-offer` 1 and the semantic
  signal 1, which are one overlap group. The pairs affected are
  `text.job-offer` with `semantic.relationship-or-job-bait` (job-bait),
  `text.off-platform` with `semantic.isolation-secrecy` (job-bait), and
  `text.authority-impersonation` with `semantic.impersonation-tone`
  (authority). Weights cannot separate them from the cross-group pairs
  (`semantic.relationship-or-job-bait` with `text.off-platform` must select
  `job-bait`). Setting either twin to 0 would remove the rules-only monster for
  job-en-2 or the AI-only monster.

### Decision: gate `selectMonster` by overlap group (option A chosen, implemented)

The maintainer chose **option A**. Only `selectMonster` in
`src/pipeline/monster.ts` changed (no signature change, no config change,
`reduce.ts` untouched). It rebuilds the group lookup from `OVERLAP_GROUPS`
(read-only import).

Rule in plain words: at level `suspicious`, a specific monster is shown only if
the signals that carry a weight for that monster come from at least two
different overlap groups (a signal outside every group is its own group; two
signals of one group count once). Otherwise the monster is `generic`. At `high`
and `critical` nothing changed. The threshold (2), the tie-break order and the
`no_signals` result are unchanged.

Same-group pairs where both ids have a weight for the same monster, verified
against `overlap.config.ts` and `monsters.config.ts`. The check found four, not
three:

1. `text.authority-impersonation` with `semantic.impersonation-tone`: both
   weigh 1 for `authority`.
2. `text.off-platform` with `semantic.isolation-secrecy`: both weigh 1 for
   `job-bait`.
3. `text.job-offer` with `semantic.relationship-or-job-bait`: both weigh 1 for
   `job-bait`.
4. `text.prize-reward` (3) with `semantic.too-good-to-be-true` (1): both
   weigh for `prize`. Not in the earlier text. It matters little: at
   `suspicious` the gate makes a lone `text.prize-reward` generic too (any
   single group is generic). Prize-reward alone scores 60, so that case is
   `high` and keeps `prize`.

`text.urgency` with `semantic.pressure-escalation` is not a pair: `text.urgency`
is in no monster. Also at `suspicious`, a lone `text.sensitive-data-request`
(bank 2) now gives `generic`; it scores 80 so in practice it is `critical`.

Effect of the gate, measured with the final configuration (temporary test,
deleted). Each case is b3-ben-21 plus the text shown, with `FakeLlmClient`
returning one semantic signal at severity 0.45. "Old" is the pre-gate logic
(totals only), "new" is `selectMonster` as implemented. Totals are b/p/j/a.

| Case | Signals | Totals | Level (score) | Old monster | New monster |
|---|---|---|---|---|---|
| `text.job-offer` + `semantic.relationship-or-job-bait` (same group) | job-offer, relationship-or-job-bait | 0/0/2/0 | suspicious (45) | job-bait | **generic** |
| `text.off-platform` ("Message us on Telegram") + `semantic.isolation-secrecy` (same group) | off-platform, isolation-secrecy | 0/0/2/1 | suspicious (45) | job-bait | **generic** |
| `text.authority-impersonation` ("This is the tax office.") + `semantic.impersonation-tone` (same group) | authority-impersonation, impersonation-tone | 1/0/0/2 | suspicious (45) | authority | **generic** |
| `text.off-platform` + `semantic.relationship-or-job-bait` (different groups) | off-platform, relationship-or-job-bait | 0/0/2/1 | high (67) | job-bait | job-bait |
| `text.threat` ("A court summons has been issued") + `semantic.pressure-escalation` (different groups) | threat, pressure-escalation | 1/0/0/2 | high (67) | authority | authority |
| `semantic.relationship-or-job-bait` alone | relationship-or-job-bait | 0/0/1/0 | suspicious (45) | generic | generic |

The gate changes the result only for same-group pairs at `suspicious`. All 48
rules-only samples that are not `ben-`/`b2-ben-` (26 scam and 22 `b3-ben-`) have
the same level and monster with and without the gate (the six `suspicious`
`b3-ben-` results already had one signal each and were `generic`; the scam
samples are `high` or `critical`). The rules-only numbers in "Before and after"
were re-measured on the final configuration and match.

Changes in `src/pipeline/monster.test.ts` (one line per test). Determined by
reading `monster.ts` and the test file against `git diff`, and confirmed by a
run in task 4.4: `monster.test.ts` 10/10, `monster.gate.property.test.ts` 4/4,
`precision.property.test.ts` 5/5, `semantic-monster.test.ts` 16/16,
`eval.test.ts` 75/75, `pipeline.test.ts` 19/19. The gate itself broke no
existing test. Both tie-case comments were fixed (comment-only):

| Test | Change | Caused by |
|---|---|---|
| "breaks ties by MONSTER_ORDER", first case | Now `text.sensitive-data-request` + `semantic.too-good-to-be-true` at `high`, expected `bank` | Monster weights (REQ-PIPE-60/66), not the gate. Note: with `too-good-to-be-true` at prize 1, totals are bank 2, prize 1, job-bait 1, so `bank` wins on total and the case is no longer a tie. Comment fixed to "bank 2, prize 1, job-bait 1: bank wins on total" |
| "breaks ties by MONSTER_ORDER", second case | None. Comment "prize 3 vs job-bait 3" is stale (job-bait is now 1); result `prize` is unchanged | REQ-PIPE-66. Comment fixed to "prize 3 vs job-bait 1: prize wins on total" |
| "text.job-offer alone gives generic; with text.off-platform it gives job-bait" | Replaces "text.job-offer alone gives job-bait". Both assertions use `suspicious`; `job-offer` (group 4) and `off-platform` (group 3) are different groups, so the gate lets `job-bait` through | REQ-PIPE-60. The gate does not change the result |
| "a higher total beats an earlier monster in order" | Comment only (authority 1 + 1 against bank 1) | REQ-PIPE-60 |
| "two signals of one overlap group at suspicious give generic (REQ-PIPE-67)" | New test: `text.job-offer` + `semantic.relationship-or-job-bait` gives `generic` at `suspicious` and `job-bait` at `high` | The gate (option A) |

No existing test is expected to break because of the gate itself: every other
`suspicious` case in the file uses one signal id, or two signals of different
groups. If the run shows otherwise, record each such test here with its reason
before editing it.

Tests added:

- `monster.test.ts`: one example, a same-group pair gives `generic` at
  `suspicious` and `job-bait` at `high` (row above).
- `semantic-monster.test.ts`: one example, `semantic.relationship-or-job-bait`
  plus `text.job-offer` on b3-ben-21 gives `suspicious`, `generic`.
- `monster.gate.property.test.ts` (new): (a) same-group signals at
  `suspicious` give `generic`; (b) two cross-group signals that only one
  monster supports give that monster at `suspicious`; (c) at `high` and
  `critical` the result equals a copy of the old logic kept in the test.

## Semantic cap: levels with the real aggregate

Inputs read from the code: `aggregate` computes
`score = Math.round((1 - prod(1 - severity)) * 100)` and maps 1 to 49 to
`suspicious`, 50 to 79 to `high`, 80 to 100 to `critical`
(`src/core/aggregator.ts`). `reduceForScoring` keeps the strongest signal per
overlap group, then per id (`reduce.ts`). `semantic-analyzer.config.ts` now has
`SEVERITY_CAP` 0.45 and every `maxSeverity` 0.45. The three signals below are
in different groups of `overlap.config.ts`, so `reduceForScoring` does not merge
them:

| Signal | Overlap group (index) |
|---|---|
| `semantic.impersonation-tone` | 0 (with `text.authority-impersonation`) |
| `semantic.pressure-escalation` | 1 (with `text.urgency`) |
| `semantic.isolation-secrecy` | 3 (with `text.off-platform`) |

No rule signal is present (rules-only part of the message is clean, as in
`b3-ben-21`). Each signal at severity 0.45; computed with the aggregator formula
(Node, double precision):

| Distinct semantic signals | Arithmetic | Score (rounded) | Level |
|---|---|---|---|
| 1 | 1 - 0.55 = 0.45 | 45 | `suspicious` |
| 2 | 1 - 0.55² = 1 - 0.3025 = 0.6975 | 70 (69.75 rounds up) | `high` |
| 3 | 1 - 0.55³ = 1 - 0.166375 = 0.833625 | 83 (83.3625 rounds down) | `critical` |

In double precision the one-signal value is 44.99999999999999 before rounding;
`Math.round` gives 45. A test must compare the rounded `score`, which is 45.

Combination rules: every rule in `rules.config.ts` has `text.*` or `url.*` ids
in each `allOf` group, so no rule can fire on `semantic.*` signals alone.
`applyRules` therefore does not change these levels.

Effect on AI-layer recall, against the old values (`git show HEAD:src/analyzers/semantic-analyzer.config.ts`:
`SEVERITY_CAP` 0.8; `maxSeverity` impersonation-tone 0.7, isolation-secrecy 0.7,
pressure-escalation 0.5, emotional-manipulation 0.6, too-good-to-be-true 0.6,
relationship-or-job-bait 0.6). Old values assume the model returns the maximum:

| Signals at their maximum | Old score, level | New score, level |
|---|---|---|
| 1: impersonation-tone | 70, `high` | 45, `suspicious` |
| 1: pressure-escalation | 50, `high` | 45, `suspicious` |
| 1: isolation-secrecy | 70, `high` | 45, `suspicious` |
| 2: impersonation-tone + pressure-escalation | 85, `critical` | 70, `high` |
| 2: impersonation-tone + isolation-secrecy | 91, `critical` | 70, `high` |
| 2: pressure-escalation + isolation-secrecy | 85, `critical` | 70, `high` |
| 3: all three | 96 (95.5 rounds up), `critical` | 83, `critical` |

Result: two distinct semantic signals at the cap give 70, which is `high`, so
they do not fall below `high`. No fix is needed and none is proposed; no
maintainer decision is open on this point. The AI layer loses recall in two
ways, both intended by REQ-PIPE-65: one semantic signal that was `high` is now
`suspicious`, and two signals that were `critical` (85 or 91) are now `high`
(70). Three signals stay `critical` (96 to 83).

Tests (task 4.3, `semantic-monster.test.ts`, `FakeLlmClient`, base message
`b3-ben-21`): (a) the three signals above at 0.45 give score 83 and `critical`;
(b) one signal at 0.45 gives score 45 and `suspicious`, below the `high`
threshold of 50. REQ-PIPE-70 requires both.

## Removed test inputs

Task 3.3 removed three inputs from the test "strong payment phrases stay strong
(REQ-TXT-23)" in `src/analyzers/text-analyzer.v2.test.ts` (the other inputs stay:
`Pay the activation fee`, `đóng phí kích hoạt` and the transfer phrases still
match). Compared with `git show HEAD:src/analyzers/text-analyzer.config.ts` and
the working-tree version of the file. The "Sample" column is the scam sample in
`src/pipeline/eval/samples.ts` whose text contains the same wording; levels are
from "Before and after".

| Removed input | Phrase it exercised (HEAD) | Why it no longer holds | Scam sample with this wording | Before, after |
|---|---|---|---|---|
| `pay immediately by gift cards` | `pay immediately` and `gift cards` (both bare, in `text.payment-request` at HEAD) | Both phrases removed by REQ-TXT-27: `pay immediately` fired on benign `b3-ben-04`, `gift cards` on `b3-ben-12`. The remaining phrases `pay by gift cards` and `pay with gift cards` are not substrings of "pay immediately by gift cards", so `text.payment-request` does not fire. `immediately` still fires `text.urgency`, so the input is not clean: it gives urgency only (suspicious, generic) | `b2-auth-en-1` ("... unless you pay immediately by gift cards.") | critical, authority, 99 to critical, authority, 84 (payment-request lost, threat, off-platform, authority-impersonation and urgency remain) |
| `A one-time registration fee of $20` | `registration fee` (bare) | Removed by REQ-TXT-27: fired on benign `b3-ben-01` (workshop registration fee). Only `pay a registration fee` and `pay the registration fee` stay | `b2-job-en-1` ("Just a one-time registration fee of $20 ... WhatsApp") | critical, job-bait, 93 to **high**, job-bait, 61 (payment-request lost; `off-platform` + `job-offer` remain; `minLevel` is `high`) |
| `only a small processing fee required` | `processing fee` (bare) | Removed by REQ-TXT-27: fired on benign `b3-ben-02`. Only `pay a/the processing fee` stays | `b2-prize-en-1` ("... only a small processing fee required. Reply YES.") | critical, prize, 90 to **high**, prize, 60 (payment-request lost; `prize-reward` remains; `minLevel` is `high`) |

Honest reading of the table:

- All three removed inputs correspond to a scam sample that lost its
  `text.payment-request` signal. This is real recall loss in score, not only a
  test edit. Two of the three samples (`b2-job-en-1`, `b2-prize-en-1`) fall one
  level, from `critical` to `high`. `b2-auth-en-1` stays `critical` (99 to 84).
  No sample falls below its `minLevel` (`high`) and none loses its monster, so
  there is no Accepted_Recall_Loss entry by the REQ-PIPE-63 definition. The
  before and after table already shows these scores; the `critical` to `high`
  drop of the two samples is caused by the removed phrases.
- "No scam sample lost level" in this spec means "none fell below its
  `minLevel`". Two samples did lose one level and still meet `minLevel`.
- Why accepted: each removed phrase is the bare form of a fee or gift-card
  mention that appears in ordinary benign messages (`b3-ben-01`, `02`, `03`,
  `04`, `12`). A bare fee noun cannot be told apart from a scam by the
  matcher (no wildcard, no negation).
- The three inputs are covered in `text-analyzer.v3.test.ts` as inputs that no
  longer give `text.payment-request`.

## Manual check (maintainer, real LLM)

Performed by the maintainer, not by an agent, and not in CI. Tests never call
the network, so the lowered semantic cap (REQ-PIPE-65) and the other changes
are checked here against the real model once.

Procedure: with `LLM_API_KEY` and `LLM_BASE_URL` set in `.env.local`, start the
app (`npm run dev`) and submit each of the six scam messages that the
maintainer saw earlier in the real-model runs (not `FakeLlmClient`, not
`llmClient: null`). Paste nothing into this file except the table below. Do not
copy full message text if it contains personal data; use the id or a short
description.

Acceptance criterion: for each of the six messages the level is at least
`high` (`high` or `critical`). A message that shows `suspicious` or lower is a
failed check: record it and report it; do not change weights because of this
table without a new decision.

| # | Message id or description | Level | Monster | Fired signals | Pass (level at least `high`) |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |

## Accepted recall loss

None. All 26 scam samples keep their expected level (at or above `minLevel`)
and monster. Two samples drop from `critical` to `high` (see "Removed test
inputs"); that is not a recall loss by the REQ-PIPE-63 definition. If the
implementation cannot confirm this, a sample may be lowered to `suspicious`
here (maximum 5; ask the maintainer before the sixth).

## Known limits

- The tuning set was used to choose the phrases; the "after" is not an
  independent estimate, and a held-out set is out of scope.
- `text.off-platform` is lowered although it is not in the request's list,
  because `do not tell anyone` alone was `high` and the principle covers it.
  Revert one number (0.4 to 0.5) if you disagree; `b2-job-en-1` and `job-en-2`
  then give `high` through the same rule.
- `text.prize-reward` (0.6) and `text.sensitive-data-request` (0.8) are not
  changed: one phrase from either still gives `high` or `critical`
  (`hoàn tiền`, `chúc mừng bạn`, `your card number`). No observed benign
  message needed it. Decide whether the next round covers them.
- Two ambiguous signals from different groups can still reach `high` (for
  example threat 0.4 and payment 0.4 give 64). This is the "several independent
  signals" case of the principle.
- Recall is lower, by design, for a lone request such as "send me the code", a
  bare fee, "within 1 hour" or `đặt cọc`. These results are `suspicious` or
  `no_signals` in rules-only mode.
- Three scam samples depend on narrow facts: bank-en-3 on the new threat phrase
  `card has been suspended`; job-en-3 on a 2 to 2 monster tie between
  `job-bait` and `authority` won by `MONSTER_ORDER` (it no longer matches
  `job-offer` because `simple tasks` is now bound); auth-vi-1 on exactly
  threshold 2 (payment 1 + impersonation 1).
- `immediately`, `urgent`, `final notice`, `as soon as possible` and `act now`
  are still bare. A benign message with one of them is `suspicious` and
  `generic` (04, 17).
- A semantic signal (cap 0.45) in an overlap group can still be stronger than
  the lowered text twin (for example `semantic.pressure-escalation` 0.45
  against `text.urgency` 0.3) and win the group in `reduceForScoring`. Intended:
  the AI layer may add evidence, but one signal is at most `suspicious`.
- The lower semantic cap lowers AI-only recall: one AI observation can no
  longer reach `high`. Two semantic signals (0.45 and 0.45 give 70) or one
  semantic and one rule signal still can.
- No negation handling (unchanged).
- These limits, in user-facing form, go into the "Known limits" section of the
  repo-root `README.md` (task 7.4, NFR-RT-05): rules-only mode has low recall on
  unfamiliar scam wording and needs the AI layer; the evaluation set was used
  for tuning and is not an accuracy estimate; accepted recall losses (none
  currently).

## Error handling

No new runtime path. The analyzer never rejects (REQ-TXT-12). A phrase that
normalizes to an empty string never matches, and a rule id that does not
resolve is caught by the existing `config.test.ts`.
