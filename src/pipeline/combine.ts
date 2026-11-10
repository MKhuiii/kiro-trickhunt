/**
 * combine.ts — Applies combination rules on top of the aggregate result.
 *
 * Pure function. Rules can only raise the score and level (REQ-PIPE-28..31).
 */

import type { AggregationResult, RiskLevel, Signal } from "../core";

import { COMBINATION_RULES, MIN_SCORE_BY_LEVEL } from "./rules.config";

const LEVEL_RANK: Readonly<Record<RiskLevel, number>> = {
  no_signals: 0,
  suspicious: 1,
  high: 2,
  critical: 3,
};

/** True when `signalId` equals `pattern`, or has the prefix before a trailing ".*". */
function matchesId(pattern: string, signalId: string): boolean {
  if (pattern.endsWith(".*")) {
    return signalId.startsWith(pattern.slice(0, -1));
  }
  return pattern === signalId;
}

/**
 * Applies COMBINATION_RULES to the aggregate result.
 *
 * - A rule fires when every `allOf` group has at least one matching signal.
 * - Final level is the max of the aggregate level and every fired rule level.
 * - Final score is the max of the aggregate score and MIN_SCORE_BY_LEVEL of
 *   the highest fired rule level.
 * - No rule fires on an empty signal list.
 */
export function applyRules(
  aggregateResult: Pick<AggregationResult, "score" | "level">,
  signals: readonly Signal[]
): { score: number; level: RiskLevel } {
  const { score, level } = aggregateResult;
  if (signals.length === 0) return { score, level };

  let highest: "suspicious" | "high" | "critical" | null = null;
  for (const rule of COMBINATION_RULES) {
    const fired = rule.allOf.every((group) =>
      group.some((pattern) => signals.some((s) => matchesId(pattern, s.id)))
    );
    if (fired && (highest === null || LEVEL_RANK[rule.minLevel] > LEVEL_RANK[highest])) {
      highest = rule.minLevel;
    }
  }

  if (highest === null) return { score, level };

  return {
    score: Math.max(score, MIN_SCORE_BY_LEVEL[highest]),
    level: LEVEL_RANK[highest] > LEVEL_RANK[level] ? highest : level,
  };
}
