import { foldString, foldWithMap } from "./folding";
import type { FoldedText } from "./folding";

export interface HighlightSegment {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly highlighted: boolean;
}

const MAX_EVIDENCES = 50;
const MAX_EVIDENCE_CHARS = 200;
const MAX_RANGES = 200;

type Range = readonly [number, number];

/** Collect occurrences of needle in haystack, stepping one unit after each hit. */
function collect(
  haystack: string,
  needle: string,
  budget: number,
  onHit: (a: number, b: number) => void,
): number {
  let found = 0;
  let from = 0;
  while (found < budget) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) break;
    onHit(at, at + needle.length);
    found++;
    from = at + 1;
  }
  return found;
}

export function computeHighlights(
  text: string,
  evidences: readonly string[],
): HighlightSegment[] {
  try {
    if (typeof text !== "string" || text.length === 0) return [];
    if (!Array.isArray(evidences)) return [{ start: 0, end: text.length, text, highlighted: false }];

    const needles: string[] = [];
    const seen = new Set<string>();
    for (const raw of (evidences as readonly unknown[]).slice(0, MAX_EVIDENCES)) {
      if (typeof raw !== "string") continue;
      const n = raw.trim();
      if (n === "" || n.length > MAX_EVIDENCE_CHARS || n.length > text.length) continue;
      if (seen.has(n)) continue;
      seen.add(n);
      needles.push(n);
    }

    const ranges: Range[] = [];
    let folded: FoldedText | undefined;

    for (const needle of needles) {
      const budget = MAX_RANGES - ranges.length;
      if (budget <= 0) break;

      const exact = collect(text, needle, budget, (a, b) => ranges.push([a, b]));
      if (exact > 0) continue;

      folded ??= foldWithMap(text);
      const fneedle = foldString(needle).replace(/\s+/gu, " ").trim();
      if (fneedle === "") continue;
      collect(folded.folded, fneedle, budget, (a, b) => {
        const s = folded!.starts[a];
        let e = folded!.ends[b - 1];
        if (s === undefined || e === undefined) return;
        // Folding drops combining marks, so keep trailing marks of the last base inside the range.
        for (;;) {
          const cp = text.codePointAt(e);
          if (cp === undefined) break;
          const ch = String.fromCodePoint(cp);
          if (!/^\p{M}$/u.test(ch)) break;
          e += ch.length;
        }
        ranges.push([s, e]);
      });
    }

    // Clip, sort, merge overlapping or touching ranges.
    const clipped: Range[] = [];
    for (const [a, b] of ranges) {
      const s = Math.max(0, a);
      const e = Math.min(text.length, b);
      if (e > s) clipped.push([s, e]);
    }
    clipped.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const merged: [number, number][] = [];
    for (const [s, e] of clipped) {
      const last = merged[merged.length - 1];
      if (last !== undefined && s <= last[1]) {
        if (e > last[1]) last[1] = e;
      } else {
        merged.push([s, e]);
      }
    }

    const segments: HighlightSegment[] = [];
    let pos = 0;
    for (const [s, e] of merged) {
      if (s > pos) {
        segments.push({ start: pos, end: s, text: text.slice(pos, s), highlighted: false });
      }
      segments.push({ start: s, end: e, text: text.slice(s, e), highlighted: true });
      pos = e;
    }
    if (pos < text.length) {
      segments.push({ start: pos, end: text.length, text: text.slice(pos), highlighted: false });
    }
    return segments;
  } catch {
    return typeof text === "string" && text.length > 0
      ? [{ start: 0, end: text.length, text, highlighted: false }]
      : [];
  }
}
