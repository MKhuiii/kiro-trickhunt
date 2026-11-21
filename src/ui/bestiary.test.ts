import { describe, expect, it } from "vitest";
import { BESTIARY_ENTRIES, findEntry, groupEntries } from "./bestiary";
import { en } from "./i18n/en";
import { LINK_CREATURES } from "./link-creatures";

describe("bestiary entries", () => {
  it("has 15 entries in the specified order", () => {
    expect(BESTIARY_ENTRIES.map((e) => e.id)).toEqual([
      "monster:bank",
      "monster:prize",
      "monster:job-bait",
      "monster:authority",
      "monster:investment",
      "monster:romance",
      "monster:generic",
      ...LINK_CREATURES.map((c) => `link:${c.id}`),
    ]);
    expect(BESTIARY_ENTRIES).toHaveLength(15);
  });

  it("does not include the neutral candle", () => {
    expect(BESTIARY_ENTRIES.some((e) => e.id.includes("neutral"))).toBe(false);
  });

  it("puts tone keys only on link entries", () => {
    for (const e of BESTIARY_ENTRIES) {
      if (e.kind === "link") {
        expect(e.toneLabelKey).toBeDefined();
        expect(e.toneExplainKey).toBeDefined();
      } else {
        expect(e.toneLabelKey).toBeUndefined();
        expect(e.toneExplainKey).toBeUndefined();
      }
    }
  });

  it("uses the plague-mark explanation override", () => {
    expect(findEntry("link:plague-mark")?.toneExplainKey).toBe(
      "link.plague-mark.explain",
    );
  });

  it("has dictionary keys and at least one tip", () => {
    for (const e of BESTIARY_ENTRIES) {
      expect(e.tipKeys.length).toBeGreaterThan(0);
      for (const k of [e.nameKey, e.descKey, ...e.tipKeys]) {
        expect(Object.hasOwn(en, k)).toBe(true);
      }
    }
  });

  it("groups monsters then links", () => {
    const g = groupEntries(BESTIARY_ENTRIES);
    expect(g.monsters).toHaveLength(7);
    expect(g.links).toHaveLength(8);
  });

  it("findEntry returns undefined for unknown ids", () => {
    expect(findEntry("nope")).toBeUndefined();
    expect(findEntry("__proto__")).toBeUndefined();
  });
});
