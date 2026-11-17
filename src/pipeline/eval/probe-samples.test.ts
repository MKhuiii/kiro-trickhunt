import { describe, expect, it } from "vitest";
import { LEVEL_RANK } from "./probe-report";
import {
  PROBE_EVASION_SAMPLES,
  PROBE_HOLDOUT2_SAMPLES,
  PROBE_HOLDOUT_SAMPLES,
  PROBE_SAMPLES,
} from "./probe-samples";
import type { ProbeCategory } from "./probe-samples";

const ALL_SAMPLES = [
  ...PROBE_SAMPLES,
  ...PROBE_HOLDOUT_SAMPLES,
  ...PROBE_HOLDOUT2_SAMPLES,
  ...PROBE_EVASION_SAMPLES,
];

const MONSTERS = ["bank", "prize", "job-bait", "authority", "generic"];

function count(cat: ProbeCategory): number {
  return PROBE_SAMPLES.filter((s) => s.category === cat).length;
}

describe("probe samples integrity", () => {
  it("has unique ids across the main and holdout sets", () => {
    const ids = ALL_SAMPLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("holdout set has scams for every monster and harmless messages", () => {
    const scams = PROBE_HOLDOUT_SAMPLES.filter((s) => s.category === "rare-scam");
    for (const m of ["bank", "prize", "job-bait", "authority"]) {
      expect(scams.some((s) => s.expectedMonster === m), m).toBe(true);
    }
    expect(PROBE_HOLDOUT_SAMPLES.filter((s) => s.category !== "rare-scam").length).toBeGreaterThanOrEqual(5);
    expect(PROBE_HOLDOUT_SAMPLES.every((s) => s.id.startsWith("h-"))).toBe(true);
  });

  it("covers every category with enough samples", () => {
    expect(PROBE_SAMPLES.length).toBeGreaterThanOrEqual(50);
    expect(count("rare-scam")).toBeGreaterThanOrEqual(15);
    expect(count("out-of-scope-scam")).toBeGreaterThanOrEqual(8);
    expect(count("benign")).toBeGreaterThanOrEqual(10);
    expect(count("lookalike")).toBeGreaterThanOrEqual(12);
  });

  it("mixes English and Vietnamese in every category", () => {
    const cats: ProbeCategory[] = [
      "rare-scam",
      "out-of-scope-scam",
      "benign",
      "lookalike",
    ];
    for (const cat of cats) {
      const locales = new Set(
        PROBE_SAMPLES.filter((s) => s.category === cat).map((s) => s.locale),
      );
      expect(locales.has("en"), cat).toBe(true);
      expect(locales.has("vi"), cat).toBe(true);
    }
  });

  it("has consistent expectations", () => {
    for (const s of ALL_SAMPLES) {
      expect(LEVEL_RANK[s.minLevel], s.id).toBeLessThanOrEqual(LEVEL_RANK[s.maxLevel]);
      expect(s.text.trim().length, s.id).toBeGreaterThan(0);
      expect(s.rationale.trim().length, s.id).toBeGreaterThan(0);
      if (s.category === "benign" || s.category === "lookalike") {
        expect(s.expectedMonster, s.id).toBeNull();
        expect(LEVEL_RANK[s.maxLevel], s.id).toBeLessThanOrEqual(LEVEL_RANK.suspicious);
      } else {
        expect(MONSTERS, s.id).toContain(s.expectedMonster);
        expect(LEVEL_RANK[s.minLevel], s.id).toBeGreaterThanOrEqual(LEVEL_RANK.suspicious);
      }
      if (s.category === "out-of-scope-scam") {
        expect(s.expectedMonster, s.id).toBe("generic");
      }
      if (s.category === "rare-scam") {
        expect(s.expectedMonster, s.id).not.toBe("generic");
      }
    }
  });

  it("holdout set 2 has scams for every monster and harmless messages", () => {
    const scams = PROBE_HOLDOUT2_SAMPLES.filter((s) => s.category === "rare-scam");
    for (const m of ["bank", "prize", "job-bait", "authority"]) {
      expect(scams.filter((s) => s.expectedMonster === m).length, m).toBe(2);
    }
    expect(PROBE_HOLDOUT2_SAMPLES.filter((s) => s.category !== "rare-scam").length).toBe(8);
    expect(PROBE_HOLDOUT2_SAMPLES.every((s) => s.id.startsWith("h2-"))).toBe(true);
  });

  it("evasion set has evasion scams and genuine warnings in both languages", () => {
    const scams = PROBE_EVASION_SAMPLES.filter((s) => s.category === "evasion-scam");
    const real = PROBE_EVASION_SAMPLES.filter((s) => s.category === "lookalike");
    expect(scams.length).toBeGreaterThanOrEqual(20);
    expect(real.length).toBeGreaterThanOrEqual(6);
    expect(scams.length + real.length).toBe(PROBE_EVASION_SAMPLES.length);
    for (const group of [scams, real]) {
      expect(group.some((s) => s.locale === "en")).toBe(true);
      expect(group.some((s) => s.locale === "vi")).toBe(true);
    }
    for (const s of scams) {
      expect(s.expectedMonster, s.id).toBe("generic");
      expect(s.minLevel, s.id).toBe("suspicious");
    }
    expect(PROBE_EVASION_SAMPLES.every((s) => s.id.startsWith("ev-"))).toBe(true);
  });

  it("evasion set uses only all-zero phone numbers", () => {
    for (const s of PROBE_EVASION_SAMPLES) {
      const runs = s.text.replace(/(\d)[\s.-](?=\d)/g, "$1").match(/\d{8,}/g) ?? [];
      for (const r of runs) expect(/^0+$/.test(r), `${s.id}: ${r}`).toBe(true);
    }
  });

  it("uses only synthetic data", () => {
    for (const s of ALL_SAMPLES) {
      const urls = s.text.match(/https?:\/\/[^\s/,;)]+/g) ?? [];
      for (const u of urls) {
        expect(u.endsWith(".example"), `${s.id}: ${u}`).toBe(true);
      }
      expect(/\d{3}[-\s.]?\d{3,4}[-\s.]?\d{4}/.test(s.text), `${s.id}: phone-like`).toBe(false);
      expect(/\S+@\S+\.\S+/.test(s.text), `${s.id}: email-like`).toBe(false);
    }
  });

  it("never uses the word safe in a sample expectation", () => {
    for (const s of ALL_SAMPLES) {
      expect(/\bsafe\b/i.test(s.rationale), s.id).toBe(false);
    }
  });
});
