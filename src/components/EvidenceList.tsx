import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { MessageKey, ReadyResultView } from "../ui";
import { HighlightedMessage } from "./HighlightedMessage";

const SEVERITY_KEY: Readonly<Record<"low" | "medium" | "high", MessageKey>> = {
  low: "result.severity.low",
  medium: "result.severity.medium",
  high: "result.severity.high",
};

interface EvidenceListProps {
  readonly view: ReadyResultView;
  readonly locale: Locale;
}

/** Evidence cards for signals, or the neutral summary when nothing was found. */
export function EvidenceList({ view, locale }: EvidenceListProps): ReactElement {
  const { noSignals } = view;
  if (noSignals !== null) {
    return (
      <section className="rounded-xl border border-[var(--th-border)] bg-[var(--th-surface)] p-4 text-[color:var(--th-text)]">
        <h3 className="text-2xl font-bold">{t(locale, noSignals.summaryKey)}</h3>
        <p className="mt-2 text-lg">{t(locale, noSignals.notSafeKey)}</p>
        <p className="mt-2 text-lg">{t(locale, noSignals.reminderKey)}</p>
      </section>
    );
  }
  const hasHighlight = view.highlights.some((seg) => seg.highlighted);
  return (
    <section className="text-[color:var(--th-text)]">
      <h3 className="text-2xl font-bold">{t(locale, "result.evidence.heading")}</h3>
      {view.signalGroups.map((group) => (
        <div key={group.source} className="mt-4">
          <h4 className="text-lg font-bold text-[color:var(--th-muted)]">
            {t(locale, group.labelKey)}
          </h4>
          <ul className="mt-2 space-y-3">
            {group.cards.map((card, i) => (
              <li
                key={`${card.signalId}-${i}`}
                className="rounded-xl border border-[var(--th-border)] bg-[var(--th-surface)] p-3"
              >
                <p className="text-base">{t(locale, card.explanationKey)}</p>
                <p className="mt-2 text-base">
                  <span className="font-semibold">{t(locale, "result.evidence.label")}</span>{" "}
                  <span className="break-words">{card.evidence}</span>
                </p>
                <p className="mt-1 text-base font-semibold text-[color:var(--th-muted)]">
                  {t(locale, SEVERITY_KEY[card.severityBand])}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {hasHighlight ? <HighlightedMessage segments={view.highlights} locale={locale} /> : null}
    </section>
  );
}
