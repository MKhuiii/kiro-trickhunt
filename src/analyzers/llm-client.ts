/**
 * LLM client contract (types only).
 *
 * Provider adapters (API keys, HTTP) live in `src/server/llm/` and only
 * implement this interface. Nothing provider-specific belongs here.
 */

export interface LlmRequest {
  readonly system: string;
  readonly user: string;
  readonly signal?: AbortSignal;
}

export interface LlmClient {
  complete(request: LlmRequest): Promise<string>;
}
