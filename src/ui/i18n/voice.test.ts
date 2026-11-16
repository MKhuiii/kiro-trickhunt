import { describe, expect, it } from "vitest";
import { en } from "./en";
import { vi } from "./vi";
import {
  BANNED_EXEMPT_KEY,
  FIXED_TEXT,
  TIER_RULES,
  bannedWords,
  countHorrorWords,
  isRequiredThemed,
  longestWord,
  sentenceLengths,
  tierOf,
  tierRuleIndex,
  words,
} from "./voice";

describe("tierOf", () => {
  it("puts plain meaning keys in tier C", () => {
    for (const key of [
      "app.name",
      "privacy.note",
      "level.critical",
      "result.actions.heading",
      "journal.do.heading",
      "result.limitsNote",
      "result.noSignals.summary",
      "signal.text.urgency.explain",
      "monster.bank.tip1",
      "bag.enter.hint",
      "notice.payment-qr",
      "error.generic",
      "topbar.language",
      "settings.open",
      "prefs.reduceMotion",
      "a11y.skip",
    ]) {
      expect(tierOf(key), key).toBe("C");
    }
  });

  it("puts the scene, monster and heading keys in tier A", () => {
    for (const key of [
      "app.tagline",
      "scene.hunt.forest",
      "home.hunter.action",
      "bag.heading",
      "bag.slot.on",
      "hunt.again",
      "monster.bank.name",
      "monster.job-bait.short",
      "result.monster.heading",
      "result.tips.heading",
      "result.frame.label",
      "journal.title",
    ]) {
      expect(tierOf(key), key).toBe("A");
    }
  });

  it("puts the progress, report and settings-sound keys in tier B", () => {
    for (const key of [
      "input.submit",
      "progress.sending",
      "result.heading",
      "result.message.note",
      "result.evidence.label",
      "journal.clues.heading",
      "journal.more",
      "settings.sound.label",
    ]) {
      expect(tierOf(key), key).toBe("B");
    }
  });

  it("returns null for a key that no rule covers", () => {
    expect(tierOf("brand.new.key")).toBeNull();
    expect(tierRuleIndex("brand.new.key")).toBe(-1);
  });

  it("has four rules in a fixed order", () => {
    expect(TIER_RULES.map((r) => r.tier)).toEqual(["C", "C", "A", "B"]);
  });
});

describe("isRequiredThemed", () => {
  it("covers the listed keys and every monster name and short", () => {
    expect(isRequiredThemed("app.tagline")).toBe(true);
    expect(isRequiredThemed("monster.generic.short")).toBe(true);
    expect(isRequiredThemed("monster.neutral.name")).toBe(true);
    expect(isRequiredThemed("bag.slot.on")).toBe(false);
    expect(isRequiredThemed("monster.bank.tip1")).toBe(false);
  });
});

describe("words", () => {
  it("splits on letters, keeps TrickHunt as one word, ignores placeholders", () => {
    expect(words("TrickHunt looks for the hunter's {name} trail.")).toEqual([
      "trickhunt",
      "looks",
      "for",
      "the",
      "hunter",
      "s",
      "trail",
    ]);
  });

  it("handles Vietnamese letters", () => {
    expect(words("Bóng ma khoác áo")).toEqual(["bóng", "ma", "khoác", "áo"]);
  });
});

describe("countHorrorWords", () => {
  it("counts English horror words and never counts TrickHunt as hunt", () => {
    expect(countHorrorWords("The hunter lights the lantern.", "en")).toBe(2);
    expect(countHorrorWords("TrickHunt looks for warning signs.", "en")).toBe(0);
    expect(countHorrorWords("Nothing to see here.", "en")).toBe(0);
  });

  it("counts Vietnamese phrases once, longest first", () => {
    expect(countHorrorWords("Bác thợ săn vào bóng tối", "vi")).toBe(2);
    expect(countHorrorWords("Ma cà rồng cầm hộp quà", "vi")).toBe(1);
    expect(countHorrorWords("Đang thắp đèn", "vi")).toBe(1);
  });

  it("does not read mã (code) as ma (ghost)", () => {
    expect(countHorrorWords("Hãy nhập mã xác nhận", "vi")).toBe(0);
    expect(countHorrorWords("Một con ma", "vi")).toBe(1);
  });
});

describe("bannedWords", () => {
  it("finds banned English words as whole words only", () => {
    expect(bannedWords("This is safe and clean", "en")).toEqual(["safe", "clean"]);
    expect(bannedWords("The deadline is near", "en")).toEqual([]);
    expect(bannedWords("Hello", "en")).toEqual([]);
  });

  it("finds banned Vietnamese phrases", () => {
    expect(bannedWords("Rất an toàn, chắc chắn 100%", "vi")).toEqual(
      expect.arrayContaining(["an toàn", "chắc chắn 100%"]),
    );
    expect(bannedWords("Bóng ma lởn vởn", "vi")).toEqual([]);
  });
});

describe("length helpers", () => {
  it("counts words per sentence and ignores placeholders and symbols", () => {
    expect(sentenceLengths("One two three. Four five!")).toEqual([3, 2]);
    expect(sentenceLengths("Reading the strange marks in the image: {percent}%")).toEqual([7]);
    expect(sentenceLengths("")).toEqual([]);
  });

  it("finds the longest word", () => {
    expect(longestWord("a bb Highlighted")).toBe(11);
    expect(longestWord("")).toBe(0);
  });
});

describe("fixed text", () => {
  it("matches the dictionaries word for word", () => {
    for (const [key, text] of Object.entries(FIXED_TEXT)) {
      expect((en as Record<string, string>)[key], `en ${key}`).toBe(text.en);
      expect((vi as Record<string, string>)[key], `vi ${key}`).toBe(text.vi);
    }
    expect(Object.keys(FIXED_TEXT)).toHaveLength(12);
    expect(Object.keys(FIXED_TEXT)).toContain(BANNED_EXEMPT_KEY);
  });
});
