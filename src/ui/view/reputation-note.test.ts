import { describe, expect, it } from "vitest";
import { buildReputationNote } from "./reputation-note";
import { en } from "../i18n/en";
import { vi } from "../i18n/vi";

const rep = (status: string, checkedCount: number) => ({ status, checkedCount });
const verdict = (r: unknown, ids: string[] = []) => ({
  reputation: r,
  signals: ids.map((id) => ({ id })),
});

describe("buildReputationNote (REQ-LREP-39, 40, 43)", () => {
  it.each(["failed", "budget-exhausted", "not-configured"])("%s gives the unavailable notice", (mode) => {
    expect(buildReputationNote(verdict(rep("unavailable", 0)), mode)).toEqual({
      kind: "unavailable",
      textKey: "reputation.notice.unavailable",
    });
  });

  it("checked, ok, one link, nothing listed gives the not-listed note", () => {
    expect(buildReputationNote(verdict(rep("ok", 2), ["url.ip-host"]), "checked")).toEqual({
      kind: "not-listed",
      textKey: "reputation.notListed.text",
      limitKey: "reputation.notListed.limit",
    });
  });

  it("checked with a listing signal gives no note", () => {
    expect(buildReputationNote(verdict(rep("ok", 1), ["url.reputation-listed"]), "checked")).toBeNull();
  });

  it("checked with zero checked links or non-ok status gives no note", () => {
    expect(buildReputationNote(verdict(rep("ok", 0)), "checked")).toBeNull();
    expect(buildReputationNote(verdict(rep("degraded", 1)), "checked")).toBeNull();
  });

  it("skipped and not-requested give no note", () => {
    expect(buildReputationNote(verdict(rep("ok", 1)), "skipped")).toBeNull();
    expect(buildReputationNote(verdict(rep("ok", 1)), "not-requested")).toBeNull();
  });

  it("is total on malformed input", () => {
    const bad: unknown[] = [undefined, null, 1, "x", {}, { reputation: null }, verdict(rep("zzz", 1)), verdict(rep("ok", -1)), verdict(rep("ok", 1.5)), verdict(rep("ok", NaN))];
    for (const v of bad) {
      expect(buildReputationNote(v, "checked")).toBeNull();
      expect(buildReputationNote(v, "failed")).toBeNull();
    }
    expect(buildReputationNote(verdict(rep("ok", 1)), "bogus")).toBeNull();
    expect(buildReputationNote(verdict(rep("ok", 1)), undefined)).toBeNull();
    const throwing = { get reputation(): unknown { throw new Error("x"); } };
    expect(buildReputationNote(throwing, "failed")).toBeNull();
  });

  it("returned keys exist in both dictionaries and never say safe (REQ-LREP-41)", () => {
    const note = buildReputationNote(verdict(rep("ok", 1)), "checked");
    if (note?.kind !== "not-listed") throw new Error("expected not-listed");
    const un = buildReputationNote(verdict(rep("unavailable", 0)), "failed");
    if (un === null) throw new Error("expected notice");
    const keys = [note.textKey, note.limitKey, un.textKey];
    for (const k of keys) {
      expect(en[k]).toBeTruthy();
      expect(vi[k]).toBeTruthy();
      expect(en[k]).not.toMatch(/\bsafe\b|\bsafety\b/i);
    }
  });
});
