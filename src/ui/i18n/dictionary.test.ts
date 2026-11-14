import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, en, t, vi, type MessageKey } from "./dictionary";

describe("dictionary", () => {
  it("DEFAULT_LOCALE is en", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it("t(undefined, key) equals t('en', key) for every key", () => {
    for (const key of Object.keys(en) as MessageKey[]) {
      expect(t(undefined, key)).toBe(t("en", key));
    }
  });

  it("falls back to English for an unknown locale", () => {
    expect(t("fr", "input.submit")).toBe(en["input.submit"]);
    expect(t(42, "input.submit")).toBe(en["input.submit"]);
  });

  it("uses Vietnamese when locale is vi", () => {
    expect(t("vi", "input.submit")).toBe(vi["input.submit"]);
  });

  it("fills params and replaces a missing param with empty text", () => {
    expect(t("en", "error.analyze.rate-limited", { seconds: 42 })).toBe(
      "You have checked many times. Please wait 42 sec and try again.",
    );
    expect(t("en", "error.analyze.rate-limited")).toBe(
      "You have checked many times. Please wait  sec and try again.",
    );
  });

  it("does not expand a {seconds} placeholder inside a param value", () => {
    expect(t("en", "error.technical.label", { code: "{seconds}" })).toBe(
      "Error code: {seconds}",
    );
    expect(
      t("en", "error.analyze.rate-limited", { seconds: "{seconds}" }),
    ).toBe("You have checked many times. Please wait {seconds} sec and try again.");
  });

  it("has the required English and Vietnamese unsupported-type text", () => {
    expect(en["error.ingest.unsupported-type"]).toBe(
      "This file type is not supported. Use PNG, JPG or WebP.",
    );
    const viText = vi["error.ingest.unsupported-type"];
    expect(viText).toContain("PNG");
    expect(viText).toContain("JPG");
    expect(viText).toContain("WebP");
  });

  it("has the English monster names", () => {
    expect(en["monster.bank.name"]).toBe("Bank Ghost");
    expect(en["monster.prize.name"]).toBe("Gift Vampire");
    expect(en["monster.job-bait.name"]).toBe("Job Zombie");
    expect(en["monster.authority.name"]).toBe("Authority Banshee");
    expect(en["monster.generic.name"]).toBe("Odd Shadow");
  });

  it("keeps every sentence at 25 words or fewer in both languages", () => {
    const tooLong: string[] = [];
    for (const [name, table] of [["en", en], ["vi", vi]] as const) {
      for (const [key, text] of Object.entries(table as Record<string, string>)) {
        const sentences = text.split(/(?<=[.!?…])\s+/);
        for (const s of sentences) {
          const words = s.trim().split(/\s+/).filter(Boolean).length;
          if (words > 25) tooLong.push(`${name}:${key} (${words})`);
        }
      }
    }
    expect(tooLong).toEqual([]);
  });
});
