import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  BESTIARY_ENTRIES,
  clampPage,
  entryForPage,
  flipTarget,
  pageCount,
} from "./bestiary";
import type { FlipDirection } from "./bestiary";

const anyNumber = fc.oneof(
  fc.double({ noNaN: false }),
  fc.integer({ min: -50, max: 50 }),
  fc.constantFrom(Number.NaN, Infinity, -Infinity),
);
const direction = fc.constantFrom<FlipDirection>("next", "prev");
const opts = { numRuns: 100 };

describe("bestiary page helper properties", () => {
  it("PBT-135: clamp is in range and idempotent", () => {
    /** **Validates: Requirements REQ-BEST-10.2** */
    fc.assert(
      fc.property(anyNumber, anyNumber, (page, count) => {
        const r = clampPage(page, count);
        const max = Number.isFinite(count)
          ? Math.max(Math.floor(count) - 1, 0)
          : 0;
        expect(Number.isInteger(r)).toBe(true);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(max);
        expect(clampPage(r, count)).toBe(r);
      }),
      opts,
    );
  });

  it("PBT-136: flip stays in range and stops at the ends", () => {
    /** **Validates: Requirements REQ-BEST-10.3, REQ-BEST-05.10** */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 60 }),
        fc.nat({ max: 59 }),
        direction,
        (count, p, dir) => {
          const page = p % count;
          const r = flipTarget(page, count, dir);
          expect(r).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThanOrEqual(count - 1);
          const step = dir === "next" ? 1 : -1;
          const want = page + step;
          if (want >= 0 && want <= count - 1) expect(r).toBe(want);
          else expect(r).toBe(page);
        },
      ),
      opts,
    );
  });

  it("PBT-137: the notebook is walkable both ways", () => {
    /** **Validates: Requirements REQ-BEST-10.4** */
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 60 }), (count) => {
        let p = 0;
        for (let i = 0; i < count - 1; i++) p = flipTarget(p, count, "next");
        expect(p).toBe(count - 1);
        expect(flipTarget(p, count, "next")).toBe(count - 1);
        for (let i = 0; i < count - 1; i++) p = flipTarget(p, count, "prev");
        expect(p).toBe(0);
        expect(flipTarget(p, count, "prev")).toBe(0);
      }),
      opts,
    );
  });

  it("PBT-138: page to entry mapping", () => {
    /** **Validates: Requirements REQ-BEST-06.2, REQ-BEST-06.7, REQ-BEST-10.1, REQ-BEST-10.5** */
    fc.assert(
      fc.property(
        fc.subarray([...BESTIARY_ENTRIES]),
        fc.integer({ min: -5, max: 30 }),
        (entries, page) => {
          expect(pageCount(entries)).toBe(entries.length + 1);
          const e = entryForPage(entries, page);
          if (page < 1 || page > entries.length) expect(e).toBeUndefined();
          else expect(e).toBe(entries[page - 1]);
        },
      ),
      opts,
    );
    const seen = new Set<string>();
    for (let n = 1; n <= BESTIARY_ENTRIES.length; n++) {
      const e = entryForPage(BESTIARY_ENTRIES, n);
      expect(e).toBe(BESTIARY_ENTRIES[n - 1]);
      seen.add(e!.id);
    }
    expect(seen.size).toBe(15);
  });
});
