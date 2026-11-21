import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ACTIONS_BY_MONSTER } from "../pipeline/messages.config";
import { GENERIC, MONSTERS } from "../pipeline/monsters.config";
import { en, vi, type MessageKey } from "./i18n/dictionary";
import { KNOWN_SIGNAL_IDS } from "./i18n/signal-ids";
import { MONSTER_PRESENTATION } from "./monsters";
import { contrastRatio } from "./theme/contrast";
import {
  DECLARED_PAIRS,
  HIGH_CONTRAST_TEXT_THRESHOLD,
  PAIR_THRESHOLDS,
} from "./theme/pairs";
import { HIGH_CONTRAST_PALETTE, NORMAL_PALETTE } from "./theme/palettes";

// PBT-148 (REQ-UI-47 to REQ-UI-51). Exhaustive over the ids.

const NEW_TEXT_SIGNAL_IDS = ["text.investment-pitch", "text.romance-bait"] as const;
const MONSTER_IDS: readonly string[] = [...MONSTERS.map((m) => m.id), GENERIC];

describe("PBT-148: new monsters have complete UI data", () => {
  it("covers investment and romance among the monster ids", () => {
    expect(MONSTER_IDS).toContain("investment");
    expect(MONSTER_IDS).toContain("romance");
  });

  it("every monster id has presentation, dictionary keys, actions and color tokens", () => {
    fc.assert(
      fc.property(fc.constantFrom(...MONSTER_IDS), (id) => {
        const p = (MONSTER_PRESENTATION as Record<string, (typeof MONSTER_PRESENTATION)[keyof typeof MONSTER_PRESENTATION]>)[id];
        expect(p).toBeDefined();
        expect(p.id).toBe(id);
        expect(p.nameKey).toBe(`monster.${id}.name`);

        for (const suffix of ["name", "short", "tip1", "tip2", "tip3"]) {
          const key = `monster.${id}.${suffix}` as MessageKey;
          expect(en[key], `en ${key}`).toBeTypeOf("string");
          expect(en[key].trim().length).toBeGreaterThan(0);
          expect(vi[key], `vi ${key}`).toBeTypeOf("string");
          expect(vi[key].trim().length).toBeGreaterThan(0);
        }

        for (const locale of ["en", "vi"] as const) {
          const actions = (ACTIONS_BY_MONSTER[locale] as Record<string, readonly string[]>)[id];
          expect(actions?.length, `${locale} actions ${id}`).toBeGreaterThan(0);
          for (const a of actions) expect(a.trim().length).toBeGreaterThan(0);
        }

        expect(NORMAL_PALETTE[p.colorToken]).toBeTypeOf("string");
        expect(HIGH_CONTRAST_PALETTE[p.colorToken]).toBeTypeOf("string");
        const pairs = DECLARED_PAIRS.filter((d) => d.fg === p.colorToken);
        expect(pairs.length).toBeGreaterThan(0);
        for (const d of pairs) {
          expect(d.use).toBe("text");
          expect(
            contrastRatio(NORMAL_PALETTE[d.fg], NORMAL_PALETTE[d.bg]),
          ).toBeGreaterThanOrEqual(PAIR_THRESHOLDS.text);
          expect(
            contrastRatio(HIGH_CONTRAST_PALETTE[d.fg], HIGH_CONTRAST_PALETTE[d.bg]),
          ).toBeGreaterThanOrEqual(HIGH_CONTRAST_TEXT_THRESHOLD);
        }
      }),
      { numRuns: MONSTER_IDS.length * 3 },
    );
  });

  it("every New_Text_Signal id is known and has an explanation in both dictionaries", () => {
    fc.assert(
      fc.property(fc.constantFrom(...NEW_TEXT_SIGNAL_IDS), (id) => {
        expect(KNOWN_SIGNAL_IDS as readonly string[]).toContain(id);
        const key = `signal.${id}.explain` as MessageKey;
        expect(en[key], `en ${key}`).toBeTypeOf("string");
        expect(en[key].trim().length).toBeGreaterThan(0);
        expect(vi[key], `vi ${key}`).toBeTypeOf("string");
        expect(vi[key].trim().length).toBeGreaterThan(0);
      }),
      { numRuns: 20 },
    );
  });
});
