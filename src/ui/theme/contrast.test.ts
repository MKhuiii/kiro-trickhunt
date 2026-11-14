import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

describe("contrastRatio", () => {
  it("gives 21 for black on white and white on black", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
  });

  it("gives 1 for equal colors", () => {
    expect(contrastRatio("#1B1230", "#1B1230")).toBe(1);
    expect(contrastRatio("#fff", "#FFFFFF")).toBe(1);
  });

  it("accepts short hex form", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 5);
  });

  it("gives 1 for invalid input", () => {
    expect(contrastRatio("red", "#FFFFFF")).toBe(1);
    expect(contrastRatio("#FFFFFF", "")).toBe(1);
    expect(contrastRatio("#12345", "#000000")).toBe(1);
  });

  it("matches a known mid-grey ratio", () => {
    // #777777 on white is about 4.48:1
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 1);
  });
});
