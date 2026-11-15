import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { MessageKey, ResultView } from "../ui";

interface TechnicalDetailsProps {
  readonly view: ResultView;
  readonly locale: Locale;
}

/** Collapsed by default. Only place that shows the semantic note, codes and ids. */
export function TechnicalDetails({ view, locale }: TechnicalDetailsProps): ReactElement {
  const semanticKey: MessageKey | null = view.kind === "ready" ? view.semanticNoteKey : null;
  const signalIds =
    view.kind === "ready"
      ? view.signalGroups.flatMap((g) => g.cards.map((c) => c.signalId)).filter((id) => id !== "")
      : [];
  const noticeKinds = view.notices.map((n) => n.kind);
  return (
    <details className="rounded-xl border border-[var(--th-border)] bg-[var(--th-surface)] p-4 text-[color:var(--th-text)]">
      <summary className="cursor-pointer text-lg font-semibold">
        {t(locale, "result.tech.summary")}
      </summary>
      <div className="mt-3 space-y-2 text-base">
        {semanticKey !== null ? <p>{t(locale, semanticKey)}</p> : null}
        {signalIds.length > 0 ? (
          <ul className="list-disc pl-6 font-mono text-sm break-all">
            {signalIds.map((id, i) => (
              <li key={`${id}-${i}`}>{id}</li>
            ))}
          </ul>
        ) : null}
        {noticeKinds.length > 0 ? (
          <ul className="list-disc pl-6 font-mono text-sm break-all">
            {noticeKinds.map((kind) => (
              <li key={kind}>{kind}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
