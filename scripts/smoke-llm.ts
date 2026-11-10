/**
 * Manual smoke test for the LLM provider adapter (REQ-LLM-22, REQ-LLM-23).
 *
 * Run: npx tsx --env-file=.env scripts/smoke-llm.ts
 *
 * Makes at most one real request. Prints only status, reason and signal ids.
 * Never prints the sample text, evidence, raw response, key or error messages.
 */

import { createLlmClient } from "../src/server/llm/create-llm-client";
import { analyzeSemantic } from "../src/analyzers/semantic-analyzer";

const SAMPLE_TEXT =
  "Your account has been locked. Act now and confirm your details at the link below.";

async function main(): Promise<void> {
  const client = createLlmClient(process.env, fetch);
  if (client === null) {
    console.log("rules-only (no LLM configured)");
    return;
  }

  const result = await analyzeSemantic(SAMPLE_TEXT, client);
  console.log(`status: ${result.status}`);
  if (result.reason !== undefined) console.log(`reason: ${result.reason}`);
  console.log(
    `signals: ${result.signals.length === 0 ? "(none)" : result.signals.map((s) => s.id).join(", ")}`,
  );
}

main().catch(() => {
  console.log("status: degraded");
  console.log("reason: client-error");
});
