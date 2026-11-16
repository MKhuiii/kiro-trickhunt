/**
 * Pure string helpers that turn the page's own SVG art into a standalone image
 * for the Pixi stage (spec hunter-ui, task 22). An SVG loaded as an image cannot
 * see the page's CSS custom properties, so every `var(--th-...)` is replaced by
 * its current value. No network, no DOM: tests run in node.
 */

const THEME_VAR = /var\(\s*(--th-[a-z0-9-]+)\s*(?:,[^)]*)?\)/gi;

/** Anything that could load or run something. The art is our own, so this must never match. */
const UNSAFE = /<\s*(script|foreignObject|image|iframe|object|embed|style)\b|\bon[a-z]+\s*=|(?:xlink:)?href\s*=\s*["'](?!#)/i;

/** Replaces `var(--th-name)` with the value `resolve` gives. Unknown names become `transparent`. */
export function inlineThemeVars(
  markup: string,
  resolve: (name: string) => string | null | undefined,
): string {
  return markup.replace(THEME_VAR, (_match, name: string) => {
    const value = resolve(name.toLowerCase());
    return typeof value === "string" && value.trim() !== "" ? value.trim() : "transparent";
  });
}

function isGroupOpen(markup: string, at: number): boolean {
  if (markup.startsWith("<g", at) === false) return false;
  const next = markup[at + 2];
  return next === " " || next === ">" || next === "/" || next === "\n" || next === "\t";
}

/** Removes every `<g data-part="...-detail">...</g>` (nested groups handled). */
export function removeDetailGroups(markup: string): string {
  const opener = /<g\b[^>]*\bdata-part="[^"]*-detail"[^>]*>/;
  let out = markup;
  for (;;) {
    const m = opener.exec(out);
    if (m === null) return out;
    const start = m.index;
    const openEnd = start + m[0].length;
    if (m[0].endsWith("/>")) {
      out = out.slice(0, start) + out.slice(openEnd);
      continue;
    }
    let depth = 1;
    let i = openEnd;
    while (i < out.length && depth > 0) {
      const lt = out.indexOf("<", i);
      if (lt === -1) {
        i = out.length;
        break;
      }
      if (out.startsWith("</g>", lt)) {
        depth -= 1;
        i = lt + 4;
      } else if (isGroupOpen(out, lt)) {
        const close = out.indexOf(">", lt);
        if (close === -1) {
          i = out.length;
          break;
        }
        if (out[close - 1] !== "/") depth += 1;
        i = close + 1;
      } else {
        i = lt + 1;
      }
    }
    out = out.slice(0, start) + out.slice(i);
  }
}

/** Sets pixel `width` and `height` on the root `<svg>` (the `viewBox` keeps the scale). */
export function setRootSize(markup: string, size: number): string {
  const px = String(Math.max(1, Math.round(size)));
  return markup.replace(/<svg\b[^>]*>/, (tag) => {
    let next = tag;
    for (const attr of ["width", "height"]) {
      const re = new RegExp(`\\s${attr}="[^"]*"`);
      next = re.test(next)
        ? next.replace(re, ` ${attr}="${px}"`)
        : next.replace(/<svg\b/, `<svg ${attr}="${px}"`);
    }
    return next;
  });
}

export interface PrepareOptions {
  readonly size: number;
  readonly hideDetail: boolean;
  readonly resolve: (name: string) => string | null | undefined;
}

/** Throws when the markup holds anything but plain art. */
export function assertPlainArt(markup: string): void {
  if (UNSAFE.test(markup)) throw new Error("svg art is not plain");
}

/** Everything needed to load the art as a standalone image. */
export function prepareSvgMarkup(markup: string, options: PrepareOptions): string {
  assertPlainArt(markup);
  let out = options.hideDetail ? removeDetailGroups(markup) : markup;
  out = inlineThemeVars(out, options.resolve);
  return setRootSize(out, options.size);
}
