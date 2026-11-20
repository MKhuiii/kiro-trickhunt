/**
 * The Halloween voice (spec halloween-voice, steering halloween-voice.md).
 * Pure helpers: which tier a dictionary key belongs to, the horror and banned
 * word lists for English and Vietnamese, and small checkers. No React, no DOM.
 */

export type VoiceTier = "A" | "B" | "C";
export type VoiceLang = "en" | "vi";

/* ---------- Tiers ---------- */

export interface TierRule {
  readonly pattern: RegExp;
  readonly tier: VoiceTier;
}

/** First match wins. */
export const TIER_RULES: readonly TierRule[] = [
  // C: exact keys first, so they are not caught by the broader rules below.
  { pattern: /^(app\.name|bag\.enter\.hint|monster\.[a-z-]+\.tip\d+)$/, tier: "C" },
  {
    pattern:
      /^(privacy\.note$|a11y\.|prefs\.|settings\.open$|topbar\.|result\.meter\.|result\.highlight\.|result\.severity\.|result\.actions\.heading$|journal\.do\.heading$|result\.aiNote\.|result\.limitsNote$|result\.noSignals\.|result\.tech\.|result\.withheld$|result\.links\.heading$|level\.|link\.|source\.|semantic\.|signal\.|notice\.|error\.|reputation\.)/,
    tier: "C",
  },
  // A: full horror voice.
  {
    pattern:
      /^(app\.tagline$|scene\.|home\.|bag\.|hunt\.|monster\.[a-z-]+\.(name|short)$|result\.monster\.heading$|result\.tips\.heading$|result\.frame\.label$|journal\.title$)/,
    tier: "A",
  },
  // B: meaning first.
  {
    pattern:
      /^(input\.|progress\.|result\.heading$|result\.message\.|result\.signals\.heading$|result\.evidence\.|result\.limitations\.heading$|journal\.|settings\.sound\.|bestiary\.)/,
    tier: "B",
  },
];

/** Index of the rule that decides this key, or -1. */
export function tierRuleIndex(key: string): number {
  return TIER_RULES.findIndex((r) => r.pattern.test(key));
}

/** The tier of a key, or `null` when no rule matches (a test fails for that). */
export function tierOf(key: string): VoiceTier | null {
  const i = tierRuleIndex(key);
  return i === -1 ? null : TIER_RULES[i].tier;
}

/** Tier A keys that must carry a horror word in both languages. */
const REQUIRED_EXACT: ReadonlySet<string> = new Set([
  "app.tagline",
  "scene.home.caption",
  "scene.bag.caption",
  "scene.hunt.forest",
  "scene.hunt.mountain",
  "scene.hunt.swamp",
  "scene.hunt.ruins",
  "scene.reveal.found",
  "scene.reveal.nothing",
  "scene.lost.caption",
  "home.hunter.action",
  "bag.heading",
  "hunt.again",
  "result.frame.label",
  "result.monster.heading",
  "result.tips.heading",
  "journal.title",
]);

export function isRequiredThemed(key: string): boolean {
  return REQUIRED_EXACT.has(key) || /^monster\.[a-z-]+\.(name|short)$/.test(key);
}

/* ---------- Limits ---------- */

export const MAX_WORDS_PER_SENTENCE: Readonly<Record<VoiceLang, number>> = { en: 18, vi: 26 };
export const MAX_WORD_LENGTH = 14;

/* ---------- Word lists (all lower-case, NFC) ---------- */

const EN_HORROR: ReadonlySet<string> = new Set([
  "ghost", "ghosts", "shadow", "shadows", "vampire", "vampires", "zombie", "zombies",
  "banshee", "banshees", "monster", "monsters", "hunter", "hunters", "hunt", "lantern",
  "candle", "trail", "forest", "swamp", "ruins", "graveyard", "grave", "fog", "mist", "moon",
  "night", "dark", "darkness", "creep", "creeps", "creeping", "lurk", "lurks", "lurking",
  "wail", "wails", "wailing", "haunt", "haunts", "haunted", "curse", "cursed", "spooky", "eerie",
]);

const VI_HORROR: readonly string[] = [
  "bóng ma", "ma cà rồng", "xác sống", "ma nữ", "ma quái", "quái vật", "thợ săn", "ngọn đèn",
  "ngọn nến", "dấu vết", "đầm lầy", "tàn tích", "nghĩa địa", "bóng tối", "lởn vởn", "gào khóc",
  "lời nguyền", "bóng", "ma", "đèn", "nến", "rừng", "sương", "trăng", "đêm", "săn",
];

const EN_BANNED: ReadonlySet<string> = new Set([
  "kill", "kills", "killed", "killing", "murder", "blood", "bloody", "gore", "corpse", "corpses",
  "death", "dead", "die", "dies", "died", "torture", "suicide", "satan", "devil", "hell", "demon",
  "demons", "exorcism", "doom", "doomed", "terror", "terrifying", "horrifying", "deadly", "evil",
  "safe", "clean", "definitely", "guaranteed",
]);

const VI_BANNED: readonly string[] = [
  "giết", "máu", "xác chết", "tử thần", "chết", "tra tấn", "tự tử", "quỷ dữ", "ác quỷ",
  "địa ngục", "kinh hoàng", "an toàn", "chắc chắn 100%",
];

/* ---------- Helpers ---------- */

function normalize(text: string): string {
  return String(text ?? "")
    .replace(/\{[A-Za-z0-9_]+\}/g, " ")
    .normalize("NFC")
    .toLowerCase();
}

/** Lower-case runs of letters. `hunter's` gives `hunter` and `s`; `TrickHunt` is one word. */
export function words(text: string): string[] {
  return normalize(text).match(/\p{L}+/gu) ?? [];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Counts phrases, longest first, without counting the same letters twice. */
function countPhrases(text: string, phrases: readonly string[]): { count: number; found: string[] } {
  let work = normalize(text);
  let count = 0;
  const found: string[] = [];
  const ordered = [...phrases].sort((a, b) => b.length - a.length);
  for (const phrase of ordered) {
    const re = new RegExp(
      `(?<![\\p{L}\\p{N}])${escapeRegex(phrase)}(?![\\p{L}\\p{N}])`,
      "gu",
    );
    work = work.replace(re, (m) => {
      count += 1;
      found.push(phrase);
      return " ".repeat(m.length);
    });
  }
  return { count, found };
}

/** How many horror words the text has. */
export function countHorrorWords(text: string, lang: VoiceLang): number {
  if (lang === "vi") return countPhrases(text, VI_HORROR).count;
  return words(text).filter((w) => EN_HORROR.has(w)).length;
}

/** Banned words found in the text (empty when it is clean). */
export function bannedWords(text: string, lang: VoiceLang): string[] {
  if (lang === "vi") return countPhrases(text, VI_BANNED).found;
  return words(text).filter((w) => EN_BANNED.has(w));
}

/** Words (English) or syllables (Vietnamese) in each sentence. */
export function sentenceLengths(text: string): number[] {
  return normalize(text)
    .split(/[.!?…]+/)
    .map((part) => (part.match(/\S+/g) ?? []).filter((t) => /[\p{L}\p{N}]/u.test(t)).length)
    .filter((n) => n > 0);
}

/** Length in letters of the longest word. */
export function longestWord(text: string): number {
  return words(text).reduce((max, w) => Math.max(max, w.length), 0);
}

/* ---------- Fixed text ---------- */

/** Pinned word for word in both languages (REQ-VOICE-05). */
export const FIXED_TEXT: Readonly<Record<string, { readonly en: string; readonly vi: string }>> = {
  "level.no_signals": { en: "Nothing detected yet", vi: "Chưa phát hiện dấu hiệu nào" },
  "level.suspicious": { en: "A few things to double-check", vi: "Có vài điều cần kiểm tra lại" },
  "level.high": {
    en: "Multiple warning signs, be cautious",
    vi: "Nhiều dấu hiệu cảnh báo, hãy cẩn thận",
  },
  "level.critical": { en: "Strong indicators of a scam", vi: "Dấu hiệu rất mạnh của lừa đảo" },
  "result.actions.heading": { en: "What to do now", vi: "Bạn nên làm ngay" },
  "journal.do.heading": { en: "Do this first", vi: "Việc cần làm trước tiên" },
  "result.limitsNote": {
    en: "TrickHunt looks for warning signs. It cannot prove that a message is genuine.",
    vi: "TrickHunt tìm các dấu hiệu cảnh báo. Công cụ không thể chứng minh một tin nhắn là thật.",
  },
  "result.noSignals.summary": {
    en: "No warning signs found.",
    vi: "Chưa thấy dấu hiệu cảnh báo nào.",
  },
  "result.noSignals.reminder": {
    en: "If a message asks for money, a code or personal details, call the official number yourself to check.",
    vi: "Nếu tin nhắn đòi tiền, mã xác nhận hoặc thông tin cá nhân, hãy tự gọi số điện thoại chính thức để hỏi lại.",
  },
  "result.noSignals.reminderStrong": {
    en: "Nothing was found, but the extra AI check did not run, so this result is weaker. Do not rely on it alone. If a message asks for money, a code or personal details, call the official number yourself.",
    vi: "Chưa thấy dấu hiệu nào, nhưng bước kiểm tra AI bổ sung không chạy nên kết quả này yếu hơn. Đừng chỉ dựa vào nó. Nếu tin nhắn đòi tiền, mã xác nhận hoặc thông tin cá nhân, hãy tự gọi số điện thoại chính thức.",
  },
  "result.noSignals.notSafeNote": {
    en: "No warning signs found does not mean this message is genuine or safe.",
    vi: "Chưa thấy dấu hiệu cảnh báo không có nghĩa là tin nhắn này là thật hay an toàn.",
  },
  "privacy.note": {
    en: "Your image never leaves your device. Only text and links are sent to be checked, and we do not store them.",
    vi: "Ảnh của bạn không rời khỏi máy. Chỉ chữ và đường dẫn được gửi đi để kiểm tra, và chúng tôi không lưu lại.",
  },
};

/** The one key allowed to contain "safe" / "an toàn" (a negated sentence). */
export const BANNED_EXEMPT_KEY = "result.noSignals.notSafeNote";
