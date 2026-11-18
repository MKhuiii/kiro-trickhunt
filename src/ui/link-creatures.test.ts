import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { UrlAnalyzer } from "../analyzers/url-analyzer";
import { KNOWN_SIGNAL_IDS } from "./i18n/signal-ids";
import { LINK_CREATURES, LINK_TONES } from "./link-creatures";
import type { LinkTone } from "./link-creatures";
import { LEVEL_PRESENTATION } from "./theme/levels";
import { HIGH_CONTRAST_PALETTE, NORMAL_PALETTE } from "./theme/palettes";

function urlIdsFromSource(): string[] {
  const source = readFileSync(
    join(__dirname, "..", "analyzers", "url-analyzer.ts"),
    "utf8",
  );
  const ids = new Set<string>();
  for (const m of source.matchAll(/id:\s*"(url\.[^"]+)"/g)) ids.add(m[1] as string);
  return [...ids];
}

const SAMPLES = [
  "https://paypa1.com/",
  "https://xn--pple-43d.com/",
  "http://192.168.10.5/home",
  "https://paypal.com@evil.example.net/",
  "https://a.b.c.d.e.example.com/",
  "https://bit.ly/abc123",
  "https://example.org/login/verify",
];

describe("LINK_CREATURES", () => {
  it("has exactly the specified table in order", () => {
    expect(
      LINK_CREATURES.map((c) => [c.id, c.signalId, c.tone]),
    ).toEqual([
      ["doppelganger", "url.brand-lookalike", "strong"],
      ["changeling", "url.punycode-host", "strong"],
      ["faceless-one", "url.ip-address-host", "strong"],
      ["masked-stranger", "url.at-in-authority", "strong"],
      ["hydra", "url.excessive-subdomains", "medium"],
      ["cloaked-gate", "url.known-shortener", "soft"],
      ["wisp", "url.credential-keywords", "soft"],
      ["plague-mark", "url.reputation-listed", "strong"],
    ]);
    expect(LINK_CREATURES).toHaveLength(8);
  });

  it("has unique ids, signal ids, tokens and art keys with derived names", () => {
    for (const field of ["id", "signalId", "colorToken", "artKey"] as const) {
      expect(new Set(LINK_CREATURES.map((c) => c[field])).size).toBe(8);
    }
    for (const c of LINK_CREATURES) {
      expect(c.nameKey).toBe(`link.${c.id}.name`);
      expect(c.colorToken).toBe(`link-${c.id}`);
      expect(c.artKey).toBe(`creature-${c.id}`);
      expect(c.artKey).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(NORMAL_PALETTE[c.colorToken]).toBeTruthy();
      expect(HIGH_CONTRAST_PALETTE[c.colorToken]).toBeTruthy();
    }
  });

  it("has bands strong x5, medium x1, soft x2", () => {
    const count = (t: LinkTone) => LINK_CREATURES.filter((c) => c.tone === t).length;
    expect([count("strong"), count("medium"), count("soft")]).toEqual([5, 1, 2]);
  });

  it("is one-to-one with the url ids in url-analyzer.ts plus the listing id, and in KNOWN_SIGNAL_IDS", () => {
    const fromSource = urlIdsFromSource();
    expect(fromSource.length).toBeGreaterThan(0);
    expect(LINK_CREATURES.map((c) => c.signalId).sort()).toEqual(
      [...fromSource, "url.reputation-listed"].sort(),
    );
    const known = new Set<string>(KNOWN_SIGNAL_IDS);
    for (const c of LINK_CREATURES) expect(known.has(c.signalId)).toBe(true);
  });

  it("covers real UrlAnalyzer output and every table id is emitted by a sample", async () => {
    const table = new Set(
      LINK_CREATURES.map((c) => c.signalId).filter((id) => id !== "url.reputation-listed"),
    );
    const emitted = new Set<string>();
    const analyzer = new UrlAnalyzer();
    for (const sample of SAMPLES) {
      for (const s of await analyzer.analyze(sample)) {
        expect(table.has(s.id)).toBe(true);
        emitted.add(s.id);
      }
    }
    expect([...emitted].sort()).toEqual([...table].sort());
  });
});

describe("first seven creatures", () => {
  it("keep their content, and only plague-mark has an explanationKey", () => {
    expect(LINK_CREATURES.slice(0, 7).map((c) => c.id)).toEqual([
      "doppelganger", "changeling", "faceless-one", "masked-stranger", "hydra", "cloaked-gate", "wisp",
    ]);
    for (const c of LINK_CREATURES.slice(0, 7)) expect(c.explanationKey).toBeUndefined();
    const last = LINK_CREATURES[7];
    expect(last.explanationKey).toBe("link.plague-mark.explain");
    expect(last.nameKey).toBe("link.plague-mark.name");
    expect(last.colorToken).toBe("link-plague-mark");
    expect(last.artKey).toBe("creature-plague-mark");
  });
});

describe("LINK_TONES", () => {
  const bands: LinkTone[] = ["strong", "medium", "soft"];

  it("derives keys from the band name", () => {
    for (const b of bands) {
      expect(LINK_TONES[b].labelKey).toBe(`link.tone.${b}.label`);
      expect(LINK_TONES[b].explanationKey).toBe(`link.tone.${b}.explain`);
      expect(LINK_TONES[b].iconKey).toBe(`icon-tone-${b}`);
    }
  });

  it("has pairwise different keys and icons that differ from the level icons", () => {
    for (const field of ["labelKey", "iconKey", "explanationKey"] as const) {
      expect(new Set(bands.map((b) => LINK_TONES[b][field])).size).toBe(3);
    }
    const levelIcons = new Set(Object.values(LEVEL_PRESENTATION).map((l) => l.iconKey));
    expect(levelIcons.size).toBe(4);
    for (const b of bands) expect(levelIcons.has(LINK_TONES[b].iconKey)).toBe(false);
  });
});
