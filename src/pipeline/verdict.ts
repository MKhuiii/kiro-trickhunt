/**
 * verdict.ts — Types for the analysis pipeline. Types only, no runtime code.
 *
 * There is deliberately no "safe" level, word or flag (REQ-PIPE-02).
 */

import type { RiskLevel, Signal } from "../core";

export type { RiskLevel };

/** Closed set of monsters. `generic` is used when no specific monster fits. */
export type MonsterId = "bank" | "prize" | "job-bait" | "authority" | "generic";

/** Supported message locales (REQ-PIPE-07). */
export type Locale = "en" | "vi";

export type SemanticStatus = "ok" | "unavailable" | "degraded";

export type SemanticReason = "timeout" | "client-error" | "invalid-response";

export type SemanticPolicy = "when-not-critical" | "always";

export interface SemanticOutcome {
  readonly status: SemanticStatus;
  readonly reason?: SemanticReason;
  /** True when the semantic layer was not run by policy or blank text. */
  readonly skipped: boolean;
}

export interface Verdict {
  /** Integer 0..100. */
  readonly riskScore: number;
  readonly level: RiskLevel;
  /** `null` if and only if `level` is `no_signals` (REQ-PIPE-03). */
  readonly monster: MonsterId | null;
  /** All signals, severity descending (REQ-PIPE-24, 27). */
  readonly signals: readonly Signal[];
  readonly actions: readonly string[];
  readonly limitations: readonly string[];
  readonly semantic: SemanticOutcome;
  readonly inputTruncated: boolean;
  readonly urlsAnalyzed: number;
  readonly urlsSkipped: number;
}
