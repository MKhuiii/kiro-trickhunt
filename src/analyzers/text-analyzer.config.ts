/**
 * text-analyzer.config.ts — Pattern groups and limits for the Text Analyzer.
 *
 * Pure data — no imports. Edit this file to change phrases, weights or limits
 * without touching analyzer logic or its tests (REQ-TXT-01, REQ-TXT-05,
 * NFR-TXT-01).
 *
 * Phrases may be written with or without accents. The analyzer normalizes
 * them (NFD, strip marks, đ→d, lower-case) the same way it normalizes input.
 */

/** Maximum length of a signal's `evidence` string. */
export const MAX_EVIDENCE_CHARS = 200;

/** Input is truncated to this many characters before matching. */
export const MAX_INPUT_CHARS = 20_000;

export interface TextPattern {
  /** Signal id, e.g. "text.urgency". */
  id: string;
  /** Becomes Signal.severity; must be in [0, 1]. */
  weight: number;
  /** Plain-English, non-technical explanation. */
  whyItMatters: string;
  phrases: { en: string[]; vi: string[] };
}

export const TEXT_PATTERNS: readonly TextPattern[] = [
  {
    id: "text.otp-request",
    weight: 0.85,
    whyItMatters:
      "Real banks and services never ask you to share a one-time code, PIN or password by message. Anyone who asks is likely trying to get into your account.",
    phrases: {
      en: [
        "send me the code",
        "share your otp",
        "send your otp",
        "enter your otp",
        "your otp",
        "verification code",
        "security code",
        "one time password",
        "confirm your pin",
        "enter your pin",
        "your password",
      ],
      vi: [
        "mã otp",
        "gửi mã otp",
        "cung cấp mã otp",
        "mã xác minh",
        "mã xác thực",
        "mã pin",
        "mật khẩu của bạn",
        "cung cấp mật khẩu",
      ],
    },
  },
  {
    id: "text.urgency",
    weight: 0.5,
    whyItMatters:
      "Scammers rush you so you do not stop to think or check. Real organisations usually give you time and other ways to confirm.",
    phrases: {
      en: [
        "within 24 hours",
        "within 48 hours",
        "act now",
        "immediately",
        "urgent",
        "last warning",
        "final notice",
        "as soon as possible",
        "expires today",
      ],
      vi: [
        "trong vòng 24 giờ",
        "trong 24 giờ",
        "khẩn cấp",
        "ngay lập tức",
        "cảnh báo cuối cùng",
        "thông báo cuối cùng",
        "càng sớm càng tốt",
        "hết hạn hôm nay",
      ],
    },
  },
  {
    id: "text.threat",
    weight: 0.7,
    whyItMatters:
      "Threats of locked accounts, fines or arrest are used to frighten people into acting. Genuine agencies do not make these threats by text or chat.",
    phrases: {
      en: [
        "account has been locked",
        "account will be locked",
        "account suspended",
        "account will be suspended",
        "legal action",
        "you will be arrested",
        "arrest warrant",
        "pay a fine",
        "court summons",
      ],
      vi: [
        "tài khoản bị khóa",
        "tài khoản sẽ bị khóa",
        "tài khoản bị tạm ngưng",
        "kiện ra tòa",
        "khởi kiện",
        "lệnh bắt",
        "bị bắt",
        "nộp phạt",
        "giấy triệu tập",
      ],
    },
  },
  {
    id: "text.prize-reward",
    weight: 0.6,
    whyItMatters:
      "Unexpected prizes, gifts and refunds are a common bait. If you did not enter anything, the offer is very unlikely to be real.",
    phrases: {
      en: [
        "you have won",
        "you won",
        "congratulations you",
        "claim your prize",
        "free gift",
        "lucky winner",
        "you are selected",
        "claim your refund",
        "unclaimed refund",
      ],
      vi: [
        "bạn đã trúng thưởng",
        "chúc mừng bạn",
        "nhận thưởng",
        "quà tặng miễn phí",
        "người may mắn",
        "bạn được chọn",
        "nhận tiền hoàn",
        "hoàn tiền",
      ],
    },
  },
  {
    id: "text.payment-request",
    weight: 0.75,
    whyItMatters:
      "Requests to transfer money, pay a fee or buy gift cards are how most scams collect payment, and the money is hard to get back.",
    phrases: {
      en: [
        "transfer money",
        "wire transfer",
        "send money",
        "pay a deposit",
        "pay the fee",
        "processing fee",
        "gift cards",
        "buy gift card",
        "bitcoin payment",
      ],
      vi: [
        "chuyển khoản",
        "chuyển tiền",
        "đặt cọc",
        "nộp phí",
        "phí xử lý",
        "thẻ quà tặng",
        "mua thẻ cào",
        "thanh toán bằng bitcoin",
      ],
    },
  },
  {
    id: "text.authority-impersonation",
    weight: 0.6,
    whyItMatters:
      "Scammers pretend to be a bank, the police, tax office or a courier to borrow their trust. Contact the real organisation using a number you look up yourself.",
    phrases: {
      en: [
        "this is your bank",
        "bank security team",
        "customer service department",
        "police department",
        "tax office",
        "tax authority",
        "courier company",
        "your parcel is held",
        "government agency",
      ],
      vi: [
        "ngân hàng của bạn",
        "bộ phận chăm sóc khách hàng",
        "công an",
        "cơ quan thuế",
        "cục thuế",
        "viện kiểm sát",
        "công ty chuyển phát",
        "bưu kiện của bạn",
        "cơ quan nhà nước",
      ],
    },
  },
  {
    id: "text.off-platform",
    weight: 0.5,
    whyItMatters:
      "Moving a chat to another app or asking you to keep it secret takes you away from places that can spot and stop scams.",
    phrases: {
      en: [
        "contact me on whatsapp",
        "message me on telegram",
        "add me on telegram",
        "chat on zalo",
        "move to whatsapp",
        "keep this secret",
        "do not tell anyone",
        "dont tell anyone",
      ],
      vi: [
        "liên hệ qua zalo",
        "nhắn tin qua zalo",
        "kết bạn zalo",
        "chuyển sang telegram",
        "liên hệ qua telegram",
        "giữ bí mật",
        "đừng nói với ai",
        "không được nói cho ai",
      ],
    },
  },
  {
    id: "text.sensitive-data-request",
    weight: 0.8,
    whyItMatters:
      "Asking for your ID number, card number or bank login lets a scammer take over your accounts or open new ones in your name.",
    phrases: {
      en: [
        "your card number",
        "card number and cvv",
        "your id number",
        "social security number",
        "passport number",
        "bank login",
        "online banking password",
        "send a photo of your id",
        "account number and password",
      ],
      vi: [
        "số thẻ của bạn",
        "số thẻ và mã cvv",
        "số căn cước",
        "số cmnd",
        "số cccd",
        "số hộ chiếu",
        "đăng nhập ngân hàng",
        "mật khẩu ngân hàng",
        "chụp ảnh căn cước",
      ],
    },
  },
];
