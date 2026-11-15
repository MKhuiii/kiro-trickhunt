/**
 * Semantic-only signals must not pick a specific monster or lift the level
 * above `suspicious` (REQ-PIPE-65, REQ-PIPE-69).
 */
import { describe, expect, it } from "vitest";
import { FakeLlmClient } from "../analyzers/fake-llm-client";
import { EVAL_SAMPLES } from "./eval/samples";
import { createPipeline } from "./pipeline";

const BEN_21 = EVAL_SAMPLES.find((s) => s.id === "b3-ben-21")!.text;

function run(text: string, id: string, severity: number, evidence: string) {
  const client = FakeLlmClient.responding(
    JSON.stringify({ signals: [{ id, severity, evidence }] }),
  );
  return createPipeline({ llmClient: client }).run({ text });
}

describe("semantic-only signals (REQ-PIPE-65, REQ-PIPE-69)", () => {
  const ids = [
    "semantic.relationship-or-job-bait",
    "semantic.pressure-escalation",
  ];
  for (const id of ids) {
    for (const severity of [0.3, 0.6, 1]) {
      it(`${id} at ${severity} on b3-ben-21 is at most suspicious, generic`, async () => {
        const v = await run(BEN_21, id, severity, "video interview");
        expect(v.signals.map((s) => s.id)).toContain(id);
        expect(["suspicious"]).toContain(v.level);
        expect(v.monster).toBe("generic");
      });
    }
  }

  it("job-bait semantic plus text.off-platform gives high, job-bait", async () => {
    const text = `${BEN_21} Message us on Telegram`;
    const v = await run(
      text,
      "semantic.relationship-or-job-bait",
      0.45,
      "Message us on Telegram",
    );
    expect(v.signals.map((s) => s.id)).toContain("text.off-platform");
    expect(v.level).toBe("high");
    expect(v.monster).toBe("job-bait");
  });

  it("job-bait semantic plus text.job-offer (same overlap group) gives suspicious, generic (REQ-PIPE-67)", async () => {
    const text = `${BEN_21} No experience needed. Interested in a job? We are hiring online.`;
    const v = await run(
      text,
      "semantic.relationship-or-job-bait",
      0.45,
      "We are hiring online",
    );
    expect(v.signals.map((s) => s.id)).toContain("text.job-offer");
    expect(v.level).toBe("suspicious");
    expect(v.monster).toBe("generic");
  });

  it("pressure semantic plus text.threat gives high, authority", async () => {
    const text = `${BEN_21} A court summons has been issued`;
    const v = await run(
      text,
      "semantic.pressure-escalation",
      0.45,
      "A court summons has been issued",
    );
    expect(v.signals.map((s) => s.id)).toContain("text.threat");
    expect(v.level).toBe("high");
    expect(v.monster).toBe("authority");
  });
});

describe("semantic cap with the real aggregate (REQ-PIPE-70)", () => {
  const IDS = [
    "semantic.impersonation-tone",
    "semantic.pressure-escalation",
    "semantic.isolation-secrecy",
  ];

  function runMany(ids: string[]) {
    const client = FakeLlmClient.responding(
      JSON.stringify({
        signals: ids.map((id) => ({
          id,
          severity: 0.45,
          evidence: "video interview",
        })),
      }),
    );
    return createPipeline({ llmClient: client }).run({ text: BEN_21 });
  }

  it("all three semantic signals at 0.45 give score 83, critical", async () => {
    const v = await runMany(IDS);
    expect(v.signals.map((s) => s.id)).toEqual(expect.arrayContaining(IDS));
    expect(v.riskScore).toBe(83);
    expect(v.level).toBe("critical");
  });

  for (const id of IDS) {
    it(`${id} alone at 0.45 gives score 45, suspicious`, async () => {
      const v = await runMany([id]);
      expect(v.signals.map((s) => s.id)).toContain(id);
      expect(v.riskScore).toBe(45);
      expect(v.riskScore).toBeLessThan(50);
      expect(v.level).toBe("suspicious");
    });
  }

  for (const [a, b] of [
    [IDS[0], IDS[1]],
    [IDS[0], IDS[2]],
    [IDS[1], IDS[2]],
  ]) {
    it(`${a} + ${b} at 0.45 give score 70, high`, async () => {
      const v = await runMany([a, b]);
      expect(v.riskScore).toBe(70);
      expect(v.level).toBe("high");
    });
  }
});
