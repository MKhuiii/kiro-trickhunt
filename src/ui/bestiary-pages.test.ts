import { describe, expect, it } from "vitest";
import {
  BESTIARY_ENTRIES,
  clampPage,
  entryForPage,
  flipTarget,
  pageCount,
} from "./bestiary";

describe("bestiary page helpers", () => {
  it("counts 14 pages for 13 entries", () => {
    expect(pageCount(BESTIARY_ENTRIES)).toBe(14);
  });

  it("clamps odd inputs", () => {
    expect(clampPage(Number.NaN, 14)).toBe(0);
    expect(clampPage(Infinity, 14)).toBe(13);
    expect(clampPage(-Infinity, 14)).toBe(0);
    expect(clampPage(-3, 14)).toBe(0);
    expect(clampPage(2.7, 14)).toBe(2);
    expect(clampPage(5, 0)).toBe(0);
    expect(clampPage(5, Number.NaN)).toBe(0);
  });

  it("stops at both ends", () => {
    expect(flipTarget(0, 14, "prev")).toBe(0);
    expect(flipTarget(13, 14, "next")).toBe(13);
    expect(flipTarget(0, 14, "next")).toBe(1);
    expect(flipTarget(13, 14, "prev")).toBe(12);
  });

  it("maps pages to entries", () => {
    expect(entryForPage(BESTIARY_ENTRIES, 0)).toBeUndefined();
    expect(entryForPage(BESTIARY_ENTRIES, 14)).toBeUndefined();
    expect(entryForPage(BESTIARY_ENTRIES, 1.5)).toBeUndefined();
    expect(entryForPage(BESTIARY_ENTRIES, Number.NaN)).toBeUndefined();
    expect(entryForPage(BESTIARY_ENTRIES, 1)?.id).toBe("monster:bank");
    expect(entryForPage(BESTIARY_ENTRIES, 13)).toBe(BESTIARY_ENTRIES[12]);
  });
});
