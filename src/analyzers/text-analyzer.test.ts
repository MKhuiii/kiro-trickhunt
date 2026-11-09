import { describe, it, expect } from "vitest";
import {
  normalizeText,
  toPaddedText,
  normalizePhrase,
  matchesPhrase,
  findMatchedPhrases,
  extractEntities,
  TextAnalyzer,
} from "./text-analyzer";
import { TEXT_PATTERNS } from "./text-analyzer.config";

describe("phrase matching", () => {
  const match = (text: string, phrase: string) =>
    matchesPhrase(toPaddedText(text), normalizePhrase(phrase));

  it("matches 'XAC MINH' and 'xác minh' to the same phrase", () => {
    const phrase = normalizePhrase("xác minh");
    expect(matchesPhrase(toPaddedText("XAC MINH"), phrase)).toBe(true);
    expect(matchesPhrase(toPaddedText("xác minh"), phrase)).toBe(true);
    expect(normalizePhrase("XAC MINH")).toBe(phrase);
  });

  it("handles đ", () => {
    expect(match("Vui lòng ĐĂNG NHẬP ngay", "dang nhap")).toBe(true);
    expect(match("dang nhap", "đăng nhập")).toBe(true);
  });

  it("does not match 'pin' inside 'spinning'", () => {
    expect(match("spinning wheel", "pin")).toBe(false);
    expect(match("pinned", "pin")).toBe(false);
    expect(match("a pin here", "pin")).toBe(true);
  });

  it("matches across punctuation boundaries", () => {
    expect(match("Send your PIN.", "pin")).toBe(true);
    expect(match("(pin)", "pin")).toBe(true);
    expect(match("your,pin!now", "pin")).toBe(true);
    expect(match("verify-your-account", "your account")).toBe(true);
  });

  it("returns false for empty phrase or empty text", () => {
    expect(match("anything", "")).toBe(false);
    expect(match("", "pin")).toBe(false);
  });

  it("findMatchedPhrases returns original phrases that match", () => {
    const phrases = ["PIN", "Xác minh", "gift card"].map((original) => ({
      original,
      normalized: normalizePhrase(original),
    }));
    expect(findMatchedPhrases(toPaddedText("Enter your pin. XAC MINH now"), phrases)).toEqual([
      "PIN",
      "Xác minh",
    ]);
    expect(findMatchedPhrases(toPaddedText("spinning"), phrases)).toEqual([]);
  });
});

describe("normalizeText", () => {
  it("is case- and diacritic-insensitive", () => {
    expect(normalizeText("XAC MINH")).toBe("xac minh");
    expect(normalizeText("xác minh")).toBe("xac minh");
  });

  it("maps đ/Đ to d", () => {
    expect(normalizeText("Đăng nhập")).toBe("dang nhap");
    expect(normalizeText("đồng")).toBe("dong");
  });

  it("collapses whitespace and trims", () => {
    expect(normalizeText("  a \t\n  b  ")).toBe("a b");
    expect(normalizeText("")).toBe("");
  });
});

describe("TextAnalyzer", () => {
  const analyzer = new TextAnalyzer();
  const groups = TEXT_PATTERNS.map((p) => [p.id, p] as const);
  const cases = TEXT_PATTERNS.flatMap((p) =>
    (["en", "vi"] as const).map((lang) => [p.id, lang, p.phrases[lang][0], p.weight] as const),
  );

  it("has the expected source type", () => {
    expect(analyzer.sourceType).toBe("text");
  });

  it("covers all 8 groups", () => {
    expect(TEXT_PATTERNS).toHaveLength(8);
  });

  it.each(cases)("%s (%s): '%s' yields that group's signal", async (id, _lang, phrase, weight) => {
    const signals = await analyzer.analyze(`Hello, ${phrase}.`);
    const hits = signals.filter((s) => s.id === id);
    expect(hits).toHaveLength(1);
    expect(hits[0].source).toBe("text");
    expect(hits[0].severity).toBe(weight);
    expect(hits[0].evidence).toBe(phrase);
  });

  it.each(groups)("%s: severity equals configured weight", async (_id, p) => {
    const signals = await analyzer.analyze(p.phrases.en[0]);
    const hit = signals.find((s) => s.id === p.id);
    expect(hit?.severity).toBe(p.weight);
  });

  it.each(groups)("%s: several phrases in one group give one signal", async (id, p) => {
    const text = `${p.phrases.en[0]}. ${p.phrases.vi[0]}`;
    const hits = (await analyzer.analyze(text)).filter((s) => s.id === id);
    expect(hits).toHaveLength(1);
    expect(hits[0].evidence).toBe(`${p.phrases.en[0]}, ${p.phrases.vi[0]}`);
  });

  it("joins matched phrases with ', ' in config order", async () => {
    const signals = await analyzer.analyze("URGENT: act now!");
    const hit = signals.find((s) => s.id === "text.urgency");
    expect(hit?.evidence).toBe("act now, urgent");
    expect(signals.filter((s) => s.id === "text.urgency")).toHaveLength(1);
  });

  it("matches Vietnamese without accents", async () => {
    const signals = await analyzer.analyze("KHAN CAP, nop phat");
    expect(signals.map((s) => s.id)).toEqual(
      expect.arrayContaining(["text.urgency", "text.threat"]),
    );
  });

  it("returns [] for empty string and for benign text", async () => {
    expect(await analyzer.analyze("")).toEqual([]);
    expect(await analyzer.analyze("See you at lunch tomorrow")).toEqual([]);
  });

  it("is deterministic", async () => {
    const text = "Urgent! Send your OTP and your card number, chuyển khoản ngay lập tức";
    const a = await analyzer.analyze(text);
    const b = await analyzer.analyze(text);
    expect(a.length).toBeGreaterThan(0);
    expect(b).toEqual(a);
  });
});

describe("extractEntities", () => {
  it("extracts https:// and www. URLs", () => {
    const e = extractEntities("Go to https://bank.example.com/login or www.example.org/x now");
    expect(e.urls).toEqual(["https://bank.example.com/login", "www.example.org/x"]);
  });

  it("removes trailing punctuation from URLs", () => {
    const e = extractEntities("Click https://a.example.com/x. Or (www.b.example.com), really?");
    expect(e.urls).toEqual(["https://a.example.com/x", "www.b.example.com"]);
  });

  it("extracts a VN phone number 0912345678", () => {
    const e = extractEntities("Call 0912345678 today");
    expect(e.phoneNumbers).toEqual(["0912345678"]);
  });

  it("extracts a VN phone number with country code and spaces", () => {
    const e = extractEntities("Call +84 912 345 678 today");
    expect(e.phoneNumbers).toEqual(["+84 912 345 678"]);
  });

  it("extracts a 16-digit account number", () => {
    const e = extractEntities("Transfer to 1234567890123456 please");
    expect(e.accountNumbers).toEqual(["1234567890123456"]);
    expect(e.phoneNumbers).toEqual([]);
  });

  it("does not repeat a phone number as an account number", () => {
    const e = extractEntities("Call 0912345678 or +84 912 345 678");
    expect(e.phoneNumbers).toEqual(["0912345678", "+84 912 345 678"]);
    expect(e.accountNumbers).toEqual([]);
  });

  it("removes duplicates", () => {
    const e = extractEntities(
      "https://a.example.com 0912345678 1234567890123456 https://a.example.com 0912345678 1234567890123456",
    );
    expect(e.urls).toEqual(["https://a.example.com"]);
    expect(e.phoneNumbers).toEqual(["0912345678"]);
    expect(e.accountNumbers).toEqual(["1234567890123456"]);
  });

  it("returns empty arrays for an empty string", () => {
    expect(extractEntities("")).toEqual({ urls: [], phoneNumbers: [], accountNumbers: [] });
  });

  it("returns values that are substrings of the input", () => {
    const text =
      "Visit www.example.com/a, call +84 912 345 678 or 0912345678, pay 1234567890123456. https://x.example.com!";
    const e = extractEntities(text);
    const all = [...e.urls, ...e.phoneNumbers, ...e.accountNumbers];
    expect(all.length).toBeGreaterThan(0);
    for (const v of all) expect(text.includes(v)).toBe(true);
  });
});
