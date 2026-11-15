import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { ResultView } from "../ui";
import { FOCUS_RING } from "./styles";

interface TechnicalDetailsProps {
  readonly view: ResultView;
  readonly locale: Locale;
}

/**
 * Collapsed by default. Shows only dictionary text (the semantic note).
 * Never renders signal ids or notice kinds (REQ-HUNT-37). Returns null when empty.
 */
export function TechnicalDetails({ view, locale }: TechnicalDetailsProps): ReactElement | null {
  if (view.kind !== "ready") return null;
  return (
    <details className="rounded-xl border border-[var(--th-border)] bg-[var(--th-surface)] p-4 text-[color:var(--th-text)]">
      <summary className={`cursor-pointer text-lg font-semibold ${FOCUS_RING}`}>
        {t(locale, "result.tech.summary")}
      </summary>
      <div className="mt-3 space-y-2 text-base">
        <p>{t(locale, view.semanticNoteKey)}</p>
      </div>
    </details>
  );
}
