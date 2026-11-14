/**
 * Color palettes (REQ-UI-32, REQ-UI-34). Both palettes define every token.
 * Values are `#RRGGBB`.
 */

export const COLOR_TOKENS = [
  "bg",
  "surface",
  "raised",
  "text",
  "muted",
  "accent",
  "on-accent",
  "focus",
  "border",
  "level-none",
  "level-suspicious",
  "level-high",
  "level-critical",
  "monster-bank",
  "monster-prize",
  "monster-job-bait",
  "monster-authority",
  "monster-generic",
  "monster-neutral",
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

export type Palette = Readonly<Record<ColorToken, string>>;

export const NORMAL_PALETTE: Palette = {
  bg: "#1B1230",
  surface: "#2A1B47",
  raised: "#3A2762",
  text: "#F6F0FF",
  muted: "#CDBFEA",
  accent: "#FFA94D",
  "on-accent": "#1B1230",
  focus: "#FFD27A",
  border: "#9C88CC",
  "level-none": "#A9C4FF",
  "level-suspicious": "#FFD166",
  "level-high": "#FF9A52",
  "level-critical": "#FF8097",
  "monster-bank": "#7FD1FF",
  "monster-prize": "#FF8AD8",
  "monster-job-bait": "#9BE58F",
  "monster-authority": "#FFB3A7",
  "monster-generic": "#CDBFEA",
  "monster-neutral": "#FFD27A",
};

export const HIGH_CONTRAST_PALETTE: Palette = {
  bg: "#000000",
  surface: "#0A0612",
  raised: "#160D26",
  text: "#FFFFFF",
  muted: "#EDE6FA",
  accent: "#FFC266",
  "on-accent": "#000000",
  focus: "#FFFF66",
  border: "#E3D9FF",
  "level-none": "#BBD0FF",
  "level-suspicious": "#FFE680",
  "level-high": "#FFB070",
  "level-critical": "#FFA0B0",
  "monster-bank": "#9CDDFF",
  "monster-prize": "#FFA3E2",
  "monster-job-bait": "#B5F0AA",
  "monster-authority": "#FFC8BF",
  "monster-generic": "#EDE6FA",
  "monster-neutral": "#FFE08F",
};
