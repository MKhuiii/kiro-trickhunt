import { describe, expect, it } from "vitest";
import {
  BESTIARY_ENTRIES,
  clampPage,
  entryForPage,
  flipTarget,
  pageCount,
} from "./bestiary";

describe("bestiary page helpers", () => {
  it("counts 16 pages for 15 entries", () => {
    expect(pageCount(BESTIARY_ENTRIES)).toBe(16);
  });

  it("clamps odd inputs", () => {
    expect(clampPage(Number.NaN, 16)).toBe(0);
    expect(clampPage(Infinity, 16)).toBe(15);
    expect(clampPage(-Infinity, 16)).toBe(0);
    expect(clampPage(-3, 16)).toBe(0);
    expect(clampPage(2.7, 16)).toBe(2);
    expect(clampPage(5, 0)).toBe(0);
    expect(clampPage(5, Number.NaN)).toBe(0);
  });

  it("stops at both ends", () => {
    expect(flipTarget(0, 16, "prev")).toBe(0);
    expect(flipTarget(15, 16, "next")).toBe(15);
    expect(flipTarget(0, 16, "next")).toBe(1);
    expect(flipTarget(15, 16, "prev")).toBe(14);
  });

  it("maps pages to entries", () => {
    expect(entryForPage(BESTIARY_ENTRIES, 0)).toBeUndefined();
    expect(entryForPage(BESTIARY_ENTRIES, 16)).toBeUndefined();
    expect(entryForPage(BESTIARY_ENTRIES, 1.5)).toBeUndefined();
    expect(entryForPage(BESTIARY_ENTRIES, Number.NaN)).toBeUndefined();
    expect(entryForPage(BESTIARY_ENTRIES, 1)?.id).toBe("monster:bank");
    expect(entryForPage(BESTIARY_ENTRIES, 15)).toBe(BESTIARY_ENTRIES[14]);
  });
});
