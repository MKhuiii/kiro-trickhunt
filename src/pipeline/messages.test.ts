import { describe, expect, it } from "vitest";

import { createSignal } from "../core";
import type { Signal } from "../core";

import {
  ACTIONS_BY_MONSTER,
  ACTIONS_BY_SIGNAL,
  ACTIONS_FALLBACK,
  LIMITATIONS_DEGRADED,
  LIMITATIONS_FIXED,
  LIMITATIONS_NO_SIGNALS,
  LIMITATIONS_UNAVAILABLE,
} from "./messages.config";
import { buildActions, buildLimitations, resolveLocale } from "./messages";

function sig(id: string): Signal {
  return createSignal({
    id,
    source: id.startsWith("url.") ? "url" : id.startsWith("semantic.") ? "semantic" : "text",
    severity: 0.5,
    evidence: "ev",
    whyItMatters: "because",
  });
}

describe("resolveLocale", () => {
  it("accepts vi and falls back to en otherwise", () => {
    expect(resolveLocale("vi")).toBe("vi");
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("fr")).toBe("en");
    expect(resolveLocale(undefined)).toBe("en");
    expect(resolveLocale(42)).toBe("en");
  });
});

describe("buildActions", () => {
  it("uses the fallback action for null monster and no matching signals", () => {
    expect(buildActions(null, [], "en")).toEqual([...ACTIONS_FALLBACK.en]);
  });

  it("adds the monster action", () => {
    expect(buildActions("bank", [], "en")).toEqual([...ACTIONS_BY_MONSTER.en.bank]);
  });

  it("includes the otp action text", () => {
    const out = buildActions("bank", [sig("text.otp-request")], "en");
    expect(out).toContain(ACTIONS_BY_SIGNAL.en["text.otp-request"][0]);
    expect(out[0]).toBe(ACTIONS_BY_MONSTER.en.bank[0]);
  });

  it("adds the url.* action for any url signal", () => {
    for (const id of ["url.ip-host", "url.brand-lookalike", "url.anything-new"]) {
      expect(buildActions("generic", [sig(id)], "en")).toContain(
        ACTIONS_BY_SIGNAL.en["url.*"][0],
      );
    }
  });

  it("does not add the url.* action for non-url signals", () => {
    expect(buildActions("generic", [sig("text.urgency")], "en")).not.toContain(
      ACTIONS_BY_SIGNAL.en["url.*"][0],
    );
  });

  it("de-duplicates actions", () => {
    const signals = [sig("url.a"), sig("url.b"), sig("text.otp-request"), sig("text.otp-request")];
    const out = buildActions("bank", signals, "en");
    expect(new Set(out).size).toBe(out.length);
    expect(out.filter((a) => a === ACTIONS_BY_SIGNAL.en["url.*"][0])).toHaveLength(1);
  });

  it("supports the vi locale", () => {
    const out = buildActions("bank", [sig("text.otp-request")], "vi");
    expect(out).toContain(ACTIONS_BY_MONSTER.vi.bank[0]);
    expect(out).toContain(ACTIONS_BY_SIGNAL.vi["text.otp-request"][0]);
    expect(buildActions(null, [], "vi")).toEqual([...ACTIONS_FALLBACK.vi]);
  });

  it("falls back to en for an unknown locale", () => {
    expect(buildActions("prize", [], "xx")).toEqual(buildActions("prize", [], "en"));
    expect(buildActions(null, [], undefined)).toEqual([...ACTIONS_FALLBACK.en]);
  });
});

describe("buildLimitations", () => {
  it("always includes the fixed limitation", () => {
    const out = buildLimitations({ level: "high", semanticStatus: "ok", locale: "en" });
    expect(out).toEqual([...LIMITATIONS_FIXED.en]);
  });

  it("adds the degraded limitation", () => {
    const out = buildLimitations({ level: "high", semanticStatus: "degraded", locale: "en" });
    expect(out).toContain(LIMITATIONS_DEGRADED.en[0]);
    expect(out).not.toContain(LIMITATIONS_UNAVAILABLE.en[0]);
  });

  it("adds the unavailable limitation", () => {
    const out = buildLimitations({ level: "high", semanticStatus: "unavailable", locale: "en" });
    expect(out).toContain(LIMITATIONS_UNAVAILABLE.en[0]);
    expect(out).not.toContain(LIMITATIONS_DEGRADED.en[0]);
  });

  it("adds the no-signals limitation for no_signals", () => {
    const out = buildLimitations({ level: "no_signals", semanticStatus: "ok", locale: "en" });
    expect(out).toContain(LIMITATIONS_NO_SIGNALS.en[0]);
  });

  it("uses vi and falls back to en for unknown locales", () => {
    const vi = buildLimitations({ level: "no_signals", semanticStatus: "ok", locale: "vi" });
    expect(vi).toContain(LIMITATIONS_FIXED.vi[0]);
    expect(vi).toContain(LIMITATIONS_NO_SIGNALS.vi[0]);
    const unknown = buildLimitations({ level: "high", semanticStatus: "ok", locale: "zz" });
    expect(unknown).toEqual([...LIMITATIONS_FIXED.en]);
  });

  it("no_signals verdict gets fallback action and no-signals limitation", () => {
    const monster = null;
    expect(buildActions(monster, [], "en")).toEqual([...ACTIONS_FALLBACK.en]);
    expect(
      buildLimitations({ level: "no_signals", semanticStatus: "ok", locale: "en" }),
    ).toContain(LIMITATIONS_NO_SIGNALS.en[0]);
  });
});
