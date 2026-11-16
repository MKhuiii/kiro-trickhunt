"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement, ReactNode, Ref } from "react";
import type { Locale } from "../pipeline";
import { buildJournalView, t } from "../ui";
import type { ResultView } from "../ui";
import { JournalPageOne } from "./JournalPageOne";
import { JournalPageTwo } from "./JournalPageTwo";
import { LimitsNote } from "./LimitsNote";
import { FOCUS_RING } from "./styles";

interface JournalSheetProps {
  readonly view: ResultView;
  readonly locale: Locale;
  /** Focus target after a result is ready. */
  readonly headingRef?: Ref<HTMLHeadingElement>;
  readonly onAgain: () => void;
  /** The status region (the only live region). Hidden from sight, still announced. */
  readonly children?: ReactNode;
}

/**
 * The result as one sheet of paper with two pages. The limits note and the
 * buttons stay at the foot of both pages, so they never scroll out of view.
 */
export function JournalSheet({
  view,
  locale,
  headingRef,
  onAgain,
  children,
}: JournalSheetProps): ReactElement {
  const journal = useMemo(() => buildJournalView(view), [view]);
  const [page, setPage] = useState<1 | 2>(1);
  const hasMore = journal.page2.length > 0;
  const onPageTwo = page === 2 && hasMore;
  const turned = useRef(false);

  // After a page turn, move focus to the new page's heading.
  useEffect(() => {
    if (!turned.current) {
      turned.current = true;
      return;
    }
    document.getElementById(onPageTwo ? "journal-heading-2" : "journal-heading-1")?.focus();
  }, [onPageTwo]);

  const limitsKey = (journal.kind === "ready" ? journal.page1.limitsNoteKey : journal.limitsNoteKey) as "result.limitsNote";

  return (
    <div className="relative z-10 flex min-h-0 flex-1 justify-center px-3 pb-3 pt-1">
      <article
        aria-label={t(locale, "journal.title")}
        className="th-paper flex min-h-0 w-full max-w-xl flex-col gap-3 px-5 py-6 md:px-6 md:py-8"
      >
        {onPageTwo ? (
          <div key="page-2" className="th-page-in flex min-h-0 flex-1 flex-col">
            <JournalPageTwo view={view} journal={journal} locale={locale} />
          </div>
        ) : (
          <div
            key="page-1"
            role="region"
            tabIndex={0}
            aria-label={t(locale, "journal.page1.label")}
            className={`th-page-in flex min-h-0 flex-1 flex-col overflow-y-auto pr-1 ${FOCUS_RING}`}
          >
            {journal.kind === "ready" ? (
              <JournalPageOne journal={journal} locale={locale} headingRef={headingRef} />
            ) : (
              <div className="th-write flex flex-col gap-3">
                <h2
                  id="journal-heading-1"
                  ref={headingRef}
                  tabIndex={-1}
                  className="th-hand text-3xl text-[color:var(--th-ink)]"
                >
                  {t(locale, "journal.title")}
                </h2>
                <p className="text-lg text-[color:var(--th-ink)]">
                  {t(locale, journal.messageKey)}
                </p>
              </div>
            )}
          </div>
        )}

        <footer className="shrink-0 space-y-1">
          <LimitsNote messageKey={limitsKey} locale={locale} />
          <div className="flex flex-wrap items-center gap-x-6">
            {hasMore ? (
              <button
                type="button"
                onClick={() => setPage(onPageTwo ? 1 : 2)}
                className={`th-ink-button ${FOCUS_RING}`}
              >
                {t(locale, onPageTwo ? "journal.back" : "journal.more")}
              </button>
            ) : null}
            <button type="button" onClick={onAgain} className={`th-ink-button ${FOCUS_RING}`}>
              {t(locale, "hunt.again")}
            </button>
          </div>
          <div className="sr-only">{children}</div>
        </footer>
      </article>
    </div>
  );
}
