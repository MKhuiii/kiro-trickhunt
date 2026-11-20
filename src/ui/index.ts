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

export { LINK_CREATURES, LINK_TONES } from "./link-creatures";
export type {
  LinkCreature,
  LinkCreatureId,
  LinkTone,
} from "./link-creatures";
export type { LinkCreatureView } from "./view/link-creatures-view";
export { linkBadgesForGroup } from "./view/link-badges";

export { buildReputationNote } from "./view/reputation-note";
export type { ReputationNoteView } from "./view/reputation-note";

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

export {
  BESTIARY_ENTRIES,
  groupEntries,
  findEntry,
  pageCount,
  clampPage,
  flipTarget,
  entryForPage,
  spreadCount,
  clampSpread,
  spreadOf,
  pagesOfSpread,
  flipSpread,
  visiblePages,
} from "./bestiary";
export type {
  BestiaryEntry,
  EntryKind,
  FlipDirection,
  LayoutMode,
} from "./bestiary";

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

export { stagePlan, profileFor } from "./view/stage-plan";
export type {
  StagePlan,
  StageLayer,
  StageLayerId,
  StageMotion,
  StageParticles,
  ParticleKind,
  StageProfile,
  DeviceInfo,
} from "./view/stage-plan";

export { buildJournalView, firstSentence, pickClues } from "./view/journal";
export type {
  JournalView,
  JournalReady,
  JournalWithheld,
  JournalPage1,
  JournalNote,
} from "./view/journal";

export { soundPlan } from "./view/sound-plan";
export type { SoundPlan, SoundCue, CueId } from "./view/sound-plan";
