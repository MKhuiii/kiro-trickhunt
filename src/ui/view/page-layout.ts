import type { ResultView } from "./result-view";

export type SectionId =
  | "heading"
  | "levelBanner"
  | "aiNote"
  | "actions"
  | "evidence"
  | "limitsNote"
  | "limitations"
  | "monster"
  | "notices"
  | "technical";

/**
 * Ordered list of sections the result panel renders (REQ-PAGE-04, 09, 14, 23,
 * 24). For the neutral state, "evidence" stands for the neutral summary block.
 */
export function resultSections(view: ResultView): readonly SectionId[] {
  if (view.kind === "withheld") {
    const out: SectionId[] = ["heading"];
    if (view.notices.length > 0) out.push("notices");
    out.push("limitsNote", "technical");
    return out;
  }
  const out: SectionId[] = ["heading", "levelBanner"];
  if (view.aiNote !== null) out.push("aiNote");
  if (view.actions.length > 0) out.push("actions");
  out.push("evidence", "limitsNote");
  if (view.limitations.length > 0) out.push("limitations");
  out.push("monster");
  if (view.notices.length > 0) out.push("notices");
  out.push("technical");
  return out;
}
