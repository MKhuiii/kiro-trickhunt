import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import { computeHighlights } from "./highlights";
import type { HighlightSegment } from "./highlights";

const NUM_RUNS = 200;

function run(text: unknown, evidences: unknown): HighlightSegment[] {
  return computeHighlights(text as string, evidences as readonly string[]);
}

function checkPartition(text: string, segs: readonly HighlightSegment[]): void {
  if (text.length === 0) {
    expect(segs).toEqual([]);
    return;
  }
  expect(segs.length).toBeGreaterThan(0);
  let pos = 0;
  for (const s of segs) {
    expect(s.start).toBe(pos);
    expect(s.end).toBeGreaterThan(s.start);
    expect(s.text).toBe(text.slice(s.start, s.end));
    pos = s.end;
  }
  expect(pos).toBe(text.length);
  expect(segs.map((s) => s.text).join("")).toBe(text);
}

const isHigh = (c: number): boolean => c >= 0xd800 && c <= 0xdbff;
const isLow = (c: number): boolean => c >= 0xdc00 && c <= 0xdfff;

/** True when index i sits between the two halves of a well-formed surrogate pair. */
function splitsPair(text: string, i: number): boolean {
  if (i <= 0 || i >= text.length) return false;
  return isHigh(text.charCodeAt(i - 1)) && isLow(text.charCodeAt(i));
}

function isCovered(segs: readonly HighlightSegment[], a: number, b: number): boolean {
  for (let i = a; i < b; i++) {
    const seg = segs.find((s) => i >= s.start && i < s.end);
    if (seg === undefined || !seg.highlighted) return false;
  }
  return true;
}

describe("PBT-67: highlight segments partition the text exactly", () => {
  /** Evidence pieces: random junk plus slices of the text itself. */
  const evidenceArb = (text: string): fc.Arbitrary<unknown[]> =>
    fc.array(
      fc.oneof(
        fc.string(),
        fc.anything(),
        fc.constant(""),
        fc.constant("   "),
        fc
          .tuple(fc.nat(text.length), fc.nat(text.length))
          .map(([a, b]) => text.slice(Math.min(a, b), Math.max(a, b))),
        fc.constant(text + text),
      ),
      { maxLength: 60 },
    );

  const textArb = fc.oneof(
    fc.string({ unit: "binary" }),
    fc.string({ unit: "grapheme" }),
    fc.string({ unit: "binary", maxLength: 12 }),
    fc.constantFrom("", "a", "😀", "a😀a", "Ta\u0301i", "\ud800", "x\udc00y"),
  );

  it("segments are ordered, gap-free, overlap-free, non-empty and concatenate to the input", () => {
    fc.assert(
      fc.property(
        textArb.chain((text) => fc.tuple(fc.constant(text), evidenceArb(text))),
        ([text, evidences]) => {
          checkPartition(text, run(text, evidences));
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("never throws for non-string text or a non-array evidence list", () => {
    fc.assert(
      fc.property(fc.anything(), fc.anything(), (text, evidences) => {
        const segs = run(text, evidences);
        if (typeof text === "string") checkPartition(text, segs);
        else expect(segs).toEqual([]);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("handles repeated evidence and evidence longer than the text", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme", maxLength: 30 }), fc.nat(5), (text, n) => {
        const ev = [text, text + "x", ...Array.from({ length: n }, () => text)];
        checkPartition(text, run(text, ev));
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("PBT-68: substring, case-changed and accent-stripped evidence is covered", () => {
  const ALPHABET = [
    ..."abcdeiotuAEIOTU0123",
    " ",
    " ",
    "đ",
    "Đ",
    "à",
    "á",
    "ả",
    "ã",
    "ạ",
    "ă",
    "ằ",
    "â",
    "ấ",
    "ê",
    "ế",
    "ô",
    "ố",
    "ơ",
    "ờ",
    "ư",
    "ữ",
    "Ả",
    "Ê",
    "Ô",
    "\u0300",
    "\u0301",
    "\u0303",
    "\u0309",
    "\u0323",
    "😀",
    "𝒜",
  ];
  const isMark = (cp: string): boolean => /^\p{M}$/u.test(cp);

  const sampleArb = fc
    .array(fc.constantFrom(...ALPHABET), { minLength: 1, maxLength: 40 })
    .chain((cps) =>
      fc.tuple(fc.nat(cps.length - 1), fc.nat(cps.length - 1)).map(([x, y]) => {
        const i = Math.min(x, y);
        const j = Math.max(x, y) + 1;
        const before = cps.slice(0, i).join("");
        const slice = cps.slice(i, j).join("");
        return { text: cps.join(""), before, slice };
      }),
    );

  /** Original range of the trimmed slice, or undefined if unusable. */
  function trimmedRange(before: string, slice: string): [number, number] | undefined {
    const lead = slice.length - slice.trimStart().length;
    const trimmed = slice.trim();
    if (trimmed === "") return undefined;
    const first = Array.from(trimmed)[0] ?? "";
    if (isMark(first)) return undefined;
    const a = before.length + lead;
    return [a, a + trimmed.length];
  }

  function noSplit(text: string, segs: readonly HighlightSegment[]): void {
    for (const s of segs) {
      expect(splitsPair(text, s.start)).toBe(false);
      expect(splitsPair(text, s.end)).toBe(false);
    }
  }

  const stripDiacritics = (s: string): string =>
    s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D");

  it("covers an exact substring and never splits a surrogate pair", () => {
    fc.assert(
      fc.property(sampleArb, ({ text, before, slice }) => {
        const trimmed = slice.trim();
        fc.pre(trimmed !== "");
        const segs = run(text, [slice]);
        checkPartition(text, segs);
        noSplit(text, segs);
        const at = text.indexOf(trimmed);
        expect(at).toBeGreaterThanOrEqual(0);
        expect(isCovered(segs, at, at + trimmed.length)).toBe(true);
        // the original occurrence is highlighted too
        const range = trimmedRange(before, slice);
        if (range !== undefined) expect(isCovered(segs, range[0], range[1])).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("covers the original characters for case-changed and accent-stripped evidence", () => {
    fc.assert(
      fc.property(sampleArb, ({ text, before, slice }) => {
        const range = trimmedRange(before, slice);
        fc.pre(range !== undefined);
        const [a, b] = range as [number, number];
        // Folding removes combining marks and then trims whitespace, so a slice whose
        // edge is whitespace followed only by marks (e.g. "x \u0300") folds to evidence
        // that no longer reaches that edge. REQ-UI-23/24 do not require covering such
        // edge characters, so those samples are out of scope.
        const core = stripDiacritics(slice.trim());
        fc.pre(core === core.trim());
        const variants = [
          slice.toUpperCase(),
          slice.toLowerCase(),
          stripDiacritics(slice),
          stripDiacritics(slice).toUpperCase(),
        ];
        for (const ev of variants) {
          const t = ev.trim();
          // An exact hit elsewhere is taken before folding (REQ-UI-23): out of scope here.
          if (t === "" || text.includes(t)) continue;
          const segs = run(text, [ev]);
          checkPartition(text, segs);
          noSplit(text, segs);
          expect(isCovered(segs, a, b)).toBe(true);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
