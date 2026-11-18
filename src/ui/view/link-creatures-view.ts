import type { MessageKey } from "../i18n/en";
import { LINK_CREATURES, LINK_TONES } from "../link-creatures";
import type { LinkCreature, LinkCreatureId, LinkTone } from "../link-creatures";
import type { ColorToken } from "../theme/palettes";
import { shortEvidence } from "./evidence";

export interface LinkCreatureView {
  readonly id: LinkCreatureId;
  readonly nameKey: MessageKey;
  readonly descriptionKey: MessageKey;
  readonly tipKeys: readonly MessageKey[];
  readonly colorToken: ColorToken;
  readonly artKey: string;
  readonly tone: LinkTone;
  readonly toneLabelKey: MessageKey;
  readonly toneIconKey: string;
  readonly explanationKey: MessageKey;
  readonly signalIds: readonly string[];
  readonly evidence: string;
}

interface Group {
  readonly creature: LinkCreature;
  readonly index: number;
  readonly signalIds: string[];
  readonly evidence: string;
  severity: number | null;
}

/**
 * Derives link creatures from url signals only (REQ-LINK-09 to REQ-LINK-12).
 * Pure and total: any failure gives [].
 */
export function buildLinkCreatures(signals: unknown): LinkCreatureView[] {
  try {
    if (!Array.isArray(signals)) return [];
    const groups = new Map<string, Group>();
    for (const raw of signals as readonly unknown[]) {
      if (typeof raw !== "object" || raw === null) continue;
      const s = raw as { id?: unknown; source?: unknown; severity?: unknown; evidence?: unknown };
      if (s.source !== "url" || typeof s.id !== "string") continue;
      const index = LINK_CREATURES.findIndex((c) => c.signalId === s.id);
      if (index < 0) continue;
      const evidence = shortEvidence(s.evidence as string);
      if (evidence === "") continue;
      const creature = LINK_CREATURES[index];
      const sev =
        typeof s.severity === "number" && Number.isFinite(s.severity) ? s.severity : null;
      const existing = groups.get(creature.id);
      if (existing === undefined) {
        groups.set(creature.id, {
          creature,
          index,
          signalIds: [s.id],
          evidence,
          severity: sev,
        });
      } else {
        if (!existing.signalIds.includes(s.id)) existing.signalIds.push(s.id);
        if (sev !== null && (existing.severity === null || sev > existing.severity)) {
          existing.severity = sev;
        }
      }
    }

    return [...groups.values()]
      .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0) || a.index - b.index)
      .map((g) => {
        const c = g.creature;
        const tone = LINK_TONES[c.tone];
        return {
          id: c.id,
          nameKey: c.nameKey,
          descriptionKey: `link.${c.id}.desc` as MessageKey,
          tipKeys: [
            `link.${c.id}.tip1`,
            `link.${c.id}.tip2`,
            `link.${c.id}.tip3`,
          ] as MessageKey[],
          colorToken: c.colorToken,
          artKey: c.artKey,
          tone: c.tone,
          toneLabelKey: tone.labelKey,
          toneIconKey: tone.iconKey,
          explanationKey: c.explanationKey ?? tone.explanationKey,
          signalIds: g.signalIds,
          evidence: g.evidence,
        };
      });
  } catch {
    return [];
  }
}
