import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { linkBadgesForGroup } from "./link-badges";
import type { LinkCreatureView } from "./link-creatures-view";
import type { SignalGroupView } from "./result-view";

const NUM_RUNS = 200;
const idArb = fc.constantFrom("url.a", "url.b", "url.c", "url.d", "text.x");

const creatureArb = fc
  .record({
    id: fc.string({ maxLength: 6 }),
    signalIds: fc.array(idArb, { maxLength: 4 }),
  })
  .map((c) => c as unknown as LinkCreatureView);

const groupArb = fc
  .record({
    source: fc.constantFrom("url", "text", "semantic", "image", "qr", "other"),
    labelKey: fc.constant("source.url"),
    cards: fc.array(
      fc.record({ signalId: idArb, evidence: fc.string({ maxLength: 10 }) }),
      { maxLength: 8 },
    ),
  })
  .map((g) => g as unknown as SignalGroupView);

describe("PBT-110 linkBadgesForGroup", () => {
  /** **Validates: Requirements REQ-PAGE-41** */
  it("is aligned, url-only, unique, supported, deterministic and non-mutating", () => {
    fc.assert(
      fc.property(groupArb, fc.array(creatureArb, { maxLength: 6 }), (group, creatures) => {
        const before = JSON.stringify([group, creatures]);
        const r1 = linkBadgesForGroup(group, creatures);
        const r2 = linkBadgesForGroup(group, creatures);
        expect(r1).toEqual(r2);
        expect(JSON.stringify([group, creatures])).toBe(before);
        expect(r1).toHaveLength(group.cards.length);
        if (group.source !== "url") expect(r1.every((x) => x === null)).toBe(true);
        const shown = r1.filter((x): x is LinkCreatureView => x !== null);
        expect(new Set(shown).size).toBe(shown.length);
        r1.forEach((badge, i) => {
          if (badge !== null) expect(badge.signalIds).toContain(group.cards[i].signalId);
        });
      }),
      { numRuns: NUM_RUNS },
    );
  });

  /** **Validates: Requirements REQ-PAGE-41** */
  it("never throws on garbage", () => {
    fc.assert(
      fc.property(fc.anything(), fc.anything(), (group, creatures) => {
        const r = linkBadgesForGroup(group as never, creatures as never);
        expect(Array.isArray(r)).toBe(true);
        expect(r.every((x) => x === null)).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
