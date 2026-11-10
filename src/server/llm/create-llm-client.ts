import type { LlmClient } from "../../analyzers/llm-client";
import { readLlmConfig } from "./llm-config";
import { createOpenAiCompatibleClient } from "./openai-compatible-client";

/**
 * Builds an LlmClient from an env object, or returns null (rules-only mode)
 * when configuration is missing or invalid. Never throws, never reads
 * process.env and never calls `fetchImpl` itself (REQ-LLM-17 to REQ-LLM-19).
 */
export function createLlmClient(
  env: Readonly<Record<string, string | undefined>>,
  fetchImpl: typeof fetch,
): LlmClient | null {
  try {
    const config = readLlmConfig(env);
    if (config === null) return null;
    return createOpenAiCompatibleClient(config, fetchImpl);
  } catch {
    return null;
  }
}
