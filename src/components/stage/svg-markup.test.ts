import { describe, expect, it } from "vitest";
import {
  assertPlainArt,
  inlineThemeVars,
  prepareSvgMarkup,
  removeDetailGroups,
  setRootSize,
} from "./svg-markup";

const VARS: Record<string, string> = {
  "--th-ink": "#2a1a12",
  "--th-moon": " #f3e9c6 ",
};
const resolve = (name: string): string | undefined => VARS[name];

describe("inlineThemeVars", () => {
  it("replaces every theme variable with its current value", () => {
    const out = inlineThemeVars(
      '<path style="fill:var(--th-ink);stroke:var(--th-moon)"/><circle style="fill: var( --th-ink )"/>',
      resolve,
    );
    expect(out).toBe(
      '<path style="fill:#2a1a12;stroke:#f3e9c6"/><circle style="fill: #2a1a12"/>',
    );
  });

  it("uses transparent for unknown or empty values and drops var() fallbacks", () => {
    expect(inlineThemeVars('style="fill:var(--th-nope)"', resolve)).toBe('style="fill:transparent"');
    expect(inlineThemeVars('style="fill:var(--th-nope, red)"', resolve)).toBe(
      'style="fill:transparent"',
    );
    expect(inlineThemeVars('style="fill:var(--th-ink)"', () => "  ")).toBe(
      'style="fill:transparent"',
    );
  });

  it("leaves other variables and plain text alone", () => {
    const text = '<g style="fill:var(--other)"/>';
    expect(inlineThemeVars(text, resolve)).toBe(text);
  });
});

describe("removeDetailGroups", () => {
  it("removes a detail group with nested groups and keeps the rest", () => {
    const markup =
      '<svg><g data-part="body"><path d="a"/></g><g data-part="body-detail"><g><path d="b"/></g><path d="c"/></g><g data-part="eyes"><path d="d"/></g></svg>';
    expect(removeDetailGroups(markup)).toBe(
      '<svg><g data-part="body"><path d="a"/></g><g data-part="eyes"><path d="d"/></g></svg>',
    );
  });

  it("removes several detail groups and a self-closing one", () => {
    const markup =
      '<svg><g data-part="a-detail"><path/></g><g data-part="x"/><g data-part="b-detail"/><g data-part="c-detail"><g><g></g></g></g><path d="k"/></svg>';
    expect(removeDetailGroups(markup)).toBe('<svg><g data-part="x"/><path d="k"/></svg>');
  });

  it("does not mistake other tags that start with g", () => {
    const markup = '<svg><g data-part="a-detail"><glyph/><path/></g><path d="z"/></svg>';
    expect(removeDetailGroups(markup)).toBe('<svg><path d="z"/></svg>');
  });

  it("returns the markup unchanged when there is nothing to remove, and never loops forever", () => {
    expect(removeDetailGroups('<svg><g data-part="a"><path/></g></svg>')).toBe(
      '<svg><g data-part="a"><path/></g></svg>',
    );
    expect(() => removeDetailGroups('<svg><g data-part="a-detail"><path/>')).not.toThrow();
  });
});

describe("setRootSize", () => {
  it("replaces existing width and height on the root only", () => {
    const out = setRootSize('<svg viewBox="0 0 200 200" width="100%" height="100%"><rect width="5"/></svg>', 512);
    expect(out).toBe('<svg viewBox="0 0 200 200" width="512" height="512"><rect width="5"/></svg>');
  });

  it("adds width and height when they are missing", () => {
    const out = setRootSize('<svg viewBox="0 0 200 200"><g/></svg>', 300.4);
    expect(out).toContain('width="300"');
    expect(out).toContain('height="300"');
  });
});

describe("assertPlainArt", () => {
  it("accepts plain drawings with internal gradient references", () => {
    expect(() =>
      assertPlainArt(
        '<svg><defs><linearGradient id="g"><stop offset="0"/></linearGradient></defs><path style="fill:url(#g)"/><use href="#g"/></svg>',
      ),
    ).not.toThrow();
  });

  it.each([
    "<svg><script>1</script></svg>",
    '<svg><foreignObject><div/></foreignObject></svg>',
    '<svg><image href="data:x"/></svg>',
    '<svg><a href="https://example.test"><path/></a></svg>',
    '<svg><path xlink:href="//elsewhere"/></svg>',
    '<svg onload="x()"><path/></svg>',
    "<svg><style>a{}</style></svg>",
  ])("rejects anything that could load or run something: %s", (bad) => {
    expect(() => assertPlainArt(bad)).toThrow();
  });
});

describe("prepareSvgMarkup", () => {
  const markup =
    '<svg viewBox="0 0 200 200" width="100%" height="100%"><g data-part="body"><path style="fill:var(--th-ink)"/></g><g data-part="body-detail"><path style="stroke:var(--th-moon)"/></g></svg>';

  it("inlines colors, sets the size, and keeps the detail groups by default", () => {
    const out = prepareSvgMarkup(markup, { size: 512, hideDetail: false, resolve });
    expect(out).toContain("fill:#2a1a12");
    expect(out).toContain("stroke:#f3e9c6");
    expect(out).toContain('width="512"');
    expect(out).not.toContain("var(");
  });

  it("drops the fine-detail groups for high contrast", () => {
    const out = prepareSvgMarkup(markup, { size: 256, hideDetail: true, resolve });
    expect(out).not.toContain("body-detail");
    expect(out).not.toContain("f3e9c6");
    expect(out).toContain("fill:#2a1a12");
  });

  it("throws for markup that is not plain art", () => {
    expect(() =>
      prepareSvgMarkup("<svg><script/></svg>", { size: 10, hideDetail: false, resolve }),
    ).toThrow();
  });
});
