// Public API of the UI presentation layer. No component code.

export { t, DEFAULT_LOCALE } from "./i18n/dictionary";
export type { MessageKey } from "./i18n/dictionary";

export {
  analyzeErrorMessage,
  ingestErrorMessage,
  noticeMessage,
} from "./i18n/messages";
export type { MessageRef } from "./i18n/messages";

export { buildResultView } from "./view/result-view";
export type {
  ResultView,
  ReadyResultView,
  WithheldResultView,
  SignalCardView,
  SignalGroupView,
  NoticeView,
  ResultExtras,
} from "./view/result-view";

export { computeHighlights } from "./view/highlights";
export type { HighlightSegment } from "./view/highlights";

export { MONSTER_PRESENTATION } from "./monsters";
export type { MonsterKey } from "./monsters";

export { NORMAL_PALETTE, HIGH_CONTRAST_PALETTE } from "./theme/palettes";
export type { ColorToken, Palette } from "./theme/palettes";
export { contrastRatio } from "./theme/contrast";
export { LEVEL_PRESENTATION } from "./theme/levels";

export {
  loadPreferences,
  savePreference,
  getBrowserStorage,
} from "./preferences";
export type { Preferences, StorageLike } from "./preferences";
