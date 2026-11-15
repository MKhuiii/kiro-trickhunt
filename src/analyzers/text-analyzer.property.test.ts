/**
 * text-analyzer.property.test.ts — Property-based tests for the Text Analyzer
 *
 * **Validates: Requirements PBT-10, PBT-11, PBT-12, PBT-13, PBT-14, PBT-15**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createSignal } from "../core/signal";
import { TextAnalyzer, extractEntities } from "./text-analyzer";
import { MAX_EVIDENCE_CHARS, TEXT_PATTERNS } from "./text-analyzer.config";

const analyzer = new TextAnalyzer();

const ALL_PHRASES: string[] = TEXT_PATTERNS.flatMap((p) => [...p.phrases.en, ...p.phrases.vi]);

/** Arbitrary text: plain strings and full-unicode (binary) strings. */
const anyText = fc.oneof(fc.string(), fc.string({ unit: "binary" }));

/** ASCII letters and spaces only, so filler is identical under case/diacritic changes. */
const filler = fc.stringMatching(/^[a-zA-Z ]{0,30}$/);

/** Text built from config phrases joined with filler, separated by spaces. */
const phraseText = fc
  .array(fc.tuple(fc.constantFrom(...ALL_PHRASES), filler), { minLength: 1, maxLength: 8 })
  .map((parts) => parts.map(([phrase, fill]) => `${fill} ${phrase} `).join(" "));

const stripDiacritics = (s: string): string =>
  s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D");

const ids = (signals: ReadonlyArray<{ id: string }>): string[] => signals.map((s) => s.id);

describe("PBT-10 — analyze resolves for any string", () => {
  it("never rejects", async () => {
    await fc.assert(
      fc.asyncProperty(anyText, async (s) => {
        const result = await analyzer.analyze(s);
        return Array.isArray(result);
      }),
      { numRuns: 300 },
    );
  });
});

describe("PBT-11 — signals are valid and sourced from text", () => {
  it("every signal passes createSignal and has source 'text'", async () => {
    await fc.assert(
      fc.asyncProperty(fc.oneof(anyText, phraseText), async (s) => {
        const signals = await analyzer.analyze(s);
        for (const sig of signals) {
          if (sig.source !== "text") return false;
          createSignal({ ...sig }); // throws if invalid
        }
        return true;
      }),
      { numRuns: 300 },
    );
  });
});

describe("PBT-12 — analyze is deterministic", () => {
  it("two calls give deep-equal results", async () => {
    await fc.assert(
      fc.asyncProperty(fc.oneof(anyText, phraseText), async (s) => {
        const a = await analyzer.analyze(s);
        const b = await analyzer.analyze(s);
        expect(b).toEqual(a);
        return true;
      }),
      { numRuns: 300 },
    );
  });
});

describe("PBT-13 — signal ids invariant under case and diacritics", () => {
  it("upper-case, lower-case and diacritic-stripped text give the same ids", async () => {
    await fc.assert(
      fc.asyncProperty(phraseText, async (s) => {
        const base = ids(await analyzer.analyze(s));
        expect(base.length).toBeGreaterThan(0);
        expect(ids(await analyzer.analyze(s.toUpperCase()))).toEqual(base);
        expect(ids(await analyzer.analyze(s.toLowerCase()))).toEqual(base);
        expect(ids(await analyzer.analyze(stripDiacritics(s)))).toEqual(base);
        return true;
      }),
      { numRuns: 300 },
    );
  });
});

describe("PBT-14 — extractEntities never throws; values are substrings", () => {
  const withUrl = fc
    .tuple(fc.string(), fc.webUrl(), fc.string())
    .map(([a, u, b]) => `${a} ${u} ${b}`);

  it("returns only substrings of the input", () => {
    fc.assert(
      fc.property(fc.oneof(anyText, withUrl), (s) => {
        const e = extractEntities(s);
        for (const v of [...e.urls, ...e.phoneNumbers, ...e.accountNumbers]) {
          if (!s.includes(v)) return false;
        }
        return true;
      }),
      { numRuns: 500 },
    );
  });
});

describe("PBT-15 — evidence length bounded", () => {
  it("no evidence exceeds MAX_EVIDENCE_CHARS for long phrase-heavy text", async () => {
    const longText = fc
      .array(fc.constantFrom(...ALL_PHRASES), { minLength: 20, maxLength: 120 })
      .map((ps) => [...ALL_PHRASES, ...ps].join(" . "));
    await fc.assert(
      fc.asyncProperty(longText, async (s) => {
        const signals = await analyzer.analyze(s);
        return signals.length > 0 && signals.every((x) => x.evidence.length <= MAX_EVIDENCE_CHARS);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// rules-tuning-v1: PBT-75, PBT-77, PBT-78
// **Validates: Requirements REQ-TXT-21**
// ---------------------------------------------------------------------------

/** Phrases added by rules-tuning-v1 (design.md, "Changes > text-analyzer.config.ts"). */
const ADDED_PHRASES: Readonly<Record<string, { en: string[]; vi: string[] }>> = {
  "text.otp-request": {
    en: [
      "send me the otp", "send me your otp", "send me your code", "send us the code",
      "send us the otp", "send us your otp", "send us your code", "send the otp",
      "enter the otp", "reply with the otp", "reply with your otp", "reply with otp",
      "reply with the code", "reply with your code", "text me the code",
      "tell me the code", "read me the code",
    ],
    vi: [
      "vui lòng cung cấp mã otp", "vui lòng gửi mã otp", "vui lòng nhập mã otp",
      "hãy cung cấp mã otp", "hãy gửi mã otp", "và cung cấp mã otp", "và gửi mã otp",
      "gửi lại mã otp", "trả lời mã otp",
    ],
  },
  "text.urgency": {
    en: [
      "within 72 hours", "within 12 hours", "within 2 hours", "within 1 hour",
      "within an hour", "locked in 24 hours", "locked in 48 hours",
      "suspended in 24 hours", "suspended in 48 hours", "blocked in 24 hours",
      "closed in 24 hours",
    ],
    vi: [
      "trong 24h", "trong 48h", "trong 48 giờ", "trong 1 giờ", "trong vòng 1 giờ",
      "trong vòng 2 giờ",
    ],
  },
  "text.payment-request": {
    en: [
      "pay a small fee", "pay a shipping fee", "pay a small shipping fee",
      "pay the shipping fee", "pay a handling fee", "pay a small handling fee",
      "pay a registration fee", "pay the registration fee", "pay a small deposit",
      "pay a training deposit", "pay a training fee", "pay the release fee",
      "pay the clearance fee",
    ],
    vi: [
      "trả phí vận chuyển", "đóng phí vận chuyển", "đóng phí đăng ký", "nộp phí đăng ký",
      "đóng tiền cọc", "nộp tiền cọc",
    ],
  },
  "text.off-platform": {
    en: [
      "message us on telegram", "contact us on telegram", "message us on whatsapp",
      "contact us on whatsapp", "add me on whatsapp",
    ],
    vi: ["nhắn tin qua telegram"],
  },
  "text.threat": {
    en: ["you are under investigation"],
    vi: ["đang bị điều tra"],
  },
  "text.job-offer": {
    en: [
      "easy tasks", "simple tasks", "no experience needed", "no experience required",
      "hiring online", "earn money online", "earn money from home", "make money online",
      "easy money", "liking videos",
    ],
    vi: [
      "nhiệm vụ đơn giản", "việc nhẹ lương cao", "không cần kinh nghiệm",
      "tuyển nhân viên làm việc online", "tuyển nhân viên online", "kiếm tiền online",
      "kiếm tiền tại nhà", "thu nhập mỗi ngày",
    ],
  },
  "text.financial-institution": {
    en: [
      "verify your account", "account verification", "confirm your account",
      "unlock your account", "e-wallet", "digital wallet",
    ],
    vi: ["xác minh tài khoản", "xác thực tài khoản", "mở khóa tài khoản", "ví điện tử"],
  },
};

const ADDED_ALL: string[] = Object.values(ADDED_PHRASES).flatMap((g) => [...g.en, ...g.vi]);
const ADDED_VI: string[] = Object.values(ADDED_PHRASES).flatMap((g) => g.vi);

describe("rules-tuning-v1 fixtures match the config", () => {
  it("every added phrase exists in TEXT_PATTERNS under its group", () => {
    for (const [id, group] of Object.entries(ADDED_PHRASES)) {
      const cfg = TEXT_PATTERNS.find((p) => p.id === id);
      expect(cfg, id).toBeDefined();
      for (const p of group.en) expect(cfg!.phrases.en, `${id}: ${p}`).toContain(p);
      for (const p of group.vi) expect(cfg!.phrases.vi, `${id}: ${p}`).toContain(p);
    }
  });
});

describe("PBT-75 — one signal per group and bounded evidence", () => {
  for (const pattern of TEXT_PATTERNS) {
    it(`${pattern.id}: any subset of phrases plus filler gives at most one signal and bounded evidence`, async () => {
      const groupPhrases = [...pattern.phrases.en, ...pattern.phrases.vi];
      const text = fc
        .tuple(fc.subarray(groupPhrases), fc.string())
        .map(([subset, fill]) => `${fill} ${subset.join(` ${fill} `)} ${fill}`);
      await fc.assert(
        fc.asyncProperty(text, async (s) => {
          const signals = await analyzer.analyze(s);
          const own = signals.filter((x) => x.id === pattern.id);
          return (
            own.length <= 1 &&
            signals.every((x) => x.evidence.length <= MAX_EVIDENCE_CHARS)
          );
        }),
        { numRuns: 100 },
      );
    });
  }
});

describe("PBT-77 — added phrases are invariant under case and diacritics", () => {
  it("upper-case, lower-case and diacritic-stripped text give the same signal ids", async () => {
    const text = fc
      .tuple(fc.constantFrom(...ADDED_ALL), fc.string(), fc.string())
      .map(([phrase, a, b]) => `${a} ${phrase} ${b}`);
    await fc.assert(
      fc.asyncProperty(text, async (s) => {
        const base = ids(await analyzer.analyze(s));
        expect(base.length).toBeGreaterThan(0);
        expect(ids(await analyzer.analyze(s.toUpperCase()))).toEqual(base);
        expect(ids(await analyzer.analyze(s.toLowerCase()))).toEqual(base);
        expect(ids(await analyzer.analyze(stripDiacritics(s)))).toEqual(base);
        return true;
      }),
      { numRuns: 300 },
    );
  });
});

describe("PBT-78 — Vietnamese phrases without diacritics match like the accented form", () => {
  it("unaccented phrase (đ as d) gives the same signal ids as the accented phrase", async () => {
    const vi = fc.oneof(
      fc.constantFrom(...ADDED_VI),
      fc.constantFrom(
        ...TEXT_PATTERNS.filter((p) => p.id in ADDED_PHRASES).flatMap((p) => p.phrases.vi),
      ),
    );
    await fc.assert(
      fc.asyncProperty(vi, filler, async (phrase, fill) => {
        const accented = ids(await analyzer.analyze(`${fill} ${phrase} ${fill}`));
        const plain = ids(await analyzer.analyze(`${fill} ${stripDiacritics(phrase)} ${fill}`));
        expect(accented.length).toBeGreaterThan(0);
        expect(plain).toEqual(accented);
        return true;
      }),
      { numRuns: 200 },
    );
  });
});
