/**
 * Splits result sections into the scrolling part and the pinned foot of the
 * info frame (design A4). Nothing is lost and the order is kept.
 */

import type { SectionId } from "./page-layout";

export function splitSections(sections: readonly SectionId[]): {
  readonly scrolling: readonly SectionId[];
  readonly pinned: readonly SectionId[];
} {
  const list = Array.isArray(sections) ? sections : [];
  const scrolling = list.filter((s) => s !== "limitsNote");
  const pinned = list.filter((s) => s === "limitsNote");
  return { scrolling, pinned };
}
