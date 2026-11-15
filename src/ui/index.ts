// Public API of the UI presentation layer. No component code.

export { t, DEFAULT_LOCALE } from "./i18n/dictionary";
export type { MessageKey } from "./i18n/dictionary";

export {
  analyzeErrorMessage,
  ingestErrorMessage,
  noticeMessage,
} from "./i18n/messages";
export type { MessageRef } from "./i18n/messages";

export { buildResultView, chooseMonster } from "./view/result-view";
export type {
  ResultView,
  ReadyResultView,
  WithheldResultView,
  SignalCardView,
  SignalGroupView,
  NoticeView,
  ResultExtras,
} from "./view/result-view";

export { resultSections } from "./view/page-layout";
export type { SectionId } from "./view/page-layout";

export { aiUnavailable } from "./view/semantic-note";

export { runCheck } from "./run-check";
export type {
  CheckDeps,
  CheckInput,
  CheckStatus,
  CheckOutcome,
  NoticeInput,
  CheckLocale,
} from "./run-check";

export { paletteToCssVars } from "./theme/css-vars";
export type { CssVarName } from "./theme/css-vars";

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

export { flowReducer, canConfirm, shouldSubmitOnEnter } from "./view/flow";
export type {
  FlowStep,
  Slots,
  FlowState,
  FlowEvent,
} from "./view/flow";

export { MIN_HUNT_MS } from "./hunt.config";

export { legsFor, legFor, revealWaitMs } from "./view/journey";
export type { Leg } from "./view/journey";

export { sceneFor } from "./view/scene";
export type { ScenePhase, SceneInput, SceneView } from "./view/scene";

export { splitSections } from "./view/info-sections";
