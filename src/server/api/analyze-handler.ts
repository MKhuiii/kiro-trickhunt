/**
 * POST /api/analyze handler factory (REQ-API-01, 03, 04, 05, 14, 15, 26, 28 to 30, 37, 39, 40;
 * REQ-LREP-03, 13 to 18).
 *
 * Flow order is fixed: rate limit, content type, declared size, bounded read,
 * JSON parse, schema validation (the last four live in readAnalyzeRequest),
 * budget acquisition, pipeline run, response. The first failing step ends the
 * request. The returned function never throws or rejects.
 *
 * Nothing the user sends is logged, stored or echoed: the caught values of
 * failing dependencies are discarded.
 */
import type { LlmClient } from "../../analyzers/llm-client";
import type { ReputationChecker } from "../../analyzers/reputation-checker";
import type { Pipeline, PipelineOptions } from "../../pipeline";
import { errorResponse, jsonResponse } from "./analyze-response";
import { readAnalyzeRequest } from "./analyze-request";
import { createLazyLlmClient } from "./lazy-llm-client";
import type { LazyLlmClient } from "./lazy-llm-client";
import type { LlmBudget } from "./llm-budget";
import type { AnalyzeLogEvent, LogSemanticMode, LogStatus } from "./log-event";
import { extractClientKey } from "./rate-limiter";
import type { RateLimiter } from "./rate-limiter";
import { createReputationGate } from "./reputation-gate";
import type { ReputationBudget, ReputationGate } from "./reputation-gate";
import { deriveReputationMode } from "./reputation-mode";
import type { LogReputationMode, ReputationMode } from "./reputation-mode";

export interface AnalyzeHandlerDeps {
  getLlmClient(): LlmClient | null;
  createPipeline(options: PipelineOptions): Pipeline;
  rateLimiter: RateLimiter;
  llmBudget: LlmBudget;
  /** Optional link reputation lookup. Absent when the feature is not configured. */
  reputation?: {
    /** Returns null when not configured. Called at most once per request. */
    createChecker(gate: () => boolean): ReputationChecker | null;
    budget: ReputationBudget;
  };
  /** Epoch ms, used for duration only. */
  now(): number;
  logEvent(event: AnalyzeLogEvent): void;
}

const LOG_STATUSES: ReadonlySet<number> = new Set([200, 400, 413, 415, 429, 500]);

function deriveMode(lazy: LazyLlmClient | null): LogSemanticMode {
  if (lazy === null) return "not-configured";
  try {
    return lazy.outcome();
  } catch {
    return "skipped";
  }
}

export function createAnalyzeHandler(
  deps: AnalyzeHandlerDeps,
): (req: Request) => Promise<Response> {
  function safeNow(): number {
    try {
      const value = deps.now();
      return Number.isFinite(value) ? value : 0;
    } catch {
      return 0;
    }
  }

  return async function handle(req: Request): Promise<Response> {
    const startedAt = safeNow();
    let mode: LogSemanticMode = "none";
    let logReputationMode: LogReputationMode = "none";
    let response: Response;

    try {
      const decision = deps.rateLimiter.check(extractClientKey(req.headers));
      if (!decision.allowed) {
        response = errorResponse("rate-limited", decision.retryAfterSec);
      } else {
        const parsed = await readAnalyzeRequest(req);
        if (!parsed.ok) {
          response = errorResponse(parsed.code);
        } else {
          const real = deps.getLlmClient();
          const lazy: LazyLlmClient | null =
            real === null || real === undefined
              ? null
              : createLazyLlmClient(real, deps.llmBudget);
          const llmClient = lazy === null ? null : lazy.client;

          // The gate and checker exist only with consent (REQ-LREP-13, 17).
          const checkLinks = parsed.input.checkLinks === true;
          let gate: ReputationGate | null = null;
          let checker: ReputationChecker | null = null;
          if (checkLinks && deps.reputation) {
            try {
              gate = createReputationGate(deps.reputation.budget);
              checker = deps.reputation.createChecker(gate.gate) ?? null;
            } catch {
              checker = null;
            }
          }

          const options: PipelineOptions = {
            llmClient,
            ...(parsed.input.locale !== undefined
              ? { locale: parsed.input.locale }
              : {}),
            ...(checker !== null ? { reputationChecker: checker } : {}),
          };
          // Locale is not part of the pipeline input.
          const input: { text?: string; urls?: string[] } = {};
          if (parsed.input.text !== undefined) input.text = parsed.input.text;
          if (parsed.input.urls !== undefined) input.urls = parsed.input.urls;

          try {
            const pipeline = deps.createPipeline(options);
            const verdict = await pipeline.run(input);
            // Derived after the run: budget is acquired at call time.
            mode = deriveMode(lazy);
            let reputationMode: ReputationMode;
            try {
              reputationMode = deriveReputationMode({
                checkLinks,
                configured: checker !== null,
                gate: gate === null ? "skipped" : gate.outcome(),
                urlsAnalyzed: verdict.urlsAnalyzed,
                reputation: verdict.reputation,
              });
            } catch {
              reputationMode = "failed";
            }
            logReputationMode = reputationMode;
            response = jsonResponse(
              { verdict, meta: { semanticMode: mode, reputationMode } },
              200,
            );
          } finally {
            // Also covers a throwing run: log the true mode.
            mode = deriveMode(lazy);
          }
        }
      }
    } catch {
      // Caught value is discarded on purpose: it may contain user content.
      response = errorResponse("internal-error");
      logReputationMode = "none";
    }

    try {
      const status = LOG_STATUSES.has(response.status)
        ? (response.status as LogStatus)
        : 500;
      const elapsed = safeNow() - startedAt;
      deps.logEvent({
        event: "analyze",
        status,
        durationMs: Number.isFinite(elapsed) ? Math.max(0, Math.floor(elapsed)) : 0,
        semanticMode: mode,
        reputationMode: status === 200 ? logReputationMode : "none",
      });
    } catch {
      // A failing logger must not change the response (REQ-API-39).
    }

    return response;
  };
}
