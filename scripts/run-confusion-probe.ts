/**
 * Confusion probe: run the synthetic confusion set (`MC_SAMPLES`) through the
 * real pipeline with the real LLM client and print expected vs observed
 * monster and the signal ids. Needs LLM_* in .env.local.
 *
 *   npx tsx --env-file=.env.local scripts/run-confusion-probe.ts
 *
 * Only the synthetic messages are sent. Raw LLM responses are never printed.
 */

import { createPipeline } from "../src/pipeline";
import { createLlmClient } from "../src/server/llm/create-llm-client";
import { MC_SAMPLES } from "../src/pipeline/eval/monster-confusion-samples";

const DELAY_MS = 1500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const client = createLlmClient(process.env, fetch);
  if (client === null) {
    console.error("No LLM client could be built. Check LLM_* in .env.local.");
    process.exit(1);
  }
  const rows: Array<Record<string, string | number>> = [];
  let match = 0;
  for (const s of MC_SAMPLES) {
    const pipeline = createPipeline({ llmClient: client, locale: s.locale });
    const v = await pipeline.run({ text: s.text });
    const want = s.expectedMonster;
    const ok =
      want === null
        ? (v.level === "no_signals" || v.level === "suspicious") &&
          (v.monster === null || v.monster === "generic")
        : v.monster === want;
    if (ok) match++;
    rows.push({
      id: s.id,
      want: String(want),
      got: String(v.monster),
      level: v.level,
      score: v.riskScore,
      ok: ok ? "ok" : "CHECK",
      semantic: v.signals
        .filter((x) => x.id.startsWith("semantic."))
        .map((x) => x.id.replace("semantic.", ""))
        .join(","),
    });
    await sleep(DELAY_MS);
  }
  console.table(rows);
  console.log(`Matched ${match} of ${MC_SAMPLES.length}`);
}

void main();
