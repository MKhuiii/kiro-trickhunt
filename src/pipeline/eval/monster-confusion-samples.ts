/**
 * Confusion set for monster-disambiguation-v1.
 *
 * Messages that are easy to give the wrong monster (romance vs job-bait,
 * investment vs prize or job-bait, bank vs authority) plus benign messages
 * that look similar. Synthetic only: no real brand, no link, no digit run of
 * 8 or more. Test-only module: do not re-export it from `src/pipeline/index.ts`.
 *
 * `aiOld` is what the AI layer typically returns with the six original
 * semantic ids. `aiNew` adds the two ids of this spec. Both are used with a
 * fake LLM client at severity 0.45; no network.
 */

export type McExpected =
  | "romance"
  | "investment"
  | "job-bait"
  | "bank"
  | "authority"
  | "prize"
  | null;

export interface McSample {
  readonly id: string;
  readonly locale: "en" | "vi";
  readonly text: string;
  /** `null` means benign: level at most `suspicious`, monster `null` or `generic`. */
  readonly expectedMonster: McExpected;
  readonly aiOld: readonly string[];
  readonly aiNew: readonly string[];
}

const NEW_ROMANCE = "semantic.romance-money-story";
const NEW_INVESTMENT = "semantic.investment-scheme";

function s(
  id: string,
  locale: "en" | "vi",
  expectedMonster: McExpected,
  aiOld: readonly string[],
  aiNew: readonly string[],
  text: string,
): McSample {
  return { id, locale, text, expectedMonster, aiOld, aiNew };
}

export const MC_SAMPLES: readonly McSample[] = [
  // Romance: often mistaken for job-bait or generic.
  s(
    "mc-rom-1",
    "en",
    "romance",
    ["semantic.relationship-or-job-bait", "semantic.emotional-manipulation"],
    [NEW_ROMANCE, "semantic.relationship-or-job-bait", "semantic.emotional-manipulation"],
    "Hey stranger, I know this is random but I feel we have a real connection. I am working overseas on an oil rig and my account got frozen. Could you buy a gift card for me? I will pay you back when I am home.",
  ),
  s(
    "mc-rom-2",
    "en",
    "romance",
    ["semantic.relationship-or-job-bait", "semantic.emotional-manipulation"],
    [NEW_ROMANCE, "semantic.relationship-or-job-bait", "semantic.emotional-manipulation"],
    "Hi, I am a soldier on a peacekeeping mission. You seem so kind. My card is blocked and I need $500 for my leave papers. I will send it back once I land.",
  ),
  s(
    "mc-rom-3",
    "vi",
    "romance",
    ["semantic.relationship-or-job-bait", "semantic.emotional-manipulation"],
    [NEW_ROMANCE, "semantic.relationship-or-job-bait", "semantic.emotional-manipulation"],
    "Em ơi, anh là kỹ sư ở giàn khoan ngoài khơi, thấy em hiền lắm. Thẻ anh bị khóa, em chuyển giúp anh ít tiền nhé, về anh trả em.",
  ),
  // Investment: often mistaken for prize or job-bait.
  s(
    "mc-inv-1",
    "en",
    "investment",
    ["semantic.too-good-to-be-true", "semantic.pressure-escalation"],
    [NEW_INVESTMENT, "semantic.too-good-to-be-true", "semantic.pressure-escalation"],
    "Our analyst team signals 3% gain daily. Top up $200 and we will activate your plan today, spots are limited.",
  ),
  s(
    "mc-inv-2",
    "vi",
    "investment",
    ["semantic.too-good-to-be-true", "semantic.isolation-secrecy"],
    [NEW_INVESTMENT, "semantic.too-good-to-be-true", "semantic.isolation-secrecy"],
    "Bạn được mời vào nhóm đầu tư độc quyền, lãi đều mỗi tuần. Đóng phí thành viên là được hướng dẫn từng bước.",
  ),
  s(
    "mc-inv-3",
    "en",
    "investment",
    ["semantic.too-good-to-be-true", "semantic.pressure-escalation"],
    [NEW_INVESTMENT, "semantic.too-good-to-be-true", "semantic.pressure-escalation"],
    "Congratulations, you were picked for our early crypto airdrop. Join the private channel and pay the activation fee to claim your coins.",
  ),
  // Real job-bait: must stay job-bait.
  s(
    "mc-job-1",
    "en",
    "job-bait",
    ["semantic.too-good-to-be-true", "semantic.relationship-or-job-bait"],
    ["semantic.too-good-to-be-true", "semantic.relationship-or-job-bait"],
    "We are hiring remote data entry, $300 per day, no experience. Message us on Telegram and pay a small training fee to start.",
  ),
  s(
    "mc-job-2",
    "en",
    "job-bait",
    [
      "semantic.relationship-or-job-bait",
      "semantic.too-good-to-be-true",
      "semantic.isolation-secrecy",
    ],
    [
      "semantic.relationship-or-job-bait",
      "semantic.too-good-to-be-true",
      "semantic.isolation-secrecy",
    ],
    "Hello, I saw your CV. Easy part-time job, like and rate products, earn $50 an hour. Add me on WhatsApp.",
  ),
  // Other monsters: must not be pulled to the new ones.
  s(
    "mc-bank-1",
    "en",
    "bank",
    ["semantic.impersonation-tone", "semantic.pressure-escalation"],
    ["semantic.impersonation-tone", "semantic.pressure-escalation"],
    "Your bank account is locked. Enter your OTP at the link to unlock within 24 hours.",
  ),
  s(
    "mc-auth-1",
    "en",
    "authority",
    [
      "semantic.impersonation-tone",
      "semantic.pressure-escalation",
      "semantic.isolation-secrecy",
    ],
    [
      "semantic.impersonation-tone",
      "semantic.pressure-escalation",
      "semantic.isolation-secrecy",
    ],
    "This is the police. A case is opened under your name. Transfer money to the safe account now and do not tell anyone.",
  ),
  // Benign look-alikes: at most suspicious, monster null or generic.
  s(
    "mc-ben-1",
    "en",
    null,
    [],
    [],
    "I'm on the oil rig until June, miss you all. Please send mum a gift card for her birthday from me, I'll pay you back at Christmas.",
  ),
  s(
    "mc-ben-2",
    "en",
    null,
    [],
    [],
    "Our investment club meets Thursday to discuss index funds. No fees, bring your questions.",
  ),
  s(
    "mc-ben-3",
    "en",
    null,
    [],
    [],
    "My boyfriend works overseas and we video call daily. He asked me to buy a gift card for his sister, I'll pay him back.",
  ),
  s(
    "mc-ben-4",
    "vi",
    null,
    [],
    [],
    "Công ty đang tuyển nhân viên kế toán, gửi CV về phòng nhân sự, phỏng vấn thứ Hai.",
  ),
];
