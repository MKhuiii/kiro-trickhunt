/**
 * Pure helpers for the message-probe report: compare an observed verdict with
 * a sample's expectation and render the Markdown tables. No I/O, no network.
 * Test-only module: used by scripts/run-message-probe.ts and its tests.
 */

import type { RiskLevel } from "../../core";
import { LIMITATIONS_AWARENESS } from "../messages.config";
import type { Verdict } from "../verdict";
import type { ProbeCategory, ProbeSample } from "./probe-samples";

export const LEVEL_RANK: Readonly<Record<RiskLevel, number>> = {
  no_signals: 0,
  suspicious: 1,
  high: 2,
  critical: 3,
};

export type EvalStatus = "PASS" | "FAIL" | "GAP" | "FALSE_ALARM";

export interface Observed {
  readonly level: RiskLevel;
  readonly monster: string | null;
  readonly riskScore: number;
  readonly signalIds: readonly string[];
  readonly semanticStatus: "ok" | "unavailable" | "degraded";
  readonly semanticSkipped: boolean;
  readonly semanticReason?: string;
  /** True when the awareness adjustment lowered this verdict. */
  readonly awarenessApplied?: boolean;
}

export interface Evaluation {
  readonly status: EvalStatus;
  readonly note: string;
}

export interface ProbeRow {
  readonly sample: ProbeSample;
  readonly rules: Observed | null;
  readonly llm: Observed | null;
  readonly rulesEval: Evaluation | null;
  readonly llmEval: Evaluation | null;
  /** Every LLM run when `--repeat` is above 1; `llm` is the majority run. */
  readonly llmRuns?: readonly Observed[];
}

/**
 * Pick the majority result of several runs, by level and monster. Ties keep
 * the earliest result. Returns the chosen run and how many runs agree.
 */
export function majorityObserved(runs: readonly Observed[]): {
  readonly observed: Observed | null;
  readonly agree: number;
} {
  if (runs.length === 0) return { observed: null, agree: 0 };
  const key = (o: Observed) => `${o.level}/${o.monster ?? "none"}`;
  const counts = new Map<string, number>();
  for (const o of runs) counts.set(key(o), (counts.get(key(o)) ?? 0) + 1);
  let best = runs[0];
  for (const o of runs) {
    if ((counts.get(key(o)) ?? 0) > (counts.get(key(best)) ?? 0)) best = o;
  }
  return { observed: best, agree: counts.get(key(best)) ?? 0 };
}

/**
 * Summarize repeated LLM runs of one sample. The result is the majority run,
 * except that a scam lowered by the awareness adjustment in any run is
 * reported with that run, so a rare unsafe lowering is never hidden.
 */
export function summarizeRuns(
  sample: ProbeSample,
  runs: readonly Observed[],
): { readonly observed: Observed | null; readonly evaluation: Evaluation | null } {
  const { observed } = majorityObserved(runs);
  if (observed === null) return { observed: null, evaluation: null };
  const isScam = sample.category !== "benign" && sample.category !== "lookalike";
  const lowered = runs.find((r) => r.awarenessApplied === true);
  const pick = isScam && lowered !== undefined ? lowered : observed;
  return { observed: pick, evaluation: evaluateSample(sample, pick) };
}

/** Number of runs in which the awareness adjustment lowered the verdict. */
export function awarenessCount(row: ProbeRow): number {
  const runs = row.llmRuns ?? (row.llm ? [row.llm] : []);
  return runs.filter((o) => o.awarenessApplied === true).length;
}

const AWARENESS_LINES: ReadonlySet<string> = new Set([
  ...LIMITATIONS_AWARENESS.en,
  ...LIMITATIONS_AWARENESS.vi,
]);

export function toObserved(verdict: Verdict): Observed {
  return {
    awarenessApplied: verdict.limitations.some((l) => AWARENESS_LINES.has(l)),
    level: verdict.level,
    monster: verdict.monster,
    riskScore: verdict.riskScore,
    signalIds: verdict.signals.map((s) => s.id),
    semanticStatus: verdict.semantic.status,
    semanticSkipped: verdict.semantic.skipped,
    ...(verdict.semantic.reason !== undefined
      ? { semanticReason: verdict.semantic.reason }
      : {}),
  };
}

/** Decide whether an observed verdict meets a sample's expectation. */
export function evaluateSample(
  sample: ProbeSample,
  observed: Observed,
): Evaluation {
  const rank = LEVEL_RANK[observed.level];
  const min = LEVEL_RANK[sample.minLevel];
  const max = LEVEL_RANK[sample.maxLevel];
  const got = `${observed.level}/${observed.monster ?? "none"}`;
  const isScam =
    sample.category === "rare-scam" ||
    sample.category === "out-of-scope-scam" ||
    sample.category === "evasion-scam";

  // A scam lowered by the awareness adjustment is the failure that matters most.
  if (isScam && observed.awarenessApplied === true) {
    return { status: "FAIL", note: `lowered by awareness adjustment (${got})` };
  }

  switch (sample.category) {
    case "evasion-scam":
      return { status: "PASS", note: `not lowered (${got})` };
    case "rare-scam": {
      if (rank < min) {
        return {
          status: "FAIL",
          note:
            observed.level === "no_signals"
              ? "missed completely"
              : `level too low (${got}, wanted at least ${sample.minLevel})`,
        };
      }
      if (observed.monster !== sample.expectedMonster) {
        return {
          status: "FAIL",
          note: `wrong monster (${got}, wanted ${String(sample.expectedMonster)})`,
        };
      }
      return { status: "PASS", note: "" };
    }
    case "out-of-scope-scam": {
      if (rank === 0) {
        return { status: "GAP", note: "no signal at all (known gap)" };
      }
      if (rank < min) {
        return { status: "FAIL", note: `level too low (${got})` };
      }
      return {
        status: "PASS",
        note:
          observed.monster === "generic" || observed.monster === null
            ? ""
            : `raised under ${observed.monster}`,
      };
    }
    case "benign":
    case "lookalike": {
      const monsterOk = observed.monster === null || observed.monster === "generic";
      if (rank > max || !monsterOk) {
        return { status: "FALSE_ALARM", note: `raised to ${got}` };
      }
      return {
        status: "PASS",
        note: observed.level === "suspicious" ? "borderline: suspicious" : "",
      };
    }
  }
}

function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function snippet(text: string, max = 70): string {
  const one = text.replace(/\s+/g, " ").trim();
  return cell(one.length > max ? `${one.slice(0, max - 1)}…` : one);
}

function describe(
  o: Observed | null,
  e: Evaluation | null,
  runs?: readonly Observed[],
): string {
  if (o === null || e === null) return "-";
  const sem = o.semanticSkipped
    ? ", llm skipped"
    : o.semanticStatus === "degraded"
      ? `, llm degraded${o.semanticReason ? `: ${o.semanticReason}` : ""}`
      : "";
  let extra = "";
  if (runs !== undefined && runs.length > 1) {
    const { agree } = majorityObserved(runs);
    if (agree < runs.length) extra += ` [unstable ${agree}/${runs.length}]`;
    const lowered = runs.filter((r) => r.awarenessApplied === true).length;
    if (lowered > 0) extra += ` [lowered ${lowered}/${runs.length}]`;
  } else if (o.awarenessApplied === true) {
    extra += " [lowered]";
  }
  return `${e.status} ${o.level}/${o.monster ?? "none"} (${o.riskScore})${sem}${extra}`;
}

const CATEGORIES: readonly ProbeCategory[] = [
  "rare-scam",
  "out-of-scope-scam",
  "evasion-scam",
  "benign",
  "lookalike",
];

const STATUSES: readonly EvalStatus[] = ["PASS", "FAIL", "GAP", "FALSE_ALARM"];

function expectedLabel(s: ProbeSample): string {
  const monster = s.expectedMonster ?? "none";
  const range =
    s.minLevel === s.maxLevel ? s.minLevel : `${s.minLevel}..${s.maxLevel}`;
  return `${monster} / ${range}`;
}

function summaryTable(
  rows: readonly ProbeRow[],
  pick: (r: ProbeRow) => Evaluation | null,
): string[] {
  const lines = [
    "| Category | Total | PASS | FAIL | GAP | FALSE_ALARM |",
    "|---|---|---|---|---|---|",
  ];
  for (const cat of CATEGORIES) {
    const inCat = rows.filter((r) => r.sample.category === cat);
    const counts = STATUSES.map(
      (st) => inCat.filter((r) => pick(r)?.status === st).length,
    );
    lines.push(`| ${cat} | ${inCat.length} | ${counts.join(" | ")} |`);
  }
  return lines;
}

function confusionTable(
  rows: readonly ProbeRow[],
  pick: (r: ProbeRow) => Observed | null,
): string[] {
  const cols = ["bank", "prize", "job-bait", "authority", "generic", "none"];
  const rowKeys = ["bank", "prize", "job-bait", "authority", "generic", "none"];
  const lines = [
    `| Expected \\ Observed | ${cols.join(" | ")} |`,
    `|---|${cols.map(() => "---").join("|")}|`,
  ];
  for (const exp of rowKeys) {
    const counts = cols.map((obs) => {
      let n = 0;
      for (const r of rows) {
        const o = pick(r);
        if (o === null) continue;
        if ((r.sample.expectedMonster ?? "none") !== exp) continue;
        if ((o.monster ?? "none") === obs) n += 1;
      }
      return String(n);
    });
    lines.push(`| ${exp} | ${counts.join(" | ")} |`);
  }
  return lines;
}

export type SampleSet = "main" | "holdout" | "holdout2" | "evasion" | "all";

const SAMPLE_SETS: readonly SampleSet[] = ["main", "holdout", "holdout2", "evasion", "all"];

/** Parse a `--set` value; anything unknown falls back to "main". */
export function parseSampleSet(value: string | undefined): SampleSet {
  return SAMPLE_SETS.find((s) => s === value) ?? "main";
}

/**
 * File name for a report: `message-probe-<date>[-<set>][-<label>].md`.
 * The label is reduced to letters, digits and dashes so it is a safe file name.
 */
export function reportFileName(params: {
  readonly date: string;
  readonly set: SampleSet;
  readonly label?: string | undefined;
}): string {
  const parts = ["message-probe", params.date];
  if (params.set !== "main") parts.push(params.set);
  const label = (params.label ?? "").replace(/[^A-Za-z0-9-]+/g, "").slice(0, 40);
  if (label.length > 0) parts.push(label);
  return `${parts.join("-")}.md`;
}

export interface ReportInput {
  readonly rows: readonly ProbeRow[];
  readonly generatedAt: string;
  readonly llmRequested: boolean;
  readonly llmAvailable: boolean;
}

/** Render the whole Markdown report. */
export function renderReport(input: ReportInput): string {
  const { rows } = input;
  const hasRules = rows.some((r) => r.rules !== null);
  const hasLlm = rows.some((r) => r.llm !== null);
  const out: string[] = [];

  out.push("# TrickHunt message probe report", "");
  out.push(`Generated: ${input.generatedAt}`, "");
  out.push(
    `Messages: ${rows.length}. Modes: ${[hasRules ? "rules-only" : "", hasLlm ? "rules+LLM" : ""].filter(Boolean).join(", ")}.`,
    "",
  );
  if (input.llmRequested && !input.llmAvailable) {
    out.push(
      "> The LLM mode was requested but no LLM client is configured (check `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL`). Only rules-only results are shown.",
      "",
    );
  }
  out.push(
    "All messages are synthetic. Status meanings: PASS = matches expectation; FAIL = scam missed, too low or wrong monster; GAP = out-of-scope scam with no signal; FALSE_ALARM = harmless message raised too high.",
    "",
  );

  if (hasLlm) {
    const calls = rows.filter((r) => r.llm !== null && !r.llm.semanticSkipped);
    const degraded = calls.filter((r) => r.llm?.semanticStatus === "degraded");
    const skipped = rows.filter((r) => r.llm?.semanticSkipped === true).length;
    out.push(
      `LLM reliability: ${calls.length} messages reached the LLM, ${degraded.length} ended degraded (after retries), ${skipped} skipped because rules were already critical. A degraded message shows its rules-only result, so read those rows with care.`,
      "",
    );
  }

  if (hasRules) {
    out.push("## Summary: rules-only", "", ...summaryTable(rows, (r) => r.rulesEval), "");
    out.push("### Monster confusion: rules-only", "", ...confusionTable(rows, (r) => r.rules), "");
  }
  if (hasLlm) {
    out.push("## Summary: rules + LLM", "", ...summaryTable(rows, (r) => r.llmEval), "");
    out.push("### Monster confusion: rules + LLM", "", ...confusionTable(rows, (r) => r.llm), "");
  }

  for (const cat of CATEGORIES) {
    const inCat = rows.filter((r) => r.sample.category === cat);
    if (inCat.length === 0) continue;
    out.push(`## ${cat}`, "");
    const header = ["Id", "Lang", "Message", "Expected"];
    if (hasRules) header.push("Rules-only");
    if (hasLlm) header.push("Rules + LLM");
    out.push(`| ${header.join(" | ")} |`, `|${header.map(() => "---").join("|")}|`);
    for (const r of inCat) {
      const cells = [
        r.sample.id,
        r.sample.locale,
        snippet(r.sample.text),
        expectedLabel(r.sample),
      ];
      if (hasRules) cells.push(cell(describe(r.rules, r.rulesEval)));
      if (hasLlm) cells.push(cell(describe(r.llm, r.llmEval, r.llmRuns)));
      out.push(`| ${cells.join(" | ")} |`);
    }
    out.push("");
  }

  if (hasLlm) {
    const lowered = rows.filter((r) => awarenessCount(r) > 0);
    const runsOf = (r: ProbeRow) => r.llmRuns?.length ?? (r.llm ? 1 : 0);
    out.push("## Awareness adjustment", "");
    if (lowered.length === 0) {
      out.push("No message was lowered by the awareness adjustment.", "");
    } else {
      out.push("| Id | Category | Lowered in runs | Majority result |", "|---|---|---|---|");
      for (const r of lowered) {
        out.push(
          `| ${r.sample.id} | ${r.sample.category} | ${awarenessCount(r)}/${runsOf(r)} | ${cell(describe(r.llm, r.llmEval))} |`,
        );
      }
      out.push("");
    }
    const scamLowered = lowered.filter((r) =>
      ["rare-scam", "out-of-scope-scam", "evasion-scam"].includes(r.sample.category),
    );
    out.push(
      `Scams lowered in at least one run: ${scamLowered.length}. Harmless messages lowered in at least one run: ${lowered.length - scamLowered.length}.`,
      "",
    );
  }

  const changed = rows.filter(
    (r) =>
      r.rules !== null &&
      r.llm !== null &&
      (r.rules.level !== r.llm.level || r.rules.monster !== r.llm.monster),
  );
  if (hasRules && hasLlm) {
    out.push("## Where the LLM changed the result", "");
    if (changed.length === 0) {
      out.push("No message changed level or monster.", "");
    } else {
      out.push("| Id | Rules-only | Rules + LLM |", "|---|---|---|");
      for (const r of changed) {
        out.push(
          `| ${r.sample.id} | ${cell(describe(r.rules, r.rulesEval))} | ${cell(describe(r.llm, r.llmEval))} |`,
        );
      }
      out.push("");
    }
  }

  const bad = rows.filter(
    (r) =>
      (r.rulesEval !== null && r.rulesEval.status !== "PASS") ||
      (r.llmEval !== null && r.llmEval.status !== "PASS"),
  );
  out.push("## Mismatches in detail", "");
  if (bad.length === 0) {
    out.push("None.", "");
  } else {
    for (const r of bad) {
      out.push(`### ${r.sample.id} (${r.sample.category})`, "");
      out.push(`- Message: ${cell(r.sample.text)}`);
      out.push(`- Expected: ${expectedLabel(r.sample)}. Why: ${r.sample.rationale}`);
      if (r.rules !== null && r.rulesEval !== null) {
        out.push(
          `- Rules-only: ${r.rulesEval.status} ${r.rules.level}/${r.rules.monster ?? "none"}, score ${r.rules.riskScore}. ${r.rulesEval.note}. Signals: ${r.rules.signalIds.join(", ") || "none"}`,
        );
      }
      if (r.llm !== null && r.llmEval !== null) {
        out.push(
          `- Rules + LLM: ${r.llmEval.status} ${r.llm.level}/${r.llm.monster ?? "none"}, score ${r.llm.riskScore}. ${r.llmEval.note}. Signals: ${r.llm.signalIds.join(", ") || "none"}`,
        );
      }
      out.push("");
    }
  }

  return `${out.join("\n")}\n`;
}
