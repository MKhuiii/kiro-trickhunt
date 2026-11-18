import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { buildReputationNote } from "./reputation-note";
import { en } from "../i18n/en";
import { vi } from "../i18n/vi";

// Feature: link-reputation-check, Property 127: the result view treats reputation as a note only
// **Validates: Requirements REQ-LREP-39, REQ-LREP-40, REQ-LREP-41, REQ-LREP-43, REQ-LREP-46**

const MODES = ["checked", "not-requested", "not-configured", "budget-exhausted", "skipped", "failed"] as const;
const UNAVAILABLE_MODES: readonly string[] = ["failed", "budget-exhausted", "not-configured"];
const STATUSES = ["ok", "degraded", "unavailable"] as const;
const RUNS = { numRuns: 150 };

const signalId = fc.oneof(
  fc.constant("url.reputation-listed"),
  fc.constantFrom("url.ip-host", "url.punycode", "text.urgency"),
  fc.string(),
);
const wellFormedVerdict = fc.record({
  reputation: fc.record({
    status: fc.constantFrom(...STATUSES),
    checkedCount: fc.nat({ max: 20 }),
  }),
  signals: fc.array(fc.record({ id: signalId }), { maxLength: 6 }),
});
const anyMode = fc.oneof(fc.constantFrom(...MODES), fc.string(), fc.anything());

const SAFE_FAMILY = /\bsafe\b|\bsafety\b|\bsafely\b|\bsecure\b|\bclean\b|\bverified\b|an toàn/i;
const LEAKS = /https?:|www\.|\b[1-5]\d\d\b|api[ -]?key|error/i;

function hasListing(v: { signals: readonly { id: string }[] }): boolean {
  return v.signals.some((s) => s.id === "url.reputation-listed");
}

describe("Property 127: buildReputationNote (PBT-127)", () => {
  it("never throws and returns null or a known note for any input", () => {
    fc.assert(
      fc.property(fc.anything(), anyMode, (verdict, mode) => {
        const note = buildReputationNote(verdict, mode);
        expect(note === null || note.kind === "unavailable" || note.kind === "not-listed").toBe(true);
      }),
      RUNS,
    );
  });

  it("follows the mode, status, count and listing rules for well-formed verdicts", () => {
    fc.assert(
      fc.property(wellFormedVerdict, fc.constantFrom(...MODES), (verdict, mode) => {
        const note = buildReputationNote(verdict, mode);
        if (UNAVAILABLE_MODES.includes(mode)) {
          expect(note?.kind).toBe("unavailable");
        } else if (mode === "checked") {
          const expected =
            verdict.reputation.status === "ok" && verdict.reputation.checkedCount >= 1 && !hasListing(verdict);
          expect(note?.kind === "not-listed").toBe(expected);
          if (!expected) expect(note).toBeNull();
        } else {
          expect(note).toBeNull();
        }
      }),
      RUNS,
    );
  });

  it("returns null for a missing or malformed reputation field in every mode", () => {
    const badRep = fc.oneof(
      fc.constant(undefined),
      fc.constant(null),
      fc.string(),
      fc.integer(),
      fc.record({ status: fc.string({ minLength: 1 }).filter((s) => !(STATUSES as readonly string[]).includes(s)), checkedCount: fc.nat() }),
      fc.record({ status: fc.constantFrom(...STATUSES), checkedCount: fc.oneof(fc.integer({ max: -1 }), fc.double({ noInteger: true }), fc.string()) }),
    );
    fc.assert(
      fc.property(badRep, fc.array(fc.record({ id: signalId }), { maxLength: 3 }), anyMode, (reputation, signals, mode) => {
        expect(buildReputationNote({ reputation, signals }, mode)).toBeNull();
      }),
      RUNS,
    );
  });

  it("returns only keys whose text exists in both dictionaries, never says safe, and carries no provider details", () => {
    fc.assert(
      fc.property(wellFormedVerdict, fc.constantFrom(...MODES), (verdict, mode) => {
        const note = buildReputationNote(verdict, mode);
        if (note === null) return;
        const keys = note.kind === "unavailable" ? [note.textKey] : [note.textKey, note.limitKey];
        for (const k of keys) {
          expect(en[k]).toBeTruthy();
          expect(vi[k]).toBeTruthy();
          expect(en[k]).not.toMatch(SAFE_FAMILY);
          expect(vi[k]).not.toMatch(SAFE_FAMILY);
          expect(en[k]).not.toMatch(LEAKS);
        }
      }),
      RUNS,
    );
  });

  it("does not change the verdict it reads", () => {
    fc.assert(
      fc.property(wellFormedVerdict, fc.constantFrom(...MODES), (verdict, mode) => {
        const before = JSON.stringify(verdict);
        buildReputationNote(verdict, mode);
        expect(JSON.stringify(verdict)).toBe(before);
      }),
      RUNS,
    );
  });
});
