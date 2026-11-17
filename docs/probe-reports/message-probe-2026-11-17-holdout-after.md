# TrickHunt message probe report

Generated: 2026-11-17T03:43:11.567Z

Messages: 14. Modes: rules-only.

All messages are synthetic. Status meanings: PASS = matches expectation; FAIL = scam missed, too low or wrong monster; GAP = out-of-scope scam with no signal; FALSE_ALARM = harmless message raised too high.

## Summary: rules-only

| Category | Total | PASS | FAIL | GAP | FALSE_ALARM |
|---|---|---|---|---|---|
| rare-scam | 8 | 0 | 8 | 0 | 0 |
| out-of-scope-scam | 0 | 0 | 0 | 0 | 0 |
| benign | 2 | 2 | 0 | 0 | 0 |
| lookalike | 4 | 3 | 0 | 0 | 1 |

### Monster confusion: rules-only

| Expected \ Observed | bank | prize | job-bait | authority | generic | none |
|---|---|---|---|---|---|---|
| bank | 0 | 0 | 0 | 0 | 0 | 2 |
| prize | 0 | 0 | 0 | 0 | 0 | 2 |
| job-bait | 0 | 0 | 0 | 0 | 1 | 1 |
| authority | 0 | 0 | 0 | 0 | 0 | 2 |
| generic | 0 | 0 | 0 | 0 | 0 | 0 |
| none | 0 | 1 | 0 | 0 | 1 | 4 |

## rare-scam

| Id | Lang | Message | Expected | Rules-only |
|---|---|---|---|---|
| h-bank-en-1 | en | Alert from Maple Savings: a sign-in from a new device was blocked. To… | bank / high..critical | FAIL no_signals/none (0) |
| h-bank-vi-1 | vi | Ngân hàng Hoa Sen: giao dịch 12.500.000đ đang chờ duyệt. Nếu không ph… | bank / high..critical | FAIL no_signals/none (0) |
| h-prize-en-1 | en | Your number was drawn in our monthly giveaway. Collect your 500 dolla… | prize / high..critical | FAIL no_signals/none (0) |
| h-prize-vi-1 | vi | Chương trình tri ân khách hàng: số điện thoại của bạn trúng 1 chiếc x… | prize / high..critical | FAIL no_signals/none (0) |
| h-job-en-1 | en | Earn 80 dollars per hour from home labeling images, flexible hours. O… | job-bait / high..critical | FAIL no_signals/none (0) |
| h-job-vi-1 | vi | Tuyển nhân viên tăng tương tác mạng xã hội, lương 400k mỗi ngày, trả … | job-bait / high..critical | FAIL suspicious/generic (40) |
| h-auth-en-1 | en | Final reminder from the Traffic Enforcement Office: an unpaid violati… | authority / high..critical | FAIL no_signals/none (0) |
| h-auth-vi-1 | vi | Bảo hiểm xã hội thông báo: hồ sơ của bạn bị treo do khai báo sai. Chu… | authority / high..critical | FAIL no_signals/none (0) |

## benign

| Id | Lang | Message | Expected | Rules-only |
|---|---|---|---|---|
| h-ben-en-1 | en | Lunch at 12:30? I will book a table for four near the office. | none / no_signals | PASS no_signals/none (0) |
| h-ben-vi-1 | vi | Cuối tuần này cả nhà về quê, mẹ nhớ chuẩn bị thuốc cho bà nhé. | none / no_signals | PASS no_signals/none (0) |

## lookalike

| Id | Lang | Message | Expected | Rules-only |
|---|---|---|---|---|
| h-look-en-1 | en | Maple Savings: our branch will be closed on Monday for a public holid… | none / no_signals..suspicious | PASS no_signals/none (0) |
| h-look-en-2 | en | Your statement is ready. We will never call you to ask for your card … | none / no_signals..suspicious | PASS no_signals/none (0) |
| h-look-vi-1 | vi | Điện lực thông báo: khu vực của bạn sẽ cắt điện từ 8h đến 11h ngày ma… | none / no_signals..suspicious | PASS suspicious/generic (40) |
| h-look-vi-2 | vi | Nhận ngay voucher giảm 10% khi mua hàng tại cửa hàng, áp dụng đến hết… | none / no_signals..suspicious | FALSE_ALARM high/prize (60) |

## Mismatches in detail

### h-bank-en-1 (rare-scam)

- Message: Alert from Maple Savings: a sign-in from a new device was blocked. To keep your funds protected, reply with the verification digits we just messaged you.
- Expected: bank / high..critical. Why: Account-takeover phishing that asks for a code without the usual wording.
- Rules-only: FAIL no_signals/none, score 0. missed completely. Signals: none

### h-bank-vi-1 (rare-scam)

- Message: Ngân hàng Hoa Sen: giao dịch 12.500.000đ đang chờ duyệt. Nếu không phải bạn, hãy đăng nhập tại http://hoasen-bank-xacthuc.example và đọc cho nhân viên mã số vừa nhận.
- Expected: bank / high..critical. Why: Fake pending-transaction alert that asks the user to read out a code.
- Rules-only: FAIL no_signals/none, score 0. missed completely. Signals: none

### h-prize-en-1 (rare-scam)

- Message: Your number was drawn in our monthly giveaway. Collect your 500 dollar shopping credit; a 4 dollar handling charge applies. Link: https://giveaway-collect.example
- Expected: prize / high..critical. Why: Giveaway bait with a small fee and a link.
- Rules-only: FAIL no_signals/none, score 0. missed completely. Signals: none

### h-prize-vi-1 (rare-scam)

- Message: Chương trình tri ân khách hàng: số điện thoại của bạn trúng 1 chiếc xe máy. Liên hệ ngay và nộp lệ phí trước bạ 1,5 triệu để nhận xe.
- Expected: prize / high..critical. Why: Big-prize lure that asks for a registration fee first.
- Rules-only: FAIL no_signals/none, score 0. missed completely. Signals: none

### h-job-en-1 (rare-scam)

- Message: Earn 80 dollars per hour from home labeling images, flexible hours. Our recruiter will interview you on Telegram. The starter kit costs 60 dollars, repaid with your first payout.
- Expected: job-bait / high..critical. Why: Remote-work bait with a starter-kit fee and a Telegram interview.
- Rules-only: FAIL no_signals/none, score 0. missed completely. Signals: none

### h-job-vi-1 (rare-scam)

- Message: Tuyển nhân viên tăng tương tác mạng xã hội, lương 400k mỗi ngày, trả lương cuối ngày. Nhắn Zalo bộ phận tuyển dụng để nhận việc, đóng 300k tiền bảo đảm.
- Expected: job-bait / high..critical. Why: Easy-pay job bait with a security deposit and a Zalo hand-off.
- Rules-only: FAIL suspicious/generic, score 40. level too low (suspicious/generic, wanted at least high). Signals: text.off-platform

### h-auth-en-1 (rare-scam)

- Message: Final reminder from the Traffic Enforcement Office: an unpaid violation will lead to license suspension. Settle the penalty today at https://traffic-penalty-pay.example to avoid court action.
- Expected: authority / high..critical. Why: Traffic-fine impersonation with a court threat and a payment link.
- Rules-only: FAIL no_signals/none, score 0. missed completely. Signals: none

### h-auth-vi-1 (rare-scam)

- Message: Bảo hiểm xã hội thông báo: hồ sơ của bạn bị treo do khai báo sai. Chuyển khoản phí chỉnh sửa vào tài khoản của cán bộ và không chia sẻ với người nhà.
- Expected: authority / high..critical. Why: Agency impersonation with a fee to a personal account and secrecy.
- Rules-only: FAIL no_signals/none, score 0. missed completely. Signals: none

### h-look-vi-2 (lookalike)

- Message: Nhận ngay voucher giảm 10% khi mua hàng tại cửa hàng, áp dụng đến hết Chủ nhật. Đưa tin nhắn này cho thu ngân.
- Expected: none / no_signals..suspicious. Why: Real store promotion with voucher wording, no fee and no link.
- Rules-only: FALSE_ALARM high/prize, score 60. raised to high/prize. Signals: text.prize-reward

