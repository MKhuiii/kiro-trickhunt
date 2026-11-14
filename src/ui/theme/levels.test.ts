import { describe, expect, it } from "vitest";
import { LEVEL_PRESENTATION, type LevelKey } from "./levels";
import { COLOR_TOKENS } from "./palettes";

const KEYS: LevelKey[] = ["no_signals", "suspicious", "high", "critical"];
const entries = KEYS.map((k) => LEVEL_PRESENTATION[k]);

describe("LEVEL_PRESENTATION", () => {
  it("covers all four levels with label keys matching the level", () => {
    for (const k of KEYS) {
      expect(LEVEL_PRESENTATION[k].labelKey).toBe(`level.${k}`);
    }
  });

  it("has distinct labels, icons, bands and color tokens", () => {
    for (const field of ["labelKey", "iconKey", "darknessBand", "colorToken"] as const) {
      expect(new Set(entries.map((e) => e[field])).size).toBe(4);
    }
  });

  it("orders darkness bands by severity", () => {
    expect(entries.map((e) => e.darknessBand)).toEqual([0, 1, 2, 3]);
  });

  it("uses existing color tokens and non-empty icon keys", () => {
    for (const e of entries) {
      expect(COLOR_TOKENS).toContain(e.colorToken);
      expect(e.iconKey.length).toBeGreaterThan(0);
    }
  });
});
