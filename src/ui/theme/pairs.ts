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
];
