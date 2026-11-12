/**
 * Lazy LLM client: acquires one budget unit per real call, at call time.
 *
 * Denial (or a throwing budget) throws LlmClientError("network") without
 * reaching the real client. `SemanticAnalyzer` catches every client error and
 * degrades, so the pipeline run never rejects. Holds no request content.
 */
import type { LlmClient } from "../../analyzers/llm-client";
import { LlmClientError } from "../llm";
import type { LlmBudget } from "./llm-budget";

export type LazyOutcome = "used" | "budget-exhausted" | "skipped";

export interface LazyLlmClient {
  readonly client: LlmClient;
  outcome(): LazyOutcome;
}

export function createLazyLlmClient(
  real: LlmClient,
  budget: LlmBudget,
): LazyLlmClient {
  let denied = false;
  let called = false;

  const client: LlmClient = {
    complete(request) {
      let ok = false;
      try {
        ok = budget.tryAcquire() === true;
      } catch {
        ok = false;
      }
      if (!ok) {
        denied = true;
        throw new LlmClientError("network");
      }
      // Set before the real call so a throwing real client still counts.
      called = true;
      return real.complete(request);
    },
  };

  return {
    client,
    outcome: () => (denied ? "budget-exhausted" : called ? "used" : "skipped"),
  };
}
