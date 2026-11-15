# Requirements Document

## Introduction

A deliberate change to frozen configuration, same method as `rules-tuning-v1`.
Ten new messages (batch 2, written without seeing the configuration) show that
the rules generalize only partly, and one benign Vietnamese message is a false
positive at `high`. This spec changes `text-analyzer.config.ts` phrases and
extends the evaluation set.

Numbering continues: `REQ-TXT-22` onward, `REQ-PIPE-53` onward, `PBT-81`
onward. Last existing numbers: `REQ-TXT-21`, `REQ-PIPE-52`, `REQ-UI-46`, `PBT-80`.

**Hard constraints:** configuration and tests only. `TextAnalyzer`,
`selectMonster`, `reduceForScoring`, `applyRules`, `aggregate`, `Signal`,
`Analyzer`, UI, API, LLM layer, `url-analyzer.config.ts`, `monsters.config.ts`,
`overlap.config.ts`, `rules.config.ts` are NOT changed. No new monster, no new
dependency, no network. "Safe" wording rules still apply.

## Glossary

- **Batch_2**: the ten samples with ids prefixed `b2-` in `src/pipeline/eval/samples.ts`.
- **Clean**: level `no_signals` and monster `null`.
- **Everyday_Payment_Word**: a bare phrase such as "chuyển khoản", "chuyển tiền", "transfer money", "send money".

## Requirements

### Requirement 1: Evaluation set extension

1. **REQ-PIPE-53** `EVAL_SAMPLES` SHALL gain the ten Batch_2 samples (5 scam: bank, job-bait, authority, prize, Vietnamese authority; 5 benign), fake brands and `.example` URLs only, 53 samples in total.
2. **REQ-PIPE-54** Each Batch_2 scam sample SHALL give its expected monster at level `high` or above. Each Batch_2 benign sample SHALL be Clean (stricter than Benign_Pass). The 43 earlier samples SHALL keep passing with no exception.

### Requirement 2: Payment phrases (goal A)

1. **REQ-TXT-22** `text.payment-request` SHALL NOT contain an Everyday_Payment_Word on its own: remove `transfer money`, `send money`, `chuyển khoản`, `chuyển tiền`. A message with only such a word is Clean.
2. **REQ-TXT-23** `text.payment-request` SHALL keep and add strong phrases: gift cards, transfer to a safe, secure or custody account (English; Vietnamese `an toàn`, `tạm giữ`, `bảo mật`), `pay immediately`, `send money / transfer money` followed by `now`, `today` or `immediately`, `chuyển tiền ngay`, `chuyển khoản ngay`, `registration fee`, `activation fee`, `phí kích hoạt`, `phí đăng ký tài khoản`; existing deposit and processing-fee phrases stay.

### Requirement 3: Detection phrases (goal B)

1. **REQ-TXT-24** `text.otp-request` SHALL also match "enter / send / reply with the code we (just) text(ed) you" and Vietnamese `nhập mã chúng tôi gửi`; `text.financial-institution` SHALL also match unusual or suspicious sign-in or login, confirm or verify your identity, `keep your card active`, `đăng nhập bất thường`, `xác minh / xác nhận danh tính`. No bare `bank`, `card`, `code`, `account`.
2. **REQ-TXT-25** `text.authority-impersonation` SHALL also match `revenue service`, `revenue agency`, `internal revenue`, `tổng cục thuế`; `text.threat` SHALL also match `a warrant will be issued`, `unpaid taxes`, `unpaid tax`, `liên quan đến đường dây rửa tiền`, `truy thu thuế`, `nợ thuế chưa nộp`; `text.off-platform` SHALL also match chat migration ("chat with us / our manager on WhatsApp, Telegram, Zalo", "message / contact us on Zalo", Vietnamese WhatsApp and Zalo forms) and `do not discuss this with anyone`, `không (được) tiết lộ cho ai`. No bare `tax`, `money`, `warrant`.

### Requirement 4: Monster selection (goal C)

1. **REQ-PIPE-55** Monster selection for Batch_2 SHALL be reached through the new phrases and the existing `MONSTERS` weights. `monsters.config.ts`, `overlap.config.ts`, `MONSTER_THRESHOLD`, `MONSTER_ORDER` are unchanged (design records why no weight change is needed).

## Existing Requirements, Tests and Config Modified

| Item | Change |
|---|---|
| `text-analyzer.config.ts`, group `text.payment-request` | Removes four bare phrases; adds strong phrases (REQ-TXT-22, 23) |
| `text-analyzer.config.ts`, groups `text.otp-request`, `text.financial-institution`, `text.authority-impersonation`, `text.threat`, `text.off-platform` | Phrases added (REQ-TXT-24, 25) |
| `rules-tuning-v1` REQ-TXT-18 (payment-request phrase list) | Superseded for the four removed phrases |
| `rules-tuning-v1` REQ-PIPE-45 / design "43 samples" | Set grows to 53; the 43 are unchanged |
| `src/pipeline/eval/samples.ts` | Ten samples appended |
| Test `src/pipeline/eval/samples.test.ts` "has 43 samples: 21 scam and 22 benign" | Now 53 / 26 / 27 and 10 `b2-` ids |
| Test `src/pipeline/eval/eval.test.ts` | Extra assertion: `b2-` benign samples are Clean |
| Test `src/ui/view/highlights.test.ts` "highlights real TextAnalyzer evidence from English phrases" | Expected highlight `send money` becomes `send money now`, because bare `send money` is removed (REQ-TXT-22). Input text unchanged |
| New test `src/analyzers/text-analyzer.v2.test.ts` | Example tests for REQ-TXT-22 to 25 |

Not modified: all other tests (measured: full suite 96 files, 1279 tests pass), `monsters.config.ts`, `overlap.config.ts`, `rules.config.ts`, UI dictionaries (no new signal id), and all 43 earlier samples.

## Property-Based Testing

None added. Existing PBT-75 to PBT-80 and PBT-13/15 cover the changed groups (one signal per group, case and diacritic invariance, evidence length) and pass unchanged. `PBT-81` is reserved if a later spec needs it.

## Out of Scope

UI, API, LLM layer, new monsters, negation-aware matching, a weak "payment mention" signal tier (see design).
