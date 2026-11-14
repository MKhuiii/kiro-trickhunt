import { describe, expect, it } from "vitest";
import { MONSTERS } from "../pipeline/monsters.config";
import { en, t, vi } from "./i18n/dictionary";
import { MONSTER_PRESENTATION } from "./monsters";
import { HIGH_CONTRAST_PALETTE, NORMAL_PALETTE } from "./theme/palettes";
import { LEVEL_PRESENTATION } from "./theme/levels";

const entries = Object.entries(MONSTER_PRESENTATION);
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe("MONSTER_PRESENTATION", () => {
  it("covers every pipeline monster plus generic and neutral, and nothing else (REQ-UI-29)", () => {
    const expected = [...MONSTERS.map((m) => m.id), "generic", "neutral"].sort();
    expect(Object.keys(MONSTER_PRESENTATION).sort()).toEqual(expected);
  });

  it("each entry's id matches its key", () => {
    for (const [key, entry] of entries) expect(entry.id).toBe(key);
  });

  it("art keys are unique and kebab-case (REQ-UI-30)", () => {
    const keys = entries.map(([, e]) => e.artKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k).toMatch(KEBAB);
  });

  it("color tokens exist in both palettes (REQ-UI-30, REQ-UI-37)", () => {
    for (const [, e] of entries) {
      expect(Object.hasOwn(NORMAL_PALETTE, e.colorToken)).toBe(true);
      expect(Object.hasOwn(HIGH_CONTRAST_PALETTE, e.colorToken)).toBe(true);
    }
  });

  it("level color tokens exist in both palettes (REQ-UI-37)", () => {
    for (const lvl of Object.values(LEVEL_PRESENTATION)) {
      expect(Object.hasOwn(NORMAL_PALETTE, lvl.colorToken)).toBe(true);
      expect(Object.hasOwn(HIGH_CONTRAST_PALETTE, lvl.colorToken)).toBe(true);
    }
  });

  it("name keys are monster.<id>.name and exist in both dictionaries (REQ-UI-31)", () => {
    for (const [key, e] of entries) {
      expect(e.nameKey).toBe(`monster.${key}.name`);
      expect(Object.hasOwn(en, e.nameKey)).toBe(true);
      expect(Object.hasOwn(vi, e.nameKey)).toBe(true);
      expect(t("vi", e.nameKey).length).toBeGreaterThan(0);
    }
  });

  it("English names are the agreed ones (REQ-UI-31)", () => {
    const name = (id: keyof typeof MONSTER_PRESENTATION) =>
      t("en", MONSTER_PRESENTATION[id].nameKey);
    expect(name("bank")).toBe("Bank Ghost");
    expect(name("prize")).toBe("Gift Vampire");
    expect(name("job-bait")).toBe("Job Zombie");
    expect(name("authority")).toBe("Authority Banshee");
    expect(name("generic")).toBe("Odd Shadow");
  });
});
