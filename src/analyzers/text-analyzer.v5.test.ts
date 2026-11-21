/**
 * text-analyzer.v5.test.ts — new-monsters-v1 phrase additions.
 * Covers REQ-TXT-34 to REQ-TXT-37: the two new groups fire on sample phrases,
 * no added phrase is a bare word, and benign wording stays quiet.
 */

import { describe, expect, it } from "vitest";
import { TextAnalyzer, normalizePhrase } from "./text-analyzer";
import { TEXT_PATTERNS } from "./text-analyzer.config";

const analyzer = new TextAnalyzer();

async function ids(text: string): Promise<string[]> {
  return (await analyzer.analyze(text)).map((s) => s.id);
}

function group(id: string) {
  const found = TEXT_PATTERNS.find((p) => p.id === id);
  if (!found) throw new Error(`missing group ${id}`);
  return found;
}

const BARE_WORDS = [
  "invest",
  "investment",
  "bitcoin",
  "crypto",
  "profit",
  "returns",
  "trading",
  "love",
  "miss you",
  "overseas",
  "abroad",
].map(normalizePhrase);

const ADDED_PAYMENT_PHRASES = [
  "send a gift card",
  "send me a gift card",
  "buy a gift card for me",
  "buy me a gift card",
  "send me gift cards",
  "deposit to join",
  "deposit to start",
  "send your first deposit",
  "make your first deposit",
  "add funds to activate",
  "add funds to start",
  "gửi cho anh thẻ quà tặng",
  "mua giúp anh thẻ quà tặng",
  "triệu để tham gia",
];

function allPhrases(id: string): string[] {
  const p = group(id).phrases;
  return [...p.en, ...p.vi];
}

describe("text.investment-pitch", () => {
  it.each([
    "They offer guaranteed daily profit on every deposit.",
    "This is a risk free crypto investment.",
    "Join our private trading group today.",
    "Get the VIP signals channel.",
    "You can double your money in a week.",
    "Đây là nhóm đầu tư kín, cam kết lợi nhuận.",
    "Hãy nạp tiền để tham gia nhóm.",
  ])("fires: %s", async (text) => {
    expect(await ids(text)).toContain("text.investment-pitch");
  });

  it("has weight 0.35", () => {
    expect(group("text.investment-pitch").weight).toBe(0.35);
  });
});

describe("text.romance-bait", () => {
  it.each([
    "I am working on an oil rig and my bank account is frozen.",
    "I am stuck at a foreign port, I will repay you when I arrive.",
    "We only talked for a week but we are meant to be together.",
    "Mình mới quen một tuần nhưng em đang ở nước ngoài và bị khóa thẻ.",
    "Anh sẽ trả lại em khi về.",
  ])("fires: %s", async (text) => {
    expect(await ids(text)).toContain("text.romance-bait");
  });

  it("has weight 0.35", () => {
    expect(group("text.romance-bait").weight).toBe(0.35);
  });
});

describe("added phrases are never bare words", () => {
  const cases: ReadonlyArray<readonly [string, string[]]> = [
    ["text.investment-pitch", allPhrases("text.investment-pitch")],
    ["text.romance-bait", allPhrases("text.romance-bait")],
    ["text.payment-request (added)", ADDED_PAYMENT_PHRASES],
  ];

  it.each(cases)("%s", (_name, phrases) => {
    expect(phrases.length).toBeGreaterThan(0);
    for (const phrase of phrases) {
      const normalized = normalizePhrase(phrase);
      expect(normalized.split(" ").filter(Boolean).length).toBeGreaterThanOrEqual(2);
      expect(BARE_WORDS).not.toContain(normalized);
    }
  });

  it("every added payment phrase exists in text.payment-request", () => {
    const present = allPhrases("text.payment-request").map(normalizePhrase);
    for (const phrase of ADDED_PAYMENT_PHRASES) {
      expect(present).toContain(normalizePhrase(phrase));
    }
  });
});

describe("text.payment-request additions", () => {
  it.each([
    "Please send me a gift card tonight.",
    "You must make your first deposit.",
    "Add funds to activate your account.",
  ])("fires: %s", async (text) => {
    expect(await ids(text)).toContain("text.payment-request");
  });

  it("a gift card for a birthday gives the same single signal as before", async () => {
    expect(await ids("Can you buy a gift card for Mum's birthday?")).toEqual([
      "text.payment-request",
    ]);
  });
});

describe("benign wording gives no signal", () => {
  it.each([
    "I miss you so much",
    "My brother is deployed overseas this year",
    "I am working overseas this year, I will be home in June",
    "Bitcoin rose 3% today",
  ])("%s", async (text) => {
    expect(await ids(text)).toEqual([]);
  });
});
