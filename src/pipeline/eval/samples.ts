/**
 * Evaluation set for rules tuning (rules-tuning-v1).
 *
 * Synthetic only: fake brands, URLs on the `.example` TLD, no real person,
 * no phone or account number. Test-only module: import it from test files
 * and do not re-export it from `src/pipeline/index.ts`.
 */

import type { RiskLevel } from "../../core";
import type { SpecificMonsterId } from "../monsters.config";

export interface EvalSample {
  readonly id: string;
  readonly locale: "en" | "vi";
  readonly text: string;
  readonly expectedMonster: SpecificMonsterId | null;
  readonly minLevel: RiskLevel;
}

export const EVAL_SAMPLES: readonly EvalSample[] = [
  // --- bank ---
  {
    id: "bank-en-1",
    locale: "en",
    text: "[ABC Bank] Your account will be locked in 24 hours. Verify now at http://abc-bank-verify.example/login and reply with the OTP.",
    expectedMonster: "bank",
    minLevel: "critical",
  },
  {
    id: "bank-en-2",
    locale: "en",
    text: "Zeta Bank security alert: unusual login detected. Confirm your card number and the code we just texted you at http://zeta-bank-secure.example/confirm.",
    expectedMonster: "bank",
    minLevel: "critical",
  },
  {
    id: "bank-en-3",
    locale: "en",
    text: "Dear customer, your debit card has been suspended. Send us your OTP to reactivate it today.",
    expectedMonster: "bank",
    minLevel: "critical",
  },
  {
    id: "bank-en-4",
    locale: "en",
    text: "Northwind Bank: we could not verify your account. Enter your online banking password at http://northwind-bank-help.example within 24 hours or your account will be suspended.",
    expectedMonster: "bank",
    minLevel: "critical",
  },
  {
    id: "bank-en-5",
    locale: "en",
    text: "Zeta Bank security team: your account has been locked. Verify your account at http://zeta-bank-unlock.example/login.",
    expectedMonster: "bank",
    minLevel: "critical",
  },
  {
    id: "bank-vi-1",
    locale: "vi",
    text: "[Ngân hàng ABC] Tài khoản của quý khách sẽ bị khóa trong 24h. Vui lòng xác minh tại http://abc-bank-verify.example/login và cung cấp mã OTP.",
    expectedMonster: "bank",
    minLevel: "critical",
  },

  // --- prize ---
  {
    id: "prize-en-1",
    locale: "en",
    text: "Congratulations! You have won a 1000 dollar gift card. Pay a small shipping fee within 1 hour to claim it.",
    expectedMonster: "prize",
    minLevel: "high",
  },
  {
    id: "prize-en-2",
    locale: "en",
    text: "You are our lucky winner! Claim your prize today, just pay the processing fee at http://mega-prize-claim.example.",
    expectedMonster: "prize",
    minLevel: "critical",
  },
  {
    id: "prize-en-3",
    locale: "en",
    text: "Unclaimed refund of 450 dollars is waiting for you. Claim your refund now and send your card number.",
    expectedMonster: "prize",
    minLevel: "critical",
  },
  {
    id: "prize-en-4",
    locale: "en",
    text: "Congratulations, you are selected for a free holiday voucher. Transfer a 20 dollar handling fee to receive it.",
    expectedMonster: "prize",
    minLevel: "high",
  },
  {
    id: "prize-vi-1",
    locale: "vi",
    text: "Chúc mừng bạn trúng thưởng 1000 đô. Trả phí vận chuyển trong 1 giờ để nhận quà.",
    expectedMonster: "prize",
    minLevel: "high",
  },

  // --- job-bait ---
  {
    id: "job-en-1",
    locale: "en",
    text: "We are hiring online assistants. Earn 500 dollars a day with easy tasks. Message us on Telegram and pay a small deposit to start.",
    expectedMonster: "job-bait",
    minLevel: "high",
  },
  {
    id: "job-en-2",
    locale: "en",
    text: "Work from home, no experience needed. Earn 200 dollars per day liking videos. Add me on Telegram to get started.",
    expectedMonster: "job-bait",
    minLevel: "high",
  },
  {
    id: "job-en-3",
    locale: "en",
    text: "Part-time job offer: simple tasks, 300 dollars a day. Pay a registration fee to activate your account and keep this secret.",
    expectedMonster: "job-bait",
    minLevel: "high",
  },
  {
    id: "job-en-4",
    locale: "en",
    text: "Hi, I found your resume. We are hiring online with flexible hours, earn 150 dollars daily. Contact me on WhatsApp and pay a training deposit.",
    expectedMonster: "job-bait",
    minLevel: "high",
  },
  {
    id: "job-vi-1",
    locale: "vi",
    text: "Tuyển nhân viên làm việc online, không cần kinh nghiệm, thu nhập 500 nghìn mỗi ngày. Liên hệ qua Zalo và nộp phí đặt cọc để bắt đầu.",
    expectedMonster: "job-bait",
    minLevel: "critical",
  },

  // --- authority ---
  {
    id: "auth-en-1",
    locale: "en",
    text: "This is the tax office. You are under investigation. Do not tell anyone and transfer money to a secure account today.",
    expectedMonster: "authority",
    minLevel: "critical",
  },
  {
    id: "auth-en-2",
    locale: "en",
    text: "Police department notice: an arrest warrant has been issued in your name. Pay a fine today to avoid legal action.",
    expectedMonster: "authority",
    minLevel: "critical",
  },
  {
    id: "auth-en-3",
    locale: "en",
    text: "Courier company: your parcel is held at customs. Pay the release fee today or legal action will follow.",
    expectedMonster: "authority",
    minLevel: "critical",
  },
  {
    id: "auth-en-4",
    locale: "en",
    text: "Final notice from the court: a court summons has been issued. Send money today to settle the case and do not discuss this with anyone.",
    expectedMonster: "authority",
    minLevel: "critical",
  },
  {
    id: "auth-vi-1",
    locale: "vi",
    text: "Tôi là cán bộ công an, bạn liên quan vụ rửa tiền. Không được nói với ai, chuyển tiền vào tài khoản an toàn.",
    expectedMonster: "authority",
    minLevel: "critical",
  },

  // --- benign (English) ---
  {
    id: "ben-en-1",
    locale: "en",
    text: "Your ABC Bank balance has changed. Check the bank app for details.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-en-2",
    locale: "en",
    text: "Your one-time code is 482913. Never share this code with anyone. We will never ask for it.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-en-3",
    locale: "en",
    text: "Thanks for your order #10234. It will ship in 24 hours and you can track it in your account.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-en-4",
    locale: "en",
    text: "Your parcel from Example Store is out for delivery today. No action is needed.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-en-5",
    locale: "en",
    text: "Meeting invitation: project sync tomorrow at 3pm in room B. Please confirm your attendance.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-en-6",
    locale: "en",
    text: "Mom: can you send me some money for dinner tonight? I will pay you back on Friday.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-en-7",
    locale: "en",
    text: "Receipt: your monthly subscription of 9.99 dollars was renewed. Manage it in your account settings.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-en-8",
    locale: "en",
    text: "Hi Sam, thanks for applying. Your interview is on Thursday at 10am at our office. Please bring a copy of your resume.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-en-9",
    locale: "en",
    text: "Reminder: your appointment is tomorrow at 9am. Reply YES to confirm.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-en-10",
    locale: "en",
    text: "Your verification code is 771204. It expires in 10 minutes. Do not share it with anyone.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-en-11",
    locale: "en",
    text: "Your card ending in 4521 was used for a 25 dollar purchase at Example Store. If this was not you, call the number on the back of your card.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-en-12",
    locale: "en",
    text: "We are hiring a sales assistant. The job is full time and the salary is paid monthly. Apply on our company website.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-en-13",
    locale: "en",
    text: "Your payment of 120 dollars was received. Thank you for paying your invoice.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-en-14",
    locale: "en",
    text: "Congratulations on your new job! Dinner on Saturday?",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-en-15",
    locale: "en",
    text: "Your ABC Bank OTP is 553201. Do not share your OTP with anyone, including bank staff.",
    expectedMonster: null,
    minLevel: "no_signals",
  },

  // --- benign (Vietnamese) ---
  {
    id: "ben-vi-1",
    locale: "vi",
    text: "Số dư tài khoản của bạn đã thay đổi. Xem chi tiết trong ứng dụng ngân hàng.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-vi-2",
    locale: "vi",
    text: "Mã xác thực của bạn là 482913. Tuyệt đối không chia sẻ mã này với bất kỳ ai.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-vi-3",
    locale: "vi",
    text: "Mai 8h họp nhóm ở phòng 302 nhé, nhớ mang laptop.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-vi-4",
    locale: "vi",
    text: "Mẹ ơi, tối nay con cần ít tiền đi ăn với bạn, mẹ gửi cho con nhé.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-vi-5",
    locale: "vi",
    text: "Đơn hàng #10234 của bạn đã được xác nhận và sẽ giao vào thứ Hai.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-vi-6",
    locale: "vi",
    text: "Lịch phỏng vấn của bạn là 10h sáng thứ Năm tại văn phòng công ty. Vui lòng mang theo CV.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "ben-vi-7",
    locale: "vi",
    text: "Quý khách tuyệt đối không cung cấp mã OTP cho bất kỳ ai, kể cả nhân viên ngân hàng.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  // Batch 2 (rules-tuning-v2): written without seeing the configuration.
  {
    id: "b2-bank-en-1",
    locale: "en",
    text: "NORTHFIELD BANK ALERT: Unusual sign-in detected. To keep your card active, confirm your identity today at https://northfield-secure.example/confirm and enter the code we text you.",
    expectedMonster: "bank",
    minLevel: "high",
  },
  {
    id: "b2-job-en-1",
    locale: "en",
    text: "Part-time remote opportunity! No experience needed, make $300 daily from your phone. Just a one-time registration fee of $20 to get your account activated. Chat with our manager on WhatsApp.",
    expectedMonster: "job-bait",
    minLevel: "high",
  },
  {
    id: "b2-auth-en-1",
    locale: "en",
    text: "Final notice from the Revenue Service: unpaid taxes of $2,400. A warrant will be issued unless you pay immediately by gift cards. Do not discuss this with anyone.",
    expectedMonster: "authority",
    minLevel: "high",
  },
  {
    id: "b2-prize-en-1",
    locale: "en",
    text: "You are our lucky winner of a free holiday trip! Claim now before midnight, only a small processing fee required. Reply YES.",
    expectedMonster: "prize",
    minLevel: "high",
  },
  {
    id: "b2-auth-vi-1",
    locale: "vi",
    text: "Công an quận thông báo: bạn có liên quan đến đường dây rửa tiền. Không được tiết lộ cho ai, hãy chuyển tiền vào tài khoản tạm giữ ngay hôm nay.",
    expectedMonster: "authority",
    minLevel: "high",
  },
  {
    id: "b2-ben-en-1",
    locale: "en",
    text: "Use 739204 to sign in to Acme Mail. Never give this code to anyone, even if they say they work for Acme.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "b2-ben-en-2",
    locale: "en",
    text: "Hi! The interview for the designer role is Thursday at 2pm. Please bring your portfolio. No fee or paperwork is needed beforehand.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "b2-ben-en-3",
    locale: "en",
    text: "Mum: can you send me the money for the electricity bill? I will pay you back on Friday.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "b2-ben-en-4",
    locale: "en",
    text: "Your Northfield Bank statement for October is ready. Open the app to view it.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
  {
    id: "b2-ben-vi-1",
    locale: "vi",
    text: "Mai mình họp lúc 9h nhé, nhớ mang laptop và chuyển khoản tiền ăn trưa cho mình sau.",
    expectedMonster: null,
    minLevel: "no_signals",
  },
];
