/**
 * rules-tuning-v4: `semantic.emotional-manipulation` counts toward job-bait.
 * Uses FakeLlmClient only; no network.
 */
import { describe, expect, it } from "vitest";
import { FakeLlmClient } from "../analyzers/fake-llm-client";
import { EVAL_SAMPLES } from "./eval/samples";
import { createPipeline } from "./pipeline";

const BEN_21 = EVAL_SAMPLES.find((s) => s.id === "b3-ben-21")!.text;

function runMany(ids: readonly string[]) {
  const client = FakeLlmClient.responding(
    JSON.stringify({
      signals: ids.map((id) => ({ id, severity: 0.45, evidence: "video interview" })),
    }),
  );
  return createPipeline({ llmClient: client }).run({ text: BEN_21 });
}

describe("emotional-manipulation and monster choice (rules-tuning-v4)", () => {
  it("alone at the cap gives suspicious and generic", async () => {
    const v = await runMany(["semantic.emotional-manipulation"]);
    expect(v.riskScore).toBe(45);
    expect(v.level).toBe("suspicious");
    expect(v.monster).toBe("generic");
  });

  it("with one other semantic signal stays generic (no monster reaches the threshold)", async () => {
    const v = await runMany([
      "semantic.emotional-manipulation",
      "semantic.pressure-escalation",
    ]);
    expect(v.level).toBe("high");
    expect(v.monster).toBe("generic");
  });

  // monster-disambiguation-v1: `romance` now comes before `job-bait` and
  // `authority` in MONSTER_ORDER, so this three-way tie on shared signals goes
  // to `romance` (it was `job-bait`). Only the expected monster changed.
  it("romance-style combination picks romance over job-bait and authority on a tie", async () => {
    const v = await runMany([
      "semantic.impersonation-tone",
      "semantic.emotional-manipulation",
      "semantic.isolation-secrecy",
      "semantic.pressure-escalation",
    ]);
    expect(v.level).toBe("critical");
    expect(v.monster).toBe("romance");
  });
});
