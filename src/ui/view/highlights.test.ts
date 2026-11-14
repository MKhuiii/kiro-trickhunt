import { describe, expect, it } from "vitest";
import { TextAnalyzer } from "../../analyzers/text-analyzer";
import { UrlAnalyzer } from "../../analyzers/url-analyzer";
import { parseLlmResponse } from "../../analyzers/semantic-analyzer";
import { evidenceNeedles } from "./evidence";
import { computeHighlights } from "./highlights";

const marked = (text: string, ev: string[]) =>
  computeHighlights(text, ev)
    .filter((s) => s.highlighted)
    .map((s) => s.text);

describe("computeHighlights examples", () => {
  it("highlights English text regardless of case as one segment", () => {
    const segs = computeHighlights("Your account is LOCKED", ["account is locked"]);
    expect(segs).toEqual([
      { start: 0, end: 5, text: "Your ", highlighted: false },
      { start: 5, end: 22, text: "account is LOCKED", highlighted: true },
    ]);
  });

  it("highlights real TextAnalyzer evidence from English phrases", async () => {
    const text = "URGENT: your account has been LOCKED, send money now";
    const signals = await new TextAnalyzer().analyze(text);
    expect(signals.length).toBeGreaterThan(0);
    const all = signals.flatMap((s) => evidenceNeedles(s));
    const hits = marked(text, all);
    expect(hits).toContain("URGENT");
    expect(hits).toContain("account has been LOCKED");
    expect(hits).toContain("send money");
  });

  it("highlights accent-free Vietnamese evidence", () => {
    const segs = computeHighlights("Tài khoản bị KHÓA", ["tai khoan bi khoa"]);
    expect(segs).toEqual([
      { start: 0, end: 17, text: "Tài khoản bị KHÓA", highlighted: true },
    ]);
  });

  it("locates ĐẶT CỌC by đặt cọc", () => {
    expect(marked("Vui lòng ĐẶT CỌC ngay", ["đặt cọc"])).toEqual(["ĐẶT CỌC"]);
  });

  it("does not highlight evidence containing [NUMBER]", () => {
    const text = "Call 0912345678 now";
    const segs = computeHighlights(text, ["Call [NUMBER] now"]);
    expect(segs).toEqual([{ start: 0, end: text.length, text, highlighted: false }]);
  });

  it("matches across whitespace runs", () => {
    expect(marked("act   \n now please", ["act now"])).toEqual(["act   \n now"]);
  });

  it("merges overlapping and touching ranges", () => {
    expect(marked("abcdef", ["abcd", "cdef"])).toEqual(["abcdef"]);
    expect(marked("abcdef", ["abc", "def"])).toEqual(["abcdef"]);
  });

  it("highlights every occurrence", () => {
    expect(marked("go now, go now", ["go now"])).toEqual(["go now", "go now"]);
  });
});

describe("computeHighlights real analyzer evidence", () => {
  const cases: [string, string, string[]][] = [
    ["url.punycode-host", "http://xn--pypal-4ve.com/", ["xn--pypal-4ve.com"]],
    ["url.at-in-authority", "http://user@evil.com/", ["user@evil.com"]],
    ["url.ip-address-host", "http://192.168.1.1/", ["192.168.1.1"]],
    ["url.excessive-subdomains", "http://a.b.c.example.com/", ["a.b.c.example.com"]],
    ["url.known-shortener", "http://bit.ly/abc", ["bit.ly"]],
    ["url.brand-lookalike", "http://paypa1.com/", ["paypa1"]],
    ["url.credential-keywords", "http://example.com/login/verify", ["/login/verify"]],
  ];

  it.each(cases)("%s", async (id, url, expected) => {
    const signal = (await new UrlAnalyzer().analyze(url)).find((s) => s.id === id);
    expect(signal).toBeDefined();
    expect(marked(url, evidenceNeedles(signal!))).toEqual(expected);
  });

  it("highlights parseLlmResponse evidence", () => {
    const sent = "Hello. Do not tell anyone about this offer.";
    const raw = JSON.stringify({
      signals: [
        { id: "semantic.isolation-secrecy", severity: 0.3, evidence: "Do not tell anyone" },
      ],
    });
    const signals = parseLlmResponse(raw, sent);
    expect(signals).toHaveLength(1);
    expect(marked(sent, evidenceNeedles(signals[0]!))).toEqual(["Do not tell anyone"]);
  });
});

describe("computeHighlights unicode safety", () => {
  const noSplit = (text: string, ev: string[]) => {
    for (const s of computeHighlights(text, ev)) {
      expect(s.text).toBe(text.slice(s.start, s.end));
      expect(s.text).not.toMatch(/^[\uDC00-\uDFFF]/);
      expect(s.text).not.toMatch(/[\uD800-\uDBFF]$/);
    }
  };

  it("keeps astral characters whole", () => {
    const text = "😀 LOCKED 😀";
    noSplit(text, ["locked", "😀"]);
    expect(marked(text, ["😀"])).toEqual(["😀", "😀"]);
    expect(marked(text, ["locked"])).toEqual(["LOCKED"]);
  });

  it("covers a folded match that contains an astral code point", () => {
    const text = "x 😀 KHÓA y";
    noSplit(text, ["😀 khoa"]);
    expect(marked(text, ["😀 khoa"])).toEqual(["😀 KHÓA"]);
  });

  it("includes combining marks inside a folded match", () => {
    const text = "Ta\u0301i khoan";
    expect(marked(text, ["tai khoan"])).toEqual([text]);
  });
});

describe("computeHighlights ignored evidence", () => {
  const plain = (text: string) => [{ start: 0, end: text.length, text, highlighted: false }];

  it("ignores empty, blank and longer-than-text evidence", () => {
    expect(computeHighlights("abc", ["", "   ", "abcd"])).toEqual(plain("abc"));
  });

  it("ignores evidence over 200 characters", () => {
    const text = "x".repeat(300);
    expect(computeHighlights(text, ["x".repeat(201)])).toEqual(plain(text));
  });

  it("returns [] for empty text and tolerates bad input", () => {
    expect(computeHighlights("", ["a"])).toEqual([]);
    expect(computeHighlights("abc", undefined as unknown as string[])).toEqual(plain("abc"));
    expect(computeHighlights("abc", [1 as unknown as string])).toEqual(plain("abc"));
  });
});

describe("computeHighlights performance", () => {
  it("handles 4000 characters with 50 needles quickly", () => {
    const text = "act now and send money ".repeat(180).slice(0, 4000);
    const needles = Array.from({ length: 50 }, (_, i) => (i % 2 ? "ACT NOW" : `missing${i}`));
    const t0 = Date.now();
    const segs = computeHighlights(text, needles);
    expect(Date.now() - t0).toBeLessThan(1000);
    expect(segs.map((s) => s.text).join("")).toBe(text);
  });
});
