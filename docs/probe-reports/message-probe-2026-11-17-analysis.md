# Message probe: analysis and tuning suggestions

Source data: [message-probe-2026-11-17.md](./message-probe-2026-11-17.md). 53 synthetic messages, run through the pipeline twice: rules-only, and rules + LLM. No config was changed.

## Results at a glance

| Category | Rules-only | Rules + LLM |
|---|---|---|
| rare-scam (17) | 2 PASS, 15 FAIL | 10 PASS, 7 FAIL |
| out-of-scope-scam (10) | 0 PASS, 10 GAP (no signal at all) | 10 PASS (5 under a specific monster, 5 generic) |
| benign (12) | 12 PASS | 12 PASS |
| lookalike (14) | 11 PASS, 3 FALSE_ALARM | 9 PASS, 5 FALSE_ALARM |

Reading the numbers:

- The rules layer only knows the phrases in `text-analyzer.config.ts`. Scams worded differently get `no_signals` or only `suspicious`. It caught 2 of 17 uncommon scams.
- The LLM layer closes most of that gap, but it also adds two new false alarms (`look-en-8`, `look-vi-2`) and sometimes picks the wrong monster.
- Every benign message stayed clean in both modes.
- The LLM column varies between runs. In the first run the provider failed on 28 of 52 calls (rate limit or similar), so the script now retries and waits longer. In the second run no call failed. `look-en-6` changed score between runs (30 then 45), so treat LLM scores as approximate.

## Root causes

| Id | Problem | Root cause (file) |
|---|---|---|
| rare-bank-en-1, en-2, vi-1 | Rules miss completely. With the LLM the monster is `authority`, not `bank`. | No phrase matches "card details", "debit card was deactivated", "number we send to your phone", or "nhập mã xác nhận". The LLM returns `semantic.impersonation-tone` + `semantic.pressure-escalation`. Those two give `authority` 2 points and `bank` only 1 (`monsters.config.ts`). |
| rare-prize-en-1, en-2 | Rules miss completely. LLM gives `high/generic`. | No prize phrase for "free reward", "survey winner", "free smartphone". The LLM returns `too-good-to-be-true` + `pressure-escalation`. `prize` gets only 1 point, below the threshold of 2. |
| rare-prize-vi-1 | Rules reach only `suspicious/generic`. | Only `text.payment-request` fires. "khách hàng may mắn" and "voucher" are not phrases. The LLM fixes it. |
| rare-job-en-1, en-2, vi-1, vi-2 | Rules miss completely. The LLM gets all four right. | Task-scam wording ("prepay the order", "commission per order", "chốt đơn ảo", "đánh giá sản phẩm", "phí thẻ nhân viên") is not in `text.job-offer` or `text.payment-request`. |
| rare-job-en-3 (romance) | Rules: `suspicious/generic`. LLM: `critical/authority`. | The LLM returns `emotional-manipulation`, which no monster uses. `impersonation-tone` + `pressure-escalation` push `authority` to 3 points. |
| rare-auth-en-1, en-2, vi-1, vi-2 | Rules reach only `suspicious/generic` or nothing. | No phrases for "will be disconnected", "sẽ cắt điện", "Immigration", "tòa án nhân dân", "giấy mời làm việc", "detained". `text.authority-impersonation` and `text.threat` never fire, so the `authority-with-threat` rule cannot raise the level. |
| rare-auth-en-2 | LLM gives `critical/prize`. | `text.payment-request` (gift card) + `too-good-to-be-true` give `prize` 2 points, the same as `authority`. `prize` comes first in `MONSTER_ORDER`, so it wins the tie. |
| oos-* (10) | Rules see nothing. | No phrase and no monster for tolls, QR payment, "recovery phrase", wrong-number investment, family emergency, cheques, loans, rentals, stock groups. |
| look-en-5, look-vi-4 | `high/prize` for a raffle prize and a real job acceptance. | "you won" and "chúc mừng bạn" are in `text.prize-reward`, weight 0.6, which alone is `high` (score 60). |
| look-en-2 | `high/generic` for an anti-scam warning. | The message quotes "account has been locked" and "verify within 24 hours", so `text.threat` + `text.urgency` combine to 58. |
| look-en-8, look-vi-2 | New false alarms only with the LLM (`high/authority`, `critical/job-bait`). | The LLM flags `pressure-escalation` and `relationship-or-job-bait` on normal chat. Two semantic signals at 0.45 plus a weak text signal reach 52 and 82. |

## Suggestions, in priority order

Each suggestion changes config only. After any change, run `npx vitest run src/pipeline/eval` (the existing eval set must stay green) and rerun `npm run probe:messages`.

1. **Bank vs authority tie (`monsters.config.ts`, `text-analyzer.config.ts`).** Add bank-specific phrases to `text.financial-institution` ("debit card was deactivated", "re-enter your card details", "sms banking", "thẻ của bạn sắp hết hạn") and to `text.otp-request` ("the 6-digit number we send", "nhập mã xác nhận gửi về điện thoại"). With one `text.financial-institution` hit, `bank` reaches 2 points and wins a tie with `authority` because it is first in `MONSTER_ORDER`. Risk: a generic "enter the code" phrase would hit real 2FA messages, so keep phrases specific.
2. **Authority and utility threats (`text-analyzer.config.ts`).** Add threat phrases ("will be disconnected", "you will be detained", "sẽ cắt điện", "bị xử lý vắng mặt") and impersonation phrases ("immigration bureau", "tòa án nhân dân", "giấy mời làm việc"). This lets `authority-with-threat` raise these to `critical` without the LLM, and fixes the `prize` tie in `rare-auth-en-2`. Risk: "disconnected" appears in ordinary service notices, so match full phrases.
3. **Prize bait (`text-analyzer.config.ts`).** Add "free reward", "survey winner", "free smartphone", "khách hàng may mắn", "nhận ngay voucher" to `text.prize-reward`. Risk: store promotions that really offer vouchers.
4. **Task and equipment-deposit job scams (`text-analyzer.config.ts`).** Add "commission per order", "prepay the order", "chốt đơn ảo", "đánh giá sản phẩm", "hoa hồng" to `text.job-offer`, and "nạp trước tiền", "phí thẻ nhân viên" to `text.payment-request`. The LLM already catches 4 of 4, so this mainly protects users when the LLM is unavailable or rate-limited.
5. **Romance and emotional pressure (`monsters.config.ts`).** Give `semantic.emotional-manipulation` a weight of 1 under `job-bait`. In `rare-job-en-3` this makes `job-bait` 3 points against 3 for `authority`, and `job-bait` wins the tie. The family-emergency sample (`oos-family-en`) is a generic scam by design, so a change of monster there is acceptable.
6. **LLM false alarms (`semantic-analyzer.config.ts`).** Lower `maxSeverity` for `semantic.pressure-escalation` and `semantic.relationship-or-job-bait` from 0.45 to about 0.3. That keeps `look-en-8` and `look-vi-2` below `high`, but the four LLM-only job-bait catches would drop from `critical` to `high`. Decide whether that trade is acceptable.
7. **Raffle and job-acceptance false alarms (`text-analyzer.config.ts`, `monsters.config.ts`).** Split weak prize phrases ("you won", "chúc mừng bạn", "congratulations you") into a second pattern with weight about 0.3, and keep strong phrases ("claim your prize", "lucky winner", "bạn đã trúng thưởng") at 0.6. The new id needs an entry in `monsters.config.ts`. Risk: the existing `prize-*` eval samples must still reach `high`.
8. **Out-of-scope scams (product decision).** Cheap rule additions: "recovery phrase" and "seed phrase" in `text.sensitive-data-request` (this makes wallet drains `high` with a link), "scan the QR code" and "unpaid toll" as new patterns. For wrong-number investment, family emergency, rental and stock groups, no monster exists. Options: add one or two monsters (for example `investment` and `impersonated-contact`) or keep them as `generic`.

## Not fixable by rules

`look-en-2` (an anti-scam notice that quotes scam wording) cannot be lowered by a rule, because `verdict-rules.md` says combination rules and monster selection may only raise risk. The pipeline shows `high` with the evidence "account has been locked" and "verify within 24 hours". Choices: accept it as a conservative result, or make a deliberate change to that steering rule.

## Limits of this probe

- Messages and expectations were written by one author and are synthetic. They show direction, not real-world rates.
- Only text was tested. QR and OCR paths run in the browser and were not covered.
- The LLM column depends on the provider and model configured in `.env.local`.
