import { describe, expect, it } from "vitest";
import {
  clampSpread,
  flipSpread,
  pagesOfSpread,
  spreadCount,
  spreadOf,
  visiblePages,
} from "./bestiary";

describe("bestiary spread helpers", () => {
  it("14 pages give 7 spreads", () => {
    expect(spreadCount(14)).toBe(7);
  });

  it("spread 0 is pages 0 and 1, spread 6 is pages 12 and 13", () => {
    expect(pagesOfSpread(0, 14)).toEqual({ left: 0, right: 1 });
    expect(pagesOfSpread(6, 14)).toEqual({ left: 12, right: 13 });
  });

  it("an odd count of 5 gives 3 spreads with a blank right leaf on the last", () => {
    expect(spreadCount(5)).toBe(3);
    expect(pagesOfSpread(2, 5)).toEqual({ left: 4, right: undefined });
    expect(pagesOfSpread(1, 5)).toEqual({ left: 2, right: 3 });
  });

  it("maps pages to spreads", () => {
    expect(spreadOf(5, 14)).toBe(2);
    expect(spreadOf(13, 14)).toBe(6);
    expect(spreadOf(99, 14)).toBe(6);
  });

  it("flips one spread and stops at the ends", () => {
    expect(flipSpread(0, 14, "next")).toBe(1);
    expect(flipSpread(0, 14, "prev")).toBe(0);
    expect(flipSpread(6, 14, "next")).toBe(6);
    expect(flipSpread(6, 14, "prev")).toBe(5);
  });

  it("handles NaN and Infinity", () => {
    expect(clampSpread(Number.NaN, 14)).toBe(0);
    expect(clampSpread(Infinity, 14)).toBe(6);
    expect(clampSpread(-Infinity, 14)).toBe(0);
    expect(spreadCount(Number.NaN)).toBe(1);
    expect(spreadCount(Infinity)).toBe(1);
    expect(spreadCount(0)).toBe(1);
    expect(spreadOf(Number.NaN, 14)).toBe(0);
    expect(pagesOfSpread(Number.NaN, Number.NaN)).toEqual({
      left: 0,
      right: undefined,
    });
    expect(flipSpread(Number.NaN, 14, "next")).toBe(1);
  });

  it("single mode shows only the clamped page", () => {
    expect(visiblePages(5, 14, "single")).toEqual({
      left: 5,
      right: undefined,
    });
    expect(visiblePages(99, 14, "single")).toEqual({
      left: 13,
      right: undefined,
    });
    expect(visiblePages(5, 14, "spread")).toEqual({ left: 4, right: 5 });
  });
});
