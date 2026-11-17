/**
 * awareness.config.ts — Awareness adjustment (rules-tuning-v5).
 *
 * The one exception to "rules only raise risk" (see verdict-rules.md): a
 * `high` verdict may be lowered by exactly one step, to `suspicious`, when the
 * LLM marks the message as a scam warning AND every fixed condition below
 * holds. The LLM alone can never lower a level.
 *
 * Pure data — no imports. Phrases are matched after the text analyzer's
 * normalization (case, accents and punctuation do not matter).
 */

/**
 * Master switch. Off until the live review (Task 6c, rules-tuning-v5) has
 * run with the real LLM and no scam was lowered. Turn on only after that.
 */
export const AWARENESS_ADJUSTMENT_ENABLED = false;

/** Minimum LLM severity for the awareness marker. */
export const AWARENESS_MIN_SEVERITY = 0.35;

/** The only level that may be lowered, the level it becomes, and the score cap. */
export const AWARENESS_FROM_LEVEL = "high" as const;
export const AWARENESS_TO_LEVEL = "suspicious" as const;
export const AWARENESS_MAX_SCORE = 49;

/**
 * At least one of these must appear, found by rules and independent of the
 * LLM. They show the message is talking about scams.
 */
export const WARNING_CUE_PHRASES: Readonly<{ en: readonly string[]; vi: readonly string[] }> = {
  en: [
    "scammer",
    "scammers",
    "scam alert",
    "scam warning",
    "fraud alert",
    "fraudsters",
    "criminals",
    "fake texts",
    "fake messages",
    "fake calls",
    "fake police calls",
    "texts are fake",
    "messages are fake",
    "we will never ask",
    "we never ask",
    "will never ask",
    "never asks",
    "pretend to be",
    "impersonating",
  ],
  vi: [
    "kẻ lừa đảo",
    "kẻ gian",
    "lừa đảo",
    "giả mạo",
    "giả danh",
    "không bao giờ yêu cầu",
  ],
};

/**
 * Signal ids that block the adjustment: any request to act, and every
 * semantic warning sign (if the LLM sees a tactic, the message is not
 * treated as a warning). Ids ending in ".*" match a prefix.
 */
export const BLOCKING_SIGNAL_IDS: readonly string[] = [
  "url.*",
  "semantic.*",
  "text.otp-request",
  "text.sensitive-data-request",
  "text.payment-request",
  "text.off-platform",
  "text.prize-reward",
  "text.job-offer",
];

/** A request to make contact or act, anywhere in the message, blocks the adjustment. */
export const CONTACT_REQUEST_PHRASES: Readonly<{ en: readonly string[]; vi: readonly string[] }> = {
  en: [
    "reply",
    "respond",
    "call us",
    "call back",
    "call me",
    "call our",
    "call this",
    "text back",
    "text us",
    "text me",
    "contact us",
    "contact me",
    "contact our",
    "click",
    "tap the",
    "tap here",
    "act now",
    "can you",
    "could you",
    "help me",
    "wait for",
    "follow the instructions",
  ],
  vi: [
    "gọi lại",
    "gọi cho",
    "gọi ngay",
    "nhắn lại",
    "nhắn tin cho",
    "trả lời",
    "liên hệ số",
    "liên hệ ngay",
    "bấm vào",
    "nhấn vào",
    "làm theo hướng dẫn",
    "chờ cán bộ",
  ],
};

/**
 * Verbs that block the adjustment when used as a command: at the start of a
 * sentence or clause, or right after a polite word ("please", "hãy", ...).
 */
export const IMPERATIVE_VERBS: Readonly<{ en: readonly string[]; vi: readonly string[] }> = {
  en: [
    "call",
    "text",
    "contact",
    "visit",
    "go to",
    "come to",
    "log in",
    "sign in",
    "verify",
    "confirm",
    "send",
    "pay",
    "transfer",
    "wire",
    "settle",
    "follow",
    "wait",
    "download",
    "install",
    "scan",
    "act",
    "provide",
    "enter",
    "share",
    "update",
    "submit",
    "keep",
    "buy",
  ],
  vi: [
    "gọi",
    "nhắn",
    "liên hệ",
    "đến",
    "truy cập",
    "đăng nhập",
    "xác minh",
    "xác nhận",
    "gửi",
    "chuyển",
    "nộp",
    "đóng",
    "thanh toán",
    "cung cấp",
    "làm theo",
    "tải",
    "cài",
    "quét",
    "giữ",
    "mua",
  ],
};

/** Polite words that turn a following verb into a command. */
export const POLITE_PREFIXES: readonly string[] = [
  "please",
  "kindly",
  "vui lòng",
  "hãy",
  "xin",
];

/** Words skipped at the start of a clause before looking for a command verb. */
export const CLAUSE_FILLERS: readonly string[] = ["and", "then", "now", "và", "rồi", "sau đó"];
