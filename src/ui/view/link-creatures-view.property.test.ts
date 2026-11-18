import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Locale, MonsterId, Verdict } from "../../pipeline";
import { t } from "../i18n/dictionary";
import type { MessageKey } from "../i18n/en";
import { explanationKeyFor, KNOWN_SIGNAL_IDS } from "../i18n/signal-ids";
import { LINK_CREATURES } from "../link-creatures";
import { MONSTER_PRESENTATION } from "../monsters";
import type { MonsterKey } from "../monsters";
import { LEVEL_PRESENTATION } from "../theme/levels";
import type { LevelKey } from "../theme/levels";
import { evidenceNeedles, shortEvidence } from "./evidence";
import { computeHighlights } from "./highlights";
import { buildLinkCreatures } from "./link-creatures-view";
import { buildNotices } from "./notices";
import type { ResultExtras } from "./notices";
import { buildResultView, chooseMonster } from "./result-view";
import { aiUnavailable, semanticNoteKey } from "./semantic-note";
import { NO_REPUTATION } from "../../pipeline/reputation-fixture";

const NUM_RUNS = 150;
const LEVELS = ["no_signals", "suspicious", "high", "critical"] as const;
const MONSTERS = ["bank", "prize", "job-bait", "authority", "generic"] as const;
const SOURCES = ["text", "url", "semantic", "image", "qr", "other"] as const;

const severityArb = fc.oneof(
  fc.double({ min: 0, max: 1, noNaN: true }),
  fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
);
const evidenceArb = fc.oneof(
  fc.string({ maxLength: 100 }),
  fc.constantFrom("", "   ", "bit.ly", "a b"),
);
const signalArb = fc.record({
  id: fc.constantFrom(...KNOWN_SIGNAL_IDS),
  source: fc.constantFrom(...SOURCES),
  severity: severityArb,
  evidence: evidenceArb,
  whyItMatters: fc.constant("why"),
});
const urlSignalArb = signalArb.map((s) => ({ ...s, source: "url" as const }));
const nonUrlSignalArb = signalArb.filter((s) => s.source !== "url");
const urlTableSignalArb = urlSignalArb.chain((s) =>
  fc.constantFrom(...LINK_CREATURES).map((c) => ({ ...s, id: c.signalId })),
);

const semanticArb = fc.record({
  status: fc.constantFrom("ok", "unavailable", "degraded"),
  skipped: fc.boolean(),
});

function makeVerdict(r: {
  level: (typeof LEVELS)[number];
  signals: unknown[];
  [k: string]: unknown;
}): Verdict {
  return {
    ...r,
    monster: r.level === "no_signals" ? null : r.monster,
    signals: r.level === "no_signals" ? [] : r.signals,
  } as unknown as Verdict;
}

const verdictArb: fc.Arbitrary<Verdict> = fc
  .record({
    level: fc.constantFrom(...LEVELS),
    riskScore: fc.integer({ min: 0, max: 100 }),
    monster: fc.constantFrom(...MONSTERS),
    signals: fc.array(fc.oneof(signalArb, urlTableSignalArb), { minLength: 1, maxLength: 8 }),
    actions: fc.array(fc.string({ maxLength: 40 }), { maxLength: 3 }),
    limitations: fc.array(fc.string({ maxLength: 40 }), { maxLength: 3 }),
    semantic: semanticArb,
    inputTruncated: fc.boolean(),
    urlsAnalyzed: fc.nat({ max: 5 }),
    urlsSkipped: fc.nat({ max: 5 }),
    reputation: fc.constant(NO_REPUTATION),
  })
  .map(makeVerdict);

const noticeKinds = ["ocr-skipped", "ocr-too-poor", "payment-qr", "no-url", "text-truncated", "x"];
const noticeListArb = fc.array(fc.record({ kind: fc.constantFrom(...noticeKinds) }), {
  maxLength: 4,
});
const extrasArb = fc.option(
  fc.record(
    {
      semanticMode: fc.constantFrom("used", "budget-exhausted", "not-configured", "skipped"),
      ingestNotices: noticeListArb,
      buildNotices: noticeListArb,
      qrResults: noticeListArb,
      userText: fc.string({ maxLength: 30 }),
    },
    { requiredKeys: [] },
  ),
  { nil: undefined },
) as fc.Arbitrary<ResultExtras | undefined>;
const localeArb = fc.constantFrom<Locale>("en", "vi");

// ---------------------------------------------------------------------------
// Copy of the projection before the link-creatures change (no linkCreatures).
// ---------------------------------------------------------------------------
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
const MONSTER_TEXT: Readonly<Record<MonsterKey, { short: MessageKey; tips: readonly MessageKey[] }>> = {
  bank: { short: "monster.bank.short", tips: ["monster.bank.tip1", "monster.bank.tip2", "monster.bank.tip3"] },
  prize: { short: "monster.prize.short", tips: ["monster.prize.tip1", "monster.prize.tip2", "monster.prize.tip3"] },
  "job-bait": {
    short: "monster.job-bait.short",
    tips: ["monster.job-bait.tip1", "monster.job-bait.tip2", "monster.job-bait.tip3"],
  },
  authority: {
    short: "monster.authority.short",
    tips: ["monster.authority.tip1", "monster.authority.tip2", "monster.authority.tip3"],
  },
  generic: { short: "monster.generic.short", tips: ["monster.generic.tip1", "monster.generic.tip2", "monster.generic.tip3"] },
  neutral: { short: "monster.neutral.short", tips: [] },
};

function oldWithheld(notices: unknown) {
  return {
    kind: "withheld",
    messageKey: "result.withheld",
    limitsNoteKey: "result.limitsNote",
    notices,
  };
}

function oldSeverityBand(sev: unknown): "low" | "medium" | "high" {
  if (typeof sev !== "number" || !Number.isFinite(sev)) return "low";
  if (sev < 0.4) return "low";
  if (sev < 0.7) return "medium";
  return "high";
}

function oldStrings(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.filter((s): s is string => typeof s === "string" && s !== "");
}

function oldBuild(verdict: Verdict, inputText: string, locale: Locale, extras?: ResultExtras) {
  const notices = buildNotices(verdict, extras);
  const level: unknown = verdict.level;
  const rawSignals: unknown = verdict.signals;
  if (typeof level !== "string" || !Object.hasOwn(LEVEL_PRESENTATION, level)) return oldWithheld(notices);
  if (!Array.isArray(rawSignals)) return oldWithheld(notices);
  const lvl = level as LevelKey;
  const signals = (rawSignals as readonly unknown[]).filter(
    (s): s is Verdict["signals"][number] => typeof s === "object" && s !== null,
  );
  if ((lvl === "no_signals") !== (rawSignals.length === 0)) return oldWithheld(notices);

  const buckets = new Map<SourceName, unknown[]>();
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
      severityBand: oldSeverityBand(s.severity),
    });
    buckets.set(src, list);
  }
  const signalGroups: unknown[] = [];
  for (const src of SOURCE_ORDER) {
    const cards = buckets.get(src);
    if (cards !== undefined && cards.length > 0) {
      signalGroups.push({ source: src, labelKey: SOURCE_LABEL[src], cards });
    }
  }
  if (lvl !== "no_signals" && signalGroups.length === 0) return oldWithheld(notices);

  const neutral = lvl === "no_signals";
  const monsterKey: MonsterKey = chooseMonster(lvl, verdict.monster as MonsterId);
  const mp = MONSTER_PRESENTATION[monsterKey];
  const mt = MONSTER_TEXT[monsterKey];
  const lp = LEVEL_PRESENTATION[lvl];
  const sem: unknown = verdict.semantic;
  const semStatus: unknown =
    typeof sem === "object" && sem !== null ? (sem as { status?: unknown }).status : undefined;
  const aiNote = aiUnavailable(semStatus, extras?.semanticMode)
    ? { headingKey: "result.aiNote.heading", textKey: "result.aiNote.unavailable" }
    : null;
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
    aiNote,
    limitsNoteKey: "result.limitsNote",
    riskMeter: {
      percent:
        typeof verdict.riskScore !== "number" || !Number.isFinite(verdict.riskScore)
          ? 0
          : Math.min(100, Math.max(0, Math.round(verdict.riskScore))),
      labelKey: lp.labelKey,
      iconKey: lp.iconKey,
      darknessBand: lp.darknessBand,
    },
    noSignals: neutral
      ? {
          summaryKey: "result.noSignals.summary",
          notSafeKey: "result.noSignals.notSafeNote",
          reminderKey: aiNote !== null ? "result.noSignals.reminderStrong" : "result.noSignals.reminder",
        }
      : null,
    highlights: computeHighlights(text, needles),
    signalGroups,
    actions: oldStrings(verdict.actions),
    limitations: oldStrings(verdict.limitations),
    semanticNoteKey: semanticNoteKey(verdict.semantic, extras?.semanticMode),
    notices,
    announcement: t(locale, "a11y.result-ready", { level: t(locale, lp.labelKey) }),
  };
}

function sev(s: { severity: unknown }): number {
  return typeof s.severity === "number" && Number.isFinite(s.severity) ? s.severity : 0;
}

describe("PBT-105: link creature list structure", () => {
  /** **Validates: Requirements REQ-LINK-10, REQ-LINK-14** */
  it("never throws; list has table ids, no duplicates, sorted, deterministic, input untouched", () => {
    fc.assert(
      fc.property(verdictArb, localeArb, fc.anything(), (v, locale, junk) => {
        const before = structuredClone(v);
        const a = buildResultView(v, "some text", locale);
        const b = buildResultView(v, "some text", locale);
        expect(a).toEqual(b);
        expect(v).toEqual(before);
        if (a.kind !== "ready") return;
        const ids = a.linkCreatures.map((c) => c.id);
        const tableIds = LINK_CREATURES.map((c) => c.id as string);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) expect(tableIds).toContain(id);
        for (let i = 1; i < ids.length; i++) {
          const prev = a.linkCreatures[i - 1];
          const cur = a.linkCreatures[i];
          const sevOf = (id: string) => {
            const c = LINK_CREATURES.find((x) => x.id === id);
            const list = (v.signals as unknown as { id: string; source: string; severity: unknown; evidence: string }[])
              .filter((s) => s.source === "url" && s.id === c?.signalId && shortEvidence(s.evidence) !== "");
            return Math.max(...list.map(sev));
          };
          const ps = sevOf(prev.id);
          const cs = sevOf(cur.id);
          expect(ps >= cs).toBe(true);
          if (ps === cs) {
            expect(tableIds.indexOf(prev.id)).toBeLessThan(tableIds.indexOf(cur.id));
          }
        }
        // garbage input to buildLinkCreatures and buildResultView
        expect(Array.isArray(buildLinkCreatures(junk))).toBe(true);
        expect(() => buildResultView(junk as Verdict, junk as string, junk as Locale)).not.toThrow();
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("PBT-106: derived only from url signals", () => {
  /** **Validates: Requirements REQ-LINK-09, REQ-LINK-10** */
  it("non-url signals never change the list; the list equals the url-only list", () => {
    fc.assert(
      fc.property(
        fc.array(fc.oneof(urlSignalArb, urlTableSignalArb), { maxLength: 8 }),
        fc.array(nonUrlSignalArb, { maxLength: 6 }),
        fc.array(urlTableSignalArb, { maxLength: 4 }),
        fc.boolean(),
        (urls, others, extraUrls, front) => {
          const urlOnly = buildLinkCreatures(urls);
          const mixed = front ? [...others, ...urls] : [...urls, ...others];
          expect(buildLinkCreatures(mixed)).toEqual(urlOnly);

          // interleave: non-url signals between url signals
          const interleaved = urls.flatMap((u, i) => (i < others.length ? [others[i], u] : [u]));
          expect(buildLinkCreatures(interleaved)).toEqual(urlOnly);

          // appending url signals never removes a creature
          const appended = buildLinkCreatures([...urls, ...extraUrls]).map((c) => c.id);
          for (const c of urlOnly) expect(appended).toContain(c.id);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("PBT-107: old fields unchanged", () => {
  /** **Validates: Requirements REQ-LINK-13** */
  it("every field except linkCreatures equals the pre-change projection", () => {
    fc.assert(
      fc.property(verdictArb, fc.string({ maxLength: 60 }), localeArb, extrasArb, (v, text, locale, extras) => {
        const view = buildResultView(v, text, locale, extras);
        const old = oldBuild(v, text, locale, extras);
        if (view.kind === "ready") {
          const { linkCreatures, reputationNote, ...rest } = view;
          expect(Array.isArray(linkCreatures)).toBe(true);
          expect(reputationNote === null || typeof reputationNote === "object").toBe(true);
          expect(rest).toEqual(old);
        } else {
          expect(view).toEqual(old);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
