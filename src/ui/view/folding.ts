/**
 * Folded_Text: text normalized one code point at a time, with an index map
 * back to the original (REQ-UI-24). Pure, no DOM.
 */

export interface FoldedText {
  readonly folded: string;
  /** For each folded UTF-16 index, the start of its source code point. */
  readonly starts: readonly number[];
  /** For each folded UTF-16 index, the end (exclusive) of its source code point. */
  readonly ends: readonly number[];
}

const WHITESPACE_CP = /^\s+$/u;

/** Fold one code point (or any short string): NFD, marks off, đ to d, lower case. */
export function foldString(cp: string): string {
  return cp
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/\p{M}/gu, "");
}

export function foldWithMap(text: string): FoldedText {
  if (typeof text !== "string") return { folded: "", starts: [], ends: [] };

  const out: string[] = [];
  const starts: number[] = [];
  const ends: number[] = [];
  let prevWasSpace = false;
  let i = 0;

  for (const cp of text) {
    const next = i + cp.length;
    if (WHITESPACE_CP.test(cp)) {
      if (prevWasSpace) {
        // Extend the existing collapsed-space entry over this whitespace.
        ends[ends.length - 1] = next;
      } else {
        out.push(" ");
        starts.push(i);
        ends.push(next);
        prevWasSpace = true;
      }
    } else {
      const f = foldString(cp);
      for (let k = 0; k < f.length; k++) {
        starts.push(i);
        ends.push(next);
      }
      if (f.length > 0) {
        out.push(f);
        prevWasSpace = false;
      }
    }
    i = next;
  }

  return { folded: out.join(""), starts, ends };
}
