# TrickHunt message probe report

Generated: 2026-11-17T04:35:35.511Z

Messages: 16. Modes: rules-only.

All messages are synthetic. Status meanings: PASS = matches expectation; FAIL = scam missed, too low or wrong monster; GAP = out-of-scope scam with no signal; FALSE_ALARM = harmless message raised too high.

## Summary: rules-only

| Category | Total | PASS | FAIL | GAP | FALSE_ALARM |
|---|---|---|---|---|---|
| rare-scam | 8 | 0 | 8 | 0 | 0 |
| out-of-scope-scam | 0 | 0 | 0 | 0 | 0 |
| evasion-scam | 0 | 0 | 0 | 0 | 0 |
| benign | 3 | 3 | 0 | 0 | 0 |
| lookalike | 5 | 5 | 0 | 0 | 0 |

### Monster confusion: rules-only

| Expected \ Observed | bank | prize | job-bait | authority | generic | none |
|---|---|---|---|---|---|---|
| bank | 0 | 0 | 0 | 0 | 0 | 2 |
| prize | 0 | 0 | 0 | 0 | 0 | 2 |
| job-bait | 0 | 0 | 0 | 0 | 0 | 2 |
| authority | 0 | 0 | 0 | 0 | 1 | 1 |
| generic | 0 | 0 | 0 | 0 | 0 | 0 |
| none | 0 | 0 | 0 | 0 | 1 | 7 |

## rare-scam

| Id | Lang | Message | Expected | Rules-only |
|---|---|---|---|---|
| h2-bank-en-1 | en | Westbridge Bank: we noticed a payment attempt you may not recognise. … | bank / high..critical | FAIL no_signals/none (0) |
| h2-bank-vi-1 | vi | Ngân hàng Bình Minh thông báo thẻ của quý khách bị tạm khóa do nghi n… | bank / high..critical | FAIL no_signals/none (0) |
| h2-prize-en-1 | en | Hooray! Your phone number came first in the anniversary lucky draw. A… | prize / high..critical | FAIL no_signals/none (0) |
| h2-prize-vi-1 | vi | Tài khoản của bạn được tặng 500.000đ từ chương trình sinh nhật ví. Bấ… | prize / high..critical | FAIL no_signals/none (0) |
| h2-job-en-1 | en | Good news, you passed our screening for a part-time reviewer role. Ea… | job-bait / high..critical | FAIL no_signals/none (0) |
| h2-job-vi-1 | vi | Shop cần CTV xem video và bấm thích, mỗi lượt 15k, ngày kiếm 500k dễ … | job-bait / high..critical | FAIL no_signals/none (0) |
| h2-auth-en-1 | en | Customs and Border Office: a package in your name contained restricte… | authority / high..critical | FAIL no_signals/none (0) |
| h2-auth-vi-1 | vi | Cục quản lý thị trường thông báo cửa hàng của bạn vi phạm và bị phạt … | authority / high..critical | FAIL suspicious/generic (40) |

## benign

| Id | Lang | Message | Expected | Rules-only |
|---|---|---|---|---|
| h2-ben-en-1 | en | The plumber can come on Thursday morning. Does 9am work for you? | none / no_signals | PASS no_signals/none (0) |
| h2-ben-vi-1 | vi | Tối nay cả nhà ăn cơm sớm nhé, 6h30 bố về. | none / no_signals | PASS no_signals/none (0) |
| h2-ben-en-2 | en | Your gym class tomorrow at 7am has two spots left. | none / no_signals | PASS no_signals/none (0) |

## lookalike

| Id | Lang | Message | Expected | Rules-only |
|---|---|---|---|---|
| h2-look-en-1 | en | Westbridge Bank reminder: scammers may pretend to be us and say your … | none / no_signals..suspicious | PASS no_signals/none (0) |
| h2-look-vi-1 | vi | Cảnh báo: kẻ lừa đảo đang giả danh công an gọi điện, nói bạn liên qua… | none / no_signals..suspicious | PASS suspicious/generic (35) |
| h2-look-en-2 | en | Your 6 dollar refund for the cancelled ride is on its way to your ori… | none / no_signals..suspicious | PASS no_signals/none (0) |
| h2-look-vi-2 | vi | Chúc mừng cả nhóm đã hoàn thành dự án! Công ty thưởng mỗi người một n… | none / no_signals..suspicious | PASS no_signals/none (0) |
| h2-look-en-3 | en | Reminder: the school trip costs 15 dollars, please pay at the front o… | none / no_signals..suspicious | PASS no_signals/none (0) |

## Mismatches in detail

### h2-bank-en-1 (rare-scam)

- Message: Westbridge Bank: we noticed a payment attempt you may not recognise. Our agent will call you shortly; please read back the one-time passcode to confirm it is you.
- Expected: bank / high..critical. Why: Fake bank call set-up that asks the user to read out a passcode.
- Rules-only: FAIL no_signals/none, score 0. missed completely. Signals: none

### h2-bank-vi-1 (rare-scam)

- Message: Ngân hàng Bình Minh thông báo thẻ của quý khách bị tạm khóa do nghi ngờ gian lận. Vui lòng điền số thẻ, ngày hết hạn và mã CVV tại http://binhminh-the.example để mở lại.
- Expected: bank / high..critical. Why: Card-unlock phishing asking for card number, expiry and CVV.
- Rules-only: FAIL no_signals/none, score 0. missed completely. Signals: none

### h2-prize-en-1 (rare-scam)

- Message: Hooray! Your phone number came first in the anniversary lucky draw. A brand new laptop is reserved for you. Settle the 7 dollar courier charge here: https://anniversary-draw.example
- Expected: prize / high..critical. Why: Lucky-draw bait with a small courier fee and a link.
- Rules-only: FAIL no_signals/none, score 0. missed completely. Signals: none

### h2-prize-vi-1 (rare-scam)

- Message: Tài khoản của bạn được tặng 500.000đ từ chương trình sinh nhật ví. Bấm vào http://vi-sinhnhat.example và xác nhận thông tin thẻ để nhận tiền ngay.
- Expected: prize / high..critical. Why: Unexpected gift that ends in a card-detail request.
- Rules-only: FAIL no_signals/none, score 0. missed completely. Signals: none

### h2-job-en-1 (rare-scam)

- Message: Good news, you passed our screening for a part-time reviewer role. Earn up to 300 dollars a day rating hotels. Activate your worker account with a 50 dollar top-up. Our coordinator is on WhatsApp.
- Expected: job-bait / high..critical. Why: Review-job bait with an activation top-up and a WhatsApp hand-off.
- Rules-only: FAIL no_signals/none, score 0. missed completely. Signals: none

### h2-job-vi-1 (rare-scam)

- Message: Shop cần CTV xem video và bấm thích, mỗi lượt 15k, ngày kiếm 500k dễ dàng. Thêm Telegram để được hướng dẫn, nạp 200k để mở nhiệm vụ VIP.
- Expected: job-bait / high..critical. Why: Like-and-earn task scam with a top-up to unlock tasks.
- Rules-only: FAIL no_signals/none, score 0. missed completely. Signals: none

### h2-auth-en-1 (rare-scam)

- Message: Customs and Border Office: a package in your name contained restricted items. To prevent prosecution, pay the inspection penalty within two hours and tell no one about this case.
- Expected: authority / high..critical. Why: Customs impersonation with a prosecution threat, a fee and secrecy.
- Rules-only: FAIL no_signals/none, score 0. missed completely. Signals: none

### h2-auth-vi-1 (rare-scam)

- Message: Cục quản lý thị trường thông báo cửa hàng của bạn vi phạm và bị phạt 12 triệu. Chuyển tiền nộp phạt cho cán bộ phụ trách trước 17h hôm nay để không bị đình chỉ kinh doanh.
- Expected: authority / high..critical. Why: Market-authority impersonation demanding a fine to an officer.
- Rules-only: FAIL suspicious/generic, score 40. level too low (suspicious/generic, wanted at least high). Signals: text.threat

