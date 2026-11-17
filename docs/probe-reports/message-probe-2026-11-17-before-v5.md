# TrickHunt message probe report

Generated: 2026-11-17T04:35:31.266Z

Messages: 53. Modes: rules-only.

All messages are synthetic. Status meanings: PASS = matches expectation; FAIL = scam missed, too low or wrong monster; GAP = out-of-scope scam with no signal; FALSE_ALARM = harmless message raised too high.

## Summary: rules-only

| Category | Total | PASS | FAIL | GAP | FALSE_ALARM |
|---|---|---|---|---|---|
| rare-scam | 17 | 15 | 2 | 0 | 0 |
| out-of-scope-scam | 10 | 0 | 0 | 10 | 0 |
| evasion-scam | 0 | 0 | 0 | 0 | 0 |
| benign | 12 | 12 | 0 | 0 | 0 |
| lookalike | 14 | 11 | 0 | 0 | 3 |

### Monster confusion: rules-only

| Expected \ Observed | bank | prize | job-bait | authority | generic | none |
|---|---|---|---|---|---|---|
| bank | 4 | 0 | 0 | 0 | 0 | 0 |
| prize | 0 | 4 | 0 | 0 | 0 | 0 |
| job-bait | 0 | 0 | 3 | 0 | 2 | 0 |
| authority | 0 | 0 | 0 | 4 | 0 | 0 |
| generic | 0 | 0 | 0 | 0 | 0 | 10 |
| none | 0 | 2 | 0 | 0 | 9 | 15 |

## rare-scam

| Id | Lang | Message | Expected | Rules-only |
|---|---|---|---|---|
| rare-bank-en-1 | en | Hi, this is Ellen from the Harbor Credit Union fraud desk. We blocked… | bank / high..critical | PASS critical/bank (80) |
| rare-bank-en-2 | en | Harbor Credit Union: your debit card was deactivated. Re-enter your c… | bank / high..critical | PASS critical/bank (84) |
| rare-bank-vi-1 | vi | Ngân hàng Sao Mai: Dịch vụ SMS Banking của bạn sắp hết hạn. Truy cập … | bank / high..critical | PASS critical/bank (80) |
| rare-bank-vi-2 | vi | Cổng dịch vụ công thông báo: tài khoản định danh điện tử của bạn chưa… | bank / high..critical | PASS critical/bank (80) |
| rare-prize-en-1 | en | Loyalty rewards: your points worth 250 dollars expire tonight. Choose… | prize / high..critical | PASS high/prize (60) |
| rare-prize-en-2 | en | Survey winner! Complete our 2-minute survey and receive a free smartp… | prize / high..critical | PASS high/prize (60) |
| rare-prize-vi-1 | vi | Bạn là khách hàng may mắn tháng này của siêu thị Hoa Mai, nhận ngay v… | prize / high..critical | PASS critical/prize (80) |
| rare-prize-vi-2 | vi | Bạn được hoàn thuế thu nhập cá nhân 3.200.000đ. Nhận tiền hoàn trong … | prize / suspicious..critical | PASS high/prize (60) |
| rare-job-en-1 | en | Hello! We help online stores boost product ratings and pay 10-20% com… | job-bait / high..critical | PASS critical/job-bait (80) |
| rare-job-en-2 | en | Dear applicant, we offer a remote data entry job with a salary of 400… | job-bait / high..critical | FAIL suspicious/generic (35) |
| rare-job-vi-1 | vi | Cộng tác viên thương mại điện tử: chốt đơn ảo tăng doanh số, hoa hồng… | job-bait / high..critical | PASS critical/job-bait (80) |
| rare-job-vi-2 | vi | Anh chị có muốn kiếm thêm 15 triệu mỗi tháng chỉ cần ngồi nhà đánh gi… | job-bait / high..critical | PASS critical/job-bait (80) |
| rare-job-en-3 | en | Hi dear, I am Michael, an engineer on an oil rig. I feel a real conne… | job-bait / suspicious..critical | FAIL suspicious/generic (40) |
| rare-auth-en-1 | en | Notice from the Immigration Bureau: your visa record has a discrepanc… | authority / high..critical | PASS critical/authority (80) |
| rare-auth-en-2 | en | City Power: your electricity will be disconnected today at 5pm due to… | authority / high..critical | PASS critical/authority (80) |
| rare-auth-vi-1 | vi | Điện lực thông báo: hóa đơn tiền điện tháng này đã quá hạn, ngày mai … | authority / high..critical | PASS critical/authority (80) |
| rare-auth-vi-2 | vi | Tòa án nhân dân quận gửi giấy mời làm việc về vụ tranh chấp hợp đồng … | authority / high..critical | PASS critical/authority (80) |

## out-of-scope-scam

| Id | Lang | Message | Expected | Rules-only |
|---|---|---|---|---|
| oos-toll-en | en | TollPay notice: you have an unpaid toll balance of 6.40 dollars. To a… | generic / suspicious..critical | GAP no_signals/none (0) |
| oos-quishing-en | en | Parking violation: scan the QR code on the notice on your windshield … | generic / suspicious..critical | GAP no_signals/none (0) |
| oos-wrongnumber-en | en | Hi Anna, sorry, wrong number! You seem lovely though. I trade crypto,… | generic / suspicious..critical | GAP no_signals/none (0) |
| oos-family-en | en | Grandma it's me, I got in a car accident and I'm in trouble. Please d… | generic / suspicious..critical | GAP no_signals/none (0) |
| oos-cheque-en | en | Thanks for the item! I sent a cheque for 2300 dollars, which is 800 d… | generic / suspicious..critical | GAP no_signals/none (0) |
| oos-wallet-en | en | Your wallet needs validation or you will lose your airdrop. Connect a… | generic / suspicious..critical | GAP no_signals/none (0) |
| oos-zalo-vi | vi | Anh ơi em đây, Zalo em bị mất nên dùng số mới. Anh chuyển giúp em 8 t… | generic / suspicious..critical | GAP no_signals/none (0) |
| oos-stock-vi | vi | Mời bạn vào nhóm đầu tư chứng khoán, chuyên gia hướng dẫn lợi nhuận 5… | generic / suspicious..critical | GAP no_signals/none (0) |
| oos-loan-vi | vi | Vay nhanh 50 triệu không cần thế chấp, giải ngân trong 15 phút. Để gi… | generic / suspicious..critical | GAP no_signals/none (0) |
| oos-rental-vi | vi | Căn hộ 2 phòng ngủ giá chỉ 4 triệu, chủ nhà đang ở nước ngoài. Bạn ch… | generic / suspicious..critical | GAP no_signals/none (0) |

## benign

| Id | Lang | Message | Expected | Rules-only |
|---|---|---|---|---|
| ben-en-1 | en | Your Example Airlines flight EX204 departs at 18:40 from gate 12. Boa… | none / no_signals | PASS no_signals/none (0) |
| ben-en-2 | en | Your package was delivered to the front desk. A signature was not req… | none / no_signals | PASS no_signals/none (0) |
| ben-en-3 | en | Happy birthday! Cake at 6 on Saturday, bring nothing but yourself. | none / no_signals | PASS no_signals/none (0) |
| ben-en-4 | en | Library notice: the book you reserved is ready for pickup until Frida… | none / no_signals | PASS no_signals/none (0) |
| ben-en-5 | en | Your electricity bill for October is 84.20 dollars, due November 28. … | none / no_signals | PASS no_signals/none (0) |
| ben-en-6 | en | Dentist reminder: cleaning on Monday at 10:30. Reply C to confirm or … | none / no_signals | PASS no_signals/none (0) |
| ben-en-7 | en | The landlord says the rent is due on the 1st. I will transfer it toni… | none / no_signals | PASS no_signals/none (0) |
| ben-vi-1 | vi | Chiều nay mình đi chợ, bạn cần mua gì không? | none / no_signals | PASS no_signals/none (0) |
| ben-vi-2 | vi | Hóa đơn tiền điện tháng 10 của bạn là 482.000đ, hạn thanh toán 28/11.… | none / no_signals | PASS no_signals/none (0) |
| ben-vi-3 | vi | Lớp học thêm Toán dời sang 19h thứ Tư. Phụ huynh vui lòng xác nhận gi… | none / no_signals | PASS no_signals/none (0) |
| ben-vi-4 | vi | Chúc mừng anh được lên chức trưởng phòng! Cuối tuần đi ăn mừng nhé. | none / no_signals | PASS no_signals/none (0) |
| ben-vi-5 | vi | Đơn hàng của bạn đã được giao thành công, cảm ơn bạn đã mua sắm. | none / no_signals | PASS no_signals/none (0) |

## lookalike

| Id | Lang | Message | Expected | Rules-only |
|---|---|---|---|---|
| look-en-1 | en | Security tip from Harbor Credit Union: we will never ask for your PIN… | none / no_signals..suspicious | PASS no_signals/none (0) |
| look-en-2 | en | Fraud alert: scammers are sending fake texts saying your account has … | none / no_signals..suspicious | FALSE_ALARM high/generic (58) |
| look-en-3 | en | Reminder from the Tax Office: your annual return is due on 31 January… | none / no_signals..suspicious | PASS suspicious/generic (35) |
| look-en-4 | en | We would like to offer you the Sales Assistant position. The salary i… | none / no_signals..suspicious | PASS no_signals/none (0) |
| look-en-5 | en | Congratulations, you won the office raffle! Come to the front desk to… | none / no_signals..suspicious | FALSE_ALARM high/prize (60) |
| look-en-6 | en | Your login code is 904113. It expires today at midnight. If you did n… | none / no_signals..suspicious | PASS suspicious/generic (30) |
| look-en-7 | en | News: the police department warns residents about a courier company s… | none / no_signals..suspicious | PASS suspicious/generic (35) |
| look-en-8 | en | Reminder: buy a gift card for Sara's farewell at the shop near the of… | none / no_signals..suspicious | PASS suspicious/generic (40) |
| look-en-9 | en | Our company is hiring online for a customer support role. No experien… | none / no_signals..suspicious | PASS suspicious/generic (35) |
| look-en-10 | en | Dad, can you wire me 200 dollars for the car repair? I will pay you b… | none / no_signals..suspicious | PASS no_signals/none (0) |
| look-vi-1 | vi | Ngân hàng Sao Mai nhắc: không bao giờ cung cấp mã OTP, mật khẩu cho b… | none / no_signals..suspicious | PASS suspicious/generic (20) |
| look-vi-2 | vi | Mẹ ơi con cần chuyển tiền ngay cho mẹ tiền ăn tháng này, mẹ gửi số tà… | none / no_signals..suspicious | PASS suspicious/generic (40) |
| look-vi-3 | vi | Công an phường thông báo lịch tiếp dân vào sáng thứ Ba hàng tuần. Ngư… | none / no_signals..suspicious | PASS suspicious/generic (35) |
| look-vi-4 | vi | Chúc mừng bạn đã trúng tuyển vào vị trí nhân viên kế toán, lịch nhận … | none / no_signals..suspicious | FALSE_ALARM high/prize (60) |

## Mismatches in detail

### rare-job-en-2 (rare-scam)

- Message: Dear applicant, we offer a remote data entry job with a salary of 4000 dollars per month. To receive your work laptop, deposit 150 dollars, refunded after your first paycheck.
- Expected: job-bait / high..critical. Why: Fake equipment deposit: a real employer does not ask you to pay to start.
- Rules-only: FAIL suspicious/generic, score 35. level too low (suspicious/generic, wanted at least high). Signals: text.job-offer

### rare-job-en-3 (rare-scam)

- Message: Hi dear, I am Michael, an engineer on an oil rig. I feel a real connection with you. Please keep our friendship private. I am stuck and need you to buy gift cards for me, I will repay you soon.
- Expected: job-bait / suspicious..critical. Why: Romance scam. The monster list has no romance entry; job-bait covers relationship bait.
- Rules-only: FAIL suspicious/generic, score 40. wrong monster (suspicious/generic, wanted job-bait). Signals: text.payment-request

### oos-toll-en (out-of-scope-scam)

- Message: TollPay notice: you have an unpaid toll balance of 6.40 dollars. To avoid a 50 dollar late fee, settle it today at https://tollpay-balance.example/pay
- Expected: generic / suspicious..critical. Why: Toll-road smishing. No monster for road tolls.
- Rules-only: GAP no_signals/none, score 0. no signal at all (known gap). Signals: none

### oos-quishing-en (out-of-scope-scam)

- Message: Parking violation: scan the QR code on the notice on your windshield to pay your 35 dollar fine within 48 hours.
- Expected: generic / suspicious..critical. Why: QR-code payment lure. The text alone carries few keywords.
- Rules-only: GAP no_signals/none, score 0. no signal at all (known gap). Signals: none

### oos-wrongnumber-en (out-of-scope-scam)

- Message: Hi Anna, sorry, wrong number! You seem lovely though. I trade crypto, my uncle taught me how to earn 30% a week on a platform. Want me to show you?
- Expected: generic / suspicious..critical. Why: Pig-butchering opener: wrong number, friendliness, then an investment pitch.
- Rules-only: GAP no_signals/none, score 0. no signal at all (known gap). Signals: none

### oos-family-en (out-of-scope-scam)

- Message: Grandma it's me, I got in a car accident and I'm in trouble. Please don't tell mom and dad. Can you wire money to my lawyer today? I can't talk right now.
- Expected: generic / suspicious..critical. Why: Grandparent / family-emergency scam: secrecy, urgency, money.
- Rules-only: GAP no_signals/none, score 0. no signal at all (known gap). Signals: none

### oos-cheque-en (out-of-scope-scam)

- Message: Thanks for the item! I sent a cheque for 2300 dollars, which is 800 dollars more than the price. Please deposit it and send back the difference by Zelle today.
- Expected: generic / suspicious..critical. Why: Overpayment scam: the cheque later bounces and the refund is lost.
- Rules-only: GAP no_signals/none, score 0. no signal at all (known gap). Signals: none

### oos-wallet-en (out-of-scope-scam)

- Message: Your wallet needs validation or you will lose your airdrop. Connect and enter your 12-word recovery phrase at https://wallet-validate.example
- Expected: generic / suspicious..critical. Why: Crypto wallet drain: the recovery phrase gives full access.
- Rules-only: GAP no_signals/none, score 0. no signal at all (known gap). Signals: none

### oos-zalo-vi (out-of-scope-scam)

- Message: Anh ơi em đây, Zalo em bị mất nên dùng số mới. Anh chuyển giúp em 8 triệu vào tài khoản này gấp, mai em gửi lại. Đừng gọi cho em vì đang họp.
- Expected: generic / suspicious..critical. Why: Impersonating an acquaintance after a supposed account loss.
- Rules-only: GAP no_signals/none, score 0. no signal at all (known gap). Signals: none

### oos-stock-vi (out-of-scope-scam)

- Message: Mời bạn vào nhóm đầu tư chứng khoán, chuyên gia hướng dẫn lợi nhuận 5-10% mỗi ngày, cam kết hoàn vốn. Tải ứng dụng tại http://stockvip-app.example
- Expected: generic / suspicious..critical. Why: Investment group with guaranteed returns and a fake app.
- Rules-only: GAP no_signals/none, score 0. no signal at all (known gap). Signals: none

### oos-loan-vi (out-of-scope-scam)

- Message: Vay nhanh 50 triệu không cần thế chấp, giải ngân trong 15 phút. Để giải ngân bạn vui lòng đóng phí bảo hiểm khoản vay 5 triệu.
- Expected: generic / suspicious..critical. Why: Advance-fee loan scam: the fee is charged before any money arrives.
- Rules-only: GAP no_signals/none, score 0. no signal at all (known gap). Signals: none

### oos-rental-vi (out-of-scope-scam)

- Message: Căn hộ 2 phòng ngủ giá chỉ 4 triệu, chủ nhà đang ở nước ngoài. Bạn chuyển cọc giữ chỗ 2 triệu rồi chủ sẽ gửi chìa khóa qua bưu điện.
- Expected: generic / suspicious..critical. Why: Fake rental listing with a deposit paid before viewing.
- Rules-only: GAP no_signals/none, score 0. no signal at all (known gap). Signals: none

### look-en-2 (lookalike)

- Message: Fraud alert: scammers are sending fake texts saying your account has been locked and asking you to verify within 24 hours. Ignore them and use the official app.
- Expected: none / no_signals..suspicious. Why: Warns about scams by quoting their wording. No link, no request.
- Rules-only: FALSE_ALARM high/generic, score 58. raised to high/generic. Signals: text.threat, text.urgency

### look-en-5 (lookalike)

- Message: Congratulations, you won the office raffle! Come to the front desk to pick up your prize.
- Expected: none / no_signals..suspicious. Why: Prize wording, but a prize in person with no fee or link.
- Rules-only: FALSE_ALARM high/prize, score 60. raised to high/prize. Signals: text.prize-reward

### look-vi-4 (lookalike)

- Message: Chúc mừng bạn đã trúng tuyển vào vị trí nhân viên kế toán, lịch nhận việc là thứ Hai. Công ty không thu bất kỳ khoản phí nào.
- Expected: none / no_signals..suspicious. Why: Real job acceptance that uses the congratulation phrase.
- Rules-only: FALSE_ALARM high/prize, score 60. raised to high/prize. Signals: text.prize-reward

