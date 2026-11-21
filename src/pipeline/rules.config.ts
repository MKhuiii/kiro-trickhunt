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

/** Severity of the `url.reputation-listed` signal (one listed link scores 75). */
export const REPUTATION_LISTED_SEVERITY = 0.75;

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
  {
    id: "otp-with-context",
    allOf: [
      ["text.otp-request"],
      [
        "text.financial-institution",
        "text.urgency",
        "text.threat",
        "url.*",
      ],
    ],
    minLevel: "critical",
  },
  {
    id: "payment-with-pressure",
    allOf: [
      ["text.payment-request"],
      [
        "text.off-platform",
        "text.urgency",
        "text.threat",
        "text.authority-impersonation",
        "text.prize-reward",
      ],
    ],
    minLevel: "critical",
  },
  {
    id: "authority-with-threat",
    allOf: [["text.authority-impersonation"], ["text.threat"]],
    minLevel: "critical",
  },
  {
    id: "job-offer-with-payment",
    allOf: [["text.job-offer"], ["text.payment-request"]],
    minLevel: "critical",
  },
  {
    id: "job-offer-off-platform",
    allOf: [["text.job-offer"], ["text.off-platform"]],
    minLevel: "high",
  },
  {
    id: "investment-with-payment",
    allOf: [["text.investment-pitch"], ["text.payment-request"]],
    minLevel: "high",
  },
  {
    id: "romance-with-payment",
    allOf: [["text.romance-bait"], ["text.payment-request"]],
    minLevel: "high",
  },
  {
    id: "reputation-listed",
    allOf: [["url.reputation-listed"]],
    minLevel: "high",
  },
];
