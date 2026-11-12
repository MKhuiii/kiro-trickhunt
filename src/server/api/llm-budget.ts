/**
 * In-memory LLM call budget with per-minute and per-day sliding windows.
 *
 * Per server instance and best effort on serverless platforms: each warm
 * instance has its own counters and a cold start resets them (REQ-API-32).
 * Stores only timestamps, never request content.
 */

import { LLM_DAY_WINDOW_MS, LLM_MINUTE_WINDOW_MS } from "./api-limits.config";

export interface LlmBudget {
  tryAcquire(): boolean;
}

export function createLlmBudget(options: {
  readonly callsPerMinute: number;
  readonly callsPerDay: number;
  readonly now: () => number;
}): LlmBudget {
  const { callsPerMinute, callsPerDay, now } = options;
  // Timestamps of successful acquisitions, oldest first. Size is bounded by
  // callsPerDay because a denied attempt is never recorded (REQ-API-27).
  let acquired: number[] = [];

  return {
    tryAcquire(): boolean {
      const t = now();

      // Prune entries outside the 24-hour window. A timestamp greater than
      // `t` (clock stepped backwards) counts as inside the window.
      const dayStart = t - LLM_DAY_WINDOW_MS;
      if (acquired.length > 0 && acquired.some((ts) => ts <= dayStart)) {
        acquired = acquired.filter((ts) => ts > dayStart);
      }

      if (acquired.length >= callsPerDay) return false;

      const minuteStart = t - LLM_MINUTE_WINDOW_MS;
      let minuteCount = 0;
      for (const ts of acquired) {
        if (ts > minuteStart) minuteCount += 1;
      }
      if (minuteCount >= callsPerMinute) return false;

      acquired.push(t);
      return true;
    },
  };
}
