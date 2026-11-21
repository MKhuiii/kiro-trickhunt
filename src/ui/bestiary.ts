import type { MessageKey } from "./i18n/en";
import { LINK_CREATURES, LINK_TONES } from "./link-creatures";
import { MONSTER_PRESENTATION } from "./monsters";
import type { MonsterKey } from "./monsters";
import type { ColorToken } from "./theme/palettes";

export type EntryKind = "monster" | "link";

export interface BestiaryEntry {
  /** Unique across both kinds, e.g. "monster:bank", "link:hydra". */
  readonly id: string;
  readonly kind: EntryKind;
  readonly nameKey: MessageKey;
  readonly descKey: MessageKey;
  readonly tipKeys: readonly MessageKey[];
  readonly artKey: string;
  readonly colorToken: ColorToken;
  /** Link entries only. */
  readonly toneLabelKey?: MessageKey;
  /** Link entries only. */
  readonly toneExplainKey?: MessageKey;
}

const MONSTER_ORDER: readonly Exclude<MonsterKey, "neutral">[] = [
  "bank",
  "prize",
  "job-bait",
  "authority",
  "investment",
  "romance",
  "generic",
];

/** The single place a built string becomes a MessageKey. A test checks every result. */
function key(text: string): MessageKey {
  return text as MessageKey;
}

function tips(prefix: string): readonly MessageKey[] {
  return [key(`${prefix}.tip1`), key(`${prefix}.tip2`), key(`${prefix}.tip3`)];
}

const MONSTER_ENTRIES: readonly BestiaryEntry[] = MONSTER_ORDER.map((m) => {
  const p = MONSTER_PRESENTATION[m];
  return {
    id: `monster:${m}`,
    kind: "monster" as const,
    nameKey: p.nameKey,
    descKey: key(`monster.${m}.short`),
    tipKeys: tips(`monster.${m}`),
    artKey: p.artKey,
    colorToken: p.colorToken,
  };
});

const LINK_ENTRIES: readonly BestiaryEntry[] = LINK_CREATURES.map((c) => {
  const tone = LINK_TONES[c.tone];
  return {
    id: `link:${c.id}`,
    kind: "link" as const,
    nameKey: c.nameKey,
    descKey: key(`link.${c.id}.desc`),
    tipKeys: tips(`link.${c.id}`),
    artKey: c.artKey,
    colorToken: c.colorToken,
    toneLabelKey: tone.labelKey,
    toneExplainKey: c.explanationKey ?? tone.explanationKey,
  };
});

export const BESTIARY_ENTRIES: readonly BestiaryEntry[] = [
  ...MONSTER_ENTRIES,
  ...LINK_ENTRIES,
];

export function groupEntries(entries: readonly BestiaryEntry[]): {
  readonly monsters: readonly BestiaryEntry[];
  readonly links: readonly BestiaryEntry[];
} {
  return {
    monsters: entries.filter((e) => e.kind === "monster"),
    links: entries.filter((e) => e.kind === "link"),
  };
}

export function findEntry(id: string): BestiaryEntry | undefined {
  return BESTIARY_ENTRIES.find((e) => e.id === id);
}

export type FlipDirection = "next" | "prev";

/** Entries plus the contents page. */
export function pageCount(entries: readonly BestiaryEntry[]): number {
  return entries.length + 1;
}

/** Integer index in [0, max(count - 1, 0)] for any input. */
export function clampPage(page: number, count: number): number {
  const max = Number.isFinite(count) ? Math.max(Math.floor(count) - 1, 0) : 0;
  if (Number.isNaN(page)) return 0;
  return Math.min(Math.max(Math.trunc(page), 0), max);
}

/** One step in `direction` from the clamped page; stays at the ends. */
export function flipTarget(
  page: number,
  count: number,
  direction: FlipDirection,
): number {
  return clampPage(
    clampPage(page, count) + (direction === "next" ? 1 : -1),
    count,
  );
}

/** Page 0 and any page outside 1..entries.length give undefined. Never throws. */
export function entryForPage(
  entries: readonly BestiaryEntry[],
  page: number,
): BestiaryEntry | undefined {
  if (!Number.isInteger(page) || page < 1 || page > entries.length) {
    return undefined;
  }
  return entries[page - 1];
}

export type LayoutMode = "single" | "spread";

/** Same effective count as clampPage: finite and at least 1, else 1. */
function effectiveCount(count: number): number {
  return Number.isFinite(count) ? Math.max(Math.floor(count), 1) : 1;
}

/** Number of two-page spreads for a page count (at least 1). */
export function spreadCount(count: number): number {
  return Math.ceil(effectiveCount(count) / 2);
}

/** Integer spread index in [0, spreadCount - 1] for any input. */
export function clampSpread(spread: number, count: number): number {
  const max = spreadCount(count) - 1;
  if (Number.isNaN(spread)) return 0;
  return Math.min(Math.max(Math.trunc(spread), 0), max);
}

/** The spread that holds the (clamped) page. */
export function spreadOf(page: number, count: number): number {
  return Math.floor(clampPage(page, count) / 2);
}

/** Left and right page of a spread; right is undefined for a blank leaf. */
export function pagesOfSpread(
  spread: number,
  count: number,
): { readonly left: number; readonly right: number | undefined } {
  const left = 2 * clampSpread(spread, count);
  const right = left + 1 <= effectiveCount(count) - 1 ? left + 1 : undefined;
  return { left, right };
}

/** One spread step in `direction`; stays at the ends. */
export function flipSpread(
  spread: number,
  count: number,
  direction: FlipDirection,
): number {
  return clampSpread(
    clampSpread(spread, count) + (direction === "next" ? 1 : -1),
    count,
  );
}

/** Pages on screen for the focused page in the given layout mode. */
export function visiblePages(
  page: number,
  count: number,
  mode: LayoutMode,
): { readonly left: number; readonly right: number | undefined } {
  if (mode === "single") {
    return { left: clampPage(page, count), right: undefined };
  }
  return pagesOfSpread(spreadOf(page, count), count);
}
