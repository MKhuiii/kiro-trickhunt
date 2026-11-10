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
];
