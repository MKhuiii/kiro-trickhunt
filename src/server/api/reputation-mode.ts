/**
 * Reputation mode of one request (REQ-LREP-15). Pure and total.
 * Carries no request content: the result is one of a closed set of strings.
 */
import type { Verdict } from "../../pipeline";
import type { GateOutcome } from "./reputation-gate";

export type ReputationMode =
  | "checked"
  | "not-requested"
  | "not-configured"
  | "budget-exhausted"
  | "skipped"
  | "failed";

export type LogReputationMode = ReputationMode | "none";

export function deriveReputationMode(input: {
  readonly checkLinks: boolean;
  readonly configured: boolean;
  readonly gate: GateOutcome;
  readonly urlsAnalyzed: number;
  readonly reputation: Verdict["reputation"];
}): ReputationMode {
  if (input.checkLinks !== true) return "not-requested";
  if (!input.configured) return "not-configured";
  if (input.gate === "denied") return "budget-exhausted";
  if (
    input.urlsAnalyzed === 0 ||
    (input.reputation.status === "ok" && input.reputation.checkedCount === 0)
  ) {
    return "skipped";
  }
  if (input.reputation.status === "degraded") return "failed";
  return "checked";
}
