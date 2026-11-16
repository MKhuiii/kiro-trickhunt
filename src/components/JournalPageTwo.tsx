import type { ReactElement } from "react";
import type { Locale } from "../pipeline";
import { t } from "../ui";
import type { JournalView, ResultView } from "../ui";
import { renderSection } from "./ResultPanel";
import { FOCUS_RING } from "./styles";

interface JournalPageTwoProps {
  readonly view: ResultView;
  readonly journal: JournalView;
  readonly locale: Locale;
}

/**
 * Page 2 of the journal: the full notes. It scrolls inside the paper and is
 * reachable by keyboard. The sections are the existing ones, in their order.
 */
export function JournalPageTwo({ view, journal, locale }: JournalPageTwoProps): ReactElement {
  return (
    <div
      role="region"
      tabIndex={0}
      aria-label={t(locale, "journal.page2.label")}
      className={`min-h-0 flex-1 space-y-6 overflow-y-auto pr-1 ${FOCUS_RING}`}
    >
      <h2
        id="journal-heading-2"
        tabIndex={-1}
        className="th-hand text-3xl text-[color:var(--th-ink)]"
      >
        {t(locale, "journal.page2.label")}
      </h2>
      {journal.page2.map((id) => {
        const node = renderSection(id, view, locale, undefined);
        return node === null ? null : <div key={id}>{node}</div>;
      })}
    </div>
  );
}
