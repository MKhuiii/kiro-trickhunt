/**
 * monsters.config.ts — Monster definitions and selection settings.
 *
 * A monster's total is the sum of weights over distinct signal ids present.
 * There is no entry for "generic"; it is the fallback (see GENERIC).
 */

export type SpecificMonsterId = "bank" | "prize" | "job-bait" | "authority";

export interface MonsterDef {
  readonly id: SpecificMonsterId;
  /** Signal id to weight. */
  readonly weights: Readonly<Record<string, number>>;
}

export const MONSTERS: readonly MonsterDef[] = [
  {
    id: "bank",
    weights: {
      "text.otp-request": 1,
      "text.sensitive-data-request": 2,
      "url.brand-lookalike": 2,
      "url.credential-keywords": 1,
      "semantic.impersonation-tone": 1,
      "text.threat": 1,
      "text.financial-institution": 1,
    },
  },
  {
    id: "prize",
    weights: {
      "text.prize-reward": 3,
      "semantic.too-good-to-be-true": 1,
      "text.payment-request": 1,
    },
  },
  {
    id: "job-bait",
    weights: {
      "semantic.relationship-or-job-bait": 1,
      "text.job-offer": 1,
      "text.off-platform": 1,
      "semantic.isolation-secrecy": 1,
      "semantic.too-good-to-be-true": 1,
      "text.payment-request": 1,
    },
  },
  {
    id: "authority",
    weights: {
      "text.authority-impersonation": 1,
      "text.threat": 1,
      "semantic.pressure-escalation": 1,
      "text.off-platform": 1,
      "semantic.impersonation-tone": 1,
      "text.payment-request": 1,
    },
  },
];

/** Tie-break order when totals are equal. */
export const MONSTER_ORDER: readonly SpecificMonsterId[] = [
  "bank",
  "prize",
  "job-bait",
  "authority",
];

/** Minimum total for a specific monster to be chosen. */
export const MONSTER_THRESHOLD = 2;

/** Used when the level is not `no_signals` but no monster reaches threshold. */
export const GENERIC = "generic" as const;
