# Design Document

## Overview

Configuration-only change in `src/analyzers/text-analyzer.config.ts`. Same
mechanics as v1: one signal per matched group, noisy-or level (a lone signal
of weight >= 0.5 is `high`; any signal is at least `suspicious`), monster by
summed weights with threshold 2 and `MONSTER_ORDER` tie-break.

## Diagnosis (before)

Measured with a temporary vitest file running each sample through
`createPipeline({ llmClient: null })` (deleted, not committed). Scores are
bank/prize/job-bait/authority.

| Sample | Level | Monster | Fired signals | Scores |
|---|---|---|---|---|
| b2-bank-en-1 | suspicious | generic | url.credential-keywords | 1/0/0/0 |
| b2-job-en-1 | suspicious | job-bait | text.job-offer | 0/0/3/0 |
| b2-auth-en-1 | critical | generic | payment-request, urgency | 0/1/1/1 |
| b2-prize-en-1 | critical | prize | payment-request, prize-reward | 0/4/1/1 |
| b2-auth-vi-1 | critical | authority | payment-request, authority-impersonation | 1/1/1/3 |
| b2-ben-en-1 (code) | no_signals | null | none | 0/0/0/0 |
| b2-ben-en-2 (interview) | no_signals | null | none | 0/0/0/0 |
| b2-ben-en-3 (Mum) | no_signals | null | none | 0/0/0/0 |
| b2-ben-en-4 (statement) | no_signals | null | none | 0/0/0/0 |
| b2-ben-vi-1 (lunch) | **high** | generic | text.payment-request ("chuyển khoản") | 0/1/1/1 |

Root causes:
1. Bank: no phrase for "unusual sign-in", "confirm your identity" or "enter the code we text you".
2. Job: "registration fee" and "Chat with our manager on WhatsApp" are not phrases, so level stays `suspicious`.
3. Authority: "Revenue Service", "unpaid taxes", "a warrant will be issued" and "do not discuss this with anyone" are not phrases. Monster is `generic` (all three at 1).
4. The false positive: the bare phrase `chuyển khoản` is in the strong group (0.75).
5. Prize and Vietnamese authority already pass (the request listed them as expected; the vi sample was not missed).

## Changes

**Goal A.** The bare phrases `transfer money`, `send money`, `chuyển khoản`,
`chuyển tiền` are removed from `text.payment-request`. Strong forms replace them
(see REQ-TXT-23): transfer to a safe, secure or custody account, `... now /
today / immediately`, `chuyển tiền / khoản ngay`, `... vào tài khoản an toàn /
tạm giữ / bảo mật`, `pay immediately`, `registration fee`, `activation fee`,
`phí kích hoạt`, `phí đăng ký tài khoản`. Existing strong phrases (gift cards,
deposit, processing fee, shipping and handling fee forms) are untouched.

Decision: **no split into a weak group.** A weak group (for example weight 0.2)
would make the lunch message (10) `suspicious` with monster `generic`, but the
request requires it to be `no_signals`. Removing the bare phrase gives Clean and
costs no earlier sample (measured). The cost is lower recall for bare wording
such as "send money" alone; the strong forms above catch the scam wording.

**Goal B.** Phrases added to existing groups, no new group and no new id, so no
dictionary or UI change:
- `text.otp-request`: "enter / send / reply with the code we (just) text(ed) you", vi `nhập mã chúng tôi gửi`. Not "the code we sent you": a genuine two-factor page can say it.
- `text.financial-institution` (0.2): unusual or suspicious sign-in / login, confirm or verify your identity, `keep your card active`, vi equivalents.
- `text.authority-impersonation`: revenue service, revenue agency, internal revenue, `tổng cục thuế`.
- `text.threat`: `a warrant will be issued`, `unpaid taxes`, `unpaid tax`, vi money-laundering and tax-arrears phrases.
- `text.off-platform`: chat-with-us / our-manager on WhatsApp, Telegram, Zalo; `do not discuss this with anyone`; vi `không (được) tiết lộ cho ai`, WhatsApp and Zalo forms.

**Goal C.** No weight change was needed. With the new signals the existing
weights give: bank-en-1 `bank` 5 (otp 3, financial 1, credential 1); job-en-1
`job-bait` 5 (job-offer 3, off-platform 1, payment 1) against `authority` 2;
auth-en-1 `authority` 6 (impersonation 2, threat 2, off-platform 1, payment 1)
against `bank` 2 and `job-bait` 2. `monsters.config.ts` and `overlap.config.ts`
stay as they are.

## Before and after (Batch_2)

| Sample | Before: level, monster | After: level, monster | After fired signals | After scores b/p/j/a |
|---|---|---|---|---|
| b2-bank-en-1 | suspicious, generic | critical, bank | otp-request, credential-keywords, financial-institution | 5/0/0/0 |
| b2-job-en-1 | suspicious, job-bait | critical, job-bait | payment-request, off-platform, job-offer | 0/1/5/2 |
| b2-auth-en-1 | critical, generic | critical, authority | payment-request, threat, authority-impersonation, urgency, off-platform | 2/1/2/6 |
| b2-prize-en-1 | critical, prize | critical, prize | payment-request, prize-reward | 0/4/1/1 |
| b2-auth-vi-1 | critical, authority | critical, authority | payment-request, threat, authority-impersonation, off-platform | 2/1/2/6 |
| b2-ben-en-1 | no_signals, null | no_signals, null | none | 0/0/0/0 |
| b2-ben-en-2 | no_signals, null | no_signals, null | none | 0/0/0/0 |
| b2-ben-en-3 | no_signals, null | no_signals, null | none | 0/0/0/0 |
| b2-ben-en-4 | no_signals, null | no_signals, null | none | 0/0/0/0 |
| b2-ben-vi-1 | **high, generic** | no_signals, null | none | 0/0/0/0 |

The 43 earlier samples all pass unchanged (`eval.test.ts`, 53 samples, no exceptions).
Full suite: 96 files, 1279 tests pass; `tsc --noEmit` clean; lint 0 errors.

## Known limits

- Batch 2 was used to choose these phrases, so the "after" is not an independent estimate. A third unseen batch is the next step.
- `registration fee`, `activation fee` and `phí kích hoạt` are bare within the fee context and fire at 0.75 (`high`) on a legitimate conference or service registration message. Accepted because the request names them as strong.
- `unusual sign-in` and `confirm your identity` appear in genuine security alerts. Alone they give `suspicious` (weight 0.2, bank weight 1, below the monster threshold), which Benign_Pass accepts.
- Contiguous phrases cannot match "send some money" or "send the money"; those stay Clean on purpose.
- No negation handling (unchanged from v1).
