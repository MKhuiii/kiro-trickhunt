/**
 * text-analyzer.v4.property.test.ts — rules-tuning-v4 property tests.
 *
 * PBT-89: phrases added by v4 match the same way under case and diacritic
 * changes, and every added phrase exists in the config under its group.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { TextAnalyzer } from "./text-analyzer";
import { TEXT_PATTERNS } from "./text-analyzer.config";

const analyzer = new TextAnalyzer();

const stripDiacritics = (s: string): string =>
  s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D");

const ids = (signals: ReadonlyArray<{ id: string }>): string[] => signals.map((s) => s.id);

/** Phrases added by rules-tuning-v4. */
const V4_ADDED_PHRASES: Readonly<Record<string, { en: string[]; vi: string[] }>> = {
  "text.otp-request": {
    en: ["tell us the 6 digit number we send", "the number we send to your phone"],
    vi: ["nhập mã xác nhận gửi về điện thoại"],
  },
  "text.threat": {
    en: ["will be disconnected", "you will be detained"],
    vi: ["sẽ cắt điện", "sẽ bị cắt điện", "vắng mặt sẽ bị xử lý"],
  },
  "text.prize-reward": {
    en: ["claim your free", "choose your free", "survey winner", "free smartphone", "free iphone"],
    vi: ["khách hàng may mắn"],
  },
  "text.payment-request": {
    en: ["prepay the order", "refundable deposit"],
    vi: ["nạp trước tiền", "phí thẻ nhân viên"],
  },
  "text.authority-impersonation": {
    en: [
      "immigration bureau", "immigration department", "power company",
      "electricity company", "utility company",
    ],
    vi: ["tòa án nhân dân", "giấy mời làm việc"],
  },
  "text.off-platform": {
    en: ["contact our assistant on telegram", "contact our assistant on whatsapp"],
    vi: ["nhắn zalo", "nhắn telegram"],
  },
  "text.sensitive-data-request": {
    en: ["re-enter your card details", "enter your card details", "confirm your card details"],
    vi: ["nhập lại thông tin thẻ"],
  },
  "text.job-offer": {
    en: ["commission per order", "boost product ratings", "data entry job"],
    vi: ["chốt đơn ảo", "hoa hồng mỗi đơn", "chỉ cần ngồi nhà"],
  },
  "text.financial-institution": {
    en: ["fraud desk", "fraud department", "card was deactivated", "debit card was deactivated"],
    vi: ["sms banking"],
  },
};

const V4_ADDED_ALL: string[] = Object.values(V4_ADDED_PHRASES).flatMap((g) => [
  ...g.en,
  ...g.vi,
]);

describe("rules-tuning-v4 fixtures match the config", () => {
  it("every added phrase exists in TEXT_PATTERNS under its group", () => {
    for (const [id, group] of Object.entries(V4_ADDED_PHRASES)) {
      const cfg = TEXT_PATTERNS.find((p) => p.id === id);
      expect(cfg, id).toBeDefined();
      for (const p of group.en) expect(cfg!.phrases.en, `${id}: ${p}`).toContain(p);
      for (const p of group.vi) expect(cfg!.phrases.vi, `${id}: ${p}`).toContain(p);
    }
  });

  it("the removed voucher phrase is not in the config", () => {
    const prize = TEXT_PATTERNS.find((p) => p.id === "text.prize-reward");
    expect(prize!.phrases.vi).not.toContain("nhận ngay voucher");
  });
});

describe("PBT-89 — v4 added phrases are invariant under case and diacritics", () => {
  it("upper-case, lower-case and diacritic-stripped text give the same signal ids", async () => {
    const text = fc
      .tuple(fc.constantFrom(...V4_ADDED_ALL), fc.string(), fc.string())
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
