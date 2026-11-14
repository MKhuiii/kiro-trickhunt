import type { Locale, MonsterId, Verdict } from "../../pipeline";
import { t } from "../i18n/dictionary";
import type { MessageKey } from "../i18n/en";
import { explanationKeyFor } from "../i18n/signal-ids";
import { MONSTER_PRESENTATION } from "../monsters";
import type { MonsterKey } from "../monsters";
import { LEVEL_PRESENTATION } from "../theme/levels";
import type { LevelKey } from "../theme/levels";
import type { ColorToken } from "../theme/palettes";
import { evidenceNeedles, shortEvidence } from "./evidence";
import { computeHighlights } from "./highlights";
import type { HighlightSegment } from "./highlights";
import { buildNotices } from "./notices";
import type { NoticeView, ResultExtras } from "./notices";
import { semanticNoteKey } from "./semantic-note";

export type { NoticeView, ResultExtras };

export interface WithheldResultView {
  readonly kind: "withheld";
  readonly messageKey: "result.withheld";
  readonly notices: readonly NoticeView[];
}

export interface SignalCardView {
  readonly signalId: string;
  readonly explanationKey: MessageKey;
  readonly evidence: string;
  readonly severityBand: "low" | "medium" | "high";
}

export interface SignalGroupView {
  readonly source: string;
  readonly labelKey: MessageKey;
  readonly cards: readonly SignalCardView[];
}

export interface ReadyResultView {
  readonly kind: "ready";
  readonly state: "neutral" | "monster";
  readonly locale: Locale;
  readonly monster: {
    readonly id: MonsterKey;
    readonly nameKey: MessageKey;
    readonly shortKey: MessageKey;
    readonly tipKeys: readonly MessageKey[];
    readonly colorToken: ColorToken;
    readonly artKey: string;
  };
  readonly levelKey: MessageKey;
  readonly riskMeter: {
    readonly percent: number;
    readonly labelKey: MessageKey;
    readonly iconKey: string;
    readonly darknessBand: 0 | 1 | 2 | 3;
  };
  readonly noSignals: {
    readonly summaryKey: MessageKey;
    readonly notSafeKey: MessageKey;
    readonly reminderKey: MessageKey;
  } | null;
  readonly highlights: readonly HighlightSegment[];
  readonly signalGroups: readonly SignalGroupView[];
  readonly actions: readonly string[];
  readonly limitations: readonly string[];
  readonly semanticNoteKey: MessageKey;
  readonly notices: readonly NoticeView[];
  readonly announcement: string;
}

export type ResultView = ReadyResultView | WithheldResultView;

const SOURCE_ORDER = ["text", "url", "semantic", "image", "qr", "other"] as const;
type SourceName = (typeof SOURCE_ORDER)[number];

const SOURCE_LABEL: Readonly<Record<SourceName, MessageKey>> = {
  text: "source.text",
  url: "source.url",
  semantic: "source.semantic",
  image: "source.image",
  qr: "source.qr",
  other: "source.other",
};

const MONSTER_TEXT: Readonly<
  Record<MonsterKey, { short: MessageKey; tips: readonly MessageKey[] }>
> = {
  bank: {
    short: "monster.bank.short",
    tips: ["monster.bank.tip1", "monster.bank.tip2", "monster.bank.tip3"],
  },
  prize: {
    short: "monster.prize.short",
    tips: ["monster.prize.tip1", "monster.prize.tip2", "monster.prize.tip3"],
  },
  "job-bait": {
    short: "monster.job-bait.short",
    tips: ["monster.job-bait.tip1", "monster.job-bait.tip2", "monster.job-bait.tip3"],
  },
  authority: {
    short: "monster.authority.short",
    tips: ["monster.authority.tip1", "monster.authority.tip2", "monster.authority.tip3"],
  },
  generic: {
    short: "monster.generic.short",
    tips: ["monster.generic.tip1", "monster.generic.tip2", "monster.generic.tip3"],
  },
  neutral: { short: "monster.neutral.short", tips: [] },
};

function withheld(notices: readonly NoticeView[]): WithheldResultView {
  return { kind: "withheld", messageKey: "result.withheld", notices };
}

function isLevel(x: unknown): x is LevelKey {
  return typeof x === "string" && Object.hasOwn(LEVEL_PRESENTATION, x);
}

function isMonsterId(x: unknown): x is MonsterId {
  return (
    typeof x === "string" &&
    x !== "neutral" &&
    Object.hasOwn(MONSTER_PRESENTATION, x)
  );
}

function percentOf(score: unknown): number {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function severityBand(sev: unknown): "low" | "medium" | "high" {
  if (typeof sev !== "number" || !Number.isFinite(sev)) return "low";
  if (sev < 0.4) return "low";
  if (sev < 0.7) return "medium";
  return "high";
}

function nonEmptyStrings(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.filter((s): s is string => typeof s === "string" && s !== "");
}

/** Builds the result view model (REQ-UI-15 to REQ-UI-21). Total, never throws. */
export function buildResultView(
  verdict: Verdict,
  inputText: string,
  locale: Locale,
  extras?: ResultExtras,
): ResultView {
  try {
    const notices = buildNotices(verdict, extras);

    if (typeof verdict !== "object" || verdict === null) return withheld(notices);
    const level: unknown = verdict.level;
    const rawSignals: unknown = verdict.signals;
    if (!isLevel(level) || !Array.isArray(rawSignals)) return withheld(notices);

    const signals = (rawSignals as readonly unknown[]).filter(
      (s): s is Verdict["signals"][number] => typeof s === "object" && s !== null,
    );

    if ((level === "no_signals") !== (rawSignals.length === 0)) return withheld(notices);

    // Group cards by source in the fixed order.
    const buckets = new Map<SourceName, SignalCardView[]>();
    for (const s of signals) {
      const evidence = shortEvidence(s.evidence);
      if (evidence === "") continue;
      const src: SourceName = (SOURCE_ORDER as readonly string[]).includes(s.source as string)
        ? (s.source as SourceName)
        : "other";
      const list = buckets.get(src) ?? [];
      list.push({
        signalId: typeof s.id === "string" ? s.id : "",
        explanationKey: explanationKeyFor(s.id),
        evidence,
        severityBand: severityBand(s.severity),
      });
      buckets.set(src, list);
    }
    const signalGroups: SignalGroupView[] = [];
    for (const src of SOURCE_ORDER) {
      const cards = buckets.get(src);
      if (cards !== undefined && cards.length > 0) {
        signalGroups.push({ source: src, labelKey: SOURCE_LABEL[src], cards });
      }
    }
    if (level !== "no_signals" && signalGroups.length === 0) return withheld(notices);

    const neutral = level === "no_signals";
    const monsterKey: MonsterKey = neutral
      ? "neutral"
      : isMonsterId(verdict.monster)
        ? verdict.monster
        : "generic";
    const mp = MONSTER_PRESENTATION[monsterKey];
    const mt = MONSTER_TEXT[monsterKey];
    const lp = LEVEL_PRESENTATION[level];

    const needles = signals.flatMap((s) => evidenceNeedles(s));
    const text = typeof inputText === "string" ? inputText : "";

    return {
      kind: "ready",
      state: neutral ? "neutral" : "monster",
      locale,
      monster: {
        id: mp.id,
        nameKey: mp.nameKey,
        shortKey: mt.short,
        tipKeys: mt.tips,
        colorToken: mp.colorToken,
        artKey: mp.artKey,
      },
      levelKey: lp.labelKey,
      riskMeter: {
        percent: percentOf(verdict.riskScore),
        labelKey: lp.labelKey,
        iconKey: lp.iconKey,
        darknessBand: lp.darknessBand,
      },
      noSignals: neutral
        ? {
            summaryKey: "result.noSignals.summary",
            notSafeKey: "result.noSignals.notSafeNote",
            reminderKey: "result.noSignals.reminder",
          }
        : null,
      highlights: computeHighlights(text, needles),
      signalGroups,
      actions: nonEmptyStrings(verdict.actions),
      limitations: nonEmptyStrings(verdict.limitations),
      semanticNoteKey: semanticNoteKey(verdict.semantic, extras?.semanticMode),
      notices,
      announcement: t(locale, "a11y.result-ready", { level: t(locale, lp.labelKey) }),
    };
  } catch {
    return withheld([]);
  }
}
