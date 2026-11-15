import { describe, expect, it } from "vitest";
import { LEVEL_PRESENTATION, type LevelKey } from "./levels";
import { COLOR_TOKENS, HIGH_CONTRAST_PALETTE, NORMAL_PALETTE } from "./palettes";

function hueOf(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

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

  it("keeps level-suspicious out of the red hue range (340 to 20 degrees) in both palettes", () => {
    for (const p of [NORMAL_PALETTE, HIGH_CONTRAST_PALETTE]) {
      const h = hueOf(p["level-suspicious"]);
      expect(h >= 340 || h <= 20).toBe(false);
    }
  });

  it("uses icon-stop only on critical", () => {
    const withStop = KEYS.filter((k) => LEVEL_PRESENTATION[k].iconKey === "icon-stop");
    expect(withStop).toEqual(["critical"]);
  });

  it("uses existing color tokens and non-empty icon keys", () => {
    for (const e of entries) {
      expect(COLOR_TOKENS).toContain(e.colorToken);
      expect(e.iconKey.length).toBeGreaterThan(0);
    }
  });
});
