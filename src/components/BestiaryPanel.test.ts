import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { nextFocusIndex } from "./BestiaryPanel";
import { SPREAD_QUERY, readLayoutMode } from "./use-layout-mode";

const ROOT = resolve(__dirname, "..", "..");
const GUIDE_FILES = [
  join(ROOT, "src", "ui", "bestiary.ts"),
  join(ROOT, "src", "components", "BestiaryButton.tsx"),
  join(ROOT, "src", "components", "BestiaryPanel.tsx"),
  join(ROOT, "src", "components", "NotebookPage.tsx"),
  join(ROOT, "src", "components", "NotebookContents.tsx"),
  join(ROOT, "src", "components", "use-layout-mode.ts"),
];

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
}

const FORBIDDEN: readonly { name: string; re: RegExp }[] = [
  { name: "fetch(", re: /\bfetch\s*\(/ },
  { name: "XMLHttpRequest", re: /\bXMLHttpRequest\b/ },
  { name: "sendBeacon", re: /\bsendBeacon\b/ },
  { name: "localStorage", re: /\blocalStorage\b/ },
  { name: "sessionStorage", re: /\bsessionStorage\b/ },
  { name: "indexedDB", re: /\bindexedDB\b/ },
  { name: "document.cookie", re: /\bdocument\s*\.\s*cookie\b/ },
  { name: "console.", re: /\bconsole\s*\./ },
];

describe("nextFocusIndex (PBT-134)", () => {
  // **Validates: Requirements REQ-BEST-05.4**
  it("stays in range and wraps at both ends", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }),
        fc.nat(),
        fc.boolean(),
        (count, raw, shift) => {
          const current = raw % count;
          const next = nextFocusIndex(count, current, shift);
          expect(next).toBeGreaterThanOrEqual(0);
          expect(next).toBeLessThan(count);
          if (shift) expect(next).toBe(current === 0 ? count - 1 : current - 1);
          else expect(next).toBe(current === count - 1 ? 0 : current + 1);
        },
      ),
    );
  });

  it("handles one element, out-of-range current and no elements", () => {
    expect(nextFocusIndex(1, 0, false)).toBe(0);
    expect(nextFocusIndex(1, 0, true)).toBe(0);
    expect(nextFocusIndex(4, -1, false)).toBe(0);
    expect(nextFocusIndex(4, -1, true)).toBe(3);
    expect(nextFocusIndex(0, 0, false)).toBe(-1);
  });
});

describe("guide source checks", () => {
  // REQ-BEST-07.3
  for (const file of GUIDE_FILES) {
    it(`${file.slice(ROOT.length + 1).replace(/\\/g, "/")} uses no network, storage or console API`, () => {
      const code = stripComments(readFileSync(file, "utf8"));
      const found = FORBIDDEN.filter(({ re }) => re.test(code)).map((f) => f.name);
      expect(found).toEqual([]);
    });
  }

  it("the checker flags forbidden names (sanity)", () => {
    const sample = 'fetch("/a"); localStorage.x; console.log(1);';
    expect(FORBIDDEN.filter(({ re }) => re.test(sample)).map((f) => f.name)).toEqual([
      "fetch(",
      "localStorage",
      "console.",
    ]);
  });

  // REQ-BEST-07.4
  it("BestiaryPanel props have no verdict, text or files", () => {
    const code = stripComments(readFileSync(GUIDE_FILES[2], "utf8"));
    const match = /interface\s+BestiaryPanelProps\s*\{([\s\S]*?)\n\}/.exec(code);
    expect(match).not.toBeNull();
    const names = [...match![1].matchAll(/readonly\s+(\w+)\s*[?:]/g)].map((m) => m[1]);
    expect(names.sort()).toEqual(["locale", "onClose", "returnFocusRef"]);
    for (const banned of ["verdict", "text", "files"]) expect(names).not.toContain(banned);
  });

  // REQ-BEST-06.3, REQ-BEST-06.9
  it("NotebookContents does not reference bestiary.note", () => {
    const code = stripComments(readFileSync(GUIDE_FILES[4], "utf8"));
    expect(code).not.toContain("bestiary.note");
  });

  it("bestiary.note appears in NotebookPage only under an isLast condition", () => {
    const code = stripComments(readFileSync(GUIDE_FILES[3], "utf8"));
    const uses = [...code.matchAll(/bestiary\.note/g)];
    expect(uses.length).toBe(1);
    expect(code).toMatch(/\{\s*isLast\s*\?(?:(?!: null)[\s\S])*?\{\s*t\(locale,\s*"bestiary\.note"/);
  });

  it("notebook component props have no verdict, text or files", () => {
    for (const i of [3, 4]) {
      const code = stripComments(readFileSync(GUIDE_FILES[i], "utf8"));
      const match = /interface\s+Notebook\w+Props\s*\{([\s\S]*?)\n\}/.exec(code);
      expect(match).not.toBeNull();
      const names = [...match![1].matchAll(/readonly\s+(\w+)\s*[?:]/g)].map((m) => m[1]);
      for (const banned of ["verdict", "text", "files"]) expect(names).not.toContain(banned);
    }
  });

  it("BestiaryButton props have no verdict, text or files", () => {
    const code = stripComments(readFileSync(GUIDE_FILES[1], "utf8"));
    const match = /interface\s+BestiaryButtonProps\s*\{([\s\S]*?)\n\}/.exec(code);
    expect(match).not.toBeNull();
    const names = [...match![1].matchAll(/readonly\s+(\w+)\s*[?:]/g)].map((m) => m[1]);
    for (const banned of ["verdict", "text", "files"]) expect(names).not.toContain(banned);
  });
});

describe("layout mode hook", () => {
  // REQ-BEST-12.1, REQ-BEST-12.11
  it("readLayoutMode maps matches to spread and anything else to single", () => {
    expect(readLayoutMode({ matches: true })).toBe("spread");
    expect(readLayoutMode({ matches: false })).toBe("single");
    expect(readLayoutMode(undefined)).toBe("single");
  });

  it("uses the 48rem query, matchMedia, a change listener and a single server default", () => {
    expect(SPREAD_QUERY).toBe("(min-width: 48rem)");
    const code = stripComments(readFileSync(GUIDE_FILES[5], "utf8"));
    expect(code).toMatch(/matchMedia/);
    expect(code).toMatch(/addEventListener\("change"/);
    expect(code).toMatch(/removeEventListener\("change"/);
    expect(code).toMatch(/getServerSnapshot\(\): LayoutMode \{\s*return "single";/);
  });
});

describe("revision 4 panel source", () => {
  // REQ-BEST-13.1, 13.5, 13.6
  const code = stripComments(readFileSync(GUIDE_FILES[2], "utf8"));
  it("does not reference the removed indicator key", () => {
    expect(code).not.toContain("bestiary.page.of");
  });
  it("each leaf scroll box is a labelled, focusable region", () => {
    expect(code).toMatch(/className="th-notebook-leaf-scroll"\s+role="region"\s+tabIndex=\{0\}\s+aria-label=\{label\}/);
    expect(code).toContain('"bestiary.page.label"');
  });
  it("the navigation row is not sticky, fixed or absolute", () => {
    expect(code).not.toMatch(/\b(sticky|fixed\b(?! inset)|absolute)\b/);
  });
  it("the page area does not scroll", () => {
    expect(code).not.toMatch(/th-notebook-page-area[^"]*overflow-y-auto/);
  });
});