/**
 * text-analyzer.v5.property.test.ts — new-monsters-v1 property tests.
 *
 * PBT-147: phrases added by this spec match the same way under case and
 * diacritic changes, and every added phrase exists in its group.
 * **Validates: Requirements REQ-TXT-38**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { TextAnalyzer } from "./text-analyzer";
import { TEXT_PATTERNS } from "./text-analyzer.config";

const analyzer = new TextAnalyzer();

const stripDiacritics = (s: string): string =>
  s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D");

const ids = (signals: ReadonlyArray<{ id: string }>): string[] => signals.map((s) => s.id);

/** Phrases added by new-monsters-v1, per group. */
const V5_ADDED_PHRASES: Readonly<Record<string, { en: string[]; vi: string[] }>> = {
  "text.investment-pitch": {
    en: [
      "guaranteed returns", "guaranteed profit", "guaranteed daily profit",
      "guaranteed daily returns", "risk free investment", "risk free crypto investment",
      "risk free trading", "risk free returns", "double your money", "doubled his money",
      "doubled her money", "daily profit", "profit every day", "private trading group",
      "private trading channel", "private investment group", "private investment channel",
      "vip signals", "vip trading signals", "vip channel", "vip trading group",
      "deposit to join the group", "deposit to join the channel",
      "deposit to join the vip channel",
    ],
    vi: [
      "cam kết lợi nhuận", "lợi nhuận cam kết", "đầu tư không rủi ro", "nhóm đầu tư kín",
      "nhóm giao dịch kín", "lợi nhuận mỗi ngày", "nhân đôi số tiền", "nạp tiền để tham gia",
      "nạp tiền vào nhóm", "cam kết lãi",
    ],
  },
  "text.romance-bait": {
    en: [
      "we only talked for a week", "we only met a week ago", "we are meant to be together",
      "i have never felt this connected to anyone", "stuck at a foreign port",
      "stuck at the port", "working on an oil rig", "i work on an oil rig",
      "deployed overseas and i need your help", "my bank account is frozen",
      "my account is frozen while i travel", "i will repay you when i arrive",
      "i will pay you back when i arrive", "i will repay you when i return",
      "i will pay you back when i return",
    ],
    vi: [
      "mới quen một tuần", "mới quen nhau một tuần", "dù chúng ta mới quen",
      "công tác nước ngoài và bị khóa thẻ", "đang ở nước ngoài và bị khóa thẻ",
      "tài khoản bị đóng băng khi ở nước ngoài", "sẽ trả lại em khi về",
      "sẽ trả lại anh khi về", "kẹt ở cảng nước ngoài", "làm việc trên giàn khoan",
    ],
  },
  "text.payment-request": {
    en: [
      "send a gift card", "send me a gift card", "buy a gift card for me",
      "buy me a gift card", "send me gift cards", "deposit to join", "deposit to start",
      "send your first deposit", "make your first deposit", "add funds to activate",
      "add funds to start",
    ],
    vi: ["gửi cho anh thẻ quà tặng", "mua giúp anh thẻ quà tặng", "triệu để tham gia"],
  },
};

const V5_ADDED_ALL: string[] = Object.values(V5_ADDED_PHRASES).flatMap((g) => [
  ...g.en,
  ...g.vi,
]);

describe("new-monsters-v1 fixtures match the config", () => {
  it("every added phrase exists in TEXT_PATTERNS under its group", () => {
    for (const [id, group] of Object.entries(V5_ADDED_PHRASES)) {
      const cfg = TEXT_PATTERNS.find((p) => p.id === id);
      expect(cfg, id).toBeDefined();
      for (const p of group.en) expect(cfg!.phrases.en, `${id}: ${p}`).toContain(p);
      for (const p of group.vi) expect(cfg!.phrases.vi, `${id}: ${p}`).toContain(p);
    }
  });
});

describe("PBT-147 — v5 added phrases are invariant under case and diacritics", () => {
  it("upper-case, lower-case and diacritic-stripped text give the same signal ids", async () => {
    const text = fc
      .tuple(fc.constantFrom(...V5_ADDED_ALL), fc.string(), fc.string())
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
