/**
 * Best-effort in-memory sliding-window rate limiter and client key extraction.
 * Per instance: state resets on cold start. No timers; cleanup runs lazily
 * inside `check`. The client key lives only in limiter memory (REQ-API-25).
 */

import {
  CLEANUP_INTERVAL_MS,
  MAX_KEY_CHARS,
  MAX_TRACKED_KEYS,
  RATE_WINDOW_MS,
} from "./api-limits.config";

export interface RateLimitResult {
  readonly allowed: boolean;
  /** 0 when allowed, otherwise an integer >= 1. */
  readonly retryAfterSec: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

export interface RateLimiterOptions {
  readonly limit: number;
  readonly now: () => number;
  readonly windowMs?: number;
  readonly maxKeys?: number;
  readonly cleanupIntervalMs?: number;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const limit = options.limit;
  const now = options.now;
  const windowMs = options.windowMs ?? RATE_WINDOW_MS;
  const maxKeys = Math.max(1, options.maxKeys ?? MAX_TRACKED_KEYS);
  const cleanupIntervalMs = options.cleanupIntervalMs ?? CLEANUP_INTERVAL_MS;
  const maxRetrySec = Math.max(1, Math.ceil(windowMs / 1000));

  // Timestamps per key, oldest first. Map insertion order equals recency.
  const hits = new Map<string, number[]>();
  let lastCleanup: number | undefined;

  function sweep(t: number): void {
    for (const [key, stamps] of hits) {
      const newest = stamps[stamps.length - 1];
      if (newest === undefined || newest <= t - windowMs) {
        hits.delete(key);
      }
    }
  }

  return {
    check(key: string): RateLimitResult {
      const t = now();

      if (lastCleanup === undefined) {
        lastCleanup = t;
      } else if (t - lastCleanup >= cleanupIntervalMs) {
        sweep(t);
        lastCleanup = t;
      }

      // Timestamps greater than `t` (clock stepped back) stay inside the window.
      const existing = hits.get(key);
      const stamps = (existing ?? []).filter((s) => s > t - windowMs);

      if (stamps.length < limit) {
        stamps.push(t);
        if (existing !== undefined) {
          hits.delete(key);
        } else if (hits.size >= maxKeys) {
          const oldestKey = hits.keys().next();
          if (!oldestKey.done) hits.delete(oldestKey.value);
        }
        hits.set(key, stamps);
        return { allowed: true, retryAfterSec: 0 };
      }

      // Denied: not recorded. Refresh recency so an active abuser is not evicted.
      if (existing !== undefined) {
        hits.delete(key);
        hits.set(key, stamps);
      }
      const oldest = stamps[0];
      const waitMs = oldest === undefined ? windowMs : oldest + windowMs - t;
      const retryAfterSec = Math.min(
        maxRetrySec,
        Math.max(1, Math.ceil(waitMs / 1000)),
      );
      return { allowed: false, retryAfterSec };
    },
  };
}

/**
 * First `x-forwarded-for` entry, trimmed and capped. Missing, blank or
 * unreadable header gives "unknown". Never throws.
 */
export function extractClientKey(headers: Headers): string {
  try {
    const raw = headers.get("x-forwarded-for");
    if (typeof raw !== "string") return "unknown";
    const first = raw.split(",")[0] ?? "";
    const key = first.trim().slice(0, MAX_KEY_CHARS).trim();
    return key.length > 0 ? key : "unknown";
  } catch {
    return "unknown";
  }
}
