import type { MessageKey } from "../i18n/en";
import type { ColorToken } from "./palettes";

/** Presentation of each risk level (REQ-UI-36). Labels are dictionary keys. */

export type LevelKey = "no_signals" | "suspicious" | "high" | "critical";

export interface LevelPresentation {
  /** Dictionary key `level.<level>`. */
  readonly labelKey: MessageKey;
  readonly iconKey: string;
  readonly colorToken: ColorToken;
  readonly darknessBand: 0 | 1 | 2 | 3;
}

export const LEVEL_PRESENTATION: Readonly<Record<LevelKey, LevelPresentation>> = {
  no_signals: {
    labelKey: "level.no_signals",
    iconKey: "icon-candle",
    colorToken: "level-none",
    darknessBand: 0,
  },
  suspicious: {
    labelKey: "level.suspicious",
    iconKey: "icon-eye",
    colorToken: "level-suspicious",
    darknessBand: 1,
  },
  high: {
    labelKey: "level.high",
    iconKey: "icon-warning",
    colorToken: "level-high",
    darknessBand: 2,
  },
  critical: {
    labelKey: "level.critical",
    iconKey: "icon-stop",
    colorToken: "level-critical",
    darknessBand: 3,
  },
};
