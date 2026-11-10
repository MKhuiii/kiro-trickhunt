/**
 * rules.config.ts — Combination rules that can only raise the aggregate.
 *
 * An id ending in ".*" matches any signal id with that prefix ("url.*").
 * A rule fires when every `allOf` group has at least one match.
 */

export type RuleLevel = "suspicious" | "high" | "critical";

export interface CombinationRule {
  readonly id: string;
  /** Each inner array is an any-of group; all groups must match. */
  readonly allOf: readonly (readonly string[])[];
  readonly minLevel: RuleLevel;
}

/** Lowest score of each level; mirrors the aggregator thresholds. */
export const MIN_SCORE_BY_LEVEL: Readonly<Record<RuleLevel, number>> = {
  suspicious: 1,
  high: 50,
  critical: 80,
};

export const COMBINATION_RULES: readonly CombinationRule[] = [
  {
    id: "otp-urgent-impersonation",
    allOf: [
      ["text.otp-request"],
      ["text.urgency", "text.threat"],
      [
        "text.authority-impersonation",
        "url.credential-keywords",
        "url.brand-lookalike",
      ],
    ],
    minLevel: "critical",
  },
  {
    id: "sensitive-data-with-link",
    allOf: [["text.sensitive-data-request"], ["url.*"]],
    minLevel: "high",
  },
];
