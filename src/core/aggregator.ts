/**
 * aggregator.ts — Noisy-or score aggregation and risk level mapping
 *
 * Pure TypeScript module. No framework, browser, or Node.js imports.
 */

import type { Signal } from "./signal";

/**
 * Human-readable risk level derived from the aggregated score.
 *
 * Score → level mapping (REQ-AGG §2.3):
 *   score = 0 AND signals list is empty → "no_signals"
 *   1 – 49                              → "suspicious"
 *   50 – 79                             → "high"
 *   80 – 100                            → "critical"
 */
export type RiskLevel = "no_signals" | "suspicious" | "high" | "critical";

/**
 * The result returned by the aggregator after processing a list of signals.
 *
 * - score   Integer in [0, 100] computed via noisy-or (REQ-AGG-02)
 * - level   Human-readable bucket derived from score (REQ-AGG §2.3)
 * - signals The original input list, unchanged (REQ-AGG-05)
 */
export interface AggregationResult {
  readonly score: number;
  readonly level: RiskLevel;
  readonly signals: readonly Signal[];
}

/**
 * Maps a numeric score and signal list to a RiskLevel.
 *
 * Mapping (REQ-AGG §2.3):
 *   score = 0 AND signals is empty → "no_signals"
 *   1 – 49                         → "suspicious"
 *   50 – 79                        → "high"
 *   80 – 100                       → "critical"
 */
function scoreToLevel(score: number, signals: readonly Signal[]): RiskLevel {
  if (score === 0 && signals.length === 0) return "no_signals";
  if (score <= 49) return "suspicious";
  if (score <= 79) return "high";
  return "critical";
}

/**
 * Combines a list of Signal objects into a single AggregationResult using
 * the noisy-or formula, then maps the score to a RiskLevel.
 *
 * Formula (REQ-AGG-02):
 *   p_survive = signals.reduce((acc, s) => acc * (1 − s.severity), 1)
 *   score     = Math.round((1 − p_survive) * 100)
 *
 * Properties:
 *   - aggregate([]) returns { score: 0, level: "no_signals", signals: [] }  (REQ-AGG-01)
 *   - score is always an integer in [0, 100]                                 (REQ-AGG-02)
 *   - adding a signal with severity > 0 never decreases the score            (REQ-AGG-03)
 *   - a single signal with severity = 1 yields score = 100, level = "critical" (REQ-AGG-04)
 *   - returned signals list is the original input, unchanged                 (REQ-AGG-05)
 *   - pure function: no side effects, no global state                        (REQ-AGG-06)
 */
export function aggregate(signals: readonly Signal[]): AggregationResult {
  const pSurvive = signals.reduce((acc, s) => acc * (1 - s.severity), 1);
  const score = Math.round((1 - pSurvive) * 100);
  const level = scoreToLevel(score, signals);

  return Object.freeze({ score, level, signals });
}
