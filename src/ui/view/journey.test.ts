import { describe, expect, it } from "vitest";
import { MIN_HUNT_MS } from "../hunt.config";
import { legFor, legsFor, revealWaitMs } from "./journey";
import type { CheckStatus } from "../run-check";

const MIN = 4000;

describe("MIN_HUNT_MS", () => {
  it("is 4000", () => {
    expect(MIN_HUNT_MS).toBe(4000);
  });
});

describe("legsFor", () => {
  it("text only: forest then ruins", () => {
    expect(legsFor(false)).toEqual(["forest", "ruins"]);
  });
  it("with picture: all four legs", () => {
    expect(legsFor(true)).toEqual(["forest", "mountain", "swamp", "ruins"]);
  });
});

describe("legFor, text only", () => {
  const leg = (status: CheckStatus, elapsedMs: number) =>
    legFor({ hasImage: false, status, elapsedMs, minMs: MIN });

  it("starts in the forest", () => {
    expect(leg("preparing", 0)).toBe("forest");
    expect(leg("preparing", 1999)).toBe("forest");
  });
  it("moves to the ruins by time", () => {
    expect(leg("preparing", 2000)).toBe("ruins");
  });
  it("moves to the ruins when sending, even early", () => {
    expect(leg("sending", 0)).toBe("ruins");
  });
  it("never shows mountain or swamp", () => {
    const statuses: CheckStatus[] = ["preparing", "qr", "ocr-loading", "ocr-recognizing", "sending"];
    for (const s of statuses) {
      for (const e of [0, 1000, 3000, 9000]) {
        expect(["forest", "ruins"]).toContain(leg(s, e));
      }
    }
  });
});

describe("legFor, with picture", () => {
  const leg = (status: CheckStatus, elapsedMs: number) =>
    legFor({ hasImage: true, status, elapsedMs, minMs: MIN });

  it("each status at time 0", () => {
    expect(leg("preparing", 0)).toBe("forest");
    expect(leg("qr", 0)).toBe("mountain");
    expect(leg("ocr-loading", 0)).toBe("swamp");
    expect(leg("ocr-recognizing", 0)).toBe("swamp");
    expect(leg("sending", 0)).toBe("ruins");
  });
  it("elapsed time advances a quarter at a time", () => {
    expect(leg("preparing", 999)).toBe("forest");
    expect(leg("preparing", 1000)).toBe("mountain");
    expect(leg("preparing", 2000)).toBe("swamp");
    expect(leg("preparing", 3000)).toBe("ruins");
  });
  it("uses the larger of status and time index", () => {
    expect(leg("qr", 2500)).toBe("swamp");
    expect(leg("sending", 100)).toBe("ruins");
  });
  it("is capped at the last leg", () => {
    expect(leg("preparing", 1_000_000)).toBe("ruins");
  });
});

describe("legFor, bad numbers", () => {
  it("treats NaN and negative elapsed as 0", () => {
    for (const elapsedMs of [Number.NaN, -5, Number.NEGATIVE_INFINITY]) {
      expect(legFor({ hasImage: true, status: "preparing", elapsedMs, minMs: MIN })).toBe("forest");
    }
  });
});

describe("revealWaitMs", () => {
  it("waits the remaining time", () => {
    expect(revealWaitMs({ elapsedMs: 1500, minMs: MIN, reducedMotion: false })).toBe(2500);
  });
  it("is 0 once the minimum has passed", () => {
    expect(revealWaitMs({ elapsedMs: 4000, minMs: MIN, reducedMotion: false })).toBe(0);
    expect(revealWaitMs({ elapsedMs: 9000, minMs: MIN, reducedMotion: false })).toBe(0);
  });
  it("is 0 with reduced motion", () => {
    expect(revealWaitMs({ elapsedMs: 0, minMs: MIN, reducedMotion: true })).toBe(0);
  });
  it("treats bad numbers as 0", () => {
    expect(revealWaitMs({ elapsedMs: Number.NaN, minMs: MIN, reducedMotion: false })).toBe(MIN);
    expect(revealWaitMs({ elapsedMs: 0, minMs: Number.NaN, reducedMotion: false })).toBe(0);
    expect(revealWaitMs({ elapsedMs: -10, minMs: MIN, reducedMotion: false })).toBe(MIN);
  });
});
