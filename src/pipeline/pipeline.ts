/**
 * pipeline.ts — createPipeline: wires analyzers, reduction, aggregation,
 * combination rules, monster, actions and limitations into a Verdict.
 *
 * `run` never rejects (REQ-PIPE-14 to 21). Nothing is logged or stored.
 */

import { aggregate, AnalyzerRegistry } from "../core";
import type { Signal } from "../core";
import { SemanticAnalyzer } from "../analyzers/semantic-analyzer";
import type { SemanticResult } from "../analyzers/semantic-analyzer";
import { TextAnalyzer } from "../analyzers/text-analyzer";
import { UrlAnalyzer } from "../analyzers/url-analyzer";
import type { LlmClient } from "../analyzers/llm-client";

import { applyRules } from "./combine";
import { prepareInput } from "./input";
import type { PreparedInput } from "./input";
import { buildActions, buildLimitations, resolveLocale } from "./messages";
import { selectMonster } from "./monster";
import { SEMANTIC_POLICY, SEMANTIC_TIMEOUT_MS } from "./pipeline.config";
import { reduceForScoring, shortenEvidence, sortBySeverity } from "./reduce";
import type {
  Locale,
  RiskLevel,
  SemanticOutcome,
  Verdict,
} from "./verdict";

export interface PipelineOptions {
  readonly llmClient: LlmClient | null;
  readonly locale?: Locale;
  /** Test hook: pipeline-level semantic timeout in ms. */
  readonly semanticTimeoutMs?: number;
}

export interface Pipeline {
  run(input: { text?: string; urls?: string[] }): Promise<Verdict>;
}

interface Scored {
  readonly score: number;
  readonly level: RiskLevel;
}

function score(signals: readonly Signal[]): Scored {
  const agg = aggregate(reduceForScoring(signals));
  const { score: s, level } = applyRules(agg, signals);
  return { score: s, level };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.keys(value as object)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  } else if (value !== null && typeof value === "object") {
    for (const key of Object.keys(value as object)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

function assemble(params: {
  readonly scored: Scored;
  readonly signals: readonly Signal[];
  readonly semantic: SemanticOutcome;
  readonly prepared: Pick<PreparedInput, "inputTruncated" | "urls" | "urlsSkipped">;
  readonly locale: Locale;
}): Verdict {
  const { scored, semantic, prepared, locale } = params;
  const signals = sortBySeverity(params.signals);
  const monster = selectMonster(scored.level, signals);
  const verdict: Verdict = {
    riskScore: scored.score,
    level: scored.level,
    monster,
    signals,
    actions: buildActions(monster, signals, locale),
    limitations: buildLimitations({
      level: scored.level,
      semanticStatus: semantic.status,
      locale,
    }),
    semantic,
    inputTruncated: prepared.inputTruncated,
    urlsAnalyzed: prepared.urls.length,
    urlsSkipped: prepared.urlsSkipped,
  };
  return deepFreeze(verdict);
}

function fallbackVerdict(locale: Locale, hasClient: boolean): Verdict {
  const semantic: SemanticOutcome = hasClient
    ? { status: "degraded", reason: "client-error", skipped: false }
    : { status: "unavailable", skipped: false };
  return deepFreeze({
    riskScore: 0,
    level: "no_signals",
    monster: null,
    signals: [],
    actions: buildActions(null, [], locale),
    limitations: buildLimitations({
      level: "no_signals",
      semanticStatus: "degraded",
      locale,
    }),
    semantic,
    inputTruncated: false,
    urlsAnalyzed: 0,
    urlsSkipped: 0,
  } as Verdict);
}

export function createPipeline(options: PipelineOptions): Pipeline {
  let client: LlmClient | null = null;
  let locale: Locale = "en";
  let timeoutMs = SEMANTIC_TIMEOUT_MS;
  try {
    client = options?.llmClient ?? null;
    locale = resolveLocale(options?.locale);
    const t = options?.semanticTimeoutMs;
    if (typeof t === "number" && Number.isFinite(t) && t >= 0) timeoutMs = t;
  } catch {
    // keep defaults
  }

  async function runSemantic(
    text: string,
    activeClient: LlmClient,
  ): Promise<{ signals: Signal[]; outcome: SemanticOutcome }> {
    let settled = false;
    let captured: SemanticResult | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const registry = new AnalyzerRegistry();
      registry.register(
        new SemanticAnalyzer(activeClient, (r) => {
          if (!settled) captured = r;
        }),
      );

      const timeout = new Promise<"timeout">((resolve) => {
        timer = setTimeout(() => resolve("timeout"), timeoutMs);
      });
      const winner = await Promise.race([
        registry.analyze("semantic", text),
        timeout,
      ]);
      settled = true;

      if (winner === "timeout") {
        return {
          signals: [],
          outcome: { status: "degraded", reason: "timeout", skipped: false },
        };
      }

      const result = captured as SemanticResult | null;
      if (result === null) {
        return {
          signals: [],
          outcome: { status: "degraded", reason: "client-error", skipped: false },
        };
      }
      if (result.status === "ok") {
        return { signals: winner, outcome: { status: "ok", skipped: false } };
      }
      const reason =
        result.reason === "timeout" || result.reason === "invalid-response"
          ? result.reason
          : "client-error";
      return {
        signals: [],
        outcome: { status: "degraded", reason, skipped: false },
      };
    } catch {
      settled = true;
      return {
        signals: [],
        outcome: { status: "degraded", reason: "client-error", skipped: false },
      };
    } finally {
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
    }
  }

  async function run(input: { text?: string; urls?: string[] }): Promise<Verdict> {
    try {
      const prepared = prepareInput(input);
      const textBlank = prepared.text.trim().length === 0;

      const emptySemantic: SemanticOutcome =
        client === null
          ? { status: "unavailable", skipped: false }
          : { status: "ok", skipped: true };

      if (prepared.empty) {
        return assemble({
          scored: { score: 0, level: "no_signals" },
          signals: [],
          semantic: emptySemantic,
          prepared,
          locale,
        });
      }

      const registry = new AnalyzerRegistry();
      registry.register(new TextAnalyzer());
      registry.register(new UrlAnalyzer());

      const [textSignals, ...urlResults] = await Promise.all([
        textBlank ? Promise.resolve<Signal[]>([]) : registry.analyze("text", prepared.text),
        ...prepared.urls.map((u) => registry.analyze("url", u)),
      ]);

      const ruleSignals = shortenEvidence([...textSignals, ...urlResults.flat()]);
      const rulesScored = score(ruleSignals);

      let signals = ruleSignals;
      let scored = rulesScored;
      let semantic: SemanticOutcome = emptySemantic;

      if (client !== null && !textBlank) {
        const allowed =
          SEMANTIC_POLICY === "always" || rulesScored.level !== "critical";
        if (allowed) {
          const sem = await runSemantic(prepared.text, client);
          semantic = sem.outcome;
          if (sem.signals.length > 0) {
            signals = shortenEvidence([...ruleSignals, ...sem.signals]);
            scored = score(signals);
          }
        }
      }

      return assemble({ scored, signals, semantic, prepared, locale });
    } catch {
      return fallbackVerdict(locale, client !== null);
    }
  }

  return { run };
}
