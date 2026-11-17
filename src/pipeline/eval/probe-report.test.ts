import { describe, expect, it } from "vitest";
import {
  evaluateSample,
  majorityObserved,
  parseSampleSet,
  renderReport,
  reportFileName,
  summarizeRuns,
} from "./probe-report";
import type { Observed, ProbeRow } from "./probe-report";
import type { ProbeSample } from "./probe-samples";

function obs(partial: Partial<Observed>): Observed {
  return {
    level: "no_signals",
    monster: null,
    riskScore: 0,
    signalIds: [],
    semanticStatus: "unavailable",
    semanticSkipped: false,
    ...partial,
  };
}

function sample(partial: Partial<ProbeSample>): ProbeSample {
  return {
    id: "s1",
    locale: "en",
    category: "rare-scam",
    text: "a | b",
    expectedMonster: "bank",
    minLevel: "high",
    maxLevel: "critical",
    rationale: "because",
    ...partial,
  };
}

describe("evaluateSample", () => {
  it("passes a rare scam with the right monster and level", () => {
    const e = evaluateSample(sample({}), obs({ level: "critical", monster: "bank" }));
    expect(e.status).toBe("PASS");
  });

  it("fails a rare scam that is missed", () => {
    const e = evaluateSample(sample({}), obs({}));
    expect(e).toEqual({ status: "FAIL", note: "missed completely" });
  });

  it("fails a rare scam with a low level", () => {
    const e = evaluateSample(sample({}), obs({ level: "suspicious", monster: "generic" }));
    expect(e.status).toBe("FAIL");
    expect(e.note).toContain("level too low");
  });

  it("fails a rare scam with the wrong monster", () => {
    const e = evaluateSample(sample({}), obs({ level: "high", monster: "prize" }));
    expect(e.status).toBe("FAIL");
    expect(e.note).toContain("wrong monster");
  });

  it("marks an out-of-scope scam with no signal as GAP", () => {
    const s = sample({
      category: "out-of-scope-scam",
      expectedMonster: "generic",
      minLevel: "suspicious",
    });
    expect(evaluateSample(s, obs({})).status).toBe("GAP");
    expect(evaluateSample(s, obs({ level: "suspicious", monster: "generic" })).status).toBe("PASS");
  });

  it("flags a harmless message raised too high", () => {
    const s = sample({
      category: "lookalike",
      expectedMonster: null,
      minLevel: "no_signals",
      maxLevel: "suspicious",
    });
    expect(evaluateSample(s, obs({})).status).toBe("PASS");
    expect(evaluateSample(s, obs({ level: "suspicious", monster: "generic" })).note).toContain(
      "borderline",
    );
    expect(evaluateSample(s, obs({ level: "high", monster: "bank" })).status).toBe("FALSE_ALARM");
    expect(evaluateSample(s, obs({ level: "suspicious", monster: "bank" })).status).toBe(
      "FALSE_ALARM",
    );
  });
});

describe("renderReport", () => {
  const s = sample({});
  const rules = obs({ level: "critical", monster: "bank", riskScore: 90 });
  const llm = obs({
    level: "critical",
    monster: "bank",
    riskScore: 90,
    semanticStatus: "ok",
    semanticSkipped: true,
  });
  const row: ProbeRow = {
    sample: s,
    rules,
    llm,
    rulesEval: evaluateSample(s, rules),
    llmEval: evaluateSample(s, llm),
  };
  const miss: ProbeRow = {
    sample: sample({ id: "s2" }),
    rules: obs({}),
    llm: null,
    rulesEval: { status: "FAIL", note: "missed completely" },
    llmEval: null,
  };

  it("renders both columns, escapes pipes and lists mismatches", () => {
    const md = renderReport({
      rows: [row, miss],
      generatedAt: "2026-11-17",
      llmRequested: true,
      llmAvailable: true,
    });
    expect(md).toContain("Rules-only");
    expect(md).toContain("Rules + LLM");
    expect(md).toContain("a \\| b");
    expect(md).toContain("llm skipped");
    expect(md).toContain("### s2 (rare-scam)");
    expect(md).not.toMatch(/\bsafe\b/i);
  });

  it("explains when the LLM was requested but is not configured", () => {
    const md = renderReport({
      rows: [{ ...row, llm: null, llmEval: null }],
      generatedAt: "2026-11-17",
      llmRequested: true,
      llmAvailable: false,
    });
    expect(md).toContain("no LLM client is configured");
    expect(md).not.toContain("## Summary: rules + LLM");
  });
});

describe("report file naming", () => {
  it("parses the sample set and defaults to main", () => {
    expect(parseSampleSet("holdout")).toBe("holdout");
    expect(parseSampleSet("all")).toBe("all");
    expect(parseSampleSet("anything")).toBe("main");
    expect(parseSampleSet(undefined)).toBe("main");
  });

  it("builds names from date, set and label", () => {
    expect(reportFileName({ date: "2026-11-17", set: "main" })).toBe(
      "message-probe-2026-11-17.md",
    );
    expect(reportFileName({ date: "2026-11-17", set: "holdout", label: "before" })).toBe(
      "message-probe-2026-11-17-holdout-before.md",
    );
  });

  it("strips unsafe characters from the label", () => {
    const name = reportFileName({ date: "2026-11-17", set: "main", label: "../a b/c" });
    expect(name).toBe("message-probe-2026-11-17-abc.md");
  });
});

describe("repeated runs and the awareness adjustment", () => {
  const high = obs({ level: "high", monster: "authority", riskScore: 70 });
  const sus = obs({ level: "suspicious", monster: "generic", riskScore: 45 });
  const lowered = obs({
    level: "suspicious",
    monster: "generic",
    riskScore: 49,
    awarenessApplied: true,
  });

  it("majorityObserved picks the most common level and monster", () => {
    expect(majorityObserved([])).toEqual({ observed: null, agree: 0 });
    expect(majorityObserved([high, sus, high])).toEqual({ observed: high, agree: 2 });
    expect(majorityObserved([sus, high])).toEqual({ observed: sus, agree: 1 });
  });

  it("a scam lowered in any run fails, even when the majority was not lowered", () => {
    const scam = sample({ category: "evasion-scam", expectedMonster: "generic", minLevel: "suspicious" });
    const r = summarizeRuns(scam, [high, high, lowered]);
    expect(r.observed).toBe(lowered);
    expect(r.evaluation?.status).toBe("FAIL");
    expect(r.evaluation?.note).toContain("lowered by awareness adjustment");
  });

  it("an evasion scam that was not lowered passes", () => {
    const scam = sample({ category: "evasion-scam", expectedMonster: "generic", minLevel: "suspicious" });
    expect(summarizeRuns(scam, [high, sus, high]).evaluation?.status).toBe("PASS");
  });

  it("a rare scam lowered by the adjustment fails before the monster check", () => {
    const e = evaluateSample(sample({}), obs({ level: "high", monster: "bank", awarenessApplied: true }));
    expect(e.status).toBe("FAIL");
    expect(e.note).toContain("lowered");
  });

  it("a genuine warning that was lowered passes and uses the majority", () => {
    const warn = sample({
      category: "lookalike",
      expectedMonster: null,
      minLevel: "no_signals",
      maxLevel: "suspicious",
    });
    const r = summarizeRuns(warn, [lowered, lowered, high]);
    expect(r.observed).toBe(lowered);
    expect(r.evaluation?.status).toBe("PASS");
  });

  it("the report marks unstable and lowered runs", () => {
    const scam = sample({ id: "ev-x", category: "evasion-scam", expectedMonster: "generic", minLevel: "suspicious" });
    const runs = [high, high, lowered];
    const s = summarizeRuns(scam, runs);
    const md = renderReport({
      rows: [{ sample: scam, rules: high, llm: s.observed, rulesEval: evaluateSample(scam, high), llmEval: s.evaluation, llmRuns: runs }],
      generatedAt: "2026-11-17",
      llmRequested: true,
      llmAvailable: true,
    });
    expect(md).toContain("[lowered 1/3]");
    expect(md).toContain("## Awareness adjustment");
    expect(md).toContain("Scams lowered in at least one run: 1.");
  });

  it("parses the new sample sets", () => {
    expect(parseSampleSet("holdout2")).toBe("holdout2");
    expect(parseSampleSet("evasion")).toBe("evasion");
  });
});
