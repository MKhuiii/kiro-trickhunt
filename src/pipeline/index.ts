/**
 * index.ts — Public entry point for the analysis pipeline (REQ-PIPE-01).
 */

export { createPipeline } from "./pipeline";
export type { Pipeline, PipelineOptions } from "./pipeline";
export type {
  Locale,
  MonsterId,
  RiskLevel,
  SemanticOutcome,
  SemanticPolicy,
  SemanticReason,
  SemanticStatus,
  Verdict,
} from "./verdict";
