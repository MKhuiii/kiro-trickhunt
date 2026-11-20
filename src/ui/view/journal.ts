/**
 * The hunter's journal: a short first page and the full notes (design R2-A,
 * REQ-HUNT-66 to REQ-HUNT-68). Pure and total. Page 1 and page 2 together hold
 * every section of `resultSections`.
 */

import type { MessageKey } from "../i18n/en";
import { resultSections } from "./page-layout";
import type { SectionId } from "./page-layout";
import type { LinkCreatureView } from "./link-creatures-view";
import type { ReadyResultView, ResultView, SignalCardView } from "./result-view";

export const MAX_CLUES = 3;
export const MAX_ACTIONS = 3;

export interface JournalNote {
  readonly key: MessageKey;
  readonly params: Readonly<Record<string, string | number>>;
}

export interface JournalPage1 {
  readonly monsterNameKey: MessageKey;
  readonly monsterShortKey: MessageKey;
  readonly monsterArtKey: string;
  readonly monsterColorToken: ReadyResultView["monster"]["colorToken"];
  readonly levelKey: MessageKey;
  readonly iconKey: string;
  readonly percent: number;
  readonly noSignals: ReadyResultView["noSignals"];
  /** At most `MAX_ACTIONS`. The first is the primary action. */
  readonly actions: readonly string[];
  /** At most `MAX_CLUES`, most serious first. */
  readonly clues: readonly SignalCardView[];
  /** Link creatures found in the message, shown right after the monster. */
  readonly linkCreatures: readonly LinkCreatureView[];
  /** The one note worth a line on the first page. */
  readonly note: JournalNote | null;
  /** Other notes that moved to page 2. */
  readonly moreNotes: number;
  readonly limitsNoteKey: MessageKey;
}

export interface JournalReady {
  readonly kind: "ready";
  readonly page1: JournalPage1;
  /** Sections page 1 stands for. */
  readonly covers: readonly SectionId[];
  /** Sections shown in full on page 2, in `resultSections` order. */
  readonly page2: readonly SectionId[];
}

export interface JournalWithheld {
  readonly kind: "withheld";
  readonly messageKey: MessageKey;
  readonly limitsNoteKey: MessageKey;
  readonly covers: readonly SectionId[];
  readonly page2: readonly SectionId[];
}

export type JournalView = JournalReady | JournalWithheld;

const SEVERITY_RANK: Readonly<Record<SignalCardView["severityBand"], number>> = {
  high: 2,
  medium: 1,
  low: 0,
};

const PAGE1_SECTIONS: ReadonlySet<SectionId> = new Set<SectionId>([
  "heading",
  "levelBanner",
  "limitsNote",
]);

/** All clues, most serious first, equal severity keeps the original order. */
export function pickClues(view: ReadyResultView, max: number = MAX_CLUES): SignalCardView[] {
  const flat: { card: SignalCardView; index: number }[] = [];
  for (const group of view.signalGroups) {
    for (const card of group.cards) flat.push({ card, index: flat.length });
  }
  flat.sort(
    (a, b) =>
      SEVERITY_RANK[b.card.severityBand] - SEVERITY_RANK[a.card.severityBand] || a.index - b.index,
  );
  return flat.slice(0, Math.max(0, max)).map((e) => e.card);
}

function pickNote(view: ReadyResultView): { note: JournalNote | null; more: number } {
  const total =
    (view.aiNote !== null ? 1 : 0) +
    view.notices.length +
    (view.reputationNote !== null && view.reputationNote !== undefined ? 1 : 0);
  if (view.aiNote !== null) {
    return {
      note: { key: view.aiNote.textKey, params: {} },
      more: total - 1,
    };
  }
  const important =
    view.notices.find((n) => n.tone === "warning") ??
    view.notices.find((n) => n.kind === "wifi-qr");
  if (important !== undefined) {
    return { note: { key: important.key, params: important.params }, more: total - 1 };
  }
  return { note: null, more: total };
}

/** Builds the two journal pages from a result view. Total, never throws. */
export function buildJournalView(view: ResultView): JournalView {
  try {
    const sections = resultSections(view);
    const covers = sections.filter((s) => PAGE1_SECTIONS.has(s));
    const page2 = sections.filter((s) => !PAGE1_SECTIONS.has(s));

    if (view.kind === "withheld") {
      return {
        kind: "withheld",
        messageKey: view.messageKey,
        limitsNoteKey: view.limitsNoteKey,
        covers,
        page2,
      };
    }

    const { note, more } = pickNote(view);
    return {
      kind: "ready",
      covers,
      page2,
      page1: {
        monsterNameKey: view.monster.nameKey,
        monsterShortKey: view.monster.shortKey,
        monsterArtKey: view.monster.artKey,
        monsterColorToken: view.monster.colorToken,
        levelKey: view.levelKey,
        iconKey: view.riskMeter.iconKey,
        percent: view.riskMeter.percent,
        noSignals: view.noSignals,
        actions: view.actions.slice(0, MAX_ACTIONS),
        clues: pickClues(view),
        linkCreatures: view.linkCreatures,
        note,
        moreNotes: Math.max(0, more),
        limitsNoteKey: view.limitsNoteKey,
      },
    };
  } catch {
    return {
      kind: "withheld",
      messageKey: "result.withheld",
      limitsNoteKey: "result.limitsNote",
      covers: ["heading", "limitsNote"],
      page2: [],
    };
  }
}

/** The first sentence of a text. Page 1 shows only this much of each explanation. */
export function firstSentence(text: string): string {
  const s = typeof text === "string" ? text.trim() : "";
  const match = /^[\s\S]*?[.!?](?=\s|$)/.exec(s);
  return match === null ? s : match[0];
}
