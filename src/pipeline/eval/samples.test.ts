import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { EVAL_SAMPLES } from "./samples";

const SPECIFIC = ["bank", "prize", "job-bait", "authority"] as const;

// Real brands that must never appear in the synthetic set (REQ-PIPE-44).
// Kept local so that src/pipeline/eval imports only pipeline and core (REQ-PIPE-47).
const REAL_BRANDS = [
  "paypal",
  "amazon",
  "apple",
  "microsoft",
  "google",
  "netflix",
  "facebook",
  "instagram",
  "dhl",
  "fedex",
  "chase",
  "citibank",
  "hsbc",
  "wells fargo",
  "bank of america",
  "vietcombank",
  "techcombank",
  "bidv",
  "vietinbank",
  "mbbank",
  "momo",
  "zalopay",
  "viettel",
  "shopee",
  "lazada",
  "visa",
  "mastercard",
];

const scams = EVAL_SAMPLES.filter((s) => s.expectedMonster !== null);
const benign = EVAL_SAMPLES.filter((s) => s.expectedMonster === null);

describe("EVAL_SAMPLES (REQ-PIPE-43, REQ-PIPE-45)", () => {
  it("has 53 samples: 26 scam and 27 benign (43 tuning + 10 batch 2)", () => {
    expect(EVAL_SAMPLES).toHaveLength(53);
    expect(scams).toHaveLength(26);
    expect(benign).toHaveLength(27);
    expect(EVAL_SAMPLES.filter((s) => s.id.startsWith("b2-"))).toHaveLength(10);
  });

  it("has unique ids", () => {
    const ids = EVAL_SAMPLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(SPECIFIC)("has at least 4 English and 1 Vietnamese scam sample for %s", (monster) => {
    const own = scams.filter((s) => s.expectedMonster === monster);
    expect(own.filter((s) => s.locale === "en").length).toBeGreaterThanOrEqual(4);
    expect(own.filter((s) => s.locale === "vi").length).toBeGreaterThanOrEqual(1);
  });

  it("has at least 12 English and 4 Vietnamese benign samples", () => {
    expect(benign.filter((s) => s.locale === "en").length).toBeGreaterThanOrEqual(12);
    expect(benign.filter((s) => s.locale === "vi").length).toBeGreaterThanOrEqual(4);
  });

  it("uses no_signals as minLevel for every benign sample", () => {
    for (const s of benign) expect(s.minLevel).toBe("no_signals");
  });

  it("uses a level above no_signals for every scam sample", () => {
    for (const s of scams) expect(["high", "critical"]).toContain(s.minLevel);
  });
});

describe("EVAL_SAMPLES synthetic rules (REQ-PIPE-44)", () => {
  it("uses only .example URLs", () => {
    const urlRe = /https?:\/\/[^\s/]+/gi;
    for (const s of EVAL_SAMPLES) {
      for (const m of s.text.match(urlRe) ?? []) {
        const host = m.replace(/^https?:\/\//i, "").replace(/[.,;:!?)]+$/, "");
        expect(host.endsWith(".example"), `${s.id}: ${m}`).toBe(true);
      }
    }
  });

  it("mentions no real brand", () => {
    for (const s of EVAL_SAMPLES) {
      const text = s.text.toLowerCase();
      for (const brand of REAL_BRANDS) {
        const re = new RegExp(`(^|[^a-z0-9])${brand}([^a-z0-9]|$)`);
        expect(re.test(text), `${s.id} mentions ${brand}`).toBe(false);
      }
    }
  });

  it("contains no phone-number-like digit run", () => {
    for (const s of EVAL_SAMPLES) {
      expect(/\d{8,}/.test(s.text.replace(/[\s.-]/g, "")), s.id).toBe(false);
    }
  });
});

describe("src/pipeline/eval isolation (REQ-PIPE-47)", () => {
  it("is not re-exported from src/pipeline/index.ts", () => {
    const index = readFileSync(join(__dirname, "..", "index.ts"), "utf8");
    expect(index).not.toMatch(/eval/);
  });

  it("imports only from src/pipeline and src/core", () => {
    const files = readdirSync(__dirname).filter((f) => f.endsWith(".ts"));
    for (const f of files) {
      const src = readFileSync(join(__dirname, f), "utf8");
      const specs = [...src.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
      for (const spec of specs) {
        if (!spec.startsWith(".")) continue; // vitest, node:*, fast-check
        const ok = spec.startsWith("./") || spec === "../../core" || spec.startsWith("../");
        const escapes = spec.startsWith("../../") && spec !== "../../core";
        expect(ok && !escapes, `${f} imports ${spec}`).toBe(true);
      }
    }
  });
});
