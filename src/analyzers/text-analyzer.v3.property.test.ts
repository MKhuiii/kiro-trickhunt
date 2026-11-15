/**
 * text-analyzer.v3.property.test.ts — rules-tuning-v3 property tests for the Text Analyzer
 *
 * PBT-84: phrases added by v3 match the same way under case and diacritic changes.
 *
 * **Validates: Requirements REQ-TXT-32**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { TextAnalyzer } from "./text-analyzer";
import { TEXT_PATTERNS } from "./text-analyzer.config";

const analyzer = new TextAnalyzer();

const stripDiacritics = (s: string): string =>
  s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D");

const ids = (signals: ReadonlyArray<{ id: string }>): string[] => signals.map((s) => s.id);

/** Phrases added by rules-tuning-v3 (design.md, "Changes > text-analyzer.config.ts"). */
const V3_ADDED_PHRASES: Readonly<Record<string, { en: string[]; vi: string[] }>> = {
  "text.otp-request": {
    en: [
      "send me your password", "send us your password", "tell me your password",
      "send me your pin", "send us your pin", "tell me your pin",
    ],
    vi: [
      "vui lòng cung cấp mật khẩu", "hãy cung cấp mật khẩu", "vui lòng gửi mã pin",
      "vui lòng cung cấp mã pin", "hãy gửi mã pin",
    ],
  },
  "text.urgency": {
    en: [
      "reply within 24 hours", "respond within 24 hours", "pay within 24 hours",
      "pay within 48 hours", "verify within 24 hours", "confirm within 24 hours",
    ],
    vi: [
      "bị khóa trong 24h", "bị khóa trong 24 giờ", "bị khóa trong 48h",
      "bị khóa trong 48 giờ", "bị tạm ngưng trong 24h", "bị tạm ngưng trong 24 giờ",
    ],
  },
  "text.threat": {
    en: ["card has been suspended", "your unpaid taxes", "you have unpaid taxes"],
    vi: [],
  },
  "text.payment-request": {
    en: [
      "pay a processing fee", "pay the processing fee", "pay an activation fee",
      "pay the activation fee", "buy gift cards", "buy a gift card",
      "pay with gift cards", "pay with a gift card", "pay by gift card",
      "pay by gift cards", "send gift cards",
    ],
    vi: [
      "đóng phí kích hoạt", "nộp phí kích hoạt", "đóng phí đăng ký tài khoản",
      "đóng phí xử lý", "nộp phí xử lý", "mua thẻ quà tặng", "gửi thẻ quà tặng",
    ],
  },
  "text.job-offer": {
    en: ["with easy tasks", "complete easy tasks", "complete simple tasks"],
    vi: ["làm nhiệm vụ đơn giản", "hoàn thành nhiệm vụ đơn giản"],
  },
};

const V3_ADDED_ALL: string[] = Object.values(V3_ADDED_PHRASES).flatMap((g) => [
  ...g.en,
  ...g.vi,
]);

describe("rules-tuning-v3 fixtures match the config", () => {
  it("every added phrase exists in TEXT_PATTERNS under its group", () => {
    for (const [id, group] of Object.entries(V3_ADDED_PHRASES)) {
      const cfg = TEXT_PATTERNS.find((p) => p.id === id);
      expect(cfg, id).toBeDefined();
      for (const p of group.en) expect(cfg!.phrases.en, `${id}: ${p}`).toContain(p);
      for (const p of group.vi) expect(cfg!.phrases.vi, `${id}: ${p}`).toContain(p);
    }
  });
});

describe("PBT-84 — v3 added phrases are invariant under case and diacritics", () => {
  it("upper-case, lower-case and diacritic-stripped text give the same signal ids", async () => {
    const text = fc
      .tuple(fc.constantFrom(...V3_ADDED_ALL), fc.string(), fc.string())
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
