import type { MonsterId } from "../pipeline";
import type { MessageKey } from "./i18n/en";
import type { ColorToken } from "./theme/palettes";

/** Every pipeline monster plus the neutral candle shown for `no_signals`. */
export type MonsterKey = MonsterId | "neutral";

/** Presentation of each monster (REQ-UI-29, REQ-UI-30, REQ-UI-31). */
export const MONSTER_PRESENTATION: Readonly<
  Record<
    MonsterKey,
    {
      readonly id: MonsterKey;
      readonly nameKey: MessageKey;
      readonly colorToken: ColorToken;
      readonly artKey: string;
    }
  >
> = {
  bank: {
    id: "bank",
    nameKey: "monster.bank.name",
    colorToken: "monster-bank",
    artKey: "monster-bank-ghost",
  },
  prize: {
    id: "prize",
    nameKey: "monster.prize.name",
    colorToken: "monster-prize",
    artKey: "monster-prize-vampire",
  },
  "job-bait": {
    id: "job-bait",
    nameKey: "monster.job-bait.name",
    colorToken: "monster-job-bait",
    artKey: "monster-job-zombie",
  },
  authority: {
    id: "authority",
    nameKey: "monster.authority.name",
    colorToken: "monster-authority",
    artKey: "monster-authority-banshee",
  },
  investment: {
    id: "investment",
    nameKey: "monster.investment.name",
    colorToken: "monster-investment",
    artKey: "monster-investment-goblin",
  },
  romance: {
    id: "romance",
    nameKey: "monster.romance.name",
    colorToken: "monster-romance",
    artKey: "monster-romance-wraith",
  },
  generic: {
    id: "generic",
    nameKey: "monster.generic.name",
    colorToken: "monster-generic",
    artKey: "monster-generic-shade",
  },
  neutral: {
    id: "neutral",
    nameKey: "monster.neutral.name",
    colorToken: "monster-neutral",
    artKey: "monster-neutral-candle",
  },
};
