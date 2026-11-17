/**
 * Awareness adjustment through the whole pipeline, with FakeLlmClient only
 * (rules-tuning-v5). No network.
 *
 * The "fooled LLM" block is the Task 6a check: a fake LLM that always calls
 * the message a scam warning, at full strength, with no warning signs. Even
 * then no scam sample may be lowered, because the fixed conditions alone
 * must block it.
 */
import { describe, expect, it } from "vitest";
import { FakeLlmClient } from "../analyzers/fake-llm-client";
import { redactSensitive } from "../analyzers/semantic-analyzer";
import { AWARENESS_SIGNAL_ID } from "../analyzers/semantic-analyzer.config";
import { AWARENESS_ADJUSTMENT_ENABLED } from "./awareness.config";
import { LIMITATIONS_AWARENESS } from "./messages.config";
import { createPipeline } from "./pipeline";
import { EVAL_SAMPLES } from "./eval/samples";
import {
  PROBE_EVASION_SAMPLES,
  PROBE_HOLDOUT2_SAMPLES,
  PROBE_HOLDOUT_SAMPLES,
  PROBE_SAMPLES,
} from "./eval/probe-samples";

const LOOK_EN_2 = PROBE_SAMPLES.find((s) => s.id === "look-en-2")!.text;

/** The adjustment is tested switched on, whatever the config default is. */
const ON = { awarenessEnabled: true } as const;

function fooledClient(text: string, extra: object[] = []): FakeLlmClient {
  const evidence = redactSensitive(text).slice(0, 12).trim();
  return FakeLlmClient.responding(
    JSON.stringify({
      signals: [{ id: AWARENESS_SIGNAL_ID, severity: 1, evidence }, ...extra],
    }),
  );
}

function isLowered(limitations: readonly string[]): boolean {
  return limitations.some(
    (l) => LIMITATIONS_AWARENESS.en.includes(l) || LIMITATIONS_AWARENESS.vi.includes(l),
  );
}

describe("awareness adjustment in the pipeline", () => {
  it("follows the config switch by default", async () => {
    const v = await createPipeline({ llmClient: fooledClient(LOOK_EN_2) }).run({ text: LOOK_EN_2 });
    expect(isLowered(v.limitations)).toBe(AWARENESS_ADJUSTMENT_ENABLED);
  });

  it("lowers look-en-2 from high to suspicious and explains why", async () => {
    const rulesOnly = await createPipeline({ llmClient: null }).run({ text: LOOK_EN_2 });
    expect(rulesOnly.level).toBe("high");

    const v = await createPipeline({ ...ON, llmClient: fooledClient(LOOK_EN_2) }).run({ text: LOOK_EN_2 });
    expect(v.level).toBe("suspicious");
    expect(v.riskScore).toBeLessThanOrEqual(49);
    expect(isLowered(v.limitations)).toBe(true);
    // Evidence stays visible and the marker is never shown as a signal.
    expect(v.signals.map((s) => s.id)).toEqual(expect.arrayContaining(["text.threat", "text.urgency"]));
    expect(v.signals.some((s) => s.id === AWARENESS_SIGNAL_ID)).toBe(false);
  });

  it("uses the Vietnamese explanation for the vi locale", async () => {
    const v = await createPipeline({ ...ON, llmClient: fooledClient(LOOK_EN_2), locale: "vi" }).run({
      text: LOOK_EN_2,
    });
    expect(v.limitations).toEqual(expect.arrayContaining([...LIMITATIONS_AWARENESS.vi]));
  });

  it("does nothing when switched off, and does not ask the LLM for the marker", async () => {
    const client = fooledClient(LOOK_EN_2);
    const v = await createPipeline({ llmClient: client, awarenessEnabled: false }).run({
      text: LOOK_EN_2,
    });
    expect(v.level).toBe("high");
    expect(isLowered(v.limitations)).toBe(false);
    expect(client.requests[0].system).not.toContain(AWARENESS_SIGNAL_ID);
  });

  it("asks the LLM for the marker when switched on", async () => {
    const client = fooledClient(LOOK_EN_2);
    await createPipeline({ llmClient: client, awarenessEnabled: true }).run({ text: LOOK_EN_2 });
    expect(client.requests[0].system).toContain(AWARENESS_SIGNAL_ID);
  });

  it("does not lower when the LLM also reports a warning sign", async () => {
    const client = fooledClient(LOOK_EN_2, [
      { id: "semantic.pressure-escalation", severity: 0.3, evidence: "within 24 hours" },
    ]);
    const v = await createPipeline({ ...ON, llmClient: client }).run({ text: LOOK_EN_2 });
    expect(v.level).toBe("high");
    expect(isLowered(v.limitations)).toBe(false);
  });

  it("ignores a marker whose evidence is not in the message", async () => {
    const client = FakeLlmClient.responding(
      JSON.stringify({ signals: [{ id: AWARENESS_SIGNAL_ID, severity: 1, evidence: "not in text" }] }),
    );
    const v = await createPipeline({ ...ON, llmClient: client }).run({ text: LOOK_EN_2 });
    expect(v.level).toBe("high");
  });

  it("without the LLM nothing is lowered", async () => {
    const v = await createPipeline({ llmClient: null }).run({ text: LOOK_EN_2 });
    expect(isLowered(v.limitations)).toBe(false);
  });
});

/** Every scam sample available: eval scams and probe scams of all sets. */
const SCAMS: ReadonlyArray<{ readonly id: string; readonly text: string }> = [
  ...EVAL_SAMPLES.filter((s) => s.expectedMonster !== null),
  ...[
    ...PROBE_SAMPLES,
    ...PROBE_HOLDOUT_SAMPLES,
    ...PROBE_HOLDOUT2_SAMPLES,
    ...PROBE_EVASION_SAMPLES,
  ].filter((s) => s.category !== "benign" && s.category !== "lookalike"),
];

describe("Task 6a: a fully fooled LLM never lowers a scam", () => {
  it("covers a meaningful number of scam samples", () => {
    expect(SCAMS.length).toBeGreaterThanOrEqual(80);
  });

  for (const s of SCAMS) {
    it(`${s.id} is not lowered`, async () => {
      const v = await createPipeline({ ...ON, llmClient: fooledClient(s.text) }).run({ text: s.text });
      expect(isLowered(v.limitations), `${s.id}: ${v.level}`).toBe(false);
    });
  }
});
