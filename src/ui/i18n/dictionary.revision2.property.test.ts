import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { en } from "./en";
import { vi } from "./vi";

// PBT-99 (REQ-HUNT-67, REQ-HUNT-74): the journal and sound keys.

const PREFIXES = ["journal.", "settings.sound.", "sound."];
const BANNED = /\b(safe|clean)\b|an toàn/i;

function keysOf(table: Readonly<Record<string, string>>): string[] {
  return Object.keys(table).filter((k) => PREFIXES.some((p) => k.startsWith(p)));
}

describe("PBT-99 journal and sound dictionary keys", () => {
  it("has the journal and sound keys in both languages with identical sets", () => {
    const enKeys = keysOf(en).sort();
    const viKeys = keysOf(vi).sort();
    expect(enKeys.length).toBeGreaterThan(0);
    expect(viKeys).toEqual(enKeys);
  });

  /** **Validates: Requirements REQ-HUNT-67, REQ-HUNT-74** */
  it("no such string uses safe, clean or an toàn", () => {
    const keys = keysOf(en);
    fc.assert(
      fc.property(fc.constantFrom(...keys), (key) => {
        const enText = (en as Readonly<Record<string, string>>)[key];
        const viText = (vi as Readonly<Record<string, string>>)[key];
        expect(BANNED.test(enText)).toBe(false);
        expect(BANNED.test(viText.normalize("NFC"))).toBe(false);
        expect(enText.trim()).not.toBe("");
        expect(viText.trim()).not.toBe("");
      }),
      { numRuns: 100 },
    );
  });
});
