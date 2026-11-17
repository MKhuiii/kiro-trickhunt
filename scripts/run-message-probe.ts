/**
 * Message probe: run the synthetic probe set through the pipeline and write a
 * Markdown report comparing expected and observed monsters.
 *
 * Run (rules-only, no key needed):
 *   npx tsx scripts/run-message-probe.ts --mode rules
 * Run (rules-only and rules+LLM, needs LLM_* in .env.local):
 *   npx tsx --env-file=.env.local scripts/run-message-probe.ts --mode both
 *
 * Modes: rules | llm | both (default both). If no LLM client can be built the
 * script falls back to rules-only and says so in the report.
 *
 * Only the synthetic probe messages are sent to the LLM. The report contains
 * those synthetic messages and verdict fields only, never raw LLM responses.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { createPipeline } from "../src/pipeline";
import type { Locale } from "../src/pipeline";
import type { LlmClient } from "../src/analyzers/llm-client";
import { createLlmClient } from "../src/server/llm/create-llm-client";
import {
  evaluateSample,
  parseSampleSet,
  renderReport,
  reportFileName,
  summarizeRuns,
  toObserved,
} from "../src/pipeline/eval/probe-report";
import type { Observed, ProbeRow, SampleSet } from "../src/pipeline/eval/probe-report";
import {
  PROBE_EVASION_SAMPLES,
  PROBE_HOLDOUT2_SAMPLES,
  PROBE_HOLDOUT_SAMPLES,
  PROBE_SAMPLES,
} from "../src/pipeline/eval/probe-samples";
import type { ProbeSample } from "../src/pipeline/eval/probe-samples";

type Mode = "rules" | "llm" | "both";

const DEFAULT_DELAY_BETWEEN_LLM_CALLS_MS = 1500;
const MAX_LLM_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 4000;

function parseMode(argv: readonly string[]): Mode {
  const i = argv.indexOf("--mode");
  const value = i >= 0 ? argv[i + 1] : undefined;
  if (value === "rules" || value === "llm" || value === "both") return value;
  return "both";
}

function argValue(argv: readonly string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

function pickSamples(set: SampleSet): readonly ProbeSample[] {
  if (set === "holdout") return PROBE_HOLDOUT_SAMPLES;
  if (set === "holdout2") return PROBE_HOLDOUT2_SAMPLES;
  if (set === "evasion") return PROBE_EVASION_SAMPLES;
  if (set === "all") {
    return [
      ...PROBE_SAMPLES,
      ...PROBE_HOLDOUT_SAMPLES,
      ...PROBE_HOLDOUT2_SAMPLES,
      ...PROBE_EVASION_SAMPLES,
    ];
  }
  return PROBE_SAMPLES;
}

function parseRepeat(argv: readonly string[]): number {
  const n = Number(argValue(argv, "--repeat"));
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : 1;
}

function parseDelay(argv: readonly string[]): number {
  const i = argv.indexOf("--delay-ms");
  const n = i >= 0 ? Number(argv[i + 1]) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_DELAY_BETWEEN_LLM_CALLS_MS;
}

function isDegraded(o: Observed | null): boolean {
  return o !== null && !o.semanticSkipped && o.semanticStatus === "degraded";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** `--awareness on|off` overrides the config switch; absent means use config. */
function parseAwareness(argv: readonly string[]): boolean | undefined {
  const v = argValue(argv, "--awareness");
  return v === "on" ? true : v === "off" ? false : undefined;
}

let awarenessOverride: boolean | undefined;

async function observe(
  sample: ProbeSample,
  client: LlmClient | null,
): Promise<Observed> {
  const locale: Locale = sample.locale;
  const pipeline = createPipeline({
    llmClient: client,
    locale,
    ...(awarenessOverride !== undefined ? { awarenessEnabled: awarenessOverride } : {}),
  });
  return toObserved(await pipeline.run({ text: sample.text }));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const delayMs = parseDelay(args);
  const mode = parseMode(args);
  const set = parseSampleSet(argValue(args, "--set"));
  const label = argValue(args, "--label");
  const samples = pickSamples(set);
  const repeat = parseRepeat(args);
  awarenessOverride = parseAwareness(args);
  const wantRules = mode === "rules" || mode === "both";
  const wantLlm = mode === "llm" || mode === "both";

  const client = wantLlm ? createLlmClient(process.env, fetch) : null;
  const llmAvailable = client !== null;
  if (wantLlm && !llmAvailable) {
    console.log("No LLM client configured: running rules-only.");
  }
  // When only the LLM column was asked for but no client exists, still show
  // the rules-only column so the report is not empty.
  const showRules = wantRules || (wantLlm && !llmAvailable);
  const runLlm = wantLlm && llmAvailable;

  const rows: ProbeRow[] = [];
  for (const sample of samples) {
    const rules = showRules ? await observe(sample, null) : null;
    const runs: Observed[] = [];
    if (runLlm) {
      for (let run = 0; run < repeat; run += 1) {
        let llm = await observe(sample, client);
        // A degraded call is usually a provider rate limit or timeout. Retry
        // with a growing pause so one flaky call does not hide the real result.
        for (
          let attempt = 1;
          attempt <= MAX_LLM_RETRIES && isDegraded(llm);
          attempt += 1
        ) {
          await sleep(RETRY_BASE_DELAY_MS * attempt);
          llm = await observe(sample, client);
        }
        runs.push(llm);
        await sleep(delayMs);
      }
    }
    const summary = summarizeRuns(sample, runs);
    rows.push({
      sample,
      rules,
      llm: summary.observed,
      rulesEval: rules ? evaluateSample(sample, rules) : null,
      llmEval: summary.evaluation,
      ...(runs.length > 1 ? { llmRuns: runs } : {}),
    });
  }

  const now = new Date();
  const stamp = now.toISOString().slice(0, 10);
  const report = renderReport({
    rows,
    generatedAt: now.toISOString(),
    llmRequested: wantLlm,
    llmAvailable,
  });

  const outPath = join(
    process.cwd(),
    "docs",
    "probe-reports",
    reportFileName({ date: stamp, set, label }),
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, report, "utf8");

  const count = (pick: (r: ProbeRow) => string | undefined): Record<string, number> => {
    const acc: Record<string, number> = {};
    for (const r of rows) {
      const s = pick(r);
      if (s !== undefined) acc[s] = (acc[s] ?? 0) + 1;
    }
    return acc;
  };
  if (showRules) console.log("rules-only:", count((r) => r.rulesEval?.status));
  if (runLlm) console.log("rules+LLM:", count((r) => r.llmEval?.status));
  console.log(`Report written to ${outPath}`);
}

main().catch(() => {
  console.log("Probe failed unexpectedly.");
  process.exitCode = 1;
});
