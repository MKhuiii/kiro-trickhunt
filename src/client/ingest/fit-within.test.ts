import { describe, expect, it } from "vitest";
import { fitWithin } from "./fit-within";

describe("fitWithin", () => {
  it("returns small sizes unchanged", () => {
    expect(fitWithin(800, 600, 2400)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(2400, 2400, 2400)).toEqual({ width: 2400, height: 2400 });
  });

  it("scales 4800x2400 to 2400x1200", () => {
    expect(fitWithin(4800, 2400, 2400)).toEqual({ width: 2400, height: 1200 });
  });

  it("scales portrait images by the longer side", () => {
    expect(fitWithin(2400, 4800, 2400)).toEqual({ width: 1200, height: 2400 });
  });

  it("keeps each side at least 1 for extreme ratios", () => {
    expect(fitWithin(1, 100000, 2400)).toEqual({ width: 1, height: 2400 });
  });

  it.each([
    [0, 100, 2400],
    [100, 0, 2400],
    [-1, 100, 2400],
    [100, 100, 0],
    [Number.NaN, 100, 2400],
    [100, Infinity, 2400],
    [1.5, 100, 2400],
    [100, 100, 2400.5],
    [Number.MAX_SAFE_INTEGER + 1, 100, 2400],
  ])("gives zeros for invalid input (%j, %j, %j)", (w, h, m) => {
    expect(fitWithin(w, h, m)).toEqual({ width: 0, height: 0 });
  });

  it("gives zeros for non-number input", () => {
    expect(fitWithin("10" as unknown as number, 10, 10)).toEqual({ width: 0, height: 0 });
  });
});
