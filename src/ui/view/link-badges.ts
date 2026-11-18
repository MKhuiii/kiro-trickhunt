import type { LinkCreatureView } from "./link-creatures-view";
import type { SignalGroupView } from "./result-view";

function cardCount(group: SignalGroupView): number {
  try {
    const cards: unknown = group.cards;
    return Array.isArray(cards) ? cards.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Aligns link creatures with the cards of a signal group (REQ-PAGE-41).
 * Only the `url` group gets badges. A card gets the first creature not yet
 * used whose signalIds contain the card's signalId; every other slot is null.
 * Pure and total: any failure gives all null. Never mutates its inputs.
 */
export function linkBadgesForGroup(
  group: SignalGroupView,
  linkCreatures: readonly LinkCreatureView[],
): readonly (LinkCreatureView | null)[] {
  try {
    const count = cardCount(group);
    const result: (LinkCreatureView | null)[] = new Array<LinkCreatureView | null>(count).fill(
      null,
    );
    if (group.source !== "url" || !Array.isArray(linkCreatures)) return result;
    const used = new Set<number>();
    for (let i = 0; i < count; i++) {
      const signalId = group.cards[i]?.signalId;
      if (typeof signalId !== "string") continue;
      const idx = linkCreatures.findIndex(
        (c, j) =>
          !used.has(j) &&
          c !== null &&
          typeof c === "object" &&
          Array.isArray(c.signalIds) &&
          c.signalIds.includes(signalId),
      );
      if (idx >= 0) {
        used.add(idx);
        result[i] = linkCreatures[idx];
      }
    }
    return result;
  } catch {
    return new Array<null>(cardCount(group)).fill(null);
  }
}
