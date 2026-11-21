/**
 * overlap.config.ts — Groups of signals that describe the same warning sign.
 *
 * Only the strongest signal per group is used for scoring (REQ-PIPE-23).
 * A signal id MUST appear in at most one group (REQ-PIPE-22).
 */

export const OVERLAP_GROUPS: readonly (readonly string[])[] = [
  ["text.authority-impersonation", "semantic.impersonation-tone"],
  ["text.urgency", "semantic.pressure-escalation"],
  ["text.prize-reward", "semantic.too-good-to-be-true"],
  ["text.off-platform", "semantic.isolation-secrecy"],
  ["text.job-offer", "semantic.relationship-or-job-bait"],
  // monster-disambiguation-v1: each new type is its own group (rule and AI
  // signal for the same evidence count once). Kept apart from the groups
  // above so that the type signal and the older trust or reward signal count
  // as two different warning signs: this is what lets a specific monster pass
  // the two-group gate at `suspicious` (REQ-PIPE-67).
  ["text.investment-pitch", "semantic.investment-scheme"],
  ["text.romance-bait", "semantic.romance-money-story"],
];
