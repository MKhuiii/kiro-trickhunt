# Design Document

## Overview

Configuration-only change. No logic file changes. Verified against the code:

- `TextAnalyzer` matches each group's phrases (en and vi together) on
  normalized, boundary-padded text, emits one signal per matched group, and
  uses the group `weight` as severity. New groups need no code.
- `selectMonster` sums `weights[id]` over the distinct ids of `Verdict.signals`
  (the full list, not the overlap-reduced one), takes the highest total
  `>= MONSTER_THRESHOLD`, and breaks ties with `MONSTER_ORDER`.
- Level comes from noisy-or: a lone signal of weight `0.5` already gives score
  50, which is `high`. Any signal at all gives at least `suspicious`.
  Consequently a new group must stay below `0.5` to be harmless on its own.
- Phrases are contiguous. There is no wildcard and no negation. This drives
  the OTP design below.

## Files

- New `src/pipeline/eval/samples.ts`, `samples.test.ts`, `eval.test.ts`,
  `eval.property.test.ts`.
- Changed config: `src/analyzers/text-analyzer.config.ts`,
  `src/pipeline/monsters.config.ts`, `src/pipeline/overlap.config.ts`.
- Changed UI data: `src/ui/i18n/signal-ids.ts`, `en.ts`, `vi.ts`.
- Changed tests: `text-analyzer.config.test.ts`, `text-analyzer.test.ts`,
  `monster.test.ts`; property tests are added to
  `text-analyzer.property.test.ts` and `dictionary.property.test.ts`.
- Read, not changed: `url-analyzer.config.ts`, `rules.config.ts`,
  `messages.config.ts`, `monster.ts`, `reduce.ts`, `combine.ts`.

## Diagnosis (before)

Method: a temporary vitest file ran each sample through
`createPipeline({ llmClient: null })` and printed level, monster, fired signals
and each monster's total. The file was deleted and is not committed.
Monster scores are `bank/prize/job-bait/authority`.

Root causes found:

1. Bank sample: `url.credential-keywords` (bank 1) and `text.threat`
   (authority 2) are the only signals. No phrase matches "in 24 hours" or
   "reply with the OTP", so `authority` wins.
2. Job-bait sample: no phrase for "easy tasks", "hiring online" or "pay a small
   deposit", and "message us on Telegram" is not in `text.off-platform`.
3. Authority sample: `text.off-platform` ("do not tell anyone") and
   `text.payment-request` give `job-bait` 2 + 1 = 3. `text.authority-impersonation`
   and the same payment signal give `authority` 2 + 1 = 3. The tie goes to
   `job-bait` because it comes first in `MONSTER_ORDER`. No phrase covers "you are
   under investigation".
4. Prize sample: "pay a small shipping fee" and "within 1 hour" are not phrases.
5. Existing false positive: bare phrases "verification code", "mã xác thực",
   "your otp" make a genuine one-time-code SMS `critical` with monster `bank`.

| Sample | Before: level, monster | Fired signals | Scores b/p/j/a |
|---|---|---|---|
| bank-en-1 | critical, authority | threat, credential-keywords | 1/0/0/2 |
| bank-en-2 | critical, bank | sensitive-data-request, credential-keywords | 3/0/0/0 |
| bank-en-3 | critical, bank | otp-request | 3/0/0/0 |
| bank-en-4 | critical, bank | sensitive-data-request, threat, urgency | 2/0/0/2 (tie) |
| bank-en-5 | critical, authority | threat, authority-impersonation, credential-keywords | 2/0/0/4 |
| bank-vi-1 | critical, bank | otp-request, credential-keywords | 4/0/0/0 |
| prize-en-1 | high, prize | prize-reward | 0/3/0/0 |
| prize-en-2 | critical, prize | payment-request, prize-reward | 0/4/1/1 |
| prize-en-3 | critical, prize | sensitive-data-request, prize-reward | 2/3/0/0 |
| prize-en-4 | high, prize | prize-reward | 0/3/0/0 |
| prize-vi-1 | high, prize | prize-reward | 0/3/0/0 |
| job-en-1 | **no_signals, null** | none | 0/0/0/0 |
| job-en-2, 3, 4 | high, job-bait | off-platform | 0/0/2/0 |
| job-vi-1 | critical, job-bait | payment-request, off-platform | 0/1/3/1 |
| auth-en-1 | critical, **job-bait** | payment-request, authority-impersonation, off-platform | 1/1/3/3 |
| auth-en-2, 3 | critical, authority | threat, authority-impersonation | 1/0/0/4 |
| auth-en-4 | critical, authority | payment-request, threat, urgency | 0/1/1/3 |
| auth-vi-1 | critical, authority | payment-request, authority-impersonation | 1/1/1/3 |
| ben-en-10, ben-en-15, ben-vi-2, ben-vi-7 | **critical, bank** | otp-request | 3/0/0/0 |
| all other 18 benign | no_signals, null | none | 0/0/0/0 |

auth-en-1 is a 3 against 3 tie decided by `MONSTER_ORDER`, which is why
retuning weights, not only adding phrases, is needed.

## Changes

### `text-analyzer.config.ts`

Every phrase below was run against the Eval_Set in a throw-away prototype
(reverted). Phrases are listed lower-case; the analyzer normalizes them.

**`text.otp-request`** (weight 0.85 unchanged). Remove: `share your otp`,
`your otp`, `verification code`, `security code`, `one time password`; vi
`mã otp`, `gửi mã otp`, `cung cấp mã otp`, `mã xác minh`, `mã xác thực`.
Keep: `send me the code`, `send your otp`, `enter your otp`,
`confirm your pin`, `enter your pin`, `your password`, vi `mã pin`,
`mật khẩu của bạn`, `cung cấp mật khẩu`.
Add en: `send me the otp`, `send me your otp`, `send me your code`,
`send us the code`, `send us the otp`, `send us your otp`, `send us your code`,
`send the otp`, `enter the otp`, `reply with the otp`, `reply with your otp`,
`reply with otp`, `reply with the code`, `reply with your code`,
`text me the code`, `tell me the code`, `read me the code`.
Add vi: `vui lòng cung cấp mã otp`, `vui lòng gửi mã otp`,
`vui lòng nhập mã otp`, `hãy cung cấp mã otp`, `hãy gửi mã otp`,
`và cung cấp mã otp`, `và gửi mã otp`, `gửi lại mã otp`, `trả lời mã otp`.
Keep `send me the code` first in the en list: `text-analyzer.test.ts` uses
`phrases.en[0]`.

Why: a legitimate message says "Do not share your OTP" or "Quý khách không cung
cấp mã OTP". A contiguous phrase cannot tell that from a request, so only
phrases whose verb is not normally negated are kept. A marker ("vui lòng",
"hãy", "và") separates "và cung cấp mã OTP" (a request) from "không cung cấp
mã OTP" (a warning).

**`text.urgency`** (0.5). Add en: `within 72 hours`, `within 12 hours`,
`within 2 hours`, `within 1 hour`, `within an hour`, `locked in 24 hours`,
`locked in 48 hours`, `suspended in 24 hours`, `suspended in 48 hours`,
`blocked in 24 hours`, `closed in 24 hours`. Add vi: `trong 24h`, `trong 48h`,
`trong 48 giờ`, `trong 1 giờ`, `trong vòng 1 giờ`, `trong vòng 2 giờ`.
Bare `in 24 hours` is not added: at weight 0.5 it would turn "It will ship in 24
hours" into `high` (Eval sample ben-en-3 guards this).

**`text.payment-request`** (0.75). Add en: `pay a small fee`,
`pay a shipping fee`, `pay a small shipping fee`, `pay the shipping fee`,
`pay a handling fee`, `pay a small handling fee`, `pay a registration fee`,
`pay the registration fee`, `pay a small deposit`, `pay a training deposit`,
`pay a training fee`, `pay the release fee`, `pay the clearance fee`.
Add vi: `trả phí vận chuyển`, `đóng phí vận chuyển`, `đóng phí đăng ký`,
`nộp phí đăng ký`, `đóng tiền cọc`, `nộp tiền cọc`.

**`text.off-platform`** (0.5). Add en: `message us on telegram`,
`contact us on telegram`, `message us on whatsapp`, `contact us on whatsapp`,
`add me on whatsapp`. Add vi: `nhắn tin qua telegram`.

**`text.threat`** (0.7). Add en `you are under investigation`; vi
`đang bị điều tra`.

**New `text.job-offer`**, weight `0.45` (below 0.5 so that one hit is only
`suspicious`; with an off-platform hit it is 72, `high`; with a payment hit it
is 86, `critical`).
`whyItMatters`: "Easy pay for little work, no experience needed and a fee to
get started are how fake job offers hook people. A real employer does not
charge you to start work."
en: `easy tasks`, `simple tasks`, `no experience needed`,
`no experience required`, `hiring online`, `earn money online`,
`earn money from home`, `make money online`, `easy money`, `liking videos`.
vi: `nhiệm vụ đơn giản`, `việc nhẹ lương cao`, `không cần kinh nghiệm`,
`tuyển nhân viên làm việc online`, `tuyển nhân viên online`, `kiếm tiền online`,
`kiếm tiền tại nhà`, `thu nhập mỗi ngày`.
"Earn 500 dollars a day" cannot be written as a phrase (no wildcard); the
samples are caught by "easy tasks", "no experience needed" and "hiring online".
Bare "dollars a day" is not added: "parking is 5 dollars a day" would flag.

**New `text.financial-institution`**, weight `0.2`.
`whyItMatters`: "Messages that ask you to verify, confirm or unlock a bank or
wallet account are a common way to steal logins. Open your bank's official app
yourself instead."
en: `verify your account`, `account verification`, `confirm your account`,
`unlock your account`, `e-wallet`, `digital wallet`.
vi: `xác minh tài khoản`, `xác thực tài khoản`, `mở khóa tài khoản`,
`ví điện tử`.
Bare "bank", "card" and "ngân hàng" are not used: they appear in legitimate
bank notices and would move ben-en-1, ben-en-15, ben-vi-1 and ben-vi-7 from
`no_signals` to `suspicious` for no gain.

### `monsters.config.ts`

| Monster | Weights after (changes in bold) |
|---|---|
| bank | otp-request 3, sensitive-data-request 2, brand-lookalike 2, authority-impersonation 1, credential-keywords 1, impersonation-tone 1, **text.threat 1**, **text.financial-institution 1** |
| prize | unchanged: prize-reward 3, too-good-to-be-true 2, payment-request 1 |
| job-bait | **text.job-offer 3**, relationship-or-job-bait 3, **off-platform 1 (was 2)**, isolation-secrecy 1, too-good-to-be-true 1, payment-request 1 |
| authority | authority-impersonation 2, threat 2, impersonation-tone 1, payment-request 1, **text.off-platform 1** |

`MONSTER_THRESHOLD` stays 2 and `MONSTER_ORDER` stays. Reasons:

- Off-platform 2 to 1 for `job-bait` removes the misrouting of "do not tell
  anyone". Off-platform also counts 1 for `authority` because the phrase is
  typical of impersonation scams.
- `text.threat` for `bank` makes "your account will be locked" count for the
  bank monster, so bank-en-1 is `bank` 5 against `authority` 2.
- bank-en-5 ("Zeta Bank security team ... Verify your account") ends 4 against
  4 (`authority-impersonation` 2 and `threat` 2). The tie goes to `bank` by
  `MONSTER_ORDER`. That is why the order is kept. A police message that only has
  a login link would tie the same way (see Known limits).
- Raising any weight to 2 for `text.financial-institution` was rejected: one
  hit on a legitimate "confirm your account" message would select `bank`.

### `overlap.config.ts`

Add `["text.job-offer", "semantic.relationship-or-job-bait"]` (same warning
sign, REQ-PIPE-23). `text.financial-institution` has no semantic twin.

### UI dictionary (`signal-ids.ts`, `en.ts`, `vi.ts`)

`KNOWN_SIGNAL_IDS` gets the two ids and the comment says 23 (10 text, 7 url,
6 semantic).

| Key | en | vi (draft) |
|---|---|---|
| `signal.text.job-offer.explain` | The message offers easy pay for little work or asks for a fee to start. Real employers do not charge you to begin. Check the company on its official website. | Tin nhắn hứa trả công cao cho việc nhẹ hoặc đòi phí để bắt đầu. Nhà tuyển dụng thật không thu phí để bạn đi làm. Hãy kiểm tra công ty trên trang web chính thức. |
| `signal.text.financial-institution.explain` | The message asks you to verify or unlock a bank or wallet account. Scammers use this to steal logins. Open your bank's own app or site yourself instead. | Tin nhắn yêu cầu bạn xác minh hoặc mở khóa tài khoản ngân hàng hoặc ví. Kẻ lừa đảo dùng cách này để lấy thông tin đăng nhập. Hãy tự mở ứng dụng hoặc trang web chính thức của ngân hàng. |

### Not changed, and why

- `rules.config.ts`: `otp-urgent-impersonation` already makes bank-en-1
  `critical` once `text.otp-request` and `text.urgency` fire, and a genuine
  code message no longer fires `text.otp-request`.
- `messages.config.ts`: the `job-bait` and `bank` monster actions already say
  what to do ("do not send money for a job", "contact your bank"). No signal
  action is needed for the two new groups.
- `url-analyzer.config.ts`: samples use fake brands, so `url.brand-lookalike`
  never fires on them; `url.credential-keywords` ("login", "verify") already
  fires and is enough. Adding fake brands to `KNOWN_BRANDS` would be wrong.
- No algorithm change was needed. The one thing configuration cannot do is
  negation ("do not share"); the marker-bound phrases avoid it. A
  negation-aware matcher would be a new analyzer feature and needs its own spec.

## Evaluation set

`src/pipeline/eval/samples.ts`:

```ts
import type { RiskLevel } from "../../core";
import type { SpecificMonsterId } from "../monsters.config";

export interface EvalSample {
  readonly id: string;
  readonly locale: "en" | "vi";
  readonly text: string;
  readonly expectedMonster: SpecificMonsterId | null;
  readonly minLevel: RiskLevel;
}
export const EVAL_SAMPLES: readonly EvalSample[] = [ /* below */ ];
```

`minLevel` is `critical` where the current pipeline already gives `critical`
(no regression allowed), otherwise `high`. Benign samples use `null` and
`no_signals`; the test applies Benign_Pass (REQ-PIPE-46). This reading of
"no monster and at most suspicious" is an assumption: `monster` is only `null`
for `no_signals`, so a `suspicious` benign result carries `generic`, which is
accepted; the current and prototype results are all `no_signals`.

| id | expected | minLevel | text |
|---|---|---|---|
| bank-en-1 | bank | critical | [ABC Bank] Your account will be locked in 24 hours. Verify now at http://abc-bank-verify.example/login and reply with the OTP. |
| bank-en-2 | bank | critical | Zeta Bank security alert: unusual login detected. Confirm your card number and the code we just texted you at http://zeta-bank-secure.example/confirm. |
| bank-en-3 | bank | critical | Dear customer, your debit card has been suspended. Send us your OTP to reactivate it today. |
| bank-en-4 | bank | critical | Northwind Bank: we could not verify your account. Enter your online banking password at http://northwind-bank-help.example within 24 hours or your account will be suspended. |
| bank-en-5 | bank | critical | Zeta Bank security team: your account has been locked. Verify your account at http://zeta-bank-unlock.example/login. |
| bank-vi-1 | bank | critical | [Ngân hàng ABC] Tài khoản của quý khách sẽ bị khóa trong 24h. Vui lòng xác minh tại http://abc-bank-verify.example/login và cung cấp mã OTP. |
| prize-en-1 | prize | high | Congratulations! You have won a 1000 dollar gift card. Pay a small shipping fee within 1 hour to claim it. |
| prize-en-2 | prize | critical | You are our lucky winner! Claim your prize today, just pay the processing fee at http://mega-prize-claim.example. |
| prize-en-3 | prize | critical | Unclaimed refund of 450 dollars is waiting for you. Claim your refund now and send your card number. |
| prize-en-4 | prize | high | Congratulations, you are selected for a free holiday voucher. Transfer a 20 dollar handling fee to receive it. |
| prize-vi-1 | prize | high | Chúc mừng bạn trúng thưởng 1000 đô. Trả phí vận chuyển trong 1 giờ để nhận quà. |
| job-en-1 | job-bait | high | We are hiring online assistants. Earn 500 dollars a day with easy tasks. Message us on Telegram and pay a small deposit to start. |
| job-en-2 | job-bait | high | Work from home, no experience needed. Earn 200 dollars per day liking videos. Add me on Telegram to get started. |
| job-en-3 | job-bait | high | Part-time job offer: simple tasks, 300 dollars a day. Pay a registration fee to activate your account and keep this secret. |
| job-en-4 | job-bait | high | Hi, I found your resume. We are hiring online with flexible hours, earn 150 dollars daily. Contact me on WhatsApp and pay a training deposit. |
| job-vi-1 | job-bait | critical | Tuyển nhân viên làm việc online, không cần kinh nghiệm, thu nhập 500 nghìn mỗi ngày. Liên hệ qua Zalo và nộp phí đặt cọc để bắt đầu. |
| auth-en-1 | authority | critical | This is the tax office. You are under investigation. Do not tell anyone and transfer money to a secure account today. |
| auth-en-2 | authority | critical | Police department notice: an arrest warrant has been issued in your name. Pay a fine today to avoid legal action. |
| auth-en-3 | authority | critical | Courier company: your parcel is held at customs. Pay the release fee today or legal action will follow. |
| auth-en-4 | authority | critical | Final notice from the court: a court summons has been issued. Send money today to settle the case and do not discuss this with anyone. |
| auth-vi-1 | authority | critical | Tôi là cán bộ công an, bạn liên quan vụ rửa tiền. Không được nói với ai, chuyển tiền vào tài khoản an toàn. |
| ben-en-1 | null | no_signals | Your ABC Bank balance has changed. Check the bank app for details. |
| ben-en-2 | null | no_signals | Your one-time code is 482913. Never share this code with anyone. We will never ask for it. |
| ben-en-3 | null | no_signals | Thanks for your order #10234. It will ship in 24 hours and you can track it in your account. |
| ben-en-4 | null | no_signals | Your parcel from Example Store is out for delivery today. No action is needed. |
| ben-en-5 | null | no_signals | Meeting invitation: project sync tomorrow at 3pm in room B. Please confirm your attendance. |
| ben-en-6 | null | no_signals | Mom: can you send me some money for dinner tonight? I will pay you back on Friday. |
| ben-en-7 | null | no_signals | Receipt: your monthly subscription of 9.99 dollars was renewed. Manage it in your account settings. |
| ben-en-8 | null | no_signals | Hi Sam, thanks for applying. Your interview is on Thursday at 10am at our office. Please bring a copy of your resume. |
| ben-en-9 | null | no_signals | Reminder: your appointment is tomorrow at 9am. Reply YES to confirm. |
| ben-en-10 | null | no_signals | Your verification code is 771204. It expires in 10 minutes. Do not share it with anyone. |
| ben-en-11 | null | no_signals | Your card ending in 4521 was used for a 25 dollar purchase at Example Store. If this was not you, call the number on the back of your card. |
| ben-en-12 | null | no_signals | We are hiring a sales assistant. The job is full time and the salary is paid monthly. Apply on our company website. |
| ben-en-13 | null | no_signals | Your payment of 120 dollars was received. Thank you for paying your invoice. |
| ben-en-14 | null | no_signals | Congratulations on your new job! Dinner on Saturday? |
| ben-en-15 | null | no_signals | Your ABC Bank OTP is 553201. Do not share your OTP with anyone, including bank staff. |
| ben-vi-1 | null | no_signals | Số dư tài khoản của bạn đã thay đổi. Xem chi tiết trong ứng dụng ngân hàng. |
| ben-vi-2 | null | no_signals | Mã xác thực của bạn là 482913. Tuyệt đối không chia sẻ mã này với bất kỳ ai. |
| ben-vi-3 | null | no_signals | Mai 8h họp nhóm ở phòng 302 nhé, nhớ mang laptop. |
| ben-vi-4 | null | no_signals | Mẹ ơi, tối nay con cần ít tiền đi ăn với bạn, mẹ gửi cho con nhé. |
| ben-vi-5 | null | no_signals | Đơn hàng #10234 của bạn đã được xác nhận và sẽ giao vào thứ Hai. |
| ben-vi-6 | null | no_signals | Lịch phỏng vấn của bạn là 10h sáng thứ Năm tại văn phòng công ty. Vui lòng mang theo CV. |
| ben-vi-7 | null | no_signals | Quý khách tuyệt đối không cung cấp mã OTP cho bất kỳ ai, kể cả nhân viên ngân hàng. |

Counts: 17 English and 4 Vietnamese Scam_Samples (bank 5+1, prize 4+1,
job-bait 4+1, authority 4+1) and 15 English and 7 Vietnamese Benign_Samples.
Numbers in the texts (1000, 482913, 10234, 4521) are amounts, order or code
numbers, not phone or account numbers. prize-en-4 keeps "20 dollar handling
fee" on purpose: it shows that a numbered fee is not matched yet the message is
still `high` with the right monster.

## Before and after

| Metric (tuning set: 21 scam, 22 benign) | Before (measured) | After (measured) |
|---|---|---|
| Scams with expected monster and level | 17 | 21 |
| Missed scams (level below minimum) | 1 (job-en-1) | 0 |
| Wrong monster (level reached) | 3 (bank-en-1, bank-en-5, auth-en-1) | 0 |
| Benign false positives (`high`, `critical` or a specific monster) | 4 (ben-en-10, ben-en-15, ben-vi-2, ben-vi-7) | 0 |
| Benign `suspicious` only | 0 | 0 |

Measured results per sample, rules-only pipeline (level, monster, then totals
bank/prize/job-bait/authority over distinct signal ids). All 22 benign samples
are `no_signals`, `null`, 0/0/0/0.

| Sample | After: level, monster | Fired signals | Totals b/p/j/a |
|---|---|---|---|
| bank-en-1 | critical, bank | otp-request, threat, urgency, credential-keywords | 5/0/0/2 |
| bank-en-2 | critical, bank | sensitive-data-request, credential-keywords | 3/0/0/0 |
| bank-en-3 | critical, bank | otp-request | 3/0/0/0 |
| bank-en-4 | critical, bank | sensitive-data-request, threat, urgency, financial-institution | 4/0/0/2 |
| bank-en-5 | critical, bank | threat, authority-impersonation, credential-keywords, financial-institution | 4/0/0/4 (tie, `MONSTER_ORDER`) |
| bank-vi-1 | critical, bank | otp-request, urgency, credential-keywords | 4/0/0/0 |
| prize-en-1 | critical, prize | payment-request, prize-reward, urgency | 0/4/1/1 |
| prize-en-2 | critical, prize | payment-request, prize-reward | 0/4/1/1 |
| prize-en-3 | critical, prize | sensitive-data-request, prize-reward | 2/3/0/0 |
| prize-en-4 | high, prize | prize-reward | 0/3/0/0 |
| prize-vi-1 | critical, prize | payment-request, prize-reward, urgency | 0/4/1/1 |
| job-en-1 | critical, job-bait | payment-request, off-platform, job-offer | 0/1/5/2 |
| job-en-2 | high, job-bait | off-platform, job-offer | 0/0/4/1 |
| job-en-3 | critical, job-bait | payment-request, off-platform, job-offer | 0/1/5/2 |
| job-en-4 | critical, job-bait | payment-request, off-platform, job-offer | 0/1/5/2 |
| job-vi-1 | critical, job-bait | payment-request, off-platform, job-offer | 0/1/5/2 |
| auth-en-1 | critical, authority | payment-request, threat, authority-impersonation, off-platform | 2/1/2/6 |
| auth-en-2 | critical, authority | threat, authority-impersonation | 2/0/0/4 |
| auth-en-3 | critical, authority | payment-request, threat, authority-impersonation | 2/1/1/5 |
| auth-en-4 | critical, authority | payment-request, threat, urgency | 1/1/1/3 |
| auth-vi-1 | critical, authority | payment-request, authority-impersonation | 1/1/1/3 |

The numbers were measured with a temporary vitest file (deleted, not
committed) against the real configuration. They match the prototype.
Existing suite with the prototype configuration and no test edits: 5 failures,
all listed in the requirements; every other test passes. The baseline before
the prototype was 92 files, all passing.

## Known limits

- The tuning set was used to choose the phrases. The "after" numbers are not an
  independent estimate. A held-out set is out of scope here and is the next
  step before more tuning.
- Removed OTP phrases lower recall for wording such as "Please share your
  verification code". It is the price of not flagging genuine code messages.
- Still bare and still matching legitimate text: `your password`, `mã pin`,
  `mật khẩu của bạn`, `cung cấp mật khẩu`. They fire on "Never share your
  password". Not changed, to keep this spec limited to the reported problems.
- `within 1 hour` and similar share the profile of the existing `within 24
  hours`: a legitimate "arrives within 1 hour" gives `high`.
- `text.financial-institution` fires on a legitimate "Confirm your account to
  finish signing up": `suspicious` with monster `generic`. Accepted by
  Benign_Pass.
- `text.authority-impersonation` covers both "bank security team" and "police
  department". A police message with an impersonation phrase, a threat and a
  login link scores `authority` 4 against `bank` 3, which is correct. If it also
  says "verify your account", `bank` reaches 4 and wins the tie by order. A
  separate bank-impersonation group would fix it; not done here.

## Error handling

No new runtime path. The analyzer never rejects (REQ-TXT-12) and every new
phrase is data. A phrase that normalizes to an empty string never matches
(`matchesPhrase`), so a malformed config entry cannot flag everything.
