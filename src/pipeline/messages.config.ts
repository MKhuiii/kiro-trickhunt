/**
 * messages.config.ts — Actions and limitations, keyed by locale.
 *
 * Every list exists in both "en" and "vi" and is non-empty (REQ-PIPE-40).
 * Texts never claim that something is safe (REQ-PIPE-41).
 * Signal action keys are an exact signal id or a prefix ending in ".*".
 */

import type { Locale, MonsterId } from "./verdict";

type ByLocale<T> = Readonly<Record<Locale, T>>;

export const ACTIONS_BY_MONSTER: ByLocale<
  Readonly<Record<MonsterId, readonly string[]>>
> = {
  en: {
    bank: [
      "Do not reply. Contact your bank using the number on your card or official app.",
    ],
    prize: [
      "Do not pay any fee or share details to claim a prize you did not enter for.",
    ],
    "job-bait": [
      "Do not move the chat to another app or send money for a job. Check the company on its official website.",
    ],
    authority: [
      "Do not act on the message. Call the agency using a number you look up yourself.",
    ],
    generic: [
      "Pause before replying. Check with the sender using a contact you already trust.",
    ],
  },
  vi: {
    bank: [
      "Đừng trả lời. Hãy liên hệ ngân hàng qua số điện thoại trên thẻ hoặc ứng dụng chính thức.",
    ],
    prize: [
      "Đừng trả phí hoặc cung cấp thông tin để nhận giải thưởng mà bạn không tham gia.",
    ],
    "job-bait": [
      "Đừng chuyển sang ứng dụng khác hoặc gửi tiền để nhận việc. Hãy kiểm tra công ty trên trang web chính thức.",
    ],
    authority: [
      "Đừng làm theo tin nhắn. Hãy gọi cho cơ quan đó bằng số điện thoại do chính bạn tìm.",
    ],
    generic: [
      "Hãy dừng lại trước khi trả lời. Xác nhận với người gửi qua cách liên lạc bạn đã tin tưởng.",
    ],
  },
};

export const ACTIONS_BY_SIGNAL: ByLocale<
  Readonly<Record<string, readonly string[]>>
> = {
  en: {
    "text.otp-request": [
      "Never share codes sent to your phone, not even with someone who says they work for your bank.",
    ],
    "text.sensitive-data-request": [
      "Do not send passwords, card numbers or ID details by message.",
    ],
    "text.payment-request": [
      "Do not send money until you have confirmed the request in person or by a trusted number.",
    ],
    "url.*": ["Do not open the link."],
  },
  vi: {
    "text.otp-request": [
      "Tuyệt đối không chia sẻ mã gửi đến điện thoại của bạn, kể cả với người nói là nhân viên ngân hàng.",
    ],
    "text.sensitive-data-request": [
      "Đừng gửi mật khẩu, số thẻ hoặc giấy tờ tùy thân qua tin nhắn.",
    ],
    "text.payment-request": [
      "Đừng chuyển tiền cho đến khi bạn xác nhận yêu cầu trực tiếp hoặc qua số điện thoại đáng tin.",
    ],
    "url.*": ["Đừng mở liên kết."],
  },
};

export const ACTIONS_FALLBACK: ByLocale<readonly string[]> = {
  en: [
    "Stay alert. If something later feels off, check with the sender using a contact you already trust.",
  ],
  vi: [
    "Hãy luôn cảnh giác. Nếu sau này thấy điều gì lạ, hãy xác nhận với người gửi qua cách liên lạc bạn đã tin tưởng.",
  ],
};

export const LIMITATIONS_FIXED: ByLocale<readonly string[]> = {
  en: [
    "This check looks for known warning signs only. It cannot prove that a message is genuine.",
  ],
  vi: [
    "Công cụ chỉ tìm các dấu hiệu cảnh báo đã biết. Nó không thể chứng minh một tin nhắn là thật.",
  ],
};

export const LIMITATIONS_DEGRADED: ByLocale<readonly string[]> = {
  en: [
    "The extra language check did not finish, so only the built-in checks were used.",
  ],
  vi: [
    "Bước kiểm tra ngôn ngữ bổ sung không hoàn tất, nên chỉ dùng các kiểm tra có sẵn.",
  ],
};

export const LIMITATIONS_UNAVAILABLE: ByLocale<readonly string[]> = {
  en: [
    "The extra language check is not available, so only the built-in checks were used.",
  ],
  vi: [
    "Bước kiểm tra ngôn ngữ bổ sung hiện không có, nên chỉ dùng các kiểm tra có sẵn.",
  ],
};

export const LIMITATIONS_NO_SIGNALS: ByLocale<readonly string[]> = {
  en: [
    "Nothing was detected yet, but scams change often. Stay careful with unexpected requests.",
  ],
  vi: [
    "Chưa phát hiện dấu hiệu nào, nhưng thủ đoạn lừa đảo thay đổi liên tục. Hãy cẩn thận với các yêu cầu bất ngờ.",
  ],
};
