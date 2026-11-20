import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  clampPage,
  clampSpread,
  flipSpread,
  pagesOfSpread,
  spreadCount,
  spreadOf,
  visiblePages,
} from "./bestiary";
import type { FlipDirection } from "./bestiary";

const anyNumber = fc.oneof(
  fc.double({ noNaN: false }),
  fc.integer({ min: -50, max: 50 }),
  fc.constantFrom(Number.NaN, Infinity, -Infinity),
);
const count = fc.integer({ min: 1, max: 60 });
const direction = fc.constantFrom<FlipDirection>("next", "prev");
const opts = { numRuns: 100 };

describe("bestiary spread helper properties", () => {
  it("PBT-139: counts and clamps are in range", () => {
    /** **Validates: Requirements REQ-BEST-12.2** */
    fc.assert(
      fc.property(anyNumber, anyNumber, (spread, n) => {
        const total = spreadCount(n);
        const r = clampSpread(spread, n);
        expect(Number.isInteger(total)).toBe(true);
        expect(total).toBeGreaterThanOrEqual(1);
        expect(Number.isInteger(r)).toBe(true);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(total - 1);
        expect(clampSpread(r, n)).toBe(r);
      }),
      opts,
    );
  });

  it("PBT-140: flip stays in range and the ends stop", () => {
    /** **Validates: Requirements REQ-BEST-12.6** */
    fc.assert(
      fc.property(anyNumber, anyNumber, direction, (spread, n, dir) => {
        const total = spreadCount(n);
        const r = flipSpread(spread, n, dir);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(r).toBeLessThanOrEqual(total - 1);
        if (dir === "prev" && clampSpread(spread, n) === 0) expect(r).toBe(0);
        if (dir === "next" && clampSpread(spread, n) === total - 1) {
          expect(r).toBe(total - 1);
        }
      }),
      opts,
    );
  });

  it("PBT-141: the last spread is reached in spreadCount - 1 flips", () => {
    /** **Validates: Requirements REQ-BEST-12.6** */
    fc.assert(
      fc.property(count, (n) => {
        let s = 0;
        for (let i = 0; i < spreadCount(n) - 1; i += 1) {
          s = flipSpread(s, n, "next");
        }
        expect(s).toBe(spreadCount(n) - 1);
        for (let i = 0; i < spreadCount(n) - 1; i += 1) {
          s = flipSpread(s, n, "prev");
        }
        expect(s).toBe(0);
      }),
      opts,
    );
  });

  it("PBT-142: the mapping covers each page exactly once, with parity", () => {
    /** **Validates: Requirements REQ-BEST-12.2, REQ-BEST-12.3, REQ-BEST-12.4 */
    fc.assert(
      fc.property(count, (n) => {
        const seen: number[] = [];
        for (let s = 0; s < spreadCount(n); s += 1) {
          const { left, right } = pagesOfSpread(s, n);
          seen.push(left);
          if (right !== undefined) seen.push(right);
          else expect(s).toBe(spreadCount(n) - 1);
        }
        expect(seen).toEqual(Array.from({ length: n }, (_, i) => i));
        const last = pagesOfSpread(spreadCount(n) - 1, n);
        expect(last.right === undefined).toBe(n % 2 === 1);
      }),
      opts,
    );
  });

  it("PBT-143: a clicked page is visible in its spread", () => {
    /** **Validates: Requirements REQ-BEST-12.7** */
    fc.assert(
      fc.property(count, anyNumber, (n, page) => {
        const p = clampPage(page, n);
        const { left, right } = pagesOfSpread(spreadOf(p, n), n);
        expect(p === left || p === right).toBe(true);
        const v = visiblePages(p, n, "spread");
        expect(v).toEqual({ left, right });
      }),
      opts,
    );
  });

  it("PBT-144: a mode change keeps the page", () => {
    /** **Validates: Requirements REQ-BEST-12.8** */
    fc.assert(
      fc.property(count, anyNumber, (n, page) => {
        const p = clampPage(page, n);
        expect(visiblePages(p, n, "single").left).toBe(p);
        const spread = visiblePages(p, n, "spread");
        expect([spread.left, spread.right]).toContain(p);
        // spread -> single -> spread shows the same spread
        expect(visiblePages(spread.left, n, "spread")).toEqual(spread);
      }),
      opts,
    );
  });
});
