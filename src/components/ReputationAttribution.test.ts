import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReputationAttribution } from "./ReputationAttribution";
import { t } from "../ui";
import { ADVISORY_URL } from "../ui/reputation.config";

const html = renderToStaticMarkup(createElement(ReputationAttribution, { listed: true, locale: "en" }));

describe("ReputationAttribution", () => {
  it("renders nothing when no link is listed", () => {
    expect(renderToStaticMarkup(createElement(ReputationAttribution, { listed: false, locale: "en" }))).toBe("");
  });

  it("renders exactly one anchor with the three attributes", () => {
    expect(html.match(/<a[\s>]/g)).toHaveLength(1);
    expect(html).toContain(`href="${ADVISORY_URL}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toMatch(/referrerpolicy="no-referrer"/i);
  });

  it("shows the attribution text and a hidden new-tab label", () => {
    expect(html).toContain(t("en", "reputation.attribution.text"));
    expect(html).toContain(`<span class="sr-only"> ${t("en", "reputation.attribution.newTab")}</span>`);
  });

  it("uses rem-based text and no fixed pixel sizes", () => {
    expect(html).toContain("text-base");
    expect(html).not.toMatch(/\d\s*px/i);
  });

  it("renders the new-tab label in vietnamese", () => {
    const vi = renderToStaticMarkup(createElement(ReputationAttribution, { listed: true, locale: "vi" }));
    expect(vi).toContain(t("vi", "reputation.attribution.newTab"));
  });
});
