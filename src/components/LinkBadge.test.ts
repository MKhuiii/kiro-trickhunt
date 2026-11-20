import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LinkBadge } from "./LinkBadge";
import { t } from "../ui";
import { buildLinkCreatures } from "../ui/view/link-creatures-view";
import type { LinkCreatureView } from "../ui";

function creature(): LinkCreatureView {
  const [c] = buildLinkCreatures([
    { id: "url.ip-address-host", source: "url", severity: 0.8, evidence: "http://10.0.0.1/<b>x" },
  ]);
  return c;
}

const html = renderToStaticMarkup(createElement(LinkBadge, { creature: creature(), locale: "en" }));

describe("LinkBadge", () => {
  it("shows the parts in order", () => {
    const c = creature();
    const parts = [
      "<svg",
      t("en", "link.badge.caption"),
      t("en", c.nameKey),
      t("en", c.descriptionKey),
      t("en", c.toneLabelKey),
      t("en", c.explanationKey),
      t("en", "result.evidence.label"),
    ];
    let last = -1;
    for (const p of parts) {
      const at = html.indexOf(p, last + 1);
      expect(at, p).toBeGreaterThan(last);
      last = at;
    }
  });

  it("draws the art in dark ink on a paper disc, the same for every creature", () => {
    expect(html).toContain("color:var(--th-ink)");
    expect(html).toContain("bg-[var(--th-paper)]");
    expect(html).not.toContain(`var(--th-${creature().colorToken})`);
  });

  it("renders evidence as escaped plain text in a break-words span", () => {
    expect(html).toContain('<span class="break-words">http://10.0.0.1/&lt;b&gt;x</span>');
  });

  it("has no link or interaction markup, fixed pixel text or animation", () => {
    expect(html).not.toMatch(/<a[\s>]|href=|onclick|role="link"|tabindex/i);
    expect(html).not.toMatch(/\d\s*px|animate|transition/i);
  });

  it("renders in vietnamese without throwing", () => {
    const vi = renderToStaticMarkup(createElement(LinkBadge, { creature: creature(), locale: "vi" }));
    expect(vi).toContain(t("vi", "link.badge.caption"));
  });
});
