import fc from "fast-check";
import { describe, it } from "vitest";
import { expect } from "vitest";
import { BESTIARY_ENTRIES, findEntry, groupEntries } from "./bestiary";
import { en, t, vi } from "./i18n/dictionary";
import { LINK_CREATURES, LINK_TONES } from "./link-creatures";
import { MONSTER_PRESENTATION } from "./monsters";

describe("bestiary properties", () => {
  // PBT-131
  it("PBT-131: every referenced key exists in en and vi and has text", () => {
    /** **Validates: Requirements REQ-BEST-01.4** */
    fc.assert(
      fc.property(fc.constantFrom(...BESTIARY_ENTRIES), (e) => {
        const keys = [
          e.nameKey,
          e.descKey,
          ...e.tipKeys,
          ...(e.toneLabelKey ? [e.toneLabelKey] : []),
          ...(e.toneExplainKey ? [e.toneExplainKey] : []),
        ];
        for (const k of keys) {
          expect(Object.hasOwn(en, k)).toBe(true);
          expect(Object.hasOwn(vi, k)).toBe(true);
          expect(t("en", k).length).toBeGreaterThan(0);
        }
      }),
    );
  });

  // PBT-132
  it("PBT-132: table derives from monsters and link creatures", () => {
    /** **Validates: Requirements REQ-BEST-01.1, REQ-BEST-01.3, REQ-BEST-01.5, REQ-BEST-01.6** */
    const monsters = BESTIARY_ENTRIES.filter((e) => e.kind === "monster");
    const links = BESTIARY_ENTRIES.filter((e) => e.kind === "link");
    const keys = (["bank", "prize", "job-bait", "authority", "generic"] as const);
    expect(monsters.map((e) => e.id)).toEqual(keys.map((k) => `monster:${k}`));
    monsters.forEach((e, i) => {
      const p = MONSTER_PRESENTATION[keys[i]];
      expect(e.nameKey).toBe(p.nameKey);
      expect(e.artKey).toBe(p.artKey);
      expect(e.colorToken).toBe(p.colorToken);
      expect(e.toneLabelKey).toBeUndefined();
      expect(e.toneExplainKey).toBeUndefined();
    });
    expect(links).toHaveLength(LINK_CREATURES.length);
    links.forEach((e, i) => {
      const c = LINK_CREATURES[i];
      expect(e.id).toBe(`link:${c.id}`);
      expect(e.nameKey).toBe(c.nameKey);
      expect(e.artKey).toBe(c.artKey);
      expect(e.colorToken).toBe(c.colorToken);
      expect(e.toneLabelKey).toBe(LINK_TONES[c.tone].labelKey);
      expect(e.toneExplainKey).toBe(
        c.explanationKey ?? LINK_TONES[c.tone].explanationKey,
      );
    });
    expect(new Set(BESTIARY_ENTRIES.map((e) => e.id)).size).toBe(
      BESTIARY_ENTRIES.length,
    );
  });

  // PBT-133
  it("PBT-133: findEntry is total and groupEntries keeps order", () => {
    /** **Validates: Requirements REQ-BEST-02.1, REQ-BEST-02.4** */
    const ids = new Set(BESTIARY_ENTRIES.map((e) => e.id));
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.constantFrom(...ids), fc.constant("__proto__")),
        (id) => {
          const found = findEntry(id);
          expect(found !== undefined).toBe(ids.has(id));
        },
      ),
    );
    fc.assert(
      fc.property(
        fc.subarray([...BESTIARY_ENTRIES]),
        (sub) => {
          const g = groupEntries(sub);
          expect([...g.monsters, ...g.links]).toHaveLength(sub.length);
          expect(g.monsters).toEqual(sub.filter((e) => e.kind === "monster"));
          expect(g.links).toEqual(sub.filter((e) => e.kind === "link"));
        },
      ),
    );
  });
});
