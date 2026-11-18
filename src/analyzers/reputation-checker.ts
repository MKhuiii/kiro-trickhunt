export const REPUTATION_LISTED_SIGNAL_ID = "url.reputation-listed" as const;

export type ReputationCategory =
  | "social-engineering"
  | "malware"
  | "unwanted-software"
  | "other";

export interface ReputationHit {
  /** The input URL as the caller gave it; stays in memory. */
  readonly url: string;
  readonly category: ReputationCategory;
}

export type ReputationDegradedReason =
  | "timeout"
  | "provider-error"
  | "invalid-response"
  | "rate-limited";

export type ReputationResult =
  | {
      readonly status: "ok";
      readonly hits: readonly ReputationHit[];
      readonly checkedCount: number;
      readonly reason?: "too-many-links";
    }
  | { readonly status: "degraded"; readonly reason: ReputationDegradedReason };

export interface ReputationChecker {
  /** Never rejects or throws, for any input (REQ-LREP-19). */
  check(
    urls: readonly string[],
    signal?: AbortSignal,
  ): Promise<ReputationResult>;
}
