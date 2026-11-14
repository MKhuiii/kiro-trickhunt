import { describe, expect, it } from "vitest";
import { semanticNoteKey } from "./semantic-note";

const ok = { status: "ok", skipped: false } as const;
const okSkipped = { status: "ok", skipped: true } as const;
const unavailable = { status: "unavailable", skipped: false } as const;
const degraded = { status: "degraded", reason: "timeout", skipped: false } as const;

describe("semanticNoteKey (first-match table)", () => {
  const rows: [string, unknown, unknown, string][] = [
    ["budget-exhausted mode", ok, "budget-exhausted", "semantic.budget-exhausted"],
    ["budget-exhausted beats degraded verdict", degraded, "budget-exhausted", "semantic.budget-exhausted"],
    ["not-configured mode", ok, "not-configured", "semantic.not-configured"],
    ["not-configured beats degraded verdict", degraded, "not-configured", "semantic.not-configured"],
    ["degraded status, no mode", degraded, undefined, "semantic.degraded"],
    ["degraded status, used mode", degraded, "used", "semantic.degraded"],
    ["degraded status, skipped mode", degraded, "skipped", "semantic.degraded"],
    ["unavailable, no mode", unavailable, undefined, "semantic.not-configured"],
    ["unavailable, used mode", unavailable, "used", "semantic.used"],
    ["skipped mode", ok, "skipped", "semantic.skipped"],
    ["verdict skipped flag, no mode", okSkipped, undefined, "semantic.skipped"],
    ["used mode", ok, "used", "semantic.used"],
    ["ok status, no mode", ok, undefined, "semantic.used"],
    ["unknown mode falls through", unavailable, "weird", "semantic.skipped"],
    ["empty semantic object", {}, undefined, "semantic.skipped"],
    ["null semantic with used mode", null, "used", "semantic.used"],
    ["null semantic, no mode", null, undefined, "semantic.skipped"],
  ];

  for (const [name, sem, mode, expected] of rows) {
    it(`${name} gives ${expected}`, () => {
      expect(semanticNoteKey(sem, mode)).toBe(expected);
    });
  }

  it("never throws on hostile input", () => {
    const hostile = {
      get status(): never {
        throw new Error("boom");
      },
    };
    expect(semanticNoteKey(hostile, undefined)).toBe("semantic.skipped");
  });
});
