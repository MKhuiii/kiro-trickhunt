import type { ColorToken } from "./palettes";

/** Declared foreground/background pairs that must meet contrast (REQ-UI-33, REQ-UI-34). */

export type PairUse = "text" | "large-text" | "ui";

export interface DeclaredPair {
  readonly fg: ColorToken;
  readonly bg: ColorToken;
  readonly use: PairUse;
}

/** Minimum ratio per use, normal palette. */
export const PAIR_THRESHOLDS: Readonly<Record<PairUse, number>> = {
  text: 4.5,
  "large-text": 3,
  ui: 3,
};

/** Minimum ratio for `text` uses in the high-contrast palette. */
export const HIGH_CONTRAST_TEXT_THRESHOLD = 7;

const SURFACES: readonly ColorToken[] = ["bg", "surface", "raised"];
const CARD_SURFACES: readonly ColorToken[] = ["surface", "raised"];

const LEVEL_TOKENS: readonly ColorToken[] = [
  "level-none",
  "level-suspicious",
  "level-high",
  "level-critical",
];

const MONSTER_TOKENS: readonly ColorToken[] = [
  "monster-bank",
  "monster-prize",
  "monster-job-bait",
  "monster-authority",
  "monster-generic",
  "monster-investment",
  "monster-romance",
];

export const LINK_TOKENS: readonly ColorToken[] = [
  "link-doppelganger",
  "link-changeling",
  "link-faceless-one",
  "link-masked-stranger",
  "link-hydra",
  "link-cloaked-gate",
  "link-wisp",
  "link-plague-mark",
];

function cross(
  fgs: readonly ColorToken[],
  bgs: readonly ColorToken[],
  use: PairUse,
): DeclaredPair[] {
  return fgs.flatMap((fg) => bgs.map((bg) => ({ fg, bg, use })));
}

export const DECLARED_PAIRS: readonly DeclaredPair[] = [
  ...cross(["text", "muted"], SURFACES, "text"),
  ...cross(["accent"], ["bg", "surface"], "text"),
  { fg: "on-accent", bg: "accent", use: "text" },
  ...cross(LEVEL_TOKENS, CARD_SURFACES, "text"),
  ...cross(MONSTER_TOKENS, CARD_SURFACES, "text"),
  ...cross(["focus", "border"], SURFACES, "ui"),
  // AI note (REQ-PAGE-34): text on raised, accent border on raised.
  { fg: "text", bg: "raised", use: "text" },
  { fg: "accent", bg: "raised", use: "ui" },
  // Limits note: muted text on the page background.
  { fg: "muted", bg: "bg", use: "text" },
  // Bag panel (REQ-HUNT-47).
  { fg: "parchment-text", bg: "parchment", use: "text" },
  { fg: "parchment-border", bg: "parchment", use: "ui" },
  // The logo above the hunter: lantern-colored display text on the page background.
  { fg: "lantern", bg: "bg", use: "large-text" },
  // The logo above the hunter: lantern-colored display text on the page background.
  { fg: "lantern", bg: "bg", use: "large-text" },
  // Journal paper (REQ-HUNT-69): dark ink on light paper.
  { fg: "ink", bg: "paper", use: "text" },
  { fg: "ink-faded", bg: "paper", use: "text" },
  { fg: "blood", bg: "paper", use: "ui" },
  // Link creatures (REQ-LINK-15, REQ-LINK-16).
  ...cross(LINK_TOKENS, CARD_SURFACES, "text"),
  // Link creature badge art (REQ-PAGE-46): 8 tokens x 2 surfaces = 16 ui pairs.
  ...cross(LINK_TOKENS, CARD_SURFACES, "ui"),
];
