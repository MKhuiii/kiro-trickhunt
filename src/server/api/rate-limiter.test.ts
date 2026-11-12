import { describe, expect, it } from "vitest";

import { MAX_KEY_CHARS, RATE_WINDOW_MS } from "./api-limits.config";
import { createRateLimiter, extractClientKey } from "./rate-limiter";

function fakeClock(start = 1_000_000) {
  let t = start;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

describe("createRateLimiter", () => {
  it("allows up to the limit and denies limit+1 with retryAfterSec >= 1", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 3, now: clock.now });

    for (let i = 0; i < 3; i++) {
      expect(limiter.check("a")).toEqual({ allowed: true, retryAfterSec: 0 });
    }
    const denied = limiter.check("a");
    expect(denied.allowed).toBe(false);
    expect(Number.isInteger(denied.retryAfterSec)).toBe(true);
    expect(denied.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  it("reports retryAfterSec of at least 1 even just before the window ends", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 1, now: clock.now });
    limiter.check("a");
    clock.advance(RATE_WINDOW_MS - 1);
    const denied = limiter.check("a");
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSec).toBe(1);
  });

  it("allows again after the window passes", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 2, now: clock.now });
    limiter.check("a");
    limiter.check("a");
    expect(limiter.check("a").allowed).toBe(false);

    clock.advance(RATE_WINDOW_MS);
    expect(limiter.check("a")).toEqual({ allowed: true, retryAfterSec: 0 });
  });

  it("does not record denied checks", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 1, now: clock.now });
    limiter.check("a");
    clock.advance(30_000);
    limiter.check("a"); // denied
    limiter.check("a"); // denied
    // The first hit expires at +60s; denied hits must not extend the block.
    clock.advance(30_000);
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 1, now: clock.now });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(false);
  });

  it("evicts the least recently seen key when the bound is reached", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 1, now: clock.now, maxKeys: 2 });
    limiter.check("a");
    limiter.check("b");
    limiter.check("c"); // evicts "a"

    // "a" was forgotten, so it is allowed again; "c" is still tracked.
    expect(limiter.check("c").allowed).toBe(false);
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("keeps a recently seen key when evicting", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({ limit: 2, now: clock.now, maxKeys: 2 });
    limiter.check("a");
    limiter.check("b");
    limiter.check("a"); // "a" is now most recent
    limiter.check("c"); // evicts "b"

    expect(limiter.check("a").allowed).toBe(false); // still tracked, at limit
    expect(limiter.check("b").allowed).toBe(true); // forgotten
  });

  it("cleanup removes idle keys without being asked about them", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({
      limit: 1,
      now: clock.now,
      maxKeys: 2,
      cleanupIntervalMs: 1000,
    });
    limiter.check("a");
    limiter.check("b");

    clock.advance(RATE_WINDOW_MS + 1000);
    // This check sweeps the idle keys "a" and "b" and then adds "c".
    limiter.check("c");
    // With "a" and "b" swept there is room for "d" without evicting "c".
    limiter.check("d");
    expect(limiter.check("c").allowed).toBe(false);
  });

  it("does not sweep before the cleanup interval elapses", () => {
    const clock = fakeClock();
    const limiter = createRateLimiter({
      limit: 1,
      now: clock.now,
      maxKeys: 2,
      cleanupIntervalMs: 10 * RATE_WINDOW_MS,
    });
    limiter.check("a");
    limiter.check("b");

    clock.advance(RATE_WINDOW_MS + 1000);
    // No sweep, so "a" and "b" are still stored and "c" evicts "a".
    limiter.check("c");
    limiter.check("d"); // evicts "b", so "c" and "d" remain
    expect(limiter.check("c").allowed).toBe(false);
    expect(limiter.check("d").allowed).toBe(false);
  });
});

describe("extractClientKey", () => {
  it("returns unknown when the header is missing", () => {
    expect(extractClientKey(new Headers())).toBe("unknown");
  });

  it("returns unknown when the header is blank", () => {
    expect(extractClientKey(new Headers({ "x-forwarded-for": "   " }))).toBe(
      "unknown",
    );
    expect(extractClientKey(new Headers({ "x-forwarded-for": " , 1.2.3.4" }))).toBe(
      "unknown",
    );
  });

  it("takes the first entry of a multi-entry header, trimmed", () => {
    const headers = new Headers({
      "x-forwarded-for": "  203.0.113.7 , 10.0.0.1, 10.0.0.2",
    });
    expect(extractClientKey(headers)).toBe("203.0.113.7");
  });

  it("caps long keys at MAX_KEY_CHARS", () => {
    const headers = new Headers({ "x-forwarded-for": "x".repeat(500) });
    expect(extractClientKey(headers)).toBe("x".repeat(MAX_KEY_CHARS));
  });

  it("never throws when reading the header fails", () => {
    const broken = {
      get: () => {
        throw new Error("boom");
      },
    } as unknown as Headers;
    expect(extractClientKey(broken)).toBe("unknown");
  });
});
