import { describe, expect, it } from "vitest";
import { en, t, vi } from "./dictionary";
import type { MessageKey } from "./dictionary";

const NEW_KEYS: readonly MessageKey[] = [
  "result.aiNote.unavailable",
  "result.aiNote.heading",
  "result.noSignals.reminderStrong",
  "result.limitsNote",
  "result.monster.heading",
  "result.evidence.heading",
  "settings.open",
  "input.paste.hint",
];
const CHANGED_KEYS: readonly MessageKey[] = ["level.suspicious", "result.actions.heading"];

describe("ui-page dictionary keys", () => {
  it("new and changed keys exist and are non-empty in both languages", () => {
    for (const key of [...NEW_KEYS, ...CHANGED_KEYS]) {
      expect(t("en", key), `en ${key}`).not.toBe("");
      expect(t("vi", key), `vi ${key}`).not.toBe("");
      expect(Object.hasOwn(en, key)).toBe(true);
      expect(Object.hasOwn(vi, key)).toBe(true);
    }
  });

  it("en and vi have identical key sets", () => {
    expect(Object.keys(vi).sort()).toEqual(Object.keys(en).sort());
  });

  it("new keys never say safe / an toàn", () => {
    for (const key of NEW_KEYS) {
      expect(t("en", key).toLowerCase(), `en ${key}`).not.toMatch(/\bsafe/);
      expect(t("vi", key).toLowerCase(), `vi ${key}`).not.toContain("an toàn");
    }
  });

  it("new keys have the same placeholders in both languages", () => {
    const ph = (s: string) => (s.match(/\{[A-Za-z0-9_]+\}/g) ?? []).sort();
    for (const key of NEW_KEYS) {
      expect(ph(t("vi", key))).toEqual(ph(t("en", key)));
    }
  });

  it("suspicious texts avoid scam, dangerous, stop, malicious (REQ-PAGE-06)", () => {
    const banned = /scam|dangerous|stop|malicious/i;
    for (const locale of ["en", "vi"] as const) {
      const label = t(locale, "level.suspicious");
      const announcement = t(locale, "a11y.result-ready", { level: label });
      expect(label).not.toMatch(banned);
      expect(announcement).not.toMatch(banned);
    }
  });

  it("strong reminder differs from the normal one and mentions the official number", () => {
    expect(t("en", "result.noSignals.reminderStrong")).not.toBe(t("en", "result.noSignals.reminder"));
    expect(t("en", "result.noSignals.reminderStrong")).toContain("official number");
  });

  it("English wording of the changed and new keys (REQ-PAGE-01, 05, 08, 13)", () => {
    expect(t("en", "level.suspicious")).toBe("A few things to double-check");
    expect(t("en", "result.actions.heading")).toBe("What to do now");
    expect(t("en", "result.aiNote.unavailable")).toBe(
      "The extra AI check was not available, so this result may miss newer or unusual scams. Treat unexpected requests with care.",
    );
    expect(t("en", "result.limitsNote")).toBe(
      "TrickHunt looks for warning signs. It cannot prove that a message is genuine.",
    );
  });
});
