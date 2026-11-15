import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { en } from "./en";
import { vi } from "./vi";

const enTable: Readonly<Record<string, string>> = en;
const viTable: Readonly<Record<string, string>> = vi;

const HUNT_KEYS = Object.keys(enTable).filter(
  (k) => k.startsWith("scene.") || k.startsWith("bag."),
);

function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "d")
    .toLowerCase();
}

const BANNED = /safe|clean|an toan/;

describe("hunt dictionary property tests (PBT-92)", () => {
  it("has scene.* and bag.* keys to check", () => {
    expect(HUNT_KEYS.length).toBeGreaterThan(0);
  });

  /**
   * **Validates: Requirements REQ-HUNT-34**
   */
  it("no scene.* or bag.* string contains safe, clean or an toàn in en or vi", () => {
    fc.assert(
      fc.property(fc.constantFrom(...HUNT_KEYS), fc.constantFrom("en", "vi"), (key, lang) => {
        const text = (lang === "en" ? enTable : viTable)[key];
        expect(typeof text).toBe("string");
        expect(BANNED.test(fold(text))).toBe(false);
      }),
      { numRuns: 200 },
    );
  });

  /**
   * **Validates: Requirements REQ-HUNT-34**
   */
  it("en and vi have identical key sets", () => {
    expect(Object.keys(viTable).sort()).toEqual(Object.keys(enTable).sort());
    const viHunt = Object.keys(viTable).filter(
      (k) => k.startsWith("scene.") || k.startsWith("bag."),
    );
    expect(viHunt.sort()).toEqual([...HUNT_KEYS].sort());
  });
});
