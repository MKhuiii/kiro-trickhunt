import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COLOR_TOKENS, NORMAL_PALETTE } from "../ui/theme/palettes";

/**
 * The page sets the palette inline on a wrapper element, but the Pixi stage reads
 * custom properties from the document root (`svg-texture.ts`). A token missing from
 * the `:root` block of globals.css resolves to nothing there and the drawing loses
 * that color (the new monsters came out black). Every token needs a default.
 */
const CSS = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);
const ROOT_BLOCK = /:root\s*\{([^}]*)\}/.exec(CSS)?.[1] ?? "";

function rootDefault(token: string): string | null {
  const m = new RegExp(`--th-${token}\\s*:\\s*([^;]+);`).exec(ROOT_BLOCK);
  return m === null ? null : m[1].trim().toLowerCase();
}

describe("globals.css :root defaults", () => {
  it("has a default for every monster color token, equal to the normal palette", () => {
    const monsterTokens = COLOR_TOKENS.filter((t) => t.startsWith("monster-"));
    expect(monsterTokens.length).toBeGreaterThan(0);
    for (const token of monsterTokens) {
      expect(rootDefault(token), token).toBe(NORMAL_PALETTE[token].toLowerCase());
    }
  });
});
