import { COLOR_TOKENS, type ColorToken, type Palette } from "./palettes";

export type CssVarName = `--th-${ColorToken}`;

/** One `--th-<token>` custom property per color token, valued from the palette (REQ-PAGE-28). */
export function paletteToCssVars(
  palette: Palette,
): Readonly<Record<CssVarName, string>> {
  const out = {} as Record<CssVarName, string>;
  for (const token of COLOR_TOKENS) {
    out[`--th-${token}`] = palette[token];
  }
  return out;
}
