/**
 * Composition root for POST /api/analyze (REQ-API-02, REQ-API-06).
 *
 * Wires the real dependencies into the handler factory. The LLM client is
 * created once per call (the route calls this once per warm instance), so the
 * rate limiter and budget live as long as the instance.
 */
import { createPipeline } from "../../pipeline";
import { createLlmClient } from "../llm";
import { createAnalyzeHandler } from "./analyze-handler";
import { readApiConfig } from "./api-config";
import { createLlmBudget } from "./llm-budget";
import { defaultLogEvent } from "./log-event";
import { createRateLimiter } from "./rate-limiter";

export function createDefaultAnalyzeHandler(): (req: Request) => Promise<Response> {
  const config = readApiConfig();
  const now = (): number => Date.now();
  const client = createLlmClient(process.env, fetch);

  return createAnalyzeHandler({
    getLlmClient: () => client,
    createPipeline,
    rateLimiter: createRateLimiter({ limit: config.ratePerMinute, now }),
    llmBudget: createLlmBudget({
      callsPerMinute: config.llmCallsPerMinute,
      callsPerDay: config.llmCallsPerDay,
      now,
    }),
    now,
    logEvent: defaultLogEvent,
  });
}
