import { describe, expect, it } from "vitest";
import { foldString, foldWithMap } from "./folding";

describe("foldString", () => {
  it("lower-cases, strips marks and maps đ to d", () => {
    expect(foldString("KHÓA")).toBe("khoa");
    expect(foldString("Đ")).toBe("d");
    expect(foldString("đặt")).toBe("dat");
  });
});

describe("foldWithMap", () => {
  it("folds Vietnamese text", () => {
    expect(foldWithMap("Tài khoản bị KHÓA").folded).toBe("tai khoan bi khoa");
    expect(foldWithMap("ĐẶT CỌC").folded).toBe("dat coc");
  });

  it("maps đ to a single folded index with the source range", () => {
    const r = foldWithMap("Đa");
    expect(r.folded).toBe("da");
    expect(r.starts).toEqual([0, 1]);
    expect(r.ends).toEqual([1, 2]);
  });

  it("collapses whitespace runs into one space covering the whole run", () => {
    const r = foldWithMap("a  \t b");
    expect(r.folded).toBe("a b");
    expect(r.starts).toEqual([0, 1, 5]);
    expect(r.ends).toEqual([1, 5, 6]);
  });

  it("keeps maps the same length as the folded text", () => {
    const r = foldWithMap("Tài  khoản 😀 KHÓA");
    expect(r.starts).toHaveLength(r.folded.length);
    expect(r.ends).toHaveLength(r.folded.length);
  });

  it("maps astral code points to their full surrogate pair", () => {
    const r = foldWithMap("😀a");
    expect(r.folded).toBe("😀a");
    expect(r.starts).toEqual([0, 0, 2]);
    expect(r.ends).toEqual([2, 2, 3]);
  });

  it("drops combining marks without adding indexes", () => {
    const r = foldWithMap("e\u0301x");
    expect(r.folded).toBe("ex");
    expect(r.starts).toEqual([0, 2]);
    expect(r.ends).toEqual([1, 3]);
  });

  it("handles empty and non-string input", () => {
    expect(foldWithMap("")).toEqual({ folded: "", starts: [], ends: [] });
    expect(foldWithMap(undefined as unknown as string).folded).toBe("");
  });
});
