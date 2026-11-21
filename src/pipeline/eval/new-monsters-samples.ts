/**
 * Evaluation set for new-monsters-v1 (Profit Goblin and Heart Wraith).
 *
 * Synthetic only: no real brand, no link, no digit run of 8 or more.
 * Test-only module: import it from test files and do not re-export it from
 * `src/pipeline/index.ts`. It is separate from `EVAL_SAMPLES` on purpose
 * (REQ-PIPE-79, REQ-PIPE-80).
 */

import type { RiskLevel } from "../../core";

export type NmKind = "investment" | "romance" | "benign";

export interface NmSample {
  readonly id: string;
  readonly locale: "en" | "vi";
  readonly text: string;
  readonly kind: NmKind;
  readonly expectedMonster: "investment" | "romance" | null;
  /** Lowest level accepted in Rules_Mode (no AI layer). */
  readonly minLevelRules: RiskLevel;
  /** Lowest level accepted in Fake_Mode (fake AI layer returns the type's signals). */
  readonly minLevelFake: RiskLevel;
  /** True when Rules_Mode is expected to reach `high` and name the monster. */
  readonly rulesHighMonster: boolean;
}

function scam(
  id: string,
  locale: "en" | "vi",
  kind: "investment" | "romance",
  text: string,
  rulesHighMonster: boolean,
): NmSample {
  return {
    id,
    locale,
    text,
    kind,
    expectedMonster: kind,
    minLevelRules: "suspicious",
    minLevelFake: "high",
    rulesHighMonster,
  };
}

function benign(id: string, locale: "en" | "vi", text: string): NmSample {
  return {
    id,
    locale,
    text,
    kind: "benign",
    expectedMonster: null,
    minLevelRules: "no_signals",
    minLevelFake: "no_signals",
    rulesHighMonster: false,
  };
}

export const NM_SAMPLES: readonly NmSample[] = [
  // --- investment scams ---
  scam(
    "nm-inv-en-1",
    "en",
    "investment",
    "Our private trading group posted 35% returns this week. Deposit $300 to join the VIP channel before the spots run out.",
    false,
  ),
  scam(
    "nm-inv-en-2",
    "en",
    "investment",
    "Risk-free crypto investment, guaranteed 2% profit every day. Send your first deposit to start earning today.",
    true,
  ),
  scam(
    "nm-inv-en-3",
    "en",
    "investment",
    "A friend recommended our trading bot, it doubled his money in a month. Register now and add funds to activate it.",
    true,
  ),
  scam(
    "nm-inv-vi-1",
    "vi",
    "investment",
    "Nhóm đầu tư kín cam kết lợi nhuận 5% mỗi ngày, nạp 2 triệu để tham gia ngay hôm nay.",
    true,
  ),

  // --- romance scams ---
  scam(
    "nm-rom-en-1",
    "en",
    "romance",
    "Hello dear, I know we only talked for a week but I feel we are meant to be together. I am a doctor working overseas and I need your help to pay the customs fee for my package, please send a gift card.",
    false,
  ),
  scam(
    "nm-rom-en-2",
    "en",
    "romance",
    "My love, my bank account is frozen while I travel abroad. Can you send me money for a flight ticket to come and see you? I will repay you when I arrive.",
    false,
  ),
  scam(
    "nm-rom-en-3",
    "en",
    "romance",
    "I have never felt this connected to anyone. I am stuck at a foreign port and need $400 for the repair of my ship, please keep this between us.",
    false,
  ),
  scam(
    "nm-rom-vi-1",
    "vi",
    "romance",
    "Anh rất yêu em dù chúng ta mới quen một tuần. Anh đang công tác nước ngoài và bị khóa thẻ, em gửi giúp anh tiền mua vé máy bay nhé, đừng nói với ai.",
    false,
  ),

  // --- benign ---
  benign(
    "nm-ben-en-1",
    "en",
    "Bitcoin rose 3% today according to the morning news, the market is volatile.",
  ),
  benign(
    "nm-ben-en-2",
    "en",
    "Our bank's savings account now offers a 4% annual rate. See the terms in the app.",
  ),
  benign(
    "nm-ben-en-3",
    "en",
    "I read that index funds usually return more than savings accounts over many years, interesting article.",
  ),
  benign(
    "nm-ben-en-4",
    "en",
    "Join our hiking group on Telegram, we meet on Saturdays at 8am.",
  ),
  benign(
    "nm-ben-en-5",
    "en",
    "Our running club grew by 40% last month, thanks everyone for inviting friends.",
  ),
  benign(
    "nm-ben-en-6",
    "en",
    "I miss you so much, the flight lands at 6pm and I will see you at the airport.",
  ),
  benign(
    "nm-ben-en-7",
    "en",
    "My brother is deployed overseas this year and we video call every Sunday.",
  ),
  benign(
    "nm-ben-en-8",
    "en",
    "Can you buy a gift card for Mum's birthday? I will transfer you the money tonight.",
  ),
  benign(
    "nm-ben-en-9",
    "en",
    "I am working overseas this year, I will be home in June and we can celebrate then.",
  ),
  benign(
    "nm-ben-en-10",
    "en",
    "Congrats on the engagement! We feel so happy for you both.",
  ),
  benign(
    "nm-ben-vi-1",
    "vi",
    "Anh nhớ em nhiều, tối nay anh gọi video cho em nhé.",
  ),
  benign(
    "nm-ben-vi-2",
    "vi",
    "Công ty mình đang đầu tư thêm máy móc mới cho xưởng, tháng sau lắp xong.",
  ),
];
