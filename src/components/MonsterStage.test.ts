import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MonsterStage } from "./MonsterStage";
import { MONSTER_PRESENTATION, t } from "../ui";
import { buildLinkCreatures } from "../ui/view/link-creatures-view";
import { LINK_CREATURES } from "../ui/link-creatures";
import type { MonsterKey } from "../ui";

// Markup tests for the reveal (REQ-HUNT-28, REQ-HUNT-33, REQ-HUNT-41, REQ-HUNT-42).

const MONSTERS: readonly MonsterKey[] = ["bank", "prize", "job-bait", "authority", "investment", "romance", "generic", "neutral"];
const LOCALES = ["en", "vi"] as const;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}+/gu, "").replace(/đ/g, "d").toLowerCase();
}

function stage(locale: "en" | "vi", monster: MonsterKey): string {
  return renderToStaticMarkup(createElement(MonsterStage, { locale, monster }));
}

describe("MonsterStage markup", () => {
  for (const locale of LOCALES) {
    for (const monster of MONSTERS) {
      it(`${locale}: renders ${monster} with the right caption`, () => {
        const html = stage(locale, monster);
        const p = MONSTER_PRESENTATION[monster];
        expect(html).toContain(`data-monster="${monster}"`);
        if (monster === "neutral") expect(html).toContain(esc(t(locale, "scene.reveal.nothing")));
        else expect(html).not.toContain(esc(t(locale, "scene.reveal.found", { name: t(locale, p.nameKey) })));
        expect(html).toContain("th-reveal");
        expect(html).toContain(`var(--th-${p.colorToken})`);
        expect(html).toContain('aria-hidden="true"');
        expect(html).not.toContain("{name}");
        expect(html).not.toContain("<text");
        expect(html).not.toContain("<title");
        if (monster !== "neutral") expect(html).not.toContain(esc(t(locale, p.nameKey)));
      });
    }
  }

  it("renders a distinct drawing for each monster", () => {
    const drawings = new Set(MONSTERS.map((m) => stage("en", m).replace(/data-monster="[^"]*"/, "")));
    expect(drawings.size).toBe(8);
  });

  it("shows the link creature art and name next to the monster", () => {
    const creatures = buildLinkCreatures([
      { id: LINK_CREATURES[0].signalId, source: "url", severity: 0.8, evidence: "paypa1.com" },
    ]);
    expect(creatures.length).toBeGreaterThan(0);
    for (const locale of LOCALES) {
      const html = renderToStaticMarkup(
        createElement(MonsterStage, { locale, monster: "bank", linkCreatures: creatures }),
      );
      for (const c of creatures) {
        expect(html).toContain(esc(t(locale, c.nameKey)));
        expect(html).not.toContain(`var(--th-${c.colorToken})`);
      }
      expect(html).toContain("color:var(--th-ink)");
      expect(html).toContain("bg-[var(--th-paper)]");
    }
    expect(stage("en", "bank")).not.toContain("<ul");
  });

  it("neutral caption has no banned word (diacritics folded)", () => {
    for (const locale of LOCALES) {
      const caption = fold(t(locale, "scene.reveal.nothing"));
      expect(caption).not.toMatch(/safe|clean|an toan/);
      expect(fold(stage(locale, "neutral"))).not.toMatch(/safe|clean|an toan/);
    }
  });
});
