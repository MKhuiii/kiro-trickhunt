/**
 * rate-limiter.property.test.ts — Property-based tests for the rate limiter
 * and client key extraction.
 *
 * Feature: analyze-api, Property 3: Rate limiter window and bounds (PBT-40)
 * Feature: analyze-api, Property 5: Client key bounded and total (PBT-42)
 * **Validates: Requirements REQ-API-20, REQ-API-21, REQ-API-22, REQ-API-24**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createRateLimiter, extractClientKey } from "./rate-limiter";
import { MAX_KEY_CHARS, RATE_WINDOW_MS } from "./api-limits.config";

const NUM_RUNS = 100;

describe("Feature: analyze-api, Property 3: Rate limiter window and bounds", () => {
  it("allows at most `limit` per key in any window and denies with a positive integer retryAfterSec", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.array(
          fc.record({
            key: fc.constantFrom("a", "b", "c", "d"),
            delta: fc.integer({ min: 0, max: 30_000 }),
          }),
          { maxLength: 60 },
        ),
        (limit, steps) => {
          let clock = 1_000_000;
          const limiter = createRateLimiter({
            limit,
            now: () => clock,
            maxKeys: 100,
          });
          const allowedAt = new Map<string, number[]>();

          for (const step of steps) {
            clock += step.delta;
            const result = limiter.check(step.key);
            const times = allowedAt.get(step.key) ?? [];
            const inWindow = times.filter((s) => s > clock - RATE_WINDOW_MS);

            if (result.allowed) {
              expect(inWindow.length).toBeLessThan(limit);
              expect(result.retryAfterSec).toBe(0);
              times.push(clock);
              allowedAt.set(step.key, times);
            } else {
              // Denied only when the window is actually full.
              expect(inWindow.length).toBeGreaterThanOrEqual(limit);
              expect(Number.isInteger(result.retryAfterSec)).toBe(true);
              expect(result.retryAfterSec).toBeGreaterThanOrEqual(1);
              expect(result.retryAfterSec).toBeLessThanOrEqual(
                Math.ceil(RATE_WINDOW_MS / 1000),
              );
            }
          }

          // No 60 s window holds more than `limit` allowed checks.
          for (const times of allowedAt.values()) {
            for (const t of times) {
              const count = times.filter(
                (s) => s > t - RATE_WINDOW_MS && s <= t,
              ).length;
              expect(count).toBeLessThanOrEqual(limit);
            }
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("never tracks more than maxKeys keys (oldest evicted, newest kept)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 8 }),
        fc.integer({ min: 1, max: 30 }),
        (maxKeys, extra) => {
          const total = maxKeys + extra;
          const limiter = createRateLimiter({
            limit: 1,
            now: () => 5_000,
            maxKeys,
          });
          for (let i = 0; i < total; i++) {
            expect(limiter.check(`k${i}`).allowed).toBe(true);
          }
          // The newest key is still tracked, so it is denied.
          expect(limiter.check(`k${total - 1}`).allowed).toBe(false);
          // The oldest key was evicted, so it starts fresh.
          expect(limiter.check("k0").allowed).toBe(true);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

describe("Feature: analyze-api, Property 5: Client key bounded and total", () => {
  const valueArb = fc.oneof(
    fc.string(),
    fc.string({ unit: "binary" }),
    fc.string({ minLength: MAX_KEY_CHARS, maxLength: 500 }),
    fc.constantFrom("", " ", "   ", ",", " , ", ",1.2.3.4"),
    fc
      .array(fc.string(), { maxLength: 5 })
      .map((parts) => parts.join(",")),
  );

  it("never throws and returns a non-empty key of at most MAX_KEY_CHARS characters", () => {
    fc.assert(
      fc.property(valueArb, (value) => {
        let key = "";
        try {
          const headers = new Headers();
          headers.set("x-forwarded-for", value);
          key = extractClientKey(headers);
        } catch (e) {
          // Headers.set may reject invalid values; that is not the unit under test.
          if (!(e instanceof TypeError)) throw e;
          key = extractClientKey(new Headers());
        }
        expect(typeof key).toBe("string");
        expect(key.length).toBeGreaterThan(0);
        expect(key.length).toBeLessThanOrEqual(MAX_KEY_CHARS);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("never throws when the headers object itself misbehaves", () => {
    const throwing = {
      get: () => {
        throw new Error("boom");
      },
    } as unknown as Headers;
    expect(extractClientKey(throwing)).toBe("unknown");
  });
});
