import { describe, expect, it } from "vitest";
import { paletteToCssVars } from "./css-vars";
import { COLOR_TOKENS, HIGH_CONTRAST_PALETTE, NORMAL_PALETTE } from "./palettes";
import { DECLARED_PAIRS } from "./pairs";

describe("paletteToCssVars", () => {
  it("maps a known token to its variable", () => {
    const vars = paletteToCssVars(NORMAL_PALETTE);
    expect(vars["--th-bg"]).toBe(NORMAL_PALETTE.bg);
    expect(vars["--th-on-accent"]).toBe(NORMAL_PALETTE["on-accent"]);
  });

  it("returns one entry per token for both palettes", () => {
    for (const p of [NORMAL_PALETTE, HIGH_CONTRAST_PALETTE]) {
      expect(Object.keys(paletteToCssVars(p))).toHaveLength(COLOR_TOKENS.length);
    }
  });

  it("swaps values with the high-contrast palette", () => {
    expect(paletteToCssVars(HIGH_CONTRAST_PALETTE)["--th-bg"]).toBe("#000000");
  });
});

describe("declared pairs for the AI and limits notes", () => {
  it("include text on raised, accent border on raised, muted on bg", () => {
    const has = (fg: string, bg: string, use: string) =>
      DECLARED_PAIRS.some((p) => p.fg === fg && p.bg === bg && p.use === use);
    expect(has("text", "raised", "text")).toBe(true);
    expect(has("accent", "raised", "ui")).toBe(true);
    expect(has("muted", "bg", "text")).toBe(true);
  });
});
