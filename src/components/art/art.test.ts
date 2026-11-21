import { describe, it, expect } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Art, ART_REGISTRY } from "./registry";
import type { ArtId } from "./registry";

// Validates: Requirements REQ-HUNT-42, REQ-HUNT-49

const EXPECTED_IDS: readonly ArtId[] = [
  "backdrop-home",
  "backdrop-forest",
  "backdrop-mountain",
  "backdrop-swamp",
  "backdrop-ruins",
  "hunter",
  "bag",
  "shade",
  "notebook",
  "monster-bank-ghost",
  "monster-prize-vampire",
  "monster-job-zombie",
  "monster-authority-banshee",
  "monster-generic-shade",
  "monster-neutral-candle",
  "monster-investment-goblin",
  "monster-romance-wraith",
];

const FORBIDDEN_MARKUP = ["<text", "<title", "<filter", "<animate", "blur("];
const FORBIDDEN_SOURCE = ["<text", "<title", "<filter"];

describe("art pieces", () => {
  it("registry holds exactly the expected ids", () => {
    expect(Object.keys(ART_REGISTRY).sort()).toEqual([...EXPECTED_IDS].sort());
  });

  it.each(EXPECTED_IDS)("%s is decorative and free of forbidden elements", (id) => {
    const html = renderToStaticMarkup(createElement(Art, { id }));
    expect(html).toMatch(/^<svg\b/);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    for (const bad of FORBIDDEN_MARKUP) expect(html).not.toContain(bad);
  });
});

// Validates: Requirements REQ-HUNT-39, REQ-HUNT-40
const POSES = ["idle", "tracking", "lantern", "reading", "aiming", "downcast"] as const;
const HUNTER_PARTS = ["hat", "head", "cloak", "arms", "lantern", "crossbow"];

describe("hunter poses", () => {
  const render = (pose?: string) => renderToStaticMarkup(createElement(Art, { id: "hunter", pose }));

  it.each(POSES)("%s is decorative, has every part and only token colors", (pose) => {
    const html = render(pose);
    expect(html).toContain(`data-pose="${pose}"`);
    expect(html).toContain('viewBox="0 0 200 200"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    for (const part of HUNTER_PARTS) expect(html).toContain(`data-part="${part}"`);
    expect(html).toContain('data-part="cloak-detail"');
    for (const bad of FORBIDDEN_MARKUP) expect(html).not.toContain(bad);
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
  });

  it("every pose has a different shape", () => {
    const shapes = POSES.map((p) => [...render(p).matchAll(/ d="([^"]+)"| transform="([^"]+)"/g)].map((m) => m[0]).join("|"));
    expect(new Set(shapes).size).toBe(POSES.length);
  });

  it("an unknown or missing pose falls back to idle", () => {
    expect(render("nope")).toBe(render("idle"));
    expect(render(undefined)).toBe(render("idle"));
  });
});

// Validates: Requirements REQ-HUNT-38, REQ-HUNT-39, REQ-HUNT-40
const BAG_POSES = ["closed", "open", "paper", "photo"] as const;

describe("bag poses", () => {
  const render = (pose?: string) => renderToStaticMarkup(createElement(Art, { id: "bag", pose }));

  it.each(BAG_POSES)("%s is decorative, has parts and only token colors", (pose) => {
    const html = render(pose);
    expect(html).toContain(`data-pose="${pose}"`);
    expect(html).toContain('viewBox="0 0 200 200"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    expect(html).toMatch(/data-part="[a-z-]+-detail"/);
    for (const bad of FORBIDDEN_MARKUP) expect(html).not.toContain(bad);
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
  });

  it("every pose has a different shape", () => {
    const shapes = BAG_POSES.map((p) => [...render(p).matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join("|"));
    expect(new Set(shapes).size).toBe(BAG_POSES.length);
  });

  it("closed and open show a clasp and a flap", () => {
    for (const pose of ["closed", "open"]) {
      expect(render(pose)).toContain('data-part="clasp"');
      expect(render(pose)).toContain('data-part="flap"');
    }
  });

  it("an unknown or missing pose falls back to closed", () => {
    expect(render("nope")).toBe(render("closed"));
    expect(render(undefined)).toBe(render("closed"));
  });
});

// Validates: Requirements REQ-HUNT-39, REQ-HUNT-40
const SHADE_POSES = ["run1", "run2", "run3"] as const;

describe("shade poses", () => {
  const render = (pose?: string) => renderToStaticMarkup(createElement(Art, { id: "shade", pose }));

  it.each(SHADE_POSES)("%s is decorative, has parts and only token colors", (pose) => {
    const html = render(pose);
    expect(html).toContain(`data-pose="${pose}"`);
    expect(html).toContain('viewBox="0 0 200 200"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    for (const part of ["body", "eyes", "wisps"]) expect(html).toContain(`data-part="${part}"`);
    expect(html).toMatch(/data-part="[a-z-]+-detail"/);
    for (const bad of FORBIDDEN_MARKUP) expect(html).not.toContain(bad);
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
    const tokens = new Set([...html.matchAll(/var\(--th-([a-z-]+)\)/g)].map((m) => m[1]));
    expect([...tokens].every((t) => ["ground", "lantern", "fog"].includes(t))).toBe(true);
  });

  it("every pose has a different shape", () => {
    const shapes = SHADE_POSES.map((p) => [...render(p).matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join("|"));
    expect(new Set(shapes).size).toBe(SHADE_POSES.length);
  });

  it("an unknown or missing pose falls back to run1", () => {
    expect(render("nope")).toBe(render("run1"));
    expect(render(undefined)).toBe(render("run1"));
  });
});

// Validates: Requirements REQ-HUNT-28, REQ-HUNT-38 to REQ-HUNT-43
describe("bank ghost", () => {
  const html = renderToStaticMarkup(createElement(Art, { id: "monster-bank-ghost" }));

  it("has the 200x200 viewBox, the required parts and detail groups", () => {
    expect(html).toContain('viewBox="0 0 200 200"');
    for (const part of ["body", "face", "chains", "padlock"]) expect(html).toContain(`data-part="${part}"`);
    expect(html).toMatch(/data-part="[a-z-]+-detail"/);
    expect(html).toContain("<linearGradient");
  });

  it("uses only token colors, including the bank monster token", () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|currentColor/);
    const tokens = new Set([...html.matchAll(/var\(--th-([a-z-]+)\)/g)].map((m) => m[1]));
    expect(tokens.has("monster-bank")).toBe(true);
    expect(tokens.size).toBeGreaterThanOrEqual(4);
    expect(tokens.size).toBeLessThanOrEqual(8);
    expect([...tokens].every((t) => ["monster-bank", "ground", "moon", "stone", "lantern", "fog"].includes(t))).toBe(true);
  });
});

// Validates: Requirements REQ-HUNT-28, REQ-HUNT-38 to REQ-HUNT-43
describe("prize vampire", () => {
  const html = renderToStaticMarkup(createElement(Art, { id: "monster-prize-vampire" }));

  it("has the 200x200 viewBox, the required parts and detail groups", () => {
    expect(html).toContain('viewBox="0 0 200 200"');
    for (const part of ["body", "face", "cape", "giftbox"]) expect(html).toContain(`data-part="${part}"`);
    expect(html).toMatch(/data-part="[a-z-]+-detail"/);
    expect(html).toContain("<linearGradient");
  });

  it("uses only token colors, including the prize monster token", () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|currentColor/);
    const tokens = new Set([...html.matchAll(/var\(--th-([a-z-]+)\)/g)].map((m) => m[1]));
    expect(tokens.has("monster-prize")).toBe(true);
    expect(tokens.size).toBeGreaterThanOrEqual(4);
    expect(tokens.size).toBeLessThanOrEqual(8);
    expect([...tokens].every((t) => ["monster-prize", "ground", "moon", "stone", "lantern"].includes(t))).toBe(true);
  });
});

// Validates: Requirements REQ-HUNT-28, REQ-HUNT-38 to REQ-HUNT-43
describe("job zombie", () => {
  const html = renderToStaticMarkup(createElement(Art, { id: "monster-job-zombie" }));

  it("has the 200x200 viewBox, the required parts and detail groups", () => {
    expect(html).toContain('viewBox="0 0 200 200"');
    for (const part of ["body", "face", "suit", "briefcase"]) expect(html).toContain(`data-part="${part}"`);
    expect(html).toMatch(/data-part="[a-z-]+-detail"/);
    expect(html).toContain("<linearGradient");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    expect(html).not.toMatch(/<(filter|animate|text|title)\b/);
  });

  it("uses only token colors, including the job monster token", () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|currentColor/);
    const tokens = new Set([...html.matchAll(/var\(--th-([a-z-]+)\)/g)].map((m) => m[1]));
    expect(tokens.has("monster-job-bait")).toBe(true);
    expect(tokens.size).toBeGreaterThanOrEqual(4);
    expect(tokens.size).toBeLessThanOrEqual(8);
    expect([...tokens].every((t) => ["monster-job-bait", "ground", "moon", "stone", "lantern"].includes(t))).toBe(true);
  });
});

// Validates: Requirements REQ-HUNT-28, REQ-HUNT-38 to REQ-HUNT-43
describe("authority banshee", () => {
  const html = renderToStaticMarkup(createElement(Art, { id: "monster-authority-banshee" }));

  it("has the 200x200 viewBox, the required parts and detail groups", () => {
    expect(html).toContain('viewBox="0 0 200 200"');
    for (const part of ["body", "face", "hair", "brooch"]) expect(html).toContain(`data-part="${part}"`);
    expect(html).toMatch(/data-part="[a-z-]+-detail"/);
    expect(html).toContain("<linearGradient");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    expect(html).not.toMatch(/<(filter|animate|text|title)\b/);
  });

  it("uses only token colors, including the authority monster token", () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|currentColor/);
    const tokens = new Set([...html.matchAll(/var\(--th-([a-z-]+)\)/g)].map((m) => m[1]));
    expect(tokens.has("monster-authority")).toBe(true);
    expect(tokens.size).toBeGreaterThanOrEqual(4);
    expect(tokens.size).toBeLessThanOrEqual(8);
    expect([...tokens].every((t) => ["monster-authority", "ground", "moon", "stone", "lantern", "fog"].includes(t))).toBe(true);
  });
});

// Validates: Requirements REQ-HUNT-28, REQ-HUNT-38 to REQ-HUNT-43
describe("generic shade", () => {
  const html = renderToStaticMarkup(createElement(Art, { id: "monster-generic-shade" }));

  it("has the 200x200 viewBox, the required parts and detail groups", () => {
    expect(html).toContain('viewBox="0 0 200 200"');
    for (const part of ["body", "hood", "face", "smoke"]) expect(html).toContain(`data-part="${part}"`);
    expect(html).toMatch(/data-part="[a-z-]+-detail"/);
    expect(html).toContain("<linearGradient");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    expect(html).not.toMatch(/<(filter|animate|text|title)\b/);
  });

  it("uses only token colors, including the generic monster token", () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|currentColor/);
    const tokens = new Set([...html.matchAll(/var\(--th-([a-z-]+)\)/g)].map((m) => m[1]));
    expect(tokens.has("monster-generic")).toBe(true);
    expect(tokens.size).toBeGreaterThanOrEqual(4);
    expect(tokens.size).toBeLessThanOrEqual(8);
    expect([...tokens].every((t) => ["monster-generic", "ground", "moon", "lantern", "fog"].includes(t))).toBe(true);
  });
});

// Validates: Requirements REQ-HUNT-28, REQ-HUNT-38 to REQ-HUNT-43
describe("neutral candle", () => {
  const html = renderToStaticMarkup(createElement(Art, { id: "monster-neutral-candle" }));

  it("has the 200x200 viewBox, the required parts and detail groups", () => {
    expect(html).toContain('viewBox="0 0 200 200"');
    for (const part of ["body", "holder", "flame", "moth", "glow"]) expect(html).toContain(`data-part="${part}"`);
    expect(html).toMatch(/data-part="[a-z-]+-detail"/);
    expect(html).toMatch(/data-part="flame" class="th-flicker"/);
    expect(html).toContain("<linearGradient");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    expect(html).not.toMatch(/<(filter|animate|text|title)\b/);
    expect(html).not.toContain("blur(");
  });

  it("uses only token colors, including the neutral monster token", () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(|currentColor/);
    const tokens = new Set([...html.matchAll(/var\(--th-([a-z-]+)\)/g)].map((m) => m[1]));
    expect(tokens.has("monster-neutral")).toBe(true);
    expect(tokens.size).toBeGreaterThanOrEqual(4);
    expect(tokens.size).toBeLessThanOrEqual(8);
    expect([...tokens].every((t) => ["monster-neutral", "ground", "moon", "stone", "lantern"].includes(t))).toBe(true);
  });
});

describe("art source scan", () => {
  const dir = __dirname;
  const files = readdirSync(dir).filter((n) => n.endsWith(".tsx"));

  it("finds at least the registry", () => {
    expect(files).toContain("registry.tsx");
  });

  it.each(files)("%s has no <text, <title or <filter", (name) => {
    const src = readFileSync(join(dir, name), "utf8");
    for (const bad of FORBIDDEN_SOURCE) expect(src).not.toContain(bad);
  });
});

// Validates: Requirements REQ-HUNT-21, REQ-HUNT-39, REQ-HUNT-40
describe("forest backdrop", () => {
  const html = renderToStaticMarkup(createElement(Art, { id: "backdrop-forest" }));

  it("has the 800x500 viewBox, parallax layers and key parts", () => {
    expect(html).toContain('viewBox="0 0 800 500"');
    expect(html).toContain('preserveAspectRatio="xMidYMax slice"');
    for (const part of ["layer-far", "layer-mid", "layer-near", "layer-front", "path", "roots", "fireflies", "owl-eyes", "mist-front"]) {
      expect(html).toContain(`data-part="${part}"`);
    }
    expect(html).toMatch(/data-part="layer-near" class="th-parallax"/);
    expect(html).toMatch(/data-part="[a-z-]+-detail"/);
  });

  it("uses only token colors", () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
  });
});

// Validates: Requirements REQ-HUNT-21, REQ-HUNT-39, REQ-HUNT-40
describe("mountain backdrop", () => {
  const html = renderToStaticMarkup(createElement(Art, { id: "backdrop-mountain" }));

  it("has the 800x500 viewBox, parallax layers, clouds and key parts", () => {
    expect(html).toContain('viewBox="0 0 800 500"');
    expect(html).toContain('preserveAspectRatio="xMidYMax slice"');
    for (const part of ["layer-far", "layer-mid", "layer-near", "peak", "rope-bridge", "dead-tree", "clouds-front", "stars-detail"]) {
      expect(html).toContain(`data-part="${part}"`);
    }
    for (const part of ["layer-far", "layer-mid", "layer-near"]) {
      expect(html).toContain(`data-part="${part}" class="th-parallax"`);
    }
    expect(html).toMatch(/data-part="clouds-back" class="th-fog-drift"/);
    expect(html).toMatch(/data-part="[a-z-]+-detail"/);
  });

  it("uses only token colors", () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
  });
});

// Validates: Requirements REQ-HUNT-21, REQ-HUNT-39, REQ-HUNT-40
describe("swamp backdrop", () => {
  const html = renderToStaticMarkup(createElement(Art, { id: "backdrop-swamp" }));

  it("has the 800x500 viewBox, parallax layers, fog, reeds, wisps and key parts", () => {
    expect(html).toContain('viewBox="0 0 800 500"');
    expect(html).toContain('preserveAspectRatio="xMidYMax slice"');
    for (const part of ["layer-far", "layer-mid", "layer-near", "water", "reflections", "stumps", "lily-pads", "moss", "reeds", "wisps"]) {
      expect(html).toContain(`data-part="${part}"`);
    }
    for (const part of ["layer-far", "layer-mid", "layer-near"]) {
      expect(html).toContain(`data-part="${part}" class="th-parallax"`);
    }
    expect(html).toMatch(/data-part="fog-back" class="th-fog-drift"/);
    expect(html).toMatch(/data-part="reeds" class="th-sway"/);
    expect(html).toMatch(/data-part="wisps" class="th-fly"/);
    expect(html).toMatch(/data-part="[a-z-]+-detail"/);
  });

  it("uses only token colors", () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
  });
});

// Validates: Requirements REQ-HUNT-21, REQ-HUNT-39, REQ-HUNT-40
describe("ruins backdrop", () => {
  const html = renderToStaticMarkup(createElement(Art, { id: "backdrop-ruins" }));

  it("has the 800x500 viewBox, parallax layers, ambient groups and key parts", () => {
    expect(html).toContain('viewBox="0 0 800 500"');
    expect(html).toContain('preserveAspectRatio="xMidYMax slice"');
    for (const part of ["layer-far", "layer-mid", "layer-near", "gate", "arches", "columns", "floor", "floor-detail"]) {
      expect(html).toContain(`data-part="${part}"`);
    }
    for (const part of ["layer-far", "layer-mid", "layer-near"]) {
      expect(html).toContain(`data-part="${part}" class="th-parallax"`);
    }
    expect(html).toMatch(/data-part="fog-back" class="th-fog-drift"/);
    expect(html).toMatch(/data-part="ivy" class="th-sway"/);
    expect(html).toMatch(/data-part="crows" class="th-fly"/);
    expect(html).toMatch(/data-part="glow" class="th-flicker"/);
    expect(html).toMatch(/data-part="[a-z-]+-detail"/);
  });

  it("uses only token colors", () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgb\(|hsl\(/);
  });
});
