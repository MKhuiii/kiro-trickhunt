import fc from "fast-check";
import { describe, it } from "vitest";
import { paletteToCssVars } from "./css-vars";
import { COLOR_TOKENS, HIGH_CONTRAST_PALETTE, NORMAL_PALETTE, type Palette } from "./palettes";

const hex = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 6, maxLength: 6 })
  .map((ds) => `#${ds.map((d) => d.toString(16).toUpperCase()).join("")}`);

const paletteArb: fc.Arbitrary<Palette> = fc
  .array(hex, { minLength: COLOR_TOKENS.length, maxLength: COLOR_TOKENS.length })
  .map((vals) => Object.fromEntries(COLOR_TOKENS.map((t, i) => [t, vals[i]])) as Palette);

describe("PBT-79: paletteToCssVars", () => {
  /** **Validates: Requirements REQ-PAGE-28** */
  it("has exactly one --th-<token> entry per token with the palette value", () => {
    fc.assert(
      fc.property(paletteArb, (palette) => {
        const vars: Readonly<Record<string, string>> = paletteToCssVars(palette);
        const keys = Object.keys(vars);
        if (keys.length !== COLOR_TOKENS.length) return false;
        return COLOR_TOKENS.every((t) => vars[`--th-${t}`] === palette[t]);
      }),
      { numRuns: 100 },
    );
  });

  it("gives identical key sets for both real palettes", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const a = Object.keys(paletteToCssVars(NORMAL_PALETTE)).sort();
        const b = Object.keys(paletteToCssVars(HIGH_CONTRAST_PALETTE)).sort();
        return JSON.stringify(a) === JSON.stringify(b);
      }),
      { numRuns: 100 },
    );
  });
});
