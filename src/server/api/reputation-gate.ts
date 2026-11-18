/**
 * Per-request, memoized gate over the reputation budget (design D10).
 *
 * The first call acquires the budget, later calls return the same answer, so
 * the budget is acquired at most once per request (REQ-LREP-16). It is never
 * acquired unless the checker calls the gate (REQ-LREP-17). A throwing budget
 * counts as a denial (REQ-LREP-14). Stores no request content.
 */

/** Same shape as `LlmBudget`; `createLlmBudget` is reused as the implementation. */
export interface ReputationBudget {
  tryAcquire(): boolean;
}

export type GateOutcome = "used" | "denied" | "skipped";

export interface ReputationGate {
  /** First call acquires, later calls return the same answer. Never throws. */
  readonly gate: () => boolean;
  /** `"skipped"` when `gate` was never called. */
  outcome(): GateOutcome;
}

export function createReputationGate(budget: ReputationBudget): ReputationGate {
  let answer: boolean | null = null;

  const gate = (): boolean => {
    if (answer === null) {
      try {
        answer = budget.tryAcquire() === true;
      } catch {
        answer = false;
      }
    }
    return answer;
  };

  return {
    gate,
    outcome(): GateOutcome {
      if (answer === null) return "skipped";
      return answer ? "used" : "denied";
    },
  };
}
